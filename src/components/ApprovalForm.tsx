'use client';

import { Loader2, Github } from 'lucide-react';

interface ApprovalFormProps {
  role: string;
  company: string;
  section: string;
  changeDescription: string;
  onChange: (patch: Partial<{ role: string; company: string; section: string; changeDescription: string }>) => void;
  repoLabel: string;
  approving: boolean;
  onApprove: () => void;
  onDiscard: () => void;
}

export default function ApprovalForm({
  role,
  company,
  section,
  changeDescription,
  onChange,
  repoLabel,
  approving,
  onApprove,
  onDiscard,
}: ApprovalFormProps) {
  const canApprove = role.trim() && company.trim() && changeDescription.trim();

  return (
    <div className="card p-4 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="field-label">Role</label>
          <input
            className="input"
            value={role}
            onChange={(e) => onChange({ role: e.target.value })}
            placeholder="Software Engineer"
          />
        </div>
        <div>
          <label className="field-label">Company</label>
          <input
            className="input"
            value={company}
            onChange={(e) => onChange({ company: e.target.value })}
            placeholder="Acme Corp"
          />
        </div>
        <div>
          <label className="field-label">Section</label>
          <input
            className="input"
            value={section}
            onChange={(e) => onChange({ section: e.target.value })}
            placeholder="Experience"
          />
        </div>
        <div>
          <label className="field-label">Change description</label>
          <input
            className="input"
            value={changeDescription}
            onChange={(e) => onChange({ changeDescription: e.target.value })}
            placeholder="Emphasized backend work"
          />
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Github size={13} />
          Commits to: <span className="text-slate-300 font-medium">{repoLabel}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={onDiscard} disabled={approving} className="btn-secondary btn-sm">
            Discard
          </button>
          <button onClick={onApprove} disabled={!canApprove || approving} className="btn-primary btn-sm">
            {approving && <Loader2 size={13} className="animate-spin" />}
            {approving ? 'Committing...' : 'Approve & Commit'}
          </button>
        </div>
      </div>
    </div>
  );
}
