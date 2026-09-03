/**
 * JsonFieldFallback tests. The CodeEditor is mocked to a textarea so these
 * pin the JSON-source contract: pretty-printed value, parse-on-change with
 * typed emission, invalid JSON blocked with a visible inline error, and
 * external value changes (undo/redo) re-syncing the source text.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JsonFieldFallback } from './JsonFieldFallback';

vi.mock('../code-editor', () => ({
  CodeEditor: (props: {
    value?: string;
    onChange?: (next: string) => void;
    readOnly?: boolean;
    'data-testid'?: string;
  }) => (
    <textarea
      data-testid={props['data-testid'] ?? 'field-json-editor'}
      data-readonly={String(props.readOnly === true)}
      value={props.value ?? ''}
      onChange={(e) => props.onChange?.(e.target.value)}
    />
  ),
}));

afterEach(() => {
  cleanup();
});

describe('JsonFieldFallback', () => {
  it('pretty-prints the incoming object value as source text', () => {
    render(<JsonFieldFallback value={{ a: 1, b: 'x' }} onChange={vi.fn()} />);
    expect(screen.getByTestId('field-json-editor')).toHaveValue(
      '{\n  "a": 1,\n  "b": "x"\n}',
    );
  });

  it('emits the parsed (typed) value on a valid edit', () => {
    const onChange = vi.fn();
    render(
      <JsonFieldFallback
        value={{ list: [1, 2] }}
        onChange={onChange}
        testIdPrefix="field"
      />,
    );
    fireEvent.change(screen.getByTestId('field-json-editor'), {
      target: { value: '{"list": [1, 2, 3]}' },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ list: [1, 2, 3] });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('blocks invalid JSON with a visible inline error and does not propagate', () => {
    const onChange = vi.fn();
    render(<JsonFieldFallback value={{ a: 1 }} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('field-json-editor'), {
      target: { value: '{a: 1' },
    });
    expect(onChange).not.toHaveBeenCalled();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('data-json-error', 'true');
    expect(alert.textContent).toContain('Invalid JSON');
  });

  it('recovers once the source becomes valid again', () => {
    const onChange = vi.fn();
    render(<JsonFieldFallback value={{ a: 1 }} onChange={onChange} />);
    const editor = screen.getByTestId('field-json-editor');
    fireEvent.change(editor, { target: { value: 'nope' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(editor, { target: { value: '"plain"' } });
    expect(onChange).toHaveBeenCalledWith('plain');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('re-syncs the source text when the value changes from outside (undo)', () => {
    const { rerender } = render(
      <JsonFieldFallback value={{ a: 1 }} onChange={vi.fn()} />,
    );
    rerender(
      <JsonFieldFallback value={{ a: 2, b: true }} onChange={vi.fn()} />,
    );
    expect(screen.getByTestId('field-json-editor')).toHaveValue(
      '{\n  "a": 2,\n  "b": true\n}',
    );
  });

  it('does not clobber in-progress typing when an unrelated field triggers rerender with the same value', () => {
    const value = { a: 1 };
    const onChange = vi.fn();
    const { rerender } = render(
      <JsonFieldFallback value={value} onChange={onChange} />,
    );
    fireEvent.change(screen.getByTestId('field-json-editor'), {
      target: { value: '{"a": 1, ' },
    });
    // parent re-renders with the same untouched value reference
    rerender(<JsonFieldFallback value={value} onChange={onChange} />);
    expect(screen.getByTestId('field-json-editor')).toHaveValue('{"a": 1, ');
  });

  it('plumbs readOnly and renders undefined as empty source', () => {
    render(<JsonFieldFallback value={undefined} onChange={vi.fn()} readOnly />);
    const editor = screen.getByTestId('field-json-editor');
    expect(editor).toHaveValue('');
    expect(editor).toHaveAttribute('data-readonly', 'true');
  });
});
