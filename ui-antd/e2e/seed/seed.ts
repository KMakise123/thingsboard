/**
 * Idempotent E2E seed (deliverable, docs/spec/v1-test-baseline.md §3.1).
 *
 * Runs against the REAL backend REST API. Safe to re-run: every step is
 * find-or-create keyed on the `E2E` prefix, so demo data is never touched.
 *
 * Accounts:
 * - SA / TA come from the demo dataset itself
 *   (sysadmin@thingsboard.org / tenant@thingsboard.org).
 * - CU is created here under a dedicated customer (activation-link channel,
 *   see BCR C-11: there is no admin-side password reset endpoint).
 */

const API = process.env.E2E_API_URL ?? 'http://localhost:8080';

export const SA = { email: 'sysadmin@thingsboard.org', password: 'sysadmin' };
export const TA = { email: 'tenant@thingsboard.org', password: 'tenant' };
export const CU = { email: 'e2e-cu@thingsboard.org', password: 'Customer123!' };

const CUSTOMER_TITLE = 'E2E Customer';
const DEVICE_NAME = 'E2E Thermostat';
const ALARM_TYPE = 'E2E_HIGH_TEMPERATURE';

type TokenPair = { token: string; refreshToken: string };

async function login(email: string, password: string): Promise<TokenPair> {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: email, password }),
  });
  if (!res.ok) throw new Error(`login ${email} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as TokenPair;
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

async function findCustomer(token: string, title: string) {
  const res = await fetch(
    `${API}/api/customers?pageSize=100&page=0&sortProperty=title&sortOrder=ASC&textSearch=${encodeURIComponent(title)}`,
    authed({}, token),
  );
  const page = (await res.json()) as { data: Array<{ id: { id: string }; title: string }> };
  return page.data.find((c) => c.title === title);
}

async function ensureCustomerUser(ta: TokenPair): Promise<void> {
  // Find-or-create with a re-find fallback: parallel global-setups may race
  // on the create; the loser re-finds the winner's customer instead of dying.
  const customer =
    (await findCustomer(ta.token, CUSTOMER_TITLE)) ??
    (await (async () => {
      const res = await fetch(
        `${API}/api/customer`,
        authed({ method: 'POST', body: JSON.stringify({ title: CUSTOMER_TITLE }) }, ta.token),
      );
      if (!res.ok) {
        const raced = await findCustomer(ta.token, CUSTOMER_TITLE);
        if (raced) return raced;
        throw new Error(`create customer failed: ${res.status} ${await res.text()}`);
      }
      return (await res.json()) as { id: { id: string }; title: string };
    })());

  // Find-or-create the CU user under that customer.
  const listRes = await fetch(
    `${API}/api/customer/${customer.id.id}/users?pageSize=100&page=0&textSearch=${encodeURIComponent(CU.email)}`,
    authed({}, ta.token),
  );
  const users = (await listRes.json()) as { data: Array<{ email: string; id: { id: string } }> };
  const existing = users.data.find((u) => u.email === CU.email);
  if (existing) return; // already activated in a previous run

  const createRes = await fetch(
    `${API}/api/user?sendActivationMail=false`,
    authed(
      {
        method: 'POST',
        body: JSON.stringify({
          email: CU.email,
          firstName: 'E2E',
          lastName: 'CustomerUser',
          authority: 'CUSTOMER_USER',
          customerId: { entityType: 'CUSTOMER', id: customer.id.id },
        }),
      },
      ta.token,
    ),
  );
  if (!createRes.ok) throw new Error(`create CU failed: ${createRes.status} ${await createRes.text()}`);
  const created = (await createRes.json()) as { id: { id: string } };
  const activationRes = await fetch(
    `${API}/api/user/${created.id.id}/activationLink`,
    authed({}, ta.token),
  );
  // Backend answers text/plain with the full link; extract the token param.
  const link = await activationRes.text();
  const activateToken = new URL(link).searchParams.get('activateToken') ?? '';
  const activateRes = await fetch(`${API}/api/noauth/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activateToken, password: CU.password }),
  });
  if (!activateRes.ok) throw new Error(`activate CU failed: ${activateRes.status} ${await activateRes.text()}`);
}

async function ensureDevice(ta: TokenPair): Promise<{ id: string; token: string }> {
  const searchRes = await fetch(
    `${API}/api/tenant/devices?pageSize=100&page=0&textSearch=${encodeURIComponent(DEVICE_NAME)}`,
    authed({}, ta.token),
  );
  const page = (await searchRes.json()) as {
    data: Array<{ name: string; id: { id: string }; deviceId?: string }>;
  };
  const existing = page.data.find((d) => d.name === DEVICE_NAME);
  if (existing) {
    const credRes = await fetch(
      `${API}/api/device/${existing.id.id}/credentials`,
      authed({}, ta.token),
    );
    return { id: existing.id.id, token: ((await credRes.json()) as { credentialsId: string }).credentialsId };
  }
  const createRes = await fetch(
    `${API}/api/device`,
    authed({ method: 'POST', body: JSON.stringify({ name: DEVICE_NAME, type: 'default' }) }, ta.token),
  );
  if (!createRes.ok) throw new Error(`create device failed: ${createRes.status} ${await createRes.text()}`);
  const device = (await createRes.json()) as { id: { id: string } };
  const credRes = await fetch(`${API}/api/device/${device.id.id}/credentials`, authed({}, ta.token));
  return { id: device.id.id, token: ((await credRes.json()) as { credentialsId: string }).credentialsId };
}

async function ensureAlarm(ta: TokenPair, deviceId: string): Promise<void> {
  const listRes = await fetch(
    `${API}/api/device/${deviceId}/alarms?pageSize=10&page=0&textSearch=${encodeURIComponent(ALARM_TYPE)}`,
    authed({}, ta.token),
  );
  if (listRes.ok) {
    const page = (await listRes.json()) as { data: Array<{ type: string }> };
    if (page.data.some((a) => a.type === ALARM_TYPE)) return;
  }
  const res = await fetch(
    `${API}/api/alarm`,
    authed(
      {
        method: 'POST',
        body: JSON.stringify({
          type: ALARM_TYPE,
          severity: 'MAJOR',
          startTs: Date.now(),
          details: { message: 'seeded by e2e' },
          originator: { entityType: 'DEVICE', id: deviceId },
        }),
      },
      ta.token,
    ),
  );
  if (!res.ok) throw new Error(`create alarm failed: ${res.status} ${await res.text()}`);
}

/** Entry point used by global-setup (and runnable standalone via tsx). */
export async function seed(): Promise<void> {
  const sa = await login(SA.email, SA.password);
  const ta = await login(TA.email, TA.password);
  await ensureCustomerUser(ta);
  const device = await ensureDevice(ta);
  await ensureAlarm(ta, device.id);
  // SA token unused so far but validates the SA account before the suite runs.
  void sa;
}

if (process.argv[1] && process.argv[1].includes('seed')) {
  seed()
    .then(() => {
      console.log('[e2e-seed] done');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[e2e-seed] failed:', err);
      process.exit(1);
    });
}
