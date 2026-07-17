'use client';

import { useEffect, useRef, useState } from 'react';

const DEBOUNCE_MS = 500;

export function useDebouncedCompile(tex: string) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!tex.trim()) return;

    const timer = setTimeout(async () => {
      setCompiling(true);
      setError(undefined);
      try {
        const res = await fetch('/api/compile-latex', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tex }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? 'Compilation failed');
          return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
        prevUrlRef.current = url;
        setPdfUrl(url);
      } catch {
        setError('Compilation service unreachable');
      } finally {
        setCompiling(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [tex]);

  useEffect(() => {
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    };
  }, []);

  return { pdfUrl, compiling, error };
}
