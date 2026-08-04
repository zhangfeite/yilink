import { themeSchema as sharedThemeSchema } from '@yilink/shared';
import { z } from 'zod';

import rawThemes from '@/themes/themes.json';

const cssTokenSchema = z.string().trim().min(1);
const fontWeightSchema = z.number().int().min(100).max(900);

const publicThemeSchema = z
  .object({
    id: z.string().trim().min(1),
    nameZh: z.string().trim().min(1),
    nameEn: z.string().trim().min(1),
    neutral: z
      .object({
        pageBg: cssTokenSchema,
        card: cssTokenSchema,
        text: cssTokenSchema,
        subtext: cssTokenSchema,
        hairline: cssTokenSchema,
      })
      .strict(),
    accent: cssTokenSchema,
    accentOn: cssTokenSchema,
    background: z.discriminatedUnion('type', [
      z.object({ type: z.literal('solid'), value: cssTokenSchema }).strict(),
      z.object({ type: z.literal('gradient'), value: cssTokenSchema }).strict(),
      z.object({ type: z.literal('image'), value: z.string().url() }).strict(),
    ]),
    texture: z.enum(['none', 'noise', 'paper']),
    elevation: z.object({ cardShadow: cssTokenSchema }).strict(),
    typography: z
      .object({
        display: z
          .object({
            size: z.number().min(1),
            weight: fontWeightSchema,
            tracking: cssTokenSchema,
          })
          .strict(),
        section: z.object({ size: z.number().min(1), weight: fontWeightSchema }).strict(),
        body: z.object({ size: z.number().min(1), weight: fontWeightSchema }).strict(),
        caption: z.object({ size: z.number().min(1), weight: fontWeightSchema }).strict(),
      })
      .strict(),
    radius: z
      .object({ card: cssTokenSchema, sticker: cssTokenSchema, avatar: cssTokenSchema })
      .strict(),
    grid: z.object({ gap: cssTokenSchema }).strict(),
  })
  .strict();

const publicThemesSchema = z
  .array(publicThemeSchema)
  .min(1)
  .superRefine((themes, context) => {
    const ids = new Set<string>();

    themes.forEach((theme, index) => {
      if (ids.has(theme.id)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate theme id: ${theme.id}`,
          path: [index, 'id'],
        });
      }
      ids.add(theme.id);
    });

    if (!ids.has('minimal-light')) {
      context.addIssue({
        code: 'custom',
        message: 'The minimal-light fallback theme is required',
        path: [],
      });
    }
  });

export type PublicTheme = z.infer<typeof publicThemeSchema>;

function radiusKind(value: string): 'none' | 'sm' | 'md' | 'lg' | 'full' {
  const pixels = Number.parseFloat(value);
  if (!Number.isFinite(pixels) || pixels <= 0) return 'none';
  if (pixels <= 8) return 'sm';
  if (pixels <= 14) return 'md';
  if (pixels <= 24) return 'lg';
  return 'full';
}

function validateWithSharedSchema(theme: PublicTheme): void {
  // The shared package in the parallel worktree still exposes its v1 theme shape.
  // Validate a lossless core-token projection until its v2 schema lands; the strict
  // publicThemeSchema above validates every v2 renderer token at module load.
  const directResult = sharedThemeSchema.safeParse(theme);
  if (directResult.success) return;

  sharedThemeSchema.parse({
    palette: {
      background: theme.neutral.pageBg,
      foreground: theme.neutral.text,
      primary: theme.accent,
      primaryForeground: theme.accentOn,
      muted: theme.neutral.subtext,
    },
    background: theme.background,
    font: {
      family: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
      weight: theme.typography.body.weight,
    },
    radius: radiusKind(theme.radius.card),
    buttonStyle: 'soft',
  });
}

const themes = publicThemesSchema.parse(rawThemes);
themes.forEach(validateWithSharedSchema);

const themesById = new Map(themes.map((theme) => [theme.id, theme]));
const fallbackTheme = (() => {
  const theme = themesById.get('minimal-light');
  if (!theme) throw new Error('Theme validation succeeded without the minimal-light fallback');
  return theme;
})();

export function getTheme(id: string | null | undefined): PublicTheme {
  return (id ? themesById.get(id) : undefined) ?? fallbackTheme;
}
