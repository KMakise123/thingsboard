/**
 * Recipient (notification target) form logic — the pure half of
 * recipient-dialog (M12 wave 3-A, spec §4.4).
 *
 * Mirrors ui-ngx recipient-notification-dialog.component.ts: the Angular
 * enable/disable dance collapses to "only the active usersFilter variant
 * contributes payload fields" (Angular's `form.value` skips disabled
 * controls, so a switched-away variant's fields never reach the wire).
 *
 * Role narrowing follows ui-ngx allowNotificationTargetConfigTypes: SYS_ADMIN
 * picks from 4 variants (ALL_USERS / TENANT_ADMINISTRATORS /
 * AFFECTED_TENANT_ADMINISTRATORS / SYSTEM_ADMINISTRATORS), TENANT_ADMIN from
 * the other 6. Divergence note: the task brief's "8 variants, last 2 SYS-only"
 * would leave SYS + USER_LIST without a data source — GET /api/users is
 * TENANT_ADMIN/CUSTOMER_USER only (UserController:276), so SYS hides the
 * id/list variants exactly like ui-ngx.
 */
import {
  type NotificationTarget,
  type NotificationTargetConfig,
  NotificationTargetType,
  type SlackConversation,
  SlackConversationType,
  type UsersFilter,
  UsersFilterType,
} from '@/types/tb/notification';

export type RecipientAuthority = 'SYS_ADMIN' | 'TENANT_ADMIN' | 'CUSTOMER_USER';

/** usersFilter variants visible to SYS_ADMIN (ui-ngx ts:520-534 block). */
export const SYS_USER_FILTER_TYPES: Array<UsersFilterType> = [
  UsersFilterType.ALL_USERS,
  UsersFilterType.TENANT_ADMINISTRATORS,
  UsersFilterType.AFFECTED_TENANT_ADMINISTRATORS,
  UsersFilterType.SYSTEM_ADMINISTRATORS,
];

/** usersFilter variants visible to TENANT_ADMIN (recipients page is SA/TA). */
export const TENANT_USER_FILTER_TYPES: Array<UsersFilterType> = [
  UsersFilterType.ALL_USERS,
  UsersFilterType.TENANT_ADMINISTRATORS,
  UsersFilterType.CUSTOMER_USERS,
  UsersFilterType.USER_LIST,
  UsersFilterType.ORIGINATOR_ENTITY_OWNER_USERS,
  UsersFilterType.AFFECTED_USER,
];

export function userFilterTypesFor(
  authority: RecipientAuthority,
): Array<UsersFilterType> {
  return authority === 'SYS_ADMIN'
    ? SYS_USER_FILTER_TYPES
    : TENANT_USER_FILTER_TYPES;
}

/** Flat antd-Form shape of the dialog (one field per wire field). */
export interface RecipientFormValues {
  name: string;
  targetType: NotificationTargetType;
  /** PLATFORM_USERS: the active usersFilter variant. */
  usersFilterType: UsersFilterType;
  /** SYS + TENANT_ADMINISTRATORS: tenants (true) vs tenant profiles. */
  filterByTenants: boolean;
  tenantsIds?: Array<string>;
  tenantProfilesIds?: Array<string>;
  customerId?: string;
  usersIds?: Array<string>;
  conversationType: SlackConversationType;
  /** Slack conversation picked by id; the object resolves at submit time. */
  conversationId?: string;
  useOldApi: boolean;
  webhookUrl?: string;
  channelName?: string;
  description?: string;
}

export function emptyRecipientFormValues(): RecipientFormValues {
  return {
    name: '',
    targetType: NotificationTargetType.PLATFORM_USERS,
    usersFilterType: UsersFilterType.ALL_USERS,
    filterByTenants: true,
    conversationType: SlackConversationType.PUBLIC_CHANNEL,
    useOldApi: false,
  };
}

/**
 * Existing target -> form values (edit prefill). Mirrors the ngx patchValue
 * block: filterByTenants derives from "no tenantProfilesIds array" and a
 * TEAMS target without useOldApi on the wire is legacy (true).
 */
