/**
 * TBEL completion tests — the source is exercised directly through a
 * CompletionContext (constructed headlessly; the CodeMirror docs bless this
 * for testing completion sources) plus the languageData wiring that makes
 * the editor's basic-setup autocompletion discover it.
 */
import {
  CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import {
  TBEL_DEFAULT_CONTEXT_VARIABLES,
  tbelCompletionSource,
} from './completion';
import { tbel } from './index';
import { TBEL_UTIL_FUNCTIONS } from './tokens';

function contextFor(doc: string, explicit = false): CompletionContext {
  return new CompletionContext(
    EditorState.create({ doc }),
    doc.length,
    explicit,
  );
}

function labelsFor(result: CompletionResult | null): string[] {
  return (result?.options ?? []).map((option) => String(option.label));
}

describe('tbel completion source', () => {
  it('offers the default context variables and the TBEL util functions', async () => {
    const labels = labelsFor(await tbelCompletionSource()(contextFor('me')));
    for (const variable of TBEL_DEFAULT_CONTEXT_VARIABLES) {
      expect(labels).toContain(variable);
    }
    for (const util of TBEL_UTIL_FUNCTIONS) {
      expect(labels).toContain(util);
    }
  });

  it('returns null when there is no word and completion was not explicit', async () => {
    const source = tbelCompletionSource();
    expect(await source(contextFor(''))).toBeNull();
    expect(await source(contextFor('return ;'))).toBeNull();
  });

  it('returns the full list on an explicit request at an empty word', async () => {
    const labels = labelsFor(
      await tbelCompletionSource()(contextFor('', true)),
    );
    expect(labels).toContain('msg');
    expect(labels).toContain('decodeToString');
  });

  it('anchors replacements at the word start', async () => {
    const doc = 'return par';
    const result = await tbelCompletionSource()(contextFor(doc));
    expect(result?.from).toBe(doc.length - 'par'.length);
    expect(result?.validFor).toBeInstanceOf(RegExp);
  });

  it('allows widening the context variables for nodes with other args', async () => {
    const source = tbelCompletionSource({ contextVariables: ['prevCtx'] });
    const labels = labelsFor(await source(contextFor('p')));
    expect(labels).toContain('prevCtx');
    expect(labels).not.toContain('msg');
    expect(labels).toContain('raiseError');
  });

  it('exposes the source through languageData for the basic-setup autocompletion', async () => {
    const doc = 'dec';
    const state = EditorState.create({ doc, extensions: [tbel()] });
    const sources = state.languageDataAt<
      (ctx: CompletionContext) => Promise<CompletionResult | null>
    >('autocomplete', doc.length);
    const source = sources.find((candidate) => candidate !== null);
    expect(source).toBeDefined();
    if (!source) {
      return;
    }
    const labels = labelsFor(await source(contextFor(doc)));
    expect(labels).toContain('decodeToString');
    expect(labels).toContain('metadata');
  });
});
