/**
 * TBEL identifier tables — the semantic payload behind the highlighter and
 * the completion source (M8 brief §3 wave-1 S; ADR 0004 §3).
 *
 * Sources (ui-ngx 对照移植) and trimming rules:
 *
 * - `TBEL_KEYWORDS`: the full `scanKeyword` list of the Ace linter worker
 *   `ui-ngx/src/app/shared/models/ace/tbel/worker-tbel.js` (a JSHint fork).
 *   TBEL is a JS superset; the list adds `foreach` / `until` over stock JS.
 *   `true` / `false` / `null` sit in that list too; the highlighter routes
 *   them to bool/null tags (they stay here so the table mirrors the source).
 * - `TBEL_TYPES`: curated Java-backed types TBEL scripts touch (TBEL compiles
 *   to a Java engine — primitives `int/double/long/float/boolean/byte/short/
   char`, boxed wrappers, and the collection classes). The brief pins the
 *   first block (int…HashMap) and leaves the rest to this curated set.
 * - `TBEL_UTIL_FUNCTIONS`: the full key set of `tbelEditorCompletions` in
 *   `ui-ngx/src/app/shared/models/ace/tbel/tbel-utils.models.ts` — that file
 *   is already ThingsBoard's curated editor surface for TBEL (the runtime
 *   itself exposes hundreds of Java methods; full parity is explicitly NOT a
 *   goal per the M8 brief). One list feeds both highlighting (util-function
 *   color, mirroring ui-ngx's `tb.tbel-utils-func` rule) and completion.
 *
 * Not included (deliberate): TBEL helper *objects* (`Arrays`, `Strings`,
 * `Dates`, …) stay plain identifiers, matching the ui-ngx Ace mode, which
 * gives them no special token either.
 */

export const TBEL_KEYWORDS: readonly string[] = [
  'async',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'finally',
  'for',
  'foreach',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'let',
  'new',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'try',
  'typeof',
  'until',
  'var',
  'void',
  'while',
  'with',
  'yield',
];

/** Literal keywords routed to their own tags by the highlighter. */
export const TBEL_LITERAL_KEYWORDS: {
  bool: readonly string[];
  null: readonly string[];
} = {
  bool: ['true', 'false'],
  null: ['null'],
};

export const TBEL_TYPES: readonly string[] = [
  // Java primitives (brief-pinned block)
  'int',
  'double',
  'long',
  'float',
  'boolean',
  'byte',
  'short',
  'char',
  // Boxed wrappers
  'Integer',
  'Long',
  'Double',
  'Float',
  'Boolean',
  'Object',
  'String',
  // Collections / maps (brief-pinned: List/Map/ArrayList/HashMap + friends)
  'Collection',
  'Iterator',
  'List',
  'ArrayList',
  'LinkedList',
  'Map',
  'HashMap',
  'LinkedHashMap',
  'TreeMap',
  'Set',
  'HashSet',
];

export const TBEL_UTIL_FUNCTIONS: readonly string[] = [
  'atob',
  'base64ToBytes',
  'base64ToBytesList',
  'base64ToHex',
  'btoa',
  'bytesToBase64',
  'bytesToExecutionArrayList',
  'bytesToHex',
  'bytesToString',
  'decodeToJson',
  'decodeToString',
  'decodeURI',
  'doubleToHex',
  'encodeURI',
  'floatToHex',
  'hexToBase64',
  'hexToBytes',
  'hexToBytesArray',
  'intLongToRadixString',
  'intToHex',
  'isBinary',
  'isDecimal',
  'isHexadecimal',
  'isInsideCircle',
  'isInsidePolygon',
  'isNaN',
  'isOctal',
  'longToHex',
  'padEnd',
  'padStart',
  'parseBigEndianHexToDouble',
  'parseBigEndianHexToFloat',
  'parseBigEndianHexToInt',
  'parseBigEndianHexToLong',
  'parseBinaryArrayToInt',
  'parseByteToBinaryArray',
  'parseBytesIntToFloat',
  'parseBytesLongToDouble',
  'parseBytesToBinaryArray',
  'parseBytesToDouble',
  'parseBytesToFloat',
  'parseBytesToInt',
  'parseBytesToLong',
  'parseDouble',
  'parseFloat',
  'parseHexIntLongToFloat',
  'parseHexToDouble',
  'parseHexToFloat',
  'parseHexToInt',
  'parseHexToLong',
  'parseLittleEndianHexToDouble',
  'parseLittleEndianHexToFloat',
  'parseLittleEndianHexToInt',
  'parseLittleEndianHexToLong',
  'parseInt',
  'parseLong',
  'parseLongToBinaryArray',
  'printUnsignedBytes',
  'raiseError',
  'stringToBytes',
  'toFixed',
  'toInt',
  'toFlatMap',
];
