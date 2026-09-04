/**
 * draft-convert round-trip matrix (M9 brief §3 wave S item 3): the two pure
 * conversions must be lossless in BOTH directions — descriptor passthrough
 * keys, the settingsForm narrowing, the defaultConfig string discipline,
 * the short fqn and the version backfill.
 */
import { describe, expect, it } from 'vitest';
import { WIDGET_DESCRIPTOR_SCHEMA_VERSION } from '@/core/widget/types';
import { EntityType } from '@/types/tb/entity';
import type {
  WidgetTypeDescriptor,
  WidgetTypeDetails,
} from '@/types/tb/widget-type';

import {
  DEFAULT_WIDGET_META,
  draftToWidgetType,
  emptyWidgetEditorDoc,
  widgetTypeToDraft,
} from './draft-convert';

/** draftToWidgetType always writes the descriptor; unwrap it for assertions. */
function descriptorOf(wire: WidgetTypeDetails): WidgetTypeDescriptor {
  return wire.descriptor as WidgetTypeDescriptor;
}

function reactTypeDetails(
  overrides?: Partial<WidgetTypeDetails>,
): WidgetTypeDetails {
  return {
    id: { entityType: EntityType.WIDGET_TYPE, id: 'type-1' },
    createdTime: 1700000000000,
    tenantId: { entityType: EntityType.TENANT, id: 'tenant-1' },
    fqn: 'my_gauge',
    name: 'My gauge',
    version: 3,
    descriptor: {
      runtime: 'react-1',
      schemaVersion: 1,
      source: {
        tsx: 'export default () => <div/>;',
        css: '.a { color: red; }',
      },
      type: 'timeseries',
      sizeX: 6,
      sizeY: 4,
      typeParameters: { useCustomDatasources: true },
      actionSources: {
        headerButton: {
          name: 'widget-action.header-button',
          value: 'headerButton',
          multiple: true,
        },
      },
      settingsForm: [
        { id: 'threshold', name: 'threshold', type: 'number', default: 1 },
      ],
      defaultConfig: '{"title":"gauge"}',
      // passthrough keys the draft has no field for
      resources: [{ url: '/api/resource/x.js', isModule: false }],
      controllerScript: 'self.onInit = function() {}',
      customFutureKey: { deep: true },
    },
    ...overrides,
  };
}

describe('widgetTypeToDraft', () => {
  it('maps the editor-facing fields (short fqn, version, meta, source)', () => {
    const doc = widgetTypeToDraft(reactTypeDetails());
    expect(doc.widgetTypeId).toBe('type-1');
    expect(doc.fqn).toBe('my_gauge'); // SHORT name — no scope prefix
    expect(doc.name).toBe('My gauge');
    expect(doc.version).toBe(3);
    expect(doc.source.tsx).toContain('export default');
    expect(doc.source.css).toContain('color: red');
    expect(doc.meta).toMatchObject({ type: 'timeseries', sizeX: 6, sizeY: 4 });
    expect(doc.meta.typeParameters).toEqual({ useCustomDatasources: true });
    expect(Object.keys(doc.meta.actionSources ?? {})).toEqual(['headerButton']);
    expect(doc.settingsForm).toEqual([
      { id: 'threshold', name: 'threshold', type: 'number', default: 1 },
    ]);
    expect(doc.defaultConfig).toBe('{"title":"gauge"}'); // stays a string
  });

  it('carries unlisted descriptor keys in the passthrough channel', () => {
    const doc = widgetTypeToDraft(reactTypeDetails());
    expect(doc.descriptorPassthrough.resources).toEqual([
      { url: '/api/resource/x.js', isModule: false },
    ]);
    expect(doc.descriptorPassthrough.controllerScript).toContain('onInit');
    expect(doc.descriptorPassthrough.customFutureKey).toEqual({ deep: true });
    // the absorbed keys are NOT duplicated in the passthrough
    expect(doc.descriptorPassthrough).not.toHaveProperty('type');
    expect(doc.descriptorPassthrough).not.toHaveProperty('source');
    expect(doc.descriptorPassthrough).not.toHaveProperty('runtime');
  });

  it('converts a legacy Angular descriptor without throwing (passthrough path)', () => {
    const doc = widgetTypeToDraft({
      fqn: 'legacy_card',
      name: 'Legacy card',
      version: 1,
      descriptor: {
        templateHtml: '<div></div>',
        controllerScript: 'self.onInit = function() {}',
        defaultConfig: '{}',
      },
    } as WidgetTypeDetails);
    expect(doc.source).toEqual({ tsx: '', css: '' });
    expect(doc.meta).toEqual({ ...DEFAULT_WIDGET_META }); // upstream defaults
    expect(doc.descriptorPassthrough.templateHtml).toBe('<div></div>');
    expect(doc.descriptorPassthrough.controllerScript).toContain('onInit');
  });

  it('rejects a settingsForm that could never be FormProperty[]', () => {
    const broken = reactTypeDetails();
    (broken.descriptor as Record<string, unknown>).settingsForm = 'nope';
    expect(() => widgetTypeToDraft(broken)).toThrow(
      'settingsForm is not a FormProperty[] array',
    );
  });

  it('rejects a settingsForm containing non-object entries', () => {
    const broken = reactTypeDetails();
    (broken.descriptor as Record<string, unknown>).settingsForm = [
      { id: 'ok', name: 'ok', type: 'text', default: '' },
      42,
    ];
    expect(() => widgetTypeToDraft(broken)).toThrow(
      'settingsForm is not a FormProperty[] array',
    );
  });

  it('normalizes a missing/absent descriptor to the empty draft shape', () => {
    const doc = widgetTypeToDraft({ fqn: 'x', name: 'x' } as WidgetTypeDetails);
    expect(doc.settingsForm).toEqual([]);
    expect(doc.defaultConfig).toBe('{}');
    expect(doc.widgetTypeId).toBeNull();
    expect(doc.version).toBeNull();
    expect(doc.descriptorPassthrough).toEqual({});
  });
});

