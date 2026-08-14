import { PrismaClient, type RoleName } from '@prisma/client';
import { hashSync } from 'bcryptjs';
import { generateUsernameFromFullName } from '../src/lib/credentials';

const prisma = new PrismaClient();

function seedPassword(): string {
  return process.env.SEED_PASSWORD || 'Root26';
}

const users = [
  { email: 'marongo@learn.emitcenter.com', fullName: 'Larry Marongo', roles: ['super_admin'] as RoleName[], activeRole: 'super_admin' as const },
  { email: 'admin@emitcenter.com', fullName: 'Admin User', roles: ['administrator'] as RoleName[], activeRole: 'administrator' as const },
  { email: 'instructor@emitcenter.com', fullName: 'Sarah Instructor', roles: ['instructor'] as RoleName[], activeRole: 'instructor' as const },
  { email: 'student@emitcenter.com', fullName: 'Alex Student', roles: ['student'] as RoleName[], activeRole: 'student' as const },
  { email: 'test@emitcenter.com', fullName: 'Test Student', roles: ['student'] as RoleName[], activeRole: 'student' as const },
  { email: 'parent@emitcenter.com', fullName: 'Jordan Parent', roles: ['parent'] as RoleName[], activeRole: 'parent' as const },
];

async function main() {
  const password = seedPassword();
  const passwordHash = hashSync(password, 12);

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      await prisma.user.update({
        where: { email: u.email },
        data: {
          fullName: u.fullName,
          username: existing.username ?? generateUsernameFromFullName(u.fullName),
          roles: u.roles,
          activeRole: u.activeRole,
          passwordHash,
          emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
        },
      });
      console.log(`Updated: ${u.email} (${u.activeRole})`);
    } else {
      await prisma.user.create({
        data: {
          email: u.email,
          fullName: u.fullName,
          username: generateUsernameFromFullName(u.fullName),
          passwordHash,
          roles: u.roles,
          activeRole: u.activeRole,
          emailVerifiedAt: new Date(),
          timezone: 'America/New_York',
          locale: 'en-US',
          currency: 'USD',
        },
      });
      console.log(`Created: ${u.email} (${u.activeRole})`);
    }
  }

  console.log(`Seed complete. Demo password: ${password} (set SEED_PASSWORD to override)`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Done.');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
