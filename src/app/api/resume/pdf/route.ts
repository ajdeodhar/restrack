import { NextResponse } from 'next/server';
import { compilePdf } from '@/lib/latex';

export async function POST(req: Request) {
  const { latexContent } = (await req.json()) as { latexContent: string };

  if (!latexContent) {
    return NextResponse.json({ error: 'latexContent is required' }, { status: 400 });
  }

  const { pdf, error } = await compilePdf(latexContent);

  if (!pdf) {
    return NextResponse.json({ error: error ?? 'Compilation failed' }, { status: 500 });
  }

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="resume.pdf"',
    },
  });
}
