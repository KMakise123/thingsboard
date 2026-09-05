/**
 * SCADA symbol metadata pipeline — pure functions + data model (M11
 * wave-2D). Ported from ui-ngx
 * `components/widget/lib/scada/scada-symbol.models.ts:119-427`; the wire
 * contract is preserved verbatim so symbols produced/consumed here are
 * byte-compatible with upstream TB:
 *
 *   - metadata lives in a `<tb:metadata>` element as pretty-printed
 *     (2-space) JSON wrapped in a CDATA section, first child of the svg
 *     root;
 *   - the root carries `xmlns:tb="https://thingsboard.io/svg"` (added on
 *     demand by `applyTbNamespaceToSvgContent`);
 *   - missing metadata falls back to `emptyMetadata()` sized from the
 *     root viewBox (else width/height): size = max(round(dimension/100), 1),
 *     else the 3x3 default.
 *
 * Two deliberate deviations from upstream, both registered in the M11
 * report:
 *   1. a `]]>` sequence inside metadata strings is split across two CDATA
 *      sections (the standard escape; parsers reassemble the original
 *      text) — upstream emits the raw sequence and produces an
 *      unparseable document;
 *   2. the pipeline is implemented with string/regex surgery instead of
 *      DOMParser/CDATASection DOM mutation — the produced documents are
 *      identical for well-formed input, the function is deterministic
 *      (byte-stable across repeated updates), and it sidesteps
 *      `tb:`-prefixed-element parsing, which some DOM implementations
 *      (happy-dom among them) reject. Well-formedness of arbitrary user
 *      XML is checked by `validateSvgDocument`, which treats a
 *      parsererror as prefix-induced when the same content parses clean
 *      with the `tb:` prefixes stripped.
 *
 * Everything here is pure string work — no framework, no network — so the
 * editor page, the canvas serializer and the future scada runtime can all
 * share it.
 */

import type { FormProperty } from '@/components/form-property/types';

/** Upstream `ValueType` (constants.ts:242) — behavior payload typing. */
export enum ValueType {
  STRING = 'STRING',
  INTEGER = 'INTEGER',
  DOUBLE = 'DOUBLE',
  BOOLEAN = 'BOOLEAN',
  JSON = 'JSON',
}

/** Upstream `GetValueAction` (action-widget-settings.models.ts:22). */
export enum GetValueAction {
  DO_NOTHING = 'DO_NOTHING',
  EXECUTE_RPC = 'EXECUTE_RPC',
  GET_ATTRIBUTE = 'GET_ATTRIBUTE',
  GET_TIME_SERIES = 'GET_TIME_SERIES',
  GET_ALARM_STATUS = 'GET_ALARM_STATUS',
  GET_DASHBOARD_STATE = 'GET_DASHBOARD_STATE',
  GET_DASHBOARD_STATE_OBJECT = 'GET_DASHBOARD_STATE_OBJECT',
}

/** Upstream `SetValueAction` (action-widget-settings.models.ts:103). */
export enum SetValueAction {
  EXECUTE_RPC = 'EXECUTE_RPC',
  SET_ATTRIBUTE = 'SET_ATTRIBUTE',
  ADD_TIME_SERIES = 'ADD_TIME_SERIES',
}

/** Upstream `DataToValueType` (action-widget-settings.models.ts:78). */
export enum DataToValueType {
  NONE = 'NONE',
  FUNCTION = 'FUNCTION',
}

/** Upstream `ValueToDataType` (action-widget-settings.models.ts:127). */
export enum ValueToDataType {
  VALUE = 'VALUE',
  CONSTANT = 'CONSTANT',
  FUNCTION = 'FUNCTION',
  NONE = 'NONE',
}

/** Upstream `WidgetActionType` (widget.models.ts:613). */
export enum WidgetActionType {
  doNothing = 'doNothing',
  openDashboardState = 'openDashboardState',
  updateDashboardState = 'updateDashboardState',
  openDashboard = 'openDashboard',
  custom = 'custom',
  customPretty = 'customPretty',
  mobileAction = 'mobileAction',
  openURL = 'openURL',
  placeMapItem = 'placeMapItem',
}

