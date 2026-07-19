import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { generateLatexFromPdf } from '@/lib/claude';
import { getAuthedUser } from '@/lib/session';

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await storage.getSettings(auth.userId);
  if (!settings.githubOwner || !settings.githubRepo) {
    return NextResponse.json(
      { error: 'Link a GitHub repo in Settings before uploading a resume.' },
      { status: 400 }
    );
  }

  let tex: string;

  // Content fetched from GitHub arrives as JSON — it's already plain .tex text.
  if (req.headers.get('content-type')?.includes('application/json')) {
    const body = (await req.json()) as { tex?: string };
    if (!body.tex) {
      return NextResponse.json({ error: 'tex content is required' }, { status: 400 });
    }
    tex = body.tex;
  } else {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A .tex or .pdf file is required' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds the 5MB limit' }, { status: 400 });
    }

    const lowerName = file.name.toLowerCase();

    if (lowerName.endsWith('.tex')) {
      tex = await file.text();
    } else if (lowerName.endsWith('.pdf')) {
      const apiKey = await storage.getEffectiveAnthropicKey(auth.userId);
      if (!apiKey) {
        return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 400 });
      }
      const pdfBase64 = Buffer.from(await file.arrayBuffer()).toString('base64');
      try {
        tex = await generateLatexFromPdf({ apiKey, pdfBase64 });
      } catch (err: unknown) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : 'Failed to convert PDF to LaTeX' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json({ error: 'Only .tex and .pdf files are supported' }, { status: 400 });
    }
  }

  const draft = await storage.createResumeDraft(auth.userId, { originalTex: tex, editedTex: tex });
  return NextResponse.json({ draftId: draft.id });
}
