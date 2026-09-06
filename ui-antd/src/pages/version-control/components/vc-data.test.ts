/**
 * Version-control pure-layer tests (M14 wave-6, R20/R32) — the
 * removeOtherEntities verbatim gate (typos / casing / whitespace never
 * confirm), the 16-type default factories (per-family flag seeding), the
 * request builders (default-syncStrategy sentinel, hand-picked subsets)
 * and the EntityLoadError three-state copy.
 */
import { describe, expect, it } from 'vitest';
import { EntityType } from '@/types/tb/entity';
import {
  allowedEntityTypes,
  createDefaultEntityTypeCreateRows,
  createDefaultEntityTypeLoadRows,
  EXPORTABLE_ENTITY_TYPES,
  entityLoadErrorToMessage,
  isRemoveOtherEntitiesConfirmed,
  toComplexCreateRequest,
  toEntityTypeLoadRequest,
} from './vc-data';

/** Test translator: renders the raw defaultMessage with values applied. */
const translate = (message: {
  defaultMessage: string;
  values?: Record<string, string>;
}) => {
  let text: string = message.defaultMessage;
  for (const [key, value] of Object.entries(message.values ?? {})) {
    text = text.replaceAll(`{${key}}`, value);
  }
  return text;
};

describe('removeOtherEntities verbatim confirmation', () => {
  it('confirms only the exact phrase', () => {
    expect(isRemoveOtherEntitiesConfirmed('remove other entities')).toBe(true);
  });

  it('rejects typos, casing, padding and empty input', () => {
    expect(isRemoveOtherEntitiesConfirmed('remove other entity')).toBe(false);
    expect(isRemoveOtherEntitiesConfirmed('remove other entities ')).toBe(
      false,
    );
    expect(isRemoveOtherEntitiesConfirmed(' remove other entities')).toBe(
      false,
    );
    expect(isRemoveOtherEntitiesConfirmed('Remove other entities')).toBe(false);
    expect(isRemoveOtherEntitiesConfirmed('REMOVE OTHER ENTITIES')).toBe(false);
    expect(isRemoveOtherEntitiesConfirmed('remove  other entities')).toBe(
      false,
    );
    expect(isRemoveOtherEntitiesConfirmed('')).toBe(false);
    expect(isRemoveOtherEntitiesConfirmed(undefined)).toBe(false);
  });
});

describe('default per-type config factories', () => {
  it('pre-seeds all 16 exportable entity types', () => {
    expect(EXPORTABLE_ENTITY_TYPES).toHaveLength(16);
    expect(createDefaultEntityTypeCreateRows()).toHaveLength(16);
    expect(createDefaultEntityTypeLoadRows()).toHaveLength(16);
  });

  it('seeds create flags per the ngx type sets', () => {
    const rows = createDefaultEntityTypeCreateRows();
    const byType = new Map(
      rows.map((row) => [row.entityType as EntityType, row.config]),
    );
    // DEVICE: all families on, all-entities scope.
    expect(byType.get(EntityType.DEVICE)).toMatchObject({
      saveCredentials: true,
      saveAttributes: true,
      saveRelations: true,
      saveCalculatedFields: true,
      allEntities: true,
      syncStrategy: 'default',
    });
    // No-related-data type: attributes/relations off.
    expect(byType.get(EntityType.OTA_PACKAGE)).toMatchObject({
      saveAttributes: false,
      saveRelations: false,
    });
    // CF checkbox only for the CF-capable types.
    expect(byType.get(EntityType.NOTIFICATION_TEMPLATE)).toMatchObject({
      saveCalculatedFields: false,
    });
    expect(byType.get(EntityType.CUSTOMER)?.saveCalculatedFields).toBe(true);
  });

  it('seeds load defaults: findExistingEntityByName true, removeOtherEntities false', () => {
    const rows = createDefaultEntityTypeLoadRows();
    for (const row of rows) {
      expect(row.config.findExistingEntityByName).toBe(true);
      expect(row.config.removeOtherEntities).toBe(false);
    }
  });
});

