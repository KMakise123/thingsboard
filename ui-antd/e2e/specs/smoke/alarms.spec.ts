import { expect, test } from '@playwright/test';

/**
 * Smoke matrix — alarms + alarm rules domain (spec §3.3 row 4, M3).
 *
 * TA (two tests): the alarms table with the seeded E2E alarm, including the
 * originator link into the device detail; and the tenant-only alarm-rules
 * tab. CU: the alarms tab only (the rules tab is TA-gated), read-only face
 * over an empty customer scope.
 */

const ALARM_TYPE = 'E2E_HIGH_TEMPERATURE';

test.describe('alarms — tenant admin', () => {
  test.use({ storageState: 'e2e/.auth/ta.json' });

  test('TA alarms: list, search the seeded alarm, originator link opens the device detail', async ({
    page,
  }) => {
    await page.goto('/alarms');
    await expect(
      page.getByRole('tab', { name: /^告警$|Alarms/i }),
    ).toHaveAttribute('aria-selected', 'true');
    const pane = page.locator('.ant-tabs-content-active');
    await expect(pane.locator('.ant-table').first()).toBeVisible();

    await pane.getByPlaceholder(/搜索告警|Search alarms/i).fill(ALARM_TYPE);
    const row = pane.locator('.ant-table').getByText(ALARM_TYPE).first();
    await expect(row).toBeVisible();

    // The alarm's originator (E2E Thermostat, a device) links to its detail.
    const originatorLink = pane
      .locator('.ant-table')
      .locator('a.ant-typography-link', { hasText: 'E2E Thermostat' })
      .first();
    await expect(originatorLink).toBeVisible();
    await originatorLink.click();
    await expect(page).toHaveURL(/\/devices\/[0-9a-f-]+/);
    await expect(
      page.locator('.ant-tabs-content-active').getByText(/E2E Thermostat/),
    ).toBeVisible();

    // The device detail page's back arrow routes to /devices (domain-owned
    // back target), not the alarms page.
    await page
      .getByRole('button', { name: /back|返回/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/devices/);
    await expect(page.locator('.ant-table')).toBeVisible();
  });

  test('TA alarm rules tab: mounts the rules table', async ({ page }) => {
    await page.goto('/alarms');
    await page.getByRole('tab', { name: /告警规则|Alarm rules/i }).click();
    const pane = page.locator('.ant-tabs-content-active');
    await expect(
      pane.getByPlaceholder(/搜索告警规则|Search alarm rules/i),
    ).toBeVisible();
    await expect(pane.locator('.ant-table, .ant-empty').first()).toBeVisible();
    await expect(page.locator('.ant-alert-error')).toHaveCount(0);
  });
});

test.describe('alarms — customer user (read-only, own scope)', () => {
  test.use({ storageState: 'e2e/.auth/cu.json' });

  test('CU alarms: alarms tab only, no rules tab, renders without errors', async ({
    page,
  }) => {
    await page.goto('/alarms');
    await expect(
      page.getByRole('tab', { name: /^告警$|Alarms/i }),
    ).toHaveAttribute('aria-selected', 'true');
    // Alarm rules is tenant-admin only (spec §3.6) — the tab never appears.
    await expect(
      page.getByRole('tab', { name: /告警规则|Alarm rules/i }),
    ).toHaveCount(0);
    await expect(
      page
        .locator('.ant-tabs-content-active')
        .locator('.ant-table, .ant-empty')
        .first(),
    ).toBeVisible();
    await expect(page.locator('.ant-alert-error')).toHaveCount(0);
  });
});
