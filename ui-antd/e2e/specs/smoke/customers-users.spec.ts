import { expect, test } from '@playwright/test';

/**
 * Smoke matrix — customer domain + user management (spec §3.3 row 3, M2;
 * tenant admin).
 *
 * Customers: list → search → detail (name link) → tab switch → back.
 * Users: list → search (the seeded customer user must be visible to the
 * tenant admin). Users have no detail route — the row itself is the end.
 */

test.use({ storageState: 'e2e/.auth/ta.json' });

test('TA customers: list, search, detail, tab switch, back', async ({
  page,
}) => {
  await page.goto('/customers');
  await expect(page.locator('.ant-table')).toBeVisible();

  await page.getByPlaceholder(/搜索客户|Search customers/i).fill('Customer A');
  const nameLink = page
    .locator('.ant-table')
    .locator('a.ant-typography-link', { hasText: 'Customer A' })
    .first();
  await expect(nameLink).toBeVisible();
  await nameLink.click();

  await expect(page).toHaveURL(/\/customers\/[0-9a-f-]+/);
  // Landing tab is Attributes (no separate details tab on this page).
  await expect(
    page.getByRole('tab', { name: /属性|Attributes/i }),
  ).toHaveAttribute('aria-selected', 'true');
  const pane = page.locator('.ant-tabs-content-active');
  await expect(pane.locator('.ant-table').first()).toBeVisible();

  await page.getByRole('tab', { name: /关系|关联|Relations/i }).click();
  await expect(pane.locator('.ant-table, .ant-empty').first()).toBeVisible();

  await page
    .getByRole('button', { name: /back|返回/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/customers/);
  await expect(page.locator('.ant-table')).toBeVisible();
});

test('TA users: tenant-wide list finds the seeded customer user', async ({
  page,
}) => {
  await page.goto('/users');
  await expect(page.locator('.ant-table')).toBeVisible();

  await page
    .getByPlaceholder(/搜索用户|Search users/i)
    .fill('e2e-cu@thingsboard.org');
  await expect(
    page.locator('.ant-table').getByText('e2e-cu@thingsboard.org').first(),
  ).toBeVisible();
  // Tenant admin surface: the "Add user" entry is present, no error banner.
  await expect(
    page.getByRole('button', { name: /添加用户|Add user/i }),
  ).toBeVisible();
  await expect(page.locator('.ant-alert-error')).toHaveCount(0);
});