describe('draftToWidgetType', () => {
  it('writes the frozen descriptor shape (runtime/schemaVersion/source)', () => {
    const doc = widgetTypeToDraft(reactTypeDetails());
    const wire = draftToWidgetType(doc);
    expect(wire.id).toEqual({
      entityType: EntityType.WIDGET_TYPE,
      id: 'type-1',
    });
    expect(wire.fqn).toBe('my_gauge'); // echoed on update (immutable)
    expect(wire.version).toBe(3);
    const descriptor = descriptorOf(wire);
    expect(descriptor.runtime).toBe('react-1');
    expect(descriptor.schemaVersion).toBe(WIDGET_DESCRIPTOR_SCHEMA_VERSION);
    expect(descriptor.source).toEqual({
      tsx: expect.stringContaining('export default'),
      css: expect.stringContaining('color: red'),
    });
    expect(descriptor.settingsForm).toHaveLength(1);
    expect(descriptor.defaultConfig).toBe('{"title":"gauge"}');
  });

  it('drops an empty css (source.css absent = no css) and empties', () => {
    const doc = widgetTypeToDraft(reactTypeDetails());
    doc.source.css = '';
    doc.meta.typeParameters = undefined;
    doc.meta.actionSources = undefined;
    doc.version = null;
    const wire = draftToWidgetType(doc);
    expect(descriptorOf(wire).source).not.toHaveProperty('css');
    expect(descriptorOf(wire)).not.toHaveProperty('typeParameters');
    expect(descriptorOf(wire)).not.toHaveProperty('actionSources');
    expect(wire.version).toBeUndefined();
  });

  it('omits id and fqn on the create path (server derives the fqn)', () => {
    const doc = emptyWidgetEditorDoc();
    doc.name = 'Fresh';
    const wire = draftToWidgetType(doc);
    expect(wire.id).toBeUndefined();
    expect(wire.fqn).toBeUndefined();
    expect(wire.name).toBe('Fresh');
    expect(descriptorOf(wire).runtime).toBe('react-1');
  });

  it('re-merges the passthrough keys verbatim around the known keys', () => {
    const doc = widgetTypeToDraft(reactTypeDetails());
    const wire = draftToWidgetType(doc);
    expect(descriptorOf(wire).resources).toEqual([
      { url: '/api/resource/x.js', isModule: false },
    ]);
    expect(descriptorOf(wire).controllerScript).toContain('onInit');
    expect(
      (descriptorOf(wire) as Record<string, unknown>).customFutureKey,
    ).toEqual({
      deep: true,
    });
  });
});

describe('round-trip', () => {
  it('is lossless wire → draft → wire', () => {
    const details = reactTypeDetails();
    const wire = draftToWidgetType(widgetTypeToDraft(details));
    // id/tenant/createdTime are server-owned echoes; the conversion output
    // carries exactly what the POST body needs — compare the data plane.
    expect(wire.id).toEqual(details.id);
    expect(wire.fqn).toBe(details.fqn);
    expect(wire.name).toBe(details.name);
    expect(wire.version).toBe(details.version);
    expect(descriptorOf(wire)).toEqual(details.descriptor);
  });

  it('is stable draft → wire → draft', () => {
    const doc = widgetTypeToDraft(reactTypeDetails());
    const reconverted = widgetTypeToDraft(draftToWidgetType(doc));
    expect(reconverted).toEqual(doc);
  });

  it('keeps a legacy descriptor through wire → draft → wire (passthrough survives)', () => {
    const legacy = {
      fqn: 'legacy_card',
      name: 'Legacy card',
      version: 2,
      descriptor: {
        templateHtml: '<b>hi</b>',
        templateCss: '.x {}',
        settingsForm: [{ id: 'a', name: 'a', type: 'text', default: '' }],
        defaultConfig: '{}',
      },
    } as WidgetTypeDetails;
    const doc = widgetTypeToDraft(legacy);
    const wire = draftToWidgetType(doc);
    expect(descriptorOf(wire).templateHtml).toBe('<b>hi</b>');
    expect(descriptorOf(wire).templateCss).toBe('.x {}');
    // the fork increments are added; the legacy keys ride along
    expect(descriptorOf(wire).runtime).toBe('react-1');
    // the second hop goes through the CREATE path (no id → no fqn echoed,
    // the server derives one) — everything else round-trips intact
    const reconverted = widgetTypeToDraft(wire);
    expect(reconverted).toEqual({ ...doc, fqn: '' });
  });
});
