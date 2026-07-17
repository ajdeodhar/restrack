import { extractText, getDocumentProxy } from 'unpdf';
import mammoth from 'mammoth';

const PLAIN_TEXT_EXTENSIONS = new Set(['txt', 'md', 'tex']);

export async function extractTextFromFile(filename: string, buffer: Buffer): Promise<string> {
  const ext = filename.toLowerCase().split('.').pop() ?? '';

  if (ext === 'pdf') {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  }

  if (ext === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (PLAIN_TEXT_EXTENSIONS.has(ext)) {
    return buffer.toString('utf-8');
  }

  throw new Error(`Unsupported file type ".${ext}" — supported: .pdf, .docx, .txt, .md, .tex`);
}
