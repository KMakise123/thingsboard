/**
 * Actions section (spec §3.4 slot 4): widget actions per action source.
 * ui-ngx parity subset — `config.actions` is the wire map
 * {actionSourceId: WidgetActionDescriptor[]}; sources come from the type
 * metadata (registry meta.actionSources, default headerButton per ui-ngx
 * widgetActionSources). Per action: name, type (ui-ngx WidgetActionType
 * subset), icon, customFunction body for the custom* types.
 */
import { Button, Select, Typography } from 'antd';
import { useId } from 'react';
import { useIntl } from 'react-intl';

import { builtinWidgetEntry } from '@/components/widgets/registry';
import { UndoSafeInput, UndoSafeTextArea } from './panel-fields';
import { patchWidgetConfig } from './panel-target';
import type { PanelSectionProps } from './section-data';
import { actionSourcesFromMeta } from './widget-meta';

/** ui-ngx WidgetActionType subset editable in the panel (M7 scope). */
const ACTION_TYPES = [
  'doNothing',
  'openDashboardState',
  'updateDashboardState',
  'openDashboard',
  'openURL',
  'custom',
  'customPretty',
] as const;

type ActionType = (typeof ACTION_TYPES)[number];

/** Wire descriptor subset (ui-ngx WidgetActionDescriptor, passthrough map). */
interface ActionDescriptor {
  id: string;
  name?: string;
  type: ActionType;
  icon?: string;
  customFunction?: string;
  [key: string]: unknown;
}

function newActionId(): string {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `action-${Math.random().toString(36).slice(2)}`;
}

export function SectionActions({ session, target, widget }: PanelSectionProps) {
  const { formatMessage } = useIntl();
  const baseId = useId();

  const sources = actionSourcesFromMeta(
    builtinWidgetEntry(widget.typeFullFqn)?.meta,
  );

  const config = widget.config ?? {};
  const actionsMap = (config.actions ?? {}) as Record<
    string,
    ActionDescriptor[]
  >;

  const writeMap = (next: Record<string, ActionDescriptor[]>) =>
    patchWidgetConfig(session, target.widgetId, { actions: next });

  const addAction = (sourceId: string) => {
    const descriptor: ActionDescriptor = {
      id: newActionId(),
      name: formatMessage({
        id: 'editor.dashboard.panel.actions.newAction',
        defaultMessage: 'New action',
      }),
      type: 'doNothing',
    };
    writeMap({
      ...actionsMap,
      [sourceId]: [...(actionsMap[sourceId] ?? []), descriptor],
    });
  };

  const patchAction = (
    sourceId: string,
    index: number,
    patch: Partial<ActionDescriptor>,
  ) => {
    writeMap({
      ...actionsMap,
      [sourceId]: (actionsMap[sourceId] ?? []).map((action, i) =>
        i === index ? { ...action, ...patch } : action,
      ),
    });
  };

  const removeAction = (sourceId: string, index: number) => {
    writeMap({
      ...actionsMap,
      [sourceId]: (actionsMap[sourceId] ?? []).filter((_, i) => i !== index),
    });
  };

  const typeOptions = ACTION_TYPES.map((type) => ({
    value: type,
    label: type,
  }));

  return (
    <div data-testid="panel-section-actions">
      {sources.map((source) => (
        <div
          key={source.id}
          data-testid={`panel-actions-${source.id}`}
          style={{ marginBottom: 12 }}
        >
          <Typography.Text strong style={{ fontSize: 12 }}>
            {source.name}
          </Typography.Text>
          {(actionsMap[source.id] ?? []).map((action, index) => {
            const itemPrefix = `panel-actions-${source.id}-${index}`;
            return (
              <div
                key={`${baseId}-${action.id ?? index}`}
                style={{
                  border: '1px solid rgba(128,128,128,0.25)',
                  borderRadius: 6,
                  padding: 6,
                  marginTop: 6,
                }}
                data-testid={itemPrefix}
              >
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <UndoSafeInput
                    value={action.name ?? ''}
                    onEdit={(next) =>
                      patchAction(source.id, index, { name: next })
                    }
                    testId={`${itemPrefix}-name`}
                    placeholder={formatMessage({
                      id: 'editor.dashboard.panel.actions.name',
                      defaultMessage: 'Action name',
                    })}
                  />
                  <Select<ActionType>
                    size="small"
                    style={{ minWidth: 132 }}
                    value={action.type ?? 'doNothing'}
                    options={typeOptions}
                    data-testid={`${itemPrefix}-type`}
                    onChange={(next) =>
                      patchAction(source.id, index, { type: next })
                    }
                  />
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon="✕"
                    aria-label="Remove action"
                    data-testid={`${itemPrefix}-remove`}
                    onClick={() => removeAction(source.id, index)}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 4,
                    alignItems: 'center',
                    marginTop: 4,
                  }}
                >
                  <UndoSafeInput
                    value={action.icon ?? ''}
                    onEdit={(next) =>
                      patchAction(source.id, index, { icon: next })
                    }
                    testId={`${itemPrefix}-icon`}
                    placeholder={formatMessage({
                      id: 'editor.dashboard.panel.actions.icon',
                      defaultMessage: 'Icon',
                    })}
                  />
                </div>
                {action.type === 'custom' || action.type === 'customPretty' ? (
                  <div style={{ marginTop: 4 }}>
                    <UndoSafeTextArea
                      value={action.customFunction ?? ''}
                      onEdit={(next) =>
                        patchAction(source.id, index, { customFunction: next })
                      }
                      testId={`${itemPrefix}-custom-fn`}
                      rows={4}
                      placeholder={formatMessage({
                        id: 'editor.dashboard.panel.actions.customFunction',
                        defaultMessage: 'Custom function body',
                      })}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
          <Button
            size="small"
            type="dashed"
            block
            style={{ marginTop: 6 }}
            data-testid={`panel-actions-${source.id}-add`}
            onClick={() => addAction(source.id)}
          >
            {formatMessage({
              id: 'editor.dashboard.panel.add',
              defaultMessage: 'Add',
            })}
          </Button>
        </div>
      ))}
    </div>
  );
}
