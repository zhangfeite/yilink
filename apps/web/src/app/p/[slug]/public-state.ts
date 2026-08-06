export type PublicPageDisposition = 'draft' | 'missing' | 'published' | 'unavailable';

export function publicPageDisposition(
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'HIDDEN' | null,
  deletedAt: Date | null = null,
): PublicPageDisposition {
  if (deletedAt !== null || status === null) return 'missing';
  if (status === 'REVIEW' || status === 'HIDDEN') return 'unavailable';
  return status === 'PUBLISHED' ? 'published' : 'draft';
}
