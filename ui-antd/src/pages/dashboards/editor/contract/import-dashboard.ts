/**
 * Import adapter for the editor — §3.8 restore of the v2 parity flow
 * (ui-ngx dashboard-page.component.ts editMissingAliases anchor ~:1073; the
 * v1 readonly import clipped the missing-entity-aliases completion — v2
 * restores it as the 补录 create-or-skip dialog, see import-dialog.tsx).
 *
 * `importDashboardIntoEditor(file) → Dashboard` is the frozen parse seam
 * (validate-only; applying it to the draft is the shell's single undoable
 * `session.write('import-dashboard', …)` group — draft-only until save, so
 * nothing is invalidated or POSTed here).
 *
 * Missing-alias detection (`findMissingEntityAliases`): an alias id is
 * missing when a widget datasource (config.datasources[].entityAliasId or
 * config.alarmSource.entityAliasId) references it but
 * configuration.entityAliases has no entry. ui-ngx parity note: ngx detects
 * "missing" server-side (checkEntityAlias fails while the definition still
 * travels in the file); our detection is the client-side superset — the
 * definition itself is absent. The 补录 dialog therefore CREATES the
 * definition (name + default device-type filter, adjustable later in the
 * Aliases dialog) or SKIPS (the dangling reference survives and renders as
 * empty data, exactly the v1 behavior for that widget).
 */
import { validateAndUpdateDashboard } from '@/core/dashboard/model';
import { parseDashboardImport } from '@/pages/dashboards/list/import-export';
import type {
  Dashboard,
  DashboardConfiguration,
  EntityAlias,
} from '@/types/tb/dashboard';

export async function importDashboardIntoEditor(
  file: File,
): Promise<Dashboard> {
  const text = await file.text();
  return parseDashboardImport(text);
}

/** One alias id referenced by widgets but absent from entityAliases. */
export interface MissingEntityAlias {
  aliasId: string;
  /** Widgets whose datasources reference the missing alias. */
  widgetIds: string[];
}

/**
 * Client-side missing-alias scan over a NORMALIZED configuration (run
 * validateAndUpdateDashboard first — legacy widget arrays have no
 * datasources map to scan until normalized).
 */
export function findMissingEntityAliases(
  configuration: DashboardConfiguration,
): MissingEntityAlias[] {
  const missing = new Map<string, Set<string>>();
  const note = (aliasId: string | undefined, widgetId: string): void => {
    if (!aliasId) {
      return;
    }
    if (configuration.entityAliases[aliasId]) {
      return;
    }
    const set = missing.get(aliasId) ?? new Set<string>();
    set.add(widgetId);
    missing.set(aliasId, set);
  };
  for (const [widgetId, widget] of Object.entries(configuration.widgets)) {
    for (const datasource of widget.config.datasources ?? []) {
      note(datasource.entityAliasId, widgetId);
    }
    note(widget.config.alarmSource?.entityAliasId, widgetId);
  }
  return [...missing.entries()]
    .map(([aliasId, widgetIds]) => ({
      aliasId,
      widgetIds: [...widgetIds].sort(),
    }))
    .sort((a, b) => a.aliasId.localeCompare(b.aliasId));
}

/**
 * 补录 default definition for a skipped-in import alias: a device-type
 * filter the user can re-point in the Aliases dialog. (ui-ngx creates the
 * entry with filter=null and forces completion; our EntityAlias type has no
 * null filter, so the default is concrete and the Aliases dialog owns the
 * correction.)
 */
export function createMissingAliasStub(
  aliasId: string,
  name: string,
): EntityAlias {
  return {
    id: aliasId,
    alias: name,
    filter: { type: 'entityType', entityType: 'DEVICE', resolveMultiple: true },
  };
}
