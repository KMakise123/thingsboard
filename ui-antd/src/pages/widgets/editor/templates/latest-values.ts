/**
 * Starter template — Latest values (ui-ngx select-widget-type bucket 1).
 * Static asset owned by the widget editor (the upstream `getWidgetTemplate`
 * system templates are Angular widgets and are NOT reusable — ADR 0004 §4).
 *
 * The defaultConfig carries a `function` datasource with funcBody so the
 * editor preview has random data out of the box (§5.4 walkthrough); the
 * component tolerates EMPTY data (the save chain's smoke render mounts it
 * without any subscription).
 */
import {
  type FormProperty,
  FormPropertyType,
} from '@/components/form-property/types';
import type { WidgetEditorMeta } from '@/core/widget/types';
import type { WidgetStarterTemplate } from './index';

const settingsForm: FormProperty[] = [
  {
    id: 'units',
    name: 'Units',
    type: FormPropertyType.units,
    default: '',
  },
  {
    id: 'columns',
    name: 'Columns',
    type: FormPropertyType.number,
    default: 2,
    min: 1,
    max: 4,
  },
];

const defaultConfig = {
  title: 'Latest values',
  showTitle: true,
  settings: {
    units: '',
    columns: 2,
  },
  datasources: [
    {
      type: 'function',
      name: 'sample',
      dataKeys: [
        {
          name: 'temperature',
          type: 'function',
          label: 'Temperature',
          color: '#1677ff',
          units: '°C',
          funcBody:
            'var v = prevValue ?? 21.5; return +(v + (Math.random() * 2 - 1)).toFixed(1);',
        },
        {
          name: 'humidity',
          type: 'function',
          label: 'Humidity',
          color: '#52c41a',
          units: '%',
          funcBody:
            'var v = prevValue ?? 48; return Math.round(v + (Math.random() * 6 - 3));',
        },
      ],
    },
  ],
};

const tsx = [
  "import { antd } from 'widget-kit';",
  "import type { CustomWidgetProps } from '@/core/widget/types';",
  '',
  'export default function LatestValuesWidget(props: CustomWidgetProps) {',
  '  const settings = props.settings;',
  "  const columns = typeof settings.columns === 'number' ? settings.columns : 2;",
  '  const rows = Object.entries(props.latestData).length',
  '    ? Object.entries(props.latestData)',
  '    : Object.entries(props.data);',
  '  if (rows.length === 0) {',
  '    return (',
  '      <div className="latest-values latest-values--empty">',
  '        <antd.Empty image={antd.Empty.PRESENTED_IMAGE_SIMPLE} description="No data yet" />',
  '      </div>',
  '    );',
  '  }',
  '  return (',
  '    <div className="latest-values" style={{ columnCount: columns }}>',
  '      {rows.map(([key, series]) => {',
  '        const latest = series.length ? series[series.length - 1] : null;',
  '        const value = latest ? latest[1] : null;',
  '        const keySettings = props.config.datasources?.[0]?.dataKeys?.find(',
  '          (dataKey) => dataKey.name === key,',
  '        );',
  '        return (',
  '          <div key={key} className="latest-values__cell">',
  '            <div className="latest-values__label">',
  '              {(keySettings && keySettings.label) || key}',
  '            </div>',
  '            <div',
  '              className="latest-values__value"',
  '              style={{ color: (keySettings && keySettings.color) || undefined }}',
  '            >',
  '              {value === null ? "--" : String(value)}',
  '              <span className="latest-values__units">{settings.units || (keySettings && keySettings.units) || ""}</span>',
  '            </div>',
  '          </div>',
  '        );',
  '      })}',
  '    </div>',
  '  );',
  '}',
].join('\n');

const css = [
  '.latest-values {',
  '  display: flex;',
  '  flex-direction: column;',
  '  gap: 8px;',
  '  height: 100%;',
  '  overflow: auto;',
  '  padding: 8px;',
  '  box-sizing: border-box;',
  '}',
  '.latest-values__cell {',
  '  break-inside: avoid;',
  '  padding: 8px 12px;',
  '  border-radius: 8px;',
  '  background: rgba(22, 119, 255, 0.06);',
  '}',
  '.latest-values__label {',
  '  font-size: 12px;',
  '  opacity: 0.72;',
  '}',
  '.latest-values__value {',
  '  font-size: 22px;',
  '  font-weight: 600;',
  '  font-variant-numeric: tabular-nums;',
  '}',
  '.latest-values__units {',
  '  margin-left: 4px;',
  '  font-size: 12px;',
  '  font-weight: 400;',
  '  opacity: 0.72;',
  '}',
  '.latest-values--empty {',
  '  align-items: center;',
  '  justify-content: center;',
  '}',
].join('\n');

export const latestValuesStarter: WidgetStarterTemplate = {
  kind: 'latest',
  tsx,
  css,
  settingsForm,
  defaultConfig: JSON.stringify(defaultConfig, null, 2),
  meta: {
    type: 'latest',
    sizeX: 4,
    sizeY: 3,
  } satisfies WidgetEditorMeta,
};
