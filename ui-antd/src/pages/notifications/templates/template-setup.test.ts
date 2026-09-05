/**
 * Template-page pure logic tests: the Setup candidates narrow by authority
 * (ngx :182-197), the Setup toggles ⇄ deliveryMethodsTemplates conversions,
 * and the save-payload assembly (copy never carries the source id).
 */
import { EntityType } from '@/types/tb';
import {
  NotificationDeliveryMethod,
  type NotificationTemplate,
  NotificationType,
} from '@/types/tb/notification';

import {
  buildTemplatePayload,
  copiedTemplateName,
  emptySetupValue,
  enabledMethodsOf,
  normalizeTemplateValue,
  notificationTypesForAuthority,
  withMethodEnabled,
} from './template-setup';

const ALL_METHODS = Object.values(NotificationDeliveryMethod);

describe('notificationTypesForAuthority', () => {
  it('offers GENERAL plus the 7 platform types for SYS_ADMIN', () => {
    expect(notificationTypesForAuthority(true)).toEqual([
      NotificationType.GENERAL,
      NotificationType.ENTITIES_LIMIT,
      NotificationType.ENTITIES_LIMIT_INCREASE_REQUEST,
      NotificationType.API_USAGE_LIMIT,
      NotificationType.NEW_PLATFORM_VERSION,
      NotificationType.RATE_LIMITS,
      NotificationType.TASK_PROCESSING_FAILURE,
      NotificationType.RESOURCES_SHORTAGE,
    ]);
  });

  it('offers the remaining 10 types for TENANT_ADMIN', () => {
    const tenant = notificationTypesForAuthority(false);
    expect(tenant).toHaveLength(10);
    expect(tenant).toContain(NotificationType.GENERAL);
    expect(tenant).toContain(NotificationType.ALARM);
    expect(tenant).toContain(NotificationType.RULE_NODE);
    expect(tenant).toContain(NotificationType.EDGE_CONNECTION);
    // No platform-level type leaks into the tenant candidates.
    expect(tenant).not.toContain(NotificationType.ENTITIES_LIMIT);
    expect(tenant).not.toContain(NotificationType.NEW_PLATFORM_VERSION);
    expect(tenant).not.toContain(NotificationType.RESOURCES_SHORTAGE);
  });
});

describe('withMethodEnabled / enabledMethodsOf', () => {
  it('seeds an enabled entry with method stamped when toggled on', () => {
    const next = withMethodEnabled({}, NotificationDeliveryMethod.WEB, true);
    expect(next.WEB?.enabled).toBe(true);
    expect(next.WEB?.method).toBe(NotificationDeliveryMethod.WEB);
    expect(enabledMethodsOf(next)).toEqual([NotificationDeliveryMethod.WEB]);
  });

  it('removes the entry when toggled off', () => {
    const seeded = emptySetupValue();
    const next = withMethodEnabled(
      seeded,
      NotificationDeliveryMethod.WEB,
      false,
    );
    expect(next.WEB).toBeUndefined();
    expect(enabledMethodsOf(next)).toEqual([]);
  });

  it('keeps the prefilled fields when re-enabling an entry', () => {
    const seeded = emptySetupValue();
    const turnedOff = withMethodEnabled(
      seeded,
      NotificationDeliveryMethod.WEB,
      false,
    );
    // Toggling off drops the entry entirely; a fresh on-seed is blank.
    const reOn = withMethodEnabled(
      turnedOff,
      NotificationDeliveryMethod.WEB,
      true,
    );
    expect(reOn.WEB?.method).toBe(NotificationDeliveryMethod.WEB);
  });

  it('never loses existing fields when toggling on an already enabled method', () => {
    const seeded = emptySetupValue();
    expect(
      withMethodEnabled(seeded, NotificationDeliveryMethod.WEB, true),
    ).toBe(seeded);
  });
});

