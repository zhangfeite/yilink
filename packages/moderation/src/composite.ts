import type { ModerationProvider, ModerationResult, ModerationVerdict } from './provider';

const VERDICT_RANK: Readonly<Record<ModerationVerdict, number>> = {
  pass: 0,
  review: 1,
  block: 2,
};

export class CompositeModerationProvider implements ModerationProvider {
  constructor(private readonly providers: readonly ModerationProvider[]) {}

  async check(payload: unknown): Promise<ModerationResult> {
    const results = await Promise.all(this.providers.map((provider) => provider.check(payload)));
    const verdict = results.reduce<ModerationVerdict>(
      (highest, result) =>
        VERDICT_RANK[result.verdict] > VERDICT_RANK[highest] ? result.verdict : highest,
      'pass',
    );

    return {
      verdict,
      labels: [...new Set(results.flatMap((result) => result.labels))],
    };
  }
}
