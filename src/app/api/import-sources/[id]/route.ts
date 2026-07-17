import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getAuthedUser } from '@/lib/session';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const source = await storage.getImportSource(auth.userId, params.id);
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ source });
}