/** Upstream `AttributeScope` (telemetry.models.ts:59). */
export enum AttributeScope {
  CLIENT_SCOPE = 'CLIENT_SCOPE',
  SERVER_SCOPE = 'SERVER_SCOPE',
  SHARED_SCOPE = 'SHARED_SCOPE',
}

/**
 * Behavior "get value" default settings. Upstream models these as a union
 * of per-action interfaces; the editor only stores/edits the JSON, so the
 * known keys + an open index signature (exact wire shape) is the honest
 * structural mirror.
 */
export interface GetValueSettings<T = any> {
  action?: GetValueAction | string;
  defaultValue?: T;
  executeRpc?: {
    method?: string;
    requestTimeout?: number;
    requestPersistent?: boolean;
    persistentPollingInterval?: number;
    [key: string]: unknown;
  };
  getAttribute?: {
    key?: string;
    scope?: AttributeScope | string | null;
    [key: string]: unknown;
  };
  getTimeSeries?: { key?: string; [key: string]: unknown };
  getAlarmStatus?: {
    severityList?: unknown;
    typeList?: unknown;
    [key: string]: unknown;
  };
  dataToValue?: {
    type?: DataToValueType | string;
    compareToValue?: boolean;
    dataToValueFunction?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** Behavior "set value" default settings (same structural mirror policy). */
export interface SetValueSettings {
  action?: SetValueAction | string;
  executeRpc?: {
    method?: string;
    requestTimeout?: number;
    requestPersistent?: boolean;
    persistentPollingInterval?: number;
    [key: string]: unknown;
  };
  setAttribute?: {
    key?: string;
    scope?: AttributeScope | string;
    [key: string]: unknown;
  };
  putTimeSeries?: {
    key?: string;
    scope?: AttributeScope | string;
    [key: string]: unknown;
  };
  valueToData?: {
    type?: ValueToDataType | string;
    constantValue?: unknown;
    valueToDataFunction?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** Widget-action default settings (open structural mirror). */
export interface WidgetActionSettings {
  type?: WidgetActionType | string;
  targetDashboardStateId?: string | null;
  openRightLayout?: boolean;
  setEntityId?: boolean;
  stateEntityParamName?: string | null;
  [key: string]: unknown;
}

export enum ScadaSymbolBehaviorType {
  value = 'value',
  action = 'action',
  widgetAction = 'widgetAction',
}

export const scadaSymbolBehaviorTypes = Object.keys(
  ScadaSymbolBehaviorType,
) as ScadaSymbolBehaviorType[];

export interface ScadaSymbolAction {
  actionFunction?: string;
  action?: string;
}

export interface ScadaSymbolTag {
  tag: string;
  stateRenderFunction?: string;
  actions?: { [trigger: string]: ScadaSymbolAction };
}

export interface ScadaSymbolBehaviorBase {
  id: string;
  name: string;
  hint?: string;
  group?: string;
  type: ScadaSymbolBehaviorType;
}

export interface ScadaSymbolBehaviorValue extends ScadaSymbolBehaviorBase {
  valueType: ValueType;
  defaultGetValueSettings?: GetValueSettings;
  trueLabel?: string;
  falseLabel?: string;
  stateLabel?: string;
}

export interface ScadaSymbolBehaviorAction extends ScadaSymbolBehaviorBase {
  valueType: ValueType;
  defaultSetValueSettings?: SetValueSettings;
  defaultWidgetActionSettings?: WidgetActionSettings;
}

/** Upstream merges both faces into one type (`ScadaSymbolBehavior`). */
export type ScadaSymbolBehavior = ScadaSymbolBehaviorValue &
  ScadaSymbolBehaviorAction;

export interface ScadaSymbolMetadata {
  title: string;
  description?: string;
  searchTags?: string[];
  widgetSizeX: number;
  widgetSizeY: number;
  stateRenderFunction?: string;
  tags: ScadaSymbolTag[];
  behavior: ScadaSymbolBehavior[];
  properties: FormProperty[];
}

export const emptyMetadata = (
  width?: number,
  height?: number,
): ScadaSymbolMetadata => ({
  title: '',
  widgetSizeX: width ? Math.max(Math.round(width / 100), 1) : 3,
  widgetSizeY: height ? Math.max(Math.round(height / 100), 1) : 3,
  tags: [],
  behavior: [],
  properties: [],
});

export interface ScadaSymbolContentData {
  svgRootNode: string;
  innerSvg: string;
}

const svgPartsRegex = /(<svg.*?>)(.*)<\/svg>/gms;

const tbNamespaceRegex =
  /<svg.*(xmlns:tb="https:\/\/thingsboard.io\/svg").*>/gms;

const tbTagRegex = /tb:tag="([^"]*)"/gms;

const tbMetadataRegex = /<tb:metadata[^>]*>.*<\/tb:metadata>/gs;

const TB_NAMESPACE_DECL = 'xmlns:tb="https://thingsboard.io/svg"';

const metadataBodyRegex = /<tb:metadata[^>]*>([\s\S]*?)<\/tb:metadata>/;

const cdataChunkRegex = /<!\[CDATA\[([\s\S]*?)\]\]>/g;

const viewBoxRegex = /viewBox\s*=\s*"([^"]*)"/i;

