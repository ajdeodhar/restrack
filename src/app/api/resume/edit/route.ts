import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { generateEdit, validateEdit } from '@/lib/claude';
import { getAuthedUser } from '@/lib/session';

export async function POST(req: Request) {
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { latexContent, company, role, jobDescription, instruction } = (await req.json()) as {
    latexContent: string;
    company: string;
    role: string;
    jobDescription?: string;
    instruction: string;
  };

  const apiKey = await storage.getEffectiveAnthropicKey(auth.userId);
  if (!apiKey) {
    return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 400 });
  }

  if (!latexContent || !instruction) {
    return NextResponse.json({ error: 'latexContent and instruction are required' }, { status: 400 });
  }

  try {
    const profile = await storage.getProfile(auth.userId);
    const result = await generateEdit({
      apiKey,
      latexContent,
      profile,
      company,
      role,
      jobDescription,
      instruction,
    });

    const validation = validateEdit(latexContent, result);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 422 });
    }

    return NextResponse.json({ result, warning: validation.warning });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Edit generation failed' },
      { status: 500 }
    );
  }
}
