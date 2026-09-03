/**
 * Custom-component registry tests: register/resolve/reset lifecycle and the
 * precedence chain (hint id → property id, override map → global registry).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FormPropertyType } from './types';
import {
  getCustomComponent,
  registerCustomComponent,
  resetCustomComponents,
  resolveCustomComponent,
} from './registry';

const property = {
  id: 'scriptBody',
  name: 'Script',
  type: FormPropertyType.javascript as const,
  default: '',
};

afterEach(() => {
  resetCustomComponents();
});

describe('custom-component registry', () => {
  it('registers, resolves and resets', () => {
    const component = vi.fn(() => null);
    expect(getCustomComponent('scriptBody')).toBeUndefined();
    registerCustomComponent('scriptBody', component);
    expect(getCustomComponent('scriptBody')).toBe(component);
    resetCustomComponents();
    expect(getCustomComponent('scriptBody')).toBeUndefined();
  });

  it('resolves by property id, preferring the hint customComponent id', () => {
    const byPropertyId = vi.fn(() => null);
    const byHintId = vi.fn(() => null);
    registerCustomComponent('scriptBody', byPropertyId);
    registerCustomComponent('rule-node.script', byHintId);

    expect(resolveCustomComponent(property)).toBe(byPropertyId);
    expect(
      resolveCustomComponent(property, { customComponent: 'rule-node.script' }),
    ).toBe(byHintId);
  });

  it('per-instance override map wins over the global registry', () => {
    const globalComponent = vi.fn(() => null);
    const overrideComponent = vi.fn(() => null);
    registerCustomComponent('scriptBody', globalComponent);

    expect(
      resolveCustomComponent(property, undefined, {
        scriptBody: overrideComponent,
      }),
    ).toBe(overrideComponent);
    expect(resolveCustomComponent(property)).toBe(globalComponent);
  });

  it('returns undefined for unknown properties', () => {
    expect(resolveCustomComponent({ ...property, id: 'unknown' })).toBeUndefined();
  });
});
