import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { generateEditedTex } from '@/lib/claude';
import { getAuthedUser } from '@/lib/session';

export async function POST(req: Request) {
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { original_tex, role, company, job_description, sections } = (await req.json()) as {
    original_tex?: string;
    role?: string;
    company?: string;
    job_description?: string;
    sections?: { section?: string; change_description?: string }[];
  };

  if (!original_tex || !sections || sections.length === 0) {
    return NextResponse.json({ error: 'original_tex and at least one section edit are required' }, { status: 400 });
  }

  const invalidSection = sections.find((s) => !s.section || !s.change_description);
  if (invalidSection) {
    return NextResponse.json({ error: 'Each section edit needs a section and a change description' }, { status: 400 });
  }

  const apiKey = await storage.getEffectiveAnthropicKey(auth.userId);
  if (!apiKey) {
    return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 400 });
  }

  try {
    const edited_tex = await generateEditedTex({
      apiKey,
      latexContent: original_tex,
      role: role ?? '',
      company: company ?? '',
      jobDescription: job_description,
      sections: sections.map((s) => ({
        section: s.section as string,
        changeDescription: s.change_description as string,
      })),
    });
    return NextResponse.json({ edited_tex });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate edit' },
      { status: 500 }
    );
  }
}
