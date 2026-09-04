/**
 * Compile-error → CodeMirror gutter diagnostics (spec §5.5 编译错).
 *
 * The TSX tab's CodeEditor takes the returned extensions; the diagnostics
 * come from the preview's structured compile error (1-based editor line,
 * P1 parity — see compile.ts). A null/non-compile error yields NO
 * extension at all (empty diagnostics) — typing clears the stale mark and
 * the next ctrl+enter re-lints through the fresh error object.
 */
import { linter, type Diagnostic } from '@codemirror/lint';
import type { Extension, Text } from '@codemirror/state';
import { useMemo } from 'react';

import type { WidgetPreviewError } from './index';

/** Diagnostics for one structured compile error against a document. */
export function compileErrorDiagnostics(
  doc: Text,
  error: WidgetPreviewError,
): Diagnostic[] {
  if (error.kind !== 'compile' || error.line === undefined) {
    return [];
  }
  const line = doc.line(Math.min(Math.max(1, error.line), doc.lines));
  return [
    {
      from: line.from,
      to: line.to,
      severity: 'error',
      message: error.message,
      source: 'widget-compile',
    },
  ];
}

/**
 * Extensions for the TSX CodeEditor. Identity-stable per error object —
 * the shell's previewError state changes exactly when a run reports, so
 * CodeMirror reconfigures once per new error, never per keystroke.
 */
export function useCompileErrorExtensions(
  error: WidgetPreviewError | null,
): Extension[] {
  return useMemo(() => {
    if (error === null || error.kind !== 'compile') {
      return [];
    }
    return [
      linter((view) => compileErrorDiagnostics(view.state.doc, error)),
    ];
  }, [error]);
}
