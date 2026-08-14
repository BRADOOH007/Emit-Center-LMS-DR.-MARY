import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { forbid, notFound } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { readStoredFile, type StorageKind } from '@/lib/storage';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getSessionUser();
  if (!me) return forbid('Sign in to download files');

  const file = await prisma.uploadedFile.findUnique({ where: { id } });
  if (!file) return notFound('File not found');

  const uploader = await prisma.user.findUnique({ where: { id: file.userId } });
  const sameUser = file.userId === me.id;
  const isStaff = me.roles.includes('super_admin') || me.roles.includes('administrator') || me.roles.includes('instructor');
  if (!sameUser && !isStaff) return forbid('You do not have access to this file');

  try {
    const buffer = await readStoredFile(file.storage as StorageKind, file.key);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': file.mimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return notFound('File content is unavailable');
  }
}