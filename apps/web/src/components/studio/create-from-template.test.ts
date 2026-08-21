import type { SceneTemplate } from '@yilink/shared';
import { describe, expect, it, vi } from 'vitest';

import { layoutSaveSchema } from '../../lib/pages-api-schemas';
import { fallbackSceneTemplates, loadSceneTemplates } from '../../lib/templates';

import { createPageFromTemplate, TemplateApplyError } from './create-from-template';

const template = fallbackSceneTemplates[0] as SceneTemplate;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function successfulFetcher() {
  return vi
    .fn()
    .mockResolvedValueOnce(
      jsonResponse({ page: { id: 'page-1', slug: 'lin-xiaoman', title: '林小满' } }, 201),
    )
    .mockResolvedValueOnce(jsonResponse({ page: { id: 'page-1' }, blocks: [] }));
}

function putPayload(fetcher: ReturnType<typeof vi.fn>): unknown {
  const request = fetcher.mock.calls[1]?.[1] as RequestInit;
  return JSON.parse(String(request.body)) as unknown;
}

describe('createPageFromTemplate', () => {
  it('assembles the POST page request', async () => {
    const fetcher = successfulFetcher();
    await createPageFromTemplate({ fetcher, slug: 'lin-xiaoman', template, title: '林小满' });

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      '/api/v1/pages',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          slug: 'lin-xiaoman',
          title: '林小满',
          templateId: 'illustrator-commission',
        }),
      }),
    );
  });

  // 这条是本文件存在的理由：曾经 PUT 只发 3 个键，服务端 .strict() schema 要 11 个，
  // mock 掉 fetcher 的测试全绿而生产 100% 建页失败。payload 必须过真 schema。
  it('sends a PUT payload that the real layoutSaveSchema accepts, for every shipped template', async () => {
    for (const shipped of loadSceneTemplates()) {
      const fetcher = successfulFetcher();
      await createPageFromTemplate({ fetcher, slug: 'any-slug', template: shipped, title: '标题' });

      const result = layoutSaveSchema.safeParse(putPayload(fetcher));
      expect(result.success, `${shipped.id}: ${JSON.stringify(result.error?.issues)}`).toBe(true);
    }
  });

  it('writes everything the template carries in the single atomic request', async () => {
    const fetcher = successfulFetcher();
    await createPageFromTemplate({ fetcher, slug: 'lin-xiaoman', template, title: '林小满' });

    expect(fetcher.mock.calls[1]?.[0]).toBe('/api/v1/pages/page-1/layout');
    expect((fetcher.mock.calls[1]?.[1] as RequestInit).method).toBe('PUT');
    expect(putPayload(fetcher)).toMatchObject({
      title: '林小满',
      bio: template.identity.bio,
      layout: template.layout,
      bentoVersion: template.bentoVersion ?? null,
      themeId: template.defaultTheme,
      ctaConfig: template.cta,
      themeConfig: { role: template.identity.role },
    });
    const { blocks } = putPayload(fetcher) as { blocks: Array<{ isVisible: boolean; placement: unknown }> };
    expect(blocks).toHaveLength(template.blocks.length);
    expect(blocks.every((block) => block.isVisible)).toBe(true);
    // 模板自带的 BENTO 坐标必须原样带上（缺省则显式 null，交由服务端兜底）
    expect(blocks.every((block) => block.placement !== undefined)).toBe(true);
    // 两个请求就够：建页 + 原子写入，不再有第三个 PATCH
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('returns the created page after setup succeeds', async () => {
    const page = await createPageFromTemplate({
      fetcher: successfulFetcher(),
      slug: 'lin-xiaoman',
      template,
      title: '林小满',
    });

    expect(page).toEqual({ id: 'page-1', slug: 'lin-xiaoman', title: '林小满' });
  });

  it('stops setup and exposes the API error code when page creation fails', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ error: { code: 'SLUG_TAKEN', message: '该主页地址已被占用' } }, 409),
      );

    await expect(
      createPageFromTemplate({ fetcher, slug: 'taken-slug', template, title: '林小满' }),
    ).rejects.toMatchObject({ code: 'SLUG_TAKEN', status: 409 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('surfaces the already-created page when applying the template fails', async () => {
    // 页面已占了 slug；调用方必须知道它存在，否则用户原样重试只会撞「地址已被占用」
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ page: { id: 'page-1', slug: 'lin-xiaoman', title: '林小满' } }, 201),
      )
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'INVALID_INPUT', message: '' } }, 400));

    const failure = await createPageFromTemplate({
      fetcher,
      slug: 'lin-xiaoman',
      template,
      title: '林小满',
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(TemplateApplyError);
    expect((failure as TemplateApplyError).createdPage).toEqual({
      id: 'page-1',
      slug: 'lin-xiaoman',
      title: '林小满',
    });
  });
});
