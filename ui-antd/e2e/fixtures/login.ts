import type { Page } from '@playwright/test';

/**
 * Walk the real login form. Locators match both locales:
 * placeholder 邮箱/Email, antd inserts a space between CJK button chars
 * ("登 录"), en is "Sign in".
 */
export async function uiLogin(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login');
  await page
    .getByPlaceholder(/邮箱|Email/i)
    .first()
    .fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page
    .getByRole('button', { name: /登\s*录|Sign in/i })
    .first()
    .click();
  // The login route lives at /user/login, which does NOT match the naive
  // `!pathname.startsWith('/login')` check — that wait would pass instantly
  // and callers could snapshot an EMPTY storageState (root cause of smoke
  // suites landing back on the login form). Wait for the token itself
  // (written synchronously after the login POST), then for the role landing.
  await page.waitForFunction(
    () => !!localStorage.getItem('jwt_token'),
    undefined,
    {
      timeout: 20_000,
      // wall-clock polling — the default rAF polling can starve in headless
      // mode and time out even though the token was already written
      polling: 100,
    },
  );
  await page.waitForURL(
    (u) => !/\/login(\/|$)|\/user\/login/.test(u.pathname),
    {
      timeout: 20_000,
    },
  );
}
