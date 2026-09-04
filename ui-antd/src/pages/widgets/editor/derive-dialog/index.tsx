/**
 * DeriveWidgetDialog — derivation entry of the widget editor (spec §5.6,
 * two tiers). Registered in the shell DialogHost under the id `derive`;
 * the payload signature is the frozen wave-S seam.
 *
 * Tier 1 从现有自定义类型: pages through GET /api/widgetTypes, then loads
 * details per row and keeps `descriptor.runtime === 'react-1'` (the info
 * rows carry NO descriptor — the runtime filter is only decidable on the
 * details read). Picking one delivers a FULL copy (source included).
 *
 * Tier 2 从内置类型受限派生: lists the built-in registry fqns; picking one
 * fetches the descriptor by full fqn and delivers a RESTRICTED copy —
 * schema/defaultConfig/size survive, the TSX is a starter skeleton. The
 * honest-restriction Alert is ALWAYS visible in this mode (占位三态 rule:
 * the copy never implies the Angular source or future support comes along).
 */

import { useQuery } from '@tanstack/react-query';
import { Alert, Input, List, Modal, Segmented, Spin, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { WIDGET_REGISTRY } from '@/components/widgets/registry';
import {
  getWidgetTypeByFullFqn,
  getWidgetTypeById,
  getWidgetTypes,
} from '@/services/tb/widget-type';
import type { WidgetType, WidgetTypeDetails } from '@/types/tb/widget-type';
import type { WidgetEditorDialogProps } from '../dialog-host';
import type { WidgetEditorDoc } from '../draft-convert';
import { deriveFromBuiltinType, deriveFromReactType } from './derive';

export interface DeriveWidgetDialogPayload {
  /** delivers the derived draft built from the picked source type. */
  onConfirm: (draft: WidgetEditorDoc) => void;
}

type DeriveMode = 'custom' | 'builtin';

/** Page cap for the custom-type scan (500 rows is generous for a tenant). */
const MAX_PAGES = 5;

const BUILTIN_CHOICES = Object.entries(WIDGET_REGISTRY).map(([fqn, entry]) => ({
  fqn,
  label: entry.meta?.label ?? fqn,
}));

export function DeriveWidgetDialog({
  open,
  payload,
  onClose,
}: WidgetEditorDialogProps) {
  const { formatMessage } = useIntl();
  const typed = payload as DeriveWidgetDialogPayload | undefined;
  const [mode, setMode] = useState<DeriveMode>('custom');
  const [picked, setPicked] = useState<{
    key: string;
    fqn: string;
    name: string;
  } | null>(null);
  const [name, setName] = useState('');

  // Tier 1: paged listing, then per-row details to filter react-1.
  const customQuery = useQuery({
    queryKey: ['derive-custom-types'],
    enabled: open && mode === 'custom',
    staleTime: Infinity,
    queryFn: async (): Promise<WidgetTypeDetails[]> => {
      const infoRows: Array<{ id?: { id: string } }> = [];
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const pageData = await getWidgetTypes({ pageSize: 100, page });
        infoRows.push(
          ...pageData.data.filter((row) => typeof row.id?.id === 'string'),
        );
        if (!pageData.hasNext) {
          break;
        }
      }
      const details = await Promise.all(
        infoRows.map((row) => getWidgetTypeById(row.id!.id)),
      );
      return details.filter(
        (details_) => details_.descriptor?.runtime === 'react-1',
      );
    },
  });

  // Tier 2: fetch the built-in descriptor for the restricted skeleton.
  const builtinQuery = useQuery({
    queryKey: ['derive-builtin-type', picked?.fqn],
    enabled: open && mode === 'builtin' && picked !== null,
    staleTime: Infinity,
    queryFn: async (): Promise<WidgetType | null> => {
      if (!picked) {
        return null;
      }
      return getWidgetTypeByFullFqn(picked.fqn);
    },
  });

  const canConfirm =
    picked !== null &&
    name.trim().length > 0 &&
    (mode === 'custom' || builtinQuery.data !== null);

  const confirm = () => {
    if (!typed || !canConfirm || !picked) {
      return;
    }
    const newName = name.trim();
    if (mode === 'custom') {
      const source = (customQuery.data ?? []).find(
        (details) => (details.id?.id ?? '') === picked.key,
      );
      if (!source) {
        return;
      }
      typed.onConfirm(deriveFromReactType(source, newName));
    } else if (builtinQuery.data) {
      typed.onConfirm(deriveFromBuiltinType(builtinQuery.data, newName));
    }
    onClose();
  };

  const items = useMemo(() => {
    if (mode === 'custom') {
      return (customQuery.data ?? []).map((details) => ({
        key: details.id?.id ?? '',
        fqn: details.fqn ?? '',
        name: details.name ?? '',
      }));
    }
    return BUILTIN_CHOICES.map((choice) => ({
      key: choice.fqn,
      fqn: choice.fqn,
      name: choice.label,
    }));
  }, [mode, customQuery.data]);

  const picking = mode === 'custom' && customQuery.isFetching;

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'editor.widget.editor.dialog.derive.title',
        defaultMessage: 'Derive widget',
      })}
      okText={formatMessage({
        id: 'editor.widget.editor.dialog.derive.confirm',
        defaultMessage: 'Derive',
      })}
      okButtonProps={{ disabled: !canConfirm || picking }}
      onOk={confirm}
      onCancel={onClose}
      destroyOnHidden
      width={560}
      data-testid="widget-derive-dialog"
    >
      <Segmented
        block
        value={mode}
        onChange={(value) => {
          setMode(value as DeriveMode);
          setPicked(null);
          setName('');
        }}
        options={[
          {
            label: formatMessage({
              id: 'editor.widget.editor.dialog.derive.modeCustom',
              defaultMessage: 'From custom type',
            }),
            value: 'custom',
          },
          {
            label: formatMessage({
              id: 'editor.widget.editor.dialog.derive.modeBuiltin',
              defaultMessage: 'From built-in type',
            }),
            value: 'builtin',
          },
        ]}
        data-testid="widget-derive-mode"
        style={{ marginBottom: 12 }}
      />

      {mode === 'builtin' ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={formatMessage({
            id: 'editor.widget.editor.dialog.derive.builtinHint',
            defaultMessage:
              'Built-in types are Angular widgets: their source is unavailable. Only the Schema/defaultConfig/size skeleton is reused; the TSX uses the starter skeleton.',
          })}
        />
      ) : (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          {formatMessage({
            id: 'editor.widget.editor.dialog.derive.customHint',
            defaultMessage:
              'Pick a react-1 custom type; the source is copied in full to the new copy.',
          })}
        </Typography.Paragraph>
      )}

      {mode === 'custom' && customQuery.isPending ? (
        <Spin
          style={{ display: 'block', margin: '24px auto' }}
          tip={formatMessage({
            id: 'editor.widget.editor.dialog.derive.loading',
            defaultMessage: 'Loading type list…',
          })}
        >
          <div style={{ minHeight: 80 }} />
        </Spin>
      ) : mode === 'custom' && customQuery.error ? (
        <Alert
          type="error"
          showIcon
          message={`${formatMessage({
            id: 'editor.widget.editor.dialog.derive.loadFailed',
            defaultMessage: 'Loading the type list failed',
          })}: ${serverErrorText(customQuery.error)}`}
        />
      ) : items.length === 0 ? (
        <Typography.Text type="secondary">
          {formatMessage({
            id: 'editor.widget.editor.dialog.derive.empty',
            defaultMessage: 'No derivable react-1 custom types.',
          })}
        </Typography.Text>
      ) : (
        <List
          bordered
          size="small"
          style={{ maxHeight: 240, overflow: 'auto' }}
          dataSource={items}
          renderItem={(item) => (
            <List.Item
              onClick={() => {
                setPicked({
                  key: item.key,
                  fqn: item.fqn,
                  name: item.name,
                });
                setName(name.trim() ? name : `${item.name} (copy)`);
              }}
              style={{
                cursor: 'pointer',
                background:
                  picked?.key === item.key
                    ? 'var(--ant-color-primary-bg, rgba(22, 119, 255, 0.06))'
                    : undefined,
                paddingInline: 12,
              }}
              data-testid={`widget-derive-option-${item.fqn}`}
            >
              <Typography.Text strong>{item.name}</Typography.Text>
              <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                {item.fqn}
              </Typography.Text>
            </List.Item>
          )}
        />
      )}

      {mode === 'builtin' && picked && builtinQuery.isFetching ? (
        <Typography.Text type="secondary" style={{ marginTop: 8 }}>
          {formatMessage({
            id: 'editor.widget.editor.dialog.derive.loading',
            defaultMessage: 'Loading…',
          })}
        </Typography.Text>
      ) : null}

      <div style={{ marginTop: 12 }}>
        <Typography.Paragraph style={{ marginBottom: 4 }}>
          {formatMessage({
            id: 'editor.widget.editor.dialog.derive.name',
            defaultMessage: 'New type name',
          })}
        </Typography.Paragraph>
        <Input
          value={name}
          data-testid="widget-derive-name"
          onChange={(event) => setName(event.target.value)}
          placeholder={formatMessage({
            id: 'editor.widget.editor.dialog.derive.name',
            defaultMessage: 'New type name',
          })}
        />
      </div>
    </Modal>
  );
}
