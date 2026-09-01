/**
 * Shared detail-tab registry shape (M2). The device page's former inline
 * `buildTabItems()` becomes a data-driven assembly every domain reuses: a
 * domain declares its ordered entries (each with key/label/taOnly/render),
 * this module filters the TA-only set for CUSTOMER_USER and produces the
 * antd Tabs items. Mounting semantics stay with the host page
 * (`destroyOnHidden` — only the active tab mounts, protecting the WS
 * manager's 10-cmd budget; never revert to pre-mounting, RECON risk 6).
 *
 * Domain tab sets (ui-ngx templates; spec §1.3):
 *   devices      10 tabs; taOnly = calculated-fields, alarm-rules,
 *                version-control (device-tabs.component.html)
 *   assets       details + attributes/latest/calculated-fields/alarms/
 *                relations/audit-logs/version-control (spec §3.4 「同构
 *                3.3, 8 tab」). ui-ngx asset-tabs marks calculated-fields,
 *                alarm-rules, audit-logs, version-control TA-only —
 *                confirm the details-tab decision with the spec when the
 *                asset domain lands.
 *   customers    7 tabs, no details (customer-tabs.component.html);
 *                taOnly = alarm-rules, audit-logs, version-control
 *   entityViews  6 tabs, no calculated-fields/events
 *                (entity-view-tabs.component.html); taOnly = audit-logs,
 *                version-control
 */
import type { DetailTabKey } from './detail-tab-keys';

export { DETAIL_TAB_KEYS } from './detail-tab-keys';
export type { DetailTabKey };

export interface DetailTabEntry {
  key: DetailTabKey;
  label: string;
  /** Tab exists only for TENANT_ADMIN (hidden for CU like ui-ngx). */
  taOnly?: boolean;
  /** Builds the tab content; render is deferred so closed tabs stay cheap. */
  render: () => React.ReactNode;
}

export interface AssembledDetailTab {
  key: string;
  label: string;
  children: React.ReactNode;
}

/** TA-only entries drop out for CU; order follows the caller's array. */
export function assembleDetailTabs(
  entries: Array<DetailTabEntry>,
  readOnly: boolean,
): Array<AssembledDetailTab> {
  return entries
    .filter((entry) => !entry.taOnly || !readOnly)
    .map((entry) => ({
      key: entry.key,
      label: entry.label,
      children: entry.render(),
    }));
}
