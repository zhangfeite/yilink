'use client';

import { useCallback, useState, type FormEvent } from 'react';

type PageStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'HIDDEN';

interface AdminPageSummary {
  id: string;
  slug: string;
  title: string;
  status: PageStatus;
  hiddenReason?: string | null;
  user: { email: string | null };
}

interface ModerationQueueRecord {
  id: string;
  provider: string;
  verdict: string;
  detail: unknown;
  createdAt: string;
  page: AdminPageSummary | null;
}

interface AdminUserSummary {
  id: string;
  email: string | null;
  plan: string;
  trustLevel: number;
  _count: { pages: number };
}

interface UsersResponse {
  users: AdminUserSummary[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

interface AdminConsoleProps {
  initialRecords: ModerationQueueRecord[];
  initialUsers: AdminUserSummary[];
  initialUserPagination: UsersResponse['pagination'];
}

function errorMessage(payload: unknown) {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'error' in payload &&
    typeof payload.error === 'object' &&
    payload.error !== null &&
    'message' in payload.error &&
    typeof payload.error.message === 'string'
  ) {
    return payload.error.message;
  }

  return '操作失败，请稍后重试。';
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('content-type', 'application/json');
  const response = await fetch(path, {
    ...init,
    headers,
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(errorMessage(payload));
  }

  return payload as T;
}

function hitWords(detail: unknown) {
  if (
    typeof detail === 'object' &&
    detail !== null &&
    'labels' in detail &&
    Array.isArray(detail.labels)
  ) {
    return detail.labels.filter((label): label is string => typeof label === 'string');
  }

  return [];
}

function statusLabel(status: PageStatus) {
  if (status === 'PUBLISHED') return '已发布';
  if (status === 'REVIEW') return '审核中';
  if (status === 'HIDDEN') return '已隐藏';
  return '草稿';
}

export function AdminConsole({
  initialRecords,
  initialUsers,
  initialUserPagination,
}: AdminConsoleProps) {
  const [activeTab, setActiveTab] = useState<'moderation' | 'management'>('moderation');
  const [records, setRecords] = useState<ModerationQueueRecord[]>(initialRecords);
  const [pages, setPages] = useState<AdminPageSummary[]>([]);
  const [users, setUsers] = useState<AdminUserSummary[]>(initialUsers);
  const [userPagination, setUserPagination] = useState<UsersResponse['pagination'] | null>(
    initialUserPagination,
  );
  const [slug, setSlug] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [hideReasons, setHideReasons] = useState<Record<string, string>>({});
  const [trustLevels, setTrustLevels] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialUsers.map((user) => [user.id, String(user.trustLevel)])),
  );
  const [loadingModeration, setLoadingModeration] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadModeration = useCallback(async () => {
    try {
      const response = await apiRequest<{ records: ModerationQueueRecord[] }>(
        '/api/v1/admin/moderation?filter=review',
      );
      setRecords(response.records);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '审核队列加载失败。');
    } finally {
      setLoadingModeration(false);
    }
  }, []);

  const searchPages = useCallback(async (value: string) => {
    const query = value.trim();
    if (!query) {
      setPages([]);
      return;
    }

    setLoadingPages(true);
    try {
      const response = await apiRequest<{ pages: AdminPageSummary[] }>(
        `/api/v1/admin/pages?slug=${encodeURIComponent(query)}`,
      );
      setPages(response.pages);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '页面检索失败。');
    } finally {
      setLoadingPages(false);
    }
  }, []);

  const loadUsers = useCallback(async (query: string, page = 1) => {
    try {
      const response = await apiRequest<UsersResponse>(
        `/api/v1/admin/users?query=${encodeURIComponent(query)}&page=${page}`,
      );
      setUsers(response.users);
      setUserPagination(response.pagination);
      setTrustLevels(
        Object.fromEntries(response.users.map((user) => [user.id, String(user.trustLevel)])),
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '用户列表加载失败。');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  async function hidePage(pageId: string) {
    const reason = hideReasons[pageId]?.trim();
    if (!reason) {
      setError('隐藏页面前请填写内部处理原因。');
      return;
    }

    setError(null);
    try {
      await apiRequest(`/api/v1/admin/pages/${pageId}/hide`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      setNotice('页面已隐藏；公开访问只会看到通用不可用提示。');
      setLoadingModeration(true);
      await Promise.all([loadModeration(), searchPages(slug)]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '隐藏页面失败。');
    }
  }

  async function restorePage(pageId: string) {
    setError(null);
    try {
      await apiRequest(`/api/v1/admin/pages/${pageId}/restore`, { method: 'POST' });
      setNotice('页面已恢复发布。');
      setLoadingModeration(true);
      await Promise.all([loadModeration(), searchPages(slug)]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '恢复页面失败。');
    }
  }

  async function resolveRecord(recordId: string) {
    setError(null);
    try {
      await apiRequest(`/api/v1/admin/moderation/${recordId}/resolve`, { method: 'POST' });
      setNotice('已标记为人工审核通过。');
      setLoadingModeration(true);
      await loadModeration();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '审核操作失败。');
    }
  }

  async function updateTrustLevel(userId: string) {
    const trustLevel = Number(trustLevels[userId]);
    if (!Number.isInteger(trustLevel) || trustLevel < 0 || trustLevel > 100) {
      setError('信任分必须是 0 到 100 的整数。');
      return;
    }

    setError(null);
    try {
      await apiRequest(`/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ trustLevel }),
      });
      setNotice('用户信任分已更新。');
      setLoadingUsers(true);
      await loadUsers(userQuery, userPagination?.page ?? 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '信任分更新失败。');
    }
  }

  function submitPageSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    void searchPages(slug);
  }

  function submitUserSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoadingUsers(true);
    void loadUsers(userQuery);
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl p-6 sm:p-10">
      <header className="border-b border-hairline pb-5">
        <p className="text-sm font-medium text-muted">YiLink 内部管理</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">审核与用户管理</h1>
        <nav aria-label="管理后台导航" className="mt-5 flex gap-2">
          <button
            aria-pressed={activeTab === 'moderation'}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              activeTab === 'moderation'
                ? 'bg-accent text-white'
                : 'bg-card text-ink ring-1 ring-hairline hover:bg-card-muted'
            }`}
            onClick={() => setActiveTab('moderation')}
            type="button"
          >
            待人审队列
          </button>
          <button
            aria-pressed={activeTab === 'management'}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              activeTab === 'management'
                ? 'bg-accent text-white'
                : 'bg-card text-ink ring-1 ring-hairline hover:bg-card-muted'
            }`}
            onClick={() => setActiveTab('management')}
            type="button"
          >
            页面与用户
          </button>
        </nav>
      </header>

      {notice ? <p className="mt-5 rounded-md bg-accent-soft p-3 text-sm text-accent">{notice}</p> : null}
      {error ? <p className="mt-5 rounded-md bg-danger-soft p-3 text-sm text-danger">{error}</p> : null}

      {activeTab === 'moderation' ? (
        <section className="mt-8">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">待人工审核</h2>
              <p className="mt-1 text-sm text-muted">
                机审命中后页面保持不可公开，人工通过后才恢复展示。
              </p>
            </div>
            <button
              className="rounded-md border border-hairline bg-card px-3 py-2 text-sm hover:bg-card-muted"
              onClick={() => {
                setLoadingModeration(true);
                void loadModeration();
              }}
              type="button"
            >
              刷新
            </button>
          </div>

          <div className="mt-5 overflow-x-auto rounded-lg border border-hairline bg-card">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-card-muted text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">页面</th>
                  <th className="px-4 py-3 font-medium">命中词</th>
                  <th className="px-4 py-3 font-medium">提交时间</th>
                  <th className="px-4 py-3 font-medium">处理</th>
                </tr>
              </thead>
              <tbody>
                {loadingModeration ? (
                  <tr><td className="px-4 py-5 text-muted" colSpan={4}>加载中…</td></tr>
                ) : records.length === 0 ? (
                  <tr><td className="px-4 py-5 text-muted" colSpan={4}>暂无待人审内容。</td></tr>
                ) : (
                  records.map((record) => {
                    const words = hitWords(record.detail);
                    const page = record.page;
                    return (
                      <tr className="border-t border-hairline align-top" key={record.id}>
                        <td className="px-4 py-3">
                          {page ? (
                            <>
                              <a
                                className="font-medium text-sky-700 underline"
                                href={`/p/${page.slug}`}
                                rel="noreferrer"
                                target="_blank"
                              >
                                {page.title}
                              </a>
                              <p className="mt-1 text-xs text-muted">/{page.slug} · {page.user.email ?? '未设置邮箱'}</p>
                            </>
                          ) : (
                            <span className="text-muted">原页面已删除</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-ink">{words.join('、') || '无'}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted">
                          {new Date(record.createdAt).toLocaleString('zh-CN')}
                        </td>
                        <td className="min-w-72 px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              className="rounded-md bg-accent px-3 py-2 text-white hover:bg-accent"
                              onClick={() => void resolveRecord(record.id)}
                              type="button"
                            >
                              通过
                            </button>
                            {page ? (
                              <form
                                className="flex flex-wrap gap-2"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  void hidePage(page.id);
                                }}
                              >
                                <input
                                  className="min-w-40 rounded-md border border-hairline px-3 py-2"
                                  onChange={(event) =>
                                    setHideReasons((current) => ({
                                      ...current,
                                      [page.id]: event.target.value,
                                    }))
                                  }
                                  placeholder="内部处理原因"
                                  value={hideReasons[page.id] ?? ''}
                                />
                                <button className="rounded-md bg-accent px-3 py-2 text-white hover:bg-accent-strong" type="submit">
                                  隐藏
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="mt-8 space-y-10">
          <div>
            <h2 className="text-xl font-semibold">页面检索</h2>
            <form className="mt-4 flex max-w-xl gap-2" onSubmit={submitPageSearch}>
              <input
                className="min-w-0 flex-1 rounded-md border border-hairline px-3 py-2"
                onChange={(event) => setSlug(event.target.value)}
                placeholder="按 slug 检索，例如 my-page"
                value={slug}
              />
              <button className="rounded-md bg-accent px-4 py-2 text-white hover:bg-accent-strong" type="submit">
                检索
              </button>
            </form>
            <div className="mt-4 overflow-x-auto rounded-lg border border-hairline bg-card">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-card-muted text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">页面</th>
                    <th className="px-4 py-3 font-medium">状态</th>
                    <th className="px-4 py-3 font-medium">处理</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPages ? (
                    <tr><td className="px-4 py-5 text-muted" colSpan={3}>检索中…</td></tr>
                  ) : pages.length === 0 ? (
                    <tr><td className="px-4 py-5 text-muted" colSpan={3}>输入 slug 后检索页面。</td></tr>
                  ) : (
                    pages.map((page) => (
                      <tr className="border-t border-hairline align-top" key={page.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium">{page.title}</p>
                          <p className="mt-1 text-xs text-muted">/{page.slug} · {page.user.email ?? '未设置邮箱'}</p>
                          {page.hiddenReason ? <p className="mt-1 text-xs text-muted">原因：{page.hiddenReason}</p> : null}
                        </td>
                        <td className="px-4 py-3">{statusLabel(page.status)}</td>
                        <td className="min-w-72 px-4 py-3">
                          {page.status === 'HIDDEN' ? (
                            <button
                              className="rounded-md bg-accent px-3 py-2 text-white hover:bg-accent"
                              onClick={() => void restorePage(page.id)}
                              type="button"
                            >
                              恢复发布
                            </button>
                          ) : (
                            <form
                              className="flex flex-wrap gap-2"
                              onSubmit={(event) => {
                                event.preventDefault();
                                void hidePage(page.id);
                              }}
                            >
                              <input
                                className="min-w-40 rounded-md border border-hairline px-3 py-2"
                                onChange={(event) =>
                                  setHideReasons((current) => ({
                                    ...current,
                                    [page.id]: event.target.value,
                                  }))
                                }
                                placeholder="内部处理原因"
                                value={hideReasons[page.id] ?? ''}
                              />
                              <button className="rounded-md bg-accent px-3 py-2 text-white hover:bg-accent-strong" type="submit">
                                隐藏
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">用户与信任分</h2>
                <p className="mt-1 text-sm text-muted">信任分用于新账号的风险分级，范围为 0–100。</p>
              </div>
              <form className="flex gap-2" onSubmit={submitUserSearch}>
                <input
                  className="rounded-md border border-hairline px-3 py-2"
                  onChange={(event) => setUserQuery(event.target.value)}
                  placeholder="按邮箱检索"
                  value={userQuery}
                />
                <button className="rounded-md border border-hairline bg-card px-4 py-2 hover:bg-card-muted" type="submit">
                  检索
                </button>
              </form>
            </div>
            <div className="mt-4 overflow-x-auto rounded-lg border border-hairline bg-card">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-card-muted text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">邮箱</th>
                    <th className="px-4 py-3 font-medium">套餐</th>
                    <th className="px-4 py-3 font-medium">页面数</th>
                    <th className="px-4 py-3 font-medium">信任分</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    <tr><td className="px-4 py-5 text-muted" colSpan={4}>加载中…</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td className="px-4 py-5 text-muted" colSpan={4}>没有匹配的用户。</td></tr>
                  ) : (
                    users.map((user) => (
                      <tr className="border-t border-hairline" key={user.id}>
                        <td className="px-4 py-3">{user.email ?? '未设置邮箱'}</td>
                        <td className="px-4 py-3">{user.plan}</td>
                        <td className="px-4 py-3">{user._count.pages}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              className="w-20 rounded-md border border-hairline px-3 py-2"
                              max="100"
                              min="0"
                              onChange={(event) =>
                                setTrustLevels((current) => ({
                                  ...current,
                                  [user.id]: event.target.value,
                                }))
                              }
                              type="number"
                              value={trustLevels[user.id] ?? String(user.trustLevel)}
                            />
                            <button
                              className="rounded-md border border-hairline bg-card px-3 py-2 hover:bg-card-muted"
                              onClick={() => void updateTrustLevel(user.id)}
                              type="button"
                            >
                              保存
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {userPagination ? (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
                <p>第 {userPagination.page} 页，共 {userPagination.totalPages} 页，{userPagination.total} 位用户。</p>
                <button
                  className="rounded-md border border-hairline bg-card px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={userPagination.page <= 1 || loadingUsers}
                  onClick={() => {
                    setLoadingUsers(true);
                    void loadUsers(userQuery, userPagination.page - 1);
                  }}
                  type="button"
                >
                  上一页
                </button>
                <button
                  className="rounded-md border border-hairline bg-card px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={userPagination.page >= userPagination.totalPages || loadingUsers}
                  onClick={() => {
                    setLoadingUsers(true);
                    void loadUsers(userQuery, userPagination.page + 1);
                  }}
                  type="button"
                >
                  下一页
                </button>
              </div>
            ) : null}
          </div>
        </section>
      )}
    </main>
  );
}
