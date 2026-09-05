/**
 * Recipient form-logic unit tests: role-narrowed usersFilter option lists,
 * target <-> form-values conversions and the payload rules pinned against
 * ui-ngx (disabled-variant fields stay off the wire, legacy TEAMS targets
 * default to useOldApi, tenant-scoped TENANT_ADMINISTRATORS carries no id
 * arrays).
 */
import { EntityType } from '@/types/tb';
import {
  type NotificationTarget,
  NotificationTargetType,
  type SlackConversation,
  SlackConversationType,
  type UsersFilter,
  UsersFilterType,
} from '@/types/tb/notification';

import {
  emptyRecipientFormValues,
  formValuesToTarget,
  targetToFormValues,
  userFilterTypesFor,
} from './recipient-target-logic';

const CONVERSATION: SlackConversation = {
  type: SlackConversationType.PUBLIC_CHANNEL,
  id: 'slack-1',
  name: 'alerts',
};

function target(
  configuration: NotificationTarget['configuration'],
): NotificationTarget {
  return {
    id: { entityType: EntityType.NOTIFICATION_TARGET, id: 'target-1' },
    createdTime: 1_700_000_000_000,
    tenantId: { entityType: EntityType.TENANT, id: 'tenant-1' },
    name: 'ops',
    configuration,
  };
}

/** Narrows the union for usersFilter assertions. */
function usersFilterOf(payload: NotificationTarget): UsersFilter | undefined {
  const config = payload.configuration;
  return config.type === NotificationTargetType.PLATFORM_USERS
    ? config.usersFilter
    : undefined;
}

describe('userFilterTypesFor', () => {
  it('narrows SYS_ADMIN to the four platform-scope variants', () => {
    expect(userFilterTypesFor('SYS_ADMIN')).toEqual([
      UsersFilterType.ALL_USERS,
      UsersFilterType.TENANT_ADMINISTRATORS,
      UsersFilterType.AFFECTED_TENANT_ADMINISTRATORS,
      UsersFilterType.SYSTEM_ADMINISTRATORS,
    ]);
  });

  it('gives TENANT_ADMIN the six tenant-scope variants without the SYS-only ones', () => {
    expect(userFilterTypesFor('TENANT_ADMIN')).toEqual([
      UsersFilterType.ALL_USERS,
      UsersFilterType.TENANT_ADMINISTRATORS,
      UsersFilterType.CUSTOMER_USERS,
      UsersFilterType.USER_LIST,
      UsersFilterType.ORIGINATOR_ENTITY_OWNER_USERS,
      UsersFilterType.AFFECTED_USER,
    ]);
    expect(userFilterTypesFor('TENANT_ADMIN')).not.toContain(
      UsersFilterType.SYSTEM_ADMINISTRATORS,
    );
  });
});

describe('targetToFormValues', () => {
  it('prefills a PLATFORM_USERS/ALL_USERS target', () => {
    const values = targetToFormValues(
      target({
        type: NotificationTargetType.PLATFORM_USERS,
        usersFilter: { type: UsersFilterType.ALL_USERS },
      }),
    );
    expect(values).toMatchObject({
      name: 'ops',
      targetType: NotificationTargetType.PLATFORM_USERS,
      usersFilterType: UsersFilterType.ALL_USERS,
      filterByTenants: true,
      usersIds: [],
    });
  });

  it('prefills the tenants side when tenantsIds carry the TENANT_ADMINISTRATORS filter', () => {
    const values = targetToFormValues(
      target({
        type: NotificationTargetType.PLATFORM_USERS,
        usersFilter: {
          type: UsersFilterType.TENANT_ADMINISTRATORS,
          tenantsIds: ['t-1'],
        },
      }),
    );
    expect(values.usersFilterType).toBe(UsersFilterType.TENANT_ADMINISTRATORS);
    expect(values.filterByTenants).toBe(true);
    expect(values.tenantsIds).toEqual(['t-1']);
  });

  it('flips to tenant profiles when tenantProfilesIds carry the filter (ngx rule)', () => {
    const values = targetToFormValues(
      target({
        type: NotificationTargetType.PLATFORM_USERS,
        usersFilter: {
          type: UsersFilterType.TENANT_ADMINISTRATORS,
          tenantProfilesIds: ['tp-1'],
        },
      }),
    );
    expect(values.filterByTenants).toBe(false);
    expect(values.tenantProfilesIds).toEqual(['tp-1']);
  });

  it('prefills SLACK and defaults a legacy TEAMS target to the old API', () => {
    expect(
      targetToFormValues(
        target({
          type: NotificationTargetType.SLACK,
          conversationType: SlackConversationType.DIRECT,
          conversation: CONVERSATION,
        }),
      ),
    ).toMatchObject({
      targetType: NotificationTargetType.SLACK,
      conversationType: SlackConversationType.DIRECT,
      conversationId: 'slack-1',
    });
    expect(
      targetToFormValues(
        target({
          type: NotificationTargetType.MICROSOFT_TEAMS,
          webhookUrl: 'https://outlook.office.com/webhook/a',
          channelName: 'General',
        }),
      ),
    ).toMatchObject({ useOldApi: true, channelName: 'General' });
  });
});

