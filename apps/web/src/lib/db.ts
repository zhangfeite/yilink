import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL?.trim()) {
  process.env.DATABASE_URL = 'file:./data/yilink.db';
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
