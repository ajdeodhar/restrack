import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getAuthedUser } from '@/lib/session';

export async function GET() {
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sources = await storage.listImportSources(auth.userId);
  return NextResponse.json({ sources });
}
