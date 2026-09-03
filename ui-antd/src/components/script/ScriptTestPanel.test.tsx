/**
 * ScriptTestPanel contract tests (M8 brief §3 wave-1 S, ui-ngx
 * node-script-test-dialog as panel). Execution goes through the injected
 * onRun prop (HTTP lives in services/tb — the panel itself must stay
 * request-free), so every test drives a mocked onRun. CodeEditor is mocked
 * at the module boundary (house pattern).
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import zhEditorScript from '@/locales/zh-CN/editor-script';
import type { ScriptTestPanelProps, TestScriptResult } from './ScriptTestPanel';
import {
  DEFAULT_TEST_METADATA,
  DEFAULT_TEST_MSG,
  DEFAULT_TEST_MSG_TYPE,
  ScriptTestPanel,
} from './ScriptTestPanel';

vi.mock('../code-editor', () => ({
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

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhEditorScript },
});

const okResult: TestScriptResult = { output: '"done"', error: '' };

function baseProps(): ScriptTestPanelProps {
  return {
    scriptType: 'filter',
    argNames: ['msg', 'metadata', 'msgType'],
    script: 'return msg.temperature > 20;',
    scriptLang: 'JS',
    onRun: vi.fn().mockResolvedValue(okResult),
  };
}

function setup(props = baseProps()) {
  render(
    <RawIntlProvider value={intl}>
      <ScriptTestPanel {...props} />
    </RawIntlProvider>,
  );
  return props;
}

function editor(id: string): HTMLTextAreaElement {
  return screen.getByTestId(id) as HTMLTextAreaElement;
}

afterEach(() => {
  cleanup();
});

describe('ScriptTestPanel', () => {
  it('renders the brief-pinned default payload', () => {
    setup();
    expect(editor('script-test-msgtype-input')).toHaveValue(
      'POST_TELEMETRY_REQUEST',
    );
    expect(editor('script-test-msg-input')).toHaveValue(DEFAULT_TEST_MSG);
    expect(editor('script-test-metadata-input')).toHaveValue(
      DEFAULT_TEST_METADATA,
    );
    expect(DEFAULT_TEST_MSG).toBe('{"temperature":22.4,"humidity":78}');
    expect(DEFAULT_TEST_METADATA).toBe(
      '{"deviceName":"Test Device","deviceType":"default"}',
    );
    expect(DEFAULT_TEST_MSG_TYPE).toBe('POST_TELEMETRY_REQUEST');
  });

  it('shows the caller script read-only in the script language', () => {
    const props = setup();
    const scriptArea = editor('script-test-script');
    expect(scriptArea).toHaveValue(props.script);
    expect(scriptArea).toHaveAttribute('data-readonly', 'true');
    expect(scriptArea).toHaveAttribute('data-language', 'javascript');
  });

  it('runs the script with the backend contract payload', async () => {
    const props = setup();
    fireEvent.change(editor('script-test-msgtype-input'), {
      target: { value: 'POST_ATTRIBUTES_REQUEST' },
    });
    fireEvent.click(screen.getByTestId('script-test-run'));
    await waitFor(() =>
      expect(props.onRun).toHaveBeenCalledWith({
        script: 'return msg.temperature > 20;',
        scriptType: 'filter',
        argNames: ['msg', 'metadata', 'msgType'],
        // msg stays raw JSON text (backend TbMsg data); metadata is parsed.
        msg: DEFAULT_TEST_MSG,
        metadata: { deviceName: 'Test Device', deviceType: 'default' },
        msgType: 'POST_ATTRIBUTES_REQUEST',
      }),
    );
    expect(await screen.findByTestId('script-test-output')).toHaveTextContent(
      '"done"',
    );
  });

  it('reports invalid msg JSON locally and never sends a request', () => {
    const props = setup();
    fireEvent.change(editor('script-test-msg-input'), {
      target: { value: '{oops' },
    });
    fireEvent.click(screen.getByTestId('script-test-run'));
    expect(props.onRun).not.toHaveBeenCalled();
    expect(screen.getByTestId('script-test-json-error')).not.toBeNull();
  });

  it('reports non-object metadata locally and never sends a request', () => {
    const props = setup();
    fireEvent.change(editor('script-test-metadata-input'), {
      target: { value: '[1,2]' },
    });
    fireEvent.click(screen.getByTestId('script-test-run'));
    expect(props.onRun).not.toHaveBeenCalled();
    expect(screen.getByTestId('script-test-json-error')).not.toBeNull();
  });

  it('surfaces the backend error prominently', async () => {
    const props = baseProps();
    props.onRun = vi.fn().mockResolvedValue({
      output: '',
      error: 'ReferenceError: foo is not defined',
    } satisfies TestScriptResult);
    setup(props);
    fireEvent.click(screen.getByTestId('script-test-run'));
    const errorArea = await screen.findByTestId('script-test-error');
    expect(errorArea).toHaveTextContent('ReferenceError: foo is not defined');
    expect(screen.queryByTestId('script-test-output')).toBeNull();
  });

  it('re-enables the run button after the result arrives', async () => {
    const props = setup();
    fireEvent.click(screen.getByTestId('script-test-run'));
    await waitFor(() =>
      expect(screen.getByTestId('script-test-run')).not.toBeDisabled(),
    );
    expect(props.onRun).toHaveBeenCalledTimes(1);
  });

  it('disables running TBEL tests while TBEL is disabled', () => {
    const props = baseProps();
    props.scriptLang = 'TBEL';
    props.tbelEnabled = false;
    setup(props);
    expect(screen.getByTestId('script-test-run')).toBeDisabled();
    fireEvent.click(screen.getByTestId('script-test-run'));
    expect(props.onRun).not.toHaveBeenCalled();
  });

  it('honours the testIdPrefix for every hook', () => {
    const props = baseProps();
    props.testIdPrefix = 'generator-test';
    setup(props);
    expect(editor('generator-test-msg-input')).not.toBeNull();
    expect(editor('generator-test-metadata-input')).not.toBeNull();
    expect(screen.getByTestId('generator-test-script')).not.toBeNull();
    expect(screen.getByTestId('generator-test-run')).not.toBeNull();
  });
});
