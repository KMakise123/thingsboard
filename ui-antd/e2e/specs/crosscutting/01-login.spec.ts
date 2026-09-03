import { expect, test } from '@playwright/test';

import { uiLogin } from '../../fixtures/login';

/**
 * Cross-cutting group 1: login/logout full chain
 * (docs/spec/v1-test-baseline.md §3.2 item 1).
 *
 * Storage states from globalSetup let other suites skip the login UI; THIS
 * suite deliberately walks the real login form end to end.
 */

test('correct credentials land on the device list', async ({ page }) => {
  await uiLogin(page, 'tenant@thingsboard.org', 'tenant');
  await expect(page).toHaveURL(/\/devices/);
  await expect(page.getByRole('main').getByText(/设备|Devices/i).first()).toBeVisible();
});

test('wrong credentials surface the backend error verbatim, no blank page', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder(/邮箱|Email/i).first().fill('tenant@thingsboard.org');
  await page.locator('input[type="password"]').first().fill('wrong-password');
  await page.getByRole('button', { name: /登\s*录|Sign in/i }).first().click();
  // backend error 原文透传 (alert banner / message / inline form error)
  await expect(
    page.locator('.ant-alert-error, .ant-message-error, .ant-form-item-explain-error').first(),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
  // page still rendered (not blank)
  await expect(page.getByRole('button', { name: /登\s*录|Sign in/i }).first()).toBeVisible();
});

test('logged-in user visiting /login is redirected', async ({ page }) => {
  await uiLogin(page, 'tenant@thingsboard.org', 'tenant');
  await expect(page).toHaveURL(/\/devices/);

  await page.goto('/login');
  await expect(page).toHaveURL(/\/devices/);
});

test('logout clears storage and returns to the login page', async ({ page }) => {
  await uiLogin(page, 'tenant@thingsboard.org', 'tenant');
  await expect(page).toHaveURL(/\/devices/);

  // header avatar opens the user dropdown on hover (antd Dropdown)
  await page.locator('.ant-avatar, header .anticon-user, header img[alt="user"]').first().hover();
  const logoutItem = page.locator('.ant-dropdown').getByText(/退出登录|Sign out/i).first();
  // wait for the dropdown motion to settle before clicking (flaky otherwise)
  await expect(logoutItem).toBeVisible();
  // move the pointer onto the item itself so the hover chain never breaks
  // (avatar → menu transition would otherwise close the dropdown mid-click)
  await logoutItem.hover();
  await logoutItem.click();
  // logout lands on /user/login (with redirect param), not bare /login
  await expect(page).toHaveURL(/\/user\/login/);

  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.filter((k) => /JWT|TOKEN/i.test(k))).toHaveLength(0);
});
