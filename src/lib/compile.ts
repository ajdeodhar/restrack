const COMPILE_TIMEOUT_MS = 5000;

/** Compiles LaTeX to PDF via the ytotech build service. Throws on failure or timeout. */
export async function compileLatexToPdf(tex: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), COMPILE_TIMEOUT_MS);

  try {
    const response = await fetch('https://latex.ytotech.com/builds/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        compiler: 'pdflatex',
        resources: [{ main: true, content: tex }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Compilation failed: ${errorBody.slice(0, 500)}`);
    }

    return Buffer.from(await response.arrayBuffer());
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Compilation timed out');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
