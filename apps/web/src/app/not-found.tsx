import { getTranslations } from 'next-intl/server';

export default async function NotFoundPage() {
  const t = await getTranslations('NotFound');

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p className="mt-3 text-slate-600">{t('description')}</p>
    </main>
  );
}
