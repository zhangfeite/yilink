/** The provenance of a platform glyph in the generated registry. */
export type PlatformIconSource = 'simple-icons' | 'custom' | 'pending';

/**
 * One platform entry generated from platform-icons-verified.json.
 *
 * `stickerHex` is intentionally nullable: pending/custom glyphs do not invent
 * a brand colour until it has been verified in the source data.
 */
export interface PlatformIconDefinition {
  readonly id: string;
  readonly nameZh: string;
  readonly nameEn: string;
  readonly category: string;
  readonly aliases: readonly string[];
  readonly stickerHex: `#${string}` | null;
  readonly glyphPath: string | null;
  readonly viewBox: string;
  readonly source: PlatformIconSource;
}
