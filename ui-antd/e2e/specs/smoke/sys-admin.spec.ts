import { expect, test } from '@playwright/test';

/**
 * Smoke matrix — sys admin domain (spec §3.3 row 5, M3; system admin):
 * tenants, tenant profiles, settings (general + audit logs).
 */

test.use({ storageState: 'e2e/.auth/sa.json' });

test('SA tenants: list, search, detail, tab switch, back', async ({ page }) => {
  await page.goto('/tenants');
  await expect(page.locator('.ant-table')).toBeVisible();

  await page.getByPlaceholder(/搜索租户|Search tenants/i).fill('Tenant');
  const nameLink = page
    .locator('.ant-table')
    .locator('a.ant-typography-link', { hasText: 'Tenant' })
    .first();
  await expect(nameLink).toBeVisible();
  await nameLink.click();

  await expect(page).toHaveURL(/\/tenants\/[0-9a-f-]+/);
  const pane = page.locator('.ant-tabs-content-active');
  await expect(
    pane.locator('.ant-table, .ant-empty, .ant-descriptions, form').first(),
  ).toBeVisible();

  await page.getByRole('tab', { name: /属性|Attributes/i }).click();
  await expect(pane.locator('.ant-table, .ant-empty').first()).toBeVisible();

  await page
    .getByRole('button', { name: /back|返回/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/tenants/);
  await expect(page.locator('.ant-table')).toBeVisible();
});

test('SA tenant profiles: list, open the default profile, tab switch, back', async ({
  page,
}) => {
  await page.goto('/tenantProfiles');
  await expect(page.locator('.ant-table')).toBeVisible();

  await page
    .getByPlaceholder(/搜索租户配置|Search tenant profiles/i)
    .fill('default');
  const nameLink = page
    .locator('.ant-table')
    .locator('a.ant-typography-link', { hasText: 'default' })
    .first();
  await expect(nameLink).toBeVisible();
  await nameLink.click();

  await expect(page).toHaveURL(/\/tenantProfiles\/[0-9a-f-]+/);
  const pane = page.locator('.ant-tabs-content-active');
  await expect(
    pane.locator('.ant-table, .ant-empty, .ant-descriptions, form').first(),
  ).toBeVisible();

  await page.getByRole('tab', { name: /属性|Attributes/i }).click();
  await expect(pane.locator('.ant-table, .ant-empty').first()).toBeVisible();

  await page
    .getByRole('button', { name: /back|返回/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/tenantProfiles/);
  await expect(page.locator('.ant-table')).toBeVisible();
});

test('SA settings: general form and audit-logs table reachable', async ({
  page,
}) => {
  // /settings redirects to /settings/general.
  await page.goto('/settings');
  await expect(page).toHaveURL(/\/settings\/general/);
  await expect(page.getByText(/Base URL|基础 URL/i).first()).toBeVisible();
  await expect(page.locator('.ant-alert-error')).toHaveCount(0);

  await page.goto('/settings/audit-logs');
  const pane = page.locator('.ant-tabs-content-active, main');
  await expect(pane.locator('.ant-table').first()).toBeVisible();
  await expect(
    page
      .locator('.ant-table')
      .getByText(/Timestamp|时间/i)
      .first(),
  ).toBeVisible();
});

// M14 wave-7 (R35, spec 6.5-8): the settings family reachable for SA —
// presence-only assertions, no deep interactions (the TA-only members
// home/repository/auto-commit/trendz/ai-models belong to the tenant spec).
test('SA settings: queues, notifications, security-settings reachable', async ({
  page,
}) => {
  // queues: SA-only rule-engine list renders (Main row + strategy columns).
  await page.goto('/settings/queues');
  await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible();

  // notifications: the settings face renders its cards/forms.
  await page.goto('/settings/notifications');
  await expect(page.locator('main form, main .ant-card').first()).toBeVisible();

  // security-settings: both cards render (SecuritySettings + JWT).
  await page.goto('/settings/security-settings');
  await expect(page.getByText(/安全设置|Security settings/i)).toBeVisible();
  await expect(
    page.getByText(/密码策略|Password policy/i).first(),
  ).toBeVisible();
  await expect(page.getByText(/JWT/i).first()).toBeVisible();

  // outgoing-mail regression: the mail card stays reachable for SA.
  await page.goto('/settings/outgoing-mail');
  await expect(page.locator('main form, main .ant-card').first()).toBeVisible();
});
