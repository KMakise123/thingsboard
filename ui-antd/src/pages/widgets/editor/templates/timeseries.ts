/**
 * Starter template — Timeseries line chart (ui-ngx bucket 2). Renders the
 * `props.data` series through the widget-kit recharts facade; tolerates
 * empty data (smoke render). Function datasource ships in defaultConfig
 * (preview random data out of the box).
 */
import {
  type FormProperty,
  FormPropertyType,
} from '@/components/form-property/types';
import type { WidgetEditorMeta } from '@/core/widget/types';
import type { WidgetStarterTemplate } from './index';

const settingsForm: FormProperty[] = [
  {
    id: 'lineColor',
    name: 'Line color',
    type: FormPropertyType.color,
    default: '#1677ff',
  },
  {
    id: 'showDots',
    name: 'Show dots',
    type: FormPropertyType.switch,
    default: false,
  },
];

const defaultConfig = {
  title: 'Timeseries',
  showTitle: true,
  settings: {
    lineColor: '#1677ff',
    showDots: false,
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
          name: 'pressure',
          type: 'function',
          label: 'Pressure',
          color: '#faad14',
          units: 'hPa',
          funcBody:
            'var v = prevValue ?? 1013; return +(v + (Math.random() * 4 - 2)).toFixed(1);',
        },
      ],
    },
  ],
};

const tsx = [
  "import { recharts } from 'widget-kit';",
  "import type { CustomWidgetProps } from '@/core/widget/types';",
  '',
  'type Row = Record<string, number | string>;',
  '',
  'export default function TimeseriesWidget(props: CustomWidgetProps) {',
  '  const seriesEntries = Object.entries(props.data);',
  '  if (seriesEntries.length === 0) {',
  '    return (',
  '      <div className="ts-chart ts-chart--empty">Waiting for data…</div>',
  '    );',
  '  }',
  '  const length = Math.max(',
  '    ...seriesEntries.map(([, series]) => series.length),',
  '  );',
  '  const rows: Row[] = [];',
  '  for (let index = 0; index < length; index += 1) {',
  '    const row: Row = {};',
  '    for (const [key, series] of seriesEntries) {',
  '      const point = series[index];',
  '      if (point) {',
  '        row[key] = point[1] as number;',
  '        row.time = new Date(point[0] as number).toLocaleTimeString();',
  '      }',
  '    }',
  '    rows.push(row);',
  '  }',
  '  const settings = props.settings;',
  '  return (',
  '    <div className="ts-chart">',
  '      <recharts.ResponsiveContainer width="100%" height="100%">',
  '        <recharts.LineChart data={rows} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>',
  '          <recharts.CartesianGrid strokeDasharray="3 3" opacity={0.24} />',
  '          <recharts.XAxis dataKey="time" fontSize={11} />',
  '          <recharts.YAxis fontSize={11} domain={["auto", "auto"]} />',
  '          <recharts.Tooltip />',
  '          {seriesEntries.map(([key, series], index) => {',
  '            const dataKey = props.config.datasources?.[0]?.dataKeys?.find(',
  '              (candidate) => candidate.name === key,',
  '            );',
  '            return (',
  '              <recharts.Line',
  '                key={key}',
  '                type="monotone"',
  '                dot={Boolean(settings.showDots)}',
  '                dataKey={key}',
  '                name={(dataKey && dataKey.label) || key}',
  '                stroke={(index === 0 && settings.lineColor) || (dataKey && dataKey.color) || "#1677ff"}',
  '                strokeWidth={2}',
  '                isAnimationActive={false}',
  '              />',
  '            );',
  '          })}',
  '        </recharts.LineChart>',
  '      </recharts.ResponsiveContainer>',
  '    </div>',
  '  );',
  '}',
].join('\n');

const css = [
  '.ts-chart {',
  '  height: 100%;',
  '  width: 100%;',
  '  padding: 4px 8px 8px;',
  '  box-sizing: border-box;',
  '  display: flex;',
  '  align-items: center;',
  '  justify-content: center;',
  '  font-size: 13px;',
  '  opacity: 0.92;',
  '}',
].join('\n');

export const timeseriesStarter: WidgetStarterTemplate = {
  kind: 'timeseries',
  tsx,
  css,
  settingsForm,
  defaultConfig: JSON.stringify(defaultConfig, null, 2),
  meta: {
    type: 'timeseries',
    sizeX: 8,
    sizeY: 5,
  } satisfies WidgetEditorMeta,
};
