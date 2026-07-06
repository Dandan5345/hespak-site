// Client-side extraction of text content from uploaded files (Excel, PDF,
// CSV, plain text) so the AI agent can read them. Extraction happens entirely
// in the browser — the file never leaves the device in raw form; only the
// extracted text is injected into the chat as a user turn. This works with
// every provider (DeepSeek/GPT/Gemini) since they all accept plain text.
//
// Excel  → SheetJS (xlsx): every sheet rendered as a Markdown table.
// PDF    → pdfjs-dist: page text concatenated, with page markers.
// CSV    → parsed natively into a Markdown table.
// Text   → read as-is (utf-8).

import * as XLSX from 'xlsx';
import { getDocument, GlobalWorkerOptions, version as pdfjsVersion, type PDFDocumentProxy } from 'pdfjs-dist';

// Configure the pdf.js worker. Using the CDN build matching the installed
// version is the most reliable approach under Vite (avoids bundler worker
// resolution issues in both dev and production). Falls back to a bundled
// worker URL if the CDN is unreachable — pdf.js will retry automatically.
GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;

export interface ParsedFile {
  /** Friendly name shown to the user + sent to the model. */
  name: string;
  /** Size in bytes (for the UI chip). */
  size: number;
  /** The extracted, model-ready text. */
  text: string;
  /** Short label like "Excel · 3 גיליונות" for the UI. */
  summary: string;
}

/** Max bytes we'll accept — keeps the browser responsive and the chat context
 * sane. 25 MB is generous for spreadsheets/documents. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** Hard cap on extracted text length (chars). Anything bigger is truncated
 * with a notice — the model context window can't realistically hold a 500-page
 * book anyway, and the user can ask about specific parts. */
const MAX_TEXT_CHARS = 60_000;

const ACCEPTED_EXTS = ['.xlsx', '.xls', '.csv', '.pdf', '.txt', '.md', '.json', '.xml', '.html', '.htm'];

export function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTS.some((ext) => name.endsWith(ext));
}

export class FileParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileParseError';
  }
}

function truncate(text: string): string {
  if (text.length <= MAX_TEXT_CHARS) return text;
  const head = text.slice(0, MAX_TEXT_CHARS);
  return `${head}\n\n[…התוכן קוצץ — הצגתי ${MAX_TEXT_CHARS.toLocaleString()} תווים ראשונים מתוך ${text.length.toLocaleString()}]`;
}

/** Read a File as text with the given encoding (default utf-8). */
function readAsText(file: File, encoding = 'utf-8'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new FileParseError('קריאת הקובץ נכשלה'));
    reader.readAsText(file, encoding);
  });
}

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new FileParseError('קריאת הקובץ נכשלה'));
    reader.readAsArrayBuffer(file);
  });
}

/** Render a 2D array of cells as a GitHub-flavored Markdown table. Empty
 * sheets are skipped. Numbers/booleans are stringified; nulls become ''. */
function rowsToMarkdown(rows: unknown[][]): string {
  if (!rows.length) return '';
  const clean = rows.map((row) => row.map((c) => (c == null ? '' : String(c)).replace(/\|/g, '\\|').replace(/\n/g, ' ')));
  // Drop fully-empty trailing rows.
  while (clean.length && clean[clean.length - 1].every((c) => c === '')) clean.pop();
  if (!clean.length) return '';
  const width = Math.max(...clean.map((r) => r.length));
  const norm = clean.map((r) => {
    const out = [...r];
    while (out.length < width) out.push('');
    return out;
  });
  const header = norm[0];
  const body = norm.slice(1);
  const line = (cells: string[]) => `| ${cells.join(' | ')} |`;
  const sep = `| ${Array(width).fill('---').join(' | ')} |`;
  return [line(header), sep, ...body.map(line)].join('\n');
}

