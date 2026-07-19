import { NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/session';
import { compileLatexToPdf } from '@/lib/compile';

export async function POST(req: Request) {
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tex } = (await req.json()) as { tex?: string };
  if (!tex) return NextResponse.json({ error: 'tex is required' }, { status: 400 });

  try {
    const pdf = await compileLatexToPdf(tex);
    return new NextResponse(new Uint8Array(pdf), {
      headers: { 'Content-Type': 'application/pdf' },
    });
  } catch (err: unknown) {
    const timedOut = err instanceof Error && err.message === 'Compilation timed out';
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Compilation service unreachable' },
      { status: timedOut ? 504 : 422 }
    );
  }
}
