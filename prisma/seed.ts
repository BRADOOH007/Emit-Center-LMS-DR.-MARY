import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'marongo@learn.emitcenter.com';
  const password = process.env.SEED_PASSWORD || 'ChangeMe123!';
  const passwordHash = hashSync(password, 12);

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        roles: ['super_admin'],
        activeRole: 'super_admin',
        emailVerifiedAt: new Date(),
      },
      create: {
        email,
        fullName: 'Mar Ongo',
        passwordHash,
        roles: ['super_admin'],
        activeRole: 'super_admin',
        emailVerifiedAt: new Date(),
        timezone: 'America/New_York',
        locale: 'en-US',
        currency: 'USD',
      },
    });

    console.log(`Super admin seeded: ${user.email} (${user.id})`);
    console.log(`Demo password: ${password} (set SEED_PASSWORD to override)`);
  } catch (error) {
    console.error('Seed error:', error);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
