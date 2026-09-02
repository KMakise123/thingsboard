import { describe, expect, it } from 'vitest';
import type { Dashboard } from '@/types/tb/dashboard';
import {
  createDefaultGridSettings,
  createDefaultState,
  getRootStateId,
  validateAndUpdateDashboard,
} from './model';

describe('createDefaultGridSettings / createDefaultState', () => {
  it('matches ui-ngx defaults', () => {
    expect(createDefaultGridSettings()).toEqual({
      layoutType: 'default',
      backgroundColor: '#eeeeee',
      columns: 24,
      margin: 10,
      outerMargin: true,
      backgroundSizeMode: '100%',
    });
    const state = createDefaultState('default', true);
    expect(state.root).toBe(true);
    expect(Object.keys(state.layouts)).toEqual(['main']);
    expect(state.layouts.main?.gridSettings.columns).toBe(24);
  });
});

describe('getRootStateId', () => {
  it('prefers the root-flagged state', () => {
    expect(
      getRootStateId({
        a: { name: 'A', root: false, layouts: {} },
        b: { name: 'B', root: true, layouts: {} },
      }),
    ).toBe('b');
  });

  it('falls back to the first key when no root flag exists', () => {
    expect(
      getRootStateId({
        b: { name: 'B', layouts: {} },
        a: { name: 'A', layouts: {} },
      }),
    ).toBe('b');
  });
});

describe('validateAndUpdateDashboard', () => {
  it('does not mutate the input dashboard', () => {
    const dashboard = {
      id: { entityType: 'DASHBOARD', id: 'd1' },
      title: 'T',
    } as Dashboard;
    const result = validateAndUpdateDashboard(dashboard);
    expect(dashboard.configuration).toBeUndefined();
    expect(result.configuration).toBeDefined();
    expect(result).not.toBe(dashboard);
  });

  it('maps a legacy widgets array into a map and generates a default state', () => {
    const dashboard = {
      id: { entityType: 'DASHBOARD', id: 'd1' },
      title: 'Legacy',
      configuration: {
        widgets: [
          {
            typeFullFqn: 'system.cards.entities_table',
            sizeX: 8,
            sizeY: 6,
            row: 0,
            col: 0,
            config: { datasources: [], mobileHeight: 4, mobileOrder: 2 },
          },
        ],
      },
    } as unknown as Dashboard;

    const c = validateAndUpdateDashboard(dashboard).configuration!;
    const widgetIds = Object.keys(c.widgets);
    expect(widgetIds).toHaveLength(1);

    // default state materialized from widget geometry
    const stateId = getRootStateId(c.states);
    expect(stateId).toBe('default');
    const layout = c.states.default.layouts.main!.widgets[widgetIds[0]];
    expect(layout).toMatchObject({
      sizeX: 8,
      sizeY: 6,
      row: 0,
      col: 0,
      mobileHeight: 4,
      mobileOrder: 2,
    });

    // settings defaults
    expect(c.settings).toMatchObject({
      stateControllerId: 'entity',
      showTitle: false,
      showDashboardTimewindow: true,
      showDashboardExport: true,
      toolbarAlwaysOpen: true,
    });
  });

  it('fills missing root flag and layout defaults on anchor-shaped dashboards', () => {
    const dashboard = {
      id: { entityType: 'DASHBOARD', id: 'd1' },
      title: 'Demo',
      configuration: {
        widgets: {},
        states: {
          first: { name: 'First', layouts: {} },
          second: {
            name: 'Second',
            layouts: {
              main: {
                widgets: {},
                gridSettings: { columns: 48, margin: 12 } as never,
              },
            },
          },
        },
        entityAliases: {},
      },
    } as unknown as Dashboard;

    const c = validateAndUpdateDashboard(dashboard).configuration!;
    // first state got the root flag
    expect(c.states.first.root).toBe(true);
    expect(c.states.second.root).toBe(false);
    // empty layouts materialized with default grid settings
    expect(c.states.first.layouts.main?.gridSettings.margin).toBe(10);
    expect(c.states.first.layouts.main?.gridSettings.outerMargin).toBe(true);
    // explicit values preserved
    expect(c.states.second.layouts.main?.gridSettings.margin).toBe(12);
    expect(c.states.second.layouts.main?.gridSettings.outerMargin).toBe(true);
  });

  it('collapses legacy margins array and keeps an existing root state', () => {
    const dashboard = {
      id: { entityType: 'DASHBOARD', id: 'd1' },
      title: 'Demo',
      configuration: {
        widgets: {},
        states: {
          root: {
            name: 'Root',
            root: true,
            layouts: {
              main: {
                widgets: {},
                gridSettings: {
                  columns: 24,
                  margins: [8, 8],
                } as never,
              },
            },
          },
        },
        entityAliases: {},
      },
    } as unknown as Dashboard;

    const c = validateAndUpdateDashboard(dashboard).configuration!;
    expect(c.states.root.root).toBe(true);
    const gs = c.states.root.layouts.main!.gridSettings;
    expect(gs.margin).toBe(8);
    expect('margins' in gs).toBe(false);
  });
});
