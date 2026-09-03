import { expect, test } from '@playwright/test';

import { apiLogin, ensureGatewayDevice } from '../../fixtures/api';

/**
 * Smoke matrix — gateways page (spec §3.3 row 2, M5 system page; TA).
 *
 * /entities/gateways renders the backend system dashboard resource
 * (gateways_dashboard.json) through DashboardView. Assertions: the widget
 * grid mounts with the Gateway list widget and NO unsupported placeholder
 * ("暂未支持" / data-widget-placeholder). The page's Gateway list table is
 * fed by the device registry — a gateway device is provisioned so the list
 * has a row to show.
 */

test.use({ storageState: 'e2e/.auth/ta.json' });

test('TA gateways: system dashboard renders the gateway list, no placeholder', async ({
  page,
}) => {
  const token = await apiLogin('tenant@thingsboard.org', 'tenant');
  const gateway = await ensureGatewayDevice(token);

  await page.goto('/entities/gateways');

  // Widget grid mounts with at least one widget cell...
  await expect(page.locator('.react-grid-item').first()).toBeVisible({
    timeout: 15_000,
  });
  // ...and nothing fell back to the unsupported placeholder.
  await expect(page.locator('[data-widget-placeholder]')).toHaveCount(0);
  await expect(page.getByText(/暂未支持|Not supported yet/i)).toHaveCount(0);

  // The Gateway list widget is a real entity table (find the provisioned row).
  const gatewayCell = page
    .getByText(gateway.id.id ? 'E2E Gateway' : '')
    .first();
  await expect(gatewayCell).toBeVisible({ timeout: 15_000 });
});
