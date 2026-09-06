/**
 * Auto-commit settings unit tests (M14 wave-3, R23/R34): the stored-map ↔
 * editable-rows conversion, the per-type picker dedup and the save payload
 * (empty branch → undefined = repository default).
 */
import { describe, expect, it } from 'vitest';
import type { AutoVersionCreateConfig } from '@/services/tb/version-control';
import { EntityType } from '@/types/tb/entity';
import {
  type AutoCommitRow,
  availableEntityTypes,
  toAutoCommitRows,
  toAutoCommitSettings,
} from './data';

function config(
  overrides: Partial<AutoVersionCreateConfig> = {},
): AutoVersionCreateConfig {
  return {
    branch: '',
    saveAttributes: true,
    saveRelations: false,
    saveCredentials: true,
    saveCalculatedFields: true,
    ...overrides,
  };
}

describe('toAutoCommitRows', () => {
  it('degrades a null map (unconfigured 404) to no rows', () => {
    expect(toAutoCommitRows(null)).toEqual([]);
    expect(toAutoCommitRows(undefined)).toEqual([]);
  });

  it('converts each stored map entry to an editable row', () => {
    const rows = toAutoCommitRows({
      DEVICE: config({ branch: 'release' }),
      DASHBOARD: config(),
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ entityType: 'DEVICE' });
    expect(rows[0].config.branch).toBe('release');
  });
});

describe('availableEntityTypes', () => {
  it('offers only the unused types from the 16-type candidate list', () => {
    const rows: Array<AutoCommitRow> = [
      { entityType: EntityType.DEVICE, config: config() },
    ];
    const available = availableEntityTypes(rows);
    expect(available).toHaveLength(15);
    expect(available).not.toContain(EntityType.DEVICE);
  });

  it('keeps the current row type selectable while editing it', () => {
    const rows: Array<AutoCommitRow> = [
      { entityType: EntityType.DEVICE, config: config() },
    ];
    expect(availableEntityTypes(rows, EntityType.DEVICE)).toContain(
      EntityType.DEVICE,
    );
  });
});

describe('toAutoCommitSettings', () => {
  it('builds the entityType → config map and blanks empty branches', () => {
    const map = toAutoCommitSettings([
      { entityType: EntityType.DEVICE, config: config({ branch: '  ' }) },
      { entityType: EntityType.DASHBOARD, config: config({ branch: 'main' }) },
    ]);
    expect(map.DEVICE.branch).toBeUndefined();
    expect(map.DASHBOARD.branch).toBe('main');
    expect(map.DEVICE.saveCredentials).toBe(true);
  });

  it('answers an EMPTY map when every row was removed (caller must DELETE)', () => {
    expect(toAutoCommitSettings([])).toEqual({});
  });
});
