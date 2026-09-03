import { expect, type Page, test } from '@playwright/test';

/**
 * Cross-cutting group 6: three-role menu / route gating
 * (docs/spec/v1-test-baseline.md §3.2 item 6).
 *
 * Menus are generated from config/routes.ts filtered by src/access.ts keys
 * (never hand-written), so asserting the menu SET per role pins the access
 * dictionary. Hand-typed routes outside the role's authority render the
 * custom Forbidden page (src/components/layout/forbidden.tsx): an antd
 * Result with status 403 — NOT umi's Chinese-only default.
 *
 * Role sets (spec §1.2 / routes.ts):
 *   SA — tenants / tenantProfiles / settings;
 *   TA — the full tenant domain incl. usage + gateways;
 *   CU — devices / assets / alarms / dashboards (read-only four).
 */

/** Visible side-menu titles (top-level items + submenu headers). */
async function menuTitles(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(
      document.querySelectorAll(
        '.ant-layout-sider .ant-menu-item, .ant-layout-sider .ant-menu-submenu-title',
      ),
    )
      .map((el) => (el.textContent ?? '').trim())
      .filter(Boolean),
  );
}

const forbidden = (page: Page) => page.locator('.ant-result-403');

test.describe('SYS_ADMIN', () => {
  test.use({ storageState: 'e2e/.auth/sa.json' });

  test('lands on tenants, sees only the sys domain, 403 on tenant pages', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/tenants/);

    const titles = await menuTitles(page);
    expect(titles.some((t) => /租户$/.test(t))).toBe(true);
    expect(titles.some((t) => /租户配置/.test(t))).toBe(true);
    expect(titles.some((t) => /系统设置|Settings/.test(t))).toBe(true);
    expect(titles.join('|')).not.toMatch(/设备|资产|告警|仪表盘|客户/);

    // Tenant-domain routes are outside SA authority → custom 403 page.
    await page.goto('/devices');
    await expect(forbidden(page)).toBeVisible();
    await expect(forbidden(page)).toContainText(
      /无权访问|You do not have permission/i,
    );

    await page.goto('/customers');
    await expect(forbidden(page)).toBeVisible();
  });
});

test.describe('TENANT_ADMIN', () => {
  test.use({ storageState: 'e2e/.auth/ta.json' });

  test('lands on devices, sees the full tenant domain, 403 on sys pages', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/devices/);

    const titles = await menuTitles(page);
    for (const expected of [
      '设备',
      '资产',
      '实体视图',
      '客户',
      '用户',
      '告警',
      '设备配置',
      '资产配置',
      '仪表盘',
      '使用统计',
      '网关',
    ]) {
      expect(
        titles.some((t) => t.includes(expected)),
        `TA menu should contain ${expected}`,
      ).toBe(true);
    }
    expect(titles.join('|')).not.toMatch(/租户|系统设置/);

    // Sys-domain routes are outside TA authority → 403 page.
    await page.goto('/tenants');
    await expect(forbidden(page)).toBeVisible();
    await expect(forbidden(page)).toContainText(
      /无权访问|You do not have permission/i,
    );

    // TA explicitly keeps the tenant-admin system pages (usage / gateways).
    await page.goto('/usage');
    await expect(forbidden(page)).toBeHidden();
  });
});

test.describe('CUSTOMER_USER', () => {
  test.use({ storageState: 'e2e/.auth/cu.json' });

  test('lands on devices, sees the read-only four, 403 on admin pages', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/devices/);

    const titles = await menuTitles(page);
    for (const expected of ['设备', '资产', '告警', '仪表盘']) {
      expect(
        titles.some((t) => t.includes(expected)),
        `CU menu should contain ${expected}`,
      ).toBe(true);
    }
    // Everything tenant-admin-only is absent.
    expect(titles.join('|')).not.toMatch(
      /实体视图|客户|用户|设备配置|资产配置|使用统计|网关|租户/,
    );

    // Admin routes are outside CU authority → 403 page.
    await page.goto('/customers');
    await expect(forbidden(page)).toBeVisible();
    await expect(forbidden(page)).toContainText(
      /无权访问|You do not have permission/i,
    );

    await page.goto('/usage');
    await expect(forbidden(page)).toBeVisible();

    await page.goto('/settings/general');
    await expect(forbidden(page)).toBeVisible();
  });
});
