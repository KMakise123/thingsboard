/**
 * useUndoSafeValue — P6 pattern, adapted for the widget editor metadata
 * sidebar. COPIED from pages/dashboards/editor/panels/undo-safe-value.ts
 * (page-local there; the M10 cross-cutting pass unifies the copies — the
 * M9 brief forbids touching dashboards files from this wave).
 *
 * antd controlled inputs bound to EditorSession values vs. undo landing
 * while the field is focused: while focused, a small typing mirror shadows
 * the incoming value ONLY until the session value diverges from what we
 * last propagated (an external commit — undo/redo/echo from elsewhere);
 * on blur / divergence the mirror drops and the field adopts the session
 * value. Normal typing never diverges, so the DOM value is never
 * re-written under the caret — no caret jump.
 */
import { useRef, useState } from 'react';

export interface UndoSafeValue {
  /** What the input should display right now. */
  value: string;
  focused: boolean;
  /** Call from the input's onChange — mirrors + propagates in one step. */
  onChange: (next: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}

export function useUndoSafeValue(
  incoming: string,
  onEdit: (next: string) => void,
): UndoSafeValue {
  const [override, setOverride] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  // Last string we emitted to the session (or saw from it) — the divergence
  // signal between "our own echo" and "an external commit".
  const echoRef = useRef(incoming);

  if (incoming !== echoRef.current) {
    echoRef.current = incoming;
    if (override !== null) {
      setOverride(null);
    }
  }

  const value = focused && override !== null ? override : incoming;

  return {
    value,
    focused,
    onChange: (next) => {
      echoRef.current = next;
      setOverride(next);
      onEdit(next);
    },
    onFocus: () => setFocused(true),
    onBlur: () => {
      setFocused(false);
      setOverride(null);
    },
  };
}
