import { blockSchema, ctaConfigSchema, RESERVED_SLUGS, SLUG_PATTERN } from '@yilink/shared';
import { z } from 'zod';

const pageTitleSchema = z.string().trim().min(1).max(120);
const nullableUrlSchema = z.string().url().nullable();
const nullableShortTextSchema = z.string().trim().max(500).nullable();

export const pageIdSchema = z.string().trim().min(1).max(64);

export const meUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(30),
  })
  .strict();

export type MeUpdateInput = z.infer<typeof meUpdateSchema>;

export const pageCreateSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .regex(SLUG_PATTERN)
      .refine((slug) => !RESERVED_SLUGS.includes(slug as (typeof RESERVED_SLUGS)[number])),
    title: pageTitleSchema,
    templateId: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

export type PageCreateInput = z.infer<typeof pageCreateSchema>;

export const pageUpdateSchema = z
  .object({
    title: pageTitleSchema,
    bio: nullableShortTextSchema,
    avatarUrl: nullableUrlSchema,
    layout: z.enum(['LIST', 'GRID']),
    themeId: z.string().trim().min(1).max(120),
    seoTitle: z.string().trim().max(120).nullable(),
    seoDesc: z.string().trim().max(500).nullable(),
    ctaConfig: ctaConfigSchema,
  })
  .partial()
  .strict()
  .refine((input) => Object.keys(input).length > 0);

export type PageUpdateInput = z.infer<typeof pageUpdateSchema>;

const blockMetaSchema = z
  .object({
    size: z.enum(['SM', 'MD', 'LG']),
    isVisible: z.boolean(),
  });

export const blockReplaceItemSchema = blockSchema.and(blockMetaSchema);

export const blocksReplaceSchema = z.array(blockReplaceItemSchema).max(50);

export type BlocksReplaceInput = z.infer<typeof blocksReplaceSchema>;
