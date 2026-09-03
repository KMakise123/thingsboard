/**
 * TBEL highlighter — a CodeMirror StreamLanguage tokenizer whose word
 * classes are ported from the ui-ngx Ace TBEL mode:
 * `mode-tbel.js` is stock JS highlight rules (TBEL is a JS superset), and
 * the TBEL-specific layer is the util-function rule (`tb.tbel-utils-func`)
 * fed from `tbel-utils.models.ts`. Accordingly this tokenizer colors
 * keywords/strings/numbers like JS, gives the brief-pinned Java types a
 * typeName color, and gives TBEL util functions a function color.
 *
 * Deliberate simplification vs the Ace mode: template literals are one
 * string token (`${}` interpolations are not re-highlighted), and regex
 * literals are not specially tokenized.
 *
 * Token names are all in `TBEL_TOKEN_TABLE` (keys become the syntax-tree
 * node names, which the tokenize tests assert on); tag values follow the
 * standard @lezer/highlight tags so any CM theme styles them.
 */
import { StreamLanguage } from '@codemirror/language';
import { type Tag, tags as t } from '@lezer/highlight';
import { tbelCompletionSource } from './completion';
import {
  TBEL_KEYWORDS,
  TBEL_LITERAL_KEYWORDS,
  TBEL_TYPES,
  TBEL_UTIL_FUNCTIONS,
} from './tokens';

export const TBEL_TOKEN_TABLE: Record<string, Tag | readonly Tag[]> = {
  tbelKeyword: t.keyword,
  tbelBool: t.bool,
  tbelNull: t.null,
  tbelType: t.typeName,
  tbelUtil: t.function(t.variableName),
  tbelNumber: t.number,
  tbelString: t.string,
  tbelLineComment: t.lineComment,
  tbelBlockComment: t.blockComment,
  tbelOperator: t.operator,
  tbelPunctuation: t.punctuation,
  tbelPropertyName: t.propertyName,
  tbelVariableName: t.variableName,
  tbelInvalid: t.invalid,
};

interface TbelState {
  /** Inside a multi-line /* … *​/ comment. */
  inBlockComment: boolean;
  /** The previous token was a '.', so an identifier is a property name. */
  afterDot: boolean;
}

const KEYWORDS = new Set(TBEL_KEYWORDS);
const BOOL_KEYWORDS = new Set(TBEL_LITERAL_KEYWORDS.bool);
const NULL_KEYWORDS = new Set(TBEL_LITERAL_KEYWORDS.null);
const TYPES = new Set(TBEL_TYPES);
const UTILS = new Set(TBEL_UTIL_FUNCTIONS);

const IDENTIFIER_RE = /^[a-zA-Z_$][\w$]*/;
const NUMBER_RE =
  /^0[xX][0-9a-fA-F]+|^0[bB][01]+|^0[oO][0-7]+|^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/;
const MULTI_OPERATOR_RE =
  /^(?:=>|===|!==|\*\*|==|!=|<=|>=|&&|\|\||\?\?|\+\+|--|[-+*/%<>&|^]=)/;
const SINGLE_OPERATOR_CHARS = '+-*/%=<>!~?:&|^';

export const tbelLanguage = StreamLanguage.define<TbelState>({
  startState: () => ({ inBlockComment: false, afterDot: false }),
  token(stream, state) {
    if (stream.eatSpace()) {
      return null;
    }
    // A '.' arms the property position only until the next token (snapshot
    // + reset so any non-identifier token ends it; the '.' case re-arms).
    const afterDot = state.afterDot;
    state.afterDot = false;
    if (state.inBlockComment) {
      if (stream.match(/^.*?\*\//)) {
        state.inBlockComment = false;
      } else {
        stream.skipToEnd();
      }
      return 'tbelBlockComment';
    }
    if (stream.match('//')) {
      stream.skipToEnd();
      return 'tbelLineComment';
    }
    if (stream.match('/*')) {
      if (!stream.match(/^.*?\*\//)) {
        state.inBlockComment = true;
      }
      return 'tbelBlockComment';
    }
    if (
      stream.match(/^"(?:[^"\\]|\\.)*"?/) ||
      stream.match(/^'(?:[^'\\]|\\.)*'?/) ||
      stream.match(/^`(?:[^`\\]|\\.)*`?/)
    ) {
      return 'tbelString';
    }
    if (stream.match(NUMBER_RE)) {
      return 'tbelNumber';
    }
    if (stream.match(MULTI_OPERATOR_RE)) {
      return 'tbelOperator';
    }
    if (stream.match(IDENTIFIER_RE)) {
      if (afterDot) {
        return 'tbelPropertyName';
      }
      const word = stream.current();
      if (BOOL_KEYWORDS.has(word)) {
        return 'tbelBool';
      }
      if (NULL_KEYWORDS.has(word)) {
        return 'tbelNull';
      }
      if (KEYWORDS.has(word)) {
        return 'tbelKeyword';
      }
      if (TYPES.has(word)) {
        return 'tbelType';
      }
      if (UTILS.has(word)) {
        return 'tbelUtil';
      }
      return 'tbelVariableName';
    }
    const ch = stream.next();
    if (ch === undefined) {
      return null;
    }
    if (ch === '.') {
      state.afterDot = true;
      return 'tbelOperator';
    }
    if ('()[]{},;'.includes(ch)) {
      return 'tbelPunctuation';
    }
    if (SINGLE_OPERATOR_CHARS.includes(ch)) {
      return 'tbelOperator';
    }
    return 'tbelInvalid';
  },
  languageData: {
    autocomplete: tbelCompletionSource(),
    commentTokens: { line: '//', block: { open: '/*', close: '*/' } },
  },
  tokenTable: TBEL_TOKEN_TABLE,
});
