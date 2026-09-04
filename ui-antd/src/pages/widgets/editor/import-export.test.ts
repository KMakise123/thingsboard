/**
 * Import/export contract tests (spec §5.7; M9 brief §5 evidence):
 *  - P10 half-item: the export → import round trip preserves the descriptor
 *    VERBATIM — `resources[]` and unknown future keys included — while the
 *    identity fields follow the ui-ngx prepareExport strip rule;
 *  - exports carry the fork markers (`runtime`, `schemaVersion`) so TB
 *    imports stay unharmed;
 *  - P9: an Angular widget JSON is ALLOWED (badge classification, never a
 *    refusal) and its verbatim server copy posts the descriptor untouched;
 *  - broken JSON / missing name / missing descriptor are readable refusals.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FormPropertyType } from '@/components/form-property/types';
import { EntityType } from '@/types/tb/entity';
import type { WidgetTypeDetails } from '@/types/tb/widget-type';

import { draftToWidgetType, emptyWidgetEditorDoc } from './draft-convert';
import {
  parseWidgetTypeImport,
  prepareWidgetTypeExport,
  saveImportedAngularCopy,
  serializeWidgetTypeExport,
  type WidgetImport,
  WidgetImportError,
} from './import-export';

const serviceMock = vi.hoisted(() => ({
  saveWidgetType: vi.fn(),
}));
vi.mock('@/services/tb/widget-type', () => serviceMock);

function reactDoc() {
  const doc = emptyWidgetEditorDoc();
  doc.widgetTypeId = 'wt-1';
  doc.fqn = 'my_card';
  doc.name = 'My card';
  doc.source = { tsx: 'export default () => <div />', css: '.card {}' };
  doc.settingsForm = [
    { id: 'a', name: 'a', type: FormPropertyType.text, default: '' },
  ];
  doc.defaultConfig = '{"title":"x"}';
  doc.meta = { type: 'latest', sizeX: 6, sizeY: 4 };
  doc.version = 7;
  // legacy resources + unknown future keys ride the passthrough channel
  doc.descriptorPassthrough = {
    resources: [{ url: '/api/resource/x.js', isModule: false }],
    someUpstreamFutureKey: { nested: true },
  };
  return doc;
}

function angularEntity(): WidgetTypeDetails {
  return {
    id: { entityType: EntityType.WIDGET_TYPE, id: 'sys-9' },
    createdTime: 1720000000000,
    tenantId: { entityType: EntityType.TENANT, id: 'system' },
    fqn: 'analogue_gauge',
    name: 'Analogue gauge',
    version: 2,
    descriptor: {
      type: 'latest',
      sizeX: 8,
      sizeY: 6,
      templateHtml: '<div ng-bind="data"></div>',
      controllerScript: 'self.onInit = function() {};',
      resources: [{ url: '/static/gauge.js', isModule: true }],
      settingsForm: [{ id: 'min', name: 'Min', type: 'number', default: 0 }],
      defaultConfig: '{"title":"gauge"}',
    },
  };
}

beforeEach(() => {
  serviceMock.saveWidgetType.mockReset();
});

describe('export — strip rule + fork markers (ui-ngx prepareExport parity)', () => {
  it('drops id/createdTime/tenantId/version, keeps name + descriptor', () => {
    const exported = JSON.parse(
      serializeWidgetTypeExport(reactDoc()),
    ) as Record<string, unknown>;
    expect(exported.id).toBeUndefined();
    expect(exported.createdTime).toBeUndefined();
    expect(exported.tenantId).toBeUndefined();
    expect(exported.version).toBeUndefined();
    expect(exported.name).toBe('My card');
    expect(exported.descriptor).toBeDefined();
  });

  it('exports carry the runtime/schemaVersion markers (TB-import safe)', () => {
    const exported = prepareWidgetTypeExport(draftToWidgetType(reactDoc()));
    const exportedDescriptor = exported.descriptor!;
    expect(exportedDescriptor.runtime).toBe('react-1');
    expect(exportedDescriptor.schemaVersion).toBe(1);
    expect(exportedDescriptor.source).toEqual({
      tsx: 'export default () => <div />',
      css: '.card {}',
    });
  });

  it('re-exporting an imported doc reproduces the descriptor byte-for-byte', () => {
    const first = serializeWidgetTypeExport(reactDoc());
    const imported = parseWidgetTypeImport(first);
    if (imported.kind !== 'react-1') {
      throw new Error('expected react-1');
    }
    const second = serializeWidgetTypeExport(imported.doc);
    // identity differs (an import lands as a NEW type — the first export of
    // an editing doc still carries its fqn), the PAYLOAD is byte-stable
    const firstDescriptor = (JSON.parse(first) as { descriptor: unknown })
      .descriptor;
    const secondDescriptor = (JSON.parse(second) as { descriptor: unknown })
      .descriptor;
    expect(JSON.stringify(secondDescriptor)).toBe(
      JSON.stringify(firstDescriptor),
    );
  });
});

describe('import — react-1 fork JSON round trip (P10 half-item)', () => {
  it('preserves resources[] and unknown descriptor keys verbatim', () => {
    const json = serializeWidgetTypeExport(reactDoc());
    const imported: WidgetImport = parseWidgetTypeImport(json);
    expect(imported.kind).toBe('react-1');
    if (imported.kind !== 'react-1') {
      return;
    }
    // identity reset: an import lands as a NEW type
    expect(imported.doc.widgetTypeId).toBeNull();
    expect(imported.doc.fqn).toBe('');
    expect(imported.doc.version).toBeNull();
    // payload survives: source, schema, config, passthrough
    expect(imported.doc.source).toEqual({
      tsx: 'export default () => <div />',
      css: '.card {}',
    });
    expect(imported.doc.settingsForm).toEqual([
      { id: 'a', name: 'a', type: 'text', default: '' },
    ]);
    expect(imported.doc.defaultConfig).toBe('{"title":"x"}');
    expect(imported.doc.meta).toEqual({ type: 'latest', sizeX: 6, sizeY: 4 });
    // P10: resources ride the passthrough untouched
    expect(imported.doc.descriptorPassthrough.resources).toEqual([
      { url: '/api/resource/x.js', isModule: false },
    ]);
    expect(imported.doc.descriptorPassthrough.someUpstreamFutureKey).toEqual({
      nested: true,
    });
    // and re-merge into the next POST body verbatim
    const reposted = draftToWidgetType(imported.doc);
    expect(reposted.descriptor?.resources).toEqual([
      { url: '/api/resource/x.js', isModule: false },
    ]);
  });
});

describe('import — Angular widget JSON (P9: allowed, badged, verbatim copy)', () => {
  it('classifies a non-react-1 descriptor as angular (never a refusal)', () => {
    const imported = parseWidgetTypeImport(JSON.stringify(angularEntity()));
    expect(imported.kind).toBe('angular');
  });

  it('the verbatim server copy posts the descriptor UNTOUCHED', async () => {
    serviceMock.saveWidgetType.mockResolvedValue(angularEntity());
    const saved = await saveImportedAngularCopy(angularEntity());
    const posted = serviceMock.saveWidgetType.mock.calls[0][0];
    // identity stripped (create on the importing tenant)…
    expect(posted.id).toBeUndefined();
    expect(posted.createdTime).toBeUndefined();
    expect(posted.tenantId).toBeUndefined();
    expect(posted.version).toBeUndefined();
    // …descriptor byte-equal: no runtime/schemaVersion/source injected
    expect(JSON.stringify(posted.descriptor)).toBe(
      JSON.stringify(angularEntity().descriptor),
    );
    expect(saved).toBeDefined();
  });
});

describe('import — readable refusals (never a crash)', () => {
  it('broken JSON refuses with the brokenJson code', () => {
    try {
      parseWidgetTypeImport('{ not json');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(WidgetImportError);
      expect((error as WidgetImportError).code).toBe('brokenJson');
    }
  });

  it('a non-object payload refuses with the brokenJson code', () => {
    expect(() => parseWidgetTypeImport('[1,2]')).toThrow(WidgetImportError);
  });

  it('missing name refuses with the missingName code', () => {
    const body = JSON.stringify({ descriptor: {} });
    try {
      parseWidgetTypeImport(body);
      expect.unreachable();
    } catch (error) {
      expect((error as WidgetImportError).code).toBe('missingName');
    }
  });

  it('missing descriptor refuses with the missingDescriptor code', () => {
    const body = JSON.stringify({ name: 'orphan' });
    try {
      parseWidgetTypeImport(body);
      expect.unreachable();
    } catch (error) {
      expect((error as WidgetImportError).code).toBe('missingDescriptor');
    }
  });
});
