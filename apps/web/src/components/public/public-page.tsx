/* eslint-disable @next/next/no-img-element */
import { PlatformSticker, getPlatformIcon, platformIconIds } from '@yilink/icons';
import type { CSSProperties, ReactNode } from 'react';

import { getTheme, isDarkTheme, type PublicTheme } from '@/lib/themes';
import type { UaClass } from '@/lib/ua';

import { BentoFlow, bentoRowUnit, parsePlacement, type BentoRenderBlock } from './bento-flow';
import { PUBLIC_INTERACTION_SCRIPT } from './interaction-script';
import { SafeMarkdown } from './markdown';
import styles from './public-page.module.css';

export interface PublicBlockData {
  id: string;
  type: 'LINK' | 'SOCIAL' | 'TEXT' | 'IMAGE' | 'WECHAT' | 'QR' | 'DIVIDER';
  size: 'SM' | 'MD' | 'LG';
  config: unknown;
  placement?: unknown;
}

export interface PublicPageData {
  slug: string;
  title: string;
  bio: string | null;
  avatarUrl: string | null;
  layout: 'LIST' | 'GRID';
  bentoVersion?: number | null;
  themeId: string;
  themeConfig: unknown;
  ctaConfig: unknown;
  totalViews: number;
  blocks: PublicBlockData[];
}

interface PublicPageRendererProps {
  page: PublicPageData;
  preview?: boolean;
  reportEmail?: string;
  uaClass: UaClass;
}

type ThemeStyle = CSSProperties & Record<`--${string}`, string | number>;
type JsonRecord = Record<string, unknown>;

interface CtaConfig {
  type: 'wechat' | 'link';
  label: string;
  value: string;
}

const FALLBACK_PLATFORM_LABELS: Record<string, string> = {
  bilibili: 'B站',
  douyin: '抖音',
  github: 'GitHub',
  qq: 'QQ',
  wechat: '微信',
  weibo: '微博',
  xiaohongshu: '小红书',
  zhihu: '知乎',
};

