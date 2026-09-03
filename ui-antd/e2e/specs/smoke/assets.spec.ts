import { expect, test } from '@playwright/test';

import { ASSET_NAME, apiLogin, ensureAsset } from '../../fixtures/api';

/**
 * Smoke matrix — assets domain (spec §3.3 row 2, M2; tenant admin).
 *
 * List → search → detail (name link) → tab switch → back. The demo dataset
 * carries no assets, so the test provisions one (idempotent "E2E Asset").
 * The asset detail page has no "details" tab — it lands on Attributes.
 */

test.use({ storageState: 'e2e/.auth/ta.json' });

test('TA assets: list, search, detail, tab switch, back', async ({ page }) => {
  const token = await apiLogin('tenant@thingsboard.org', 'tenant');
  await ensureAsset(token);

  await page.goto('/assets');
  await expect(page.locator('.ant-table')).toBeVisible();

  await page.getByPlaceholder(/搜索资产|Search assets/i).fill(ASSET_NAME);
  const nameLink = page
    .locator('.ant-table')
    .locator('a.ant-typography-link', { hasText: ASSET_NAME })
    .first();
  await expect(nameLink).toBeVisible();
  await nameLink.click();

  await expect(page).toHaveURL(/\/assets\/[0-9a-f-]+/);
  // Landing tab is Attributes.
  await expect(
    page.getByRole('tab', { name: /属性|Attributes/i }),
  ).toHaveAttribute('aria-selected', 'true');
  const pane = page.locator('.ant-tabs-content-active');
  await expect(pane.locator('.ant-table').first()).toBeVisible();

  await page.getByRole('tab', { name: /最新遥测|Latest telemetry/i }).click();
  await expect(pane.locator('.ant-table, .ant-empty').first()).toBeVisible();

  await page
    .getByRole('button', { name: /back|返回/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/assets/);
  await expect(page.locator('.ant-table')).toBeVisible();
});
