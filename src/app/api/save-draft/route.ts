import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { commitResumeVersion, updateChangelog } from '@/lib/github';
import { generateCommitMessage } from '@/lib/claude';
import { compileLatexToPdf } from '@/lib/compile';
import { getAuthedUser } from '@/lib/session';

function slug(value: string): string {
  return (value || 'untitled').trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'untitled';
}

export async function POST(req: Request) {
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!auth.githubAccessToken) {
    return NextResponse.json({ error: 'No GitHub session token — try signing in again.' }, { status: 401 });
  }

  const { draft_id, final_tex, role, company, section, change_description } = (await req.json()) as {
    draft_id: string;
    final_tex: string;
    role: string;
    company: string;
    section: string;
    change_description: string;
  };

  if (!draft_id || !final_tex) {
    return NextResponse.json({ error: 'draft_id and final_tex are required' }, { status: 400 });
  }

  const draft = await storage.getResumeDraft(auth.userId, draft_id);
  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });

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
      { content: final_tex, commitMessage }
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
      changes: [{ section, oldText: draft.originalTex, newText: final_tex, summary: commitMessage }],
      commitHash: commitSha.slice(0, 7),
      commitUrl,
      commitMessage,
    });

    await storage.markResumeDraftCommitted(auth.userId, draft_id, { commitHash: commitSha, commitUrl });

    // PDF preview is best-effort — a compile hiccup shouldn't undo a GitHub commit that already succeeded.
    let pdf_url: string | null = null;
    try {
      const pdf = await compileLatexToPdf(final_tex);
      pdf_url = `data:application/pdf;base64,${pdf.toString('base64')}`;
    } catch {
      pdf_url = null;
    }

    const tex_download_url = `data:text/plain;base64,${Buffer.from(final_tex).toString('base64')}`;

    return NextResponse.json({
      success: true,
      commit_url: commitUrl,
      commit_hash: commitSha,
      pdf_url,
      tex_download_url,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Save failed' },
      { status: 500 }
    );
  }
}
