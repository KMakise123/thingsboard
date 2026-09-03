import { expect, test } from '@playwright/test';

/**
 * Smoke matrix — account security domain (spec §3.3 row 7, M4): reachable
 * by all three roles behind the avatar dropdown. Each role walks
 * /account/profile (identity form) → /account/security (JWT / change
 * password / 2FA cards).
 */

const ROLES = [
  { role: 'ta', storageState: 'e2e/.auth/ta.json' },
  { role: 'sa', storageState: 'e2e/.auth/sa.json' },
  { role: 'cu', storageState: 'e2e/.auth/cu.json' },
] as const;

for (const { role, storageState } of ROLES) {
  test.describe(`account — ${role}`, () => {
    test.use({ storageState });

    test('profile form and security cards render', async ({ page }) => {
      await page.goto('/account/profile');
      await expect(page.getByText(/邮箱|Email/i).first()).toBeVisible();
      await expect(page.locator('.ant-alert-error')).toHaveCount(0);

      await page.goto('/account/security');
      await expect(page.getByText(/JWT/i).first()).toBeVisible();
      await expect(
        page.getByText(/修改密码|Change password/i).first(),
      ).toBeVisible();
      await expect(page.locator('.ant-alert-error')).toHaveCount(0);
    });
  });
}
