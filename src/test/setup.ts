import { vi } from 'vitest';

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));
