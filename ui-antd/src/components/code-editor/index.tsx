/**
 * CodeEditor — thin controlled CodeMirror 6 wrapper (ADR 0004 §3 bullet 2).
 *
 * The editor suite (dashboard / rule-chain / widget editors) shares this one
 * component; languages drop in as new entries in `LANGUAGE_EXTENSIONS` plus
 * a widened `CodeEditorLanguage` union — no API change. M8 adds
 * `javascript` (@codemirror/lang-javascript, via ./javascript-language) and
 * `tbel` (in-house stream language, see ./tbel).
 *
 * Text-in/text-out by design: JSON typing (parse/stringify/error surface) is
 * the caller's job (see src/components/form-property/JsonFieldFallback).
 *
 * Styling note: CodeMirror's default theme is kept for M7 (no inline colors —
 * editor chrome theming via the antd token layer is deferred).
 */
import { json } from '@codemirror/lang-json';
import CodeMirror, { type Extension } from '@uiw/react-codemirror';

import { javascriptExtensions } from './javascript-language';
import { tbel } from './tbel';

export type CodeEditorLanguage = 'json' | 'javascript' | 'tbel';

/**
 * language → extension map. Adding a language later (M9) is one entry
 * here; the component contract stays untouched.
 */
const LANGUAGE_EXTENSIONS: Record<CodeEditorLanguage, Extension[]> = {
  json: [json()],
  javascript: javascriptExtensions(),
  tbel: [tbel()],
};

export interface CodeEditorProps {
  /** Controlled source text. */
  value: string;
  onChange?: (value: string) => void;
  language?: CodeEditorLanguage;
  /** CSS height for the editor surface, e.g. '200px' (CodeMirror hint). */
  height?: string;
  readOnly?: boolean;
  /** Extra CM extensions (diagnostics/completions in M8/M9), merged after the language ones. */
  extensions?: Extension[];
  placeholder?: string;
  'data-testid'?: string;
}

export function CodeEditor({
  value,
  onChange,
  language,
  height,
  readOnly = false,
  extensions,
  placeholder,
  'data-testid': dataTestId = 'code-editor',
}: CodeEditorProps) {
  const languageExtensions = language ? LANGUAGE_EXTENSIONS[language] : [];
  return (
    <div data-testid={dataTestId}>
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={[...languageExtensions, ...(extensions ?? [])]}
        height={height}
        placeholder={placeholder}
        readOnly={readOnly}
        editable={!readOnly}
        basicSetup
      />
    </div>
  );
}
