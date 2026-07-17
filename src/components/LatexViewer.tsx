'use client';

interface LatexViewerProps {
  content: string;
  highlightText?: string;
  className?: string;
}

export default function LatexViewer({ content, highlightText, className = '' }: LatexViewerProps) {
  if (!highlightText) {
    return (
      <pre
        className={`font-mono text-xs text-slate-300 whitespace-pre overflow-auto leading-relaxed ${className}`}
      >
        {content}
      </pre>
    );
  }

  const parts = content.split(highlightText);
  return (
    <pre
      className={`font-mono text-xs text-slate-300 whitespace-pre overflow-auto leading-relaxed ${className}`}
    >
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <mark className="bg-yellow-400/30 text-yellow-200 rounded px-0.5">
              {highlightText}
            </mark>
          )}
        </span>
      ))}
    </pre>
  );
}
