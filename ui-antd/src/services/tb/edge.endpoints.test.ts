/**
 * TB-edge transport endpoints. Paths pinned against EdgeController +
 * RuleChainController (verified 2026-09-06, docs/agents/m13-backend-contract.md):
 * lists ride the edgeInfos family; the customer unassign has no customerId
 * segment; the five sub-entity families each get a read + assign/unassign
 * pair; multipart is not involved on this transport.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityType } from '@/types/tb/entity';
import type { Edge, EdgeBulkImportRequest } from '@/types/tb/edge';

import { tbHttp } from './http';

vi.mock('./http', () => ({
  tbHttp: {
    request: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import {
  assignEdgeAsset,
  assignEdgeDashboard,
  assignEdgeDevice,
  assignEdgeEntityView,
  assignEdgeRuleChain,
  assignEdgeToCustomer,
  deleteEdge,
  getAutoAssignToEdgeRuleChains,
  getCustomerEdgeInfos,
  getEdgeAssets,
  getEdgeDashboards,
  getEdgeDevices,
  getEdgeEntityViews,
  getEdgeInfo,
  getEdgeInstructionsInstall,
  getEdgeInstructionsUpgrade,
  getEdgeRuleChains,
  getEdgeTypes,
  getEdgeUpgradeAvailable,
  getMissingToRelatedRuleChains,
  getTenantEdgeInfos,
  importEdges,
  makeEdgePublic,
  saveEdge,
  setAutoAssignToEdgeRuleChain,
  setEdgeRootRuleChain,
  setEdgeTemplateRoot,
  syncEdge,
  unassignEdgeAsset,
  unassignEdgeDashboard,
  unassignEdgeDevice,
  unassignEdgeEntityView,
  unassignEdgeFromCustomer,
  unassignEdgeRuleChain,
  unsetAutoAssignToEdgeRuleChain,
} from './edge';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const del = vi.mocked(tbHttp.delete);

const PAGE_LINK = {
  pageSize: 20,
  page: 0,
  textSearch: 'edge',
  sortOrder: { property: 'createdTime', direction: 'DESC' as const },
};

const FLAT_PAGE = {
  pageSize: 20,
  page: 0,
  textSearch: 'edge',
  sortProperty: 'createdTime',
  sortOrder: 'DESC',
};

const EDGE: Edge = {
  id: { entityType: EntityType.EDGE, id: 'edge-1' },
  createdTime: 1000,
  name: 'gateway',
  type: 'default',
  routingKey: 'rk-1',
  secret: 's3cret',
};

describe('edge transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
    del.mockResolvedValue(undefined as never);
  });

  it('lists tenant edges over /api/tenant/edgeInfos with an optional type filter', async () => {
    await getTenantEdgeInfos(PAGE_LINK, 'default');
    expect(get).toHaveBeenCalledWith('/api/tenant/edgeInfos', {
      ...FLAT_PAGE,
      type: 'default',
    });

    await getTenantEdgeInfos({ ...PAGE_LINK, textSearch: undefined });
    expect(get).toHaveBeenCalledWith('/api/tenant/edgeInfos', {
      pageSize: 20,
      page: 0,
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
      type: undefined,
    });
  });

  it('lists customer edges over /api/customer/{id}/edgeInfos', async () => {
    await getCustomerEdgeInfos('cust-1', PAGE_LINK);
    expect(get).toHaveBeenCalledWith('/api/customer/cust-1/edgeInfos', {
      ...FLAT_PAGE,
      type: undefined,
    });
  });

  it('reads the edge type facets and the V2 info row', async () => {
    await getEdgeTypes();
    expect(get).toHaveBeenCalledWith('/api/edge/types');

    await getEdgeInfo('edge-1');
    expect(get).toHaveBeenCalledWith('/api/edge/info/edge-1');
  });

  it('saves on POST /api/edge and deletes by id', async () => {
    await saveEdge(EDGE);
    expect(post).toHaveBeenCalledWith('/api/edge', EDGE);

    await deleteEdge('edge-1');
    expect(del).toHaveBeenCalledWith('/api/edge/edge-1');
  });

  it('assigns to a customer, unassigns without a customerId segment, and makes public', async () => {
    await assignEdgeToCustomer('cust-1', 'edge-1');
    expect(post).toHaveBeenCalledWith('/api/customer/cust-1/edge/edge-1');

    // The unassign path carries ONLY the edge id (backend shape).
    await unassignEdgeFromCustomer('edge-1');
    expect(del).toHaveBeenCalledWith('/api/customer/edge/edge-1');

    await makeEdgePublic('edge-1');
    expect(post).toHaveBeenCalledWith('/api/customer/public/edge/edge-1');
  });

  it('reads the five sub-entity lists with their filters', async () => {
    await getEdgeAssets('edge-1', PAGE_LINK, { type: 'building' });
    expect(get).toHaveBeenCalledWith('/api/edge/edge-1/assets', {
      ...FLAT_PAGE,
      type: 'building',
    });

    await getEdgeDevices('edge-1', PAGE_LINK, {
      deviceProfileId: 'prof-1',
      active: true,
    });
    expect(get).toHaveBeenCalledWith('/api/edge/edge-1/devices', {
      ...FLAT_PAGE,
      type: undefined,
      deviceProfileId: 'prof-1',
      active: true,
    });

    await getEdgeDevices('edge-1', PAGE_LINK, { type: 'thermometer' });
    expect(get).toHaveBeenCalledWith('/api/edge/edge-1/devices', {
      ...FLAT_PAGE,
      type: 'thermometer',
      deviceProfileId: undefined,
      active: undefined,
    });

    await getEdgeEntityViews('edge-1', PAGE_LINK, { type: 'view' });
    expect(get).toHaveBeenCalledWith('/api/edge/edge-1/entityViews', {
      ...FLAT_PAGE,
      type: 'view',
    });

    await getEdgeDashboards('edge-1', PAGE_LINK);
    expect(get).toHaveBeenCalledWith('/api/edge/edge-1/dashboards', FLAT_PAGE);

    await getEdgeRuleChains('edge-1', PAGE_LINK);
    expect(get).toHaveBeenCalledWith('/api/edge/edge-1/ruleChains', FLAT_PAGE);
  });

  it('assigns and unassigns all five sub-entity families on their exact paths', async () => {
    await assignEdgeAsset('edge-1', 'a-1');
    expect(post).toHaveBeenCalledWith('/api/edge/edge-1/asset/a-1');
    await unassignEdgeAsset('edge-1', 'a-1');
    expect(del).toHaveBeenCalledWith('/api/edge/edge-1/asset/a-1');

    await assignEdgeDevice('edge-1', 'd-1');
    expect(post).toHaveBeenCalledWith('/api/edge/edge-1/device/d-1');
    await unassignEdgeDevice('edge-1', 'd-1');
    expect(del).toHaveBeenCalledWith('/api/edge/edge-1/device/d-1');

    await assignEdgeEntityView('edge-1', 'ev-1');
    expect(post).toHaveBeenCalledWith('/api/edge/edge-1/entityView/ev-1');
    await unassignEdgeEntityView('edge-1', 'ev-1');
    expect(del).toHaveBeenCalledWith('/api/edge/edge-1/entityView/ev-1');

    await assignEdgeDashboard('edge-1', 'dash-1');
    expect(post).toHaveBeenCalledWith('/api/edge/edge-1/dashboard/dash-1');
    await unassignEdgeDashboard('edge-1', 'dash-1');
    expect(del).toHaveBeenCalledWith('/api/edge/edge-1/dashboard/dash-1');

    await assignEdgeRuleChain('edge-1', 'rc-1');
    expect(post).toHaveBeenCalledWith('/api/edge/edge-1/ruleChain/rc-1');
    await unassignEdgeRuleChain('edge-1', 'rc-1');
    expect(del).toHaveBeenCalledWith('/api/edge/edge-1/ruleChain/rc-1');
  });

  it('sets the per-edge root rule chain and triggers a sync', async () => {
    await setEdgeRootRuleChain('edge-1', 'rc-1');
    expect(post).toHaveBeenCalledWith('/api/edge/edge-1/rc-1/root');

    await syncEdge('edge-1');
    expect(post).toHaveBeenCalledWith('/api/edge/sync/edge-1');
  });

  it('fetches install/upgrade instructions and the upgrade availability flag', async () => {
    await getEdgeInstructionsInstall('edge-1', 'ubuntu');
    expect(get).toHaveBeenCalledWith(
      '/api/edge/instructions/install/edge-1/ubuntu',
    );

    await getEdgeInstructionsUpgrade('3.9.0', 'docker');
    expect(get).toHaveBeenCalledWith(
      '/api/edge/instructions/upgrade/3.9.0/docker',
    );

    get.mockResolvedValue(true as never);
    await expect(getEdgeUpgradeAvailable('edge-1')).resolves.toBe(true);
    expect(get).toHaveBeenCalledWith('/api/edge/edge-1/upgrade/available');
  });

  it('reads the missing-to-related rule chains text answer', async () => {
    get.mockResolvedValue('["rc-1","rc-2"]' as never);
    await expect(getMissingToRelatedRuleChains('edge-1')).resolves.toBe(
      '["rc-1","rc-2"]',
    );
    expect(get).toHaveBeenCalledWith(
      '/api/edge/missingToRelatedRuleChains/edge-1',
    );
  });

  it('posts the CSV bulk import to /api/edge/bulk_import', async () => {
    const request: EdgeBulkImportRequest = {
      file: 'name,type,secret\ngw,default,abc',
      mapping: {
        columns: [{ type: 'NAME' }, { type: 'SECRET' }],
        delimiter: ',',
        header: true,
        update: false,
      },
    };
    await importEdges(request);
    expect(post).toHaveBeenCalledWith('/api/edge/bulk_import', request);
  });

  it('reads the auto-assign chain list and toggles template/auto-assign flags', async () => {
    await getAutoAssignToEdgeRuleChains();
    expect(get).toHaveBeenCalledWith(
      '/api/ruleChain/autoAssignToEdgeRuleChains',
    );

    await setEdgeTemplateRoot('rc-1');
    expect(post).toHaveBeenCalledWith('/api/ruleChain/rc-1/edgeTemplateRoot');

    await setAutoAssignToEdgeRuleChain('rc-1');
    expect(post).toHaveBeenCalledWith('/api/ruleChain/rc-1/autoAssignToEdge');

    await unsetAutoAssignToEdgeRuleChain('rc-1');
    expect(del).toHaveBeenCalledWith('/api/ruleChain/rc-1/autoAssignToEdge');
  });
});
