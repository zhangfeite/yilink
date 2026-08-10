import { notFound, redirect } from 'next/navigation';

import { PageEditor } from '@/components/studio/page-editor';
import type { StudioPageDraft } from '@/components/studio/types';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

interface EditorRouteProps {
  params: Promise<{ id: string }>;
}

function configRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function blockPlacement(value: unknown): StudioPageDraft['blocks'][number]['placement'] {
  const placement = configRecord(value);
  return ['x', 'y', 'w', 'h'].every((key) => typeof placement[key] === 'number')
    ? (placement as StudioPageDraft['blocks'][number]['placement'])
    : null;
}

export default async function StudioEditorPage({ params }: EditorRouteProps) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect('/login');

  const { id } = await params;
  const page = await db.page.findFirst({
    where: { id, userId },
    select: {
      id: true,
      slug: true,
      title: true,
      bio: true,
      avatarUrl: true,
      layout: true,
      bentoVersion: true,
      themeId: true,
      themeConfig: true,
      seoTitle: true,
      seoDesc: true,
      ctaConfig: true,
      status: true,
      blocks: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          type: true,
          size: true,
          isVisible: true,
          config: true,
          placement: true,
        },
      },
    },
  });
  if (!page) notFound();

  const initialPage: StudioPageDraft = {
    ...page,
    blocks: page.blocks.map((block) => ({
      ...block,
      config: configRecord(block.config),
      placement: blockPlacement(block.placement),
    })),
  };

  return <PageEditor initialPage={initialPage} />;
}