describe('allowedEntityTypes', () => {
  it('excludes types configured on other rows but keeps the current row type', () => {
    const rows = [
      { entityType: EntityType.DEVICE },
      { entityType: EntityType.ASSET },
    ];
    const options = allowedEntityTypes(rows, EntityType.DEVICE);
    // The current row's own type stays selectable; the other rows' do not.
    expect(options).toContain(EntityType.DEVICE);
    expect(options).not.toContain(EntityType.ASSET);
    expect(options).toContain(EntityType.CUSTOMER);
    expect(options).toHaveLength(15);
  });
});

describe('request builders', () => {
  it('builds a COMPLEX create request: default sentinel → undefined, subset → entityIds', () => {
    const rows = [
      {
        entityType: EntityType.DEVICE,
        config: {
          syncStrategy: 'default' as const,
          saveCredentials: true,
          saveAttributes: true,
          saveRelations: true,
          saveCalculatedFields: true,
          allEntities: true,
          entityIds: [],
        },
      },
      {
        entityType: EntityType.ASSET,
        config: {
          syncStrategy: 'OVERWRITE' as const,
          saveCredentials: true,
          saveAttributes: true,
          saveRelations: true,
          saveCalculatedFields: true,
          allEntities: false,
          entityIds: ['asset-1'],
        },
      },
      { entityType: undefined, config: {} as never },
    ];
    const request = toComplexCreateRequest({
      branch: 'master',
      versionName: 'snapshot',
      syncStrategy: 'MERGE',
      rows: rows as never,
    });
    expect(request.type).toBe('COMPLEX');
    expect(request.branch).toBe('master');
    expect(request.syncStrategy).toBe('MERGE');
    expect(request.entityTypes?.DEVICE).toMatchObject({
      syncStrategy: undefined,
      allEntities: true,
      entityIds: undefined,
    });
    expect(request.entityTypes?.ASSET).toMatchObject({
      syncStrategy: 'OVERWRITE',
      allEntities: false,
      entityIds: ['asset-1'],
    });
    expect(request.entityTypes?.CUSTOMER).toBeUndefined();
  });

  it('builds an ENTITY_TYPE load request with the flags verbatim', () => {
    const rows = createDefaultEntityTypeLoadRows().filter(
      (row) => row.entityType === EntityType.DEVICE,
    );
    const request = toEntityTypeLoadRequest({
      versionId: 'v-1',
      rollbackOnError: true,
      rows,
    });
    expect(request).toMatchObject({
      type: 'ENTITY_TYPE',
      versionId: 'v-1',
      rollbackOnError: true,
    });
    expect(request.entityTypes?.DEVICE).toMatchObject({
      findExistingEntityByName: true,
      removeOtherEntities: false,
    });
  });
});

describe('entityLoadErrorToMessage (three states)', () => {
  it('renders the device-credentials-conflict hint with the external id', () => {
    const text = entityLoadErrorToMessage(
      { type: 'DEVICE_CREDENTIALS_CONFLICT', source: { id: 'ext-9' } },
      translate,
    );
    expect(text).toContain('ext-9');
    expect(text).toContain('credentials');
  });

  it('renders the missing-referenced-entity pair', () => {
    const text = entityLoadErrorToMessage(
      {
        type: 'MISSING_REFERENCED_ENTITY',
        source: { entityType: 'DEVICE', id: 'src-1' },
        target: { entityType: 'CUSTOMER', id: 'tgt-2' },
      },
      translate,
    );
    expect(text).toContain('src-1');
    expect(text).toContain('tgt-2');
  });

  it('renders runtime errors verbatim and degrades unknown shapes', () => {
    expect(
      entityLoadErrorToMessage({ type: 'RUNTIME', message: 'boom' }, translate),
    ).toContain('boom');
    expect(entityLoadErrorToMessage({ message: 'raw' }, translate)).toBe('raw');
    expect(entityLoadErrorToMessage('plain string', translate)).toBe(
      'plain string',
    );
    expect(entityLoadErrorToMessage(undefined, translate)).toBe('');
  });
});
