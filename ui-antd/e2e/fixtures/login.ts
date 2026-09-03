import type { Page } from '@playwright/test';

/**
 * Walk the real login form. Locators match both locales:
 * placeholder 邮箱/Email, antd inserts a space between CJK button chars
 * ("登 录"), en is "Sign in".
 */
export async function uiLogin(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByPlaceholder(/邮箱|Email/i).first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: /登\s*录|Sign in/i }).first().click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20_000 });
}
