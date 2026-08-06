import type { ModerationProvider, ModerationResult } from './provider';
import { collectTextValues, normalizeModerationText } from './text';
import {
  BLOCK_WORD_CATEGORIES,
  BLOCK_WORDS,
  REVIEW_WORD_CATEGORIES,
  REVIEW_WORDS,
} from './word-lists';

export const LOCAL_WORDS: readonly string[] = BLOCK_WORDS;

interface WordRule {
  category: string;
  normalizedTerm: string;
  term: string;
}

function categoryRules(categories: Readonly<Record<string, readonly string[]>>): WordRule[] {
  return Object.entries(categories).flatMap(([category, terms]) =>
    terms.map((term) => ({ category, normalizedTerm: normalizeModerationText(term), term })),
  );
}

const blockRules = categoryRules(BLOCK_WORD_CATEGORIES);
const reviewRules = categoryRules(REVIEW_WORD_CATEGORIES);

function matchingLabels(content: readonly string[], rules: readonly WordRule[]): string[] {
  const labels = rules
    .filter((rule) => content.some((segment) => segment.includes(rule.normalizedTerm)))
    .map((rule) => `${rule.category}:${rule.term}`);
  return [...new Set(labels)];
}

export class LocalWordsModerationProvider implements ModerationProvider {
  async check(payload: unknown): Promise<ModerationResult> {
    const content = collectTextValues(payload).map(normalizeModerationText).filter(Boolean);
    const blockLabels = matchingLabels(content, blockRules);
    if (blockLabels.length > 0) {
      return { verdict: 'block', labels: blockLabels };
    }

    const reviewLabels = matchingLabels(content, reviewRules);

    return {
      verdict: reviewLabels.length > 0 ? 'review' : 'pass',
      labels: reviewLabels,
    };
  }
}

export { BLOCK_WORD_CATEGORIES, BLOCK_WORDS, REVIEW_WORD_CATEGORIES, REVIEW_WORDS };
