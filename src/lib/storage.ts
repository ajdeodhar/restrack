import { prisma } from '@/lib/prisma';
import { effectiveItemDate } from '@/lib/dates';
import type {
  Settings,
  Plan,
  ProfileItem,
  Application,
  ImportSourceSummary,
  ImportSourceDetail,
  ResumeDraft,
} from '@/types';

function toProfileItem(row: {
  id: string;
  type: string;
  title: string;
  organization: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string;
  tagsJson: string;
  createdAt: Date;
  sourceId?: string | null;
  source?: { id: string; fileName: string; uploadedAt: Date } | null;
}): ProfileItem {
  return {
    id: row.id,
    type: row.type as ProfileItem['type'],
    title: row.title,
    organization: row.organization ?? undefined,
    startDate: row.startDate ?? undefined,
    endDate: row.endDate ?? undefined,
    description: row.description,
    tags: JSON.parse(row.tagsJson),
    createdAt: row.createdAt.toISOString(),
    sourceId: row.sourceId ?? undefined,
    source: row.source
      ? { id: row.source.id, fileName: row.source.fileName, uploadedAt: row.source.uploadedAt.toISOString() }
      : undefined,
  };
}

function toImportSourceSummary(row: {
  id: string;
  kind: string;
  fileName: string;
  mimeType: string | null;
  uploadedAt: Date;
  _count: { profileItems: number };
}): ImportSourceSummary {
  return {
    id: row.id,
    kind: row.kind as ImportSourceSummary['kind'],
    fileName: row.fileName,
    mimeType: row.mimeType ?? undefined,
    uploadedAt: row.uploadedAt.toISOString(),
    itemsFound: row._count.profileItems,
  };
}

