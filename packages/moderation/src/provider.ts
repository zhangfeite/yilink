export type ModerationVerdict = 'pass' | 'review' | 'block';

export interface ModerationResult {
  verdict: ModerationVerdict;
  labels: string[];
}

export interface ModerationProvider {
  check(payload: unknown): Promise<ModerationResult>;
}
