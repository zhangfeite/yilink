import type { ModerationProvider, ModerationResult } from './provider';

export const LOCAL_WORDS: readonly string[] = [];

export class LocalWordsModerationProvider implements ModerationProvider {
  async check(payload: unknown): Promise<ModerationResult> {
    const content = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const labels = LOCAL_WORDS.filter((word) => content.includes(word));

    return {
      verdict: labels.length > 0 ? 'review' : 'pass',
      labels: [...labels],
    };
  }
}
