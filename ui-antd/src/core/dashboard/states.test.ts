import { describe, expect, it } from 'vitest';
import type { DashboardState } from '@/types/tb/dashboard';
import {
  base64ToObj,
  currentStateId,
  currentStateParams,
  insertVariable,
  objToBase64,
  parseStateObject,
  serializeStateObject,
  stateLayerName,
} from './states';

const states: Record<string, DashboardState> = {
  default: { name: 'Devices', root: true, layouts: {} },
  map: { name: 'Map', layouts: {} },
  chart: { name: 'Chart', layouts: {} },
};

describe('objToBase64 / base64ToObj (ui-ngx URL codec)', () => {
  it('round-trips unicode state names', () => {
    const obj = [{ id: 'map', params: { entityName: '温度计 1号' } }];
    const encoded = objToBase64(obj);
    expect(encoded).not.toContain('温度计');
    expect(base64ToObj(encoded)).toEqual(obj);
  });

  it('throws on malformed base64', () => {
    expect(() => base64ToObj('%%%not-base64###')).toThrow();
  });
});

describe('parseStateObject', () => {
  it('returns the root state for an absent param', () => {
    expect(parseStateObject(null, states, 'default')).toEqual([
      { id: 'default', params: {} },
    ]);
    expect(parseStateObject('', states, 'entity')).toEqual([
      { id: 'default', params: {} },
    ]);
  });

  it('returns the root state for an undecodable param', () => {
    expect(parseStateObject('%%%', states, 'default')).toEqual([
      { id: 'default', params: {} },
    ]);
  });

  it('truncates a deep stack to the last layer in default mode', () => {
    const raw = objToBase64([
      { id: 'map', params: {} },
      { id: 'chart', params: {} },
    ]);
    expect(parseStateObject(raw, states, 'default')).toEqual([
      { id: 'chart', params: {} },
    ]);
  });

  it('keeps the full stack in entity mode', () => {
    const raw = objToBase64([
      { id: 'default', params: {} },
      { id: 'map', params: { entityName: 'GW1' } },
    ]);
    expect(parseStateObject(raw, states, 'entity')).toEqual([
      { id: 'default', params: {} },
      { id: 'map', params: { entityName: 'GW1' } },
    ]);
  });

  it('falls back to root when the id is unknown', () => {
    const raw = objToBase64([{ id: 'nope', params: {} }]);
    expect(parseStateObject(raw, states, 'default')).toEqual([
      { id: 'default', params: {} },
    ]);
  });

  it('drops unknown deeper layers but keeps the valid prefix (entity)', () => {
    const raw = objToBase64([
      { id: 'default', params: {} },
      { id: 'nope', params: {} },
      { id: 'chart', params: {} },
    ]);
    expect(parseStateObject(raw, states, 'entity')).toEqual([
      { id: 'default', params: {} },
      { id: 'chart', params: {} },
    ]);
  });
});

describe('serializeStateObject', () => {
  it('always writes the param in default mode', () => {
    const stack = [{ id: 'default', params: {} }];
    expect(serializeStateObject(stack, states, 'default')).toBe(
      objToBase64(stack),
    );
  });

  it('drops the param at a param-less root in entity mode', () => {
    const stack = [{ id: 'default', params: {} }];
    expect(serializeStateObject(stack, states, 'entity')).toBeNull();
  });

  it('writes the param once params are present (entity mode)', () => {
    const stack = [{ id: 'default', params: { entityName: 'GW1' } }];
    expect(serializeStateObject(stack, states, 'entity')).toBe(
      objToBase64(stack),
    );
  });
});

describe('state helpers', () => {
  it('exposes current id/params from the last layer', () => {
    const stack = [
      { id: 'default', params: {} },
      { id: 'map', params: { entityName: 'GW1' } },
    ];
    expect(currentStateId(stack)).toBe('map');
    expect(currentStateParams(stack)).toEqual({ entityName: 'GW1' });
  });

  it('inserts entity variables into state names', () => {
    expect(
      stateLayerName(
        { name: 'Firmware history: ${entityName}', layouts: {} },
        { entityName: 'Device A', entityLabel: 'A' },
      ),
    ).toBe('Firmware history: Device A');
    expect(stateLayerName({ name: 'No vars', layouts: {} }, undefined)).toBe(
      'No vars',
    );
    expect(
      insertVariable('${entityLabel} (${entityName})', 'entityName', 'X'),
    ).toBe('${entityLabel} (X)');
  });

  it('interpolates nested param entity names', () => {
    expect(
      stateLayerName(
        { name: 'Rel: ${device:entityName}', layouts: {} },
        {
          device: { entityName: 'Nested' },
        },
      ),
    ).toBe('Rel: Nested');
  });
});
