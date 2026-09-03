/**
 * uiHints pure-helper tests: hint resolution, label/options fallbacks and
 * the group/order layout pipeline the renderer consumes.
 */
import { describe, expect, it } from 'vitest';
import { FormPropertyType, type FormProperty } from './types';
import {
  groupProperties,
  resolveEnumOptions,
  resolveFieldLabel,
  resolveUiHint,
} from './ui-hints';

function prop(partial: Partial<FormProperty>): FormProperty {
  return { id: 'p', name: 'p', type: FormPropertyType.text, default: null, ...partial };
}

describe('resolveUiHint / resolveFieldLabel / resolveEnumOptions', () => {
  it('resolves the hint by property id and tolerates a missing map', () => {
    const property = prop({ id: 'interval' });
    expect(resolveUiHint(undefined, property)).toBeUndefined();
    expect(resolveUiHint({ interval: { label: 'Interval' } }, property)).toEqual({
      label: 'Interval',
    });
  });

  it('label falls back hint → name → id', () => {
    const property = prop({ id: 'k', name: 'Name' });
    expect(resolveFieldLabel(property)).toBe('Name');
    expect(resolveFieldLabel(property, { label: 'Hint' })).toBe('Hint');
    expect(resolveFieldLabel(prop({ id: 'k', name: undefined }))).toBe('k');
  });

  it('hint enumOptions override declared items', () => {
    const property = prop({
      type: FormPropertyType.select,
      items: [{ value: 'a', label: 'A' }],
    });
    expect(resolveEnumOptions(property)).toHaveLength(1);
    expect(resolveEnumOptions(property, { enumOptions: [{ value: 'b', label: 'B' }] })).toEqual([
      { value: 'b', label: 'B' },
    ]);
  });
});

describe('groupProperties', () => {
  it('returns one untitled group in declaration order without hints/groups', () => {
    const properties = [prop({ id: 'a' }), prop({ id: 'b' })];
    const groups = groupProperties(properties);
    expect(groups).toHaveLength(1);
    expect(groups[0].title).toBeUndefined();
    expect(groups[0].members.map((m) => m.property.id)).toEqual(['a', 'b']);
  });

  it('groups by hint.group (winning over property.group) and orders sections by groupOrder', () => {
    const properties = [
      prop({ id: 'late', group: 'Advanced' }),
      prop({ id: 'first', group: 'Basic' }),
      prop({ id: 'hinted' }),
    ];
    const groups = groupProperties(properties, {
      late: { groupOrder: 2 },
      first: { groupOrder: 1 },
      hinted: { group: 'Basic' },
    });
    expect(groups.map((g) => g.title)).toEqual(['Basic', 'Advanced']);
    expect(groups[0].members.map((m) => m.property.id)).toEqual(['first', 'hinted']);
  });

  it('sorts fields inside a group by hint.order, stable otherwise', () => {
    const properties = [
      prop({ id: 'second', group: 'G' }),
      prop({ id: 'first', group: 'G' }),
      prop({ id: 'third', group: 'G' }),
    ];
    const groups = groupProperties(properties, {
      first: { order: -1 },
      third: { order: 99 },
    });
    expect(groups[0].members.map((m) => m.property.id)).toEqual([
      'first',
      'second',
      'third',
    ]);
  });

  it('drops invisible properties', () => {
    const groups = groupProperties([
      prop({ id: 'shown' }),
      prop({ id: 'hidden', visible: false }),
    ]);
    expect(groups[0].members.map((m) => m.property.id)).toEqual(['shown']);
  });
});
