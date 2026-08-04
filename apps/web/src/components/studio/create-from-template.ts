import type { SceneTemplate } from '@yilink/shared';

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

export class StudioApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'StudioApiError';
    this.code = code;
    this.status = status;
  }
}

export async function studioApiRequest<T>(
  fetcher: Fetcher,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetcher(input, init);
  const body = (await response.json().catch(() => ({}))) as T & ApiErrorBody;
  if (!response.ok) {
    throw new StudioApiError(
      response.status,
      body.error?.code ?? 'UNEXPECTED_ERROR',
      body.error?.message ?? 'Request failed',
    );
  }
  return body;
}

interface CreatedPage {
  id: string;
  slug: string;
  title: string;
}

interface CreatePageFromTemplateOptions {
  fetcher?: Fetcher;
  persistRole?: (pageId: string, role: string) => Promise<void>;
  slug: string;
  template: SceneTemplate;
  title: string;
}

function jsonRequest(method: 'POST' | 'PUT' | 'PATCH', body: unknown): RequestInit {
  return {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export async function createPageFromTemplate({
  fetcher = fetch,
  persistRole,
  slug,
  template,
  title,
}: CreatePageFromTemplateOptions): Promise<CreatedPage> {
  const created = await studioApiRequest<{ page: CreatedPage }>(
    fetcher,
    '/api/v1/pages',
    jsonRequest('POST', { slug, title, templateId: template.id }),
  );
  const pageId = created.page.id;

  await studioApiRequest(
    fetcher,
    `/api/v1/pages/${pageId}/blocks`,
    jsonRequest(
      'PUT',
      template.blocks.map((block) => ({ ...block, isVisible: true })),
    ),
  );

  await studioApiRequest(
    fetcher,
    `/api/v1/pages/${pageId}`,
    jsonRequest('PATCH', {
      layout: template.layout,
      themeId: template.defaultTheme,
      ctaConfig: template.cta,
      bio: template.identity.bio,
    }),
  );

  await persistRole?.(pageId, template.identity.role);
  return created.page;
}
