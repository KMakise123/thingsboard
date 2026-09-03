/**
 * JS language extension indirection. This is the ONLY file that imports
 * @codemirror/lang-javascript (installed by the M8 wave-1 F agent), so the
 * CodeEditor contract tests can mock this module instead of loading the
 * package (which may not exist on disk yet in a wave-1 worktree — Vite
 * rejects unresolvable imports at transform time, before vi.mock applies).
 *
 * NOTE: `src/components/code-editor/lang-javascript.d.ts` is a temporary
 * type shim for this package; once the F wave lands the dependency in
 * package.json, the shim must be deleted so the real types win.
 */
import { javascript } from '@codemirror/lang-javascript';
import type { Extension } from '@uiw/react-codemirror';

export function javascriptExtensions(): Extension[] {
  return [javascript({ jsx: false })];
}
