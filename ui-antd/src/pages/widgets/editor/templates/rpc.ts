/**
 * Starter template — RPC control button (ui-ngx bucket 3). Fires a two-way
 * RPC through the capped `props.rpc` handle and echoes the reply; without a
 * bound device it renders an honest hint. tolerates the smoke render (no
 * rpc handle attached there).
 */
import {
  type FormProperty,
  FormPropertyType,
} from '@/components/form-property/types';
import type { WidgetEditorMeta } from '@/core/widget/types';
import type { WidgetStarterTemplate } from './index';

const settingsForm: FormProperty[] = [
  {
    id: 'buttonLabel',
    name: 'Button label',
    type: FormPropertyType.text,
    default: 'Toggle device',
  },
  {
    id: 'methodName',
    name: 'RPC method',
    type: FormPropertyType.text,
    default: 'setState',
  },
];

const defaultConfig = {
  title: 'RPC control',
  showTitle: true,
  settings: {
    buttonLabel: 'Toggle device',
    methodName: 'setState',
  },
  targetDeviceAlias: null,
  datasources: [
    {
      type: 'function',
      name: 'sample',
      dataKeys: [
        {
          name: 'state',
          type: 'function',
          label: 'Device state',
          color: '#1677ff',
          funcBody:
            'var v = prevValue ?? 0; return Math.random() < 0.1 ? 1 - v : v;',
        },
      ],
    },
  ],
};

const tsx = [
  "import { useState } from 'react';",
  "import { antd } from 'widget-kit';",
  "import type { CustomWidgetProps } from '@/core/widget/types';",
  '',
  'export default function RpcButtonWidget(props: CustomWidgetProps) {',
  "  const [reply, setReply] = useState('');",
  '  const [busy, setBusy] = useState(false);',
  '  const send = async () => {',
  '    if (!props.rpc) {',
  '      setReply("No RPC handle bound (assign a target device).");',
  '      return;',
  '    }',
  '    setBusy(true);',
  '    try {',
  '      const method =',
  "        typeof props.settings.methodName === 'string' && props.settings.methodName",
  '          ? props.settings.methodName',
  "          : 'setState';",
  '      const response = await props.rpc.sendTwoWay(method, {',
  '        params: true,',
  '      });',
  '      setReply("Reply: " + JSON.stringify(response));',
  '      props.ctx.toast("Command accepted", "success");',
  '    } catch (error) {',
  '      setReply("Failed: " + (error instanceof Error ? error.message : String(error)));',
  '    } finally {',
  '      setBusy(false);',
  '    }',
  '  };',
  '  return (',
  '    <div className="rpc-button">',
  '      <antd.Button',
  '        type="primary"',
  '        size="large"',
  '        loading={busy}',
  '        onClick={() => {',
  '          void send();',
  '        }}',
  '      >',
  '        {String(props.settings.buttonLabel || "Send command")}',
  '      </antd.Button>',
  '      {reply ? <div className="rpc-button__reply">{reply}</div> : null}',
  '    </div>',
  '  );',
  '}',
].join('\n');

const css = [
  '.rpc-button {',
  '  height: 100%;',
  '  display: flex;',
  '  flex-direction: column;',
  '  gap: 8px;',
  '  align-items: center;',
  '  justify-content: center;',
  '  padding: 8px;',
  '  box-sizing: border-box;',
  '}',
  '.rpc-button__reply {',
  '  font-size: 12px;',
  '  opacity: 0.72;',
  '  max-width: 100%;',
  '  overflow: hidden;',
  '  text-overflow: ellipsis;',
  '  white-space: nowrap;',
  '}',
].join('\n');

export const rpcStarter: WidgetStarterTemplate = {
  kind: 'rpc',
  tsx,
  css,
  settingsForm,
  defaultConfig: JSON.stringify(defaultConfig, null, 2),
  meta: {
    type: 'rpc',
    sizeX: 4,
    sizeY: 3,
    typeParameters: {
      maxDatasources: 1,
      datasourcesOptional: true,
      targetDeviceOptional: false,
    },
    actionSources: {
      headerButton: {
        name: 'widget-action.header-button',
        value: 'headerButton',
        multiple: true,
      },
    },
  } satisfies WidgetEditorMeta,
};
