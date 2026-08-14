import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, serverError } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isRateLimited, writeAuditLog } from '@/lib/security';
import { saveUploadedFile, MAX_FILE_BYTES } from '@/lib/storage';

export const runtime = 'nodejs';

const ALLOWED_MIME: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'text/markdown': ['.md'],
  'application/zip': ['.zip'],
  'application/x-zip-compressed': ['.zip'],
  'video/mp4': ['.mp4'],
  'audio/mpeg': ['.mp3'],
  'application/json': ['.json'],
  'application/octet-stream': ['.scorm'],
};

export async function POST(request: NextRequest) {
  if (isRateLimited(request)) return badRequest('Too many requests. Please try again later.');

  const me = await getSessionUser();
  if (!me) return forbid('Sign in to upload files');

  const form = await request.formData().catch(() => null);
  if (!form) return badRequest('Expected multipart form data');
  const file = form.get('file');
  if (!(file instanceof File)) return badRequest('No file provided');

  const originalName = (form.get('name') as string | null) ?? file.name;
  const mimeType = file.type || 'application/octet-stream';
  const allowedExts = ALLOWED_MIME[mimeType];
  const ext = originalName.includes('.') ? `.${originalName.split('.').pop()!.toLowerCase()}` : '';
  if (allowedExts && !allowedExts.includes(ext)) {
    return badRequest(`File type ${mimeType} is not allowed.`);
  }

  if (file.size > MAX_FILE_BYTES) {
    return badRequest('File exceeds the 25 MB limit.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const saved = await saveUploadedFile(buffer, { mimeType, originalName });
    const row = await prisma.uploadedFile.create({
      data: {
        userId: me.id,
        originalName,
        mimeType,
        size: file.size,
        storage: saved.storage,
        key: saved.key,
        url: saved.url ?? null,
      },
    });
    await writeAuditLog({
      userId: me.id,
      action: 'upload.created',
      resourceType: 'file',
      resourceId: row.id,
    });
    return ok({
      id: row.id,
      url: saved.url ?? `/api/uploads/${row.id}`,
      key: saved.key,
      originalName,
      mimeType,
      size: file.size,
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Upload failed');
  }
}