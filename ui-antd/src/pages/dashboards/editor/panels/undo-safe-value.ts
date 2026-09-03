/**
 * useUndoSafeValue — P6 pattern (M7 brief §5): antd controlled inputs bound
 * to EditorSession values vs. undo landing while the field is focused.
 *
 * The naive binding (`value={draft.field}`) is correct but has one rough
 * edge: while the user is typing, every keystroke round-trips through the
 * session (coalesced), and an undo/redo of a DIFFERENT path (hotkey, another
 * field, canvas edit) re-writes the controlled value under the caret. This
 * hook keeps a small typing mirror:
 *
 *  - while focused, the mirror shadows the incoming value ONLY until the
 *    session value diverges from what we last propagated — divergence means
 *    an external commit (undo/redo/coalesce echo from elsewhere) and the
 *    mirror is dropped, so the field adopts the reverted session value;
 *  - on blur / focus loss the mirror is dropped too (field = session value);
 *  - normal typing never diverges (propagated string === echo), so the DOM
 *    value is never re-written under the caret — no caret jump.
 *
 * The mirror is cleared during render (the documented React "adjust state
 * when a prop changes" pattern) so an undo reflects in the SAME paint.
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
