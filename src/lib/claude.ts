import Anthropic from '@anthropic-ai/sdk';
import type { ProfileItem, EditResult } from '@/types';

const EDIT_TOOL: Anthropic.Tool = {
  name: 'apply_resume_edit',
  description:
    'Apply a specific targeted edit to the resume LaTeX. Returns the exact old and new text for validation and diff display.',
  input_schema: {
    type: 'object',
    properties: {
      section: {
        type: 'string',
        description:
          "The resume section being modified (e.g. 'Experience', 'Projects', 'Education', 'Skills', 'Summary')",
      },
      oldText: {
        type: 'string',
        description:
          'The EXACT text to replace — copied verbatim from the LaTeX file, including all whitespace and LaTeX commands.',
      },
      newText: {
        type: 'string',
        description:
          'The replacement text. Must maintain LaTeX formatting consistency with surrounding content.',
      },
      changeSummary: {
        type: 'string',
        description:
          "One-line description for the git commit message (e.g. 'Rewrote ML bullet to emphasize distributed systems')",
      },
      updatedLatex: {
        type: 'string',
        description: 'The complete LaTeX file content after applying the edit.',
      },
      validationNote: {
        type: 'string',
        description: 'Any assumptions made or caveats about the edit.',
      },
    },
    required: ['section', 'oldText', 'newText', 'changeSummary', 'updatedLatex'],
  },
};

const IMPORT_TOOL: Anthropic.Tool = {
  name: 'extract_profile_items',
  description: 'Extract structured profile items from a plain-text resume.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['experience', 'project', 'education', 'skill', 'hackathon', 'achievement'],
            },
            title: { type: 'string' },
            organization: { type: 'string' },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            description: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
          },
          required: ['type', 'title', 'description', 'tags'],
        },
      },
    },
    required: ['items'],
  },
};

const DEDUP_TOOL: Anthropic.Tool = {
  name: 'filter_new_items',
  description:
    'Return which candidate profile items are genuinely new — not already represented in the existing profile, and not a duplicate of another candidate in this same batch.',
  input_schema: {
    type: 'object',
    properties: {
      newItemIndices: {
        type: 'array',
        items: { type: 'integer' },
        description:
          'Zero-based indices into the candidate list for items that should be added. If two candidates duplicate each other, include only one (the more detailed/complete one).',
      },
    },
    required: ['newItemIndices'],
  },
};

function describeItem(item: {
  type: string;
  title: string;
  organization?: string;
  startDate?: string;
  endDate?: string;
  description: string;
}): string {
  const org = item.organization ? ` @ ${item.organization}` : '';
  const dates = item.startDate || item.endDate ? ` (${item.startDate ?? ''}${item.endDate ? `–${item.endDate}` : ''})` : '';
  return `[${item.type}] ${item.title}${org}${dates}\n${item.description}`;
}

/** Filters a batch of newly-extracted profile items down to ones not already covered by the existing profile. */
export async function filterNewProfileItems(params: {
  apiKey: string;
  existing: ProfileItem[];
  candidates: Omit<ProfileItem, 'id' | 'createdAt'>[];
}): Promise<number[]> {
  if (params.candidates.length === 0) return [];
  if (params.existing.length === 0) return params.candidates.map((_, i) => i);

  const anthropic = new Anthropic({ apiKey: params.apiKey });

  const existingText = params.existing.map((item, i) => `${i}. ${describeItem(item)}`).join('\n\n');
  const candidatesText = params.candidates.map((item, i) => `${i}. ${describeItem(item)}`).join('\n\n');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    tools: [DEDUP_TOOL],
    tool_choice: { type: 'auto' },
    system:
      'You compare candidate resume profile items against a user\'s existing profile (and against each other) to catch duplicates. Two items are duplicates if they clearly describe the same real-world experience, project, education entry, skill group, or achievement — even if worded differently across resume versions, or with a superset/subset of bullet points. An item is still a duplicate even if its tags/keywords were changed for a specific job application, or its end date changed from "Present" to a concrete month after the role ended — those are updates to the same real-world item, not new items. Different roles at the same company, or genuinely different projects/skills, are NOT duplicates. Always use the filter_new_items tool.',
    messages: [
      {
        role: 'user',
        content: `EXISTING PROFILE:\n${existingText}\n\nCANDIDATE ITEMS (newly extracted, possibly from multiple resume files):\n${candidatesText}\n\nWhich candidate indices are genuinely new and should be added?`,
      },
    ],
  });

  const toolUse = message.content.find((c) => c.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    // Fail open — better to risk a duplicate than silently drop real content.
    return params.candidates.map((_, i) => i);
  }

  const { newItemIndices } = toolUse.input as { newItemIndices: number[] };
  return newItemIndices;
}

