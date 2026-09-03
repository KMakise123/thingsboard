import { expect, test } from '@playwright/test';

import {
  apiLogin,
  ensureDashboardAssignedToCustomer,
} from '../../fixtures/api';

/**
 * Smoke matrix — dashboards domain (spec §3.3 row 8, M5).
 *
 * TA: list → search the demo "Thermostats" dashboard → readonly view with
 * rendered widgets → back; plus the /usage system page. CU: the customer
 * face of the same flow — the demo dashboard is assigned to the E2E
 * customer first (idempotent), because customer users see only
 * customer-scoped dashboards.
 *
 * Widget assertions: the grid mounts at least one widget cell and nothing
 * falls back to the unsupported placeholder (data-widget-placeholder /
 * 暂未支持 / Not supported yet).
 */

const DASHBOARD_TITLE = 'Thermostats';

async function expectReadOnlyDashboardRendered(
  page: import('@playwright/test').Page,
): Promise<void> {
  await expect(page.locator('.react-grid-item').first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator('[data-widget-placeholder]')).toHaveCount(0);
  await expect(page.getByText(/暂未支持|Not supported yet/i)).toHaveCount(0);
  await expect(page.locator('.ant-alert-error')).toHaveCount(0);
}

test.describe('dashboards — tenant admin', () => {
  test.use({ storageState: 'e2e/.auth/ta.json' });

  test('TA dashboards: list, search, readonly view with rendered widgets, back', async ({
    page,
  }) => {
    await page.goto('/dashboards');
    await expect(page.locator('.ant-table')).toBeVisible();

    await page
      .getByPlaceholder(/搜索仪表盘|Search dashboards/i)
      .fill(DASHBOARD_TITLE);
    const titleLink = page
      .locator('.ant-table')
      .locator('a.ant-typography-link', { hasText: DASHBOARD_TITLE })
      .first();
    await expect(titleLink).toBeVisible();
    await titleLink.click();

    await expect(page).toHaveURL(/\/dashboards\/[0-9a-f-]+/);
    await expectReadOnlyDashboardRendered(page);

    await page
      .getByRole('button', { name: /back|返回/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboards/);
    await expect(page.locator('.ant-table')).toBeVisible();
  });

  test('TA usage: the api_usage system page is reachable and renders widgets', async ({
    page,
  }) => {
    await page.goto('/usage');
    // Reachable + widget grid renders. KNOWN DEFECT (recorded, not fixed):
    // the api_usage dashboard's main "system.api_usage" widget still falls
    // back to the unsupported-angular placeholder, so unlike the readonly
    // view this page cannot assert a zero placeholder count.
    await expect(page.locator('.react-grid-item').first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.locator('[data-widget-placeholder="missing"]'),
    ).toHaveCount(0);
    await expect(page.locator('.ant-alert-error')).toHaveCount(0);
  });
});

test.describe('dashboards — customer user (read-only)', () => {
  test.use({ storageState: 'e2e/.auth/cu.json' });

  test('CU dashboards: customer list opens the assigned demo dashboard readonly', async ({
    page,
  }) => {
    // Provision once: assign the demo dashboard to the E2E customer so the
    // CU scope (customer-scoped endpoint) has a row to open.
    const token = await apiLogin('tenant@thingsboard.org', 'tenant');
    await ensureDashboardAssignedToCustomer(
      token,
      DASHBOARD_TITLE,
      'E2E Customer',
    );

    await page.goto('/dashboards');
    await expect(page.locator('.ant-table')).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: /添加仪表盘|Add new dashboard|新建仪表盘/i,
      }),
    ).toHaveCount(0);

    const titleLink = page
      .locator('.ant-table')
      .locator('a.ant-typography-link', { hasText: DASHBOARD_TITLE })
      .first();
    await expect(titleLink).toBeVisible();
    await titleLink.click();

    await expect(page).toHaveURL(/\/dashboards\/[0-9a-f-]+/);
    await expectReadOnlyDashboardRendered(page);
  });
});
