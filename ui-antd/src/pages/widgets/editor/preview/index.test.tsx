/**
 * WidgetPreview integration contract (spec §5.1/§5.4/§5.5): compile errors
 * surface with source lines and clear on input, runtime errors ride the
 * per-instance boundary with sourceURL line mapping, runId remounts reset
 * the subscription, the WYSIWYG settings form writes back the
 * defaultConfig JSON string, the function datasource renders the random
 * series, console output lands in the capture windows, and typing clears
 * stale errors. The compile pipeline itself is exercised FOR REAL (no
 * mock) — Sucrase output renders through the host React.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FormPropertyType } from '@/components/form-property/types';
import { releaseAllWidgetStyles } from '@/core/widget/style-scope';
import zhEditor from '@/locales/zh-CN/editor-widget-editor';
import zhPreview from '@/locales/zh-CN/editor-widget-preview';
import { FUNCTION_TICK_MS } from './function-subscription';
import type { PreviewPaneProps } from './index';
import { WidgetPreview } from './index';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhEditor, ...zhPreview },
});

const VALID_TSX =
  'export default function W() { return <div data-testid="w-ok">ok</div>; }';

const DATA_LEN_TSX = [
  'export default function W(props: { data: Record<string, [number, number][]> }) {',
  '  const key = Object.keys(props.data)[0];',
  '  const len = key ? props.data[key].length : 0;',
  '  return <div data-testid="w-data-len">{String(len)}</div>;',
  '}',
].join('\n');

const FUNCTION_CONFIG = JSON.stringify({
  datasources: [
    {
      type: 'function',
      dataKeys: [
        { name: 'temp', type: 'timeseries', funcBody: 'return prevValue + 1;' },
      ],
    },
  ],
});

function baseProps(): PreviewPaneProps {
  return {
    tsx: VALID_TSX,
    css: '',
    settingsForm: [],
    defaultConfig: '{}',
    runId: 0,
    onError: vi.fn(),
    onConsoleEntry: vi.fn(),
    onDefaultConfigChange: vi.fn(),
  };
}

function setup(overrides: Partial<PreviewPaneProps> = {}) {
  const props = { ...baseProps(), ...overrides };
  const view = render(
    <RawIntlProvider value={intl}>
      <AntdApp>
        <WidgetPreview {...props} />
      </AntdApp>
    </RawIntlProvider>,
  );
  const rerender = (next: Partial<PreviewPaneProps>) =>
    view.rerender(
      <RawIntlProvider value={intl}>
        <AntdApp>
          <WidgetPreview {...props} {...next} />
        </AntdApp>
      </RawIntlProvider>,
    );
  return {
    rerender,
    unmount: view.unmount,
    onError: props.onError as ReturnType<typeof vi.fn>,
    onConsoleEntry: props.onConsoleEntry as ReturnType<typeof vi.fn>,
    onDefaultConfigChange: props.onDefaultConfigChange as ReturnType<
      typeof vi.fn
    >,
  };
}

beforeEach(() => {
  // Timers stay REAL by default: faking setInterval stalls testing-library's
  // waitFor polling (it polls through setInterval), and faking setTimeout
  // stalls React's scheduler outright. Only the tick tests below fake the
  // interval pair — they avoid waitFor/findBy entirely.
});

afterEach(() => {
  cleanup();
  releaseAllWidgetStyles();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/**
 * Fake the interval pair for a tick test that drives the subscription
 * clock by hand (no waitFor/findBy inside — see beforeEach note).
 */
function fakeIntervals() {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
}

describe('WidgetPreview — compile error channel (§5.5)', () => {
  it('reports a transform error with its 1-based editor line, without rendering', async () => {
    const broken = [
      'export default function W() {',
      '  return null;',
      '}',
      'const broken = ;', // line 4 — sucrase loc
    ].join('\n');
    const channels = setup({ tsx: broken });

    await act(async () => {});
    expect(channels.onError).toHaveBeenCalledWith({
      kind: 'compile',
      message: expect.any(String),
      line: 4,
    });
    // the compile failure rides the console channel too
    expect(channels.onConsoleEntry).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'error' }),
    );
    // nothing renders — the empty state stands in
    expect(screen.getByTestId('widget-preview-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('w-ok')).toBeNull();
  });

  it('recovers on the next run (runId bump recompiles and renders)', async () => {
    const broken = 'const broken = ;';
    const channels = setup({ tsx: broken, runId: 0 });
    await act(async () => {});
    expect(channels.onError).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'compile' }),
    );

    channels.rerender({ tsx: VALID_TSX, runId: 1 });
    await screen.findByTestId('w-ok');
    expect(channels.onError).toHaveBeenLastCalledWith(null);
  });
});