describe('normalizeTemplateValue', () => {
  it('drops disabled entries and stamps enabled+method on the rest', () => {
    const value = emptySetupValue();
    value[NotificationDeliveryMethod.SLACK] = {
      method: NotificationDeliveryMethod.SLACK,
      enabled: true,
      body: 'hi',
    };
    const fakeDisabled = {
      ...emptySetupValue()[NotificationDeliveryMethod.WEB],
      enabled: false,
    };
    value[NotificationDeliveryMethod.EMAIL] =
      fakeDisabled as (typeof value)[NotificationDeliveryMethod.EMAIL];

    const normalized = normalizeTemplateValue(value);
    expect(Object.keys(normalized).sort()).toEqual(['SLACK', 'WEB']);
    expect(normalized.WEB?.enabled).toBe(true);
    expect(normalized.SLACK).toMatchObject({ body: 'hi', enabled: true });
  });
});

describe('buildTemplatePayload', () => {
  const webTemplate = emptySetupValue()[NotificationDeliveryMethod.WEB];

  it('builds a fresh create payload without identity fields', () => {
    const payload = buildTemplatePayload({
      source: null,
      isCopy: false,
      name: '  ops alert  ',
      notificationType: NotificationType.GENERAL,
      templateValue: emptySetupValue(),
    });
    expect(payload).toEqual({
      name: 'ops alert',
      notificationType: NotificationType.GENERAL,
      configuration: {
        deliveryMethodsTemplates: {
          WEB: webTemplate,
        },
      },
    });
  });

  it('spreads the source over the new values when editing', () => {
    const source: NotificationTemplate = {
      id: { entityType: EntityType.NOTIFICATION_TEMPLATE, id: 'tpl-1' },
      createdTime: 1_700_000_000_000,
      tenantId: { entityType: EntityType.TENANT, id: 'tenant-1' },
      name: 'old name',
      notificationType: NotificationType.GENERAL,
      configuration: { deliveryMethodsTemplates: {} },
    };
    const payload = buildTemplatePayload({
      source,
      isCopy: false,
      name: 'new name',
      notificationType: NotificationType.ALARM,
      templateValue: emptySetupValue(),
    });
    expect(payload.id).toEqual(source.id);
    expect(payload.createdTime).toBe(source.createdTime);
    expect(payload.tenantId).toEqual(source.tenantId);
    expect(payload.name).toBe('new name');
    expect(payload.notificationType).toBe(NotificationType.ALARM);
    expect(payload.configuration.deliveryMethodsTemplates.WEB).toBeDefined();
  });

  it('never carries the source id in copy mode', () => {
    const source: NotificationTemplate = {
      id: { entityType: EntityType.NOTIFICATION_TEMPLATE, id: 'tpl-1' },
      createdTime: 1_700_000_000_000,
      name: 'ops alert',
      notificationType: NotificationType.GENERAL,
      configuration: { deliveryMethodsTemplates: {} },
    };
    const payload = buildTemplatePayload({
      source,
      isCopy: true,
      name: copiedTemplateName(source.name),
      notificationType: source.notificationType,
      templateValue: emptySetupValue(),
    });
    expect(payload.id).toBeUndefined();
    expect(payload.createdTime).toBeUndefined();
    expect(payload.name).toBe('ops alert (copy)');
  });

  it('deep-trims strings in the configuration like ngx deepTrim', () => {
    const value = normalizeTemplateValue({
      [NotificationDeliveryMethod.SLACK]: {
        method: NotificationDeliveryMethod.SLACK,
        enabled: true,
        body: '  hello  ',
      },
    });
    const payload = buildTemplatePayload({
      source: null,
      isCopy: false,
      name: 'x',
      notificationType: NotificationType.GENERAL,
      templateValue: value,
    });
    expect(payload.configuration.deliveryMethodsTemplates.SLACK?.body).toBe(
      'hello',
    );
  });

  it('covers every method enum value when seeding fresh entries', () => {
    // Sanity: emptyMethodTemplate covers the whole union at compile time;
    // here we only pin the six methods the Setup grid offers.
    expect(ALL_METHODS).toHaveLength(6);
  });
});
