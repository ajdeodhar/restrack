import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getAuthedUser } from '@/lib/session';
import type { ProfileItem } from '@/types';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as Partial<ProfileItem>;
  await storage.updateProfileItem(auth.userId, params.id, body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await storage.deleteProfileItem(auth.userId, params.id);
  return NextResponse.json({ ok: true });
}