function asRecord(value: unknown): JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function textValue(record: JsonRecord, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function parseCta(value: unknown): CtaConfig | null {
  const record = asRecord(value);
  const type = record.type;
  const label = textValue(record, 'label');
  const content = textValue(record, 'value');

  if ((type !== 'wechat' && type !== 'link') || !label || !content) return null;
  if (type === 'link' && !safeHttpUrl(content)) return null;
  return { type, label, value: content };
}

function themeStyle(theme: PublicTheme): ThemeStyle {
  const background =
    theme.background.type === 'image'
      ? `url("${theme.background.value.replaceAll('"', '%22')}") center / cover fixed`
      : theme.background.value;

  return {
    // 元素级 color-scheme：公开页跟随主题明暗（防强制反色），不受全局 light 声明影响
    colorScheme: isDarkTheme(theme) ? 'dark' : 'light',
    '--page-bg': theme.neutral.pageBg,
    '--page-background': background,
    '--card': theme.neutral.card,
    '--text': theme.neutral.text,
    '--subtext': theme.neutral.subtext,
    '--hairline': theme.neutral.hairline,
    '--accent': theme.accent,
    '--accent-on': theme.accentOn,
    '--shadow': theme.elevation.cardShadow,
    '--r-card': theme.radius.card,
    '--r-avatar': theme.radius.avatar,
    '--r-sticker': theme.radius.sticker,
    '--gap': theme.grid.gap,
    '--bento-row-unit': bentoRowUnit(theme.grid.gap),
    '--d-size': `${theme.typography.display.size}px`,
    '--d-weight': theme.typography.display.weight,
    '--d-track': theme.typography.display.tracking,
    '--s-size': `${theme.typography.section.size}px`,
    '--s-weight': theme.typography.section.weight,
    '--b-size': `${theme.typography.body.size}px`,
    '--b-weight': theme.typography.body.weight,
    '--c-size': `${theme.typography.caption.size}px`,
    '--c-weight': theme.typography.caption.weight,
  };
}

function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

function sizeClass(size: PublicBlockData['size']): string {
  if (size === 'SM') return styles.sizeSm;
  if (size === 'LG') return styles.sizeLg;
  return styles.sizeMd;
}

function avatarInitial(title: string): string {
  return Array.from(title.trim())[0] ?? '一';
}

function LinkBlock({
  block,
  isGrid,
  uaClass,
}: {
  block: PublicBlockData;
  isGrid: boolean;
  uaClass: UaClass;
}) {
  const config = asRecord(block.config);
  const title = textValue(config, 'title');
  const url = safeHttpUrl(config.url);
  if (!title || !url) return null;

  const description = textValue(config, 'desc');
  const thumbUrl = safeHttpUrl(config.thumbUrl);
  const isAppDownload = config.isAppDownload === true || /\.apk(?:$|[?#])/i.test(url);
  const copyInWechat = uaClass === 'wechat' && isAppDownload;
  const content = (
    <>
      <span className={styles.linkThumb} aria-hidden="true">
        {thumbUrl ? (
          <img alt="" loading="lazy" src={thumbUrl} />
        ) : (
          <span>{avatarInitial(title)}</span>
        )}
      </span>
      <span className={styles.linkText}>
        <strong>{title}</strong>
        {description ? <small>{description}</small> : null}
      </span>
      <span className={styles.linkArrow} aria-hidden="true">
        {copyInWechat ? '复制' : '→'}
      </span>
    </>
  );
  const className = classNames(styles.linkCard, isGrid && sizeClass(block.size));

  return copyInWechat ? (
    <button
      className={className}
      data-copy={url}
      data-toast="链接已复制，请在浏览器中打开"
      data-block-id={block.id}
      data-track={block.id}
      type="button"
    >
      {content}
    </button>
  ) : (
    <a
      className={className}
      data-block-id={block.id}
      data-track={block.id}
      href={url}
      rel="noreferrer noopener"
      target="_blank"
    >
      {content}
    </a>
  );
}

function LinkGroup({
  blocks,
  layout,
  uaClass,
}: {
  blocks: PublicBlockData[];
  layout: PublicPageData['layout'];
  uaClass: UaClass;
}) {
  const firstConfig = asRecord(blocks[0]?.config);
  const sectionTitle = textValue(firstConfig, 'sectionTitle') ?? '精选链接';
  const isGrid = layout === 'GRID';

  return (
    <section aria-labelledby={`links-${blocks[0].id}`} className={styles.group}>
      <h2 className={styles.sectionTitle} id={`links-${blocks[0].id}`}>
        {sectionTitle}
      </h2>
      <div className={styles.linkCards} data-layout={layout.toLowerCase()}>
        {blocks.map((block) => (
          <LinkBlock block={block} isGrid={isGrid} key={block.id} uaClass={uaClass} />
        ))}
      </div>
    </section>
  );
}

function platformInfo(platform: string): {
  id: (typeof platformIconIds)[number] | null;
  label: string;
} {
  const id = platformIconIds.find((candidate) => candidate === platform) ?? null;
  if (id) return { id, label: getPlatformIcon(id).nameZh };
  return { id: null, label: FALLBACK_PLATFORM_LABELS[platform] ?? platform };
}

function SocialBlock({ block }: { block: PublicBlockData }) {
  const config = asRecord(block.config);
  const rawItems = Array.isArray(config.items) ? config.items : [];
  const items = rawItems.flatMap((item) => {
    const record = asRecord(item);
    const platform = textValue(record, 'platform');
    const url = safeHttpUrl(record.url);
    return platform && url ? [{ platform, url }] : [];
  });
  if (!items.length) return null;

  const sectionTitle = textValue(config, 'sectionTitle') ?? '在这些地方找到我';
  return (
    <section
      aria-labelledby={`social-${block.id}`}
      className={classNames(styles.card, styles.stickers)}
    >
      <h2 className={styles.sectionTitle} id={`social-${block.id}`}>
        {sectionTitle}
      </h2>
      <div className={styles.stickerGrid}>
        {items.map((item, index) => {
          const info = platformInfo(item.platform);
          return (
            <a
              aria-label={`前往${info.label}`}
              className={styles.sticker}
              data-block-id={block.id}
              data-track={`${block.id}:${item.platform}`}
              href={item.url}
              key={`${item.platform}-${index}`}
              rel="noreferrer noopener"
              target="_blank"
              title={info.label}
            >
              {info.id ? (
                <PlatformSticker id={info.id} size={56} />
              ) : (
                <span className={styles.fallbackSticker} aria-hidden="true">
                  {avatarInitial(info.label).toUpperCase()}
                </span>
              )}
            </a>
          );
        })}
      </div>
      <p className={styles.caption}>点击图标即可跳转对应平台</p>
    </section>
  );
}

function TextBlock({ block }: { block: PublicBlockData }) {
  const markdown = textValue(asRecord(block.config), 'markdown');
  if (!markdown) return null;
  return (
    <section className={classNames(styles.card, styles.textCard)}>
      <SafeMarkdown markdown={markdown} />
    </section>
  );
}

function ImageBlock({ block }: { block: PublicBlockData }) {
  const config = asRecord(block.config);
  const url = safeHttpUrl(config.url);
  if (!url) return null;
  const alt = textValue(config, 'alt') ?? '';
  const href = safeHttpUrl(config.href);
  const image = <img alt={alt} className={styles.contentImage} loading="lazy" src={url} />;

  return (
    <figure className={classNames(styles.card, styles.imageCard)}>
      {href ? (
        <a
          data-block-id={block.id}
          data-track={block.id}
          href={href}
          rel="noreferrer noopener"
          target="_blank"
        >
          {image}
        </a>
      ) : (
        image
      )}
      {alt ? <figcaption className={styles.caption}>{alt}</figcaption> : null}
    </figure>
  );
}

function WechatBlock({ block }: { block: PublicBlockData }) {
  const config = asRecord(block.config);
  const wechatId = textValue(config, 'wechatId');
  if (!wechatId) return null;
  // 不给 note 默认值：默认句与下方说明是同一句，未配置时会把「点击复制微信号」渲染两遍（转化唯一性）
  const note = textValue(config, 'note');
  const qrImageUrl = safeHttpUrl(config.qrImageUrl);

  return (
    <section aria-label="微信联系方式" className={classNames(styles.card, styles.wechatCard)}>
      <div className={styles.wechatRow}>
        <span className={styles.contactIcon} aria-hidden="true">
          信
        </span>
        <span className={styles.wechatId}>
          {wechatId}
          {note ? <small>{note}</small> : null}
        </span>
        <button
          aria-label={`复制微信号 ${wechatId}`}
          className={styles.copyButton}
          data-block-id={block.id}
          data-copy={wechatId}
          data-toast={`已复制微信号 ${wechatId}`}
          data-track={block.id}
          type="button"
        >
          <span data-copy-label>复制</span>
        </button>
      </div>
      {qrImageUrl ? (
        <div className={styles.wechatQr}>
          <img alt={`${wechatId} 的微信二维码`} loading="lazy" src={qrImageUrl} />
          <p className={styles.caption}>长按识别二维码</p>
        </div>
      ) : (
        <p className={styles.caption}>点击复制微信号</p>
      )}
    </section>
  );
}

function QrBlock({ block }: { block: PublicBlockData }) {
  const config = asRecord(block.config);
  const imageUrl = safeHttpUrl(config.imageUrl);
  if (!imageUrl) return null;
  const label = textValue(config, 'label') ?? '用相机扫码';
  return (
    <figure className={classNames(styles.card, styles.qrCard)}>
      <img alt={label} loading="lazy" src={imageUrl} />
      <figcaption className={styles.caption}>{label}</figcaption>
    </figure>
  );
}

function DividerBlock() {
  return <div className={styles.divider} role="separator" />;
}

function renderBentoBlock(block: PublicBlockData, uaClass: UaClass): ReactNode {
  if (block.type === 'LINK') return <LinkBlock block={block} isGrid={false} uaClass={uaClass} />;
  return renderSingleBlock(block);
}

function renderSingleBlock(block: PublicBlockData): ReactNode {
  if (block.type === 'SOCIAL') return <SocialBlock block={block} key={block.id} />;
  if (block.type === 'TEXT') return <TextBlock block={block} key={block.id} />;
  if (block.type === 'IMAGE') return <ImageBlock block={block} key={block.id} />;
  if (block.type === 'WECHAT') return <WechatBlock block={block} key={block.id} />;
  if (block.type === 'QR') return <QrBlock block={block} key={block.id} />;
  if (block.type === 'DIVIDER') return <DividerBlock key={block.id} />;
  return null;
}

function ContentFlow({
  blocks,
  layout,
  uaClass,
}: {
  blocks: PublicBlockData[];
  layout: PublicPageData['layout'];
  uaClass: UaClass;
}) {
  const nodes: ReactNode[] = [];
  let index = 0;

  while (index < blocks.length) {
    const block = blocks[index];
    if (block.type === 'LINK') {
      const links: PublicBlockData[] = [];
      while (index < blocks.length && blocks[index].type === 'LINK') {
        links.push(blocks[index]);
        index += 1;
      }
      nodes.push(
        <LinkGroup blocks={links} key={`links-${links[0].id}`} layout={layout} uaClass={uaClass} />,
      );
      continue;
    }
    nodes.push(renderSingleBlock(block));
    index += 1;
  }

  return <div className={styles.contentFlow}>{nodes}</div>;
}

function ConversionBar({ cta, totalViews }: { cta: CtaConfig; totalViews: number }) {
  const proof =
    totalViews > 0
      ? `累计访问 ${new Intl.NumberFormat('zh-CN').format(totalViews)}`
      : '主页持续更新';
  const action =
    cta.type === 'wechat' ? (
      <button
        className={styles.ctaAction}
        data-copy={cta.value}
        data-toast={`已复制微信号 ${cta.value}，去微信添加`}
        data-track="cta"
        type="button"
      >
        {cta.label}
      </button>
    ) : (
      <a
        className={styles.ctaAction}
        data-track="cta"
        href={cta.value}
        rel="noreferrer noopener"
        target="_blank"
      >
        {cta.label}
      </a>
    );

  return (
    <div aria-label="主页主要操作" className={styles.ctaBar}>
      <div className={styles.ctaProof}>{proof}</div>
      {action}
    </div>
  );
}

export function PublicPageRenderer({
  page,
  preview = false,
  reportEmail = 'report@yilink.app',
  uaClass,
}: PublicPageRendererProps) {
  const theme = getTheme(page.themeId);
  const cta = parseCta(page.ctaConfig);
  const role = textValue(asRecord(page.themeConfig), 'role');
  // 与所有区块 URL 同一道闸：历史数据可能在 schema 收紧前入库，渲染端必须再兜一次
  const avatarUrl = safeHttpUrl(page.avatarUrl);
  const blocks =
    cta?.type === 'wechat' ? page.blocks.filter((block) => block.type !== 'WECHAT') : page.blocks;

  return (
    <main
      className={classNames(styles.shell, preview && styles.previewShell)}
      data-page-id={(page as PublicPageData & { id: string }).id}
      data-texture={theme.texture}
      data-theme={theme.id}
      style={themeStyle(theme)}
    >
      <div className={classNames(styles.page, cta ? styles.hasCtaBar : undefined)}>
        <section
          aria-labelledby="public-page-title"
          className={classNames(styles.card, styles.identity)}
        >
          <div className={styles.avatar}>
            <span aria-hidden="true">{avatarInitial(page.title)}</span>
            {avatarUrl ? <img alt={`${page.title}的头像`} src={avatarUrl} /> : null}
          </div>
          <div className={styles.nameZone}>
            <h1 id="public-page-title">{page.title}</h1>
            {role ? <p className={styles.role}>{role}</p> : null}
          </div>
          {page.bio ? <p className={styles.bio}>{page.bio}</p> : null}
        </section>

        {page.bentoVersion === 1 ? (
          <BentoFlow
            blocks={blocks.map<BentoRenderBlock>((block) => ({
              id: block.id,
              type: block.type,
              placement: parsePlacement(block.placement),
              node: renderBentoBlock(block, uaClass),
            }))}
          />
        ) : (
          <ContentFlow blocks={blocks} layout={page.layout} uaClass={uaClass} />
        )}

        <footer className={classNames(styles.caption, styles.footer)}>
          Powered by 一链 YiLink
          <span aria-hidden="true"> · </span>
          <a href={`mailto:${reportEmail}`}>举报</a>
        </footer>
        {cta ? <ConversionBar cta={cta} totalViews={page.totalViews} /> : null}
      </div>
      <div
        aria-live="polite"
        className={styles.toast}
        data-public-toast
        data-visible="false"
        role="status"
      />
      <script dangerouslySetInnerHTML={{ __html: PUBLIC_INTERACTION_SCRIPT }} />
    </main>
  );
}

export function UnavailablePage() {
  const theme = getTheme('minimal-light');
  return (
    <main className={classNames(styles.shell, styles.unavailableShell)} style={themeStyle(theme)}>
      <section className={classNames(styles.card, styles.unavailableCard)}>
        <span aria-hidden="true" className={styles.unavailableMark}>
          一
        </span>
        <h1>页面暂不可用</h1>
        <p>这个页面现在无法访问，请稍后再试。</p>
      </section>
    </main>
  );
}
