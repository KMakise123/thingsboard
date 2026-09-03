/**
 * TBEL completion source (CodeMirror autocomplete). Top-level identifiers
 * only: the rule-node context variables (msg/metadata/msgType by default)
 * plus the shared TBEL utility-function list (see ./tokens.ts for the
 * trimming rules). Prefix filtering is left to CodeMirror's own completion
 * matching — the source returns the full candidate list plus `validFor`.
 */
import type {
  CompletionContext,
  CompletionResult,
  CompletionSource,
} from '@codemirror/autocomplete';
import { TBEL_UTIL_FUNCTIONS } from './tokens';

/** Context variables of the common script nodes (filter/switch/transform/log). */
export const TBEL_DEFAULT_CONTEXT_VARIABLES: readonly string[] = [
  'msg',
  'metadata',
  'msgType',
];

export interface TbelCompletionOptions {
  /**
   * Identifier list offered as context variables. Rule nodes with different
   * signatures (e.g. the generator node) can widen this without touching
   * the shared list.
   */
  contextVariables?: readonly string[];
}

export function tbelCompletionSource(
  options: TbelCompletionOptions = {},
): CompletionSource {
  const contextVariables =
    options.contextVariables ?? TBEL_DEFAULT_CONTEXT_VARIABLES;
  const optionList: CompletionResult['options'] = [
    ...contextVariables.map((label) => ({
      label,
      type: 'variable',
      detail: 'context',
    })),
    ...TBEL_UTIL_FUNCTIONS.map((label) => ({
      label,
      type: 'function',
      detail: 'TBEL',
    })),
  ];
  return (context: CompletionContext): CompletionResult | null => {
    const word = context.matchBefore(/[\w$]+/);
    // No word under the cursor: stay quiet unless the user asked for
    // completions explicitly (Ctrl+Space) — then offer the full list.
    if (!word && !context.explicit) {
      return null;
    }
    return {
      from: word?.from ?? context.pos,
      options: optionList,
      validFor: /^[\w$]*$/,
    };
  };
}
