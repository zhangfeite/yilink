export type StudioBlockType = 'LINK' | 'SOCIAL' | 'TEXT' | 'IMAGE' | 'WECHAT' | 'QR' | 'DIVIDER';

export type StudioBlockSize = 'SM' | 'MD' | 'LG';

export interface StudioBlock {
  id: string;
  type: StudioBlockType;
  size: StudioBlockSize;
  isVisible: boolean;
  config: Record<string, unknown>;
}

export interface StudioPageDraft {
  id: string;
  slug: string;
  title: string;
  bio: string | null;
  avatarUrl: string | null;
  layout: 'LIST' | 'GRID';
  themeId: string;
  themeConfig: unknown;
  seoTitle: string | null;
  seoDesc: string | null;
  ctaConfig: unknown;
  status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
  blocks: StudioBlock[];
}
