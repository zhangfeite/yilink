import { z } from 'zod';

import { blockConfigSchemas } from './blocks';
import { ctaConfigSchema } from './cta';
import { bentoPlacementSchema } from './layout/bento';

/** 场景模板（docs/design/template-system.md §二）：主题 × 版式 × 预置区块 × 文案骨架 × 默认 CTA。 */
export const templateBlockSchema = z
  .object({
    type: z.enum(['LINK', 'SOCIAL', 'TEXT', 'IMAGE', 'WECHAT', 'QR', 'DIVIDER']),
    size: z.enum(['SM', 'MD', 'LG']).default('MD'),
    config: z.record(z.string(), z.unknown()),
    placement: bentoPlacementSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const schema = blockConfigSchemas[value.type];
    const parsed = schema.safeParse(value.config);
    if (!parsed.success) {
      ctx.addIssue({
        code: 'custom',
        message: `config 不符合 ${value.type} 区块 schema: ${parsed.error.issues[0]?.message ?? ''}`,
        path: ['config'],
      });
    }
  });

export const sceneTemplateSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'kebab-case'),
  nameZh: z.string().min(2).max(12),
  persona: z.string().min(2).max(8),
  scene: z.array(z.string().min(2).max(8)).min(1).max(3),
  defaultTheme: z.string().min(1),
  layout: z.enum(['LIST', 'GRID']),
  bentoVersion: z.literal(1).optional(),
  cta: ctaConfigSchema.nullable(),
  identity: z.object({
    title: z.string().min(1).max(20),
    role: z.string().min(2).max(24),
    bio: z.string().min(10).max(120),
  }),
  blocks: z.array(templateBlockSchema).min(2).max(12),
});

export const sceneTemplatesFileSchema = z.array(sceneTemplateSchema).min(1);

export type SceneTemplate = z.infer<typeof sceneTemplateSchema>;