const svgAttrRegex = (attr: string) =>
  new RegExp(`\\b${attr}\\s*=\\s*"([^"]*)"`, 'i');

/** Concatenate the CDATA sections (or raw text) of a metadata body. */
const metadataBodyText = (body: string): string => {
  cdataChunkRegex.lastIndex = 0;
  const chunks: string[] = [];
  let chunkMatch = cdataChunkRegex.exec(body);
  while (chunkMatch !== null) {
    chunks.push(chunkMatch[1]);
    chunkMatch = cdataChunkRegex.exec(body);
  }
  return chunks.length ? chunks.join('') : body.trim();
};

/** Root-tag sizing facts (viewBox wins over width/height). */
const svgRootSizing = (
  svgRootNode: string,
): { width?: number; height?: number } => {
  const viewBox = svgRootViewBox(svgRootNode);
  if (viewBox?.width && viewBox?.height) {
    return { width: viewBox.width, height: viewBox.height };
  }
  const widthMatch = svgAttrRegex('width').exec(svgRootNode);
  const heightMatch = svgAttrRegex('height').exec(svgRootNode);
  const width = widthMatch ? Number(widthMatch[1]) : NaN;
  const height = heightMatch ? Number(heightMatch[1]) : NaN;
  if (Number.isFinite(width) && Number.isFinite(height) && width && height) {
    return { width, height };
  }
  return {};
};

/** The svg root's `viewBox` as numbers (canvas mount box), or null. */
export interface SvgRootViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const svgRootViewBox = (svgRootNode: string): SvgRootViewBox | null => {
  const viewBoxMatch = viewBoxRegex.exec(svgRootNode);
  if (!viewBoxMatch) {
    return null;
  }
  const parts = viewBoxMatch[1]
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const [x, y, width, height] = parts;
  if (
    parts.length === 4 &&
    [x, y, width, height].every((n) => Number.isFinite(n))
  ) {
    return { x, y, width, height };
  }
  return null;
};

/** The svg root's `fill` attribute value, or null. */
export const svgRootFill = (svgRootNode: string): string | null => {
  const match = svgAttrRegex('fill').exec(svgRootNode);
  return match ? match[1] : null;
};

