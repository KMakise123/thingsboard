/**
 * TEMPORARY type shim for @codemirror/lang-javascript (M8 wave-1 S): the
 * runtime dependency is installed by the parallel F agent and is not on disk
 * yet, so tsc would fail on the static import in ./javascript-language.
 * The signature mirrors the real package's d.ts (javascript(config?):
 * LanguageSupport). DELETE THIS FILE once the F wave merges the dependency —
 * an ambient `declare module` would otherwise shadow the real types forever.
 */
declare module '@codemirror/lang-javascript' {
  import type { LanguageSupport } from '@codemirror/language';

  export function javascript(config?: {
    jsx?: boolean;
    typescript?: boolean;
  }): LanguageSupport;
}
