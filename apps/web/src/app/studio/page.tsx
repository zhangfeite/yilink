import { getTranslations } from 'next-intl/server';

export default async function StudioPage() {
  const t = await getTranslations('Studio');

  return (
    <section>
      <h1 className="text-3xl font-bold" data-testid="studio-heading">
        {t('title')}
      </h1>
      <p className="mt-3 text-slate-600">{t('description')}</p>
    </section>
  );
}
