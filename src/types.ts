export type ProfileItemType =
  | 'experience'
  | 'project'
  | 'education'
  | 'skill'
  | 'hackathon'
  | 'achievement';

export interface ProfileItem {
  id: string;
  type: ProfileItemType;
  title: string;
  organization?: string;
  startDate?: string;
  endDate?: string;
  description: string;
  tags: string[];
  createdAt: string;
  sourceId?: string;
  source?: ImportSourceRef;
}

export interface ImportSourceRef {
  id: string;
  fileName: string;
  uploadedAt: string;
}

export interface ImportSourceSummary {
  id: string;
  kind: 'file' | 'pasted_text';
  fileName: string;
  mimeType?: string;
  uploadedAt: string;
  itemsFound: number;
}

export interface ImportSourceDetail extends ImportSourceSummary {
  extractedText: string;
}

export type Plan = 'free' | 'paid';

export interface Settings {
  plan: Plan;
  // Only used/relevant on the free plan — paid plan uses the app's shared server key.
  ownAnthropicApiKey: string;
  githubOwner: string;
  githubRepo: string;
  latexFilePath: string;
  branch: string;
}

export interface EditResult {
  section: string;
  oldText: string;
  newText: string;
  changeSummary: string;
  updatedLatex: string;
  validationNote?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

export interface ApplicationChange {
  section: string;
  oldText: string;
  newText: string;
  summary: string;
}

export interface Application {
  id: string;
  company: string;
  role: string;
  appliedAt: string;
  jobDescription?: string;
  instruction: string;
  changes: ApplicationChange[];
  commitHash?: string;
  commitUrl?: string;
  commitMessage?: string;
}
