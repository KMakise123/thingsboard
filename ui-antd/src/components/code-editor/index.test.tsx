/**
 * CodeEditor contract tests. CodeMirror 6 is mocked at the package boundary
 * (it measures layout, which happy-dom cannot do) — these tests pin the
 * wrapper's own contract: controlled value flow, language→extension mapping,
 * readOnly plumbing and pass-through extensions.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CodeEditor } from './index';

vi.mock('@uiw/react-codemirror', () => {
  interface StubProps {
    value?: string;
    onChange?: (next: string) => void;
    readOnly?: boolean;
    height?: string;
    extensions?: unknown[];
    [key: string]: unknown;
  }
  function StubCodeMirror(props: StubProps) {
    return (
      <textarea
        data-testid="codemirror-stub"
        data-extensions={String(props.extensions?.length ?? -1)}
        data-readonly={String(props.readOnly === true)}
        data-height={props.height ?? ''}
        value={props.value ?? ''}
        onChange={(e) => props.onChange?.(e.target.value)}
      />
    );
  }
  return { default: StubCodeMirror };
});

afterEach(() => {
  cleanup();
});

describe('CodeEditor', () => {
  it('renders the controlled value and maps the json language to its extension', () => {
    const { container } = render(
      <CodeEditor value={'{"a":1}'} language="json" />,
    );
    const stub = screen.getByTestId('codemirror-stub');
    expect(stub).toHaveValue('{"a":1}');
    expect(stub).toHaveAttribute('data-extensions', '1');
    expect(
      container.querySelector('[data-testid="code-editor"]'),
    ).not.toBeNull();
  });

  it('loads no language extension when language is omitted', () => {
    render(<CodeEditor value="plain" />);
    expect(screen.getByTestId('codemirror-stub')).toHaveAttribute(
      'data-extensions',
      '0',
    );
  });

  it('forwards onChange with the edited text (json language stays text-in/text-out)', () => {
    const onChange = vi.fn();
    render(<CodeEditor value="{}" language="json" onChange={onChange} />);
    fireEvent.change(screen.getByTestId('codemirror-stub'), {
      target: { value: '{"a": 2}' },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('{"a": 2}');
  });

  it('re-renders when the controlled value changes from outside (undo/redo)', () => {
    const { rerender } = render(
      <CodeEditor value="first" language="json" onChange={vi.fn()} />,
    );
    rerender(<CodeEditor value="second" language="json" onChange={vi.fn()} />);
    expect(screen.getByTestId('codemirror-stub')).toHaveValue('second');
  });

  it('plumbs readOnly through', () => {
    render(<CodeEditor value="x" readOnly />);
    expect(screen.getByTestId('codemirror-stub')).toHaveAttribute(
      'data-readonly',
      'true',
    );
  });

  it('merges pass-through extensions after the language extensions', () => {
    const extra = { extension: {} } as never;
    render(<CodeEditor value="x" language="json" extensions={[extra]} />);
    expect(screen.getByTestId('codemirror-stub')).toHaveAttribute(
      'data-extensions',
      '2',
    );
  });

  it('passes the height hint through', () => {
    render(<CodeEditor value="x" height="180px" />);
    expect(screen.getByTestId('codemirror-stub')).toHaveAttribute(
      'data-height',
      '180px',
    );
  });
});
