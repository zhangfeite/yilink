import { PLAN_LIMITS, PLAN_QUOTA_NOTE_ZH } from '@yilink/shared';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

import styles from './page.module.css';

const DEFAULT_GITHUB_URL = 'https://github.com/zhangfeite/yilink';
const DEFAULT_REPORT_EMAIL = 'report@yilink.app';

function httpUrl(value: string | undefined, fallback: string | null = null): string | null {
  const candidate = value?.trim();
  if (!candidate) return fallback;

  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

function reportEmail(value: string | undefined): string {
  const candidate = value?.trim();
  return candidate && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)
    ? candidate
    : DEFAULT_REPORT_EMAIL;
}

function checkoutUrl(value: string | undefined): string | null {
  const candidate = httpUrl(value);
  return candidate && new URL(candidate).protocol === 'https:' ? candidate : null;
}

export default async function MarketingPage() {
  const t = await getTranslations('Marketing');
  const locale = await getLocale();
  const githubUrl = httpUrl(process.env.NEXT_PUBLIC_GITHUB_URL, DEFAULT_GITHUB_URL)!;
  const repositoryUrl = githubUrl.replace(/\/$/, '');
  const deployUrl = `${repositoryUrl}/blob/main/docs/deploy/docker.md`;
  const reportAddress = reportEmail(process.env.REPORT_EMAIL);
  const miniCheckoutUrl = checkoutUrl(process.env.LEMONSQUEEZY_CHECKOUT_URL_MINI);
  const proCheckoutUrl = checkoutUrl(process.env.LEMONSQUEEZY_CHECKOUT_URL_PRO);
  const miniPrice = process.env.NEXT_PUBLIC_PRICE_MINI?.trim() || '$12';
  const proPrice = process.env.NEXT_PUBLIC_PRICE_PRO?.trim() || '$25';
  const fairUseNote = locale.startsWith('zh') ? PLAN_QUOTA_NOTE_ZH : t('pricing.fairUse');
  const features = ['template', 'wechat', 'openSource'] as const;
  const commitments = ['export', 'free', 'price', 'moderation', 'openSource'] as const;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <nav aria-label={t('nav.label')} className={styles.nav}>
          <Link className={styles.brand} href="/">
            <span aria-hidden="true" className={styles.brandMark}>
              一
            </span>
            <span>一链 YiLink</span>
          </Link>
          <div className={styles.navLinks}>
            <a href="#pricing">{t('nav.pricing')}</a>
            <Link href="/login">{t('login')}</Link>
          </div>
        </nav>

        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{t('hero.eyebrow')}</p>
            <h1>{t('tagline')}</h1>
            <p className={styles.heroDescription}>{t('description')}</p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryCta} href="/register">
                {t('hero.primaryCta')} <span aria-hidden="true">→</span>
              </Link>
              <a
                className={styles.secondaryCta}
                href="/p/demo-photographer"
                rel="noreferrer"
                target="_blank"
              >
                {t('hero.demoCta')} <span aria-hidden="true">↗</span>
              </a>
            </div>
            <p className={styles.caption}>{t('hero.caption')}</p>
          </div>

          <div className={styles.phoneStage}>
            <div className={styles.liveLabel}>
              <span aria-hidden="true" />
              {t('hero.liveLabel')}
            </div>
            <div className={styles.phoneShell}>
              <span aria-hidden="true" className={styles.phoneSpeaker} />
              <div className={styles.phoneScreen}>
                <iframe
                  className={styles.liveFrame}
                  loading="lazy"
                  src="/p/demo-illustrator"
                  title={t('hero.previewTitle')}
                />
              </div>
            </div>
            <p className={styles.previewCaption}>{t('hero.previewCaption')}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="features-title" className={styles.features}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>{t('features.eyebrow')}</p>
            <h2 id="features-title">{t('features.title')}</h2>
            <p>{t('features.description')}</p>
          </div>
          <div className={styles.featureGrid}>
            {features.map((feature, index) => (
              <article className={styles.featureCard} key={feature}>
                <span className={styles.featureIndex}>{String(index + 1).padStart(2, '0')}</span>
                <h3>{t(`features.${feature}.title`)}</h3>
                <p>{t(`features.${feature}.description`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="pricing-title" className={styles.pricing} id="pricing">
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>{t('pricing.eyebrow')}</p>
            <h2 id="pricing-title">{t('pricing.title')}</h2>
            <p>{t('pricing.description')}</p>
          </div>

          <div className={styles.pricePromise}>
            <span>{t('pricing.promiseLabel')}</span>
            <strong>{t('pricing.promise')}</strong>
          </div>

          <div className={styles.planGrid}>
            <article className={styles.planCard}>
              <p className={styles.planName}>{t('pricing.free.name')}</p>
              <p className={styles.price}>$0</p>
              <p className={styles.planBilling}>{t('pricing.free.billing')}</p>
              <p className={styles.planQuota}>
                {t('pricing.pageQuota', { count: PLAN_LIMITS.FREE.pages })}
              </p>
              <p className={styles.planDescription}>{t('pricing.free.description')}</p>
              <span aria-disabled="true" className={styles.planButtonDisabled}>
                {t('pricing.free.action')}
              </span>
            </article>

            <article className={styles.planCard}>
              <p className={styles.planName}>{t('pricing.mini.name')}</p>
              <p className={styles.price}>{miniPrice}</p>
              <p className={styles.planBilling}>{t('pricing.lifetime')}</p>
              <p className={styles.planQuota}>
                {t('pricing.pageQuota', { count: PLAN_LIMITS.PRO_MINI.pages })}
              </p>
              <p className={styles.planDescription}>{t('pricing.mini.description')}</p>
              {miniCheckoutUrl ? (
                <a
                  className={styles.planButtonSecondary}
                  href={miniCheckoutUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {t('pricing.buy')}
                </a>
              ) : (
                <span aria-disabled="true" className={styles.planButtonDisabled}>
                  {t('pricing.comingSoon')}
                </span>
              )}
            </article>

            <article className={`${styles.planCard} ${styles.featuredPlan}`}>
              <span className={styles.recommended}>{t('pricing.recommended')}</span>
              <p className={styles.planName}>{t('pricing.pro.name')}</p>
              <p className={styles.price}>{proPrice}</p>
              <p className={styles.planBilling}>{t('pricing.lifetime')}</p>
              <p className={styles.planQuota}>
                {t('pricing.pageQuota', { count: PLAN_LIMITS.PRO.pages })}
              </p>
              <p className={styles.planDescription}>{t('pricing.pro.description')}</p>
              {proCheckoutUrl ? (
                <a
                  className={styles.planButtonPrimary}
                  href={proCheckoutUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {t('pricing.buy')}
                </a>
              ) : (
                <span aria-disabled="true" className={styles.planButtonDisabled}>
                  {t('pricing.comingSoon')}
                </span>
              )}
            </article>
          </div>

          <p className={styles.fairUse}>{fairUseNote}</p>

          <div aria-labelledby="commitments-title" className={styles.commitments}>
            <div className={styles.commitmentIntro}>
              <p className={styles.eyebrow}>{t('pricing.trustEyebrow')}</p>
              <h3 id="commitments-title">{t('pricing.trustTitle')}</h3>
              <p>{t('pricing.trustDescription')}</p>
            </div>
            <ol className={styles.commitmentList}>
              {commitments.map((commitment, index) => (
                <li key={commitment}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <p>{t(`pricing.commitments.${commitment}`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div>
            <Link className={styles.brand} href="/">
              <span aria-hidden="true" className={styles.brandMark}>
                一
              </span>
              <span>一链 YiLink</span>
            </Link>
            <p>{t('footer.description')}</p>
          </div>
          <nav aria-label={t('footer.label')} className={styles.footerLinks}>
            <a href={repositoryUrl} rel="noreferrer" target="_blank">
              {t('github')} <span aria-hidden="true">↗</span>
            </a>
            <a href={deployUrl} rel="noreferrer" target="_blank">
              {t('footer.deploy')} <span aria-hidden="true">↗</span>
            </a>
            <a href={`mailto:${reportAddress}`}>
              {t('footer.report')} · {reportAddress}
            </a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
