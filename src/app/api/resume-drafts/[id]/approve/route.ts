import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { commitResumeVersion, updateChangelog } from '@/lib/github';
import { generateCommitMessage } from '@/lib/claude';
import { getAuthedUser } from '@/lib/session';

function slug(value: string): string {
  return (value || 'untitled').trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'untitled';
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!auth.githubAccessToken) {
    return NextResponse.json({ error: 'No GitHub session token — try signing in again.' }, { status: 401 });
  }

  const draft = await storage.getResumeDraft(auth.userId, params.id);
  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });

  const { tex_content, role, company, section, change_description } = (await req.json()) as {
    tex_content: string;
    role: string;
    company: string;
    section: string;
    change_description: string;
  };

  const settings = await storage.getSettings(auth.userId);
  if (!settings.githubOwner || !settings.githubRepo) {
    return NextResponse.json({ error: 'GitHub repo not configured' }, { status: 400 });
  }

  const apiKey = await storage.getEffectiveAnthropicKey(auth.userId);
  const commitMessage = await generateCommitMessage({
    apiKey,
    role,
    company,
    section,
    changeDescription: change_description,
  });

  const timestamp = Date.now();
  const path = `resumes/${slug(role)}_${slug(company)}_${timestamp}.tex`;

  try {
    const { commitSha, commitUrl } = await commitResumeVersion(
      {
        token: auth.githubAccessToken,
        owner: settings.githubOwner,
        repo: settings.githubRepo,
        path,
        branch: settings.branch,
      },
      { content: tex_content, commitMessage }
    );

    await updateChangelog(
      {
        token: auth.githubAccessToken,
        owner: settings.githubOwner,
        repo: settings.githubRepo,
        branch: settings.branch,
      },
      {
        date: new Date().toISOString(),
        role,
        company,
        section,
        changeDescription: change_description,
        commitSha,
        commitUrl,
      }
    );

    await storage.createApplication(auth.userId, {
      company,
      role,
      appliedAt: new Date().toISOString(),
      instruction: change_description,
      changes: [{ section, oldText: draft.originalTex, newText: tex_content, summary: commitMessage }],
      commitHash: commitSha.slice(0, 7),
      commitUrl,
      commitMessage,
    });

    await storage.markResumeDraftCommitted(auth.userId, params.id, { commitHash: commitSha, commitUrl });

    return NextResponse.json({ success: true, commitUrl, texContent: tex_content });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Commit failed' },
      { status: 500 }
    );
  }
}
