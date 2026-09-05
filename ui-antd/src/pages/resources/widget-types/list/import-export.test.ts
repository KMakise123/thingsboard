/**
 * Widget-type export/import pipeline unit tests (M11 wave 1B): the export
 * strips identity fields, batch files are slugified, the import validates
 * the minimal shape and lands on saveWidgetType with
 * `updateExistingByFqn=true` (the import channel).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serviceMock = vi.hoisted(() => ({
  getWidgetTypeById: vi.fn(),
  saveWidgetType: vi.fn(),
}));

vi.mock('@/services/tb/widget-type', () => serviceMock);

import {
  exportWidgetTypesToZip,
  exportWidgetTypeToFile,
  importWidgetTypeFromFile,
  parseWidgetTypeImport,
  prepareWidgetTypeExport,
  slugifyWidgetTypeName,
  WidgetTypeImportError,
} from './import-export';

const DETAILS = {
  id: { entityType: 'WIDGET_TYPE', id: 'wt-1' },
  createdTime: 123,
  tenantId: { entityType: 'TENANT', id: 't-1' },
  version: 7,
  name: 'My Card',
  fqn: 'my_card',
  descriptor: { type: 'latest' },
};

function fileWith(text: string): File {
  return { text: async () => text } as unknown as File;
}

describe('widget-type export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('strips the identity/audit fields (prepareExport parity)', () => {
    const prepared = prepareWidgetTypeExport(DETAILS as never);
    expect(prepared).not.toHaveProperty('id');
    expect(prepared).not.toHaveProperty('createdTime');
    expect(prepared).not.toHaveProperty('tenantId');
    expect(prepared).not.toHaveProperty('version');
    expect(prepared.name).toBe('My Card');
    expect(prepared.descriptor).toEqual({ type: 'latest' });
  });

  it('slugifies names to zip entry file names', () => {
    expect(slugifyWidgetTypeName('My Card!')).toBe('my_card_.json');
    expect(slugifyWidgetTypeName('temperature-chart')).toBe(
      'temperature_chart.json',
    );
  });

  it('downloads a single export through the includeResources choice', async () => {
    serviceMock.getWidgetTypeById.mockResolvedValue(DETAILS);
    const click = vi.fn();
    const anchorSpy = vi
      .spyOn(document, 'createElement')
      .mockReturnValue({ click, href: '', download: '' } as never);
    await exportWidgetTypeToFile('wt-1', 'My Card', true);
    expect(serviceMock.getWidgetTypeById).toHaveBeenCalledWith('wt-1', {
      includeResources: true,
    });
    expect(click).toHaveBeenCalled();
    anchorSpy.mockRestore();
  });

  it('packs a batch export into one zip blob', async () => {
    serviceMock.getWidgetTypeById
      .mockResolvedValueOnce(DETAILS)
      .mockResolvedValueOnce({ ...DETAILS, name: 'Other' });
    const urlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    const revokeSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockReturnValue(undefined);
    const click = vi.fn();
    const anchorSpy = vi
      .spyOn(document, 'createElement')
      .mockReturnValue({ click, href: '', download: '' } as never);

    await exportWidgetTypesToZip(
      [
        { id: 'wt-1', name: 'My Card' },
        { id: 'wt-2', name: 'Other' },
      ],
      false,
    );
    expect(serviceMock.getWidgetTypeById).toHaveBeenCalledTimes(2);
    expect(serviceMock.getWidgetTypeById).toHaveBeenNthCalledWith(2, 'wt-2', {
      includeResources: false,
    });
    expect(click).toHaveBeenCalled();
    urlSpy.mockRestore();
    revokeSpy.mockRestore();
    anchorSpy.mockRestore();
  });
});

describe('widget-type import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-JSON and shape-incomplete files with locale keys', () => {
    expect(() => parseWidgetTypeImport('not-json')).toThrow(
      WidgetTypeImportError,
    );
    expect(() => parseWidgetTypeImport('[]')).toThrow(WidgetTypeImportError);
    expect(() => parseWidgetTypeImport('{"name":"x"}')).toThrow(
      WidgetTypeImportError,
    );
    expect(() => parseWidgetTypeImport('{"descriptor":{}}')).toThrow(
      WidgetTypeImportError,
    );
    // a valid row passes through untouched
    expect(parseWidgetTypeImport('{"name":"x","descriptor":{}}')).toEqual({
      name: 'x',
      descriptor: {},
    });
  });

  it('imports through the updateExistingByFqn channel (externalId stripped)', async () => {
    serviceMock.saveWidgetType.mockResolvedValue({ ...DETAILS });
    const saved = await importWidgetTypeFromFile(
      fileWith(JSON.stringify({ ...DETAILS, externalId: 'ext-9' })),
    );
    expect(saved.name).toBe('My Card');
    expect(serviceMock.saveWidgetType).toHaveBeenCalledTimes(1);
    const [payload, updateExisting] = serviceMock.saveWidgetType.mock.calls[0];
    expect(updateExisting).toBe(true);
    // prepareImport parity: only externalId is stripped here (the export
    // already removed identity; a hand-carried id keeps upstream semantics
    // of updating that exact entity).
    expect(payload).not.toHaveProperty('externalId');
    expect(payload.name).toBe('My Card');
  });
});
