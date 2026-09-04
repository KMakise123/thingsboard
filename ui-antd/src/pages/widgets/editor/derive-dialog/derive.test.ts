/**
 * Two-tier derivation semantics (spec §5.6): full copy from react-1
 * (source rides along, identity reset); restricted copy from a built-in
 * Angular type (schema/config/size kept, Angular-only payload dropped, TSX
 * = honest starter skeleton).
 */
import { describe, expect, it } from 'vitest';
import { EntityType } from '@/types/tb/entity';
import type { WidgetType, WidgetTypeDetails } from '@/types/tb/widget-type';

import {
  DERIVE_SKELETON_TSX,
  deriveFromBuiltinType,
  deriveFromReactType,
} from './derive';

const reactDetails: WidgetTypeDetails = {
  id: { entityType: EntityType.WIDGET_TYPE, id: 'wt-9' },
  createdTime: 1720000000000,
  tenantId: { entityType: EntityType.TENANT, id: 't-1' },
  fqn: 'my_card',
  name: 'My card',
  version: 5,
  descriptor: {
    runtime: 'react-1',
    schemaVersion: 1,
    source: { tsx: 'export default () => <div />', css: '.x{}' },
    type: 'latest',
    sizeX: 6,
    sizeY: 4,
    settingsForm: [{ id: 'a', name: 'a', type: 'text', default: '' }],
    defaultConfig: '{"title":"x"}',
    customFutureKey: { keep: true },
  },
};

const builtinBase: WidgetType = {
  id: { entityType: EntityType.WIDGET_TYPE, id: 'sys-1' },
  createdTime: 1720000000000,
  tenantId: { entityType: EntityType.TENANT, id: 'system' },
  fqn: 'analogue_gauge',
  name: 'Analogue gauge',
  version: 1,
  descriptor: {
    type: 'latest',
    sizeX: 8,
    sizeY: 6,
    templateHtml: '<div ng-bind="x"></div>',
    templateCss: '.gauge {}',
    controllerScript: 'self.onInit = function() {};',
    settingsDirective: 'tb-gauge-settings',
    dataKeySettingsDirective: 'tb-gauge-datakey-settings',
    hasBasicMode: false,
    resources: [{ url: '/static/.../gauge.js', isModule: true }],
    settingsForm: [{ id: 'minValue', name: 'Min', type: 'number', default: 0 }],
    dataKeySettingsForm: [{ id: 'dk', name: 'DK', type: 'text', default: '' }],
    defaultConfig: '{"title":"gauge"}',
    typeParameters: { maxDatasources: 1 },
  },
};

describe('deriveFromReactType — full derivation (source available)', () => {
  const doc = deriveFromReactType(reactDetails, 'My card (copy)');

  it('resets the identity triple (new type on next save)', () => {
    expect(doc.widgetTypeId).toBeNull();
    expect(doc.fqn).toBe('');
    expect(doc.version).toBeNull();
    expect(doc.name).toBe('My card (copy)');
  });

  it('carries the full source and schema round-trip', () => {
    expect(doc.source).toEqual({
      tsx: 'export default () => <div />',
      css: '.x{}',
    });
    expect(doc.settingsForm).toHaveLength(1);
    expect(doc.defaultConfig).toBe('{"title":"x"}');
    expect(doc.meta.type).toBe('latest');
    expect(doc.meta.sizeX).toBe(6);
    // unknown descriptor keys ride the passthrough
    expect(doc.descriptorPassthrough.customFutureKey).toEqual({ keep: true });
  });
});

describe('deriveFromBuiltinType — restricted derivation (source unavailable)', () => {
  const doc = deriveFromBuiltinType(builtinBase, 'Analogue gauge (copy)');

  it('resets identity and keeps the available skeleton', () => {
    expect(doc.widgetTypeId).toBeNull();
    expect(doc.fqn).toBe('');
    expect(doc.version).toBeNull();
    expect(doc.name).toBe('Analogue gauge (copy)');
    expect(doc.meta.type).toBe('latest');
    expect(doc.meta.sizeX).toBe(8);
    expect(doc.meta.sizeY).toBe(6);
    expect(doc.settingsForm).toHaveLength(1);
    expect(doc.defaultConfig).toBe('{"title":"gauge"}');
    expect(doc.meta.typeParameters).toEqual({ maxDatasources: 1 });
  });

  it('NEVER carries Angular source; the TSX is the starter skeleton', () => {
    expect(doc.source.tsx).toBe(DERIVE_SKELETON_TSX);
    expect(doc.source.css).toBe('');
    expect(doc.source.tsx).not.toContain('self.onInit');
    expect(doc.descriptorPassthrough.templateHtml).toBeUndefined();
    expect(doc.descriptorPassthrough.templateCss).toBeUndefined();
    expect(doc.descriptorPassthrough.controllerScript).toBeUndefined();
    expect(doc.descriptorPassthrough.settingsDirective).toBeUndefined();
    expect(doc.descriptorPassthrough.resources).toBeUndefined();
  });

  it('keeps structured form recipes in the passthrough', () => {
    expect(doc.descriptorPassthrough.dataKeySettingsForm).toEqual([
      { id: 'dk', name: 'DK', type: 'text', default: '' },
    ]);
  });
});
