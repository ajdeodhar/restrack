import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import os from 'os';

export async function compilePdf(
  latexContent: string
): Promise<{ pdf: Buffer | null; error?: string }> {
  const tempDir = join(os.tmpdir(), 'restrack-compile');
  if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

  const texPath = join(tempDir, 'resume.tex');
  const pdfPath = join(tempDir, 'resume.pdf');

  writeFileSync(texPath, latexContent, 'utf-8');

  try {
    execSync(
      `pdflatex -interaction=nonstopmode -halt-on-error -output-directory "${tempDir}" "${texPath}"`,
      { timeout: 60_000, stdio: 'pipe' }
    );

    if (existsSync(pdfPath)) {
      return { pdf: readFileSync(pdfPath) };
    }
    return { pdf: null, error: 'PDF file not found after compilation' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('not found') || msg.includes('ENOENT')) {
      return {
        pdf: null,
        error:
          'pdflatex not found. Install MiKTeX (Windows) or TeX Live (Linux/Mac) to enable PDF compilation.',
      };
    }
    return { pdf: null, error: 'LaTeX compilation failed. Check your .tex file for errors.' };
  }
}