export function targetToFormValues(
  target: NotificationTarget,
): RecipientFormValues {
  const config = target.configuration;
  const base = emptyRecipientFormValues();
  const values: RecipientFormValues = {
    ...base,
    name: target.name ?? '',
    targetType: config.type,
    description: config.description,
  };
  if (config.type === NotificationTargetType.PLATFORM_USERS) {
    const filter = config.usersFilter;
    values.usersFilterType = filter.type;
    values.tenantsIds = [];
    values.tenantProfilesIds = [];
    values.usersIds = [];
    // Narrow per variant: the union only exposes each array on its own type.
    if (filter.type === UsersFilterType.TENANT_ADMINISTRATORS) {
      values.tenantsIds = filter.tenantsIds ?? [];
      values.tenantProfilesIds = filter.tenantProfilesIds ?? [];
      // ngx: filterByTenants = !Array.isArray(target...tenantProfilesIds)
      values.filterByTenants = !filter.tenantProfilesIds?.length;
    } else if (filter.type === UsersFilterType.CUSTOMER_USERS) {
      values.customerId = filter.customerId;
    } else if (filter.type === UsersFilterType.USER_LIST) {
      values.usersIds = filter.usersIds ?? [];
    }
  } else if (config.type === NotificationTargetType.SLACK) {
    values.conversationType = config.conversationType ?? base.conversationType;
    values.conversationId = config.conversation.id;
  } else {
    // ngx: undefined useOldApi on an existing TEAMS target = legacy API.
    values.useOldApi = config.useOldApi ?? true;
    values.webhookUrl = config.webhookUrl;
    values.channelName = config.channelName;
  }
  return values;
}

export interface FormValuesToTargetOptions {
  /** Edit mode source — id/createdTime/tenantId ride through. */
  existing?: NotificationTarget | null;
  /** Full Slack conversation resolved from the dialog's fetched list. */
  conversation?: SlackConversation | null;
  isSysAdmin: boolean;
}

/** Form values -> saveNotificationTarget payload (create or update). */
export function formValuesToTarget(
  values: RecipientFormValues,
  options: FormValuesToTargetOptions,
): NotificationTarget {
  const name = values.name.trim();
  const configuration = buildConfiguration(values, options);
  // Edit keeps identity (id/createdTime/tenantId/externalId); create starts
  // bare — the server generates id/createdTime, and the service layer's
  // NotificationTarget signature merely over-declares them as required.
  return options.existing
    ? { ...options.existing, name, configuration }
    : ({ name, configuration } as NotificationTarget);
}

function buildConfiguration(
  values: RecipientFormValues,
  options: FormValuesToTargetOptions,
): NotificationTargetConfig {
  const description = values.description?.trim() || undefined;
  switch (values.targetType) {
    case NotificationTargetType.PLATFORM_USERS:
      return {
        type: NotificationTargetType.PLATFORM_USERS,
        usersFilter: buildUsersFilter(values, options.isSysAdmin),
        description,
      };
    case NotificationTargetType.SLACK:
      return {
        type: NotificationTargetType.SLACK,
        conversationType: values.conversationType,
        conversation: options.conversation as SlackConversation,
        description,
      };
    case NotificationTargetType.MICROSOFT_TEAMS:
      return {
        type: NotificationTargetType.MICROSOFT_TEAMS,
        useOldApi: values.useOldApi,
        webhookUrl: (values.webhookUrl ?? '').trim(),
        channelName: (values.channelName ?? '').trim(),
        description,
      };
  }
}

function buildUsersFilter(
  values: RecipientFormValues,
  isSysAdmin: boolean,
): UsersFilter {
  switch (values.usersFilterType) {
    case UsersFilterType.USER_LIST:
      return {
        type: UsersFilterType.USER_LIST,
        usersIds: values.usersIds ?? [],
      };
    case UsersFilterType.CUSTOMER_USERS:
      return {
        type: UsersFilterType.CUSTOMER_USERS,
        customerId: values.customerId as string,
      };
    case UsersFilterType.TENANT_ADMINISTRATORS: {
      if (!isSysAdmin) {
        // Tenant scope is fixed server-side; the arrays never leave the UI.
        return { type: UsersFilterType.TENANT_ADMINISTRATORS };
      }
      return values.filterByTenants
        ? {
            type: UsersFilterType.TENANT_ADMINISTRATORS,
            tenantsIds: nonEmpty(values.tenantsIds),
          }
        : {
            type: UsersFilterType.TENANT_ADMINISTRATORS,
            tenantProfilesIds: nonEmpty(values.tenantProfilesIds),
          };
    }
    case UsersFilterType.ALL_USERS:
      return { type: UsersFilterType.ALL_USERS };
    case UsersFilterType.ORIGINATOR_ENTITY_OWNER_USERS:
      return { type: UsersFilterType.ORIGINATOR_ENTITY_OWNER_USERS };
    case UsersFilterType.AFFECTED_USER:
      return { type: UsersFilterType.AFFECTED_USER };
    case UsersFilterType.SYSTEM_ADMINISTRATORS:
      return { type: UsersFilterType.SYSTEM_ADMINISTRATORS };
    case UsersFilterType.AFFECTED_TENANT_ADMINISTRATORS:
      return { type: UsersFilterType.AFFECTED_TENANT_ADMINISTRATORS };
  }
}

/** Empty selection = unset on the wire (server treats it as "all"). */
function nonEmpty(ids?: Array<string>): Array<string> | undefined {
  return ids && ids.length > 0 ? ids : undefined;
}
