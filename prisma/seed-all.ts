import { PrismaClient, type RoleName } from '@prisma/client';
import { hashSync } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const users = [
    { email: 'marongo@learn.emitcenter.com', fullName: 'Mar Ongo', password: 'Root26', roles: ['super_admin'] as RoleName[], activeRole: 'super_admin' as const },
    { email: 'admin@emitcenter.com', fullName: 'Admin User', password: 'Root26', roles: ['administrator'] as RoleName[], activeRole: 'administrator' as const },
    { email: 'instructor@emitcenter.com', fullName: 'Sarah Instructor', password: 'Root26', roles: ['instructor'] as RoleName[], activeRole: 'instructor' as const },
    { email: 'student@emitcenter.com', fullName: 'Alex Student', password: 'Root26', roles: ['student'] as RoleName[], activeRole: 'student' as const },
    { email: 'parent@emitcenter.com', fullName: 'Jordan Parent', password: 'Root26', roles: ['parent'] as RoleName[], activeRole: 'parent' as const },
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      await prisma.user.update({
        where: { email: u.email },
        data: { roles: u.roles, activeRole: u.activeRole },
      });
      console.log(`Updated: ${u.email} (${u.activeRole})`);
    } else {
      await prisma.user.create({
        data: {
          email: u.email,
          fullName: u.fullName,
          passwordHash: hashSync(u.password, 12),
          roles: u.roles,
          activeRole: u.activeRole,
          timezone: 'America/New_York',
          locale: 'en-US',
          currency: 'USD',
        },
      });
      console.log(`Created: ${u.email} (${u.activeRole})`);
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seed complete — all 5 role users ready.');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
