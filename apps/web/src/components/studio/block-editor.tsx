'use client';

// 只引 meta 轻量入口：完整 registry 带全部 SVG 路径（~130KB），下拉框只需要 id/名称
import { platformMetaList } from '@yilink/icons/meta';
import { blockConfigSchemas } from '@yilink/shared';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslations } from 'next-intl';

import type { StudioBlock, StudioBlockSize } from './types';

interface SortableBlockEditorProps {
  block: StudioBlock;
  layout: 'LIST' | 'GRID';
  onChange: (block: StudioBlock) => void;
  onRemove: (id: string) => void;
}

interface TextFieldProps {
  invalid?: boolean;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'url';
  value: string;
}

/** 平台下拉框按类目分组：123 个平台平铺不可用，常用类目（社交/视频）排前。 */
const PLATFORM_CATEGORY_LABELS: Record<string, string> = {
  social: '社交',
  video: '视频',
  content: '内容与写作',
  music: '音频与音乐',
  contact: '联系方式',
  shopping: '电商',
  support: '赞助与收款',
  booking: '预约与协作',
  dev: '开发',
  design: '设计',
  game: '游戏',
  life: '生活',
  academic: '学术',
  other: '其他',
};

const PLATFORM_GROUPS = Object.keys(PLATFORM_CATEGORY_LABELS)
  .map((category) => ({
    category,
    label: PLATFORM_CATEGORY_LABELS[category],
    platforms: platformMetaList.filter((platform) => platform.category === category),
  }))
  .filter((group) => group.platforms.length > 0);

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function recordValue(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function TextField({
  invalid = false,
  label,
  onChange,
  placeholder,
  type = 'text',
  value,
}: TextFieldProps) {
  const t = useTranslations('Studio');
  return (
    <label className="block text-xs font-semibold text-slate-700">
      {label}
      <input
        aria-invalid={invalid}
        className={`mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-normal text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 ${
          invalid ? 'border-rose-400' : 'border-slate-200'
        }`}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {invalid ? (
        <span className="mt-1 block font-normal text-rose-600">{t('errors.fieldInvalid')}</span>
      ) : null}
    </label>
  );
}

export function SortableBlockEditor({
  block,
  layout,
  onChange,
  onRemove,
}: SortableBlockEditorProps) {
  const t = useTranslations('Studio');
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: block.id,
  });
  const validation = blockConfigSchemas[block.type].safeParse(block.config);
  const issues = validation.success ? [] : validation.error.issues;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  function hasIssue(...path: Array<string | number>): boolean {
    return issues.some((issue) => path.every((part, index) => issue.path[index] === part));
  }

  function updateConfig(patch: Record<string, unknown>) {
    onChange({ ...block, config: { ...block.config, ...patch } });
  }

  function renderConfigFields() {
    if (block.type === 'LINK') {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            invalid={hasIssue('title')}
            label={t('fields.linkTitle')}
            onChange={(title) => updateConfig({ title })}
            value={stringValue(block.config.title)}
          />
          <TextField
            invalid={hasIssue('url')}
            label={t('fields.url')}
            onChange={(url) => updateConfig({ url })}
            type="url"
            value={stringValue(block.config.url)}
          />
          <TextField
            invalid={hasIssue('desc')}
            label={t('fields.descriptionOptional')}
            onChange={(desc) => updateConfig({ desc: desc || undefined })}
            value={stringValue(block.config.desc)}
          />
          <TextField
            invalid={hasIssue('thumbUrl')}
            label={t('fields.thumbnailOptional')}
            onChange={(thumbUrl) => updateConfig({ thumbUrl: thumbUrl || undefined })}
            type="url"
            value={stringValue(block.config.thumbUrl)}
          />
        </div>
      );
    }

    if (block.type === 'SOCIAL') {
      const items = Array.isArray(block.config.items)
        ? block.config.items.map((item) => recordValue(item))
        : [];
      function updateItem(index: number, patch: Record<string, unknown>) {
        updateConfig({
          items: items.map((item, itemIndex) =>
            itemIndex === index ? { ...item, ...patch } : item,
          ),
        });
      }
      return (
        <div>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[10rem_1fr_auto]"
                key={index}
              >
                <label className="text-xs font-semibold text-slate-700">
                  {t('fields.platform')}
                  <select
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-normal"
                    onChange={(event) => updateItem(index, { platform: event.target.value })}
                    value={stringValue(item.platform) || 'website'}
                  >
                    {PLATFORM_GROUPS.map((group) => (
                      <optgroup key={group.category} label={group.label}>
                        {group.platforms.map((platform) => (
                          <option key={platform.id} value={platform.id}>
                            {platform.nameZh}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <TextField
                  invalid={hasIssue('items', index, 'url')}
                  label={t('fields.url')}
                  onChange={(url) => updateItem(index, { url })}
                  type="url"
                  value={stringValue(item.url)}
                />
                <button
                  aria-label={t('blocks.removeSocial')}
                  className="self-end rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                  onClick={() =>
                    updateConfig({ items: items.filter((_, itemIndex) => itemIndex !== index) })
                  }
                  type="button"
                >
                  {t('remove')}
                </button>
              </div>
            ))}
          </div>
          {hasIssue('items') ? (
            <p className="mt-2 text-xs text-rose-600">{t('errors.socialRequired')}</p>
          ) : null}
          <button
            className="mt-3 rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-blue-500 hover:text-blue-700"
            onClick={() =>
              updateConfig({
                items: [...items, { platform: 'website', url: 'https://example.com' }],
              })
            }
            type="button"
          >
            {t('blocks.addSocial')}
          </button>
        </div>
      );
    }

    if (block.type === 'TEXT') {
      return (
        <label className="block text-xs font-semibold text-slate-700">
          {t('fields.markdown')}
          <textarea
            aria-invalid={hasIssue('markdown')}
            className={`mt-1.5 min-h-32 w-full resize-y rounded-xl border bg-white px-3 py-2.5 text-sm font-normal leading-6 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 ${
              hasIssue('markdown') ? 'border-rose-400' : 'border-slate-200'
            }`}
            onChange={(event) => updateConfig({ markdown: event.target.value })}
            value={stringValue(block.config.markdown)}
          />
          {hasIssue('markdown') ? (
            <span className="mt-1 block font-normal text-rose-600">{t('errors.fieldInvalid')}</span>
          ) : null}
        </label>
      );
    }

    if (block.type === 'IMAGE') {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            invalid={hasIssue('url')}
            label={t('fields.imageUrl')}
            onChange={(url) => updateConfig({ url })}
            type="url"
            value={stringValue(block.config.url)}
          />
          <TextField
            invalid={hasIssue('alt')}
            label={t('fields.imageAltOptional')}
            onChange={(alt) => updateConfig({ alt: alt || undefined })}
            value={stringValue(block.config.alt)}
          />
          <div className="sm:col-span-2">
            <TextField
              invalid={hasIssue('href')}
              label={t('fields.imageLinkOptional')}
              onChange={(href) => updateConfig({ href: href || undefined })}
              type="url"
              value={stringValue(block.config.href)}
            />
          </div>
        </div>
      );
    }

    if (block.type === 'WECHAT') {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            invalid={hasIssue('wechatId')}
            label={t('fields.wechatId')}
            onChange={(wechatId) => updateConfig({ wechatId })}
            value={stringValue(block.config.wechatId)}
          />
          <TextField
            invalid={hasIssue('qrImageUrl')}
            label={t('fields.wechatQrOptional')}
            onChange={(qrImageUrl) => updateConfig({ qrImageUrl: qrImageUrl || undefined })}
            type="url"
            value={stringValue(block.config.qrImageUrl)}
          />
        </div>
      );
    }

    if (block.type === 'QR') {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            invalid={hasIssue('imageUrl')}
            label={t('fields.qrImageUrl')}
            onChange={(imageUrl) => updateConfig({ imageUrl })}
            type="url"
            value={stringValue(block.config.imageUrl)}
          />
          <TextField
            invalid={hasIssue('label')}
            label={t('fields.qrLabelOptional')}
            onChange={(label) => updateConfig({ label: label || undefined })}
            value={stringValue(block.config.label)}
          />
        </div>
      );
    }

    return <p className="text-sm text-slate-500">{t('blocks.dividerHint')}</p>;
  }

  return (
    <article
      className={`rounded-2xl border bg-white shadow-sm transition ${
        isDragging ? 'z-20 border-blue-400 opacity-80 shadow-xl' : 'border-slate-200'
      }`}
      ref={setNodeRef}
      style={style}
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-3">
        <button
          aria-label={t('blocks.drag', { type: t(`blockTypes.${block.type}`) })}
          className="cursor-grab rounded-lg px-2 py-1 text-lg leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
          type="button"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <strong className="mr-auto text-sm text-slate-900">{t(`blockTypes.${block.type}`)}</strong>
        {!validation.success ? (
          <span className="rounded-full bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700">
            {t('blocks.needsAttention')}
          </span>
        ) : null}
        <button
          aria-pressed={block.isVisible}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            block.isVisible ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}
          onClick={() => onChange({ ...block, isVisible: !block.isVisible })}
          type="button"
        >
          {block.isVisible ? t('visible') : t('hidden')}
        </button>
        <button
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
          onClick={() => onRemove(block.id)}
          type="button"
        >
          {t('remove')}
        </button>
      </header>

      <div className="p-4">
        {layout === 'GRID' ? (
          <fieldset className="mb-4 flex items-center gap-2">
            <legend className="mr-1 inline text-xs font-semibold text-slate-600">
              {t('blocks.gridSize')}
            </legend>
            {(['SM', 'MD', 'LG'] as StudioBlockSize[]).map((size) => (
              <button
                aria-pressed={block.size === size}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                  block.size === size
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                key={size}
                onClick={() => onChange({ ...block, size })}
                type="button"
              >
                {size}
              </button>
            ))}
          </fieldset>
        ) : null}
        {renderConfigFields()}
      </div>
    </article>
  );
}
