import { NextRequest } from 'next/server';
import { hashSync } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';
import { isValidEmail, sanitizeInput } from '@/lib/validation';
import { generatePassword, ensureUniqueUsername } from '@/lib/credentials';
import { toCsv, parseCsv } from '@/lib/sis';

export async function GET(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const { searchParams } = request.nextUrl;
  const role = searchParams.get('role');

  const users = await prisma.user.findMany({
    where: role && ['student', 'instructor', 'parent', 'administrator'].includes(role) ? { roles: { has: role as 'student' | 'instructor' | 'parent' | 'administrator' } } : {},
    orderBy: { createdAt: 'desc' },
    select: {
      fullName: true,
      email: true,
      roles: true,
      phone: true,
      timezone: true,
      locale: true,
      createdAt: true,
    },
  });

  const csv = toCsv(
    users.map((u) => ({
      fullName: u.fullName,
      email: u.email,
      roles: u.roles.join('|'),
      phone: u.phone ?? '',
      timezone: u.timezone,
      locale: u.locale,
      createdAt: u.createdAt.toISOString(),
    })),
  );

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="sis-users-${role ?? 'all'}.csv"`,
    },
  });
}

export async function POST(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const body = await parseBody<{ csv?: string; role?: string }>(request).catch(() => null);
  if (!body?.csv) return badRequest('csv is required');

  const rows = parseCsv(body.csv);
  if (rows.length === 0) return badRequest('No valid rows found in CSV');
  if (rows.length > 500) return badRequest('Import limited to 500 rows per batch');

  const role = body.role && ['student', 'instructor', 'parent'].includes(body.role) ? body.role : 'student';

  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (const row of rows) {
    const fullName = sanitizeInput(row.fullname ?? row.full_name ?? row.name ?? '').slice(0, 120);
    const email = (row.email ?? '').trim().toLowerCase();
    if (!fullName || !email || !isValidEmail(email)) {
      results.errors.push(`Skipped invalid row: ${fullName || email || '(missing name/email)'}`);
      results.skipped++;
      continue;
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      results.skipped++;
      continue;
    }
    const password = generatePassword();
    const username = await ensureUniqueUsername(fullName, async (candidate) =>
      Boolean(await prisma.user.findUnique({ where: { username: candidate } })),
    );
    await prisma.user.create({
      data: {
        fullName,
        email,
        username,
        passwordHash: hashSync(password, 12),
        roles: [role as 'student' | 'instructor' | 'parent'],
        activeRole: role as 'student' | 'instructor' | 'parent',
        phone: row.phone ? sanitizeInput(row.phone).slice(0, 40) : null,
        timezone: row.timezone || 'America/New_York',
        locale: row.locale || 'en-US',
        emailVerifiedAt: new Date(),
      },
    });
    results.created++;
  }

  await writeAuditLog({
    userId: me.id,
    action: 'sis.import',
    resourceType: 'user',
    resourceId: 'batch',
  });

  return ok(results);
}
