/**
 * ScriptEditor contract tests (M8 brief §3 wave-1 S). The CodeEditor is
 * mocked at the module boundary (house pattern, cf. FormPropertyForm.test);
 * these tests pin the frozen props shape: JS/TBEL segmented toggle with
 * tbelEnabled gating, per-language field write-back, controlled value flow.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import zhEditorScript from '@/locales/zh-CN/editor-script';
import type { ScriptEditorProps } from './ScriptEditor';
import { ScriptEditor } from './ScriptEditor';

vi.mock('../code-editor', () => ({
  CodeEditor: (props: {
    value?: string;
    onChange?: (next: string) => void;
    language?: string;
    readOnly?: boolean;
    height?: string;
    'data-testid'?: string;
  }) => (
    <textarea
      data-testid={props['data-testid'] ?? 'code-editor'}
      data-language={props.language ?? ''}
      data-readonly={String(props.readOnly === true)}
      data-height={props.height ?? ''}
      value={props.value ?? ''}
      onChange={(e) => props.onChange?.(e.target.value)}
    />
  ),
}));

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhEditorScript },
});

function baseProps(): ScriptEditorProps {
  return {
    scriptLang: 'JS',
    jsScript: 'return msg.temperature > 20;',
    tbelScript: 'return msg.temperature > 20;',
    onChange: vi.fn(),
    tbelEnabled: true,
  };
}

function setup(props = baseProps()) {
  render(
    <RawIntlProvider value={intl}>
      <ScriptEditor {...props} />
    </RawIntlProvider>,
  );
  return props;
}

afterEach(() => {
  cleanup();
});

describe('ScriptEditor', () => {
  it('renders the JS/TBEL toggle with the current language selected', () => {
    setup();
    expect(screen.getByTestId('script-editor-lang')).not.toBeNull();
    const jsItem = screen
      .getByText('JavaScript')
      .closest('.ant-segmented-item');
    expect(jsItem?.className).toContain('selected');
    expect(screen.getByText('TBEL')).not.toBeNull();
  });

  it('shows the active language script in a javascript editor', () => {
    setup();
    const editor = screen.getByTestId('script-editor-editor');
    expect(editor).toHaveValue('return msg.temperature > 20;');
    expect(editor).toHaveAttribute('data-language', 'javascript');
  });

  it('writes edits back to jsScript while in JS mode', () => {
    const props = setup();
    fireEvent.change(screen.getByTestId('script-editor-editor'), {
      target: { value: 'return true;' },
    });
    expect(props.onChange).toHaveBeenCalledWith({ jsScript: 'return true;' });
    expect(props.onChange).not.toHaveBeenCalledWith(
      expect.objectContaining({ scriptLang: expect.anything() }),
    );
  });

  it('switches to TBEL and edits write to tbelScript', () => {
    const props = setup();
    fireEvent.click(screen.getByText('TBEL'));
    expect(props.onChange).toHaveBeenCalledWith({ scriptLang: 'TBEL' });

    // Controlled flow: the parent re-renders with the new scriptLang.
    cleanup();
    const rerendered = baseProps();
    rerendered.scriptLang = 'TBEL';
    rerendered.tbelScript = 'return metadata.deviceName != null;';
    setup(rerendered);
    const editor = screen.getByTestId('script-editor-editor');
    expect(editor).toHaveValue('return metadata.deviceName != null;');
    expect(editor).toHaveAttribute('data-language', 'tbel');
    fireEvent.change(editor, { target: { value: 'return false;' } });
    expect(rerendered.onChange).toHaveBeenCalledWith({
      tbelScript: 'return false;',
    });
  });

  it('keeps both script fields independent across the toggle', () => {
    const props = baseProps();
    props.jsScript = 'js-body';
    props.tbelScript = 'tbel-body';
    const { rerender } = render(
      <RawIntlProvider value={intl}>
        <ScriptEditor {...props} />
      </RawIntlProvider>,
    );
    expect(screen.getByTestId('script-editor-editor')).toHaveValue('js-body');
    rerender(
      <RawIntlProvider value={intl}>
        <ScriptEditor {...props} scriptLang="TBEL" />
      </RawIntlProvider>,
    );
    expect(screen.getByTestId('script-editor-editor')).toHaveValue('tbel-body');
  });

  it('disables the TBEL option with a hint when tbelEnabled is false', () => {
    const props = baseProps();
    props.tbelEnabled = false;
    setup(props);
    const tbel = screen.getByText('TBEL').closest('.ant-segmented-item');
    expect(tbel?.className).toContain('disabled');
    // The hint surfaces as a native title on the label (works even while the
    // option swallows pointer events).
    const label = screen.getByText('TBEL').closest('span[title]');
    expect(label?.getAttribute('title')).toBe('TBEL 已禁用');

    fireEvent.click(screen.getByText('TBEL'));
    expect(props.onChange).not.toHaveBeenCalled();
  });

  it('plumbs disabled into the toggle and the read-only editor', () => {
    const props = baseProps();
    props.disabled = true;
    setup(props);
    expect(
      screen.getByTestId('script-editor-lang').className.includes('disabled') ||
        screen
          .getByTestId('script-editor-lang')
          .getAttribute('aria-disabled') === 'true',
    ).toBe(true);
    expect(screen.getByTestId('script-editor-editor')).toHaveAttribute(
      'data-readonly',
      'true',
    );
  });

  it('passes the numeric height through as a CSS hint', () => {
    const props = baseProps();
    props.height = 220;
    setup(props);
    expect(screen.getByTestId('script-editor-editor')).toHaveAttribute(
      'data-height',
      '220px',
    );
  });
});
