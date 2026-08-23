import { notFound } from 'next/navigation';

import { AdminConsole } from './admin-console';
import { activationSummary } from '../../lib/activation';
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
  const [[totalUsers, users], activation] = await Promise.all([
    db.$transaction([
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
    ]),
    activationSummary(),
  ]);

  return (
    <>
      <section className="mx-auto mt-6 max-w-6xl rounded-lg border border-hairline bg-card p-5 text-ink">
        <h2 className="text-xl font-semibold">激活</h2>
        <p className="mt-1 text-sm text-muted">只记首次：注册、建页和发布各计一次。</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-muted"><tr><th className="p-2">渠道</th><th className="p-2">注册</th><th className="p-2">建页</th><th className="p-2">发布</th><th className="p-2">注册→发布中位分钟</th></tr></thead>
            <tbody>{activation.channels.map((row) => <tr className="border-t border-hairline" key={row.channel ?? 'none'}><td className="p-2">{row.channel ?? '未归因'}</td><td className="p-2">{row.registered}</td><td className="p-2">{row.pageCreated}</td><td className="p-2">{row.pagePublished}</td><td className="p-2">{row.medianRegistrationToPublishMinutes ?? '—'}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
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
    </>
  );
}
