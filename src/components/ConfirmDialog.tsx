'use client';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  extraAction?: { label: string; onClick: () => void };
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  extraAction,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div className="card w-full max-w-md p-5 animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-slate-200 mb-2">{title}</h3>
        <p className="text-sm text-slate-400 mb-4">{message}</p>
        <div className="flex gap-2 justify-end flex-wrap">
          {extraAction && (
            <button onClick={extraAction.onClick} className="btn-secondary btn-sm">
              {extraAction.label}
            </button>
          )}
          <button onClick={onCancel} className="btn-secondary btn-sm">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className="btn-primary btn-sm">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
