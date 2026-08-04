if (!process.env.DATABASE_URL?.trim()) {
  process.env.DATABASE_URL = 'file:./data/yilink.db';
}

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('用法：pnpm admin:grant <email>');
  process.exitCode = 1;
} else {
  const { Prisma, PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();

  try {
    const user = await db.user.update({
      where: { email },
      data: { role: 'ADMIN' },
      select: { email: true, role: true },
    });
    console.log(`${user.email} 已提升为 ${user.role}`);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      console.error(`未找到邮箱为 ${email} 的用户。`);
      process.exitCode = 1;
    } else {
      throw error;
    }
  } finally {
    await db.$disconnect();
  }
}
