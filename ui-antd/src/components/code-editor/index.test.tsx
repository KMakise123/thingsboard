/**
 * CodeEditor contract tests. CodeMirror 6 is mocked at the package boundary
 * (it measures layout, which happy-dom cannot do) — these tests pin the
 * wrapper's own contract: controlled value flow, language→extension mapping,
 * readOnly plumbing and pass-through extensions.
 *
 * `./javascript-language` is mocked at the same boundary: it is the one file
 * that imports @codemirror/lang-javascript (installed by the M8 wave-1 F
 * agent), so the wrapper suite must not load the real one.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CodeEditor } from './index';

vi.mock('./javascript-language', () => ({
  javascriptExtensions: () => ['__js-lang-stub__'],
}));

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
        data-extension-types={(props.extensions ?? [])
          .map((e) => typeof e)
          .join(',')}
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

  it('routes the javascript language through javascript-language module', () => {
    render(<CodeEditor value="var x = 1;" language="javascript" />);
    const stub = screen.getByTestId('codemirror-stub');
    expect(stub).toHaveAttribute('data-extensions', '1');
    // The mock factory above returns a string sentinel — proving the map
    // pulled the extension from ./javascript-language, not a local entry.
    expect(stub).toHaveAttribute('data-extension-types', 'string');
  });

  it('routes the tsx language through the same javascript-language module', () => {
    render(
      <CodeEditor value="export const W = () => <div/>;" language="tsx" />,
    );
    const stub = screen.getByTestId('codemirror-stub');
    expect(stub).toHaveAttribute('data-extensions', '1');
    // Same string sentinel as `javascript`: the tsx entry reuses the
    // lang-javascript indirection (typescript+jsx options), not a new package.
    expect(stub).toHaveAttribute('data-extension-types', 'string');
  });

  it('maps the css language to the lang-css extension (M9)', () => {
    render(<CodeEditor value=".a { color: red; }" language="css" />);
    const stub = screen.getByTestId('codemirror-stub');
    expect(stub).toHaveAttribute('data-extensions', '1');
    // Real LanguageSupport object from @codemirror/lang-css (same loading
    // mode as tbel — the dependency is installed, not mocked).
    expect(stub).toHaveAttribute('data-extension-types', 'object');
  });

  it('maps the tbel language to the TBEL language support extension', () => {
    render(<CodeEditor value="return msg.temperature > 20;" language="tbel" />);
    const stub = screen.getByTestId('codemirror-stub');
    expect(stub).toHaveAttribute('data-extensions', '1');
    // The real TBEL extension is a LanguageSupport object (not the string
    // sentinel), i.e. the entry comes from ./tbel, not the JS indirection.
    expect(stub).toHaveAttribute('data-extension-types', 'object');
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