/**
 * Well-formedness gate for user-edited svg content (save chain + svg/xml
 * mode switch). DOMParser produces a `parsererror` element for broken
 * documents — but some DOM implementations (happy-dom) also emit one for
 * the `tb:`-prefixed element names and the CDATA sections TB symbols
 * legitimately use. When a parsererror shows up, the content is re-parsed
 * with the CDATA bodies replaced by opaque placeholders and the `tb:`
 * prefixes stripped: a clean answer there proves the original error was
 * an implementation limitation, and the document is accepted. Genuinely
 * broken documents fail both parses.
 */
export const validateSvgDocument = (svgContent: string): void => {
  const doc = new DOMParser().parseFromString(svgContent, 'image/svg+xml');
  const parsererror = doc.getElementsByTagName('parsererror');
  if (!parsererror?.length) {
    return;
  }
  const tolerantCopy = svgContent
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, 'metadata')
    .replaceAll('tb:', '');
  const copyDoc = new DOMParser().parseFromString(
    tolerantCopy,
    'image/svg+xml',
  );
  if (copyDoc.getElementsByTagName('parsererror').length) {
    throw new Error(parsererror[0].textContent ?? 'Invalid SVG document.');
  }
};

/**
 * Split a CDATA terminator so a metadata string containing `]]>` cannot
 * break the produced document (two adjacent sections; parsers reassemble
 * the exact original text).
 */
const splitCdataTerminator = (text: string): string =>
  text.replaceAll(']]>', ']]]]><![CDATA[>');

/**
 * Ensure the svg root declares the `tb` namespace. Returns the content
 * unchanged when already declared; throws on non-svg input.
 * (ui-ngx applyTbNamespaceToSvgContent parity, :215-238.)
 */
export const applyTbNamespaceToSvgContent = (svgContent: string): string => {
  svgPartsRegex.lastIndex = 0;
  let svgRootNode: string | undefined;
  let innerSvg = '';
  const match = svgPartsRegex.exec(svgContent);
  if (match != null) {
    if (match.length > 1) {
      svgRootNode = match[1];
    }
    if (match.length > 2) {
      innerSvg = match[2];
    }
  }
  if (!svgRootNode) {
    throw new Error('Invalid SVG document.');
  }
  tbNamespaceRegex.lastIndex = 0;
  const nsMatch = tbNamespaceRegex.exec(svgRootNode);
  if (nsMatch === null || !nsMatch.length) {
    svgRootNode = svgRootNode.slice(0, -1) + ` ${TB_NAMESPACE_DECL}>`;
    return `${svgRootNode}\n${innerSvg}\n</svg>`;
  }
  return svgContent;
};

/** Collect the distinct `tb:tag` attribute values from raw content. */
export const parseScadaSymbolsTagsFromContent = (
  svgContent: string,
): string[] => {
  const tags: string[] = [];
  tbTagRegex.lastIndex = 0;
  let tagsMatch = tbTagRegex.exec(svgContent);
  while (tagsMatch !== null) {
    tags.push(tagsMatch[1]);
    tagsMatch = tbTagRegex.exec(svgContent);
  }
  return tags.filter((v, i, arr) => arr.indexOf(v) === i);
};

/**
 * Parse the metadata block (CDATA JSON; degrades to emptyMetadata sized
 * from the root viewBox / width-height — never throws).
 */
export const parseScadaSymbolMetadataFromContent = (
  svgContent: string,
): ScadaSymbolMetadata => {
  try {
    const normalized = applyTbNamespaceToSvgContent(svgContent);
    svgPartsRegex.lastIndex = 0;
    const partsMatch = svgPartsRegex.exec(normalized);
    if (partsMatch == null) {
      return emptyMetadata();
    }
    const svgRootNode = partsMatch.length > 1 ? partsMatch[1] : '';
    const innerSvg = partsMatch.length > 2 ? partsMatch[2] : '';
    const bodyMatch = metadataBodyRegex.exec(innerSvg);
    if (bodyMatch) {
      const metadata = JSON.parse(
        metadataBodyText(bodyMatch[1]),
      ) as ScadaSymbolMetadata;
      if (metadata && typeof metadata === 'object') {
        return metadata;
      }
    }
    const sizing = svgRootSizing(svgRootNode);
    return emptyMetadata(sizing.width, sizing.height);
  } catch (_e) {
    return emptyMetadata();
  }
};

