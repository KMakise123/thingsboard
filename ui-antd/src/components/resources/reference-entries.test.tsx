/**
 * referencesToEntries tests: known types resolve to translated names +
 * in-fork details links; unknown types degrade to the raw wire string;
 * linkless types keep the plain-text slot.
 */
import { describe, expect, it } from 'vitest';

import { EntityType } from '@/types/tb/entity';

import { referencesToEntries } from './reference-entries';

const formatMessage = ({
  id,
  defaultMessage,
}: {
  id: string;
  defaultMessage?: string;
}) => `name:${id}:${defaultMessage ?? ''}`;

describe('referencesToEntries', () => {
  it('resolves known entity types to names, icons and in-fork links', () => {
    const entries = referencesToEntries(
      {
        WIDGET_TYPE: [
          {
            id: { entityType: EntityType.WIDGET_TYPE, id: 'wt-1' },
            name: 'Thermometer',
          },
        ],
        DASHBOARD: [
          {
            id: { entityType: EntityType.DASHBOARD, id: 'dash-1' },
            name: 'Plant A',
          },
        ],
      },
      formatMessage,
    );

    expect(entries).toHaveLength(2);
    const widget = entries.find((entry) => entry.name === 'Thermometer');
    // defaultMessage carries the raw type so a missing key still degrades sanely.
    expect(widget?.typeName).toBe(
      'name:pages.resources.library.entityTypes.WIDGET_TYPE:WIDGET_TYPE',
    );
    expect(widget?.href).toBe('/widgets/editor/wt-1');
    expect(widget?.icon).toBeTruthy();

    const dashboard = entries.find((entry) => entry.name === 'Plant A');
    expect(dashboard?.href).toBe('/dashboards/dash-1');
  });

  it('falls back to the raw type string for unknown or keyless types', () => {
    const entries = referencesToEntries(
      {
        CALCULATED_FIELD: [
          {
            id: { entityType: EntityType.CALCULATED_FIELD, id: 'cf-1' },
            name: 'CF',
          },
        ],
        SOMETHING_NEW: [
          { id: { entityType: 'OTHER' as EntityType, id: 'x-1' } },
        ],
      },
      formatMessage,
    );
    // CALCULATED_FIELD has no name key → raw type, no link (no fork route).
    const cf = entries[0];
    expect(cf.typeName).toBe('CALCULATED_FIELD');
    expect(cf.href).toBeUndefined();
    // Entity without a name degrades to its id, then to the type string.
    expect(entries[1].name).toBe('x-1');
    expect(entries[1].typeName).toBe('SOMETHING_NEW');
  });

  it('keeps the name field when the entity has no linkable route', () => {
    const entries = referencesToEntries(
      {
        RULE_CHAIN: [
          {
            id: { entityType: EntityType.RULE_CHAIN, id: 'rc-1' },
            name: 'Root chain',
          },
        ],
      },
      formatMessage,
    );
    expect(entries[0].href).toBe('/ruleChains/rc-1');
    expect(entries[0].name).toBe('Root chain');
  });
});
