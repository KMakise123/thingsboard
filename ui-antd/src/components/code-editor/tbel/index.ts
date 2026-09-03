/**
 * TBEL language support for the shared CodeEditor. Combines the StreamLanguage
 * highlighter with the completion source exposed through `languageData` —
 * CodeMirror's autocompletion (already part of the editor's basic setup)
 * picks the source up from there, so no second `autocompletion()` extension
 * is added on top of it.
 */
import { LanguageSupport } from '@codemirror/language';

import { tbelLanguage } from './highlight';

export {
  TBEL_DEFAULT_CONTEXT_VARIABLES,
  type TbelCompletionOptions,
  tbelCompletionSource,
} from './completion';
export { TBEL_TOKEN_TABLE, tbelLanguage } from './highlight';
export {
  TBEL_KEYWORDS,
  TBEL_LITERAL_KEYWORDS,
  TBEL_TYPES,
  TBEL_UTIL_FUNCTIONS,
} from './tokens';

export function tbel(): LanguageSupport {
  return new LanguageSupport(tbelLanguage);
}
