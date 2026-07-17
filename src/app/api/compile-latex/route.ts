import { NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/session';

const COMPILE_TIMEOUT_MS = 5000;

export async function POST(req: Request) {
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tex } = (await req.json()) as { tex?: string };
  if (!tex) return NextResponse.json({ error: 'tex is required' }, { status: 400 });

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
      return NextResponse.json(
        { error: `Compilation failed: ${errorBody.slice(0, 500)}` },
        { status: 422 }
      );
    }

    const pdf = Buffer.from(await response.arrayBuffer());
    return new NextResponse(new Uint8Array(pdf), {
      headers: { 'Content-Type': 'application/pdf' },
    });
  } catch (err: unknown) {
    const timedOut = err instanceof Error && err.name === 'AbortError';
    return NextResponse.json(
      { error: timedOut ? 'Compilation timed out' : 'Compilation service unreachable' },
      { status: 504 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
