/**
 * JS/TSX language extension indirection. This is the ONLY file that imports
 * @codemirror/lang-javascript, so the CodeEditor contract tests can mock
 * this module instead of loading the package (which may not exist on disk
 * yet in a wave-1 worktree — Vite rejects unresolvable imports at transform
 * time, before vi.mock applies).
 */
import { javascript } from '@codemirror/lang-javascript';
import type { Extension } from '@uiw/react-codemirror';

export interface JavaScriptLanguageOptions {
  /** enable JSX fragments/attributes (M9 `tsx` language). */
  jsx?: boolean;
  /** enable TypeScript syntax (M9 `tsx` language). */
  typescript?: boolean;
}

export function javascriptExtensions(
  options?: JavaScriptLanguageOptions,
): Extension[] {
  return [
    javascript({
      jsx: options?.jsx ?? false,
      typescript: options?.typescript ?? false,
    }),
  ];
}
