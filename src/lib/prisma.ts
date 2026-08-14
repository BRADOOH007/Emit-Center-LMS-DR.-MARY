import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;

async function runWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const code = (error as { code?: string })?.code ?? '';
      const message = String((error as { message?: string })?.message ?? '');
      const isWake = code === 'P1001' || /can't reach database server|database server.*reachable/i.test(message);
      if (isWake && attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

function createPrismaClient() {
  const client = new PrismaClient();
  return client.$extends({
    query: {
      $allOperations({ args, query }) {
        return runWithRetry(() => query(args));
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
