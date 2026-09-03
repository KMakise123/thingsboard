/**
 * Basic-config renderer — the MECHANISM half of the §3.4 basic/advanced
 * switch (M7 wave K). The type declares a basic mode (registry meta or
 * react-1 descriptor, widget-meta.ts); its payload is either a
 * FormProperty[] rendered over the WHOLE widget config through the shared
 * FormPropertyForm (spread-preserving, so unknown config keys survive), or
 * a custom-component registry id taking over the entire form (the seam a
 * future scada-symbol basic editor would register against, spec example:
 * targetDevice + symbol pick + per-object binding).
 */
import { Typography } from 'antd';
import { useIntl } from 'react-intl';

import { FormPropertyForm } from '@/components/form-property/FormPropertyForm';
import { getCustomComponent } from '@/components/form-property/registry';
import { FormPropertyType } from '@/components/form-property/types';
import type { WidgetConfig } from '@/types/tb/widget';
import { patchWidgetConfig } from './panel-target';
import type { PanelSectionProps } from './section-data';
import type { BasicModeMeta } from './widget-meta';

export function BasicConfig({
  session,
  target,
  widget,
  basic,
}: PanelSectionProps & { basic: BasicModeMeta }) {
  const { formatMessage } = useIntl();

  if (basic.customComponent) {
    const Custom = getCustomComponent(basic.customComponent);
    if (!Custom) {
      return (
        <Typography.Text
          type="warning"
          data-testid="panel-basic-component-missing"
        >
          {formatMessage(
            {
              id: 'editor.dashboard.panel.basic.componentMissing',
              defaultMessage:
                'The basic-mode component "{id}" is not registered in this build.',
            },
            { id: basic.customComponent },
          )}
        </Typography.Text>
      );
    }
    const config = widget.config as unknown as Record<string, unknown>;
    return (
      <div data-testid="panel-basic-config">
        <Custom
          property={{
            id: 'basicMode',
            name: 'Basic mode',
            type: FormPropertyType.text,
            default: null,
          }}
          value={config}
          onChange={(next) =>
            patchWidgetConfig(
              session,
              target.widgetId,
              next as Partial<WidgetConfig>,
            )
          }
        />
      </div>
    );
  }

  if (basic.form) {
    return (
      <div data-testid="panel-basic-config">
        <FormPropertyForm
          properties={basic.form}
          value={widget.config as unknown as Record<string, unknown>}
          onChange={(next) =>
            patchWidgetConfig(
              session,
              target.widgetId,
              next as Partial<WidgetConfig>,
            )
          }
        />
      </div>
    );
  }

  return (
    <Typography.Text type="secondary" data-testid="panel-basic-empty">
      {formatMessage({
        id: 'editor.dashboard.panel.basic.empty',
        defaultMessage: 'This basic mode declares no editable fields.',
      })}
    </Typography.Text>
  );
}
