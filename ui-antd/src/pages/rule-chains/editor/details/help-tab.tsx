/**
 * RuleNodeHelpTab — the help tab of the node details drawer (M8 brief §3
 * wave-3 K2; ADR 0004 §3): the descriptor's markdown-rich HTML body
 * (`nodeDefinition.details` + `description`) is passed through UNTRANSLATED
 * (文案透传不翻译) but NEVER trusted raw — DOMPurify strips scripts and event
 * handlers before the dangerouslySetInnerHTML render (不继承 TB 裸信任姿势).
 * `docUrl` renders as an out-link in a new tab.
 */

import { FileTextOutlined } from '@ant-design/icons';
import { Button, Empty, Typography } from 'antd';
import DOMPurify from 'dompurify';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import type { RuleNodeComponentDescriptor } from '@/types/tb/rule-chain';

export interface RuleNodeHelpTabProps {
  descriptor?: RuleNodeComponentDescriptor;
  clazz: string;
}

/** Tags never acceptable in help copy, regardless of the sanitizer profile. */
const FORBIDDEN_TAGS = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'base',
] as const;

/**
 * DOMPurify pass plus a deterministic element sweep. Under happy-dom the
 * DOMPurify parser strips attributes (onclick etc.) but leaves <script> and
 * <style> NODES in place (verified 2026-09) — the re-parse below removes
 * exactly the forbidden tags the profile already forbids, so the test
 * environment asserts the same allowlist real browsers get. In a real
 * browser the sweep is a no-op.
 */
export function sanitizeDetailsHtml(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: [...FORBIDDEN_TAGS],
  });
  const holder = document.createElement('div');
  holder.innerHTML = clean;
  for (const element of [
    ...holder.querySelectorAll(FORBIDDEN_TAGS.join(',')),
  ]) {
    element.remove();
  }
  return holder.innerHTML;
}

export function RuleNodeHelpTab({ descriptor, clazz }: RuleNodeHelpTabProps) {
  const { formatMessage } = useIntl();
  const definition = descriptor?.configurationDescriptor?.nodeDefinition;

  const html = useMemo(() => {
    const parts = [definition?.details, definition?.description].filter(
      (part): part is string => Boolean(part),
    );
    if (parts.length === 0) {
      return '';
    }
    return sanitizeDetailsHtml(parts.join('\n'));
  }, [definition?.details, definition?.description]);

  if (!html && !definition?.docUrl) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={formatMessage({
          id: 'editor.ruleNode.help.noDocs',
          defaultMessage: 'This node has no documentation.',
        })}
        data-testid="rc-details-help-empty"
      />
    );
  }

  return (
    <div data-testid="rc-details-help">
      {html ? (
        <Typography>
          {/* descriptor help copy — sanitized through DOMPurify + the
              forbidden-tag sweep above (ADR 0004 §3) */}
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized help HTML, DOMPurify allowlist + forbidden-tag sweep */}
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </Typography>
      ) : null}
      {definition?.docUrl ? (
        <Button
          type="link"
          icon={<FileTextOutlined />}
          href={definition.docUrl}
          target="_blank"
          rel="noreferrer"
          data-testid="rc-details-doc-url"
          style={{ paddingLeft: 0 }}
        >
          {formatMessage({
            id: 'editor.ruleNode.help.docUrl',
            defaultMessage: 'Open documentation',
          })}
        </Button>
      ) : null}
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {clazz}
      </Typography.Text>
    </div>
  );
}
