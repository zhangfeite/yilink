import { notFound } from 'next/navigation';

import { AdminConsole } from './admin-console';
import { db } from '../../lib/db';
import { ADMIN_USER_PAGE_SIZE, currentAdminId } from '../../lib/moderation';

export default async function AdminPage() {
  if (!(await currentAdminId())) {
    notFound();
  }

  const records = await db.moderationRecord.findMany({
    where: { targetType: 'page', verdict: 'review', reviewedBy: null },
    orderBy: { createdAt: 'desc' },
  });
  const targetIds = [...new Set(records.map((record) => record.targetId))];
  const pages = targetIds.length
    ? await db.page.findMany({
        where: { id: { in: targetIds } },
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          user: { select: { email: true } },
        },
      })
    : [];
  const pagesById = new Map(pages.map((page) => [page.id, page]));
  const [totalUsers, users] = await db.$transaction([
    db.user.count(),
    db.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: ADMIN_USER_PAGE_SIZE,
      select: {
        id: true,
        email: true,
        plan: true,
        trustLevel: true,
        _count: { select: { pages: true } },
      },
    }),
  ]);

  return (
    <AdminConsole
      initialRecords={records.map((record) => ({
        ...record,
        createdAt: record.createdAt.toISOString(),
        page: pagesById.get(record.targetId) ?? null,
      }))}
      initialUserPagination={{
        page: 1,
        pageSize: ADMIN_USER_PAGE_SIZE,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / ADMIN_USER_PAGE_SIZE),
      }}
      initialUsers={users}
    />
  );
}
