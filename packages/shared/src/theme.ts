import { z } from 'zod';

const cssColorSchema = z.string().trim().min(1);

export const themeSchema = z.object({
  palette: z.object({
    background: cssColorSchema,
    foreground: cssColorSchema,
    primary: cssColorSchema,
    primaryForeground: cssColorSchema,
    muted: cssColorSchema,
  }),
  background: z.discriminatedUnion('type', [
    z.object({ type: z.literal('solid'), value: cssColorSchema }),
    z.object({ type: z.literal('gradient'), value: z.string().trim().min(1) }),
    z.object({ type: z.literal('image'), value: z.string().url() }),
  ]),
  font: z.object({
    family: z.string().trim().min(1),
    weight: z.number().int().min(100).max(900),
  }),
  radius: z.enum(['none', 'sm', 'md', 'lg', 'full']),
  buttonStyle: z.enum(['solid', 'outline', 'soft', 'shadow']),
});

export type Theme = z.infer<typeof themeSchema>;
