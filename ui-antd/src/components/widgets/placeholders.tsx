/**
 * Widget placeholders (ADR 0003). The three resolver states + the W2
 * pending slot live here; the copy is centralized in the dashboards locale
 * domain so the container stays copy-agnostic.
 */
import { Typography } from 'antd';
import { useIntl } from 'react-intl';

import type { WidgetComponentProps } from './contract';

export type PlaceholderReason =
  | 'unsupported-angular'
  | 'unsupported-custom'
  | 'missing'
  | 'pending';

const REASON_KEY: Record<PlaceholderReason, string> = {
  'unsupported-angular': 'dashboards.widget.unsupportedAngular',
  'unsupported-custom': 'dashboards.widget.unsupportedCustom',
  missing: 'dashboards.widget.missing',
  pending: 'dashboards.widget.pending',
};

/**
 * Shared placeholder card. Renders the localized reason plus the fqn so a
 * walkthrough can always tell WHICH widget type is not (yet) supported.
 */
export function WidgetPlaceholder({
  reason,
  fqn,
}: {
  reason: PlaceholderReason;
  fqn: string;
}) {
  const { formatMessage } = useIntl();
  return (
    <div
      data-widget-placeholder={reason}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        gap: 4,
        padding: 8,
        textAlign: 'center',
      }}
    >
      <Typography.Text type="secondary">
        {formatMessage({ id: 'dashboards.widget.unsupported' })}
      </Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {formatMessage({ id: REASON_KEY[reason] })}
      </Typography.Text>
      <Typography.Text code style={{ fontSize: 12 }}>
        {fqn}
      </Typography.Text>
    </div>
  );
}

/** v1 slot for the builtin anchor widgets W2 will implement. */
export function PendingWidgetPlaceholder(props: WidgetComponentProps) {
  return <WidgetPlaceholder reason="pending" fqn={props.fqn} />;
}
