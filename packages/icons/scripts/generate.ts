import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';

import { createJiti } from 'jiti';
import * as simpleIcons from 'simple-icons';
import { slugToVariableName } from 'simple-icons/sdk';

const packageJsonPath = process.env.npm_package_json;
const packageDirectory = packageJsonPath ? dirname(packageJsonPath) : process.cwd();
const repositoryDirectory = resolve(packageDirectory, '../..');
const verifiedDataPath = join(
  repositoryDirectory,
  'docs/design/platform-icons-verified.json',
);
const customDirectory = join(packageDirectory, 'src/custom');
const generatedRegistryPath = join(packageDirectory, 'src/generated/registry.ts');
const DEFAULT_VIEW_BOX = '0 0 24 24';
const jiti = createJiti(join(packageDirectory, 'scripts/generate.ts'));

type SimpleIconReference = {
  slug: string;
};

type VerifiedPlatform = {
  id: string;
  nameZh: string;
  nameEn: string;
  category: string;
  aliases: string[];
  simpleIcon: SimpleIconReference | null;
  stickerHex: string | null;
  needsCustomGlyph: boolean;
};

type CustomGlyph = {
  path: string;
  viewBox?: string;
};

type GeneratedPlatform = {
  id: string;
  nameZh: string;
  nameEn: string;
  category: string;
  aliases: string[];
  stickerHex: string | null;
  glyphPath: string | null;
  viewBox: string;
  source: 'simple-icons' | 'custom' | 'pending';
};

