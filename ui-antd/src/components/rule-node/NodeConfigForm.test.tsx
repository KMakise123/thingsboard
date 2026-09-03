/**
 * NodeConfigForm contract tests (M8 brief §3 wave-2 K; props are FROZEN).
 * Fixtures are handwritten descriptors (no backend): each test pins one
 * pipeline behavior — generator + uiHints render, family field exclusion,
 * shallow-patch merge semantics, round-trip fidelity, disabled plumbing.
 *
 * Module boundaries mocked per house pattern: CodeEditor (CodeMirror) and
 * the services transport (tbelEnabled / testScript) — react-query needs a
 * QueryClientProvider.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import zhScript from '@/locales/zh-CN/editor-script';
import zhRuleNode from '@/locales/zh-CN/rule-node';
import type { RuleNodeComponentDescriptor } from '@/types/tb/rule-chain';
import { RULE_NODE_CLAZZES } from './clazzes';
import { NodeConfigForm, type NodeConfigFormProps } from './NodeConfigForm';

vi.mock('@/components/code-editor', () => ({
  CodeEditor: (props: {
    value?: string;
    onChange?: (next: string) => void;
    language?: string;
    readOnly?: boolean;
    'data-testid'?: string;
  }) => (
    <textarea
      data-testid={props['data-testid'] ?? 'code-editor'}
      data-language={props.language ?? ''}
      data-readonly={String(props.readOnly === true)}
      value={props.value ?? ''}
      onChange={(e) => props.onChange?.(e.target.value)}
    />
  ),
}));

type TestScriptParamsLike = {
  scriptType: string;
  argNames: string[];
  [key: string]: unknown;
};

const testRuleNodeScript = vi.fn<
  (
    params: TestScriptParamsLike,
    scriptLang: 'JS' | 'TBEL',
  ) => Promise<{ output: string; error: string }>
>(async () => ({ output: 'ok', error: '' }));
vi.mock('@/services/tb/rule-chain', () => ({
  getTbelEnabled: vi.fn(async () => true),
  testRuleNodeScript: (...args: unknown[]) =>
    testRuleNodeScript(...(args as Parameters<typeof testRuleNodeScript>)),
}));

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhScript, ...zhRuleNode },
});

function descriptor(
  clazz: string,
  defaultConfiguration: Record<string, unknown>,
): RuleNodeComponentDescriptor {
  return {
    type: 'ACTION',
    scope: 'TENANT',
    name: 'fixture',
    clazz,
    configurationDescriptor: {
      nodeDefinition: {
        details: '',
        description: '',
        inEnabled: true,
        outEnabled: true,
        relationTypes: [],
        defaultConfiguration,
        configDirective: '',
      },
    },
  };
}

function inputWithin(testId: string): HTMLInputElement {
  const el = screen.getByTestId(testId);
  if (el.tagName === 'INPUT') {
    return el as HTMLInputElement;
  }
  const input = el.querySelector('input');
  expect(input).not.toBeNull();
  return input as HTMLInputElement;
}

function setup(
  props: Omit<NodeConfigFormProps, 'descriptor'> & {
    descriptor: RuleNodeComponentDescriptor;
  },
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <RawIntlProvider value={intl}>
      <QueryClientProvider client={client}>
        <NodeConfigForm {...props} />
      </QueryClientProvider>
    </RawIntlProvider>,
  );
}

afterEach(() => {
  cleanup();
  testRuleNodeScript.mockClear();
  vi.clearAllMocks();
});

describe('NodeConfigForm — script family (log node)', () => {
  const logDescriptor = descriptor(RULE_NODE_CLAZZES.log, {
    scriptLang: 'TBEL',
    jsScript: 'return "js";',
    tbelScript: 'return "tbel";',
  });

  it('renders the family UI and excludes the family fields from the simple renderer', async () => {
    setup({
      descriptor: logDescriptor,
      configuration: { scriptLang: 'JS', jsScript: 'a;', tbelScript: 'b;' },
      onChange: vi.fn(),
    });
    await waitFor(() =>
      expect(screen.getByTestId('node-config-script')).not.toBeNull(),
    );
    expect(screen.getByTestId('node-config-script-editor-lang')).not.toBeNull();
    expect(screen.getByTestId('node-config-script-test-button')).not.toBeNull();
    // The family's fields never render as simple form properties.
    expect(screen.queryByTestId('form-property-scriptLang')).toBeNull();
    expect(screen.queryByTestId('form-property-jsScript')).toBeNull();
    expect(screen.queryByTestId('form-property-tbelScript')).toBeNull();
  });

  it('patches only the script fields and preserves unknown keys', async () => {
    const configuration = {
      scriptLang: 'JS',
      jsScript: 'a;',
      tbelScript: 'b;',
      futureField: { nested: 1 },
    };
    const onChange = vi.fn();
    setup({ descriptor: logDescriptor, configuration, onChange });
    await waitFor(() =>
      expect(
        screen
          .getByTestId('node-config-script-editor-editor')
          .getAttribute('data-language'),
      ).toBe('javascript'),
    );
    fireEvent.change(screen.getByTestId('node-config-script-editor-editor'), {
      target: { value: 'a2;' },
    });
    expect(onChange).toHaveBeenCalledWith({
      scriptLang: 'JS',
      jsScript: 'a2;',
      tbelScript: 'b;',
      futureField: { nested: 1 },
    });
  });

  it('runs the test through the services layer with the current scriptLang', async () => {
    const onChange = vi.fn();
    setup({
      descriptor: logDescriptor,
      configuration: { scriptLang: 'TBEL', jsScript: 'a;', tbelScript: 'b;' },
      onChange,
    });
    const button = await screen.findByTestId('node-config-script-test-button');
    fireEvent.click(button);
    await screen.findByTestId('node-config-script-test-panel-payload');
    fireEvent.click(screen.getByTestId('node-config-script-test-panel-run'));
    await waitFor(() => expect(testRuleNodeScript).toHaveBeenCalled());
    const [params, scriptLang] = testRuleNodeScript.mock.calls[0];
    expect(scriptLang).toBe('TBEL');
    expect(params.scriptType).toBe('string');
    expect(params.argNames).toEqual(['msg', 'metadata', 'msgType']);
    expect(
      screen.getByTestId('node-config-script-test-panel-output'),
    ).toHaveTextContent('ok');
  });

  it('uses the switch scriptType for the switch node and update for transform', async () => {
    const onChange = vi.fn();
    setup({
      descriptor: descriptor(RULE_NODE_CLAZZES.jsSwitch, {
        scriptLang: 'JS',
        jsScript: 's;',
        tbelScript: 's;',
      }),
      configuration: { scriptLang: 'JS', jsScript: 's;', tbelScript: 's;' },
      onChange,
    });
    fireEvent.click(
      await screen.findByTestId('node-config-script-test-button'),
    );
    await screen.findByTestId('node-config-script-test-panel-payload');
    fireEvent.click(screen.getByTestId('node-config-script-test-panel-run'));
    await waitFor(() => expect(testRuleNodeScript).toHaveBeenCalled());
    expect(testRuleNodeScript.mock.calls[0][0].scriptType).toBe('switch');

    cleanup();
    const transformDescriptor = descriptor(RULE_NODE_CLAZZES.transformMsg, {
      scriptLang: 'JS',
      jsScript: 't;',
      tbelScript: 't;',
    });
    setup({
      descriptor: transformDescriptor,
      configuration: { scriptLang: 'JS', jsScript: 't;', tbelScript: 't;' },
      onChange: vi.fn(),
    });
    fireEvent.click(
      await screen.findByTestId('node-config-script-test-button'),
    );
    await screen.findByTestId('node-config-script-test-panel-payload');
    fireEvent.click(screen.getByTestId('node-config-script-test-panel-run'));
    await waitFor(() => expect(testRuleNodeScript).toHaveBeenCalledTimes(2));
    expect(testRuleNodeScript.mock.calls[1][0].scriptType).toBe('update');
  });
});

describe('NodeConfigForm — generator (family last + simple fields)', () => {
  const generatorDescriptor = descriptor(RULE_NODE_CLAZZES.msgGenerator, {
    msgCount: 0,
    periodInSeconds: 1,
    originatorType: 'RULE_NODE',
    originatorId: null,
    scriptLang: 'TBEL',
    jsScript: 'g;',
    tbelScript: 'g;',
  });

  it('renders the simple fields from uiHints and places the family after them', async () => {
    setup({
      descriptor: generatorDescriptor,
      configuration: {
        ...generatorDescriptor.configurationDescriptor?.nodeDefinition
          .defaultConfiguration,
      },
      onChange: vi.fn(),
    });
    expect(screen.getByTestId('form-property-msgCount')).not.toBeNull();
    expect(screen.getByText('生成消息限制（0 - 无限）')).not.toBeNull();
    expect(screen.getByText('发起者类型')).not.toBeNull();
    const script = await screen.findByTestId('node-config-script');
    const simpleForm = screen.getByTestId('form-property-msgCount');
    // 'last' placement: the family section FOLLOWS the simple fields.
    expect(
      simpleForm.compareDocumentPosition(script) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('patches a simple field through the renderer without dropping family fields', async () => {
    const onChange = vi.fn();
    const configuration = {
      msgCount: 0,
      periodInSeconds: 1,
      originatorType: 'RULE_NODE',
      originatorId: null,
      scriptLang: 'TBEL',
      jsScript: 'g;',
      tbelScript: 'g;',
    };
    setup({ descriptor: generatorDescriptor, configuration, onChange });
    fireEvent.change(inputWithin('form-property-msgCount'), {
      target: { value: '5' },
    });
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const next = onChange.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(next.msgCount).toBe(5);
    expect(next.scriptLang).toBe('TBEL');
    expect(next.tbelScript).toBe('g;');
  });
});

describe('NodeConfigForm — key operations', () => {
  it('copy keys: source select + keys list patch their fields only', async () => {
    const onChange = vi.fn();
    const configuration = { copyFrom: 'DATA', keys: ['a'] };
    setup({
      descriptor: descriptor(RULE_NODE_CLAZZES.copyKeys, configuration),
      configuration,
      onChange,
    });
    expect(screen.getByTestId('node-config-key-ops-source')).not.toBeNull();
    // antd tags Select renders selected items as text
    expect(screen.getByText('a')).not.toBeNull();
    fireEvent.mouseDown(screen.getByTestId('node-config-key-ops-source'));
    fireEvent.click(await screen.findByTitle('元数据'));
    expect(onChange).toHaveBeenCalledWith({
      copyFrom: 'METADATA',
      keys: ['a'],
    });
  });

  it('rename keys: kv map editor patches renameKeysMapping', () => {
    const onChange = vi.fn();
    const configuration = {
      renameIn: 'DATA',
      renameKeysMapping: { temperatureCelsius: 'temperature' },
    };
    setup({
      descriptor: descriptor(RULE_NODE_CLAZZES.renameKeys, configuration),
      configuration,
      onChange,
    });
    fireEvent.change(inputWithin('node-config-rename-keys-mapping-key-0'), {
      target: { value: 't2' },
    });
    expect(onChange).toHaveBeenCalledWith({
      renameIn: 'DATA',
      renameKeysMapping: { t2: 'temperature' },
    });
  });
});

describe('NodeConfigForm — telemetry families', () => {
  it('attributes: processingSettings is family-owned, simple fields render with localized options', async () => {
    const onChange = vi.fn();
    const configuration = {
      processingSettings: { type: 'ON_EVERY_MESSAGE' },
      scope: 'SERVER_SCOPE',
      notifyDevice: false,
      sendAttributesUpdatedNotification: false,
      updateAttributesOnlyOnValueChange: true,
    };
    setup({
      descriptor: descriptor(RULE_NODE_CLAZZES.msgAttributes, configuration),
      configuration,
      onChange,
    });
    expect(
      screen.getByTestId('node-config-save-attributes-processing'),
    ).not.toBeNull();
    expect(screen.queryByTestId('form-property-processingSettings')).toBeNull();
    expect(screen.getByText('属性范围')).not.toBeNull();
    expect(screen.getByText('服务器端属性')).not.toBeNull();
    expect(screen.getByText('仅在值变化时更新属性')).not.toBeNull();
  });

  it('timeseries: deduplicate mode patches type + interval, preserving siblings', async () => {
    const onChange = vi.fn();
    const configuration = {
      defaultTTL: 0,
      useServerTs: false,
      processingSettings: { type: 'ON_EVERY_MESSAGE' },
    };
    setup({
      descriptor: descriptor(RULE_NODE_CLAZZES.msgTimeseries, configuration),
      configuration,
      onChange,
    });
    fireEvent.mouseDown(
      screen.getByTestId('node-config-save-timeseries-processing-type'),
    );
    fireEvent.click(await screen.findByTitle('去重'));
    expect(onChange).toHaveBeenCalledWith({
      defaultTTL: 0,
      useServerTs: false,
      processingSettings: {
        type: 'DEDUPLICATE',
        deduplicationIntervalSecs: 60,
      },
    });
  });
});

describe('NodeConfigForm — alarm families', () => {
  it('create alarm: family owns severity/propagate; alarmType stays a simple field', async () => {
    const configuration = {
      scriptLang: 'TBEL',
      alarmDetailsBuildJs: 'd;',
      alarmDetailsBuildTbel: 'd;',
      alarmType: 'General Alarm',
      severity: 'CRITICAL',
      propagate: false,
      propagateToOwner: false,
      propagateToTenant: false,
      useMessageAlarmData: false,
      overwriteAlarmDetails: false,
      relationTypes: [],
      dynamicSeverity: false,
    };
    setup({
      descriptor: descriptor(RULE_NODE_CLAZZES.createAlarm, configuration),
      configuration,
      onChange: vi.fn(),
    });
    expect(screen.getByTestId('node-config-create-alarm')).not.toBeNull();
    expect(
      screen.getByTestId('node-config-create-alarm-severity'),
    ).not.toBeNull();
    expect(screen.getByText('告警类型')).not.toBeNull();
    expect(screen.getByText('将告警传播到关联实体')).not.toBeNull();
  });

  it('clear alarm: family owns alarmType + details triple', async () => {
    const configuration = {
      scriptLang: 'TBEL',
      alarmDetailsBuildJs: 'd;',
      alarmDetailsBuildTbel: 'd;',
      alarmType: 'General Alarm',
    };
    setup({
      descriptor: descriptor(RULE_NODE_CLAZZES.clearAlarm, configuration),
      configuration,
      onChange: vi.fn(),
    });
    expect(
      screen.getByTestId('node-config-clear-alarm-alarm-type'),
    ).not.toBeNull();
    await waitFor(() =>
      expect(
        screen.getByTestId('node-config-clear-alarm-details-script'),
      ).not.toBeNull(),
    );
    expect(screen.queryByTestId('form-property-alarmType')).toBeNull();
  });
});

describe('NodeConfigForm — fallback path', () => {
  it('unknown clazz renders everything through FormPropertyForm with round-trip fidelity', () => {
    const onChange = vi.fn();
    const configuration = {
      pattern: 'x',
      threshold: 3,
      enabled: true,
      tags: ['a'],
      extra: { nested: true },
    };
    setup({
      descriptor: descriptor('org.example.CustomEnrichmentNode', configuration),
      configuration,
      onChange,
    });
    expect(screen.getByTestId('form-property-form')).not.toBeNull();
    for (const id of ['pattern', 'threshold', 'enabled', 'tags', 'extra']) {
      expect(screen.getByTestId(`form-property-${id}`)).not.toBeNull();
    }
    fireEvent.change(inputWithin('form-property-threshold'), {
      target: { value: '9' },
    });
    expect(onChange).toHaveBeenCalledWith({
      ...configuration,
      threshold: 9,
    });
  });

  it('empty configuration renders an empty legal form (Empty nodes)', () => {
    setup({
      descriptor: descriptor('org.thingsboard.rule.engine.flow.TbAckNode', {}),
      configuration: {},
      onChange: vi.fn(),
    });
    expect(screen.getByTestId('node-config-form')).not.toBeNull();
    expect(screen.queryByTestId('form-property-form')).toBeNull();
  });

  it('plumbs disabled into simple fields and the family', async () => {
    const configuration = {
      scriptLang: 'JS',
      jsScript: 'a;',
      tbelScript: 'b;',
    };
    setup({
      descriptor: descriptor(RULE_NODE_CLAZZES.log, configuration),
      configuration,
      onChange: vi.fn(),
      disabled: true,
    });
    await waitFor(() =>
      expect(
        screen.getByTestId('node-config-script-editor-editor'),
      ).not.toBeNull(),
    );
    expect(
      screen
        .getByTestId('node-config-script-editor-editor')
        .getAttribute('data-readonly'),
    ).toBe('true');
    expect(screen.getByTestId('node-config-script-test-button')).toBeDisabled();
  });
});
