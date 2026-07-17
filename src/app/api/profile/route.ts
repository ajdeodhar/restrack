import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getAuthedUser } from '@/lib/session';
import type { ProfileItem } from '@/types';

export async function GET() {
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({ items: await storage.getProfile(auth.userId) });
}

export async function POST(req: Request) {
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as Omit<ProfileItem, 'id' | 'createdAt'>;
  const item = await storage.createProfileItem(auth.userId, { ...body, tags: body.tags ?? [] });
  return NextResponse.json({ item });
}