function fail(message: string): never {
  throw new Error(`[icons generate] ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(record: Record<string, unknown>, key: string, context: string): string {
  const value = record[key];

  if (typeof value !== 'string' || value.length === 0) {
    fail(`${context}.${key} must be a non-empty string`);
  }

  return value;
}

function parsePlatform(value: unknown, index: number): VerifiedPlatform {
  const context = `platforms[${index}]`;

  if (!isRecord(value)) {
    fail(`${context} must be an object`);
  }

  const aliasesValue = value.aliases;
  if (!Array.isArray(aliasesValue) || aliasesValue.some((alias) => typeof alias !== 'string')) {
    fail(`${context}.aliases must be an array of strings`);
  }

  const simpleIconValue = value.simpleIcon;
  let simpleIcon: SimpleIconReference | null;
  if (simpleIconValue === null) {
    simpleIcon = null;
  } else if (isRecord(simpleIconValue)) {
    simpleIcon = { slug: requiredString(simpleIconValue, 'slug', `${context}.simpleIcon`) };
  } else {
    fail(`${context}.simpleIcon must be an object or null`);
  }

  const stickerHexValue = value.stickerHex;
  if (stickerHexValue !== null && typeof stickerHexValue !== 'string') {
    fail(`${context}.stickerHex must be a string or null`);
  }

  if (typeof value.needsCustomGlyph !== 'boolean') {
    fail(`${context}.needsCustomGlyph must be a boolean`);
  }

  return {
    id: requiredString(value, 'id', context),
    nameZh: requiredString(value, 'nameZh', context),
    nameEn: requiredString(value, 'nameEn', context),
    category: requiredString(value, 'category', context),
    aliases: [...aliasesValue],
    simpleIcon,
    stickerHex: stickerHexValue,
    needsCustomGlyph: value.needsCustomGlyph,
  };
}

function parsePlatforms(value: unknown): VerifiedPlatform[] {
  if (!isRecord(value) || !Array.isArray(value.platforms)) {
    fail('verified data must contain a platforms array');
  }

  const platforms = value.platforms.map(parsePlatform);
  const ids = new Set(platforms.map((platform) => platform.id));

  if (ids.size !== platforms.length) {
    fail('verified data contains duplicate platform ids');
  }

  return platforms;
}

function customGlyphFromModule(customExports: Record<string, unknown>, fileName: string): CustomGlyph {
  const defaultExport = customExports.default;
  const candidate = isRecord(defaultExport) ? defaultExport : customExports;
  const path = candidate.path;
  const viewBox = candidate.viewBox;

  if (typeof path !== 'string' || path.length === 0) {
    fail(`${fileName} must export a non-empty path string`);
  }

  if (viewBox !== undefined && typeof viewBox !== 'string') {
    fail(`${fileName} viewBox must be a string when provided`);
  }

  return { path, viewBox };
}

function simpleIconPath(slug: string): string {
  const variableName = slugToVariableName(slug);
  const icon = (simpleIcons as unknown as Record<string, unknown>)[variableName];

  if (!isRecord(icon) || typeof icon.path !== 'string' || icon.path.length === 0) {
    fail(`simple-icons does not contain the verified slug ${slug}`);
  }

  return icon.path;
}

async function readCustomGlyphs(platforms: readonly VerifiedPlatform[]) {
  const knownIds = new Set(platforms.map((platform) => platform.id));
  const customGlyphs = new Map<string, CustomGlyph>();
  const entries = await readdir(customDirectory, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || extname(entry.name) !== '.ts') {
      continue;
    }

    const id = entry.name.slice(0, -'.ts'.length);
    if (!knownIds.has(id)) {
      fail(`custom glyph ${entry.name} does not match a verified platform id`);
    }

    const modulePath = join(customDirectory, entry.name);
    const customExports = (await jiti.import(modulePath)) as Record<string, unknown>;
    customGlyphs.set(id, customGlyphFromModule(customExports, `src/custom/${entry.name}`));
  }

  return customGlyphs;
}

function buildRegistry(
  platforms: readonly VerifiedPlatform[],
  customGlyphs: ReadonlyMap<string, CustomGlyph>,
): GeneratedPlatform[] {
  return platforms.map((platform) => {
    const customGlyph = customGlyphs.get(platform.id);

    if (platform.simpleIcon) {
      if (customGlyph) {
        fail(`custom glyph ${platform.id} cannot replace a verified simple-icons glyph`);
      }

      return {
        id: platform.id,
        nameZh: platform.nameZh,
        nameEn: platform.nameEn,
        category: platform.category,
        aliases: platform.aliases,
        stickerHex: platform.stickerHex,
        glyphPath: simpleIconPath(platform.simpleIcon.slug),
        viewBox: DEFAULT_VIEW_BOX,
        source: 'simple-icons',
      };
    }

    if (customGlyph) {
      return {
        id: platform.id,
        nameZh: platform.nameZh,
        nameEn: platform.nameEn,
        category: platform.category,
        aliases: platform.aliases,
        stickerHex: platform.stickerHex,
        glyphPath: customGlyph.path,
        viewBox: customGlyph.viewBox ?? DEFAULT_VIEW_BOX,
        source: 'custom',
      };
    }

    if (!platform.needsCustomGlyph) {
      fail(`${platform.id} has neither a simple-icons nor custom glyph`);
    }

    return {
      id: platform.id,
      nameZh: platform.nameZh,
      nameEn: platform.nameEn,
      category: platform.category,
      aliases: platform.aliases,
      stickerHex: platform.stickerHex,
      glyphPath: null,
      viewBox: DEFAULT_VIEW_BOX,
      source: 'pending',
    };
  });
}

function registrySource(platforms: readonly GeneratedPlatform[]): string {
  const entries = platforms.map((platform) => `  ${JSON.stringify(platform)},`).join('\n');
  const ids = platforms.map((platform) => `  ${JSON.stringify(platform.id)},`).join('\n');

  return `// This file is generated by scripts/generate.ts. Do not edit manually.\n// Source: docs/design/platform-icons-verified.json\n\nimport type { PlatformIconDefinition } from '../types';\n\nexport const platformRegistry = [\n${entries}\n] as const satisfies readonly PlatformIconDefinition[];\n\nexport const platformIcons = platformRegistry;\n\nexport const platformIconIds = [\n${ids}\n] as const;\n\nexport type PlatformIconId = (typeof platformIconIds)[number];\n\nexport const platformRegistryById: Readonly<Record<PlatformIconId, PlatformIconDefinition>> =\n  Object.freeze(\n    Object.fromEntries(platformRegistry.map((platform) => [platform.id, platform])) as unknown as Record<\n      PlatformIconId,\n      PlatformIconDefinition\n    >,\n  );\n\nexport function getPlatformIcon(id: PlatformIconId): PlatformIconDefinition {\n  return platformRegistryById[id];\n}\n`;
}

async function main() {
  const source = await readFile(verifiedDataPath, 'utf8');
  const platforms = parsePlatforms(JSON.parse(source) as unknown);
  const customGlyphs = await readCustomGlyphs(platforms);
  const registry = buildRegistry(platforms, customGlyphs);
  const nextSource = registrySource(registry);
  const currentSource = await readFile(generatedRegistryPath, 'utf8').catch(() => undefined);

  if (currentSource !== nextSource) {
    await writeFile(generatedRegistryPath, nextSource, 'utf8');
  }

  const counts = registry.reduce(
    (result, platform) => ({ ...result, [platform.source]: result[platform.source] + 1 }),
    { 'simple-icons': 0, custom: 0, pending: 0 },
  );
  const state = currentSource === nextSource ? 'up to date' : 'written';
  console.log(
    `[icons generate] registry ${state}: ${registry.length} platforms ` +
      `(simple-icons: ${counts['simple-icons']}, custom: ${counts.custom}, pending: ${counts.pending})`,
  );
}

await main();
