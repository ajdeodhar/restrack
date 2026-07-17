import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { importProfile, filterNewProfileItems } from '@/lib/claude';
import { extractTextFromFile } from '@/lib/parseResumeFile';
import { getAuthedUser } from '@/lib/session';
import type { ProfileItem } from '@/types';

interface SourceResult {
  name: string;
  itemsFound: number;
  error?: string;
}

export async function POST(req: Request) {
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = await storage.getEffectiveAnthropicKey(auth.userId);
  if (!apiKey) {
    return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 400 });
  }

  const contentType = req.headers.get('content-type') ?? '';
  const sources: { name: string; text: string; sourceId: string }[] = [];
  const sourceResults: SourceResult[] = [];

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const files = formData.getAll('files').filter((f): f is File => f instanceof File);
    const pastedText = (formData.get('text') as string | null) ?? '';

    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const text = await extractTextFromFile(file.name, buffer);
        if (text.trim()) {
          const importSource = await storage.createImportSource(auth.userId, {
            kind: 'file',
            fileName: file.name,
            mimeType: file.type || undefined,
            fileBytes: buffer,
            extractedText: text,
          });
          sources.push({ name: file.name, text, sourceId: importSource.id });
        } else {
          sourceResults.push({ name: file.name, itemsFound: 0, error: 'No extractable text found' });
        }
      } catch (err: unknown) {
        sourceResults.push({
          name: file.name,
          itemsFound: 0,
          error: err instanceof Error ? err.message : 'Failed to read file',
        });
      }
    }

    if (pastedText.trim()) {
      const importSource = await storage.createImportSource(auth.userId, {
        kind: 'pasted_text',
        fileName: 'Pasted text',
        extractedText: pastedText,
      });
      sources.push({ name: 'Pasted text', text: pastedText, sourceId: importSource.id });
    }
  } else {
    const { resumeText } = (await req.json()) as { resumeText: string };
    if (resumeText?.trim()) {
      const importSource = await storage.createImportSource(auth.userId, {
        kind: 'pasted_text',
        fileName: 'Pasted text',
        extractedText: resumeText,
      });
      sources.push({ name: 'Pasted text', text: resumeText, sourceId: importSource.id });
    }
  }

  if (sources.length === 0) {
    return NextResponse.json(
      { error: 'No usable resume text or files provided', sources: sourceResults },
      { status: 400 }
    );
  }

  // Extract candidate items per source (keeps each Claude call focused on one document).
  const candidates: Omit<ProfileItem, 'id' | 'createdAt'>[] = [];
  for (const source of sources) {
    try {
      const extracted = await importProfile({ apiKey, resumeText: source.text });
      const normalized = extracted.map((item) => ({
        ...item,
        tags: item.tags ?? [],
        sourceId: source.sourceId,
      }));
      candidates.push(...normalized);
      sourceResults.push({ name: source.name, itemsFound: normalized.length });
    } catch (err: unknown) {
      sourceResults.push({
        name: source.name,
        itemsFound: 0,
        error: err instanceof Error ? err.message : 'Extraction failed',
      });
    }
  }

  // Dedup against the existing profile (and against each other, e.g. the same
  // job appearing in two different resume versions uploaded together).
  const existing = await storage.getProfile(auth.userId);
  const newIndices = await filterNewProfileItems({ apiKey, existing, candidates });
  const toInsert = newIndices.map((i) => candidates[i]).filter(Boolean);

  const items = await Promise.all(toInsert.map((item) => storage.createProfileItem(auth.userId, item)));

  return NextResponse.json({
    items,
    addedCount: items.length,
    duplicateCount: candidates.length - items.length,
    sources: sourceResults,
  });
}
