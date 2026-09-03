/**
 * Backend REST helpers for the smoke matrix (docs/spec/v1-test-baseline.md
 * §3.3). The shared seed (e2e/seed/seed.ts) owns accounts, the E2E device,
 * the E2E alarm and the E2E customer; the domains that the demo dataset
 * leaves empty (assets, entity views, gateway devices, customer-assigned
 * dashboards) are provisioned here — find-or-create keyed on the `E2E`
 * prefix, idempotent under parallel workers (create race → re-find).
 */

const API = process.env.E2E_API_URL ?? 'http://localhost:8080';

export type TokenPair = { token: string; refreshToken: string };

export async function apiLogin(
  email: string,
  password: string,
): Promise<string> {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: email, password }),
  });
  if (!res.ok)
    throw new Error(
      `api login ${email} failed: ${res.status} ${await res.text()}`,
    );
  return ((await res.json()) as TokenPair).token;
}

function authed(extra: RequestInit = {}, token?: string): RequestInit {
  return {
    ...extra,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { 'X-Authorization': `Bearer ${token}` } : {}),
      ...(extra.headers ?? {}),
    },
  };
}

type EntityIdJson = { id: string };
type Ided = { id: EntityIdJson };

/** Search a tenant-scoped page endpoint for an entity by exact name/title. */
async function findOnPage(
  token: string,
  path: string,
  search: string,
  nameKey: 'name' | 'title',
  exact: string,
): Promise<Ided | undefined> {
  const res = await fetch(
    `${API}${path}?pageSize=100&page=0&textSearch=${encodeURIComponent(search)}`,
    authed({}, token),
  );
  if (!res.ok) return undefined;
  const page = (await res.json()) as {
    data: Array<Ided & Record<string, string>>;
  };
  return page.data.find((row) => row[nameKey] === exact);
}

export const ASSET_NAME = 'E2E Asset';
export const ENTITY_VIEW_NAME = 'E2E Entity View';
export const GATEWAY_NAME = 'E2E Gateway';

/** Idempotent "E2E Asset" (type default) — the demo dataset has no assets. */
export async function ensureAsset(token: string): Promise<Ided> {
  const existing = await findOnPage(
    token,
    '/api/tenant/assets',
    ASSET_NAME,
    'name',
    ASSET_NAME,
  );
  if (existing) return existing;
  const res = await fetch(
    `${API}/api/asset`,
    authed(
      {
        method: 'POST',
        body: JSON.stringify({ name: ASSET_NAME, type: 'default' }),
      },
      token,
    ),
  );
  if (res.ok) return (await res.json()) as Ided;
  const raced = await findOnPage(
    token,
    '/api/tenant/assets',
    ASSET_NAME,
    'name',
    ASSET_NAME,
  );
  if (raced) return raced;
  throw new Error(`ensureAsset failed: ${res.status} ${await res.text()}`);
}

/** Idempotent "E2E Entity View" targeting the given device. */
export async function ensureEntityView(
  token: string,
  targetDeviceId: string,
): Promise<Ided> {
  const existing = await findOnPage(
    token,
    '/api/tenant/entityViews',
    ENTITY_VIEW_NAME,
    'name',
    ENTITY_VIEW_NAME,
  );
  if (existing) return existing;
  const res = await fetch(
    `${API}/api/entityView`,
    authed(
      {
        method: 'POST',
        body: JSON.stringify({
          name: ENTITY_VIEW_NAME,
          type: 'default',
          entityId: { entityType: 'DEVICE', id: targetDeviceId },
          keys: {},
        }),
      },
      token,
    ),
  );
  if (res.ok) return (await res.json()) as Ided;
  const raced = await findOnPage(
    token,
    '/api/tenant/entityViews',
    ENTITY_VIEW_NAME,
    'name',
    ENTITY_VIEW_NAME,
  );
  if (raced) return raced;
  throw new Error(`ensureEntityView failed: ${res.status} ${await res.text()}`);
}

/** Idempotent "E2E Gateway" device (additionalInfo.gateway=true). */
export async function ensureGatewayDevice(token: string): Promise<Ided> {
  const existing = await findOnPage(
    token,
    '/api/tenant/devices',
    GATEWAY_NAME,
    'name',
    GATEWAY_NAME,
  );
  if (existing) return existing;
  const res = await fetch(
    `${API}/api/device`,
    authed(
      {
        method: 'POST',
        body: JSON.stringify({
          name: GATEWAY_NAME,
          type: 'gateway',
          additionalInfo: { gateway: true },
        }),
      },
      token,
    ),
  );
  if (res.ok) return (await res.json()) as Ided;
  const raced = await findOnPage(
    token,
    '/api/tenant/devices',
    GATEWAY_NAME,
    'name',
    GATEWAY_NAME,
  );
  if (raced) return raced;
  throw new Error(
    `ensureGatewayDevice failed: ${res.status} ${await res.text()}`,
  );
}

/** Find a tenant device by exact name (no mutation). */
export async function findDevice(token: string, name: string): Promise<Ided> {
  const found = await findOnPage(
    token,
    '/api/tenant/devices',
    name,
    'name',
    name,
  );
  if (!found) throw new Error(`device "${name}" not found — did the seed run?`);
  return found;
}

/**
 * Assign the dashboard titled `dashboardTitle` to the customer titled
 * `customerTitle` (skip when already assigned). Customer users only see
 * customer-scoped dashboards, so the M5 CU smoke needs this once.
 */
export async function ensureDashboardAssignedToCustomer(
  taToken: string,
  dashboardTitle: string,
  customerTitle: string,
): Promise<void> {
  const customer = await findOnPage(
    taToken,
    '/api/customers',
    customerTitle,
    'title',
    customerTitle,
  );
  if (!customer)
    throw new Error(
      `customer "${customerTitle}" not found — did the seed run?`,
    );
  const dashboards = await findOnPage(
    taToken,
    '/api/tenant/dashboards',
    dashboardTitle,
    'title',
    dashboardTitle,
  );
  if (!dashboards)
    throw new Error(
      `dashboard "${dashboardTitle}" not found in the demo dataset`,
    );
  const assigned = await fetch(
    `${API}/api/customer/${customer.id.id}/dashboards?pageSize=100&page=0`,
    authed({}, taToken),
  );
  if (assigned.ok) {
    const page = (await assigned.json()) as {
      data: Array<Ided & { title: string }>;
    };
    if (page.data.some((d) => d.id.id === dashboards.id.id)) return;
  }
  await fetch(
    `${API}/api/customer/${customer.id.id}/dashboard/${dashboards.id.id}`,
    authed({ method: 'POST' }, taToken),
  );
}
