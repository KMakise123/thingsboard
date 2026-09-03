import { expect, test } from '@playwright/test';

import {
  apiLogin,
  ENTITY_VIEW_NAME,
  ensureEntityView,
  findDevice,
} from '../../fixtures/api';

/**
 * Smoke matrix — entity views domain (spec §3.3 row 2, M2; tenant admin).
 *
 * List → search → detail → tab switch → back.
 *
 * Known defect (recorded, not fixed): the entity-view list name renders as
 * plain text — NO link to the detail page (unlike assets/customers/profiles),
 * so the detail half is addressed by URL. The demo dataset has no entity
 * views; one is provisioned (idempotent "E2E Entity View").
 */

test.use({ storageState: 'e2e/.auth/ta.json' });

let entityViewId: string;

test.beforeAll(async () => {
  const token = await apiLogin('tenant@thingsboard.org', 'tenant');
  const device = await findDevice(token, 'E2E Thermostat');
  entityViewId = (await ensureEntityView(token, device.id.id)).id.id;
});

test('TA entity views: list, search, detail, tab switch, back', async ({
  page,
}) => {
  await page.goto('/entityViews');
  await expect(page.locator('.ant-table')).toBeVisible();

  await page
    .getByPlaceholder(/搜索实体视图|Search entity views/i)
    .fill(ENTITY_VIEW_NAME);
  await expect(
    page.locator('.ant-table').getByText(ENTITY_VIEW_NAME).first(),
  ).toBeVisible();

  // Defect: no link in the list — deep-link the detail page.
  await page.goto(`/entityViews/${entityViewId}`);
  // Landing tab is Attributes (no separate details tab on this page).
  await expect(
    page.getByRole('tab', { name: /属性|Attributes/i }),
  ).toHaveAttribute('aria-selected', 'true');

  const pane = page.locator('.ant-tabs-content-active');
  await page.getByRole('tab', { name: /属性|Attributes/i }).click();
  await expect(pane.locator('.ant-table, .ant-empty').first()).toBeVisible();

  await page.getByRole('tab', { name: /关系|关联|Relations/i }).click();
  await expect(pane.locator('.ant-table, .ant-empty').first()).toBeVisible();

  await page
    .getByRole('button', { name: /back|返回/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/entityViews/);
  await expect(page.locator('.ant-table')).toBeVisible();
});
