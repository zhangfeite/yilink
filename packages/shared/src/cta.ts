import { z } from 'zod';

const ctaValueSchema = z.string();

export const ctaConfigSchema = z
  .discriminatedUnion('type', [
    z
      .object({
        type: z.literal('wechat'),
        label: z.string().trim().min(1).max(12),
        value: ctaValueSchema,
      })
      .strict(),
    z
      .object({
        type: z.literal('link'),
        label: z.string().trim().min(1).max(12),
        value: ctaValueSchema,
      })
      .strict(),
  ])
  .nullable();

export type CtaConfig = z.infer<typeof ctaConfigSchema>;

export const FREE_PAGE_LIMIT = 3;
