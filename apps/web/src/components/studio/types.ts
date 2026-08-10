export type StudioBlockType = 'LINK' | 'SOCIAL' | 'TEXT' | 'IMAGE' | 'WECHAT' | 'QR' | 'DIVIDER';

export type StudioBlockSize = 'SM' | 'MD' | 'LG';

export type StudioLayout = 'LIST' | 'GRID';

export interface StudioBlock {
  id: string;
  type: StudioBlockType;
  size: StudioBlockSize;
  isVisible: boolean;
  config: Record<string, unknown>;
  placement?: { x: number; y: number; w: number; h: number } | null;
}

export interface StudioPageDraft {
  id: string;
  slug: string;
  title: string;
  bio: string | null;
  avatarUrl: string | null;
  layout: StudioLayout;
  bentoVersion: number | null;
  themeId: string;
  themeConfig: unknown;
  seoTitle: string | null;
  seoDesc: string | null;
  ctaConfig: unknown;
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'HIDDEN';
  blocks: StudioBlock[];
}
