import type { ModerationProvider, ModerationResult } from './provider';
import { collectTextValues } from './text';

/** High-abuse TLD patterns plus a few link/IP logging services unsafe on shared pages. */
export const DEFAULT_URL_BLOCKLIST = [
  // Freenom 系免费域名：注册零成本，是钓鱼/诈骗落地页的长期重灾区
  '*.tk',
  '*.ml',
  '*.ga',
  '*.cf',
  '*.gq',
  '*.top',
  '*.xyz',
  '*.click',
  '*.buzz',
  '*.monster',
  '*.cyou',
  '*.cfd',
  '*.sbs',
  '*.icu',
  '*.cam',
  'grabify.link',
  'iplogger.org',
  '2no.co',
  'yip.su',
] as const;

function splitRules(value: string | readonly string[]): string[] {
  return (typeof value === 'string' ? value.split(/[\s,;]+/u) : [...value])
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeRule(value: string): string | null {
  let rule = value;
  if (rule.startsWith('http://') || rule.startsWith('https://')) {
    try {
      rule = new URL(rule).hostname;
    } catch {
      return null;
    }
  }
  if (rule.startsWith('.')) rule = `*${rule}`;

  const wildcard = rule.startsWith('*.');
  const hostname = rule.startsWith('*.') ? rule.slice(2) : rule;
  if (
    (!wildcard && !hostname.includes('.')) ||
    hostname.length > 253 ||
    !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/u.test(hostname)
  ) {
    return null;
  }
  return wildcard ? `*.${hostname}` : hostname;
}

function urlHostnames(payload: unknown): string[] {
  const hostnames: string[] = [];
  const urlPattern = /https?:\/\/[^\s<>"'`]+/giu;

  for (const value of collectTextValues(payload)) {
    for (const rawMatch of value.match(urlPattern) ?? []) {
      const candidate = rawMatch.replace(/[\])}>.,!?;:'"，。！？；：]+$/u, '');
      try {
        const url = new URL(candidate);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          hostnames.push(url.hostname.toLowerCase().replace(/\.$/u, ''));
        }
      } catch {
        // Invalid URLs are handled by request schemas; they are not blocklist matches.
      }
    }
  }

  return [...new Set(hostnames)];
}

function matchesRule(hostname: string, rule: string): boolean {
  const domain = rule.startsWith('*.') ? rule.slice(2) : rule;
  if (rule.startsWith('*.')) {
    return hostname.endsWith(`.${domain}`);
  }
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export class UrlBlocklistProvider implements ModerationProvider {
  readonly rules: readonly string[];

  constructor(additionalRules: string | readonly string[] = process.env.URL_BLOCKLIST ?? '') {
    this.rules = [
      ...new Set(
        [...DEFAULT_URL_BLOCKLIST, ...splitRules(additionalRules)]
          .map(normalizeRule)
          .filter((rule): rule is string => rule !== null),
      ),
    ];
  }

  async check(payload: unknown): Promise<ModerationResult> {
    const hostnames = urlHostnames(payload);
    const labels = this.rules
      .filter((rule) => hostnames.some((hostname) => matchesRule(hostname, rule)))
      .map((rule) => `url:${rule}`);

    return {
      verdict: labels.length > 0 ? 'block' : 'pass',
      labels,
    };
  }
}
