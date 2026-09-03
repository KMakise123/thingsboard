/**
 * Widget card section (spec §3.4 slot 3): title block (show/title/color/
 * tooltip/icon trio + titleStyle JSON) and the card style block (text/
 * background colors, padding, margin, border radius, drop shadow,
 * widgetStyle JSON, widgetCss extension) + card buttons (fullscreen).
 * Field set mirrors ui-ngx widget-config "widget-card" template; titleFont
 * needs a font-settings composite control and is a registered v1 gap.
 */
import { Collapse, Typography } from 'antd';
import { useIntl } from 'react-intl';

import {
  PanelColor,
  PanelJson,
  PanelRow,
  PanelSwitch,
  UndoSafeInput,
  UndoSafeTextArea,
} from './panel-fields';
import type { PanelSectionProps } from './section-data';
import { cfgStr, cfgStrOr, patchWidgetConfig } from './panel-target';

export function SectionWidgetCard({ session, target, widget }: PanelSectionProps) {
  const { formatMessage } = useIntl();
  const config = widget.config ?? {};
  const showTitle = config.showTitle === true;
  const showTitleIcon = showTitle && config.showTitleIcon === true;

  const patch = (values: Record<string, unknown>) =>
    patchWidgetConfig(session, target.widgetId, values);

  return (
    <div data-testid="panel-section-widget-card">
      <Typography.Text strong style={{ fontSize: 12 }}>
        {formatMessage({
          id: 'editor.dashboard.panel.card.title',
          defaultMessage: 'Title',
        })}
      </Typography.Text>
      <PanelSwitch
        label={formatMessage({
          id: 'editor.dashboard.panel.card.showTitle',
          defaultMessage: 'Display title',
        })}
        checked={showTitle}
        testId="panel-show-title"
        onEdit={(next) => patch({ showTitle: next })}
      />
      <PanelRow
        label={formatMessage({
          id: 'editor.dashboard.panel.card.titleLabel',
          defaultMessage: 'Title',
        })}
      >
        <UndoSafeInput
          value={config.title ?? ''}
          disabled={!showTitle}
          onEdit={(next) => patch({ title: next === '' ? undefined : next })}
          testId="panel-card-title"
        />
      </PanelRow>
      <PanelRow
        label={formatMessage({
          id: 'editor.dashboard.panel.card.titleColor',
          defaultMessage: 'Title color',
        })}
      >
        <PanelColor
          value={cfgStr(config, 'titleColor')}
          disabled={!showTitle}
          onEdit={(next) => patch({ titleColor: next })}
          testId="panel-title-color"
        />
      </PanelRow>
      <PanelRow
        label={formatMessage({
          id: 'editor.dashboard.panel.card.titleTooltip',
          defaultMessage: 'Title tooltip',
        })}
      >
        <UndoSafeInput
          value={cfgStrOr(config, 'titleTooltip', '')}
          disabled={!showTitle}
          onEdit={(next) =>
            patch({ titleTooltip: next === '' ? undefined : next })
          }
          testId="panel-title-tooltip"
        />
      </PanelRow>
      <PanelSwitch
        label={formatMessage({
          id: 'editor.dashboard.panel.card.showTitleIcon',
          defaultMessage: 'Display icon',
        })}
        checked={config.showTitleIcon === true}
        disabled={!showTitle}
        testId="panel-show-title-icon"
        onEdit={(next) => patch({ showTitleIcon: next })}
      />
      <PanelRow
        label={formatMessage({
          id: 'editor.dashboard.panel.card.titleIcon',
          defaultMessage: 'Icon',
        })}
      >
        <UndoSafeInput
          value={cfgStrOr(config, 'titleIcon', '')}
          disabled={!showTitleIcon}
          onEdit={(next) =>
            patch({ titleIcon: next === '' ? undefined : next })
          }
          testId="panel-title-icon"
        />
      </PanelRow>
      <PanelRow
        label={formatMessage({
          id: 'editor.dashboard.panel.card.iconColor',
          defaultMessage: 'Icon color',
        })}
      >
        <PanelColor
          value={cfgStr(config, 'iconColor')}
          onEdit={(next) => patch({ iconColor: next })}
          testId="panel-icon-color"
        />
      </PanelRow>
      <PanelRow
        label={formatMessage({
          id: 'editor.dashboard.panel.card.iconSize',
          defaultMessage: 'Icon size',
        })}
      >
        <UndoSafeInput
          value={cfgStrOr(config, 'iconSize', '')}
          disabled={!showTitleIcon}
          onEdit={(next) =>
            patch({ iconSize: next === '' ? undefined : next })
          }
          testId="panel-icon-size"
        />
      </PanelRow>

      <Typography.Text strong style={{ fontSize: 12 }}>
        {formatMessage({
          id: 'editor.dashboard.panel.card.style',
          defaultMessage: 'Card style',
        })}
      </Typography.Text>
      <PanelRow
        label={formatMessage({
          id: 'editor.dashboard.panel.card.textColor',
          defaultMessage: 'Text color',
        })}
      >
        <PanelColor
          value={cfgStr(config, 'color')}
          onEdit={(next) => patch({ color: next })}
          testId="panel-text-color"
        />
      </PanelRow>
      <PanelRow
        label={formatMessage({
          id: 'editor.dashboard.panel.card.backgroundColor',
          defaultMessage: 'Background color',
        })}
      >
        <PanelColor
          value={cfgStr(config, 'backgroundColor')}
          onEdit={(next) => patch({ backgroundColor: next })}
          testId="panel-background-color"
        />
      </PanelRow>
      <PanelRow
        label={formatMessage({
          id: 'editor.dashboard.panel.card.padding',
          defaultMessage: 'Padding',
        })}
      >
        <UndoSafeInput
          value={cfgStrOr(config, 'padding', '')}
          onEdit={(next) => patch({ padding: next === '' ? undefined : next })}
          testId="panel-padding"
        />
      </PanelRow>
      <PanelRow
        label={formatMessage({
          id: 'editor.dashboard.panel.card.margin',
          defaultMessage: 'Margin',
        })}
      >
        <UndoSafeInput
          value={cfgStrOr(config, 'margin', '')}
          onEdit={(next) => patch({ margin: next === '' ? undefined : next })}
          testId="panel-margin"
        />
      </PanelRow>
      <PanelRow
        label={formatMessage({
          id: 'editor.dashboard.panel.card.borderRadius',
          defaultMessage: 'Border radius',
        })}
      >
        <UndoSafeInput
          value={cfgStrOr(config, 'borderRadius', '')}
          onEdit={(next) =>
            patch({ borderRadius: next === '' ? undefined : next })
          }
          testId="panel-border-radius"
        />
      </PanelRow>
      <PanelSwitch
        label={formatMessage({
          id: 'editor.dashboard.panel.card.dropShadow',
          defaultMessage: 'Drop shadow',
        })}
        checked={config.dropShadow !== false}
        testId="panel-drop-shadow"
        onEdit={(next) => patch({ dropShadow: next })}
      />
      <PanelSwitch
        label={formatMessage({
          id: 'editor.dashboard.panel.card.enableFullscreen',
          defaultMessage: 'Enable fullscreen',
        })}
        checked={config.enableFullscreen !== false}
        testId="panel-enable-fullscreen"
        onEdit={(next) => patch({ enableFullscreen: next })}
      />
      <Collapse
        ghost
        size="small"
        items={[
          {
            key: 'advanced-style',
            label: formatMessage({
              id: 'editor.dashboard.panel.card.advancedStyle',
              defaultMessage: 'Advanced widget style',
            }),
            children: (
              <>
                <PanelJson
                  value={config.widgetStyle ?? {}}
                  onEdit={(next) => patch({ widgetStyle: next })}
                  testIdPrefix="panel-widget-style"
                />
                <PanelRow
                  label={formatMessage({
                    id: 'editor.dashboard.panel.card.widgetCss',
                    defaultMessage: 'Widget CSS',
                  })}
                >
                  <UndoSafeTextArea
                    value={cfgStrOr(config, 'widgetCss', '')}
                    onEdit={(next) =>
                      patch({ widgetCss: next === '' ? undefined : next })
                    }
                    testId="panel-widget-css"
                    rows={4}
                  />
                </PanelRow>
              </>
            ),
          },
          {
            key: 'title-style',
            label: formatMessage({
              id: 'editor.dashboard.panel.card.advancedTitleStyle',
              defaultMessage: 'Advanced title style',
            }),
            children: (
              <PanelJson
                value={config.titleStyle ?? { fontSize: '16px', fontWeight: 400 }}
                onEdit={(next) => patch({ titleStyle: next })}
                testIdPrefix="panel-title-style"
              />
            ),
          },
        ]}
      />
    </div>
  );
}
