import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { objToBase64 } from '@/core/dashboard/states';
import type { DashboardState } from '@/types/tb/dashboard';
import { useStatesController } from './use-states-controller';

const findEntitiesByFilter = vi.hoisted(() => vi.fn());

vi.mock('@/services/tb/dashboard', () => ({
  findEntitiesByFilter: (...args: unknown[]) => findEntitiesByFilter(...args),
}));

const states: Record<string, DashboardState> = {
  default: { name: 'Devices', root: true, layouts: {} },
  // biome-ignore lint/suspicious/noTemplateCurlyInString: TB state names carry `${entityName}` templates verbatim on the wire
  map: { name: 'Map of ${entityName}', layouts: {} },
};

function currentSearch(): string {
  return window.location.search;
}

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/dashboards/d1');
});

describe('useStatesController (default mode)', () => {
  it('starts at the root and replaces the layer on openState', () => {
    const { result } = renderHook(() =>
      useStatesController({ states, mode: 'default' }),
    );
    expect(result.current.currentStateId).toBe('default');

    act(() => {
      result.current.openState('map', { entityName: 'GW1' });
    });
    expect(result.current.currentStateId).toBe('map');
    expect(currentSearch()).toContain(
      `state=${encodeURIComponent(objToBase64([{ id: 'map', params: { entityName: 'GW1' } }]))}`,
    );
  });

  it('ignores unknown state ids', () => {
    const { result } = renderHook(() =>
      useStatesController({ states, mode: 'default' }),
    );
    act(() => {
      result.current.openState('nope');
    });
    expect(result.current.currentStateId).toBe('default');
    expect(currentSearch()).toBe('');
  });
});

describe('useStatesController (entity mode)', () => {
  it('pushes layers, resolves entity names and drops the param at root', async () => {
    findEntitiesByFilter.mockResolvedValue({
      data: [
        {
          entityId: { entityType: 'DEVICE', id: 'dev-1' },
          latest: {
            ENTITY_FIELD: {
              name: { ts: 1, value: 'Thermometer 1' },
              label: { ts: 1, value: 'T1' },
            },
          },
        },
      ],
      hasNext: false,
    });
    const { result } = renderHook(() =>
      useStatesController({ states, mode: 'entity' }),
    );
    // root + no params → state param absent
    expect(currentSearch()).not.toContain('state');

    act(() => {
      result.current.openState('map', {
        entityId: { entityType: 'DEVICE', id: 'dev-1' },
      });
    });
    await waitFor(() => {
      expect(result.current.stateObject).toHaveLength(2);
    });
    expect(findEntitiesByFilter).toHaveBeenCalledWith(
      {
        type: 'singleEntity',
        singleEntity: { entityType: 'DEVICE', id: 'dev-1' },
      },
      { pageSize: 1, page: 0 },
    );
    // breadcrumb name interpolates the resolved entity name
    expect(result.current.breadcrumbs[1].name).toBe('Map of Thermometer 1');
    expect(currentSearch()).toContain('state=');

    act(() => {
      result.current.navigatePrev(0);
    });
    expect(result.current.stateObject).toHaveLength(1);
    // back at the param-less root the URL param is dropped again
    expect(currentSearch()).not.toContain('state');
  });

  it('resets to the root state', () => {
    window.history.replaceState(
      null,
      '',
      `/dashboards/d1?state=${encodeURIComponent(
        objToBase64([
          { id: 'default', params: {} },
          { id: 'map', params: { entityName: 'X' } },
        ]),
      )}`,
    );
    const { result } = renderHook(() =>
      useStatesController({ states, mode: 'entity' }),
    );
    expect(result.current.stateObject).toHaveLength(2);
    act(() => {
      result.current.resetState();
    });
    expect(result.current.stateObject).toEqual([{ id: 'default', params: {} }]);
    expect(currentSearch()).not.toContain('state');
  });
});
