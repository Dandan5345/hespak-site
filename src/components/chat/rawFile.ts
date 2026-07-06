export interface RawChatFile {
  name: string;
  size: number;
  mimeType: string;
  dataUrl: string;
  summary: string;
  estimatedTokens: number;
}

export const MAX_RAW_FILE_BYTES = 50 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.rtf': 'application/rtf',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv',
  '.tsv': 'text/tsv',
  '.txt': 'text/plain',
  '.text': 'text/plain',
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.json': 'application/json',
  '.xml': 'text/xml',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.jsx': 'text/jsx',
  '.ts': 'text/x-typescript',
  '.tsx': 'text/tsx',
  '.py': 'text/x-python',
  '.java': 'text/x-java',
  '.c': 'text/x-c',
  '.cc': 'text/x-c++',
  '.cpp': 'text/x-c++',
  '.cs': 'text/x-csharp',
  '.go': 'text/x-go',
  '.rs': 'text/x-rust',
  '.sql': 'application/x-sql',
  '.log': 'text/plain',
  '.eml': 'message/rfc822',
  '.ics': 'text/calendar',
  '.vcf': 'text/x-vcard',
  '.yaml': 'application/yaml',
  '.yml': 'application/yaml',
};

const LABEL_BY_EXT: Record<string, string> = {
  '.pdf': 'PDF',
  '.doc': 'Word',
  '.docx': 'Word',
  '.odt': 'Document',
  '.rtf': 'RTF',
  '.ppt': 'PowerPoint',
  '.pptx': 'PowerPoint',
  '.xls': 'Excel',
  '.xlsx': 'Excel',
  '.csv': 'CSV',
  '.tsv': 'TSV',
  '.md': 'Markdown',
  '.markdown': 'Markdown',
  '.json': 'JSON',
  '.xml': 'XML',
  '.html': 'HTML',
  '.htm': 'HTML',
  '.txt': 'Text',
  '.text': 'Text',
};

export const RAW_FILE_ACCEPT = Object.keys(MIME_BY_EXT).join(',');

export class FileUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileUploadError';
  }
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

export function rawFileMimeType(file: File): string {
  const declared = file.type.trim().toLowerCase();
  if (declared) return declared;
  return MIME_BY_EXT[extensionOf(file.name)] ?? 'application/octet-stream';
}

export function isAcceptedRawFile(file: File): boolean {
  const mimeType = rawFileMimeType(file);
  const ext = extensionOf(file.name);
  return Boolean(MIME_BY_EXT[ext] || mimeType.startsWith('text/'));
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new FileUploadError('קריאת הקובץ נכשלה'));
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

function labelForFile(file: File): string {
  const ext = extensionOf(file.name);
  if (LABEL_BY_EXT[ext]) return LABEL_BY_EXT[ext];
  if (rawFileMimeType(file).startsWith('text/')) return 'Text';
  return 'File';
}

export function estimateRawFileTokens(size: number): number {
  return Math.min(60_000, Math.max(300, Math.ceil(size / 1024)));
}

export async function prepareRawFile(file: File): Promise<RawChatFile> {
  if (file.size > MAX_RAW_FILE_BYTES) {
    throw new FileUploadError(`הקובץ גדול מדי (מקסימום ${Math.round(MAX_RAW_FILE_BYTES / 1024 / 1024)} MB)`);
  }
  if (!isAcceptedRawFile(file)) {
    throw new FileUploadError('סוג הקובץ לא נתמך לשליחה ישירה ל-GPT/Gemini');
  }

  const mimeType = rawFileMimeType(file);
  const rawDataUrl = await readAsDataURL(file);
  const comma = rawDataUrl.indexOf(',');
  if (comma < 0) throw new FileUploadError('קריאת הקובץ נכשלה');
  const base64 = rawDataUrl.slice(comma + 1);

  return {
    name: file.name,
    size: file.size,
    mimeType,
    dataUrl: `data:${mimeType};base64,${base64}`,
    summary: `${labelForFile(file)} · ${formatBytes(file.size)}`,
    estimatedTokens: estimateRawFileTokens(file.size),
  };
}
