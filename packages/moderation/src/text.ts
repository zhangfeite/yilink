const CHARACTER_FOLDS: Readonly<Record<string, string>> = {
  賭: '赌',
  網: '网',
  線: '线',
  樂: '乐',
  體: '体',
  資: '资',
  訊: '讯',
  薦: '荐',
  穩: '稳',
  賺: '赚',
  賠: '赔',
  藥: '药',
  醫: '医',
  聯: '联',
  獨: '独',
  顛: '颠',
  國: '国',
  殺: '杀',
  槍: '枪',
  彈: '弹',
  證: '证',
  發: '发',
  幣: '币',
  銀: '银',
  號: '号',
  約: '约',
  辦: '办',
  權: '权',
  群: '群',
};

/**
 * Fold the evasions commonly used in UGC: full-width characters, invisible
 * characters, punctuation inserted between characters, and common traditional
 * forms. We deliberately do not fold arbitrary Latin letters or digits because
 * that produces too many false positives in URLs and account names.
 */
export function normalizeModerationText(value: string): string {
  return Array.from(value.normalize('NFKC').toLowerCase())
    .map((character) => CHARACTER_FOLDS[character] ?? character)
    .join('')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

/** Extract string leaves without serialising object keys or failing on cycles. */
export function collectTextValues(payload: unknown): string[] {
  const values: string[] = [];
  const visited = new WeakSet<object>();

  function visit(value: unknown): void {
    if (typeof value === 'string') {
      values.push(value);
      return;
    }
    if (typeof value !== 'object' || value === null || visited.has(value)) {
      return;
    }

    visited.add(value);
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    Object.values(value).forEach(visit);
  }

  visit(payload);
  return values;
}
