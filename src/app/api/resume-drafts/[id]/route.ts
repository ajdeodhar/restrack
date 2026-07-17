import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getAuthedUser } from '@/lib/session';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const draft = await storage.getResumeDraft(auth.userId, params.id);
  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });

  return NextResponse.json({ draft });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as {
    editedTex?: string;
    role?: string;
    company?: string;
    section?: string;
    changeDescription?: string;
  };

  await storage.updateResumeDraft(auth.userId, params.id, body);
  return NextResponse.json({ ok: true });
}