async function parseExcel(file: File): Promise<{ text: string; summary: string }> {
  const buf = await readAsArrayBuffer(file);
  const wb = XLSX.read(buf, { type: 'array' });
  const sheets: string[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, defval: '' });
    const md = rowsToMarkdown(rows as unknown[][]);
    if (md) sheets.push(`### גיליון: ${name}\n\n${md}`);
  }
  const text = sheets.join('\n\n---\n\n') || '(הקובץ ריק)';
  const summary = `Excel · ${wb.SheetNames.length} גיליון/ות`;
  return { text, summary };
}

async function parseCsv(file: File): Promise<{ text: string; summary: string }> {
  const raw = await readAsText(file);
  // Lightweight CSV parser (handles quoted fields, commas, newlines).
  const rows = parseCsvText(raw);
  const md = rowsToMarkdown(rows);
  return { text: md || '(הקובץ ריק)', summary: `CSV · ${rows.length} שורות` };
}

function parseCsvText(raw: string): unknown[][] {
  const rows: unknown[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (inQuotes) {
      if (c === '"') {
        if (raw[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); field = '';
      rows.push(row); row = [];
    } else if (c === '\r') {
      // ignore — handled by \n
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function parsePdf(file: File): Promise<{ text: string; summary: string }> {
  const buf = await readAsArrayBuffer(file);
  // pdfjs needs a worker. In Vite we point at the CDN build matching the
  // installed version — this avoids bundler worker-resolution headaches and
  // works identically in dev and production.
  const data = new Uint8Array(buf);
  const loadingTask = getDocument({
    data,
    // Disable workers fetching external resources we don't need.
    disableFontFace: true,
    isEvalSupported: false,
  });
  let pdf: PDFDocumentProxy;
  try {
    pdf = await loadingTask.promise;
  } catch {
    throw new FileParseError('לא הצלחתי לקרוא את ה-PDF — ייתכן שהוא מוגן או פגום');
  }
  const pages: string[] = [];
  const total = pdf.numPages;
  // Cap at 200 pages so a huge PDF doesn't hang the tab.
  const maxPages = Math.min(total, 200);
  for (let p = 1; p <= maxPages; p++) {
    try {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const text = content.items
        .map((it) => ('str' in it ? (it as { str: string }).str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) pages.push(`--- עמוד ${p}/${total} ---\n${text}`);
    } catch {
      // Skip a page that fails to render rather than aborting the whole file.
    }
  }
  await pdf.destroy().catch(() => {});
  const text = pages.join('\n\n') || '(לא נמצא טקסט ב-PDF — ייתכן שהוא סרוק כתמונות)';
  const summary = `PDF · ${total} עמוד/ים`;
  return { text, summary };
}

async function parseTextLike(file: File): Promise<{ text: string; summary: string }> {
  const text = await readAsText(file);
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const label = ext === 'md' ? 'Markdown' : ext === 'json' ? 'JSON' : ext === 'xml' ? 'XML' : ext === 'html' || ext === 'htm' ? 'HTML' : 'טקסט';
  return { text, summary: `${label} · ${text.length.toLocaleString()} תווים` };
}

/** Main entry: detect type by extension and dispatch to the right parser. */
export async function parseFile(file: File): Promise<ParsedFile> {
  if (file.size > MAX_FILE_BYTES) {
    throw new FileParseError(`הקובץ גדול מדי (מקסימום ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB)`);
  }
  const name = file.name.toLowerCase();
  let result: { text: string; summary: string };
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    result = await parseExcel(file);
  } else if (name.endsWith('.csv')) {
    result = await parseCsv(file);
  } else if (name.endsWith('.pdf')) {
    result = await parsePdf(file);
  } else if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.json') || name.endsWith('.xml') || name.endsWith('.html') || name.endsWith('.htm')) {
    result = await parseTextLike(file);
  } else {
    throw new FileParseError('סוג קובץ לא נתמך');
  }
  return {
    name: file.name,
    size: file.size,
    text: truncate(result.text),
    summary: result.summary,
  };
}
