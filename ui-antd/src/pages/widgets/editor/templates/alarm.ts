/**
 * Starter template — Alarm status card (ui-ngx bucket 4). The fork runtime
 * contract is data-driven (`props.data` / `props.latestData` — the capped
 * CustomWidgetProps carries no alarm rows), so the card renders alarm-ish
 * series (e.g. an alarm-count function key) into a severity status card;
 * tolerates empty data (smoke render).
 */
import {
  type FormProperty,
  FormPropertyType,
} from '@/components/form-property/types';
import type { WidgetEditorMeta } from '@/core/widget/types';
import type { WidgetStarterTemplate } from './index';

const settingsForm: FormProperty[] = [
  {
    id: 'warnThreshold',
    name: 'Warning threshold',
    type: FormPropertyType.number,
    default: 3,
    min: 1,
  },
  {
    id: 'criticalThreshold',
    name: 'Critical threshold',
    type: FormPropertyType.number,
    default: 8,
    min: 1,
  },
];

const defaultConfig = {
  title: 'Alarm status',
  showTitle: true,
  settings: {
    warnThreshold: 3,
    criticalThreshold: 8,
  },
  datasources: [
    {
      type: 'function',
      name: 'sample',
      dataKeys: [
        {
          name: 'alarmCount',
          type: 'function',
          label: 'Active alarms',
          color: '#ff4d4f',
          funcBody:
            'var v = prevValue ?? 0; var next = v + (Math.random() < 0.45 ? 1 : -1); return Math.min(12, Math.max(0, next));',
        },
      ],
    },
  ],
};

const tsx = [
  "import { antd } from 'widget-kit';",
  "import type { CustomWidgetProps } from '@/core/widget/types';",
  '',
  'export default function AlarmStatusWidget(props: CustomWidgetProps) {',
  '  const seriesEntries = Object.entries(props.latestData).length',
  '    ? Object.entries(props.latestData)',
  '    : Object.entries(props.data);',
  '  if (seriesEntries.length === 0) {',
  '    return <div className="alarm-card alarm-card--empty">No alarm data yet</div>;',
  '  }',
  '  const settings = props.settings;',
  '  const warn = typeof settings.warnThreshold === "number" ? settings.warnThreshold : 3;',
  '  const critical = typeof settings.criticalThreshold === "number" ? settings.criticalThreshold : 8;',
  '  return (',
  '    <div className="alarm-card">',
  '      {seriesEntries.map(([key, series]) => {',
  '        const latest = series.length ? series[series.length - 1] : null;',
  '        const count = latest ? Number(latest[1]) : 0;',
  '        const severity = count >= critical ? "critical" : count >= warn ? "warning" : "healthy";',
  '        const dataKey = props.config.datasources?.[0]?.dataKeys?.find(',
  '          (candidate) => candidate.name === key,',
  '        );',
  '        return (',
  '          <div key={key} className={"alarm-card__row alarm-card__row--" + severity}>',
  '            <span className="alarm-card__label">{(dataKey && dataKey.label) || key}</span>',
  '            <span className="alarm-card__count">{count}</span>',
  '            <antd.Tag color={severity === "critical" ? "red" : severity === "warning" ? "orange" : "green"}>',
  '              {severity.toUpperCase()}',
  '            </antd.Tag>',
  '          </div>',
  '        );',
  '      })}',
  '    </div>',
  '  );',
  '}',
].join('\n');

const css = [
  '.alarm-card {',
  '  height: 100%;',
  '  display: flex;',
  '  flex-direction: column;',
  '  gap: 8px;',
  '  justify-content: center;',
  '  padding: 8px 12px;',
  '  box-sizing: border-box;',
  '}',
  '.alarm-card__row {',
  '  display: flex;',
  '  align-items: center;',
  '  gap: 12px;',
  '  padding: 8px 12px;',
  '  border-radius: 8px;',
  '  border: 1px solid rgba(0, 0, 0, 0.08);',
  '}',
  '.alarm-card__label {',
  '  flex: 1;',
  '  font-size: 13px;',
  '  opacity: 0.8;',
  '}',
  '.alarm-card__count {',
  '  font-size: 24px;',
  '  font-weight: 600;',
  '  font-variant-numeric: tabular-nums;',
  '}',
  '.alarm-card__row--critical {',
  '  background: rgba(255, 77, 79, 0.08);',
  '}',
  '.alarm-card__row--warning {',
  '  background: rgba(250, 173, 20, 0.08);',
  '}',
  '.alarm-card__row--healthy {',
  '  background: rgba(82, 196, 26, 0.08);',
  '}',
  '.alarm-card--empty {',
  '  align-items: center;',
  '  justify-content: center;',
  '  opacity: 0.72;',
  '}',
].join('\n');

export const alarmStarter: WidgetStarterTemplate = {
  kind: 'alarm',
  tsx,
  css,
  settingsForm,
  defaultConfig: JSON.stringify(defaultConfig, null, 2),
  meta: {
    type: 'alarm',
    sizeX: 6,
    sizeY: 4,
  } satisfies WidgetEditorMeta,
};
