import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, request as playwrightRequest, test } from '@playwright/test';

/**
 * Visual regression skeleton (docs/spec/v1-test-baseline.md §4).
 *
 * Scope: the login page + ALL demo dashboards the CE installer ships
 * (application/src/main/data/json/demo/dashboards/: Thermostats, Firmware,
 * Software, Rule Engine Statistics — loaded into the demo tenant by
 * DefaultSystemDataLoaderService, so the TA principal owns them and their ids
 * are per-install random UUIDs resolved here by title over the REST API).
 *
 * Double insurance per spec §4:
 * 1. DOM: the grid really mounts (`.react-grid-item`) and NO widget falls
 *    back to a placeholder (`[data-widget-placeholder]` — the 「暂未支持」/
 *    "Not supported yet" card, src/components/widgets/placeholders.tsx) and
 *    the page-level error Alert stays empty.
 * 2. Pixel anchor: `toHaveScreenshot` against baselines COMMITTED TO GIT at
 *    e2e/specs/visual/visual.spec.ts-snapshots/.
 *
 * Baseline update flow (intentional UI change ONLY):
 *   1. land the UI change,
 *   2. `npx playwright test e2e/specs/visual --update-snapshots`,
 *   3. eyeball the diff, then commit the new baselines together with the change.
 * A visual break without an update commit then fails CI — 「故意改的」and
 * 「不小心弄坏的」are separated by whether the baseline diff was committed.
 *
 * Serial on purpose: screenshots must not race each other or the WS-driven
 * repaints of a second page (`test.describe.configure({ mode: 'serial' })`;
 * the shared config already caps CI at workers=1 and is non-parallel).
 *
 * Known pixel-drift sources (why dashboards carry a small tolerance below):
 * - charts plot live telemetry over a rolling timewindow, so tick labels and
 *   series tails move with wall clock between runs;
 * - echarts redraws on WS pushes (a settle wait below narrows, not removes,
 *   the window).
 * Measured on this suite: a live dashboard drifts ~322px ≈ 1% of the image
 * between runs — hence MAX_DIFF_PIXEL_RATIO = 0.02 for the dashboard shots.
 * Real breakage (placeholder cards, layout collapse, brand shift) moves far
 * more than 2%, so the anchor still bites. The login page is static and
 * stays strict pixel-by-pixel.
 * - baselines are OS/renderer-dependent (default snapshot names carry the
 *   platform suffix) — regenerate on the same platform that CI will use, or
 *   pin snapshotPathTemplate, when CI e2e is switched on.
 */

test.describe.configure({ mode: 'serial' });

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080';

/** Live-chart noise floor (see header): 2% of pixels may differ. */
const MAX_DIFF_PIXEL_RATIO = 0.02;

const DEMO_DASHBOARDS = [
  { title: 'Thermostats', snapshot: 'thermostats.png' },
  { title: 'Firmware', snapshot: 'firmware.png' },
  { title: 'Software', snapshot: 'software.png' },
  { title: 'Rule Engine Statistics', snapshot: 'rule-engine-statistics.png' },
] as const;

/** Guard band after the grid mounts: let echarts initial animation settle. */
const RENDER_SETTLE_MS = 1_500;

/**
 * Demo dashboards get random UUIDs at install time, so resolve them by
 * title via the REST API (TA from the globalSetup-written fixture).
 * Cached at module level — one lookup per suite run.
 */
let demoIdsPromise: Promise<Record<string, string>> | null = null;

function demoDashboardIds(): Promise<Record<string, string>> {
  demoIdsPromise ??= (async () => {
    const fixture = JSON.parse(
      readFileSync(join(process.cwd(), 'e2e', '.auth', 'api.json'), 'utf8'),
    ) as { TA: { email: string; password: string } };
    const ctx = await playwrightRequest.newContext({ baseURL: API_URL });
    const login = await ctx.post('/api/auth/login', {
      data: { username: fixture.TA.email, password: fixture.TA.password },
    });
    expect(
      login.ok(),
      `[visual] TA login against ${API_URL} failed — is the backend up?`,
    ).toBeTruthy();
    const { token } = (await login.json()) as { token: string };
    const list = await ctx.get('/api/tenant/dashboards', {
      headers: { 'X-Authorization': `Bearer ${token}` },
      params: { pageSize: 100, page: 0 },
    });
    expect(list.ok(), '[visual] listing tenant dashboards failed').toBeTruthy();
    const page = (await list.json()) as {
      data: Array<{ title: string; id: { id: string } }>;
    };
    const byTitle: Record<string, string> = {};
    for (const d of page.data) byTitle[d.title] = d.id.id;
    await ctx.dispose();
    return byTitle;
  })();
  return demoIdsPromise;
}

test.describe('visual: login page', () => {
  // Fresh context: a logged-in user is redirected away from /login, and the
  // authed describes below use the TA storage state.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login page renders the form and matches the baseline', async ({
    page,
  }) => {
    await page.goto('/login');
    // DOM insurance: the brand seam (locale-aware locators per fixtures/login).
    await expect(page.getByPlaceholder(/邮箱|Email/i).first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(
      page.getByRole('button', { name: /登\s*录|Sign in/i }).first(),
    ).toBeVisible();

    await expect(page).toHaveScreenshot('login.png');
  });
});

test.describe('visual: CE demo dashboards', () => {
  test.use({ storageState: 'e2e/.auth/ta.json' });

  for (const demo of DEMO_DASHBOARDS) {
    test(`demo dashboard「${demo.title}」renders every widget and matches the baseline`, async ({
      page,
    }) => {
      const ids = await demoDashboardIds();
      const id = ids[demo.title];
      expect(
        id,
        `[visual] demo dashboard「${demo.title}」not found in the tenant — ` +
          `installer demo data missing? (install-db.sh runs --install.load_demo=true)`,
      ).toBeTruthy();

      await page.goto(`/dashboards/${id}`);

      const shell = page.locator('[data-dashboard-page]');
      await expect(shell).toBeVisible();
      // Positive paint signal: grid items actually mounted (not the loader,
      // not the empty states).
      await expect(shell.locator('.react-grid-item').first()).toBeVisible();
      await page.waitForTimeout(RENDER_SETTLE_MS);

      // DOM insurance (§4): zero 「暂未支持」 placeholder cards, no page-level
      // failure alert.
      await expect(page.locator('[data-widget-placeholder]')).toHaveCount(0);
      await expect(page.locator('.ant-alert-error')).toHaveCount(0);

      await expect(page).toHaveScreenshot(demo.snapshot, {
        fullPage: true,
        maxDiffPixelRatio: MAX_DIFF_PIXEL_RATIO,
      });
    });
  }
});