export async function generateEdit(params: {
  apiKey: string;
  latexContent: string;
  profile: ProfileItem[];
  company: string;
  role: string;
  jobDescription?: string;
  instruction: string;
}): Promise<EditResult> {
  const anthropic = new Anthropic({ apiKey: params.apiKey });

  const profileText = params.profile
    .map(
      (item) =>
        `[${item.type.toUpperCase()}] ${item.title}${item.organization ? ` @ ${item.organization}` : ''}${item.startDate ? ` (${item.startDate}${item.endDate ? ` – ${item.endDate}` : ''})` : ''}\n${item.description}${item.tags.length ? `\nTags: ${item.tags.join(', ')}` : ''}`
    )
    .join('\n\n');

  const systemPrompt = `You are a professional resume editor. You make precise, targeted edits to LaTeX resumes to help users tailor them for specific job applications.

Rules:
- Make ONLY the change explicitly requested. Do not reformat or touch other sections.
- Preserve all LaTeX commands, environments, and whitespace conventions exactly.
- The oldText field must match the LaTeX file verbatim — including backslashes, braces, and newlines.
- If adding new content, fit it naturally within the existing LaTeX structure and style.
- Always use the apply_resume_edit tool to return your response.`;

  const userContent = `I am applying for **${params.role}** at **${params.company}**.

${params.profile.length > 0 ? `MY MASTER PROFILE (all my experiences — draw from these if needed):\n<profile>\n${profileText}\n</profile>\n` : ''}
CURRENT LATEX RESUME:
<latex>
${params.latexContent}
</latex>

${params.jobDescription ? `JOB DESCRIPTION:\n<jd>\n${params.jobDescription}\n</jd>\n` : ''}
EDIT REQUEST: ${params.instruction}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16384,
    tools: [EDIT_TOOL],
    tool_choice: { type: 'auto' },
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  });

  const toolUse = message.content.find((c) => c.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Claude did not return a structured edit. Try rephrasing your request.');
  }

  return toolUse.input as EditResult;
}

export async function importProfile(params: {
  apiKey: string;
  resumeText: string;
}): Promise<Omit<ProfileItem, 'id' | 'createdAt'>[]> {
  const anthropic = new Anthropic({ apiKey: params.apiKey });

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    tools: [IMPORT_TOOL],
    tool_choice: { type: 'auto' },
    messages: [
      {
        role: 'user',
        content: `Extract all profile items from this resume text into structured data. Be thorough — capture every experience, project, education entry, skill set, hackathon, and achievement.\n\n${params.resumeText}`,
      },
    ],
  });

  const toolUse = message.content.find((c) => c.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Failed to extract profile items');
  }

  const { items } = toolUse.input as {
    items: Omit<ProfileItem, 'id' | 'createdAt'>[];
  };
  return items;
}

/** Converts an uploaded PDF resume into an equivalent LaTeX source via Claude vision. */
export async function generateLatexFromPdf(params: {
  apiKey: string;
  pdfBase64: string;
}): Promise<string> {
  const anthropic = new Anthropic({ apiKey: params.apiKey });

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: params.pdfBase64 },
          },
          {
            type: 'text',
            text: 'Analyze this resume PDF. Generate an equivalent LaTeX (.tex) file that reproduces its layout, section structure, and formatting as faithfully as possible. Return ONLY the .tex source code — no markdown code fences, no explanations.',
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find((c) => c.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude did not return LaTeX source for this PDF.');
  }

  // Strip any stray markdown fences Claude might add despite instructions.
  return textBlock.text
    .trim()
    .replace(/^```(?:latex|tex)?\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim();
}

/** Generates a natural-language commit message for a resume version; falls back to a template on failure. */
export async function generateCommitMessage(params: {
  apiKey: string;
  role: string;
  company: string;
  section: string;
  changeDescription: string;
}): Promise<string> {
  const fallback = `[${params.company || 'Application'}] ${params.role || 'Role'}: ${params.changeDescription}`;
  if (!params.apiKey) return fallback;

  try {
    const anthropic = new Anthropic({ apiKey: params.apiKey });
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 128,
      messages: [
        {
          role: 'user',
          content: `Write a single-line, imperative-mood git commit message (no quotes, no trailing period) for a tailored resume version.\nRole: ${params.role}\nCompany: ${params.company}\nSection changed: ${params.section}\nChange description: ${params.changeDescription}`,
        },
      ],
    });
    const textBlock = message.content.find((c) => c.type === 'text');
    const text = textBlock && textBlock.type === 'text' ? textBlock.text.trim() : '';
    return text || fallback;
  } catch {
    return fallback;
  }
}

export function validateEdit(
  originalLatex: string,
  result: EditResult
): { valid: boolean; error?: string; warning?: string } {
  if (!originalLatex.includes(result.oldText)) {
    return {
      valid: false,
      error:
        'The old text was not found verbatim in your resume. Claude may have hallucinated text. Please try again.',
    };
  }

  if (!result.updatedLatex.includes(result.newText)) {
    return {
      valid: false,
      error: 'The new text was not found in the updated resume returned by Claude.',
    };
  }

  const expectedLatex = originalLatex.split(result.oldText).join(result.newText);
  const warning =
    expectedLatex !== result.updatedLatex
      ? 'Claude made additional minor formatting adjustments beyond the requested change.'
      : undefined;

  return { valid: true, warning };
}
