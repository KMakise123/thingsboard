import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EntityAlias } from '@/types/tb/dashboard';
import { resolveEntityAliases } from './alias-resolver';

afterEach(() => {
  vi.restoreAllMocks();
});

const fetchSpy = vi.fn(async () => []);

function alias(id: string, filter: EntityAlias['filter']): EntityAlias {
  return { id, alias: id, filter };
}

describe('resolveEntityAliases', () => {
  it('resolves singleEntity client-side without network calls', async () => {
    const result = await resolveEntityAliases({
      entityAliases: {
        a1: alias('a1', {
          type: 'singleEntity',
          resolveMultiple: false,
          singleEntity: { entityType: 'DEVICE', id: 'dev-1' },
        }),
      },
      stateParams: {},
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.a1).toEqual([{ entityType: 'DEVICE', id: 'dev-1' }]);
  });

  it('resolves stateEntity from the current state params', async () => {
    const result = await resolveEntityAliases({
      entityAliases: {
        s1: alias('s1', {
          type: 'stateEntity',
          resolveMultiple: false,
          stateEntityParamName: null,
          defaultStateEntity: null,
        }),
      },
      stateParams: {
        entityId: { entityType: 'DEVICE', id: 'dev-2' },
        entityName: 'Thermometer 1',
      },
    });
    expect(result.s1).toEqual([{ entityType: 'DEVICE', id: 'dev-2' }]);
  });

  it('honors stateEntityParamName and falls back to defaultStateEntity', async () => {
    const entityAliases = {
      s2: alias('s2', {
        type: 'stateEntity',
        resolveMultiple: false,
        stateEntityParamName: 'targetEntityParamName',
        defaultStateEntity: { entityType: 'ASSET', id: 'asset-0' },
      }),
    };
    const withParam = await resolveEntityAliases({
      entityAliases,
      stateParams: {
        targetEntityParamName: { entityType: 'DEVICE', id: 'dev-3' },
      },
    });
    expect(withParam.s2).toEqual([{ entityType: 'DEVICE', id: 'dev-3' }]);

    const withoutParam = await resolveEntityAliases({
      entityAliases,
      stateParams: {},
    });
    expect(withoutParam.s2).toEqual([{ entityType: 'ASSET', id: 'asset-0' }]);
  });

  it('queries entityType filters through the entity query transport', async () => {
    const fetchEntities = vi.fn(async () => [
      {
        entityId: { entityType: 'DEVICE', id: 'dev-a' },
        latest: {
          ENTITY_FIELD: {
            name: { ts: 1, value: 'Device A' },
            label: { ts: 1, value: 'A label' },
          },
        },
      },
      { entityId: { entityType: 'DEVICE', id: 'dev-b' }, latest: {} },
    ]);
    const result = await resolveEntityAliases({
      entityAliases: {
        e1: alias('e1', {
          type: 'entityType',
          resolveMultiple: true,
          entityType: 'DEVICE',
        }),
      },
      fetchEntities,
    });
    expect(fetchEntities).toHaveBeenCalledWith({
      type: 'entityType',
      entityType: 'DEVICE',
    });
    expect(result.e1).toEqual([
      {
        entityType: 'DEVICE',
        id: 'dev-a',
        name: 'Device A',
        label: 'A label',
      },
      { entityType: 'DEVICE', id: 'dev-b', name: undefined, label: undefined },
    ]);
  });

  it('builds relationsQuery from the state entity when rootStateEntity', async () => {
    const fetchEntities = vi.fn(async () => []);
    const result = await resolveEntityAliases({
      entityAliases: {
        r1: alias('r1', {
          type: 'relationsQuery',
          resolveMultiple: true,
          rootStateEntity: true,
          stateEntityParamName: null,
          defaultStateEntity: null,
          rootEntity: null,
          direction: 'FROM',
          maxLevel: 1,
          fetchLastLevelOnly: false,
          filters: [{ relationType: 'Created', entityTypes: ['DEVICE'] }],
        }),
      },
      stateParams: { entityId: { entityType: 'DEVICE', id: 'gw-1' } },
      fetchEntities,
    });
    expect(fetchEntities).toHaveBeenCalledWith({
      type: 'relationsQuery',
      rootEntity: { entityType: 'DEVICE', id: 'gw-1' },
      direction: 'FROM',
      filters: [{ relationType: 'Created', entityTypes: ['DEVICE'] }],
      maxLevel: 1,
      fetchLastLevelOnly: false,
    });
    expect(result.r1).toEqual([]);
  });

  it('resolves apiUsageState through the entity query transport', async () => {
    const fetchEntities = vi.fn(async () => [
      { entityId: { entityType: 'API_USAGE_STATE', id: 'usage-1' } },
    ]);
    const result = await resolveEntityAliases({
      entityAliases: {
        u1: alias('u1', { type: 'apiUsageState', resolveMultiple: false }),
      },
      fetchEntities,
    });
    expect(fetchEntities).toHaveBeenCalledWith({ type: 'apiUsageState' });
    expect(result.u1).toEqual([
      { entityType: 'API_USAGE_STATE', id: 'usage-1' },
    ]);
  });

  it('degrades unknown filter types to an empty set with a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchEntities = vi.fn(async () => []);
    const result = await resolveEntityAliases({
      entityAliases: {
        x1: alias('x1', {
          type: 'deviceSearchQuery',
        } as EntityAlias['filter']),
      },
      fetchEntities,
    });
    expect(result.x1).toEqual([]);
    expect(fetchEntities).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('deviceSearchQuery'),
    );
  });

  it('degrades a failing alias to an empty set without failing siblings', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchEntities = vi.fn(async (filter: Record<string, unknown>) => {
      if (filter.entityType === 'DEVICE') {
        throw new Error('boom');
      }
      return [{ entityId: { entityType: 'ASSET', id: 'asset-1' } }];
    });
    const result = await resolveEntityAliases({
      entityAliases: {
        ok: alias('ok', {
          type: 'entityType',
          entityType: 'ASSET',
        }),
        bad: alias('bad', {
          type: 'entityType',
          entityType: 'DEVICE',
        }),
      },
      fetchEntities,
    });
    expect(result.ok).toEqual([{ entityType: 'ASSET', id: 'asset-1' }]);
    expect(result.bad).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('failed to resolve'),
      expect.anything(),
    );
  });
});
