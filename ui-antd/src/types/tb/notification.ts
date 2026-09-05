/**
 * Notification family (M12) — handwritten authoritative types.
 *
 * Base: org.thingsboard.server.common.data.notification.** backend DTOs,
 * cross-checked against the openapi snapshot (src/types/tb/openapi, which is
 * reference-only) and the ui-ngx shared/models/notification.models.ts surface.
 *
 * Polymorphic payloads are discriminated unions keyed by the discriminator
 * the backend echoes back on the wire:
 *   - NotificationRuleTriggerConfig.triggerType (14 variants)
 *   - NotificationRuleRecipientsConfig.triggerType (default vs escalated)
 *   - NotificationTargetConfig.type (3 variants)
 *   - UsersFilter.type (8 variants)
 *   - DeliveryMethodNotificationTemplate.method (6 variants)
 *
 * TB conventions as everywhere in src/types/tb: `id` is `{ entityType, id }`
 * (EntityIdOf), timestamps are ms-since-epoch numbers, page indexes 0-based.
 *
 * Naming note: the inbox entry is `TbNotification` (not `Notification`) so it
 * never shadows the DOM global of the same name at use sites.
 */

import type { AlarmSeverity } from './alarm';
import type { BaseData, EntityId, EntityIdOf, EntityType } from './entity';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** 17 kinds (backend NotificationType); drives template + bell icon pick. */
export enum NotificationType {
  GENERAL = 'GENERAL',
  ALARM = 'ALARM',
  DEVICE_ACTIVITY = 'DEVICE_ACTIVITY',
  ENTITY_ACTION = 'ENTITY_ACTION',
  ALARM_COMMENT = 'ALARM_COMMENT',
  RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT = 'RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT',
  ALARM_ASSIGNMENT = 'ALARM_ASSIGNMENT',
  NEW_PLATFORM_VERSION = 'NEW_PLATFORM_VERSION',
  ENTITIES_LIMIT = 'ENTITIES_LIMIT',
  ENTITIES_LIMIT_INCREASE_REQUEST = 'ENTITIES_LIMIT_INCREASE_REQUEST',
  API_USAGE_LIMIT = 'API_USAGE_LIMIT',
  RULE_NODE = 'RULE_NODE',
  RATE_LIMITS = 'RATE_LIMITS',
  EDGE_CONNECTION = 'EDGE_CONNECTION',
  EDGE_COMMUNICATION_FAILURE = 'EDGE_COMMUNICATION_FAILURE',
  TASK_PROCESSING_FAILURE = 'TASK_PROCESSING_FAILURE',
  RESOURCES_SHORTAGE = 'RESOURCES_SHORTAGE',
}

/** The 6 delivery channels. */
export enum NotificationDeliveryMethod {
  WEB = 'WEB',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  SLACK = 'SLACK',
  MICROSOFT_TEAMS = 'MICROSOFT_TEAMS',
  MOBILE_APP = 'MOBILE_APP',
}

/** 14 rule triggers; the first 8 are tenant-level, the last 6 sysadmin-only. */
export enum NotificationRuleTriggerType {
  ENTITY_ACTION = 'ENTITY_ACTION',
  ALARM = 'ALARM',
  ALARM_COMMENT = 'ALARM_COMMENT',
  ALARM_ASSIGNMENT = 'ALARM_ASSIGNMENT',
  DEVICE_ACTIVITY = 'DEVICE_ACTIVITY',
  RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT = 'RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT',
  EDGE_CONNECTION = 'EDGE_CONNECTION',
  EDGE_COMMUNICATION_FAILURE = 'EDGE_COMMUNICATION_FAILURE',
  NEW_PLATFORM_VERSION = 'NEW_PLATFORM_VERSION',
  ENTITIES_LIMIT = 'ENTITIES_LIMIT',
  API_USAGE_LIMIT = 'API_USAGE_LIMIT',
  RATE_LIMITS = 'RATE_LIMITS',
  TASK_PROCESSING_FAILURE = 'TASK_PROCESSING_FAILURE',
  RESOURCES_SHORTAGE = 'RESOURCES_SHORTAGE',
}