/**
 * Write `metadata` back into the content's `<tb:metadata>` CDATA block
 * (replacing an existing one in place, or inserting right after the svg
 * root tag — upstream's first-child position). Throws on non-svg content
 * or on a document failing `validateSvgDocument`.
 */
export const updateScadaSymbolMetadataInContent = (
  svgContent: string,
  metadata: ScadaSymbolMetadata,
): string => {
  const normalized = applyTbNamespaceToSvgContent(svgContent);
  svgPartsRegex.lastIndex = 0;
  const partsMatch = svgPartsRegex.exec(normalized);
  if (partsMatch == null || partsMatch.length < 2) {
    throw new Error('Invalid SVG document.');
  }
  const svgRootNode = partsMatch[1];
  const innerSvg = partsMatch.length > 2 ? partsMatch[2] : '';
  validateSvgDocument(`${svgRootNode}\n${innerSvg}\n</svg>`);
  const content = JSON.stringify(metadata, null, 2);
  const metadataBlock = `<tb:metadata>\n<![CDATA[${splitCdataTerminator(content)}]]></tb:metadata>`;
  const bodyMatch = metadataBodyRegex.exec(innerSvg);
  const innerSvgNext = bodyMatch
    ? innerSvg.replace(bodyMatch[0], metadataBlock)
    : `${metadataBlock}\n${innerSvg}`;
  return `${svgRootNode}\n${innerSvgNext}\n</svg>`;
};

/** Strip the metadata element (raw-text surgery, ui-ngx parity :318-327). */
export const removeScadaSymbolMetadata = (svgContent: string): string => {
  let result = svgContent;
  tbMetadataRegex.lastIndex = 0;
  const metadataMatch = tbMetadataRegex.exec(svgContent);
  if (metadataMatch !== null && metadataMatch.length) {
    const metadata = metadataMatch[0];
    result = result.replace(metadata, '');
  }
  return result;
};

/**
 * Split content into the svg root tag and the inner body with any
 * metadata block removed — the canvas mount shape (ui-ngx :329-352).
 */
export const scadaSymbolContentData = (
  svgContent: string,
): ScadaSymbolContentData => {
  const result: ScadaSymbolContentData = {
    svgRootNode: '',
    innerSvg: '',
  };
  svgPartsRegex.lastIndex = 0;
  const match = svgPartsRegex.exec(svgContent);
  if (match != null) {
    if (match.length > 1) {
      result.svgRootNode = match[1];
    }
    if (match.length > 2) {
      let innerSvgContent = match[2];
      tbMetadataRegex.lastIndex = 0;
      const metadataMatch = tbMetadataRegex.exec(svgContent);
      if (metadataMatch !== null && metadataMatch.length) {
        const metadata = metadataMatch[0];
        innerSvgContent = innerSvgContent.replace(metadata, '');
      }
      result.innerSvg = innerSvgContent;
    }
  }
  return result;
};

const defaultValueForValueType = (valueType: ValueType): unknown => {
  if (!valueType) {
    return null;
  }
  switch (valueType) {
    case ValueType.STRING:
      return '';
    case ValueType.INTEGER:
    case ValueType.DOUBLE:
      return 0;
    case ValueType.BOOLEAN:
      return false;
    case ValueType.JSON:
      return {};
    default:
      return null;
  }
};

