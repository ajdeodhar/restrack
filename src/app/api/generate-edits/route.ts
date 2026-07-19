import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { generateEditedTex } from '@/lib/claude';
import { getAuthedUser } from '@/lib/session';

export async function POST(req: Request) {
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { original_tex, role, company, section, change_description } = (await req.json()) as {
    original_tex?: string;
    role?: string;
    company?: string;
    section?: string;
    change_description?: string;
  };

  if (!original_tex || !change_description) {
    return NextResponse.json({ error: 'original_tex and change_description are required' }, { status: 400 });
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
      section: section ?? '',
      changeDescription: change_description,
    });
    return NextResponse.json({ edited_tex });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate edit' },
      { status: 500 }
    );
  }
}
