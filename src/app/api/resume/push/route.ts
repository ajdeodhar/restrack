import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { pushLatex } from '@/lib/github';
import { getAuthedUser } from '@/lib/session';
import type { ApplicationChange } from '@/types';

export async function POST(req: Request) {
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!auth.githubAccessToken) {
    return NextResponse.json({ error: 'No GitHub session token — try signing in again.' }, { status: 401 });
  }

  const { updatedLatex, sha, commitMessage, company, role, jobDescription, instruction, change } =
    (await req.json()) as {
      updatedLatex: string;
      sha: string;
      commitMessage: string;
      company: string;
      role: string;
      jobDescription?: string;
      instruction: string;
      change: ApplicationChange;
    };

  const s = await storage.getSettings(auth.userId);
  if (!s.githubOwner || !s.githubRepo) {
    return NextResponse.json({ error: 'GitHub repo not configured' }, { status: 400 });
  }

  try {
    const { commitSha, commitUrl } = await pushLatex(
      {
        token: auth.githubAccessToken,
        owner: s.githubOwner,
        repo: s.githubRepo,
        path: s.latexFilePath,
        branch: s.branch,
      },
      { content: updatedLatex, sha, commitMessage }
    );

    await storage.createApplication(auth.userId, {
      company,
      role,
      appliedAt: new Date().toISOString(),
      jobDescription,
      instruction,
      changes: [change],
      commitHash: commitSha.slice(0, 7),
      commitUrl,
      commitMessage,
    });

    return NextResponse.json({ commitSha, commitUrl, shortSha: commitSha.slice(0, 7) });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Push failed' },
      { status: 500 }
    );
  }
}
