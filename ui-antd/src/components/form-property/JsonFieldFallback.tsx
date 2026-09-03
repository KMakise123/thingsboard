/**
 * JsonFieldFallback — the per-field JSON source editor (spec §4.5: any field
 * can switch to a JSON source mode; mirrors the fallback TB UI reaches for
 * when a node/widget has no dedicated control). Backed by the shared
 * CodeEditor (json language).
 *
 * Source text is local component state: the value round-trips only on
 * successful parse — invalid JSON shows an inline error and does NOT
 * propagate (half-written sources never corrupt the draft). External value
 * changes (undo/redo, sibling edits) re-sync the text; an untouched sibling
 * render keeps the same value reference and therefore the in-progress text.
 */
import { Alert } from 'antd';

import { useRef, useState } from 'react';

import { CodeEditor } from '../code-editor';

export interface JsonFieldFallbackProps {
  value: unknown;
  onChange: (next: unknown) => void;
  /** CSS height hint for the embedded CodeEditor. */
  height?: string;
  readOnly?: boolean;
  /** Prefix for data-testid hooks: `<prefix>-json-editor` / `<prefix>-json-error`. */
  testIdPrefix?: string;
}

export function stringifyJsonValue(value: unknown): string {
  if (value === undefined) {
    return '';
  }
  return JSON.stringify(value, null, 2) ?? '';
}

export function JsonFieldFallback({
  value,
  onChange,
  height,
  readOnly = false,
  testIdPrefix = 'field',
}: JsonFieldFallbackProps) {
  const [text, setText] = useState(() => stringifyJsonValue(value));
  const [error, setError] = useState<string | null>(null);
  // Last value seen from outside or emitted by us — reference identity is
  // the change signal (the renderer preserves references of untouched keys).
  const lastSeen = useRef<unknown>(value);

  if (value !== lastSeen.current) {
    lastSeen.current = value;
    setText(stringifyJsonValue(value));
    setError(null);
  }

  const handleTextChange = (next: string) => {
    setText(next);
    try {
      const parsed: unknown = JSON.parse(next);
      lastSeen.current = parsed;
      setError(null);
      onChange(parsed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <div>
      <CodeEditor
        value={text}
        onChange={handleTextChange}
        language="json"
        height={height}
        readOnly={readOnly}
        data-testid={`${testIdPrefix}-json-editor`}
      />
      {error !== null && (
        <Alert
          type="error"
          showIcon
          role="alert"
          data-json-error="true"
          data-testid={`${testIdPrefix}-json-error`}
          message={`Invalid JSON: ${error}`}
          style={{ marginTop: 4 }}
        />
      )}
    </div>
  );
}
