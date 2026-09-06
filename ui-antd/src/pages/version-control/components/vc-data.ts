/**
 * Version-control domain pure layer (M14 wave-6, R20/R32) — the
 * `vc.models.ts` + `entities-version-control.service.ts` helpers of ui-ngx,
 * AntD-ized:
 *   - exportableEntityTypes (16 types — the swagger comment lags behind,
 *     backend DefaultEntitiesExportImportService is the truth);
 *   - default per-type config factories for the complex create / restore
 *     panels (ngx createDefaultEntityTypes*Version*);
 *   - the removeOtherEntities verbatim-confirmation check (ngx
 *     RemoveOtherEntitiesConfirmComponent: the verification input must be
 *     EXACTLY "remove other entities" — case and typos never pass);
 *   - entityLoadErrorToMessage (structured EntityLoadError → the three
 *    文案 states: device credentials conflict / missing referenced entity /
 *     runtime failure).
 *
 * Registered-not-implemented (spec 6.2-5 头注): the CUSTOMER-specific
 * "export/load alarm rules" wording branch of ngx is NOT forked off here —
 * every type shows the combined "calculated fields and alarm rules" label,
 * which carries the same semantics.
 */
import type {
  ComplexVersionCreateRequest,
  EntityTypeSyncStrategy,
  EntityTypeVersionCreateConfig,
  EntityTypeVersionLoadConfig,
  EntityTypeVersionLoadRequest,
} from '@/services/tb/version-control';
import { EntityType } from '@/types/tb/entity';

/** ngx exportableEntityTypes — 16 types (mirror of the wave-3 settings/
 * auto-commit constant; kept domain-local so VC does not reach into the
 * settings pages). */
