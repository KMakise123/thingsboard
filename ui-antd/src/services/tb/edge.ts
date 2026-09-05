/**
 * TB-edge transport (M13 wave-1).
 *
 * Endpoints pinned against EdgeController / RuleChainController (verified
 * 2026-09-06); full table in docs/agents/m13-backend-contract.md.
 *
 * Wire gotchas pinned here:
 *   - Lists always ride the `edgeInfos` family (`/api/tenant/edgeInfos`,
 *     `/api/customer/{id}/edgeInfos`): the bare `/edges` endpoints return
 *     `Edge` without a customerTitle column mapping, and sorting those by
 *     customerTitle breaks server-side.
 *   - Customer unassign has NO customerId segment
 *     (`DELETE /api/customer/edge/{edgeId}`) — unlike every other unassign.
 *   - `routingKey`/`secret` are created client-side and never server-
 *     generated; there is no separate credentials endpoint.
 *   - Page numbers are 0-based; callers pass an explicit sort (the backend
 *     default `id ASC` is not time-ordered) — this layer only flattens the
 *     PageLink it receives.
 */

import type { Edge, EdgeEvent } from '@/types/tb/edge';
import {
  type EdgeBulkImportRequest,
  type EdgeBulkImportResult,
  type EdgeInfo,
  type EdgeInstructions,
  type EdgeInstructionsMethod,
} from '@/types/tb/edge';
import type { EntitySubtype } from '@/types/tb/device';
import type { RuleChain } from '@/types/tb/rule-chain';
import type { Asset } from '@/types/tb/asset';
import type { DashboardInfo } from '@/types/tb/dashboard';
import type { Device } from '@/types/tb/device';
import type { EntityView } from '@/types/tb/entity-view';
import type { PageData, PageLink } from '@/types/tb/page';
import { pageLinkToQueryParams } from '@/types/tb/page';

import { tbHttp } from './http';

// ---------------------------------------------------------------------------
// Listing (always the edgeInfos family)
// ---------------------------------------------------------------------------

/**
 * GET /api/tenant/edgeInfos — tenant-scope list (EdgeInfo rows; the only
 * family whose customerTitle sort is mapped server-side).
 */
export async function getTenantEdgeInfos(
  pageLink: PageLink,
  type?: string,
): Promise<PageData<EdgeInfo>> {
  return tbHttp.get<PageData<EdgeInfo>>('/api/tenant/edgeInfos', {
    ...pageLinkToQueryParams(pageLink),
    type,
  });
}

/**
 * GET /api/customer/{customerId}/edgeInfos — customer-scope list
 * (TENANT_ADMIN for any customer; CUSTOMER_USER sees their own).
 */
export async function getCustomerEdgeInfos(
  customerId: string,
  pageLink: PageLink,
  type?: string,
): Promise<PageData<EdgeInfo>> {
  return tbHttp.get<PageData<EdgeInfo>>(
    `/api/customer/${customerId}/edgeInfos`,
    {
      ...pageLinkToQueryParams(pageLink),
      type,
    },
  );
}

