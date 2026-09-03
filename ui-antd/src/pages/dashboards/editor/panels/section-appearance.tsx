/**
 * Appearance section (spec §3.4 slot 2): appearance data settings
 * (units / decimals / no-data message) + the widget ADVANCED settings —
 * the old Settings/Advanced tabs folded in here, rendered through the
 * shared FormPropertyForm from the type's settings schema (ADR 0004).
 *
 * Schema source precedence (widget-meta.ts): registry meta.settingsSchema →
 * probed react-1 descriptor settingsForm → honest empty state (占位三态:
 * the text states the absence plainly, never "coming soon").
 */

import { useQuery } from '@tanstack/react-query';
import { Spin, Typography } from 'antd';
import { useIntl } from 'react-intl';

import { FormPropertyForm } from '@/components/form-property/FormPropertyForm';
import { builtinWidgetEntry } from '@/components/widgets/registry';
import { getWidgetTypeByFqn } from '@/services/tb/dashboard';
import { PanelNumber, PanelRow, UndoSafeInput } from './panel-fields';
import { cfgStrOr, patchWidgetConfig } from './panel-target';
import type { PanelSectionProps } from './section-data';
import {
  settingsSchemaFromDigest,
  settingsSchemaFromMeta,
} from './widget-meta';

export function SectionAppearance({
  session,
  target,
  widget,
}: PanelSectionProps) {
  const { formatMessage } = useIntl();
  const config = widget.config ?? {};

  // Schema resolution: registry meta wins; otherwise probe the digest (same
  // ['widgetType', fqn] cache key the canvas WidgetContainer uses).
  const entry = builtinWidgetEntry(widget.typeFullFqn);
  const registrySchema = settingsSchemaFromMeta(entry?.meta);
  const probe = useQuery({
    queryKey: ['widgetType', widget.typeFullFqn],
    queryFn: () => getWidgetTypeByFqn(widget.typeFullFqn),
    enabled: !registrySchema,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
  const settingsSchema = registrySchema ?? settingsSchemaFromDigest(probe.data);

  return (
    <div data-testid="panel-section-appearance">
      <Typography.Text strong style={{ fontSize: 12 }}>
        {formatMessage({
          id: 'editor.dashboard.panel.appearance.dataSettings',
          defaultMessage: 'Data settings',
        })}
      </Typography.Text>
      <PanelRow
        label={formatMessage({
          id: 'editor.dashboard.panel.appearance.units',
          defaultMessage: 'Units',
        })}
      >
        <UndoSafeInput
          value={config.units ?? ''}
          onEdit={(next) =>
            patchWidgetConfig(session, target.widgetId, {
              units: next === '' ? undefined : next,
            })
          }
          testId="panel-units"
        />
      </PanelRow>
      <PanelRow
        label={formatMessage({
          id: 'editor.dashboard.panel.appearance.decimals',
          defaultMessage: 'Decimals',
        })}
      >
        <PanelNumber
          value={config.decimals}
          min={0}
          max={15}
          onEdit={(next) =>
            patchWidgetConfig(session, target.widgetId, {
              decimals: next ?? undefined,
            })
          }
          testId="panel-decimals"
        />
      </PanelRow>
      <PanelRow
        label={formatMessage({
          id: 'editor.dashboard.panel.appearance.noDataMessage',
          defaultMessage: 'No-data message',
        })}
      >
        <UndoSafeInput
          value={cfgStrOr(config, 'noDataDisplayMessage', '')}
          onEdit={(next) =>
            patchWidgetConfig(session, target.widgetId, {
              noDataDisplayMessage: next === '' ? undefined : next,
            })
          }
          testId="panel-no-data-message"
        />
      </PanelRow>

      <Typography.Text strong style={{ fontSize: 12 }}>
        {formatMessage({
          id: 'editor.dashboard.panel.appearance.advanced',
          defaultMessage: 'Advanced settings',
        })}
      </Typography.Text>
      {settingsSchema ? (
        <FormPropertyForm
          properties={settingsSchema}
          value={(config.settings ?? {}) as Record<string, unknown>}
          onChange={(next) =>
            patchWidgetConfig(session, target.widgetId, {
              settings: next,
            })
          }
        />
      ) : probe.isPending ? (
        <Spin size="small" style={{ display: 'block', margin: '12px auto' }} />
      ) : (
        <Typography.Text
          type="secondary"
          data-testid="panel-settings-empty"
          style={{ display: 'block', marginTop: 4 }}
        >
          {formatMessage({
            id: 'editor.dashboard.panel.appearance.noSchema',
            defaultMessage:
              'This widget type does not declare a configurable settings schema.',
          })}
        </Typography.Text>
      )}
    </div>
  );
}
