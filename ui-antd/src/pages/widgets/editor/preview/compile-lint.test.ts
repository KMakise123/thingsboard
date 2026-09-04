/**
 * Compile-error gutter diagnostics contract (spec §5.5): one error-level
 * diagnostic pinned to the 1-based editor line (P1 parity), clamped into
 * the document, empty for null/runtime/no-line errors, and stable
 * extension identity per error object.
 */
import { EditorState, type Text } from '@codemirror/state';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  compileErrorDiagnostics,
  useCompileErrorExtensions,
} from './compile-lint';
import type { WidgetPreviewError } from './index';

const SOURCE = [
  'export default function W() {',
  '  return null;',
  '}',
  '',
].join('\n');

function docOf(text: string): Text {
  return EditorState.create({ doc: text }).doc;
}

function compileError(line: number): WidgetPreviewError {
  return { kind: 'compile', message: 'Unexpected token', line };
}

describe('compileErrorDiagnostics', () => {
  it('pins one error diagnostic to the 1-based line', () => {
    const doc = docOf(SOURCE);
    const diagnostics = compileErrorDiagnostics(doc, compileError(2));
    expect(diagnostics).toHaveLength(1);
    const line2 = doc.line(2);
    expect(diagnostics[0].from).toBe(line2.from);
    expect(diagnostics[0].to).toBe(line2.to);
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].message).toBe('Unexpected token');
    expect(diagnostics[0].source).toBe('widget-compile');
  });

  it('returns no diagnostics for runtime errors or missing lines', () => {
    const doc = docOf(SOURCE);
    expect(
      compileErrorDiagnostics(doc, { kind: 'runtime', message: 'x' }),
    ).toEqual([]);
    expect(
      compileErrorDiagnostics(doc, { kind: 'compile', message: 'x' }),
    ).toEqual([]);
  });

  it('clamps out-of-range lines into the document', () => {
    const doc = docOf(SOURCE); // 4 lines
    const tooHigh = compileErrorDiagnostics(doc, compileError(999));
    expect(tooHigh[0].from).toBe(doc.line(4).from);
    const tooLow = compileErrorDiagnostics(doc, compileError(-3));
    expect(tooLow[0].from).toBe(doc.line(1).from);
  });
});

describe('useCompileErrorExtensions', () => {
  it('yields no extension without a compile error and one with it', () => {
    const { result, rerender } = renderHook<
      ReturnType<typeof useCompileErrorExtensions>,
      WidgetPreviewError | null
    >((error) => useCompileErrorExtensions(error), { initialProps: null });
    expect(result.current).toEqual([]);

    const error = compileError(1);
    rerender(error);
    expect(result.current).toHaveLength(1);
    // stable identity while the error object stays the same
    const same = result.current;
    rerender(error);
    expect(result.current).toBe(same);
  });

  it('drops the extension as soon as the error clears (null = clear)', () => {
    const { result, rerender } = renderHook<
      ReturnType<typeof useCompileErrorExtensions>,
      WidgetPreviewError | null
    >((error) => useCompileErrorExtensions(error), {
      initialProps: compileError(1),
    });
    expect(result.current).toHaveLength(1);
    rerender(null);
    expect(result.current).toEqual([]);
  });
});
