import { chromium, type FullConfig } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { uiLogin } from './fixtures/login';
import { CU, SA, TA, seed } from './seed/seed';

/**
 * Global setup:
 * 1. verifies the target UI/API are reachable (fail fast with a clear message)
 * 2. runs the idempotent seed (three-role accounts + demo data refs)
 * 3. persists per-role storageState files for tests that skip the login UI
 */

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:8000';
const apiURL = process.env.E2E_API_URL ?? 'http://localhost:8080';
const AUTH_DIR = 'e2e/.auth';

async function reachable(url: string, label: string): Promise<void> {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    if (res.status >= 500) throw new Error(`${res.status}`);
  } catch (err) {
    throw new Error(
      `[e2e] ${label} unreachable at ${url} (${String(err)}).\n` +
        `Start it first: backend -> local/run-backend.sh (or e2e/backend/start-backend.sh); UI -> npm run dev.`,
    );
  }
}

async function saveStorageState(role: 'sa' | 'ta' | 'cu', email: string, password: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });
  await page.goto(`${baseURL}/login`);
  await uiLogin(page, email, password);
  mkdirSync(AUTH_DIR, { recursive: true });
  await page.context().storageState({ path: `${AUTH_DIR}/${role}.json` });
  await browser.close();
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  await reachable(`${baseURL}/login`, 'UI');
  await reachable(`${apiURL}/swagger-ui.html`, 'API');
  await seed();

  await saveStorageState('ta', TA.email, TA.password);
  await saveStorageState('cu', CU.email, CU.password);
  await saveStorageState('sa', SA.email, SA.password);
  writeFileSync(`${AUTH_DIR}/api.json`, JSON.stringify({ SA, TA, CU, apiURL }, null, 2));
}