export const EXPORTABLE_ENTITY_TYPES: Array<EntityType> = [
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

/** ngx entityTypesWithoutRelatedData — no attributes/relations families. */
export const ENTITY_TYPES_WITHOUT_RELATED_DATA: ReadonlySet<EntityType> =
  new Set([
    EntityType.NOTIFICATION_TEMPLATE,
    EntityType.NOTIFICATION_TARGET,
    EntityType.NOTIFICATION_RULE,
    EntityType.TB_RESOURCE,
    EntityType.OTA_PACKAGE,
    EntityType.AI_MODEL,
  ]);

/** ngx typesWithCalculatedFields — the CF checkbox shows only for these. */
export const TYPES_WITH_CALCULATED_FIELDS: ReadonlySet<EntityType> = new Set([
  EntityType.DEVICE,
  EntityType.ASSET,
  EntityType.ASSET_PROFILE,
  EntityType.DEVICE_PROFILE,
  EntityType.CUSTOMER,
]);

/** Locale key of a type label (pages.versionControl.entityTypes.*). */
export function entityTypeLabelKey(type: EntityType): string {
  return `pages.versionControl.entityTypes.${type}`;
}

/** Row of the entity-types panel (create side). */
export interface EntityTypeCreateRow {
  entityType?: EntityType;
  config: Omit<EntityTypeVersionCreateConfig, 'syncStrategy'> & {
    /** 'default' = inherit the request-level syncStrategy (ngx sentinel). */
    syncStrategy?: EntityTypeSyncStrategy | 'default';
  };
}

/** Row of the entity-types panel (restore side). */
export interface EntityTypeLoadRow {
  entityType?: EntityType;
  config: EntityTypeVersionLoadConfig;
}

/** ngx createDefaultEntityTypesVersionCreate — all 16 types pre-seeded. */
export function createDefaultEntityTypeCreateRows(): Array<EntityTypeCreateRow> {
  return EXPORTABLE_ENTITY_TYPES.map((entityType) => ({
    entityType,
    config: {
      syncStrategy: 'default',
      saveAttributes: !ENTITY_TYPES_WITHOUT_RELATED_DATA.has(entityType),
      saveRelations: !ENTITY_TYPES_WITHOUT_RELATED_DATA.has(entityType),
      saveCalculatedFields: TYPES_WITH_CALCULATED_FIELDS.has(entityType),
      saveCredentials: true,
      allEntities: true,
      entityIds: [],
    },
  }));
}

/** ngx createDefaultEntityTypesVersionLoad — all 16 types pre-seeded. */
export function createDefaultEntityTypeLoadRows(): Array<EntityTypeLoadRow> {
  return EXPORTABLE_ENTITY_TYPES.map((entityType) => ({
    entityType,
    config: {
      loadAttributes: !ENTITY_TYPES_WITHOUT_RELATED_DATA.has(entityType),
      loadRelations: !ENTITY_TYPES_WITHOUT_RELATED_DATA.has(entityType),
      loadCredentials: true,
      loadCalculatedFields: TYPES_WITH_CALCULATED_FIELDS.has(entityType),
      removeOtherEntities: false,
      findExistingEntityByName: true,
    },
  }));
}

/** Candidate types for an add-picker: not configured on another row. */
export function allowedEntityTypes<T extends { entityType?: EntityType }>(
  rows: Array<T>,
  current?: EntityType,
): Array<EntityType> {
  const used = new Set(
    rows
      .map((row) => row.entityType)
      .filter((type): type is EntityType => !!type && type !== current),
  );
  return EXPORTABLE_ENTITY_TYPES.filter((type) => !used.has(type));
}

/** The verbatim confirmation string of the removeOtherEntities dialog. */
export const REMOVE_OTHER_ENTITIES_CONFIRM_TEXT = 'remove other entities';

/** Exact-match gate: typos, casing or whitespace never confirm. */
export function isRemoveOtherEntitiesConfirmed(
  input: string | undefined,
): boolean {
  return input === REMOVE_OTHER_ENTITIES_CONFIRM_TEXT;
}

/**
 * Panel rows → the wire `entityTypes` map of a COMPLEX create request.
 * Rows without a picked type are skipped; the 'default' syncStrategy
 * sentinel becomes undefined (inherit the request-level strategy); a
 * hand-picked subset travels as `entityIds` with `allEntities: false`.
 */
export function toComplexCreateRequest(options: {
  branch: string;
  versionName: string;
  syncStrategy: EntityTypeSyncStrategy;
  rows: Array<EntityTypeCreateRow>;
}): ComplexVersionCreateRequest {
  const entityTypes: ComplexVersionCreateRequest['entityTypes'] = {};
  for (const row of options.rows) {
    if (!row.entityType) {
      continue;
    }
    const { syncStrategy, entityIds, allEntities, ...flags } = row.config;
    entityTypes[row.entityType] = {
      ...flags,
      syncStrategy: syncStrategy === 'default' ? undefined : syncStrategy,
      allEntities: allEntities !== false,
      entityIds: allEntities === false ? (entityIds ?? []) : undefined,
    };
  }
  return {
    type: 'COMPLEX',
    branch: options.branch,
    versionName: options.versionName,
    syncStrategy: options.syncStrategy,
    entityTypes,
  };
}

/**
 * Panel rows → the wire `entityTypes` map of an ENTITY_TYPE load request.
 * `findExistingEntityByName` defaults to true server-side; the UI always
 * sends the explicit value (ngx submits the form array verbatim).
 */
export function toEntityTypeLoadRequest(options: {
  versionId: string;
  rollbackOnError: boolean;
  rows: Array<EntityTypeLoadRow>;
}): EntityTypeVersionLoadRequest {
  const entityTypes: EntityTypeVersionLoadRequest['entityTypes'] = {};
  for (const row of options.rows) {
    if (!row.entityType) {
      continue;
    }
    entityTypes[row.entityType] = {
      ...row.config,
      findExistingEntityByName: row.config.findExistingEntityByName !== false,
    };
  }
  return {
    type: 'ENTITY_TYPE',
    versionId: options.versionId,
    rollbackOnError: options.rollbackOnError,
    entityTypes,
  };
}

/** Structured load error of the backend (contract #10). */
export interface EntityLoadError {
  type?: string;
  source?: { entityType?: string; id?: string };
  target?: { entityType?: string; id?: string };
  message?: string;
}

export interface FormattedMessage {
  id: string;
  defaultMessage: string;
  values?: Record<string, string>;
}

type Translate = (message: FormattedMessage) => string;

/**
 * EntityLoadError → user-facing message (ngx
 * entityLoadErrorToMessage parity, three states):
 *   - DEVICE_CREDENTIALS_CONFLICT: the same credentials already exist on
 *     another device — hint at disabling "load credentials";
 *   - MISSING_REFERENCED_ENTITY: the version references an entity that
 *     does not exist (any more);
 *   - RUNTIME: verbatim runtime message.
 * Unknown shapes degrade to the raw message / the type name.
 */
export function entityLoadErrorToMessage(
  error: EntityLoadError | string | undefined,
  translate: Translate,
): string {
  if (!error) {
    return '';
  }
  if (typeof error === 'string') {
    return error;
  }
  const typeName = (type?: string) =>
    type
      ? translate({
          id: `pages.versionControl.entityTypes.${type}`,
          defaultMessage: type,
        })
      : '';
  switch (error.type) {
    case 'DEVICE_CREDENTIALS_CONFLICT':
      return translate({
        id: 'pages.versionControl.loadError.deviceCredentialsConflict',
        defaultMessage:
          'Failed to load the device with external id {entityId} because the same credentials are already present in the database for another device. Consider disabling the "Load credentials" setting in the restore form.',
        values: { entityId: error.source?.id ?? '' },
      });
    case 'MISSING_REFERENCED_ENTITY':
      return translate({
        id: 'pages.versionControl.loadError.missingReferencedEntity',
        defaultMessage:
          'Failed to load the {sourceEntityType} with external id {sourceEntityId} because it references a missing {targetEntityType} with id {targetEntityId}.',
        values: {
          sourceEntityType: typeName(error.source?.entityType),
          sourceEntityId: error.source?.id ?? '',
          targetEntityType: typeName(error.target?.entityType),
          targetEntityId: error.target?.id ?? '',
        },
      });
    case 'RUNTIME':
      return translate({
        id: 'pages.versionControl.loadError.runtime',
        defaultMessage: 'Failed: {message}',
        values: { message: error.message ?? '' },
      });
    default:
      return error.message ?? error.type ?? '';
  }
}
