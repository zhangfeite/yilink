import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  fallbackSceneTemplates,
  loadSceneTemplates,
  parseSceneTemplates,
} from '../../lib/templates';

describe('scene template loader', () => {
  it('accepts a valid templates file', () => {
    const directory = mkdtempSync(join(tmpdir(), 'yilink-templates-'));
    const filePath = join(directory, 'templates.json');
    writeFileSync(filePath, JSON.stringify([fallbackSceneTemplates[0]]));

    const templates = loadSceneTemplates(filePath);

    expect(templates).toHaveLength(1);
    expect(templates[0]?.id).toBe('illustrator-commission');
  });

  it('falls back to three built-in templates when validation fails', () => {
    expect(parseSceneTemplates([{ id: 'broken' }])).toEqual(fallbackSceneTemplates);
    expect(fallbackSceneTemplates).toHaveLength(3);
  });

  it('falls back to three built-in templates when the file is missing', () => {
    const templates = loadSceneTemplates(join(tmpdir(), 'missing-yilink-templates.json'));

    expect(templates).toEqual(fallbackSceneTemplates);
  });
});