function toResumeDraft(row: {
  id: string;
  originalTex: string;
  editedTex: string;
  role: string;
  company: string;
  section: string;
  changeDescription: string;
  status: string;
  commitHash: string | null;
  commitUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ResumeDraft {
  return {
    id: row.id,
    originalTex: row.originalTex,
    editedTex: row.editedTex,
    role: row.role,
    company: row.company,
    section: row.section,
    changeDescription: row.changeDescription,
    status: row.status as ResumeDraft['status'],
    commitHash: row.commitHash ?? undefined,
    commitUrl: row.commitUrl ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toApplication(row: {
  id: string;
  company: string;
  role: string;
  appliedAt: Date;
  jobDescription: string | null;
  instruction: string;
  changesJson: string;
  commitHash: string | null;
  commitUrl: string | null;
  commitMessage: string | null;
}): Application {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    appliedAt: row.appliedAt.toISOString(),
    jobDescription: row.jobDescription ?? undefined,
    instruction: row.instruction,
    changes: JSON.parse(row.changesJson),
    commitHash: row.commitHash ?? undefined,
    commitUrl: row.commitUrl ?? undefined,
    commitMessage: row.commitMessage ?? undefined,
  };
}

export const storage = {
  async getSettings(userId: string): Promise<Settings> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      plan: user.plan as Plan,
      ownAnthropicApiKey: user.ownAnthropicApiKey ?? '',
      githubOwner: user.githubOwner ?? '',
      githubRepo: user.githubRepo ?? '',
      latexFilePath: user.latexFilePath,
      branch: user.branch,
    };
  },

  async saveSettings(userId: string, s: Partial<Settings>): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: s.plan,
        ownAnthropicApiKey: s.ownAnthropicApiKey,
        githubOwner: s.githubOwner,
        githubRepo: s.githubRepo,
        latexFilePath: s.latexFilePath,
        branch: s.branch,
      },
    });
  },

  /** Anthropic key that should actually be used for this user's AI calls. */
  async getEffectiveAnthropicKey(userId: string): Promise<string> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.plan === 'paid') return process.env.ANTHROPIC_API_KEY ?? '';
    return user.ownAnthropicApiKey ?? '';
  },

  async getProfile(userId: string): Promise<ProfileItem[]> {
    const rows = await prisma.profileItem.findMany({
      where: { userId },
      include: { source: { select: { id: true, fileName: true, uploadedAt: true } } },
    });
    const items = rows.map(toProfileItem);
    // Newest first: by the item's own (end date, else start date), falling back
    // to when it was added if no date could be parsed (e.g. a skills entry).
    items.sort((a, b) => effectiveItemDate(b) - effectiveItemDate(a));
    return items;
  },

  async createProfileItem(
    userId: string,
    data: Omit<ProfileItem, 'id' | 'createdAt'>
  ): Promise<ProfileItem> {
    const row = await prisma.profileItem.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        organization: data.organization,
        startDate: data.startDate,
        endDate: data.endDate,
        description: data.description,
        tagsJson: JSON.stringify(data.tags ?? []),
        sourceId: data.sourceId,
      },
    });
    return toProfileItem(row);
  },

  async updateProfileItem(userId: string, id: string, data: Partial<ProfileItem>): Promise<void> {
    await prisma.profileItem.updateMany({
      where: { id, userId },
      data: {
        type: data.type,
        title: data.title,
        organization: data.organization,
        startDate: data.startDate,
        endDate: data.endDate,
        description: data.description,
        tagsJson: data.tags ? JSON.stringify(data.tags) : undefined,
      },
    });
  },

  async deleteProfileItem(userId: string, id: string): Promise<void> {
    await prisma.profileItem.deleteMany({ where: { id, userId } });
  },

  async getApplications(userId: string): Promise<Application[]> {
    const rows = await prisma.application.findMany({
      where: { userId },
      orderBy: { appliedAt: 'desc' },
    });
    return rows.map(toApplication);
  },

  async createApplication(userId: string, data: Omit<Application, 'id'>): Promise<Application> {
    const row = await prisma.application.create({
      data: {
        userId,
        company: data.company,
        role: data.role,
        appliedAt: new Date(data.appliedAt),
        jobDescription: data.jobDescription,
        instruction: data.instruction,
        changesJson: JSON.stringify(data.changes),
        commitHash: data.commitHash,
        commitUrl: data.commitUrl,
        commitMessage: data.commitMessage,
      },
    });
    return toApplication(row);
  },

  async deleteApplication(userId: string, id: string): Promise<void> {
    await prisma.application.deleteMany({ where: { id, userId } });
  },

  async createImportSource(
    userId: string,
    data: {
      kind: 'file' | 'pasted_text';
      fileName: string;
      mimeType?: string;
      fileBytes?: Buffer;
      extractedText: string;
    }
  ): Promise<ImportSourceSummary> {
    const row = await prisma.importSource.create({
      data: {
        userId,
        kind: data.kind,
        fileName: data.fileName,
        mimeType: data.mimeType,
        fileBytes: data.fileBytes,
        extractedText: data.extractedText,
      },
    });
    return toImportSourceSummary({ ...row, _count: { profileItems: 0 } });
  },

  async listImportSources(userId: string): Promise<ImportSourceSummary[]> {
    const rows = await prisma.importSource.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        kind: true,
        fileName: true,
        mimeType: true,
        uploadedAt: true,
        _count: { select: { profileItems: true } },
      },
    });
    return rows.map(toImportSourceSummary);
  },

  async getImportSource(userId: string, id: string): Promise<ImportSourceDetail | null> {
    const row = await prisma.importSource.findFirst({
      where: { id, userId },
      select: {
        id: true,
        kind: true,
        fileName: true,
        mimeType: true,
        uploadedAt: true,
        extractedText: true,
        _count: { select: { profileItems: true } },
      },
    });
    if (!row) return null;
    return { ...toImportSourceSummary(row), extractedText: row.extractedText };
  },

  async getImportSourceFile(
    userId: string,
    id: string
  ): Promise<{ fileBytes: Buffer; mimeType: string; fileName: string } | null> {
    const row = await prisma.importSource.findFirst({
      where: { id, userId },
      select: { fileBytes: true, mimeType: true, fileName: true },
    });
    if (!row || !row.fileBytes) return null;
    return { fileBytes: row.fileBytes, mimeType: row.mimeType ?? 'application/octet-stream', fileName: row.fileName };
  },

  async createResumeDraft(
    userId: string,
    data: { originalTex: string; editedTex: string }
  ): Promise<ResumeDraft> {
    const row = await prisma.resumeDraft.create({
      data: { userId, originalTex: data.originalTex, editedTex: data.editedTex },
    });
    return toResumeDraft(row);
  },

  async getResumeDraft(userId: string, id: string): Promise<ResumeDraft | null> {
    const row = await prisma.resumeDraft.findFirst({ where: { id, userId } });
    return row ? toResumeDraft(row) : null;
  },

  async updateResumeDraft(
    userId: string,
    id: string,
    data: Partial<Pick<ResumeDraft, 'editedTex' | 'role' | 'company' | 'section' | 'changeDescription'>>
  ): Promise<void> {
    await prisma.resumeDraft.updateMany({
      where: { id, userId },
      data: {
        editedTex: data.editedTex,
        role: data.role,
        company: data.company,
        section: data.section,
        changeDescription: data.changeDescription,
      },
    });
  },

  async markResumeDraftCommitted(
    userId: string,
    id: string,
    data: { commitHash: string; commitUrl: string }
  ): Promise<void> {
    await prisma.resumeDraft.updateMany({
      where: { id, userId },
      data: { status: 'committed', commitHash: data.commitHash, commitUrl: data.commitUrl },
    });
  },
};
