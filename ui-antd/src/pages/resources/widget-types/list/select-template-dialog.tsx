/**
 * Template-type selection dialog of the widget-types list page (M11 wave
 * 1B, spec §3.1 新建). ui-ngx SelectWidgetTypeDialogComponent parity: the
 * same STATIC five-kind enum (timeseries / latest / rpc / alarm / static —
 * `widgetType` in ui-ngx widget.models.ts), rendered as selectable cards.
 *
 * Confirm navigates to the M9 editor create entry carrying the picked kind
 * as the `template` query param. ROUTING STATUS QUO (registered in the wave
 * report): the M9 editor route does not consume `template` yet — it opens
 * its own new-type dialog (the same five buckets) on mount, so the picked
 * kind currently serves as a forward-compatible hint, not a preselection.
 */
import {
  AlertOutlined,
  LineChartOutlined,
  ProductOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { history } from '@umijs/max';
import { Modal, Typography } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import type { WidgetTypeKind } from '@/types/tb/widget-type';

/** ui-ngx select-widget-type-dialog option set (static widgetType enum). */
export const TEMPLATE_KINDS: WidgetTypeKind[] = [
  'timeseries',
  'latest',
  'rpc',
  'alarm',
  'static',
];

const KIND_CARDS: Record<
  WidgetTypeKind,
  { icon: React.ReactNode; labelId: string; defaultLabel: string }
> = {
  timeseries: {
    icon: <LineChartOutlined />,
    labelId: 'pages.resources.widgetTypes.template.timeseries',
    defaultLabel: 'Timeseries',
  },
  latest: {
    icon: <SettingOutlined />,
    labelId: 'pages.resources.widgetTypes.template.latest',
    defaultLabel: 'Latest values',
  },
  rpc: {
    icon: <ThunderboltOutlined />,
    labelId: 'pages.resources.widgetTypes.template.rpc',
    defaultLabel: 'Control widget',
  },
  alarm: {
    icon: <AlertOutlined />,
    labelId: 'pages.resources.widgetTypes.template.alarm',
    defaultLabel: 'Alarm widget',
  },
  static: {
    icon: <ProductOutlined />,
    labelId: 'pages.resources.widgetTypes.template.static',
    defaultLabel: 'Static',
  },
};

export interface SelectTemplateDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SelectTemplateDialog({
  open,
  onClose,
}: SelectTemplateDialogProps) {
  const { formatMessage } = useIntl();
  const [kind, setKind] = useState<WidgetTypeKind | null>(null);

  const close = () => {
    setKind(null);
    onClose();
  };

  const confirm = () => {
    if (!kind) {
      return;
    }
    const picked = kind;
    setKind(null);
    onClose();
    history.push(`/widgets/editor?template=${picked}`);
  };

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'pages.resources.widgetTypes.templateTitle',
        defaultMessage: 'Select widget type',
      })}
      okText={formatMessage({
        id: 'pages.resources.widgetTypes.templateConfirm',
        defaultMessage: 'Create',
      })}
      okButtonProps={{ disabled: !kind }}
      onOk={confirm}
      onCancel={close}
      destroyOnHidden
      width={640}
      data-testid="widget-template-dialog"
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 4 }}>
        {formatMessage({
          id: 'pages.resources.widgetTypes.templateHint',
          defaultMessage:
            'Pick the data bucket of the new widget type — the editor opens with a matching starter.',
        })}
      </Typography.Paragraph>
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}
        data-testid="widget-template-cards"
      >
        {TEMPLATE_KINDS.map((entry) => {
          const card = KIND_CARDS[entry];
          const selected = kind === entry;
          return (
            <button
              key={entry}
              type="button"
              data-testid={`widget-template-${entry}`}
              onClick={() => setKind(entry)}
              style={{
                width: 168,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                padding: '16px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                border: '1px solid var(--ant-color-border, #d9d9d9)',
                borderColor: selected
                  ? 'var(--ant-color-primary, #1677ff)'
                  : undefined,
                borderWidth: selected ? 2 : 1,
                background: selected
                  ? 'var(--ant-color-primary-bg, rgba(22, 119, 255, 0.06))'
                  : 'var(--ant-color-bg-container, #fff)',
                color: 'inherit',
                fontSize: 14,
              }}
            >
              <span style={{ fontSize: 32, lineHeight: 1 }}>{card.icon}</span>
              <span style={{ fontWeight: 600 }}>
                {formatMessage({
                  id: card.labelId,
                  defaultMessage: card.defaultLabel,
                })}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
