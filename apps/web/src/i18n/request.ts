import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

export const supportedLocales = ['zh-CN', 'en'] as const;
export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = 'zh-CN';
export const localeCookieName = 'YILINK_LOCALE';

function isLocale(value: string | undefined): value is Locale {
  return supportedLocales.some((locale) => locale === value);
}

function localeFromLanguageTag(languageTag: string): Locale | undefined {
  const normalized = languageTag.trim().toLowerCase();

  if (normalized === 'zh' || normalized.startsWith('zh-')) {
    return 'zh-CN';
  }

  if (normalized === 'en' || normalized.startsWith('en-')) {
    return 'en';
  }

  return undefined;
}

function localeFromAcceptLanguage(value: string | null): Locale | undefined {
  if (!value) {
    return undefined;
  }

  const preferences = value
    .split(',')
    .map((item) => {
      const [languageTag, ...parameters] = item.trim().split(';');
      const qualityParameter = parameters.find((parameter) => parameter.trim().startsWith('q='));
      const quality = qualityParameter ? Number(qualityParameter.trim().slice(2)) : 1;

      return {
        languageTag,
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .filter((preference) => preference.quality > 0)
    .sort((left, right) => right.quality - left.quality);

  for (const preference of preferences) {
    const locale = localeFromLanguageTag(preference.languageTag);
    if (locale) {
      return locale;
    }
  }

  return undefined;
}

async function negotiateLocale(): Promise<Locale> {
  const cookieLocale = (await cookies()).get(localeCookieName)?.value;
  if (isLocale(cookieLocale)) {
    return cookieLocale;
  }

  const acceptLanguage = (await headers()).get('accept-language');
  return localeFromAcceptLanguage(acceptLanguage) ?? defaultLocale;
}

const messageLoaders = {
  'zh-CN': () => import('./zh-CN.json'),
  en: () => import('./en.json'),
} satisfies Record<Locale, () => Promise<{ default: Record<string, unknown> }>>;

export default getRequestConfig(async () => {
  const locale = await negotiateLocale();
  const messages = (await messageLoaders[locale]()).default;

  return {
    locale,
    messages,
  };
});
