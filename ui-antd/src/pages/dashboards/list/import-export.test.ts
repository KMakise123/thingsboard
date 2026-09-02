/**
 * Dashboard import/export pure helpers (data.test style): export payload
 * stripping, import validation (title + configuration) and the identity
 * strip that keeps POST /api/dashboard on the create path.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dashboardServiceMock = vi.hoisted(() => ({
  exportDashboard: vi.fn(),
  saveDashboard: vi.fn(),
}));

vi.mock('@/services/tb/dashboard', () => dashboardServiceMock);

import {
  DashboardImportError,
  exportDashboardToFile,
  importDashboardFromFile,
  parseDashboardImport,
} from './import-export';

const FULL_DASHBOARD = {
  id: { entityType: 'DASHBOARD', id: 'dash-1' },
  createdTime: 1_700_000_000_000,
  tenantId: { entityType: 'TENANT', id: 'tenant-1' },
  version: 9,
  title: 'Thermostats',
  assignedCustomers: [
    { customerId: { entityType: 'CUSTOMER', id: 'cust-1' }, title: 'A' },
  ],
  configuration: { widgets: {}, states: {}, entityAliases: {} },
};

describe('parseDashboardImport', () => {
  it('accepts a payload with title and configuration', () => {
    const parsed = parseDashboardImport(JSON.stringify(FULL_DASHBOARD));
    expect(parsed.title).toBe('Thermostats');
    expect(parsed.configuration).toBeDefined();
  });

  it('rejects non-JSON text with the parse-error key', () => {
    expect(() => parseDashboardImport('not json')).toThrow(
      DashboardImportError,
    );
    try {
      parseDashboardImport('not json');
    } catch (error) {
      expect((error as DashboardImportError).localeKey).toBe(
        'dashboards.list.importParseError',
      );
    }
  });

  it('rejects payloads missing the configuration with the invalid-error key', () => {
    const bad = JSON.stringify({ title: 'No configuration' });
    try {
      parseDashboardImport(bad);
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as DashboardImportError).localeKey).toBe(
        'dashboards.list.importInvalidError',
      );
    }
  });

  it('rejects payloads missing the title', () => {
    const bad = JSON.stringify({ configuration: {} });
    expect(() => parseDashboardImport(bad)).toThrow(DashboardImportError);
  });
});

describe('exportDashboardToFile / importDashboardFromFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('downloads the stripped payload under {title}.json', async () => {
    dashboardServiceMock.exportDashboard.mockResolvedValue(FULL_DASHBOARD);
    const clicks: Array<string> = [];
    const anchor = {
      href: '',
      download: '',
      click: () => clicks.push('click'),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(
      anchor as unknown as HTMLElement,
    );

    await exportDashboardToFile('dash-1');

    expect(dashboardServiceMock.exportDashboard).toHaveBeenCalledWith('dash-1');
    expect(clicks).toEqual(['click']);
    expect(anchor.download).toBe('Thermostats.json');
    vi.restoreAllMocks();
  });

  it('imports a valid file onto the create path (no id, no externalId)', async () => {
    dashboardServiceMock.saveDashboard.mockResolvedValue({
      ...FULL_DASHBOARD,
      id: { entityType: 'DASHBOARD', id: 'dash-new' },
    });
    const file = new File(
      [JSON.stringify(FULL_DASHBOARD)],
      'Thermostats.json',
      {
        type: 'application/json',
      },
    );

    await importDashboardFromFile(file);

    expect(dashboardServiceMock.saveDashboard).toHaveBeenCalledTimes(1);
    const payload = dashboardServiceMock.saveDashboard.mock.calls[0][0];
    expect(payload.id).toBeUndefined();
    expect(payload.externalId).toBeUndefined();
    expect(payload.title).toBe('Thermostats');
    // validateAndUpdateDashboard ran: the configuration is normalized
    expect(payload.configuration).toBeDefined();
  });

  it('propagates the validation error without calling the API', async () => {
    const file = new File(['{"title": "broken"}'], 'broken.json', {
      type: 'application/json',
    });
    await expect(importDashboardFromFile(file)).rejects.toBeInstanceOf(
      DashboardImportError,
    );
    expect(dashboardServiceMock.saveDashboard).not.toHaveBeenCalled();
  });
});
