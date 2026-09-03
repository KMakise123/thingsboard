/**
 * WidgetConfigPanel — the five-section widget configuration panel (M7 wave
 * K, spec §3.4 advanced mode; header order Data / Appearance / Widget card
 * / Actions / Layout per ui-ngx widget-config.component.ts:333-372).
 *
 * Checkpoint contract (spec §3.9): opening the panel for a widget takes
 * `session.checkpoint('panel:<id>')`; the explicit 取消 button rolls every
 * post-open panel write back as ONE group, then closes. Closing any other
 * way (完成 / header ✕ / Esc / selecting another widget) KEEPS the changes:
 *
 *   ADR-mandated deviation from ui-ngx — ui-ngx edits a detached
 *   editingWidget copy and requires an explicit Apply to land it; ADR 0004
 *   rejected that model. Here every section edits the MAIN draft
 *   continuously (WYSIWYG — the canvas re-renders live from
 *   session.current, there is no local copy and no apply step), so a
 *   rollback can only be expressed as the open-checkpoint, and only the
 *   explicit 取消 fires it.
 *
 * Panel-triggered dialogs (single-alias create/edit, filters) render
 * through a panel-local DialogHost with their frozen payloads
 * ({aliasId?, onSaved?}); the dialog bodies themselves are P-wave files.
 */

import { useQuery } from '@tanstack/react-query';
import { Button, Empty, Segmented, Space, Typography } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

import { builtinWidgetEntry } from '@/components/widgets/registry';
import type { EditorSession } from '@/core/editor/session';
import { useEditorSession } from '@/core/editor/use-editor-session';
import { getWidgetTypeByFqn } from '@/services/tb/dashboard';
import type { DashboardConfiguration } from '@/types/tb/dashboard';
import { DialogHost, useEditorDialogs } from '../dialogs/host';
import { BasicConfig } from './basic-config';
import { patchWidgetConfig, resolvePanelTarget } from './panel-target';
import { SectionActions } from './section-actions';
import { SectionAppearance } from './section-appearance';
import { SectionData } from './section-data';
import { SectionLayout } from './section-layout';
import { SectionWidgetCard } from './section-widget-card';
import { basicModeFromDigest, basicModeFromMeta } from './widget-meta';

export interface WidgetConfigPanelProps {
  session: EditorSession<DashboardConfiguration>;
  /** Selected widget id, null = nothing selected (panel shows the hint). */
  widgetId: string | null;
  onClose: () => void;
}

export type PanelSectionId =
  | 'data'
  | 'appearance'
  | 'card'
  | 'actions'
  | 'layout';

/** ui-ngx header order (widget-config.component.ts buildHeader). */
const SECTION_ORDER: PanelSectionId[] = [
  'data',
  'appearance',
  'card',
  'actions',
  'layout',
];

