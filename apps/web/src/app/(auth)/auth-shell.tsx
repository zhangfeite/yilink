import type { SceneTemplate } from '@yilink/shared';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { PublicPageRenderer, type PublicPageData } from '@/components/public/public-page';
import { loadSceneTemplates } from '@/lib/templates';

interface AuthShellProps {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}

function templatePage(template: SceneTemplate): PublicPageData {
  return {
    avatarUrl: null,
    bentoVersion: template.bentoVersion,
    bio: template.identity.bio,
    blocks: template.blocks.map((block, index) => ({
      ...block,
      id: `auth-preview-${index}`,
    })),
    ctaConfig: template.cta,
    layout: template.layout,
    slug: template.id,
    themeConfig: { role: template.identity.role },
    themeId: template.defaultTheme,
    title: template.identity.title,
    totalViews: 108116,
  };
}

export function AuthShell({ children, description, eyebrow, title }: AuthShellProps) {
  const template = loadSceneTemplates()[0];

  return (
    <main className="min-h-screen bg-page p-3 text-ink antialiased sm:p-6 lg:grid lg:grid-cols-12 lg:gap-6">
      <section className="relative overflow-hidden rounded-card bg-card-muted px-6 py-5 lg:col-span-5 lg:flex lg:min-h-[calc(100vh-3rem)] lg:flex-col lg:px-10 lg:py-8">
        <Link className="inline-flex items-center gap-3 text-body font-semibold text-ink" href="/">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 place-items-center rounded-full border border-accent text-section text-accent"
          >
            一
          </span>
          <span>一链 YiLink</span>
        </Link>

        <div className="mt-5 lg:mt-10">
          <p className="text-caption font-semibold tracking-wide text-accent">{eyebrow}</p>
          <h2 className="mt-2 max-w-md text-display text-ink">{title}</h2>
          <p className="mt-3 hidden max-w-sm text-body text-muted sm:block">{description}</p>
        </div>

        {template ? (
          <div className="relative mt-10 hidden min-h-0 flex-1 lg:block" aria-hidden="true">
            <div className="absolute inset-x-0 bottom-0 mx-auto h-[490px] w-[286px] rotate-[-2deg] overflow-hidden rounded-card border border-hairline bg-card shadow-card">
              <div className="w-[375px] origin-top-left scale-[0.72]">
                <PublicPageRenderer page={templatePage(template)} preview uaClass="browser" />
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="flex px-2 py-8 sm:px-6 lg:col-span-7 lg:items-center lg:justify-center lg:py-12">
        <div className="mx-auto w-full max-w-lg rounded-card bg-card p-6 shadow-card sm:p-10">
          {children}
        </div>
      </section>
    </main>
  );
}
