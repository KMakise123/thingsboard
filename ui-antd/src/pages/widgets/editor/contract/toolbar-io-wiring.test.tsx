/**
 * Wave-3 D toolbar wiring tests (the two shell button areas owned by D):
 *  - 恢复上次保存: disabled clean, enabled dirty, confirm rewinds to the
 *    last-saved snapshot;
 *  - 导出: downloads the stripped draft JSON (no POST);
 *  - 导入: file → parsed import dialog; broken JSON refuses with a toast,
 *    never a crash.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorSession } from '@/core/editor/session';
import zhCommon from '@/locales/zh-CN/editor';
import zhWidgetEditor from '@/locales/zh-CN/editor-widget-editor';
import zhWidgetIo from '@/locales/zh-CN/editor-widget-io';

import type { WidgetEditorDoc } from '../draft-convert';
import { WidgetEditorShell } from '../shell';

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

// NOTE: unlike the save-chain suites, none of these flows drive the smoke
// gate's own react-dom root, so the default act environment stays on (antd
// modal.confirm renders under it).

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhWidgetEditor, ...zhWidgetIo },
});

const GOOD_TSX = 'export default function W(){return <div/>}';

function baseDoc(): WidgetEditorDoc {
  return {
    widgetTypeId: 'type-1',
    fqn: 'my_gauge',
    name: 'My gauge',
    source: { tsx: GOOD_TSX, css: '' },
    settingsForm: [],
    defaultConfig: '{}',
    meta: { type: 'latest', sizeX: 8, sizeY: 6 },
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

beforeEach(() => {
  serviceMock.saveWidgetType.mockReset();
  serviceMock.saveWidgetType.mockImplementation(async (entity) => entity);
  umiMock.history.push.mockReset();
  umiMock.history.replace.mockReset();
  vi.mocked(URL.createObjectURL).mockClear();
  document.body.textContent = '';
});

describe('toolbar — restore last saved (wave-3 D area 1)', () => {
  it('renders the restore button, disabled on a clean draft', () => {
    setup();
    expect(screen.getByTestId('we-toolbar-restore')).toBeDisabled();
  });

  it('confirm rewinds the draft to the saved snapshot', async () => {
    const session = setup();
    fireEvent.change(screen.getAllByTestId('codemirror-stub')[0], {
      target: { value: 'const broken = 1' },
    });
    expect(session.current.source.tsx).toBe('const broken = 1');
    const restoreButton = screen.getByTestId('we-toolbar-restore');
    await waitFor(() => {
      expect(restoreButton).toBeEnabled();
    });
    fireEvent.click(restoreButton);
    // antd's confirm mounts through a portal + async motion — wait on the
    // DOM, then press its OK button
    await waitFor(() => {
      expect(document.body.querySelector('.ant-modal-confirm')).toBeTruthy();
    });
    const okButton = document.body.querySelector(
      '.ant-modal-confirm .ant-btn-primary',
    ) as HTMLButtonElement;
    // antd inserts a space between two-char CJK button labels
    expect(okButton).toHaveTextContent(/恢\s*复/);
    fireEvent.click(okButton);
    await waitFor(() => {
      expect(session.current.source.tsx).toBe(GOOD_TSX);
    });
    expect(session.dirty).toBe(false);
  });
});

describe('toolbar — import / export (wave-3 D area 2)', () => {
  it('export downloads the draft JSON without any POST', () => {
    setup();
    fireEvent.click(screen.getByTestId('we-toolbar-export'));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(serviceMock.saveWidgetType).not.toHaveBeenCalled();
  });

  it('import parses the file and opens the confirm dialog', async () => {
    const session = setup();
    const json = JSON.stringify({
      name: 'Imported widget',
      descriptor: {
        runtime: 'react-1',
        schemaVersion: 1,
        source: { tsx: 'export default () => <div />' },
      },
    });
    const input = screen.getByTestId(
      'we-toolbar-import-input',
    ) as HTMLInputElement;
    const file = new File([json], 'widget.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { value: [file] });
    fireEvent.change(input);
    const confirm = await screen.findByTestId('widget-import-confirm');
    fireEvent.click(confirm);
    expect(session.current.name).toBe('Imported widget');
    expect(session.current.widgetTypeId).toBeNull();
    // the import itself does not save — the user stays in control
    expect(serviceMock.saveWidgetType).not.toHaveBeenCalled();
  });

  it('a broken file refuses with a readable error (no crash, no dialog)', async () => {
    const session = setup();
    const input = screen.getByTestId(
      'we-toolbar-import-input',
    ) as HTMLInputElement;
    const file = new File(['{ broken'], 'widget.json', {
      type: 'application/json',
    });
    Object.defineProperty(input, 'files', { value: [file] });
    fireEvent.change(input);
    await waitFor(() => {
      expect(screen.getByText(/不是有效的 JSON/)).toBeInTheDocument();
    });
    // the draft is untouched
    expect(session.current.source.tsx).toBe(GOOD_TSX);
  });
});
