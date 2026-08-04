import { getTheme } from '@/lib/themes';

const themeIds = [
  'minimal-light',
  'ink-dark',
  'cream-paper',
  'neon-gradient',
  'bamboo-green',
  'vermilion',
  'business-blue',
  'dopamine',
] as const;

export const studioThemes = themeIds.map((id) => getTheme(id));