export function WidgetConfigPanel({
  session,
  widgetId,
  onClose,
}: WidgetConfigPanelProps) {
  const { formatMessage } = useIntl();
  const snapshot = useEditorSession(session);
  const configuration = snapshot.current;
  const dialogs = useEditorDialogs();

  const target = useMemo(
    () => (widgetId ? resolvePanelTarget(configuration, widgetId) : null),
    [configuration, widgetId],
  );
  const widget = widgetId ? configuration.widgets[widgetId] : undefined;

  const [section, setSection] = useState<PanelSectionId>('data');
  // Reset to Data when the selection changes — the documented "adjust state
  // when a prop changes" render pattern (same paint, no effect needed).
  const [prevWidgetId, setPrevWidgetId] = useState(widgetId);
  if (prevWidgetId !== widgetId) {
    setPrevWidgetId(widgetId);
    setSection('data');
  }

  // §3.9 checkpoint: taken exactly when the panel opens for a widget,
  // BEFORE any panel write can happen.
  const checkpointRef = useRef<{ rollback: () => void } | null>(null);
  useEffect(() => {
    checkpointRef.current = widgetId
      ? { rollback: session.checkpoint(`panel:${widgetId}`).rollback }
      : null;
    return () => {
      checkpointRef.current = null;
    };
  }, [widgetId, session]);

  // Basic-mode declaration: registry meta first, then the react-1 descriptor
  // probe (same ['widgetType', fqn] cache the canvas container fills).
  const entry = widget ? builtinWidgetEntry(widget.typeFullFqn) : undefined;
  const metaBasic = entry ? basicModeFromMeta(entry.meta) : null;
  const probe = useQuery({
    queryKey: ['widgetType', widget?.typeFullFqn ?? ''],
    queryFn: () => getWidgetTypeByFqn(widget?.typeFullFqn ?? ''),
    enabled: Boolean(widget) && !metaBasic,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
  const basicMode = widget
    ? (metaBasic ?? basicModeFromDigest(probe.data))
    : null;
  const configMode =
    widget?.config?.configMode === 'basic' && basicMode ? 'basic' : 'advanced';

  const onCancel = () => {
    checkpointRef.current?.rollback();
    checkpointRef.current = null;
    onClose();
  };

  if (!widgetId || !widget || !target) {
    return (
      <div
        data-testid="widget-config-panel"
        data-widget-id={widgetId ?? undefined}
        style={{ width: 320 }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={formatMessage({
            id: 'editor.dashboard.panel.placeholder',
            defaultMessage:
              'No widget selected: click a widget on the canvas to configure it.',
          })}
        />
      </div>
    );
  }

  const sectionProps = {
    session,
    configuration,
    target,
    widget,
    dialogs,
  };

  const sectionLabels: Record<PanelSectionId, string> = {
    data: formatMessage({
      id: 'editor.dashboard.panel.section.data',
      defaultMessage: 'Data',
    }),
    appearance: formatMessage({
      id: 'editor.dashboard.panel.section.appearance',
      defaultMessage: 'Appearance',
    }),
    card: formatMessage({
      id: 'editor.dashboard.panel.section.card',
      defaultMessage: 'Widget card',
    }),
    actions: formatMessage({
      id: 'editor.dashboard.panel.section.actions',
      defaultMessage: 'Actions',
    }),
    layout: formatMessage({
      id: 'editor.dashboard.panel.section.layout',
      defaultMessage: 'Layout',
    }),
  };

  return (
    <div
      data-testid="widget-config-panel"
      data-widget-id={widgetId}
      style={{
        width: 320,
        flex: '0 0 320px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxHeight: '100%',
        overflow: 'auto',
      }}
    >
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Space
          size={4}
          style={{ width: '100%', justifyContent: 'space-between' }}
        >
          <Typography.Text strong ellipsis style={{ maxWidth: 250 }}>
            {widget.typeFullFqn}
          </Typography.Text>
          <Button
            size="small"
            type="text"
            icon="✕"
            aria-label="Close panel"
            data-testid="panel-close"
            onClick={onClose}
          />
        </Space>
        {basicMode ? (
          <Segmented<'basic' | 'advanced'>
            size="small"
            block
            value={configMode}
            options={[
              {
                value: 'basic',
                label: formatMessage({
                  id: 'editor.dashboard.panel.mode.basic',
                  defaultMessage: 'Basic',
                }),
              },
              {
                value: 'advanced',
                label: formatMessage({
                  id: 'editor.dashboard.panel.mode.advanced',
                  defaultMessage: 'Advanced',
                }),
              },
            ]}
            data-testid="panel-basic-advanced"
            onChange={(next) =>
              patchWidgetConfig(session, widgetId, { configMode: next })
            }
          />
        ) : null}
        <Segmented<PanelSectionId>
          size="small"
          block
          value={section}
          options={SECTION_ORDER.map((id) => ({
            value: id,
            label: sectionLabels[id],
          }))}
          data-testid="panel-section-tabs"
          onChange={setSection}
        />
      </Space>

      {configMode === 'basic' && basicMode ? (
        <BasicConfig {...sectionProps} basic={basicMode} />
      ) : (
        <div style={{ flex: 1, minWidth: 0 }}>
          {section === 'data' && <SectionData {...sectionProps} />}
          {section === 'appearance' && <SectionAppearance {...sectionProps} />}
          {section === 'card' && <SectionWidgetCard {...sectionProps} />}
          {section === 'actions' && <SectionActions {...sectionProps} />}
          {section === 'layout' && <SectionLayout {...sectionProps} />}
        </div>
      )}

      <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
        <Button size="small" data-testid="panel-cancel" onClick={onCancel}>
          {formatMessage({
            id: 'editor.common.cancel',
            defaultMessage: 'Cancel',
          })}
        </Button>
        <Button
          size="small"
          type="primary"
          data-testid="panel-done"
          onClick={onClose}
        >
          {formatMessage({
            id: 'editor.dashboard.panel.done',
            defaultMessage: 'Done',
          })}
        </Button>
      </Space>

      <DialogHost controller={dialogs} />
    </div>
  );
}