/** Inbox entry lifecycle: SENT until the recipient reads it. */
export enum NotificationStatus {
  SENT = 'SENT',
  READ = 'READ',
}

export enum NotificationRequestStatus {
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
  SCHEDULED = 'SCHEDULED',
}

/** The 3 target kinds; each maps to a fixed channel set (PLATFORM_USERS → WEB/EMAIL/SMS/MOBILE_APP). */
export enum NotificationTargetType {
  PLATFORM_USERS = 'PLATFORM_USERS',
  SLACK = 'SLACK',
  MICROSOFT_TEAMS = 'MICROSOFT_TEAMS',
}

export enum SlackConversationType {
  DIRECT = 'DIRECT',
  PUBLIC_CHANNEL = 'PUBLIC_CHANNEL',
  PRIVATE_CHANNEL = 'PRIVATE_CHANNEL',
}

/** Discriminator of the UsersFilter union. */
export enum UsersFilterType {
  USER_LIST = 'USER_LIST',
  CUSTOMER_USERS = 'CUSTOMER_USERS',
  TENANT_ADMINISTRATORS = 'TENANT_ADMINISTRATORS',
  AFFECTED_TENANT_ADMINISTRATORS = 'AFFECTED_TENANT_ADMINISTRATORS',
  SYSTEM_ADMINISTRATORS = 'SYSTEM_ADMINISTRATORS',
  ALL_USERS = 'ALL_USERS',
  ORIGINATOR_ENTITY_OWNER_USERS = 'ORIGINATOR_ENTITY_OWNER_USERS',
  AFFECTED_USER = 'AFFECTED_USER',
}

/**
 * Alarm search status — the coarse ANY/ACTIVE/CLEARED/ACK/UNACK facet used by
 * rule trigger configs. Deliberately NOT the composed `AlarmStatus` from
 * ./alarm (ACTIVE_UNACK…) which is a different wire field.
 */
export enum AlarmSearchStatus {
  ANY = 'ANY',
  ACTIVE = 'ACTIVE',
  CLEARED = 'CLEARED',
  ACK = 'ACK',
  UNACK = 'UNACK',
}

/**
 * Alarm rule actions (backend: nested in AlarmNotificationRuleTriggerConfig).
 * `AlarmSeverity` is REUSED from ./alarm — the wire enum is the same.
 */
export enum AlarmAction {
  CREATED = 'CREATED',
  SEVERITY_CHANGED = 'SEVERITY_CHANGED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  CLEARED = 'CLEARED',
}

/** ALARM_ASSIGNMENT trigger events. */
export enum AlarmAssignmentAction {
  ASSIGNED = 'ASSIGNED',
  UNASSIGNED = 'UNASSIGNED',
}

