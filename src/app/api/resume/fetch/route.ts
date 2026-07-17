import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { fetchLatex } from '@/lib/github';
import { getAuthedUser } from '@/lib/session';

export async function GET() {
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!auth.githubAccessToken) {
    return NextResponse.json({ error: 'No GitHub session token — try signing in again.' }, { status: 401 });
  }

  const s = await storage.getSettings(auth.userId);
  if (!s.githubOwner || !s.githubRepo) {
    return NextResponse.json({ error: 'GitHub repo not configured' }, { status: 400 });
  }

  try {
    const { content, sha } = await fetchLatex({
      token: auth.githubAccessToken,
      owner: s.githubOwner,
      repo: s.githubRepo,
      path: s.latexFilePath,
      branch: s.branch,
    });
    return NextResponse.json({ content, sha });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch resume' },
      { status: 500 }
    );
  }
}
