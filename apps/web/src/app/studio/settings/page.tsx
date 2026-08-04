import { getTranslations } from 'next-intl/server';

export default async function StudioSettingsPage() {
  const t = await getTranslations('Studio');

  return (
    <section>
      <h1 className="text-3xl font-bold">{t('settingsTitle')}</h1>
      <p className="mt-3 text-slate-600">{t('settingsDescription')}</p>
    </section>
  );
}