/** Upstream defaultGetValueSettings (:371-396) — exact shape. */
export const defaultGetValueSettings = (
  valueType: ValueType,
): GetValueSettings => ({
  action: GetValueAction.DO_NOTHING,
  defaultValue: defaultValueForValueType(valueType),
  executeRpc: {
    method: 'getState',
    requestTimeout: 5000,
    requestPersistent: false,
    persistentPollingInterval: 1000,
  },
  getAttribute: {
    key: 'state',
    scope: null,
  },
  getTimeSeries: {
    key: 'state',
  },
  getAlarmStatus: {
    severityList: null,
    typeList: null,
  },
  dataToValue: {
    type: DataToValueType.NONE,
    compareToValue: true,
    dataToValueFunction: '/* Should return boolean value */\nreturn data;',
  },
});

/** Upstream defaultSetValueSettings (:398-419) — exact shape. */
export const defaultSetValueSettings = (
  valueType: ValueType,
): SetValueSettings => ({
  action: SetValueAction.EXECUTE_RPC,
  executeRpc: {
    method: 'setState',
    requestTimeout: 5000,
    requestPersistent: false,
    persistentPollingInterval: 1000,
  },
  setAttribute: {
    key: 'state',
    scope: AttributeScope.SERVER_SCOPE,
  },
  putTimeSeries: {
    key: 'state',
  },
  valueToData: {
    type:
      valueType !== ValueType.BOOLEAN
        ? ValueToDataType.VALUE
        : ValueToDataType.CONSTANT,
    constantValue: false,
    valueToDataFunction:
      '/* Convert input boolean value to RPC parameters or attribute/time-series value */\nreturn value;',
  },
});

/** Upstream defaultWidgetActionSettings (:421-427) — exact shape. */
export const defaultWidgetActionSettings: WidgetActionSettings = {
  type: WidgetActionType.doNothing,
  targetDashboardStateId: null,
  openRightLayout: false,
  setEntityId: false,
  stateEntityParamName: null,
};

/** Deep-merge `sources` into a fresh object (ui-ngx mergeDeep slice). */
export const mergeDeep = <T extends object>(
  target: T,
  ...sources: Array<DeepPartial<T>>
): T => {
  const isObject = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value);
  for (const source of sources) {
    for (const [key, value] of Object.entries(source ?? {})) {
      if (
        isObject(value) &&
        isObject((target as Record<string, unknown>)[key])
      ) {
        mergeDeep(
          (target as Record<string, unknown>)[key] as object,
          value as Record<string, unknown>,
        );
      } else if (value !== undefined) {
        (target as Record<string, unknown>)[key] = value;
      }
    }
  }
  return target;
};

export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

/**
 * Re-align a behavior row's default settings with its type (ui-ngx
 * updateBehaviorDefaultSettings :429-460): drop the faces that do not
 * belong to the type, seed the missing default from the factories.
 * Mutates and returns the behavior (upstream contract).
 */
export const updateBehaviorDefaultSettings = (
  behavior: ScadaSymbolBehavior,
): ScadaSymbolBehavior => {
  if (behavior.type) {
    switch (behavior.type) {
      case ScadaSymbolBehaviorType.value:
        delete behavior.defaultSetValueSettings;
        delete behavior.defaultWidgetActionSettings;
        if (!behavior.defaultGetValueSettings) {
          behavior.defaultGetValueSettings = mergeDeep(
            {} as GetValueSettings,
            defaultGetValueSettings(behavior.valueType),
          );
        }
        break;
      case ScadaSymbolBehaviorType.action:
        delete behavior.defaultGetValueSettings;
        delete behavior.defaultWidgetActionSettings;
        if (!behavior.defaultSetValueSettings) {
          behavior.defaultSetValueSettings = mergeDeep(
            {} as SetValueSettings,
            defaultSetValueSettings(behavior.valueType),
          );
        }
        break;
      case ScadaSymbolBehaviorType.widgetAction:
        delete behavior.defaultGetValueSettings;
        delete behavior.defaultSetValueSettings;
        if (!behavior.defaultWidgetActionSettings) {
          behavior.defaultWidgetActionSettings = mergeDeep(
            {} as WidgetActionSettings,
            defaultWidgetActionSettings,
          );
        }
        break;
    }
  }
  return behavior;
};
