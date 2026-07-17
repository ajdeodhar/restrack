'use client';

import { useState } from 'react';
import { Pencil, Trash2, Check, X, Paperclip } from 'lucide-react';
import type { ProfileItem, ProfileItemType } from '@/types';

const TYPE_COLORS: Record<ProfileItemType, string> = {
  experience: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  project: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  education: 'bg-green-500/20 text-green-300 border-green-500/30',
  skill: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  hackathon: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  achievement: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
};

interface Props {
  item: ProfileItem;
  onUpdate: (id: string, data: Partial<ProfileItem>) => void;
  onDelete: (id: string) => void;
  onViewSource?: (sourceId: string) => void;
}

export default function ProfileItemCard({ item, onUpdate, onDelete, onViewSource }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item);

  const save = () => {
    onUpdate(item.id, draft);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(item);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="card border-brand-500/50 p-4 space-y-3 animate-fade-in">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="field-label">Title</label>
            <input
              className="input"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Organization</label>
            <input
              className="input"
              value={draft.organization ?? ''}
              onChange={(e) => setDraft({ ...draft, organization: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Start Date</label>
            <input
              className="input"
              value={draft.startDate ?? ''}
              onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">End Date</label>
            <input
              className="input"
              value={draft.endDate ?? ''}
              onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
              placeholder="Present"
            />
          </div>
        </div>
        <div>
          <label className="field-label">Description</label>
          <textarea
            rows={4}
            className="textarea"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </div>
        <div>
          <label className="field-label">Tags (comma-separated)</label>
          <input
            className="input"
            value={draft.tags.join(', ')}
            onChange={(e) =>
              setDraft({
                ...draft,
                tags: e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
        <div className="flex gap-2">
          <button onClick={save} className="btn-success btn-sm">
            <Check size={13} /> Save
          </button>
          <button onClick={cancel} className="btn-secondary btn-sm">
            <X size={13} /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-hover p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`text-xs px-2 py-0.5 rounded border font-medium capitalize ${TYPE_COLORS[item.type]}`}
            >
              {item.type}
            </span>
            <span className="font-medium text-slate-100 text-sm">{item.title}</span>
            {item.organization && (
              <span className="text-slate-400 text-sm">@ {item.organization}</span>
            )}
          </div>
          {(item.startDate || item.endDate) && (
            <div className="text-xs text-slate-500 mb-2">
              {item.startDate} {item.endDate ? `– ${item.endDate}` : ''}
            </div>
          )}
          {item.source && (
            <button
              onClick={() => onViewSource?.(item.source!.id)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-300 transition-colors mb-2"
              title="View source file"
            >
              <Paperclip size={11} />
              <span className="truncate max-w-[200px]">{item.source.fileName}</span>
              <span className="text-slate-600">
                · {new Date(item.source.uploadedAt).toLocaleDateString()}
              </span>
            </button>
          )}
          <p className="text-slate-300 text-sm leading-relaxed line-clamp-3">{item.description}</p>
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded transition-colors"
            title="Edit"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded transition-colors"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
