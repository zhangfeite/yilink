import type { ReactNode } from 'react';

import styles from './public-page.module.css';

function safeMarkdownHref(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function inlineNodes(source: string, keyPrefix: string): ReactNode[] {
  const pattern = /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_|\[([^\]]+)\]\(([^)\s]+)\))/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(source)) !== null) {
    if (match.index > cursor) nodes.push(source.slice(cursor, match.index));

    const key = `${keyPrefix}-${index}`;
    if (match[2] || match[3]) {
      nodes.push(<strong key={key}>{inlineNodes(match[2] ?? match[3], `${key}-strong`)}</strong>);
    } else if (match[4] || match[5]) {
      nodes.push(<em key={key}>{inlineNodes(match[4] ?? match[5], `${key}-em`)}</em>);
    } else {
      const href = safeMarkdownHref(match[7]);
      nodes.push(
        href ? (
          <a href={href} key={key} rel="noreferrer noopener" target="_blank">
            {match[6]}
          </a>
        ) : (
          match[0]
        ),
      );
    }

    cursor = pattern.lastIndex;
    index += 1;
  }

  if (cursor < source.length) nodes.push(source.slice(cursor));
  return nodes;
}

export function SafeMarkdown({ markdown }: { markdown: string }) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const nodes: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    const unordered = line.match(/^[-+*]\s+(.+)$/);
    if (unordered) {
      const items: ReactNode[] = [];
      while (index < lines.length) {
        const item = lines[index].trim().match(/^[-+*]\s+(.+)$/);
        if (!item) break;
        items.push(<li key={`ul-${index}`}>{inlineNodes(item[1], `ul-${index}`)}</li>);
        index += 1;
      }
      nodes.push(<ul key={`list-${index}`}>{items}</ul>);
      continue;
    }

    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (ordered) {
      const items: ReactNode[] = [];
      while (index < lines.length) {
        const item = lines[index].trim().match(/^\d+[.)]\s+(.+)$/);
        if (!item) break;
        items.push(<li key={`ol-${index}`}>{inlineNodes(item[1], `ol-${index}`)}</li>);
        index += 1;
      }
      nodes.push(<ol key={`list-${index}`}>{items}</ol>);
      continue;
    }

    nodes.push(<p key={`p-${index}`}>{inlineNodes(line, `p-${index}`)}</p>);
    index += 1;
  }

  return <div className={styles.markdown}>{nodes}</div>;
}
