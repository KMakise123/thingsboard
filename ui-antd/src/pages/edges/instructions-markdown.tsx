/**
 * Safe whitelist renderer for the backend-authored Edge instruction
 * markdown (R07): the install/upgrade guides are plain markdown with
 * fenced shell blocks, ATX headings, bold/inline-code, HTML anchors and a
 * ngx-only `{:copy-code}` fence marker.
 *
 * Everything becomes React text nodes — no HTML strings, no dangerously
 * SetInnerHTML — so unknown markup renders literally instead of executing;
 * anchors keep only http(s) hrefs. No third-party markdown dependency.
 */
import { Typography } from 'antd';
import type { ReactNode } from 'react';

/** One inline `code`/`strong`/anchor run or a plain-text stretch. */
const INLINE_PATTERN =
  /<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>|\*\*([^*]+)\*\*|`([^`]+)`/g;

function stripTags(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

function renderInline(text: string, keyPrefix: string): Array<ReactNode> {
  const nodes: Array<ReactNode> = [];
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(INLINE_PATTERN)) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const key = `${keyPrefix}-${index++}`;
    if (match[1] !== undefined) {
      // Anchor: whitelist absolute http(s) targets, render the label only.
      const href = match[1];
      const label = stripTags(match[2]);
      nodes.push(
        /^https?:\/\//i.test(href) ? (
          <a key={key} href={href} target="_blank" rel="noreferrer">
            {label}
          </a>
        ) : (
          label
        ),
      );
    } else if (match[3] !== undefined) {
      nodes.push(<strong key={key}>{match[3]}</strong>);
    } else {
      nodes.push(<code key={key}>{match[4]}</code>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    nodes.push(text.slice(last));
  }
  return nodes;
}

/**
 * Convert the instruction markdown into block elements. Line-per-paragraph
 * is deliberate: the upstream guides keep one sentence per line, so soft
 * line breaks never matter.
 */
export function renderInstructionsMarkdown(markdown: string): Array<ReactNode> {
  const blocks: Array<ReactNode> = [];
  const lines = markdown.split('\n');
  let key = 0;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trimStart().startsWith('```')) {
      const codeLines: Array<string> = [];
      i += 1;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // closing fence (or EOF)
      const code = codeLines
        .filter((codeLine) => codeLine.trim() !== '{:copy-code}')
        .join('\n');
      blocks.push(
        <pre
          key={`code-${key++}`}
          className="max-h-72 overflow-auto text-xs leading-5"
        >
          <code>{code}</code>
        </pre>,
      );
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      // antd Titles only span levels 1..5; deeper headings clamp to 5.
      const titleLevel = Math.min(heading[1].length, 5) as 1 | 2 | 3 | 4 | 5;
      blocks.push(
        <Typography.Title key={`h-${key++}`} level={titleLevel}>
          {renderInline(stripTags(heading[2]), `h-${key}`)}
        </Typography.Title>,
      );
      i += 1;
      continue;
    }
    const listItem = /^\s*[-*]\s+(.*)$/.exec(line);
    if (listItem) {
      const items: Array<string> = [];
      while (i < lines.length) {
        const item = /^\s*[-*]\s+(.*)$/.exec(lines[i]);
        if (!item) {
          break;
        }
        items.push(item[1]);
        i += 1;
      }
      blocks.push(
        <ul key={`ul-${key++}`} className="mb-3 mt-0 list-disc pl-6">
          {items.map((item, itemIndex) => (
            <li key={item}>{renderInline(item, `li-${key}-${itemIndex}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    if (line.trim() === '') {
      i += 1;
      continue;
    }
    blocks.push(
      <Typography.Paragraph key={`p-${key++}`}>
        {renderInline(line, `p-${key}`)}
      </Typography.Paragraph>,
    );
    i += 1;
  }
  return blocks;
}
