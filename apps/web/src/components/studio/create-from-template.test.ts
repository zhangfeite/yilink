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

  it('assembles visible template blocks for the PUT request', async () => {
    const fetcher = successfulFetcher();
    await createPageFromTemplate({ fetcher, slug: 'lin-xiaoman', template, title: '林小满' });

    const request = fetcher.mock.calls[1]?.[1] as RequestInit;
    const blocks = JSON.parse(String(request.body)) as Array<{ isVisible: boolean }>;
    expect(fetcher.mock.calls[1]?.[0]).toBe('/api/v1/pages/page-1/blocks');
    expect(request.method).toBe('PUT');
    expect(blocks).toHaveLength(template.blocks.length);
    expect(blocks.every((block) => block.isVisible)).toBe(true);
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
          layout: template.layout,
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
