/**
 * TBEL tokenizer tests — assert the syntax-tree token sequence produced by
 * the StreamLanguage port (no DOM rendering; node names are the keys of
 * TBEL_TOKEN_TABLE per the CodeMirror stream-parser contract).
 */
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { tbelLanguage } from './highlight';

interface Token {
  name: string;
  text: string;
}

function tokenize(doc: string): Token[] {
  const state = EditorState.create({ doc, extensions: [tbelLanguage] });
  ensureSyntaxTree(state, doc.length);
  const tokens: Token[] = [];
  syntaxTree(state).iterate({
    enter(node) {
      if (node.name === 'Document') {
        return;
      }
      tokens.push({ name: node.name, text: doc.slice(node.from, node.to) });
    },
  });
  return tokens;
}

function names(doc: string): string[] {
  return tokenize(doc).map((token) => token.name);
}

describe('tbel highlight tokenizer', () => {
  it('tokenizes the JS core (keyword/identifier/operator/number/punctuation)', () => {
    expect(names('var temp = 1;')).toEqual([
      'tbelKeyword',
      'tbelVariableName',
      'tbelOperator',
      'tbelNumber',
      'tbelPunctuation',
    ]);
  });

  it('colors TBEL-only keywords foreach and until like keywords', () => {
    // Adjacent same-type tokens merge in the stream-language tree (CodeMirror
    // default), so the braces arrive as one `tbelPunctuation` node.
    const tokens = tokenize('foreach (x until 10) {}');
    expect(tokens.map((tk) => tk.name)).toEqual([
      'tbelKeyword',
      'tbelPunctuation',
      'tbelVariableName',
      'tbelKeyword',
      'tbelNumber',
      'tbelPunctuation',
      'tbelPunctuation',
    ]);
    expect(tokens.at(-1)?.text).toBe('{}');
  });

  it('colors the brief-pinned Java types as type names', () => {
    const tokens = tokenize('int n = 0; double d = 22.4; String s = "x";');
    expect(
      tokens.filter((tk) => tk.name === 'tbelType').map((tk) => tk.text),
    ).toEqual(['int', 'double', 'String']);
    expect(names('List<Map<String, Object>> vars;')).toContain('tbelType');
    expect(names('ArrayList<HashMap<Long, Float>> pairs;')).toContain(
      'tbelType',
    );
  });

  it('colors TBEL util functions and keeps property access as property names', () => {
    const tokens = tokenize('decodeToString(msg.payload)');
    expect(tokens[0]).toEqual({ name: 'tbelUtil', text: 'decodeToString' });
    // Even util/type/keyword names after a dot are plain properties.
    const afterDot = tokenize('msg.parseInt');
    expect(afterDot.map((tk) => tk.name)).toEqual([
      'tbelVariableName',
      'tbelOperator',
      'tbelPropertyName',
    ]);
  });

  it('routes true/false/null to their own literal tokens', () => {
    expect(names('return true == false && x != null;')).toEqual([
      'tbelKeyword',
      'tbelBool',
      'tbelOperator',
      'tbelBool',
      'tbelOperator',
      'tbelVariableName',
      'tbelOperator',
      'tbelNull',
      'tbelPunctuation',
    ]);
  });

  it('tokenizes line and multi-line block comments', () => {
    expect(names('// note')).toEqual(['tbelLineComment']);
    // A block comment spanning lines yields one token per whitespace-free
    // chunk (stream-language tree nodes only merge when contiguous).
    const block = names('/* a\nb */ var x;');
    expect(block.filter((name) => name === 'tbelBlockComment')).toHaveLength(3);
    expect(block.find((name) => name !== 'tbelBlockComment')).toBe(
      'tbelKeyword',
    );
  });

  it('keeps hexadecimal, float and exponent numbers one number token', () => {
    expect(names('0xFF')).toEqual(['tbelNumber']);
    expect(names('22.4e-2')).toEqual(['tbelNumber']);
  });

  it('tokenizes single, double and template strings with escapes', () => {
    // The template placeholder is literal TBEL source under test, not a
    // JavaScript interpolation, so it is assembled to appease the linter.
    const placeholder = '$' + '{x}';
    const doc = `"a\\"b" + 'c' + \`tpl ${placeholder}\`;`;
    const tokens = tokenize(doc);
    expect(
      tokens.filter((tk) => tk.name === 'tbelString').map((tk) => tk.text),
    ).toEqual(['"a\\"b"', "'c'", `\`tpl ${placeholder}\``]);
  });

  it('marks unknown characters invalid instead of failing the parse', () => {
    expect(names('msg @')).toEqual(['tbelVariableName', 'tbelInvalid']);
  });

  it('handles a realistic TBEL filter snippet end to end', () => {
    const doc = [
      '// filter by temperature',
      '/* tolerances */',
      'var humidity = msg.humidity;',
      'if (msg.temperature > 20 && metadata.deviceType == "default") {',
      '  return true;',
      '}',
      'return false;',
    ].join('\n');
    const all = names(doc);
    expect(all[0]).toBe('tbelLineComment');
    expect(all[1]).toBe('tbelBlockComment');
    expect(all).toContain('tbelKeyword');
    expect(all).toContain('tbelPropertyName');
    expect(all.filter((name) => name === 'tbelBool')).toHaveLength(2);
  });
});
