/**
 * Compile-broken custom widget panel (ADR 0004 §4 error closure, dashboard
 * side). A react-1 widget whose source does not compile must degrade to a
 * readable card — the fqn exists, so this is NOT the 'missing' placeholder;
 * the error text itself is passthrough copy (ADR 0004 §6).
 *
 * Copy lives in the widget-kit locale domain (`editor.widgetKit.*`) because
 * this state only exists for fork-compiled widgets.
 */
import { Typography } from 'antd';
import { useIntl } from 'react-intl';

import type { WidgetCompileError } from '@/core/widget/compile';

export function CustomWidgetBrokenPanel({
  fqn,
  error,
}: {
  fqn: string;
  error: WidgetCompileError;
}) {
  const { formatMessage } = useIntl();
  const location =
    error.line === undefined
      ? ''
      : `:${error.line}${error.column === undefined ? '' : `:${error.column}`}`;
  return (
    <div
      data-widget-broken="compile"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        padding: 8,
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      <Typography.Text type="warning">
        {formatMessage({ id: 'editor.widgetKit.compileError' })}
      </Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {formatMessage({ id: 'editor.widgetKit.compileErrorHint' })}
      </Typography.Text>
      <Typography.Text code style={{ fontSize: 12 }}>
        {error.message}
      </Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {fqn}
        {location}
      </Typography.Text>
    </div>
  );
}
