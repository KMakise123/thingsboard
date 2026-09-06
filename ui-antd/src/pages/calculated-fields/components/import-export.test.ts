/**
 * CF import/export pure helpers (M14 wave-4, R16): type validation
 * (ALARM/unknown rejected), entityId stripping on export and the
 * importing-tenant reference rewrite (ngx :350-396 parity).
 */
import { describe, expect, it } from 'vitest';

import type { CalculatedField } from '@/types/tb/calculated-fields';
import {
  parseImportedField,
  rewriteTenantReferences,
  stripEntityId,
} from './import-export';

const baseField = {
  type: 'SIMPLE',
  name: 'double',
  configuration: {
    type: 'SIMPLE',
    expression: 'a * 2',
    arguments: {
      a: {
        refEntityId: { entityType: 'DEVICE', id: 'd-1' },
        refEntityKey: { key: 'temp', type: 'TS_LATEST' },
      },
      owner: {
        refEntityId: { entityType: 'TENANT', id: 'old-tenant' },
        refEntityKey: {
          key: 'quota',
          type: 'ATTRIBUTE',
          scope: 'SERVER_SCOPE',
        },
      },
    },
    useLatestTs: false,
    output: {
      type: 'TIME_SERIES',
      name: 'out',
      strategy: { type: 'RULE_CHAIN' },
    },
  },
} as unknown as CalculatedField;

describe('parseImportedField type validation', () => {
  it('accepts the six page types', () => {
    for (const type of [
      'SIMPLE',
      'SCRIPT',
      'PROPAGATION',
      'RELATED_ENTITIES_AGGREGATION',
      'ENTITY_AGGREGATION',
      'GEOFENCING',
    ]) {
      const result = parseImportedField(JSON.stringify({ ...baseField, type }));
      expect(result.ok).toBe(true);
    }
  });

  it('rejects ALARM (R18: alarm-rules is a separate domain)', () => {
    const result = parseImportedField(
      JSON.stringify({ ...baseField, type: 'ALARM' }),
    );
    expect(result).toEqual({ ok: false, reason: 'type' });
  });

  it('rejects unknown types', () => {
    const result = parseImportedField(
      JSON.stringify({ ...baseField, type: 'TELEPORTATION' }),
    );
    expect(result).toEqual({ ok: false, reason: 'type' });
  });

  it('rejects non-JSON and non-object payloads', () => {
    expect(parseImportedField('{oops')).toEqual({ ok: false, reason: 'parse' });
    expect(parseImportedField('[1,2]')).toEqual({
      ok: false,
      reason: 'not-object',
    });
  });
});

describe('stripEntityId (export shape)', () => {
  it('removes the target entity from the exported JSON', () => {
    const field = {
      ...baseField,
      entityId: { entityType: 'DEVICE', id: 'd-1' },
    } as CalculatedField;
    const exported = stripEntityId(field);
    expect('entityId' in exported).toBe(false);
    expect(exported.name).toBe('double');
  });
});

describe('rewriteTenantReferences (importing tenant)', () => {
  it('rewrites TENANT references inside arguments and zoneGroups', () => {
    const field = {
      ...baseField,
      configuration: {
        ...baseField.configuration,
        zoneGroups: {
          z1: {
            refEntityId: { entityType: 'TENANT', id: 'old-tenant' },
            perimeterKeyName: 'perimeter',
          },
          local: {
            refEntityId: { entityType: 'DEVICE', id: 'd-2' },
            perimeterKeyName: 'perimeter',
          },
        },
      },
    } as unknown as CalculatedField;
    const rewritten = rewriteTenantReferences(field, 'new-tenant');
    const config = rewritten.configuration as unknown as {
      arguments: Record<
        string,
        { refEntityId?: { entityType: string; id: string } }
      >;
      zoneGroups: Record<
        string,
        { refEntityId?: { entityType: string; id: string } }
      >;
    };
    expect(config.arguments.owner.refEntityId).toEqual({
      entityType: 'TENANT',
      id: 'new-tenant',
    });
    // Non-tenant references stay untouched.
    expect(config.arguments.a.refEntityId).toEqual({
      entityType: 'DEVICE',
      id: 'd-1',
    });
    expect(config.zoneGroups.z1.refEntityId).toEqual({
      entityType: 'TENANT',
      id: 'new-tenant',
    });
    expect(config.zoneGroups.local.refEntityId).toEqual({
      entityType: 'DEVICE',
      id: 'd-2',
    });
    // The original row is not mutated.
    const before = baseField.configuration as unknown as {
      arguments: Record<string, { refEntityId?: { id: string } }>;
    };
    expect(before.arguments.owner.refEntityId?.id).toBe('old-tenant');
  });

  it('keeps the NULL_UUID sentinel untouched', () => {
    const field = {
      ...baseField,
      configuration: {
        ...baseField.configuration,
        arguments: {
          ghost: {
            refEntityId: {
              entityType: 'TENANT',
              id: '13814000-1dd2-11b2-8080-808080808080',
            },
            refEntityKey: { key: 'x', type: 'TS_LATEST' },
          },
        },
      },
    } as unknown as CalculatedField;
    const rewritten = rewriteTenantReferences(field, 'new-tenant');
    const config = rewritten.configuration as unknown as {
      arguments: Record<string, { refEntityId?: { id: string } }>;
    };
    expect(config.arguments.ghost.refEntityId?.id).toBe(
      '13814000-1dd2-11b2-8080-808080808080',
    );
  });
});
