import { expect, test } from '@playwright/test';

/**
 * Smoke matrix — entity profiles domain (spec §3.3 row 6, M3; tenant admin):
 * device profiles (search the demo `default`, switch to the transport
 * configuration tab) and asset profiles (the demo `default`).
 */

test.use({ storageState: 'e2e/.auth/ta.json' });

test('TA device profiles: list, search, detail, transport tab, back', async ({
  page,
}) => {
  await page.goto('/deviceProfiles');
  await expect(page.locator('.ant-table')).toBeVisible();

  await page
    .getByPlaceholder(/搜索设备配置|Search device profiles/i)
    .fill('default');
  const nameLink = page
    .locator('.ant-table')
    .locator('a.ant-typography-link', { hasText: 'default' })
    .first();
  await expect(nameLink).toBeVisible();
  await nameLink.click();

  await expect(page).toHaveURL(/\/deviceProfiles\/[0-9a-f-]+/);
  const pane = page.locator('.ant-tabs-content-active');
  await expect(
    pane.locator('.ant-table, .ant-empty, .ant-descriptions, form').first(),
  ).toBeVisible();

  await page
    .getByRole('tab', { name: /传输配置|Transport configuration/i })
    .click();
  await expect(
    pane.locator('.ant-table, .ant-empty, .ant-descriptions, form').first(),
  ).toBeVisible();

  await page
    .getByRole('button', { name: /back|返回/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/deviceProfiles/);
  await expect(page.locator('.ant-table')).toBeVisible();
});

test('TA asset profiles: list, search, detail, back', async ({ page }) => {
  await page.goto('/assetProfiles');
  await expect(page.locator('.ant-table')).toBeVisible();

  await page
    .getByPlaceholder(/搜索资产配置|Search asset profiles/i)
    .fill('default');
  const nameLink = page
    .locator('.ant-table')
    .locator('a.ant-typography-link', { hasText: 'default' })
    .first();
  await expect(nameLink).toBeVisible();
  await nameLink.click();

  await expect(page).toHaveURL(/\/assetProfiles\/[0-9a-f-]+/);
  await expect(
    page
      .locator('.ant-tabs-content-active')
      .locator('.ant-table, .ant-empty, .ant-descriptions, form')
      .first(),
  ).toBeVisible();

  await page
    .getByRole('button', { name: /back|返回/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/assetProfiles/);
  await expect(page.locator('.ant-table')).toBeVisible();
});
