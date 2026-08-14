import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

export type StorageKind = 'local' | 'vercel_blob';

interface SaveResult {
  storage: StorageKind;
  key: string;
  url?: string;
}

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN?.trim();
const USE_BLOB = Boolean(BLOB_TOKEN);
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

const LOCAL_DIR =
  process.env.UPLOAD_DIR ||
  path.join(process.cwd(), process.env.NODE_ENV === 'production' ? 'data' : 'data', 'uploads');

function newKey(originalName: string): string {
  const ext = path.extname(originalName).slice(0, 16).toLowerCase();
  return `${Date.now().toString(36)}-${randomBytes(12).toString('hex')}${ext}`;
}

// Upload bytes to Vercel Blob via its REST API (no SDK required).
async function saveToBlob(buffer: Buffer, key: string, mimeType: string, originalName: string): Promise<string> {
  const res = await fetch(`https://blob.vercel-storage.com/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${BLOB_TOKEN}`,
      'x-vercel-blob-download-name': originalName,
      'Content-Type': mimeType,
    },
    body: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) as unknown as BodyInit,
  });
  if (!res.ok) throw new Error(`Blob upload failed: ${res.status}`);
  const json = (await res.json().catch(() => null)) as { url?: string } | null;
  return json?.url ?? `https://blob.vercel-storage.com/${encodeURIComponent(key)}`;
}

export async function saveUploadedFile(buffer: Buffer, input: { mimeType: string; originalName: string }): Promise<SaveResult> {
  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new Error('File exceeds the 25 MB limit.');
  }
  const key = newKey(input.originalName);
  if (USE_BLOB) {
    const url = await saveToBlob(buffer, key, input.mimeType, input.originalName);
    return { storage: 'vercel_blob', key, url };
  }
  await fs.mkdir(path.dirname(path.join(LOCAL_DIR, key)), { recursive: true });
  await fs.writeFile(path.join(LOCAL_DIR, key), buffer);
  return { storage: 'local', key };
}

export async function readStoredFile(storage: StorageKind, key: string): Promise<Buffer> {
  if (storage === 'vercel_blob') {
    const res = await fetch(`https://blob.vercel-storage.com/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${BLOB_TOKEN}` },
    });
    if (!res.ok) throw new Error('File not found');
    return Buffer.from(await res.arrayBuffer());
  }
  return fs.readFile(path.join(LOCAL_DIR, key));
}

export async function deleteStoredFile(storage: StorageKind, key: string): Promise<void> {
  try {
    if (storage === 'vercel_blob') {
      await fetch(`https://blob.vercel-storage.com/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${BLOB_TOKEN}` },
      });
    } else {
      await fs.unlink(path.join(LOCAL_DIR, key));
    }
  } catch {
    /* non-fatal */
  }
}

export { USE_BLOB, MAX_FILE_BYTES };