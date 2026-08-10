import type { SceneTemplate } from '@yilink/shared';
import { describe, expect, it, vi } from 'vitest';

import { fallbackSceneTemplates } from '../../lib/templates';

import { createPageFromTemplate } from './create-from-template';

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
    .mockResolvedValueOnce(jsonResponse({ blocks: [] }))
    .mockResolvedValueOnce(jsonResponse({ page: { id: 'page-1' } }));
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

  it('writes layout, bento version and visible blocks in one atomic request', async () => {
    const fetcher = successfulFetcher();
    await createPageFromTemplate({ fetcher, slug: 'lin-xiaoman', template, title: '林小满' });

    const request = fetcher.mock.calls[1]?.[1] as RequestInit;
    const payload = JSON.parse(String(request.body)) as {
      layout: string;
      bentoVersion: number | null;
      blocks: Array<{ isVisible: boolean; placement: unknown }>;
    };
    expect(fetcher.mock.calls[1]?.[0]).toBe('/api/v1/pages/page-1/layout');
    expect(request.method).toBe('PUT');
    expect(payload.layout).toBe(template.layout);
    expect(payload.bentoVersion).toBe(template.bentoVersion ?? null);
    expect(payload.blocks).toHaveLength(template.blocks.length);
    expect(payload.blocks.every((block) => block.isVisible)).toBe(true);
    // 模板自带的 BENTO 坐标必须原样带上（缺省则显式 null，交由服务端兜底）
    expect(payload.blocks.every((block) => block.placement !== undefined)).toBe(true);
  });

  it('assembles template page metadata for the PATCH request', async () => {
    const fetcher = successfulFetcher();
    await createPageFromTemplate({ fetcher, slug: 'lin-xiaoman', template, title: '林小满' });

    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      '/api/v1/pages/page-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          themeId: template.defaultTheme,
          ctaConfig: template.cta,
          bio: template.identity.bio,
        }),
      }),
    );
  });

  it('persists the template role after API setup', async () => {
    const fetcher = successfulFetcher();
    const persistRole = vi.fn().mockResolvedValue(undefined);

    await createPageFromTemplate({
      fetcher,
      persistRole,
      slug: 'lin-xiaoman',
      template,
      title: '林小满',
    });

    expect(persistRole).toHaveBeenCalledWith('page-1', template.identity.role);
  });

  it('returns the created page after all setup requests succeed', async () => {
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
});