describe('WidgetPreview — runtime error channel (§5.5)', () => {
  it('catches a render crash at the boundary and maps the stack line back', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const thrower = [
      'export default function W() {',
      '  throw new Error("render boom");', // editor line 2
      '}',
    ].join('\n');
    const channels = setup({ tsx: thrower });

    await waitFor(() => {
      expect(channels.onError).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'runtime', message: 'render boom' }),
      );
    });
    // P1 line parity: the sourceURL frame maps back to editor line 2
    const call = channels.onError.mock.calls.find(
      (entry) => (entry[0] as { kind: string } | null)?.kind === 'runtime',
    );
    if (!call) {
      throw new Error('no runtime error captured');
    }
    expect((call[0] as { line?: number }).line).toBe(2);
    expect(channels.onConsoleEntry).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'error' }),
    );
    // the degraded card replaces the crashed subtree
    expect(
      screen.getByTestId('widget-preview-runtime-broken'),
    ).toBeInTheDocument();
    spy.mockRestore();
  });

  it('reports a broken funcBody through the runtime channel (no line)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const config = JSON.stringify({
      datasources: [
        {
          type: 'function',
          dataKeys: [
            { name: 'bad', type: 'timeseries', funcBody: 'return (((;' },
          ],
        },
      ],
    });
    const channels = setup({ defaultConfig: config });
    await waitFor(() => {
      expect(channels.onError).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'runtime' }),
      );
    });
    const call = channels.onError.mock.calls.find(
      (entry) => (entry[0] as { kind: string } | null)?.kind === 'runtime',
    );
    if (!call) {
      throw new Error('no runtime error captured');
    }
    expect((call[0] as { line?: number }).line).toBeUndefined();
    spy.mockRestore();
  });

  it('keeps the widget visible when a defaultConfig edit breaks the JSON', async () => {
    const channels = setup();
    await screen.findByTestId('w-ok');

    channels.rerender({ defaultConfig: '{not json' });
    await act(async () => {});
    expect(channels.onError).toHaveBeenCalledWith({
      kind: 'runtime',
      message: expect.any(String),
    });
    // the keyed run is gone — the parse message shows in the empty state
    expect(screen.getByTestId('widget-preview-empty')).toHaveTextContent(
      /JSON/,
    );
    expect(screen.queryByTestId('w-ok')).toBeNull();
  });
});

describe('WidgetPreview — input clears errors (§5.5)', () => {
  it('clears a stale compile error as soon as any input prop changes', async () => {
    const broken = 'const broken = ;';
    const channels = setup({ tsx: broken });
    await act(async () => {});
    expect(channels.onError).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'compile' }),
    );

    // editing the CSS tab clears the TSX error — typing never recompiles
    channels.rerender({ css: '.a{color:red}' });
    expect(channels.onError).toHaveBeenLastCalledWith(null);
    expect(screen.getByTestId('widget-preview-empty')).toBeInTheDocument();

    // a settings schema edit clears too
    channels.rerender({
      settingsForm: [
        { id: 'x', name: 'x', type: FormPropertyType.text, default: '' },
      ],
    });
    expect(channels.onError).toHaveBeenLastCalledWith(null);
  });
});

describe('WidgetPreview — runId remount (§5.1 hook lifecycles)', () => {
  it('restarts the function subscription from scratch on a runId bump', async () => {
    fakeIntervals();
    const channels = setup({
      tsx: DATA_LEN_TSX,
      defaultConfig: FUNCTION_CONFIG,
    });
    // flush the lazy resolve + subscription start (microtasks, not polling)
    await act(async () => {});
    expect(screen.getByTestId('w-data-len')).toHaveTextContent('60');

    await act(async () => {
      vi.advanceTimersByTime(FUNCTION_TICK_MS * 2);
    });
    expect(screen.getByTestId('w-data-len')).toHaveTextContent('62');

    // ctrl+enter: the keyed subtree remounts — series restart at 60 points
    channels.rerender({ runId: 1 });
    await act(async () => {});
    expect(screen.getByTestId('w-data-len')).toHaveTextContent('60');
  });
});

describe('WidgetPreview — function datasource renders data (§5.4)', () => {
  it('threads prevValue through the funcBody into the rendered series', async () => {
    const VALUE_TSX = [
      'export default function W(props: { data: Record<string, [number, number][]> }) {',
      '  const series = props.data.temp ?? [];',
      '  return <div data-testid="w-last">{String(series.at(-1)?.[1])}</div>;',
      '}',
    ].join('\n');
    setup({ tsx: VALUE_TSX, defaultConfig: FUNCTION_CONFIG });
    await screen.findByTestId('w-last');
    // initial series: prevValue 0 → +1 per point over 60 points
    expect(screen.getByTestId('w-last')).toHaveTextContent('60');
  });

  it('hands the widget a preview ctx (isPreview, locale) and parsed settings', async () => {
    const PROPS_TSX = [
      'export default function W(props: { settings: Record<string, unknown>; ctx: { isPreview: boolean; locale: string } }) {',
      '  return <div data-testid="w-ctx">{String(props.ctx.isPreview)}:{props.ctx.locale}:{String(props.settings.threshold)}</div>;',
      '}',
    ].join('\n');
    setup({
      tsx: PROPS_TSX,
      defaultConfig: JSON.stringify({ settings: { threshold: 7 } }),
    });
    await screen.findByTestId('w-ctx');
    expect(screen.getByTestId('w-ctx')).toHaveTextContent('true:zh-CN:7');
  });
});

