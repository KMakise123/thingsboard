/**
 * Import adapter contract tests: parse seam, missing-alias detection
 * (datasources + alarmSource; present aliases are not reported), and the
 * 补录 stub factory. §3.8 ui-ngx dashboard-page.component.ts:1073 parity.
 */
import { describe, expect, it } from 'vitest';
import type { Dashboard, DashboardConfiguration } from '@/types/tb/dashboard';
import {
  createMissingAliasStub,
  findMissingEntityAliases,
  importDashboardIntoEditor,
} from './import-dashboard';

function configWithWidgets(
  widgets: Record<string, unknown>,
  entityAliases: Record<string, unknown> = {},
): DashboardConfiguration {
  return {
    widgets,
    states: {
      default: {
        name: 'Root',
        root: true,
        layouts: { main: { widgets: {}, gridSettings: {} } },
      },
    },
    entityAliases,
  } as unknown as DashboardConfiguration;
}

describe('importDashboardIntoEditor', () => {
  it('parses a valid dashboard JSON file', async () => {
    const file = new File(
      [JSON.stringify({ title: 'Imported', configuration: { widgets: [] } })],
      'imported.json',
      { type: 'application/json' },
    );
    const imported = await importDashboardIntoEditor(file);
    expect(imported.title).toBe('Imported');
  });

  it('rejects non-JSON with the parse-error locale key', async () => {
    const file = new File(['not json'], 'broken.json', {
      type: 'application/json',
    });
    await expect(importDashboardIntoEditor(file)).rejects.toMatchObject({
      name: 'DashboardImportError',
      localeKey: 'dashboards.list.importParseError',
    });
  });

  it('rejects JSON without title/configuration with the invalid-error locale key', async () => {
    const file = new File([JSON.stringify({ foo: 1 })], 'bad.json', {
      type: 'application/json',
    });
    await expect(importDashboardIntoEditor(file)).rejects.toMatchObject({
      localeKey: 'dashboards.list.importInvalidError',
    });
  });
});

describe('findMissingEntityAliases', () => {
  it('detects aliases referenced by datasources but absent from entityAliases', () => {
    const configuration = configWithWidgets({
      w1: {
        typeFullFqn: 'system.cards.test',
        config: {
          datasources: [
            { type: 'entity', entityAliasId: 'alias-present', dataKeys: [] },
            { type: 'entity', entityAliasId: 'alias-missing', dataKeys: [] },
          ],
        },
      },
    });
    configuration.entityAliases = {
      'alias-present': { id: 'alias-present', alias: 'P', filter: {} },
    } as unknown as DashboardConfiguration['entityAliases'];

    expect(findMissingEntityAliases(configuration)).toEqual([
      { aliasId: 'alias-missing', widgetIds: ['w1'] },
    ]);
  });

  it('also scans alarmSource and aggregates per widget', () => {
    const configuration = configWithWidgets({
      w1: {
        typeFullFqn: 'system.alarms.table',
        config: { alarmSource: { type: 'alarm', entityAliasId: 'gone' } },
      },
      w2: {
        typeFullFqn: 'system.cards.test',
        config: {
          datasources: [{ type: 'entity', entityAliasId: 'gone' }],
        },
      },
    });
    expect(findMissingEntityAliases(configuration)).toEqual([
      { aliasId: 'gone', widgetIds: ['w1', 'w2'] },
    ]);
  });

  it('returns an empty list when every referenced alias is defined', () => {
    const configuration = configWithWidgets(
      {
        w1: {
          typeFullFqn: 'w',
          config: {
            datasources: [{ type: 'entity', entityAliasId: 'a1' }],
          },
        },
      },
      { a1: { id: 'a1', alias: 'A', filter: {} } },
    );
    expect(findMissingEntityAliases(configuration)).toEqual([]);
  });
});

describe('createMissingAliasStub', () => {
  it('builds a device-type default the Aliases dialog can re-point', () => {
    expect(createMissingAliasStub('gone', 'My alias')).toEqual({
      id: 'gone',
      alias: 'My alias',
      filter: {
        type: 'entityType',
        entityType: 'DEVICE',
        resolveMultiple: true,
      },
    });
  });

  it('round-trips through a full dashboard import shape (sanity against Dashboard type)', () => {
    const stub = createMissingAliasStub('a1', 'A');
    const dashboard = {
      title: 'T',
      configuration: { entityAliases: { a1: stub } },
    } as unknown as Dashboard;
    expect(dashboard.configuration?.entityAliases?.a1.alias).toBe('A');
  });
});
