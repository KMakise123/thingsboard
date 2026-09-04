/**
 * Derivation semantics (spec §5.6, two tiers):
 *
 *  - FULL derive from an existing react-1 CUSTOM type: `widgetTypeToDraft`
 *    round-trips the whole descriptor (source tsx/css, settingsForm,
 *    defaultConfig, meta, unknown-key passthrough); the copy resets
 *    identity (id / fqn / version) so the next save lands as a NEW type.
 *
 *  - RESTRICTED derive from a BUILT-IN type: built-ins are Angular widgets
 *    — `descriptor.source` does not exist, so the source is honestly
 *    unavailable (ADR 0004 §4; the UI says so, it never hints "coming
 *    soon"). What IS available rides the descriptor: settingsForm,
 *    defaultConfig, sizeX/sizeY, type, typeParameters, actionSources.
 *    The Angular-only payload (templateHtml / controller scripts /
 *    directives / hasBasicMode / resources that feed the Angular runtime)
 *    is DROPPED — the derived type is react-1 with a starter TSX skeleton;
 *    keeping dead Angular keys would bloat the descriptor budget and imply
 *    a fidelity the copy does not have. dataKeySettingsForm /
 *    latestDataKeySettingsForm survive in the passthrough (structured form
 *    recipes, not Angular-runtime code).
 */
import type { WidgetType, WidgetTypeDetails } from '@/types/tb/widget-type';

import { type WidgetEditorDoc, widgetTypeToDraft } from '../draft-convert';

/** Descriptor keys that only ever feed the upstream Angular runtime. */
export const ANGULAR_ONLY_DESCRIPTOR_KEYS = [
  'templateHtml',
  'templateCss',
  'controllerScript',
  'settingsDirective',
  'dataKeySettingsDirective',
  'latestDataKeySettingsDirective',
  'hasBasicMode',
  'basicModeDirective',
  'resources',
] as const;

/** Honest starter skeleton for restricted derives (source unavailable). */
export const DERIVE_SKELETON_TSX = [
  "import { antd } from 'widget-kit';",
  "import type { CustomWidgetProps } from '@/core/widget/types';",
  '',
  '// Restricted derivation: the built-in type is an Angular widget and its',
  '// source is unavailable. The settingsForm / defaultConfig / size skeleton',
  '// were copied from it — build your own TSX on top of them.',
  'export default function DerivedWidget(props: CustomWidgetProps) {',
  '  const seriesEntries = Object.entries(props.latestData).length',
  '    ? Object.entries(props.latestData)',
  '    : Object.entries(props.data);',
  '  if (seriesEntries.length === 0) {',
  '    return <div>Waiting for data…</div>;',
  '  }',
  '  return (',
  '    <div>',
  '      {seriesEntries.map(([key, series]) => {',
  '        const latest = series.length ? series[series.length - 1] : null;',
  '        return (',
  '          <div key={key}>',
  '            <antd.Typography.Text type="secondary">{key}: </antd.Typography.Text>',
  '            <antd.Typography.Text strong>',
  '              {latest ? String(latest[1]) : "--"}',
  '            </antd.Typography.Text>',
  '          </div>',
  '        );',
  '      })}',
  '    </div>',
  '  );',
  '}',
].join('\n');

/** Full copy of a react-1 custom type with identity reset. */
export function deriveFromReactType(
  details: WidgetTypeDetails,
  newName: string,
): WidgetEditorDoc {
  return {
    ...widgetTypeToDraft(details),
    name: newName,
    widgetTypeId: null,
    fqn: '',
    version: null,
  };
}

/** Restricted copy of a built-in (Angular) type with starter skeleton. */
export function deriveFromBuiltinType(
  base: WidgetType,
  newName: string,
): WidgetEditorDoc {
  const doc = widgetTypeToDraft(base);
  const passthrough = { ...doc.descriptorPassthrough };
  for (const key of ANGULAR_ONLY_DESCRIPTOR_KEYS) {
    delete passthrough[key];
  }
  return {
    ...doc,
    name: newName,
    widgetTypeId: null,
    fqn: '',
    version: null,
    // the honest skeleton — never the Angular source (it does not exist)
    source: { tsx: DERIVE_SKELETON_TSX, css: '' },
    descriptorPassthrough: passthrough,
  };
}