describe('WidgetPreview — WYSIWYG settings write-back (§5.4)', () => {
  it('merges edited settings back into the defaultConfig JSON string', async () => {
    const channels = setup({
      settingsForm: [
        {
          id: 'threshold',
          name: 'threshold',
          type: FormPropertyType.number,
          default: 1,
        },
      ],
      defaultConfig: JSON.stringify({ title: 'gauge', settings: {} }),
    });
    await screen.findByTestId('widget-preview-settings');

    const spin = screen.getAllByRole('spinbutton')[0];
    fireEvent.change(spin, { target: { value: '42' } });

    expect(channels.onDefaultConfigChange).toHaveBeenCalledTimes(1);
    const written = JSON.parse(
      channels.onDefaultConfigChange.mock.calls[0][0] as string,
    ) as { title?: string; settings: { threshold?: number } };
    expect(written.title).toBe('gauge'); // untouched keys survive the merge
    expect(written.settings.threshold).toBe(42);
  });

  it('re-renders the widget with fresh settings WITHOUT remounting the run', async () => {
    const ECHO_TSX = [
      'export default function W(props: { settings: { label?: string } }) {',
      '  return <div data-testid="w-label">{String(props.settings.label)}</div>;',
      '}',
    ].join('\n');
    const channels = setup({
      tsx: ECHO_TSX,
      settingsForm: [
        {
          id: 'label',
          name: 'label',
          type: FormPropertyType.text,
          default: '',
        },
      ],
      defaultConfig: JSON.stringify({ settings: { label: 'a' } }),
    });
    await screen.findByTestId('w-label');
    expect(screen.getByTestId('w-label')).toHaveTextContent('a');

    const input = screen.getAllByRole('textbox')[0];
    fireEvent.change(input, { target: { value: 'b' } });

    expect(channels.onDefaultConfigChange).toHaveBeenCalledWith(
      expect.stringContaining('"label": "b"'),
    );
    // the shell routes the write-back through the session and the new
    // defaultConfig string comes back as props (same runId — no remount)
    channels.rerender({
      defaultConfig: channels.onDefaultConfigChange.mock.calls[0][0] as string,
    });
    await act(async () => {});
    expect(screen.getByTestId('w-label')).toHaveTextContent('b');
  });
});

describe('WidgetPreview — console capture windows (§5.5)', () => {
  it('captures module-top, render and tick console output', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const noisy = [
      "console.log('module-top');",
      'export default function W() {',
      "  console.log('render-log');",
      '  return <div data-testid="w-noise" />;',
      '}',
    ].join('\n');
    const tickyConfig = JSON.stringify({
      datasources: [
        {
          type: 'function',
          dataKeys: [
            {
              name: 'temp',
              type: 'timeseries',
              funcBody: "console.log('tick-log'); return 1;",
            },
          ],
        },
      ],
    });
    fakeIntervals();
    const channels = setup({ tsx: noisy, defaultConfig: tickyConfig });

    await act(async () => {}); // lazy resolve + effects (microtasks)
    expect(screen.getByTestId('w-noise')).toBeInTheDocument();
    await act(async () => {}); // flush the render-window microtask bracket
    const texts = channels.onConsoleEntry.mock.calls.map(
      (call) => (call[0] as { text: string }).text,
    );
    expect(texts).toContain('module-top'); // RUN window
    expect(texts).toContain('render-log'); // RENDER window

    await act(async () => {
      vi.advanceTimersByTime(FUNCTION_TICK_MS);
    });
    const tickTexts = channels.onConsoleEntry.mock.calls.map(
      (call) => (call[0] as { text: string }).text,
    );
    expect(tickTexts).toContain('tick-log'); // TICK window
  });

  it('joins multi-arg console calls into one entry line', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const multi = [
      "console.log('answer', 42);",
      'export default function W() {',
      '  return <div data-testid="w-multi" />;',
      '}',
    ].join('\n');
    const channels = setup({ tsx: multi });
    await screen.findByTestId('w-multi');
    const texts = channels.onConsoleEntry.mock.calls.map(
      (call) => (call[0] as { text: string }).text,
    );
    expect(texts).toContain('answer 42');
  });
});

describe('WidgetPreview — style namespace (§5.1)', () => {
  it('mounts the type-layer css under the preview scope and releases it', async () => {
    const scoped = [
      'export default function W() {',
      '  return <div className="mark" data-testid="w-mark">m</div>;',
      '}',
    ].join('\n');
    setup({ tsx: scoped, css: '.mark { color: red; }' });
    await screen.findByTestId('w-mark');

    const styleNode = document.querySelector(
      'style[data-widget-style-scope="type"]',
    );
    expect(styleNode).not.toBeNull();
    expect(styleNode?.textContent).toContain('.tbw-type-editor-preview .mark');
  });
});
