// meta 轻量入口：schema 会被客户端编辑器传染引入，绝不能拖上完整字形注册表（~130KB）
import { platformMetaIds } from '@yilink/icons/meta';
import { z } from 'zod';

const optionalHttpUrl = z.string().url().optional();

export const linkBlockSchema = z.object({
  title: z.string().trim().min(1),
  url: z.string().url(),
  desc: z.string().trim().min(1).optional(),
  thumbUrl: optionalHttpUrl,
});

export const socialBlockSchema = z.object({
  items: z
    .array(
      z.object({
        platform: z.enum(platformMetaIds),
        url: z.string().url(),
      }),
    )
    .min(1),
});

export const textBlockSchema = z.object({
  markdown: z.string().trim().min(1),
});

export const imageBlockSchema = z.object({
  url: z.string().url(),
  alt: z.string().optional(),
  href: optionalHttpUrl,
});

export const wechatBlockSchema = z.object({
  wechatId: z.string().trim().min(1),
  qrImageUrl: optionalHttpUrl,
});

export const qrBlockSchema = z.object({
  imageUrl: z.string().url(),
  label: z.string().trim().min(1).optional(),
});

export const dividerBlockSchema = z.object({}).strict();

export const blockConfigSchemas = {
  LINK: linkBlockSchema,
  SOCIAL: socialBlockSchema,
  TEXT: textBlockSchema,
  IMAGE: imageBlockSchema,
  WECHAT: wechatBlockSchema,
  QR: qrBlockSchema,
  DIVIDER: dividerBlockSchema,
} as const;

export const blockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('LINK'), config: linkBlockSchema }),
  z.object({ type: z.literal('SOCIAL'), config: socialBlockSchema }),
  z.object({ type: z.literal('TEXT'), config: textBlockSchema }),
  z.object({ type: z.literal('IMAGE'), config: imageBlockSchema }),
  z.object({ type: z.literal('WECHAT'), config: wechatBlockSchema }),
  z.object({ type: z.literal('QR'), config: qrBlockSchema }),
  z.object({ type: z.literal('DIVIDER'), config: dividerBlockSchema }),
]);

export type Block = z.infer<typeof blockSchema>;
