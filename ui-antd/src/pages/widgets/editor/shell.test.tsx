/**
 * Widget editor shell wiring (M9 brief §3 wave S): the four-tab code area,
 * the metadata sidebar session writes, the hotkey set with its ctrl+z focus
 * routing (CodeMirror stack vs EditorSession), save/run/tidy plumbing and
 * the exit dirty confirm.
 *
 * CodeMirror 6 is mocked at the package boundary (layout measuring breaks
 * happy-dom — same approach as the CodeEditor contract tests); services are
 * mocked at the module boundary. The exit route target and the dialogs are
 * covered through their data-testids.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FormPropertyType } from '@/components/form-property/types';
import { EditorSession } from '@/core/editor/session';
import zhCommon from '@/locales/zh-CN/editor';
import zhWidgetEditor from '@/locales/zh-CN/editor-widget-editor';

import type { WidgetEditorDoc } from './draft-convert';
import { WidgetEditorShell } from './shell';

const serviceMock = vi.hoisted(() => ({
  saveWidgetType: vi.fn(),
}));
vi.mock('@/services/tb/widget-type', () => serviceMock);

const umiMock = vi.hoisted(() => ({
  history: { push: vi.fn(), replace: vi.fn() },
}));
vi.mock('@umijs/max', () => umiMock);

vi.mock('@uiw/react-codemirror', () => {
  interface StubProps {
    value?: string;
    onChange?: (next: string) => void;
    [key: string]: unknown;
  }
  function StubCodeMirror(props: StubProps) {
    return (
      <textarea
        data-testid="codemirror-stub"
        data-value={props.value ?? ''}
        value={props.value ?? ''}
        onChange={(e) => props.onChange?.(e.target.value)}
        readOnly
      />
    );
  }
  return { default: StubCodeMirror };
});

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhWidgetEditor },
});

const TSX_SOURCE = 'export default function W(){return <div/>}';
const CSS_SOURCE = '.wrap{color:red}';

function baseDoc(): WidgetEditorDoc {
  return {
    widgetTypeId: 'type-1',
    fqn: 'my_gauge',
    name: 'My gauge',
    source: { tsx: TSX_SOURCE, css: CSS_SOURCE },
    settingsForm: [
      {
        id: 'threshold',
        name: 'threshold',
        type: FormPropertyType.number,
        default: 1,
      },
    ],
    defaultConfig: '{"title":"gauge"}',
    meta: {
      type: 'latest',
      sizeX: 8,
      sizeY: 6,
      actionSources: {
        headerButton: { name: 'header', value: 'headerButton', multiple: true },
      },
    },
    version: 2,
    descriptorPassthrough: {},
  };
}

function setup(doc: WidgetEditorDoc = baseDoc()) {
  const session = new EditorSession<WidgetEditorDoc>({ baseline: doc });
  render(
    <RawIntlProvider value={intl}>
      <AntdApp>
        <WidgetEditorShell session={session} />
      </AntdApp>
    </RawIntlProvider>,
  );
  return session;
}

function codeArea(): HTMLTextAreaElement {
  return screen.getAllByTestId('codemirror-stub')[0] as HTMLTextAreaElement;
}

function stubValues(): Array<string | undefined> {
  return screen
    .getAllByTestId('codemirror-stub')
    .map((stub) => (stub as HTMLTextAreaElement).dataset.value);
}

beforeEach(() => {
  serviceMock.saveWidgetType.mockReset();
  serviceMock.saveWidgetType.mockResolvedValue({
    id: { entityType: 'WIDGET_TYPE', id: 'type-1' },
    fqn: 'my_gauge',
    name: 'My gauge',
    version: 3,
    descriptor: {},
  });
  umiMock.history.push.mockReset();
  umiMock.history.replace.mockReset();
  document.body.textContent = '';
});

describe('WidgetEditorShell — toolbar affordances', () => {
  it('renders save/undo/redo disabled on a clean baseline', () => {
    setup();
    expect(screen.getByTestId('we-toolbar-save')).toBeDisabled();
    expect(screen.getByTestId('we-toolbar-undo')).toBeDisabled();
    expect(screen.getByTestId('we-toolbar-redo')).toBeDisabled();
    expect(screen.getByTestId('we-toolbar-exit')).toBeInTheDocument();
    expect(screen.getByTestId('we-toolbar-help')).toBeInTheDocument();
  });

  it('enables save once the session is dirty (disabled source = !dirty || saving)', async () => {
    setup();
    fireEvent.change(codeArea(), { target: { value: 'const x = 1' } });
    await waitFor(() => {
      expect(screen.getByTestId('we-toolbar-save')).toBeEnabled();
    });
    expect(screen.getByTestId('we-toolbar-undo')).toBeEnabled();
  });
});

describe('WidgetEditorShell — four code tabs (all CodeEditor)', () => {
  it('binds TSX by default and switches to CSS and defaultConfig', () => {
    setup();
    expect(codeArea().dataset.value).toBe(TSX_SOURCE);

    // antd Tabs keeps visited panes mounted — assert the active values by
    // membership in the mounted stubs
    fireEvent.click(screen.getByText('CSS'));
    expect(stubValues()).toContain(CSS_SOURCE);

    fireEvent.click(screen.getByText('defaultConfig'));
    expect(stubValues()).toContain('{"title":"gauge"}');
  });

  it('routes TSX edits through the session (coalesced write → dirty)', () => {
    const session = setup();
    fireEvent.change(codeArea(), { target: { value: 'const x = 1' } });
    expect(session.current.source.tsx).toBe('const x = 1');
    expect(session.dirty).toBe(true);
    // the transaction is labeled and coalesce-keyed
    expect(session.history).toHaveLength(1);
    expect(session.history[0].label).toBe('source.tsx');
    expect(session.history[0].coalesceKey).toBe('source:tsx');
  });

  it('mirrors the Schema tab through JSON parse (invalid stays local)', () => {
    const session = setup();
    fireEvent.click(screen.getByText('Schema'));
    // committed state = the serialized settingsForm
    const area = screen
      .getAllByTestId('codemirror-stub')
      .find((stub) =>
        (stub as HTMLTextAreaElement).dataset.value?.includes('"threshold"'),
      ) as HTMLTextAreaElement;
    expect(area).toBeDefined();
    fireEvent.change(area, {
      target: { value: '[{"id":"a","name":"a","type":"text","default":""}]' },
    });
    expect(session.current.settingsForm).toHaveLength(1);
    expect(screen.queryByTestId('we-tab-schema-invalid')).toBeNull();
    fireEvent.change(area, { target: { value: '[broken' } });
    expect(screen.getByTestId('we-tab-schema-invalid')).toBeInTheDocument();
  });
});

describe('WidgetEditorShell — metadata sidebar writes', () => {
  it('binds name through the undo-safe mirror into the session', () => {
    const session = setup();
    const name = screen.getByTestId('we-metadata-name') as HTMLInputElement;
    expect(name.value).toBe('My gauge');
    fireEvent.change(name, { target: { value: 'Renamed' } });
    expect(session.current.name).toBe('Renamed');
    expect(session.history[0].label).toBe('meta.name');
  });

  it('edits action sources structurally (add + remove coalesce into one group)', () => {
    const session = setup();
    fireEvent.click(screen.getByTestId('we-metadata-action-add'));
    expect(Object.keys(session.current.meta.actionSources ?? {})).toEqual([
      'headerButton',
      'headerButton2',
    ]);
    fireEvent.click(
      screen.getByTestId('we-metadata-action-remove-headerButton2'),
    );
    expect(Object.keys(session.current.meta.actionSources ?? {})).toEqual([
      'headerButton',
    ]);
    // the sidebar's structural writes coalesce (1s window, shared key)
    expect(session.history).toHaveLength(1);
    expect(session.history[0].label).toBe('meta.actionSources');
  });
});

describe('WidgetEditorShell — hotkeys & ctrl+z focus routing', () => {
  it('ctrl+z inside a sidebar input drives the EditorSession undo', () => {
    const session = setup();
    const name = screen.getByTestId('we-metadata-name');
    fireEvent.change(name, { target: { value: 'Renamed' } });
    expect(session.current.name).toBe('Renamed');
    fireEvent.keyDown(name, { key: 'z', code: 'KeyZ', ctrlKey: true });
    expect(session.current.name).toBe('My gauge');
  });

  it('ctrl+z inside a CodeMirror surface yields to CodeMirror (no session undo)', () => {
    const session = setup();
    fireEvent.change(codeArea(), { target: { value: 'const x = 1' } });
    const cmHost = document.createElement('div');
    cmHost.className = 'cm-editor';
    const cmInput = document.createElement('input');
    cmHost.appendChild(cmInput);
    document.body.appendChild(cmHost);
    fireEvent.keyDown(cmInput, { key: 'z', code: 'KeyZ', ctrlKey: true });
    expect(session.current.source.tsx).toBe('const x = 1');
    expect(session.dirty).toBe(true);
  });

  it('ctrl+s saves through the contract hook and re-anchors the session', async () => {
    // wave-3 D save chain: the POST only happens behind the compile/smoke
    // gates, so the typed source must be a valid default-exported component
    const session = setup();
    fireEvent.change(codeArea(), {
      target: { value: 'export default function W(){return <div/>}' },
    });
    fireEvent.keyDown(document, { key: 's', code: 'KeyS', ctrlKey: true });
    await waitFor(() => {
      expect(serviceMock.saveWidgetType).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(session.dirty).toBe(false);
    });
  });

  it('ctrl+enter bumps the preview runId (remount key)', () => {
    setup();
    expect(screen.getByTestId('widget-preview-run-id')).toHaveTextContent(
      ': 0',
    );
    fireEvent.keyDown(document, { key: 'Enter', code: 'Enter', ctrlKey: true });
    expect(screen.getByTestId('widget-preview-run-id')).toHaveTextContent(
      ': 1',
    );
  });

  it('shift+ctrl+f tidies the active tab via prettier standalone', async () => {
    const session = setup();
    fireEvent.keyDown(document, {
      key: 'f',
      code: 'KeyF',
      ctrlKey: true,
      shiftKey: true,
    });
    await waitFor(() => {
      expect(session.current.source.tsx).toContain('function W() {');
    });
  });

  it('opens the shortcuts help drawer (toolbar affordance; the "?" hotkey', () => {
    // NOTE: the '?' hotkey itself is registered with useKey (character
    // matching) — react-hotkeys-hook v5 resolves keystrokes by event.code
    // in synthetic happy-dom events, so the keystroke path is exercised in
    // the browser walkthrough (V wave), not here.
    setup();
    fireEvent.click(screen.getByTestId('we-toolbar-help'));
    expect(screen.getByTestId('we-help-drawer')).toBeInTheDocument();
    expect(screen.getByText('ctrl+s')).toBeInTheDocument();
  });

  it('ctrl+q exits through the leave guard: clean exits, dirty confirms', async () => {
    const session = setup();
    fireEvent.keyDown(document, { key: 'q', code: 'KeyQ', ctrlKey: true });
    await waitFor(() => {
      expect(umiMock.history.push).toHaveBeenCalledWith('/dashboards');
    });

    fireEvent.change(codeArea(), { target: { value: 'const y = 2' } });
    fireEvent.keyDown(document, { key: 'q', code: 'KeyQ', ctrlKey: true });
    const discard = await screen.findByText('放弃更改');
    fireEvent.click(discard);
    await waitFor(() => {
      expect(umiMock.history.push).toHaveBeenCalledWith('/dashboards');
    });
    expect(session.current.source.tsx).toBe(TSX_SOURCE); // rolled back to entry
  });
});
