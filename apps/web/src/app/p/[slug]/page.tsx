import { getTranslations } from 'next-intl/server';

interface PublicPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicPage({ params }: PublicPageProps) {
  const { slug } = await params;
  const t = await getTranslations('PublicPage');

  return (
    <main className="mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-bold">{t('title', { slug })}</h1>
      <p className="mt-3 text-slate-500">{t('comingSoon')}</p>
    </main>
  );
}
