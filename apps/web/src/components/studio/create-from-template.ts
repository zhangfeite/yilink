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

export interface CreatedPage {
  id: string;
  slug: string;
  title: string;
}

/**
 * 建页成功但模板内容写入失败。页面已经建出来并占了 slug——调用方必须把这件事
 * 告诉用户，否则他原样重试只会撞上「地址已被占用」，然后合理地认定产品坏了。
 */
export class TemplateApplyError extends StudioApiError {
  readonly createdPage: CreatedPage;

  constructor(cause: StudioApiError, createdPage: CreatedPage) {
    super(cause.status, cause.code, cause.message);
    this.name = 'TemplateApplyError';
    this.createdPage = createdPage;
  }
}

interface CreatePageFromTemplateOptions {
  fetcher?: Fetcher;
  slug: string;
  template: SceneTemplate;
  title: string;
}

function jsonRequest(method: 'POST' | 'PUT', body: unknown): RequestInit {
  return {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export async function createPageFromTemplate({
  fetcher = fetch,
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

  // 模板携带的一切在一个事务里写入：身份文案、主题、转化动作、区块与 BENTO 坐标。
  // /layout 的 schema 是 .strict() 全键必填——曾经这里只发 3 个键，
  // 被 mock 掉 fetcher 的单测放过，生产上 8/8 模板建页全部 400。
  try {
    await studioApiRequest(
      fetcher,
      `/api/v1/pages/${pageId}/layout`,
      jsonRequest('PUT', {
        title,
        bio: template.identity.bio,
        avatarUrl: null,
        layout: template.layout,
        bentoVersion: template.bentoVersion ?? null,
        themeId: template.defaultTheme,
        seoTitle: null,
        seoDesc: null,
        ctaConfig: template.cta,
        themeConfig: { role: template.identity.role },
        blocks: template.blocks.map((block) => ({
          type: block.type,
          size: block.size,
          config: block.config,
          isVisible: true,
          placement: block.placement ?? null,
        })),
      }),
    );
  } catch (error) {
    if (error instanceof StudioApiError) throw new TemplateApplyError(error, created.page);
    throw error;
  }

  return created.page;
}