/** GET /api/edge/types — tenant-distinct edge type names for filters. */
export async function getEdgeTypes(): Promise<Array<EntitySubtype>> {
  return tbHttp.get<Array<EntitySubtype>>('/api/edge/types');
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/** GET /api/edge/info/{edgeId} — V2 Infos shape (EdgeInfo row). */
export async function getEdgeInfo(edgeId: string): Promise<EdgeInfo> {
  return tbHttp.get<EdgeInfo>(`/api/edge/info/${edgeId}`);
}

/**
 * POST /api/edge — create/update. The body must carry `routingKey` +
 * `secret` (server never generates them) and the tenant needs an edge
 * template root rule chain, or creation fails with "Root edge rule chain is
 * not available!".
 */
export async function saveEdge(edge: Edge): Promise<Edge> {
  return tbHttp.post<Edge>('/api/edge', edge);
}

/** DELETE /api/edge/{edgeId} */
export async function deleteEdge(edgeId: string): Promise<void> {
  await tbHttp.delete(`/api/edge/${edgeId}`);
}

// ---------------------------------------------------------------------------
// Customer assignment
// ---------------------------------------------------------------------------

/** POST /api/customer/{customerId}/edge/{edgeId} — assign; returns the updated edge. */
export async function assignEdgeToCustomer(
  customerId: string,
  edgeId: string,
): Promise<Edge> {
  return tbHttp.post<Edge>(`/api/customer/${customerId}/edge/${edgeId}`);
}

/**
 * DELETE /api/customer/edge/{edgeId} — unassign; the path has NO customerId
 * segment. Unassigning an unassigned edge 400s.
 */
export async function unassignEdgeFromCustomer(edgeId: string): Promise<Edge> {
  return tbHttp.delete<Edge>(`/api/customer/edge/${edgeId}`);
}

/** POST /api/customer/public/edge/{edgeId} — move the edge to the public customer. */
export async function makeEdgePublic(edgeId: string): Promise<Edge> {
  return tbHttp.post<Edge>(`/api/customer/public/edge/${edgeId}`);
}

// ---------------------------------------------------------------------------
// Sub-entity reads (the five scope pages)
// ---------------------------------------------------------------------------

/** GET /api/edge/{edgeId}/assets — assigned assets (`type` filters, optional). */
export async function getEdgeAssets(
  edgeId: string,
  pageLink: PageLink,
  filter: { type?: string } = {},
): Promise<PageData<Asset>> {
  return tbHttp.get<PageData<Asset>>(`/api/edge/${edgeId}/assets`, {
    ...pageLinkToQueryParams(pageLink),
    type: filter.type,
  });
}

/**
 * GET /api/edge/{edgeId}/devices — assigned devices. `type` and
 * `deviceProfileId` are mutually exclusive server-side; `active` narrows by
 * online state (the scope-page filter trio rides these query params).
 */
export async function getEdgeDevices(
  edgeId: string,
  pageLink: PageLink,
  filter: { type?: string; deviceProfileId?: string; active?: boolean } = {},
): Promise<PageData<Device>> {
  return tbHttp.get<PageData<Device>>(`/api/edge/${edgeId}/devices`, {
    ...pageLinkToQueryParams(pageLink),
    type: filter.type,
    deviceProfileId: filter.deviceProfileId,
    active: filter.active,
  });
}

/** GET /api/edge/{edgeId}/entityViews — assigned entity views (`type` optional). */
export async function getEdgeEntityViews(
  edgeId: string,
  pageLink: PageLink,
  filter: { type?: string } = {},
): Promise<PageData<EntityView>> {
  return tbHttp.get<PageData<EntityView>>(`/api/edge/${edgeId}/entityViews`, {
    ...pageLinkToQueryParams(pageLink),
    type: filter.type,
  });
}

/** GET /api/edge/{edgeId}/dashboards — assigned dashboards (DashboardInfo rows). */
export async function getEdgeDashboards(
  edgeId: string,
  pageLink: PageLink,
): Promise<PageData<DashboardInfo>> {
  return tbHttp.get<PageData<DashboardInfo>>(
    `/api/edge/${edgeId}/dashboards`,
    pageLinkToQueryParams(pageLink),
  );
}

/**
 * GET /api/edge/{edgeId}/ruleChains — assigned EDGE-type rule chains;
 * TENANT_ADMIN only (sortProperty ∈ createdTime/name/root).
 */
export async function getEdgeRuleChains(
  edgeId: string,
  pageLink: PageLink,
): Promise<PageData<RuleChain>> {
  return tbHttp.get<PageData<RuleChain>>(
    `/api/edge/${edgeId}/ruleChains`,
    pageLinkToQueryParams(pageLink),
  );
}

// ---------------------------------------------------------------------------
// Sub-entity assign/unassign (per-entity pairs; batch = page-layer fan-out)
// ---------------------------------------------------------------------------

/** POST /api/edge/{edgeId}/asset/{assetId} — assign (async push to the edge). */
export async function assignEdgeAsset(
  edgeId: string,
  assetId: string,
): Promise<Asset> {
  return tbHttp.post<Asset>(`/api/edge/${edgeId}/asset/${assetId}`);
}

/** DELETE /api/edge/{edgeId}/asset/{assetId} */
export async function unassignEdgeAsset(
  edgeId: string,
  assetId: string,
): Promise<void> {
  await tbHttp.delete(`/api/edge/${edgeId}/asset/${assetId}`);
}

/** POST /api/edge/{edgeId}/device/{deviceId} — assign (async push to the edge). */
export async function assignEdgeDevice(
  edgeId: string,
  deviceId: string,
): Promise<Device> {
  return tbHttp.post<Device>(`/api/edge/${edgeId}/device/${deviceId}`);
}

/** DELETE /api/edge/{edgeId}/device/{deviceId} */
export async function unassignEdgeDevice(
  edgeId: string,
  deviceId: string,
): Promise<void> {
  await tbHttp.delete(`/api/edge/${edgeId}/device/${deviceId}`);
}

/** POST /api/edge/{edgeId}/entityView/{entityViewId} — assign (async push). */
export async function assignEdgeEntityView(
  edgeId: string,
  entityViewId: string,
): Promise<EntityView> {
  return tbHttp.post<EntityView>(
    `/api/edge/${edgeId}/entityView/${entityViewId}`,
  );
}

/** DELETE /api/edge/{edgeId}/entityView/{entityViewId} */
export async function unassignEdgeEntityView(
  edgeId: string,
  entityViewId: string,
): Promise<void> {
  await tbHttp.delete(`/api/edge/${edgeId}/entityView/${entityViewId}`);
}

/** POST /api/edge/{edgeId}/dashboard/{dashboardId} — assign (async push). */
export async function assignEdgeDashboard(
  edgeId: string,
  dashboardId: string,
): Promise<DashboardInfo> {
  return tbHttp.post<DashboardInfo>(
    `/api/edge/${edgeId}/dashboard/${dashboardId}`,
  );
}

/** DELETE /api/edge/{edgeId}/dashboard/{dashboardId} */
export async function unassignEdgeDashboard(
  edgeId: string,
  dashboardId: string,
): Promise<void> {
  await tbHttp.delete(`/api/edge/${edgeId}/dashboard/${dashboardId}`);
}

/** POST /api/edge/{edgeId}/ruleChain/{ruleChainId} — assign an EDGE-type chain. */
export async function assignEdgeRuleChain(
  edgeId: string,
  ruleChainId: string,
): Promise<RuleChain> {
  return tbHttp.post<RuleChain>(`/api/edge/${edgeId}/ruleChain/${ruleChainId}`);
}

/** DELETE /api/edge/{edgeId}/ruleChain/{ruleChainId} — the root chain cannot be unassigned. */
export async function unassignEdgeRuleChain(
  edgeId: string,
  ruleChainId: string,
): Promise<void> {
  await tbHttp.delete(`/api/edge/${edgeId}/ruleChain/${ruleChainId}`);
}

/** POST /api/edge/{edgeId}/{ruleChainId}/root — set the edge's root chain (async push). */
export async function setEdgeRootRuleChain(
  edgeId: string,
  ruleChainId: string,
): Promise<Edge> {
  return tbHttp.post<Edge>(`/api/edge/${edgeId}/${ruleChainId}/root`);
}

// ---------------------------------------------------------------------------
// Sync events (the Downlinks tab) — the ONLY consumer of /api/edge/{id}/events
// ---------------------------------------------------------------------------

/** Time-bounded page link (backend TimePageLink via createTimePageLink). */
export type EdgeEventsPageLink = PageLink & {
  startTime?: number;
  endTime?: number;
};

/**
 * GET /api/edge/{edgeId}/events — cloud-to-edge sync event page. The backend
 * hardcodes SORT_ORDERS to [seqId] so `sortProperty`/`sortOrder` are ignored
 * (every page is seqId ASC): callers must render the server order verbatim
 * and never pass a fake sort (R05).
 */
export async function getEdgeEvents(
  edgeId: string,
  pageLink: EdgeEventsPageLink,
): Promise<PageData<EdgeEvent>> {
  return tbHttp.get<PageData<EdgeEvent>>(`/api/edge/${edgeId}/events`, {
    ...pageLinkToQueryParams(pageLink),
    startTime: pageLink.startTime,
    endTime: pageLink.endTime,
  });
}

// ---------------------------------------------------------------------------
// Sync + instructions
// ---------------------------------------------------------------------------

/**
 * POST /api/edge/sync/{edgeId} — trigger a full cloud-to-edge sync. The
 * backend blocks (DeferredResult, ≤20s) until the edge answers; callers
 * wrap this in fire-and-forget toast + button loading (no polling).
 */
export async function syncEdge(edgeId: string): Promise<void> {
  await tbHttp.post<void>(`/api/edge/sync/${edgeId}`);
}

/** GET /api/edge/instructions/install/{edgeId}/{method} — markdown install guide. */
export async function getEdgeInstructionsInstall(
  edgeId: string,
  method: EdgeInstructionsMethod,
): Promise<EdgeInstructions> {
  return tbHttp.get<EdgeInstructions>(
    `/api/edge/instructions/install/${edgeId}/${method}`,
  );
}

/** GET /api/edge/instructions/upgrade/{edgeVersion}/{method} — markdown upgrade guide. */
export async function getEdgeInstructionsUpgrade(
  edgeVersion: string,
  method: EdgeInstructionsMethod,
): Promise<EdgeInstructions> {
  return tbHttp.get<EdgeInstructions>(
    `/api/edge/instructions/upgrade/${edgeVersion}/${method}`,
  );
}

/** GET /api/edge/{edgeId}/upgrade/available — whether a newer edge version is offered. */
export async function getEdgeUpgradeAvailable(edgeId: string): Promise<boolean> {
  return tbHttp.get<boolean>(`/api/edge/${edgeId}/upgrade/available`);
}

/**
 * GET /api/edge/missingToRelatedRuleChains/{edgeId} — rule chain ids (a JSON
 * array serialized as TEXT) that exist on the cloud but lack a related chain
 * for this edge; drives the "missing rule chains" alert on the ruleChains page.
 */
export async function getMissingToRelatedRuleChains(
  edgeId: string,
): Promise<string> {
  return tbHttp.get<string>(
    `/api/edge/missingToRelatedRuleChains/${edgeId}`,
  );
}

// ---------------------------------------------------------------------------
// User settings (the edge-instructions "don't show again" preference)
// ---------------------------------------------------------------------------

/**
 * GET /api/user/settings — the GENERAL user-settings JSON blob
 * (UserController.getUserSettings; `notDisplayInstructionsAfterAddEdge`
 * lives at its top level).
 */
export async function getUserSettings(): Promise<Record<string, unknown>> {
  return tbHttp.get<Record<string, unknown>>('/api/user/settings');
}

/**
 * PUT /api/user/settings — merge-update the GENERAL user settings: only the
 * provided keys change (UserController.putUserSettings). The edge
 * instructions dialog writes `{ notDisplayInstructionsAfterAddEdge: true }`.
 */
export async function putUserSettings(
  partial: Record<string, unknown>,
): Promise<void> {
  await tbHttp.put<void>('/api/user/settings', partial);
}

// ---------------------------------------------------------------------------
// CSV bulk import
// ---------------------------------------------------------------------------

/**
 * POST /api/edge/bulk_import — JSON body (CSV text + column mapping, see
 * EdgeBulkImportRequest); requires an edge template root rule chain to exist.
 */
export async function importEdges(
  request: EdgeBulkImportRequest,
): Promise<EdgeBulkImportResult> {
  return tbHttp.post<EdgeBulkImportResult>('/api/edge/bulk_import', request);
}

// ---------------------------------------------------------------------------
// Edge template / auto-assign rule chains (rule-chain template page)
// ---------------------------------------------------------------------------

/**
 * GET /api/ruleChain/autoAssignToEdgeRuleChains — chains auto-assigned to
 * every newly created edge (unpaged server-side scan returned as a list).
 */
export async function getAutoAssignToEdgeRuleChains(): Promise<
  Array<RuleChain>
> {
  return tbHttp.get<Array<RuleChain>>(
    '/api/ruleChain/autoAssignToEdgeRuleChains',
  );
}

/**
 * POST /api/ruleChain/{ruleChainId}/edgeTemplateRoot — make the chain the
 * root for NEWLY created edges (already-created edges keep theirs).
 */
export async function setEdgeTemplateRoot(
  ruleChainId: string,
): Promise<RuleChain> {
  return tbHttp.post<RuleChain>(
    `/api/ruleChain/${ruleChainId}/edgeTemplateRoot`,
  );
}

/** POST /api/ruleChain/{ruleChainId}/autoAssignToEdge — enable auto-assign for the chain. */
export async function setAutoAssignToEdgeRuleChain(
  ruleChainId: string,
): Promise<RuleChain> {
  return tbHttp.post<RuleChain>(
    `/api/ruleChain/${ruleChainId}/autoAssignToEdge`,
  );
}

/** DELETE /api/ruleChain/{ruleChainId}/autoAssignToEdge — disable auto-assign (already-assigned edges keep it). */
export async function unsetAutoAssignToEdgeRuleChain(
  ruleChainId: string,
): Promise<RuleChain> {
  return tbHttp.delete<RuleChain>(
    `/api/ruleChain/${ruleChainId}/autoAssignToEdge`,
  );
}
