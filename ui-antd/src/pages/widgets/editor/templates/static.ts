/**
 * Starter template — Static card (ui-ngx bucket 5). A pure display card
 * driven entirely by its settings; datasources are optional (the function
 * datasource in defaultConfig only exists so the preview shows data flows
 * uniformly — the component ignores it).
 */
import {
  type FormProperty,
  FormPropertyType,
} from '@/components/form-property/types';
import type { WidgetEditorMeta } from '@/core/widget/types';
import type { WidgetStarterTemplate } from './index';

const settingsForm: FormProperty[] = [
  {
    id: 'text',
    name: 'Text',
    type: FormPropertyType.text,
    default: 'Hello ThingsBoard',
  },
  {
    id: 'textColor',
    name: 'Text color',
    type: FormPropertyType.color,
    default: '#1677ff',
  },
  {
    id: 'fontSize',
    name: 'Font size (px)',
    type: FormPropertyType.number,
    default: 18,
    min: 10,
    max: 48,
  },
];

const defaultConfig = {
  title: 'Static card',
  showTitle: true,
  settings: {
    text: 'Hello ThingsBoard',
    textColor: '#1677ff',
    fontSize: 18,
  },
  datasources: [
    {
      type: 'function',
      name: 'sample',
      dataKeys: [
        {
          name: 'heartbeat',
          type: 'function',
          label: 'Heartbeat',
          color: '#1677ff',
          funcBody:
            'var v = prevValue ?? 50; return Math.round(v + (Math.random() * 10 - 5));',
        },
      ],
    },
  ],
};

const tsx = [
  "import type { CustomWidgetProps } from '@/core/widget/types';",
  '',
  'export default function StaticCardWidget(props: CustomWidgetProps) {',
  '  const settings = props.settings;',
  '  return (',
  '    <div className="static-card">',
  '      <div',
  '        className="static-card__text"',
  '        style={{',
  '          color:',
  "            typeof settings.textColor === 'string' ? settings.textColor : undefined,",
  '          fontSize:',
  "            typeof settings.fontSize === 'number' ? settings.fontSize : undefined,",
  '        }}',
  '      >',
  "        {String(settings.text || 'Static card')}",
  '      </div>',
  '    </div>',
  '  );',
  '}',
].join('\n');

const css = [
  '.static-card {',
  '  height: 100%;',
  '  display: flex;',
  '  align-items: center;',
  '  justify-content: center;',
  '  padding: 12px;',
  '  box-sizing: border-box;',
  '}',
  '.static-card__text {',
  '  font-weight: 600;',
  '  text-align: center;',
  '  word-break: break-word;',
  '}',
].join('\n');

export const staticStarter: WidgetStarterTemplate = {
  kind: 'static',
  tsx,
  css,
  settingsForm,
  defaultConfig: JSON.stringify(defaultConfig, null, 2),
  meta: {
    type: 'static',
    sizeX: 4,
    sizeY: 3,
    typeParameters: {
      datasourcesOptional: true,
      dataKeysOptional: true,
    },
  } satisfies WidgetEditorMeta,
};
