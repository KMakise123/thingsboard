/**
 * Auto-commit settings helpers (M14 wave-3, R23).
 *
 * The per-type map semantics (contract #13 + the v1 AutoCommitCard logic
 * this page absorbs): the WHOLE map is read, edited per entity type and
 * saved; an EMPTY map is stored by DELETE-ing the settings object, not by
 * POST-ing `{}`. There is deliberately NO syncStrategy here — that field
 * belongs to the manual complex-create panel, not to auto-commit (pinned).
 */

import type { AutoVersionCreateConfig } from '@/services/tb/version-control';
import { EntityType } from '@/types/tb/entity';

/**
 * ngx exportableEntityTypes (16 types) — the candidate list; entries
 * already configured are excluded from the add-picker.
 */
export const AUTO_COMMIT_ENTITY_TYPES: Array<EntityType> = [
  EntityType.ASSET,
  EntityType.DEVICE,
  EntityType.ENTITY_VIEW,
  EntityType.DASHBOARD,
  EntityType.CUSTOMER,
  EntityType.DEVICE_PROFILE,
  EntityType.ASSET_PROFILE,
  EntityType.RULE_CHAIN,
  EntityType.WIDGET_TYPE,
  EntityType.WIDGETS_BUNDLE,
  EntityType.TB_RESOURCE,
  EntityType.OTA_PACKAGE,
  EntityType.NOTIFICATION_TEMPLATE,
  EntityType.NOTIFICATION_TARGET,
  EntityType.NOTIFICATION_RULE,
  EntityType.AI_MODEL,
];

/** ngx typesWithCalculatedFields — show the CF checkbox only for these. */
export const TYPES_WITH_CALCULATED_FIELDS: ReadonlySet<EntityType> = new Set([
  EntityType.DEVICE,
  EntityType.ASSET,
  EntityType.ASSET_PROFILE,
  EntityType.DEVICE_PROFILE,
  EntityType.CUSTOMER,
]);

export const ENTITY_TYPE_LABEL_KEYS: Record<string, string> =
  Object.fromEntries(
    AUTO_COMMIT_ENTITY_TYPES.map((type) => [
      type,
      `pages.settings.autoCommit.entityTypes.${type}`,
    ]),
  );

export const AUTO_COMMIT_DEFAULT_CONFIG: AutoVersionCreateConfig = {
  branch: '',
  saveAttributes: true,
  saveRelations: false,
  saveCredentials: true,
  saveCalculatedFields: true,
};

export interface AutoCommitRow {
  entityType: EntityType | undefined;
  config: AutoVersionCreateConfig;
}

/** Stored map → editable rows (ngx prepareEntityTypesFormArray parity). */
export function toAutoCommitRows(
  settings: Record<string, AutoVersionCreateConfig> | null | undefined,
): Array<AutoCommitRow> {
  if (!settings) {
    return [];
  }
  return Object.keys(settings)
    .filter((type) => AUTO_COMMIT_ENTITY_TYPES.includes(type as EntityType))
    .map((type) => ({
      entityType: type as EntityType,
      config: { ...settings[type] },
    }));
}

/** Candidate types for the picker: everything not configured elsewhere. */
export function availableEntityTypes(
  rows: Array<AutoCommitRow>,
  current?: EntityType,
): Array<EntityType> {
  const used = new Set(
    rows
      .map((row) => row.entityType)
      .filter((type): type is EntityType => !!type && type !== current),
  );
  return AUTO_COMMIT_ENTITY_TYPES.filter((type) => !used.has(type));
}

export function toAutoCommitSettings(
  rows: Array<AutoCommitRow>,
): Record<string, AutoVersionCreateConfig> {
  const settings: Record<string, AutoVersionCreateConfig> = {};
  for (const row of rows) {
    if (!row.entityType) {
      continue;
    }
    settings[row.entityType] = {
      ...row.config,
      // Empty branch = the repository default branch (ngx Default).
      branch: row.config.branch?.trim() || undefined,
    };
  }
  return settings;
}
