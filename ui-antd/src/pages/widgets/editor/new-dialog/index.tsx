/**
 * NewWidgetDialog — create-entry dialog of the widget editor (spec §5.6:
 * 新建 = 5 个 React starter 模板选择, the ui-ngx select-widget-type-dialog
 * buckets). Registered in the shell DialogHost under the id `new` and
 * rendered by the create route (/widgets/editor); the payload signature is
 * the frozen wave-S seam.
 *
 * Wave-3 D body: five starter cards (built-in frontend static assets — see
 * templates/); confirm delivers `starterToDoc(picked)` — a fresh
 * create-path draft (no id/fqn/version) filled with the template bundle.
 * Every starter ships a function datasource, so the preview shows random
 * data out of the box.
 *
 * M11 wave 1B seam: the widget-types library create dialog pushes
 * `/widgets/editor?template=<kind>`; a known kind preselects its starter
 * card on mount (same five buckets as ui-ngx select-widget-type-dialog).
 * No/unknown param keeps the previous empty-selection behavior.
 */

import {
  AlertOutlined,
  LineChartOutlined,
  ProductOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useLocation } from '@umijs/max';
import { Modal, Typography } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import type { WidgetEditorDialogProps } from '../dialog-host';
import type { WidgetEditorDoc } from '../draft-convert';
import { starterToDoc } from '../templates';

export type WidgetStarterKind =
  | 'latest'
  | 'timeseries'
  | 'rpc'
  | 'alarm'
  | 'static';

const STARTER_KINDS: readonly WidgetStarterKind[] = [
  'latest',
  'timeseries',
  'rpc',
  'alarm',
  'static',
];

/** `?template=<kind>` → starter kind; unknown/missing values → null. */
export function starterKindFromSearch(
  search: string,
): WidgetStarterKind | null {
  const raw = new URLSearchParams(search).get('template');
  return raw !== null && (STARTER_KINDS as readonly string[]).includes(raw)
    ? (raw as WidgetStarterKind)
    : null;
}

export interface NewWidgetDialogPayload {
  /** delivers the starter draft built from the picked template. */
  onConfirm: (draft: WidgetEditorDoc) => void;
}

const STARTER_CARDS: Array<{
  kind: WidgetStarterKind;
  icon: React.ReactNode;
  labelId: string;
  defaultLabel: string;
  descId: string;
  defaultDesc: string;
}> = [
  {
    kind: 'latest',
    icon: <SettingOutlined />,
    labelId: 'editor.widget.starter.latest.name',
    defaultLabel: 'Latest values card',
    descId: 'editor.widget.starter.latest.desc',
    defaultDesc: 'Function datasource + latest-value list',
  },
  {
    kind: 'timeseries',
    icon: <LineChartOutlined />,
    labelId: 'editor.widget.starter.timeseries.name',
    defaultLabel: 'Timeseries line chart',
    descId: 'editor.widget.starter.timeseries.desc',
    defaultDesc: 'Function datasource + recharts line chart',
  },
  {
    kind: 'rpc',
    icon: <ThunderboltOutlined />,
    labelId: 'editor.widget.starter.rpc.name',
    defaultLabel: 'RPC control button',
    descId: 'editor.widget.starter.rpc.desc',
    defaultDesc: 'Two-way RPC call + result echo',
  },
  {
    kind: 'alarm',
    icon: <AlertOutlined />,
    labelId: 'editor.widget.starter.alarm.name',
    defaultLabel: 'Alarm status card',
    descId: 'editor.widget.starter.alarm.desc',
    defaultDesc: 'Function datasource + alarm status card',
  },
  {
    kind: 'static',
    icon: <ProductOutlined />,
    labelId: 'editor.widget.starter.static.name',
    defaultLabel: 'Static card',
    descId: 'editor.widget.starter.static.desc',
    defaultDesc: 'Plain display card (configurable text and colors)',
  },
];

export function NewWidgetDialog({
  open,
  payload,
  onClose,
}: WidgetEditorDialogProps) {
  const { formatMessage } = useIntl();
  const location = useLocation();
  const typed = payload as NewWidgetDialogPayload | undefined;
  // Preselect from `?template=` once on mount (the host lazily mounts the
  // dialog per open, so every reopen re-reads the URL).
  const [kind, setKind] = useState<WidgetStarterKind | null>(() =>
    starterKindFromSearch(location.search),
  );

  const confirm = () => {
    if (!typed || !kind) {
      return;
    }
    typed.onConfirm(starterToDoc(kind));
    onClose();
  };

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'editor.widget.editor.dialog.new.title',
        defaultMessage: 'New widget',
      })}
      okText={formatMessage({
        id: 'editor.widget.editor.dialog.new.confirm',
        defaultMessage: 'Create',
      })}
      okButtonProps={{ disabled: !kind }}
      onOk={confirm}
      onCancel={onClose}
      destroyOnHidden
      width={640}
      data-testid="widget-new-dialog"
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 4 }}>
        {formatMessage({
          id: 'editor.widget.editor.dialog.new.pick',
          defaultMessage: 'Pick a starter template.',
        })}{' '}
        {formatMessage({
          id: 'editor.widget.editor.dialog.new.pickHint',
          defaultMessage:
            'Every starter ships a function datasource, so the preview has random data out of the box.',
        })}
      </Typography.Paragraph>
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}
        data-testid="widget-new-starter-cards"
      >
        {STARTER_CARDS.map((card) => {
          const selected = kind === card.kind;
          return (
            <button
              key={card.kind}
              type="button"
              data-testid={`widget-new-starter-${card.kind}`}
              onClick={() => setKind(card.kind)}
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
              <span
                style={{ fontSize: 12, opacity: 0.72, textAlign: 'center' }}
              >
                {formatMessage({
                  id: card.descId,
                  defaultMessage: card.defaultDesc,
                })}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
