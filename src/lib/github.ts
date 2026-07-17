import { Octokit } from '@octokit/rest';

interface GithubConfig {
  token: string;
  owner: string;
  repo: string;
  path: string;
  branch: string;
}

export async function fetchLatex(
  config: GithubConfig
): Promise<{ content: string; sha: string }> {
  const octokit = new Octokit({ auth: config.token });

  const response = await octokit.repos.getContent({
    owner: config.owner,
    repo: config.repo,
    path: config.path,
    ref: config.branch,
  });

  if (Array.isArray(response.data) || response.data.type !== 'file') {
    throw new Error('Path does not point to a single file');
  }

  const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
  return { content, sha: response.data.sha };
}

export async function pushLatex(
  config: GithubConfig,
  params: { content: string; sha?: string; commitMessage: string }
): Promise<{ commitSha: string; commitUrl: string }> {
  const octokit = new Octokit({ auth: config.token });

  const response = await octokit.repos.createOrUpdateFileContents({
    owner: config.owner,
    repo: config.repo,
    path: config.path,
    message: params.commitMessage,
    content: Buffer.from(params.content).toString('base64'),
    sha: params.sha,
    branch: config.branch,
  });

  return {
    commitSha: response.data.commit.sha ?? '',
    commitUrl: response.data.commit.html_url ?? '',
  };
}

/** Commits a new versioned resume file (e.g. resumes/{role}_{company}_{timestamp}.tex). No sha needed — it's always a new path. */
export async function commitResumeVersion(
  config: Omit<GithubConfig, 'path'> & { path: string },
  params: { content: string; commitMessage: string }
): Promise<{ commitSha: string; commitUrl: string }> {
  return pushLatex(config, { content: params.content, commitMessage: params.commitMessage });
}

interface ChangelogEntry {
  date: string;
  role: string;
  company: string;
  section: string;
  changeDescription: string;
  commitSha: string;
  commitUrl: string;
}

/** Appends an entry to changelog.json in the repo, creating it if it doesn't exist yet. */
export async function updateChangelog(
  config: Omit<GithubConfig, 'path'>,
  entry: ChangelogEntry
): Promise<void> {
  const octokit = new Octokit({ auth: config.token });
  const path = 'changelog.json';

  let existing: ChangelogEntry[] = [];
  let sha: string | undefined;
  try {
    const response = await octokit.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path,
      ref: config.branch,
    });
    if (!Array.isArray(response.data) && response.data.type === 'file') {
      existing = JSON.parse(Buffer.from(response.data.content, 'base64').toString('utf-8'));
      sha = response.data.sha;
    }
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    if (status !== 404) throw err;
  }

  const updated = [...existing, entry];

  await octokit.repos.createOrUpdateFileContents({
    owner: config.owner,
    repo: config.repo,
    path,
    message: `Update changelog: ${entry.company} — ${entry.role}`,
    content: Buffer.from(JSON.stringify(updated, null, 2)).toString('base64'),
    sha,
    branch: config.branch,
  });
}

export async function testConnection(
  config: Omit<GithubConfig, 'path' | 'branch'>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const octokit = new Octokit({ auth: config.token });
    await octokit.repos.get({ owner: config.owner, repo: config.repo });
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