/** DEVICE_ACTIVITY trigger events. */
export enum DeviceActivityEvent {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/** EDGE_CONNECTION trigger events. */
export enum EdgeConnectivityEvent {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
}

/**
 * RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT trigger events — the wire enum is the
 * platform ComponentLifecycleEvent, narrowed by the trigger docs to these 3.
 */
export enum RuleEngineLifecycleEvent {
  STARTED = 'STARTED',
  UPDATED = 'UPDATED',
  STOPPED = 'STOPPED',
}

/** API_USAGE_LIMIT trigger features. */
export enum ApiFeature {
  TRANSPORT = 'TRANSPORT',
  DB = 'DB',
  RE = 'RE',
  JS = 'JS',
  TBEL = 'TBEL',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  ALARM = 'ALARM',
}

export enum ApiUsageStateValue {
  ENABLED = 'ENABLED',
  WARNING = 'WARNING',
  DISABLED = 'DISABLED',
}

/** RATE_LIMITS trigger APIs (backend LimitedApi, full list). */
export enum LimitedApi {
  ENTITY_EXPORT = 'ENTITY_EXPORT',
  ENTITY_IMPORT = 'ENTITY_IMPORT',
  NOTIFICATION_REQUESTS = 'NOTIFICATION_REQUESTS',
  NOTIFICATION_REQUESTS_PER_RULE = 'NOTIFICATION_REQUESTS_PER_RULE',
  REST_REQUESTS_PER_TENANT = 'REST_REQUESTS_PER_TENANT',
  REST_REQUESTS_PER_CUSTOMER = 'REST_REQUESTS_PER_CUSTOMER',
  WS_UPDATES_PER_SESSION = 'WS_UPDATES_PER_SESSION',
  CASSANDRA_WRITE_QUERIES_CORE = 'CASSANDRA_WRITE_QUERIES_CORE',
  CASSANDRA_READ_QUERIES_CORE = 'CASSANDRA_READ_QUERIES_CORE',
  CASSANDRA_WRITE_QUERIES_RULE_ENGINE = 'CASSANDRA_WRITE_QUERIES_RULE_ENGINE',
  CASSANDRA_READ_QUERIES_RULE_ENGINE = 'CASSANDRA_READ_QUERIES_RULE_ENGINE',
  CASSANDRA_READ_QUERIES_MONOLITH = 'CASSANDRA_READ_QUERIES_MONOLITH',
  CASSANDRA_WRITE_QUERIES_MONOLITH = 'CASSANDRA_WRITE_QUERIES_MONOLITH',
  CASSANDRA_QUERIES = 'CASSANDRA_QUERIES',
  EDGE_EVENTS = 'EDGE_EVENTS',
  EDGE_EVENTS_PER_EDGE = 'EDGE_EVENTS_PER_EDGE',
  EDGE_UPLINK_MESSAGES = 'EDGE_UPLINK_MESSAGES',
  EDGE_UPLINK_MESSAGES_PER_EDGE = 'EDGE_UPLINK_MESSAGES_PER_EDGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  TWO_FA_VERIFICATION_CODE_SEND = 'TWO_FA_VERIFICATION_CODE_SEND',
  TWO_FA_VERIFICATION_CODE_CHECK = 'TWO_FA_VERIFICATION_CODE_CHECK',
  TRANSPORT_MESSAGES_PER_TENANT = 'TRANSPORT_MESSAGES_PER_TENANT',
  TRANSPORT_MESSAGES_PER_DEVICE = 'TRANSPORT_MESSAGES_PER_DEVICE',
  TRANSPORT_MESSAGES_PER_GATEWAY = 'TRANSPORT_MESSAGES_PER_GATEWAY',
  TRANSPORT_MESSAGES_PER_GATEWAY_DEVICE = 'TRANSPORT_MESSAGES_PER_GATEWAY_DEVICE',
  EMAILS = 'EMAILS',
  WS_SUBSCRIPTIONS = 'WS_SUBSCRIPTIONS',
  CALCULATED_FIELD_DEBUG_EVENTS = 'CALCULATED_FIELD_DEBUG_EVENTS',
}

// ---------------------------------------------------------------------------
// Inbox entry (Notification) + per-type payload
// ---------------------------------------------------------------------------

/**
 * The inbox entry. `additionalConfig` rides as JsonNode on the wire; the
 * known shape (web icon / action button) is typed for convenience and unknown
 * keys survive untouched.
 */
export interface TbNotification
  extends BaseData<EntityIdOf<EntityType.NOTIFICATION>> {
  requestId?: EntityIdOf<EntityType.NOTIFICATION_REQUEST>;
  recipientId?: EntityIdOf<EntityType.USER>;
  type?: NotificationType;
  deliveryMethod?: NotificationDeliveryMethod;
  subject?: string;
  text?: string;
  additionalConfig?: WebTemplateAdditionalConfig;
  info?: NotificationInfo;
  status?: NotificationStatus;
}

/**
 * Per-type payload of a notification. Only `type` + dashboard anchor are
 * common; every concrete type adds its own fields (alarmId, alarmSeverity,
 * entityId, …) which pass through as extra JSON keys.
 */
export interface NotificationInfo {
  type: string;
  /** Entity a DASHBOARD link action should resolve state against. */
  stateEntityId?: EntityId;
  dashboardId?: EntityIdOf<EntityType.DASHBOARD>;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Notification requests (send wizard + sent list)
// ---------------------------------------------------------------------------

export interface NotificationRequestConfig {
  /** Delivery delay in seconds (server cap 604800 = 7 days). */
  sendingDelayInSec?: number;
}

export interface NotificationRequestStats {
  sent?: Partial<Record<NotificationDeliveryMethod, number>>;
  /** Per method: recipient title → error message. */
  errors?: Partial<Record<NotificationDeliveryMethod, Record<string, string>>>;
  totalErrors?: number;
  error?: string;
}

/**
 * A send request. `targets` are bare target UUIDs; `templateId` OR `template`
 * must be set (server rejects both missing). On POST the server forces
 * id=null and ignores info/ruleId/status/stats/originatorEntityId.
 */
export interface NotificationRequest
  extends BaseData<EntityIdOf<EntityType.NOTIFICATION_REQUEST>> {
  tenantId?: EntityIdOf<EntityType.TENANT>;
  targets: Array<string>;
  templateId?: EntityIdOf<EntityType.NOTIFICATION_TEMPLATE>;
  template?: NotificationTemplate;
  info?: NotificationInfo;
  additionalConfig?: NotificationRequestConfig;
  originatorEntityId?: EntityId;
  ruleId?: EntityIdOf<EntityType.NOTIFICATION_RULE>;
  status?: NotificationRequestStatus;
  stats?: NotificationRequestStats;
}

/** NotificationRequest + list enrichment (template name, delivery methods). */
export interface NotificationRequestInfo extends NotificationRequest {
  templateName?: string;
  deliveryMethods?: Array<NotificationDeliveryMethod>;
}

/** POST /notification/request/preview answer. */
export interface NotificationRequestPreview {
  processedTemplates?: Partial<
    Record<NotificationDeliveryMethod, DeliveryMethodNotificationTemplate>
  >;
  totalRecipientsCount?: number;
  /** Target UUID → recipient count. */
  recipientsCountByTarget?: Record<string, number>;
  /** First N recipient display names (query recipientsPreviewSize). */
  recipientsPreview?: Array<string>;
}

// ---------------------------------------------------------------------------
// Targets (recipients)
// ---------------------------------------------------------------------------

export interface SlackConversation {
  type: SlackConversationType;
  id: string;
  name: string;
  wholeName?: string;
  email?: string;
}

/** Explicit list of users. */
export interface UserListUsersFilter {
  type: UsersFilterType.USER_LIST;
  usersIds: Array<string>;
}

export interface CustomerUsersFilter {
  type: UsersFilterType.CUSTOMER_USERS;
  customerId: string;
}

/** tenantsIds/tenantProfilesIds: sysadmin may set; tenant must leave empty. */
export interface TenantAdministratorsFilter {
  type: UsersFilterType.TENANT_ADMINISTRATORS;
  tenantsIds?: Array<string>;
  tenantProfilesIds?: Array<string>;
}

export interface AffectedTenantAdministratorsFilter {
  type: UsersFilterType.AFFECTED_TENANT_ADMINISTRATORS;
}

export interface SystemAdministratorsFilter {
  type: UsersFilterType.SYSTEM_ADMINISTRATORS;
}

export interface AllUsersFilter {
  type: UsersFilterType.ALL_USERS;
}

/** Rule-only filters (resolve at trigger time, not savable as fixed lists). */
export interface OriginatorEntityOwnerUsersFilter {
  type: UsersFilterType.ORIGINATOR_ENTITY_OWNER_USERS;
}

export interface AffectedUserFilter {
  type: UsersFilterType.AFFECTED_USER;
}

export type UsersFilter =
  | UserListUsersFilter
  | CustomerUsersFilter
  | TenantAdministratorsFilter
  | AffectedTenantAdministratorsFilter
  | SystemAdministratorsFilter
  | AllUsersFilter
  | OriginatorEntityOwnerUsersFilter
  | AffectedUserFilter;

interface NotificationTargetConfigBase {
  description?: string;
}

export interface PlatformUsersTargetConfig
  extends NotificationTargetConfigBase {
  type: NotificationTargetType.PLATFORM_USERS;
  usersFilter: UsersFilter;
}

export interface SlackTargetConfig extends NotificationTargetConfigBase {
  type: NotificationTargetType.SLACK;
  conversationType?: SlackConversationType;
  conversation: SlackConversation;
}

export interface MicrosoftTeamsTargetConfig
  extends NotificationTargetConfigBase {
  type: NotificationTargetType.MICROSOFT_TEAMS;
  webhookUrl: string;
  channelName: string;
  /** Server default true (legacy connector API). */
  useOldApi?: boolean;
}

export type NotificationTargetConfig =
  | PlatformUsersTargetConfig
  | SlackTargetConfig
  | MicrosoftTeamsTargetConfig;

export interface NotificationTarget
  extends BaseData<EntityIdOf<EntityType.NOTIFICATION_TARGET>> {
  tenantId?: EntityIdOf<EntityType.TENANT>;
  name: string;
  configuration: NotificationTargetConfig;
  externalId?: EntityId;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/** JsonNode passthrough of the WEB template's icon/action-button config. */
export interface WebTemplateAdditionalConfig {
  icon?: {
    enabled?: boolean;
    icon?: string;
    color?: string;
  };
  actionButtonConfig?: {
    enabled?: boolean;
    text?: string;
    link?: string;
  };
}

/** JsonNode passthrough of the MOBILE_APP template's tap action. */
export interface MobileAppTemplateAdditionalConfig {
  onClick?: NotificationButtonConfig;
}

/** Action button (TEAMS `button` / MOBILE `onClick`; WEB uses the flat actionButtonConfig). */
export interface NotificationButtonConfig {
  enabled?: boolean;
  text?: string;
  linkType?: 'LINK' | 'DASHBOARD';
  link?: string;
  dashboardId?: string;
  dashboardState?: string;
  setEntityIdInState?: boolean;
}

/** Common tail of every per-method template (`method` is the discriminator). */
interface DeliveryMethodTemplateBase {
  enabled?: boolean;
  body: string;
}

export interface WebNotificationTemplate extends DeliveryMethodTemplateBase {
  method: NotificationDeliveryMethod.WEB;
  subject?: string;
  additionalConfig?: WebTemplateAdditionalConfig;
}

export interface EmailNotificationTemplate extends DeliveryMethodTemplateBase {
  method: NotificationDeliveryMethod.EMAIL;
  subject?: string;
}

export interface SmsNotificationTemplate extends DeliveryMethodTemplateBase {
  method: NotificationDeliveryMethod.SMS;
}

export interface SlackNotificationTemplate extends DeliveryMethodTemplateBase {
  method: NotificationDeliveryMethod.SLACK;
}

export interface MicrosoftTeamsNotificationTemplate
  extends DeliveryMethodTemplateBase {
  method: NotificationDeliveryMethod.MICROSOFT_TEAMS;
  subject?: string;
  themeColor?: string;
  button?: NotificationButtonConfig;
}

export interface MobileAppNotificationTemplate
  extends DeliveryMethodTemplateBase {
  method: NotificationDeliveryMethod.MOBILE_APP;
  subject?: string;
  additionalConfig?: MobileAppTemplateAdditionalConfig;
}

export type DeliveryMethodNotificationTemplate =
  | WebNotificationTemplate
  | EmailNotificationTemplate
  | SmsNotificationTemplate
  | SlackNotificationTemplate
  | MicrosoftTeamsNotificationTemplate
  | MobileAppNotificationTemplate;

export interface NotificationTemplateConfig {
  /** At least one method required by the server; unlisted methods absent. */
  deliveryMethodsTemplates: Partial<
    Record<NotificationDeliveryMethod, DeliveryMethodNotificationTemplate>
  >;
}

export interface NotificationTemplate
  extends BaseData<EntityIdOf<EntityType.NOTIFICATION_TEMPLATE>> {
  tenantId?: EntityIdOf<EntityType.TENANT>;
  name: string;
  notificationType: NotificationType;
  configuration: NotificationTemplateConfig;
  externalId?: EntityId;
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export interface NotificationRuleConfig {
  description?: string;
}

// --- trigger configs (14 variants, discriminator `triggerType`) -----------

export interface EntityActionTriggerConfig {
  triggerType: NotificationRuleTriggerType.ENTITY_ACTION;
  entityTypes?: Array<EntityType>;
  created?: boolean;
  updated?: boolean;
  deleted?: boolean;
}

export interface AlarmTriggerConfig {
  triggerType: NotificationRuleTriggerType.ALARM;
  alarmTypes?: Array<string>;
  alarmSeverities?: Array<AlarmSeverity>;
  notifyOn: Array<AlarmAction>;
  clearRule?: {
    alarmStatuses?: Array<AlarmSearchStatus>;
  };
}

export interface AlarmCommentTriggerConfig {
  triggerType: NotificationRuleTriggerType.ALARM_COMMENT;
  alarmTypes?: Array<string>;
  alarmSeverities?: Array<AlarmSeverity>;
  alarmStatuses?: Array<AlarmSearchStatus>;
  onlyUserComments?: boolean;
  notifyOnCommentUpdate?: boolean;
}

export interface AlarmAssignmentTriggerConfig {
  triggerType: NotificationRuleTriggerType.ALARM_ASSIGNMENT;
  alarmTypes?: Array<string>;
  alarmSeverities?: Array<AlarmSeverity>;
  alarmStatuses?: Array<AlarmSearchStatus>;
  notifyOn: Array<AlarmAssignmentAction>;
}

/** Exactly one of devices / deviceProfiles is set. */
export interface DeviceActivityTriggerConfig {
  triggerType: NotificationRuleTriggerType.DEVICE_ACTIVITY;
  devices?: Array<string>;
  deviceProfiles?: Array<string>;
  notifyOn: Array<DeviceActivityEvent>;
}

/** Empty ruleChains = all rule chains. */
export interface RuleEngineComponentLifecycleEventTriggerConfig {
  triggerType: NotificationRuleTriggerType.RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT;
  ruleChains?: Array<string>;
  ruleChainEvents?: Array<RuleEngineLifecycleEvent>;
  onlyRuleChainLifecycleFailures?: boolean;
  trackRuleNodeEvents?: boolean;
  ruleNodeEvents?: Array<RuleEngineLifecycleEvent>;
  onlyRuleNodeLifecycleFailures?: boolean;
}

/** Empty edges = all edges. */
export interface EdgeConnectionTriggerConfig {
  triggerType: NotificationRuleTriggerType.EDGE_CONNECTION;
  edges?: Array<string>;
  notifyOn?: Array<EdgeConnectivityEvent>;
}

export interface EdgeCommunicationFailureTriggerConfig {
  triggerType: NotificationRuleTriggerType.EDGE_COMMUNICATION_FAILURE;
  edges?: Array<string>;
}

/** No configuration fields (sysadmin-level). */
export interface NewPlatformVersionTriggerConfig {
  triggerType: NotificationRuleTriggerType.NEW_PLATFORM_VERSION;
}

/** threshold is a fraction (0…1) of the entity limit. */
export interface EntitiesLimitTriggerConfig {
  triggerType: NotificationRuleTriggerType.ENTITIES_LIMIT;
  entityTypes?: Array<EntityType>;
  threshold?: number;
}

export interface ApiUsageLimitTriggerConfig {
  triggerType: NotificationRuleTriggerType.API_USAGE_LIMIT;
  apiFeatures?: Array<ApiFeature>;
  notifyOn?: Array<ApiUsageStateValue>;
}

export interface RateLimitsTriggerConfig {
  triggerType: NotificationRuleTriggerType.RATE_LIMITS;
  apis?: Array<LimitedApi>;
}

/** No configuration fields (sysadmin-level). */
export interface TaskProcessingFailureTriggerConfig {
  triggerType: NotificationRuleTriggerType.TASK_PROCESSING_FAILURE;
}

/** Thresholds are fractions (0…1). */
export interface ResourcesShortageTriggerConfig {
  triggerType: NotificationRuleTriggerType.RESOURCES_SHORTAGE;
  cpuThreshold?: number;
  ramThreshold?: number;
  storageThreshold?: number;
}

export type NotificationRuleTriggerConfig =
  | EntityActionTriggerConfig
  | AlarmTriggerConfig
  | AlarmCommentTriggerConfig
  | AlarmAssignmentTriggerConfig
  | DeviceActivityTriggerConfig
  | RuleEngineComponentLifecycleEventTriggerConfig
  | EdgeConnectionTriggerConfig
  | EdgeCommunicationFailureTriggerConfig
  | NewPlatformVersionTriggerConfig
  | EntitiesLimitTriggerConfig
  | ApiUsageLimitTriggerConfig
  | RateLimitsTriggerConfig
  | TaskProcessingFailureTriggerConfig
  | ResourcesShortageTriggerConfig;

// --- recipients configs (default targets vs ALARM escalation chain) --------

/** Every non-ALARM trigger: a fixed target list. */
export interface DefaultNotificationRuleRecipientsConfig {
  triggerType: Exclude<
    NotificationRuleTriggerType,
    NotificationRuleTriggerType.ALARM
  >;
  targets: Array<string>;
}

/**
 * ALARM trigger escalation chain; keys are delays in SECONDS (JSON object
 * keys are strings on the wire; the server feeds them straight into
 * sendingDelayInSec — DefaultNotificationRuleProcessor), values are bare
 * target UUIDs.
 */
export interface EscalatedNotificationRuleRecipientsConfig {
  triggerType: NotificationRuleTriggerType.ALARM;
  escalationTable: Record<string, Array<string>>;
}

export type NotificationRuleRecipientsConfig =
  | DefaultNotificationRuleRecipientsConfig
  | EscalatedNotificationRuleRecipientsConfig;

/**
 * Server invariant: triggerType === triggerConfig.triggerType ===
 * recipientsConfig.triggerType (enforced by the backend on save).
 */
export interface NotificationRule
  extends BaseData<EntityIdOf<EntityType.NOTIFICATION_RULE>> {
  tenantId?: EntityIdOf<EntityType.TENANT>;
  name: string;
  enabled: boolean;
  templateId: EntityIdOf<EntityType.NOTIFICATION_TEMPLATE>;
  /** Immutable after creation (server rejects changes). */
  triggerType: NotificationRuleTriggerType;
  triggerConfig: NotificationRuleTriggerConfig;
  recipientsConfig: NotificationRuleRecipientsConfig;
  additionalConfig?: NotificationRuleConfig;
  externalId?: EntityId;
}

/** NotificationRule + list enrichment (template name, delivery methods). */
export interface NotificationRuleInfo extends NotificationRule {
  templateName?: string;
  deliveryMethods?: Array<NotificationDeliveryMethod>;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface SlackNotificationSettingsConfig {
  method: NotificationDeliveryMethod.SLACK;
  botToken: string;
}

/** MOBILE_APP credentials can only be saved by the sysadmin. */
export interface MobileAppNotificationSettingsConfig {
  method: NotificationDeliveryMethod.MOBILE_APP;
  firebaseServiceAccountCredentialsFileName?: string;
  firebaseServiceAccountCredentials: string;
}

/** Channels without a concrete config class (WEB/EMAIL/SMS/MICROSOFT_TEAMS). */
export interface DefaultNotificationSettingsConfig {
  method: Exclude<
    NotificationDeliveryMethod,
    NotificationDeliveryMethod.SLACK | NotificationDeliveryMethod.MOBILE_APP
  >;
}

export type NotificationSettingsDeliveryMethodConfig =
  | SlackNotificationSettingsConfig
  | MobileAppNotificationSettingsConfig
  | DefaultNotificationSettingsConfig;

export interface NotificationSettings {
  /** Unconfigured server answers `{}`. */
  deliveryMethodsConfigs: Partial<
    Record<NotificationDeliveryMethod, NotificationSettingsDeliveryMethodConfig>
  >;
}

/** Channels a user can mute per notification type in their preferences. */
export type UserNotificationDeliveryMethod =
  | NotificationDeliveryMethod.WEB
  | NotificationDeliveryMethod.EMAIL
  | NotificationDeliveryMethod.SMS;

export interface NotificationPref {
  enabled?: boolean;
  enabledDeliveryMethods: Partial<
    Record<UserNotificationDeliveryMethod, boolean>
  >;
}

export interface UserNotificationSettings {
  prefs: Partial<Record<NotificationType, NotificationPref>>;
}
