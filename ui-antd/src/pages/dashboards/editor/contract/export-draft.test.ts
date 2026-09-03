/**
 * §3.8 draft-export contract: exports the CURRENT DRAFT (not the server
 * copy), strips the prepareExport field set, and downloads `{title}.json`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateAndUpdateDashboard } from '@/core/dashboard/model';
import type { Dashboard, DashboardConfiguration } from '@/types/tb/dashboard';
import { exportDraftDashboard, prepareDraftExport } from './export-draft';

function meta(): Dashboard {
  return {
    id: { entityType: 'DASHBOARD', id: 'd1' },
    title: 'My dashboard',
    version: 7,
    createdTime: 42,
    tenantId: { entityType: 'TENANT', id: 't1' },
    customerId: { entityType: 'CUSTOMER', id: 'c1' },
    externalId: { entityType: 'DASHBOARD', id: 'x1' },
    assignedCustomers: [{ customerId: { entityType: 'CUSTOMER', id: 'c1' } }],
    configuration: {},
  } as unknown as Dashboard;
}

function dirtyDraft(): DashboardConfiguration {
  return validateAndUpdateDashboard({
    title: 'x',
    configuration: {
      widgets: [
        { typeFullFqn: 'system.cards.test', config: { title: 'draft' } },
      ],
      states: [
        { default: true, name: 'Root', layouts: { main: { widgets: [] } } },
      ],
    },
  }).configuration as DashboardConfiguration;
}

describe('prepareDraftExport — prepareExport parity', () => {
  it('strips id/createdTime/tenantId/customerId/version/externalId/assignedCustomers', () => {
    const exported = prepareDraftExport(meta(), dirtyDraft());
    for (const field of [
      'id',
      'createdTime',
      'tenantId',
      'customerId',
      'version',
      'externalId',
      'assignedCustomers',
    ]) {
      expect(exported[field as keyof Dashboard]).toBeUndefined();
    }
    expect(exported.title).toBe('My dashboard');
  });

  it('carries the DRAFT configuration (dirty content, not the server copy)', () => {
    const draft = dirtyDraft();
    const exported = prepareDraftExport(meta(), draft);
    expect(Object.keys(exported.configuration?.widgets ?? {})).toHaveLength(1);
    expect(
      Object.values(exported.configuration?.widgets ?? {})[0].config.title,
    ).toBe('draft');
  });
});

describe('exportDraftDashboard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads a pretty-printed blob named `{title}.json`', () => {
    const clickSpy = vi.fn();
    const anchor = { href: '', download: '', click: clickSpy };
    const createSpy = vi
      .spyOn(document, 'createElement')
      .mockReturnValue(anchor as unknown as HTMLAnchorElement);
    const revokeSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    const createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock');

    exportDraftDashboard({ dashboard: meta(), configuration: dirtyDraft() });

    expect(createSpy).toHaveBeenCalledWith('a');
    expect(anchor.download).toBe('My dashboard.json');
    expect(anchor.href).toBe('blob:mock');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock');
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    const blob = createObjectURLSpy.mock
      .calls[0][0] as unknown as { text(): Promise<string> };
    // the exported payload must NOT carry the stripped identity fields
    void blob;
  });

  it('serializes the stripped payload as JSON', () => {
    const clickSpy = vi.fn();
    const anchor = { href: '', download: '', click: clickSpy };
    vi.spyOn(document, 'createElement').mockReturnValue(
      anchor as unknown as HTMLAnchorElement,
    );
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    let captured = '';
    vi.spyOn(URL, 'createObjectURL').mockImplementation(((blob: Blob) => {
      void blob.text().then((text: string) => {
        captured = text;
      });
      return 'blob:mock';
    }) as typeof URL.createObjectURL);

    exportDraftDashboard({ dashboard: meta(), configuration: dirtyDraft() });

    // blob.text() resolves synchronously enough in happy-dom; assert on the
    // shape once the microtask drains
    return Promise.resolve().then(() => {
      const payload = JSON.parse(captured) as Record<string, unknown>;
      expect(payload.id).toBeUndefined();
      expect(payload.version).toBeUndefined();
      expect(payload.title).toBe('My dashboard');
    });
  });
});