describe('formValuesToTarget', () => {
  it('builds a minimal ALL_USERS payload and keeps only the active variant fields', () => {
    const payload = formValuesToTarget(
      {
        ...emptyRecipientFormValues(),
        name: '  everyone  ',
        description: '  all hands  ',
      },
      { isSysAdmin: false },
    );
    expect(payload).toEqual({
      name: 'everyone',
      configuration: {
        type: NotificationTargetType.PLATFORM_USERS,
        usersFilter: { type: UsersFilterType.ALL_USERS },
        description: 'all hands',
      },
    });
  });

  it('maps USER_LIST and CUSTOMER_USERS variants', () => {
    const userList = formValuesToTarget(
      {
        ...emptyRecipientFormValues(),
        name: 'x',
        usersFilterType: UsersFilterType.USER_LIST,
        usersIds: ['u-1', 'u-2'],
      },
      { isSysAdmin: false },
    );
    expect(usersFilterOf(userList)).toEqual({
      type: UsersFilterType.USER_LIST,
      usersIds: ['u-1', 'u-2'],
    });
    const customer = formValuesToTarget(
      {
        ...emptyRecipientFormValues(),
        name: 'x',
        usersFilterType: UsersFilterType.CUSTOMER_USERS,
        customerId: 'c-1',
      },
      { isSysAdmin: false },
    );
    expect(usersFilterOf(customer)).toEqual({
      type: UsersFilterType.CUSTOMER_USERS,
      customerId: 'c-1',
    });
  });

  it('sends tenantsIds or tenantProfilesIds (never both) for a SYS pick', () => {
    const byTenants = formValuesToTarget(
      {
        ...emptyRecipientFormValues(),
        usersFilterType: UsersFilterType.TENANT_ADMINISTRATORS,
        filterByTenants: true,
        tenantsIds: ['t-1'],
        tenantProfilesIds: ['tp-9'],
      },
      { isSysAdmin: true },
    );
    expect(usersFilterOf(byTenants)).toEqual({
      type: UsersFilterType.TENANT_ADMINISTRATORS,
      tenantsIds: ['t-1'],
    });
    const byProfiles = formValuesToTarget(
      { ...byTenantsChildren(), filterByTenants: false, tenantsIds: [] },
      { isSysAdmin: true },
    );
    expect(usersFilterOf(byProfiles)).toEqual({
      type: UsersFilterType.TENANT_ADMINISTRATORS,
      tenantProfilesIds: ['tp-1'],
    });
  });

  it('strips the id arrays when a TENANT_ADMIN saves TENANT_ADMINISTRATORS', () => {
    const payload = formValuesToTarget(
      {
        ...emptyRecipientFormValues(),
        usersFilterType: UsersFilterType.TENANT_ADMINISTRATORS,
        filterByTenants: true,
        tenantsIds: ['t-1'],
      },
      { isSysAdmin: false },
    );
    expect(usersFilterOf(payload)).toEqual({
      type: UsersFilterType.TENANT_ADMINISTRATORS,
    });
  });

  it('drops stale fields when the type switches and carries edit identity through', () => {
    const existing = target({
      type: NotificationTargetType.MICROSOFT_TEAMS,
      webhookUrl: 'https://old',
      channelName: 'General',
      description: 'old',
    });
    const payload = formValuesToTarget(
      {
        ...emptyRecipientFormValues(),
        name: 'slack now',
        targetType: NotificationTargetType.SLACK,
        conversationType: SlackConversationType.PRIVATE_CHANNEL,
        conversationId: 'slack-1',
      },
      { existing, conversation: CONVERSATION, isSysAdmin: true },
    );
    expect(payload.id).toEqual(existing.id);
    expect(payload.tenantId).toEqual(existing.tenantId);
    expect(payload.createdTime).toBe(existing.createdTime);
    expect(payload.configuration).toEqual({
      type: NotificationTargetType.SLACK,
      conversationType: SlackConversationType.PRIVATE_CHANNEL,
      conversation: CONVERSATION,
      description: undefined,
    });
    // The TEAMS fields from the previous configuration must not leak.
    expect('webhookUrl' in payload.configuration).toBe(false);
  });

  it('builds a TEAMS payload with trimmed urls and the new API default', () => {
    const payload = formValuesToTarget(
      {
        ...emptyRecipientFormValues(),
        name: 'teams',
        targetType: NotificationTargetType.MICROSOFT_TEAMS,
        useOldApi: false,
        webhookUrl: ' https://example.office.com/workflow/abc ',
        channelName: ' General ',
      },
      { isSysAdmin: true },
    );
    expect(payload.configuration).toEqual({
      type: NotificationTargetType.MICROSOFT_TEAMS,
      useOldApi: false,
      webhookUrl: 'https://example.office.com/workflow/abc',
      channelName: 'General',
    });
  });
});

function byTenantsChildren() {
  return {
    ...emptyRecipientFormValues(),
    usersFilterType: UsersFilterType.TENANT_ADMINISTRATORS,
    tenantProfilesIds: ['tp-1'],
  };
}
