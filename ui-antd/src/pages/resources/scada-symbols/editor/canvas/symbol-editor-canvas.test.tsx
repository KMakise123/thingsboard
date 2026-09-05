/**
 * SymbolEditorCanvas component tests: hover panel add-tag flow through the
 * real SymbolCanvas, the svg/xml mode switch (metadata stripped, tb:tag
 * regex scanning, invalid-XML gate) and the readonly suppression.
 * CodeMirror is swapped for a textarea (testability, repo-wide pattern).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { createRef } from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/common';
import zhEditor from '@/locales/zh-CN/resources/scada-symbol-editor';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhEditor },
});

vi.mock('@umijs/max', () => ({
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

vi.mock('@/components/code-editor', () => ({
  CodeEditor: ({
    value,
    onChange,
  }: {
    value: string;
    onChange?: (value: string) => void;
  }) => (
    <textarea
      data-testid="code-editor"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
}));

import type { SymbolEditorCanvasHandle } from './symbol-editor-canvas';
import { SymbolEditorCanvas } from './symbol-editor-canvas';

const SYMBOL_CONTENT =
  '<svg xmlns:tb="https://thingsboard.io/svg" viewBox="0 0 200 100">\n' +
  '<tb:metadata>\n<![CDATA[{"title":"Pump","widgetSizeX":2,"widgetSizeY":1}]]></tb:metadata>\n' +
  '<rect id="r1" x="0" y="0" width="50" height="50"/>\n' +
  '</svg>';

function renderCanvas(
  overrides: Partial<Parameters<typeof SymbolEditorCanvas>[0]> = {},
) {
  const queryClient = new QueryClient();
  const ref = createRef<SymbolEditorCanvasHandle>();
  const props = {
    content: SYMBOL_CONTENT,
    readonly: false,
    onEdit: vi.fn(),
    onTagsChanged: vi.fn(),
    ...overrides,
  };
  const view = render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <SymbolEditorCanvas ref={ref} {...props} />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
  return { ...view, ref, props };
}

describe('SymbolEditorCanvas', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds a tag through the hover panel flow', async () => {
    const { ref, props } = renderCanvas();
    await waitFor(() => {
      expect(
        document.querySelector('[data-testid="scada-canvas-host"] svg'),
      ).toBeTruthy();
    });
    const rect = document.getElementById('r1') as unknown as SVGElement;
    rect.dispatchEvent(new MouseEvent('mouseenter'));
    const addTag = await screen.findByTestId('scada-tag-add');
    fireEvent.click(addTag);
    const input = await screen.findByTestId('scada-tag-input-panel');
    fireEvent.change(input.querySelector('input') as HTMLInputElement, {
      target: { value: 'pump' },
    });
    fireEvent.click(await screen.findByTestId('scada-tag-apply'));
    await waitFor(() => {
      expect(props.onEdit).toHaveBeenCalled();
    });
    expect(ref.current?.getTags()).toContain('pump');
    expect(ref.current?.getContent()).toContain('tb:tag="pump"');
    expect(ref.current?.getContent()).not.toContain('tb:metadata');
  });

  it('switches to xml mode: content without metadata, regex tag scan', async () => {
    const content =
      '<svg xmlns:tb="https://thingsboard.io/svg" viewBox="0 0 200 100">' +
      '<rect tb:tag="valve"/><rect tb:tag="valve"/><rect tb:tag="lamp"/>' +
      '</svg>';
    const { ref } = renderCanvas({ content });
    fireEvent.click(await screen.findByText('XML'));
    const editor = await screen.findByTestId('code-editor');
    expect((editor as HTMLTextAreaElement).value).not.toContain('tb:metadata');
    expect(ref.current?.getMode()).toBe('xml');
    // Mode-aware tag reading (distinct, in order of appearance).
    expect(ref.current?.getTags()).toEqual(['valve', 'lamp']);
    // Ref content follows the editor.
    fireEvent.change(editor, {
      target: { value: '<svg><rect tb:tag="motor"/></svg>' },
    });
    expect(ref.current?.getContent()).toContain('motor');
  });

  it('keeps xml mode when the document is broken on switch-back', async () => {
    const { ref } = renderCanvas();
    fireEvent.click(await screen.findByText('XML'));
    const editor = await screen.findByTestId('code-editor');
    fireEvent.change(editor, { target: { value: '<svg><rect></svg>' } });
    fireEvent.click(screen.getByText('图形'));
    // The broken document blocks the switch — still xml mode.
    expect(ref.current?.getMode()).toBe('xml');
    expect(screen.getByTestId('scada-xml-editor')).toBeTruthy();
  });

  it('suppresses hover panels in readonly mode', async () => {
    renderCanvas({ readonly: true });
    await waitFor(() => {
      expect(
        document.querySelector('[data-testid="scada-canvas-host"] svg'),
      ).toBeTruthy();
    });
    const rect = document.getElementById('r1') as unknown as SVGElement;
    rect.dispatchEvent(new MouseEvent('mouseenter'));
    await vi.advanceTimersByTimeAsync(50);
    expect(screen.queryByTestId('scada-tag-add')).toBeNull();
  });
});
