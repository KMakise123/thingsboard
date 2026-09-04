/**
 * Entity-level top-field passthrough (wave-3 D data-loss fix, coordinator
 * finding: "保存丢 description/tags/image 不是留观项，是缺陷"). The draft
 * shape has no fields for description / tags / image / deprecated / scada /
 * unknown future entity keys — they are captured on load into
 * `entityPassthrough` and re-merged verbatim into the POST body, so an
 * editor save can no longer wipe fields set outside the editor.
 *
 * Field rule pinned here:
 *   - captured by the draft fields: id / fqn / name / version / descriptor;
 *   - STRIPPED (server-owned or export-only, never re-posted):
 *     createdTime / tenantId / customerId / externalId / top-level
 *     resources;
 *   - everything else: entityPassthrough, re-merged on save with the known
 *     fields always winning.
 */
import { describe, expect, it } from 'vitest';
import { EntityType } from '@/types/tb/entity';
import type { WidgetTypeDetails } from '@/types/tb/widget-type';

import { draftToWidgetType, widgetTypeToDraft } from './draft-convert';

function detailsWithExtraFields(): WidgetTypeDetails {
  return {
    id: { entityType: EntityType.WIDGET_TYPE, id: 'wt-1' },
    createdTime: 1720000000000,
    tenantId: { entityType: EntityType.TENANT, id: 'tenant-1' },
    fqn: 'my_card',
    name: 'My card',
    version: 7,
    description: 'Set outside the editor',
    tags: ['promo', 'cards'],
    image: 'data:image/png;base64,AAAA',
    deprecated: false,
    scada: false,
    customerId: { entityType: EntityType.CUSTOMER, id: 'c-1' },
    externalId: { entityType: EntityType.WIDGET_TYPE, id: 'ext-1' },
    resources: [{ link: '/api/resource/x', data: 'base64' }],
    descriptor: {
      runtime: 'react-1',
      schemaVersion: 1,
      source: { tsx: 'export default () => <div />' },
      type: 'latest',
      sizeX: 6,
      sizeY: 4,
      customFutureKey: { nested: true },
    },
  };
}

describe('widgetTypeToDraft — capture rules', () => {
  it('captures unknown entity keys into entityPassthrough', () => {
    const doc = widgetTypeToDraft(detailsWithExtraFields());
    expect(doc.entityPassthrough).toEqual({
      description: 'Set outside the editor',
      tags: ['promo', 'cards'],
      image: 'data:image/png;base64,AAAA',
      deprecated: false,
      scada: false,
    });
  });

  it('strips server-owned / export-only fields (never re-posted)', () => {
    const doc = widgetTypeToDraft(detailsWithExtraFields());
    for (const field of [
      'createdTime',
      'tenantId',
      'customerId',
      'externalId',
      'resources',
    ]) {
      expect(doc.entityPassthrough?.[field]).toBeUndefined();
    }
  });

  it('an entity with no extra fields yields an empty passthrough', () => {
    const doc = widgetTypeToDraft({
      id: { entityType: EntityType.WIDGET_TYPE, id: 'wt-2' },
      fqn: 'plain',
      name: 'Plain',
      version: 1,
      descriptor: {},
    });
    expect(doc.entityPassthrough).toEqual({});
  });
});

describe('draftToWidgetType — re-merge rules', () => {
  it('the load→save round trip preserves the extra entity fields', () => {
    const loaded = detailsWithExtraFields();
    const outgoing = draftToWidgetType(widgetTypeToDraft(loaded));
    expect(outgoing.description).toBe('Set outside the editor');
    expect(outgoing.tags).toEqual(['promo', 'cards']);
    expect(outgoing.image).toBe('data:image/png;base64,AAAA');
    expect(outgoing.deprecated).toBe(false);
    expect(outgoing.scada).toBe(false);
    // descriptor layer still round-trips untouched
    expect(outgoing.descriptor?.customFutureKey).toEqual({ nested: true });
  });

  it('stripped fields never come back into the POST body', () => {
    const outgoing = draftToWidgetType(
      widgetTypeToDraft(detailsWithExtraFields()),
    );
    for (const field of [
      'createdTime',
      'tenantId',
      'customerId',
      'externalId',
      'resources',
    ]) {
      expect(outgoing[field]).toBeUndefined();
    }
  });

  it('the known fields always win over a polluted passthrough', () => {
    const doc = widgetTypeToDraft(detailsWithExtraFields());
    doc.entityPassthrough = {
      ...doc.entityPassthrough,
      // a polluted passthrough must not be able to override the draft
      name: 'Hijacked',
      version: 999,
      fqn: 'hijacked_fqn',
      descriptor: { runtime: 'react-1', source: { tsx: 'evil' } },
      id: { entityType: EntityType.WIDGET_TYPE, id: 'hijacked' },
    };
    const outgoing = draftToWidgetType(doc);
    expect(outgoing.name).toBe('My card');
    expect(outgoing.version).toBe(7);
    expect(outgoing.fqn).toBe('my_card');
    expect(outgoing.id?.id).toBe('wt-1');
    expect(outgoing.descriptor?.source?.tsx).toContain('export default');
  });

  it('a hand-written doc without entityPassthrough (optional field) still posts', () => {
    const doc = widgetTypeToDraft(detailsWithExtraFields());
    delete doc.entityPassthrough;
    const outgoing = draftToWidgetType(doc);
    expect(outgoing.name).toBe('My card');
    expect(outgoing.description).toBeUndefined();
  });
});
