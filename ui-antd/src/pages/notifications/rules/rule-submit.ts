/**
 * Rule wizard → wire payload assembly (M12 wave 3-B, spec §4.5).
 *
 * Mirrors ui-ngx `add()` (rule-notification-dialog.component.ts:441-467):
 * the active trigger's form values merge into `triggerConfig`, the percent
 * fields divide by 100, DEVICE_ACTIVITY drops its UI-only `filterByDevice`
 * toggle, and `triggerType` is stamped onto rule + triggerConfig +
 * recipientsConfig (the backend's three-way invariant). Editing merges over
 * the loaded rule (keeps id/createdTime); copying starts fresh.
 */
import type { AlarmSeverity } from '@/types/tb/alarm';
import { EntityType } from '@/types/tb/entity';
import type {
  AlarmAction,
  AlarmAssignmentAction,
  AlarmSearchStatus,
  ApiFeature,
  ApiUsageStateValue,
  DeviceActivityEvent,
  EdgeConnectivityEvent,
  LimitedApi,
  NotificationRule,
  NotificationRuleInfo,
  NotificationRuleTriggerConfig,
  RuleEngineLifecycleEvent,
} from '@/types/tb/notification';
import { NotificationRuleTriggerType } from '@/types/tb/notification';

/** Loose bag of every trigger form field (only the active type's are set). */
export interface TriggerFormValues {
  // ALARM / ALARM_COMMENT / ALARM_ASSIGNMENT
  alarmTypes?: Array<string>;
  alarmSeverities?: Array<AlarmSeverity>;
  alarmStatuses?: Array<AlarmSearchStatus>;
  notifyOn?: Array<
    AlarmAction | AlarmAssignmentAction | DeviceActivityEvent | ApiUsageStateValue
  >;
  /** ALARM only — wire path clearRule.alarmStatuses. */
  clearAlarmStatuses?: Array<AlarmSearchStatus>;
  onlyUserComments?: boolean;
  notifyOnCommentUpdate?: boolean;
  // DEVICE_ACTIVITY
  filterByDevice?: boolean;
  devices?: Array<string>;
  deviceProfiles?: Array<string>;
  // ENTITY_ACTION / ENTITIES_LIMIT
  entityTypes?: Array<EntityType>;
  created?: boolean;
  updated?: boolean;
  deleted?: boolean;
  // RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT
  ruleChains?: Array<string>;
  ruleChainEvents?: Array<RuleEngineLifecycleEvent>;
  onlyRuleChainLifecycleFailures?: boolean;
  trackRuleNodeEvents?: boolean;
  ruleNodeEvents?: Array<RuleEngineLifecycleEvent>;
  onlyRuleNodeLifecycleFailures?: boolean;
  // EDGE_CONNECTION / EDGE_COMMUNICATION_FAILURE
  edges?: Array<string>;
  // ENTITIES_LIMIT / RESOURCES_SHORTAGE (UI percent, wire fraction)
  threshold?: number;
  cpuThreshold?: number;
  ramThreshold?: number;
  storageThreshold?: number;
  // API_USAGE_LIMIT / RATE_LIMITS
  apiFeatures?: Array<ApiFeature>;
  apis?: Array<LimitedApi>;
  // every trigger step carries it; lands in additionalConfig
  description?: string;
}

export interface BasicFormValues {
  name: string;
  enabled: boolean;
  triggerType: NotificationRuleTriggerType;
  /** Template UUID; goes on the wire as the full EntityId. */
  templateId: string;
  /** Non-ALARM recipients. */
  targets?: Array<string>;
  /** ALARM escalation chain in wire shape (seconds → target ids). */
  escalations?: Record<string, Array<string>>;
}

function percentToFraction(value: number | undefined): number | undefined {
  return value === undefined ? undefined : value / 100;
}

export function buildTriggerConfig(
  triggerType: NotificationRuleTriggerType,
  values: TriggerFormValues,
): NotificationRuleTriggerConfig {
  switch (triggerType) {
    case NotificationRuleTriggerType.ALARM:
      return {
        triggerType,
        alarmTypes: values.alarmTypes ?? [],
        alarmSeverities: values.alarmSeverities ?? [],
        notifyOn: (values.notifyOn ?? []) as Array<AlarmAction>,
        clearRule: { alarmStatuses: values.clearAlarmStatuses ?? [] },
      };
    case NotificationRuleTriggerType.ALARM_COMMENT:
      return {
        triggerType,
        alarmTypes: values.alarmTypes ?? [],
        alarmSeverities: values.alarmSeverities ?? [],
        alarmStatuses: values.alarmStatuses ?? [],
        onlyUserComments: !!values.onlyUserComments,
        notifyOnCommentUpdate: !!values.notifyOnCommentUpdate,
      };
    case NotificationRuleTriggerType.ALARM_ASSIGNMENT:
      return {
        triggerType,
        alarmTypes: values.alarmTypes ?? [],
        alarmSeverities: values.alarmSeverities ?? [],
        alarmStatuses: values.alarmStatuses ?? [],
        notifyOn: (values.notifyOn ?? []) as Array<AlarmAssignmentAction>,
      };
    case NotificationRuleTriggerType.DEVICE_ACTIVITY: {
      // Exactly one side goes on the wire (ui-ngx deletes filterByDevice :447-449).
      const config: NotificationRuleTriggerConfig = {
        triggerType,
        notifyOn: (values.notifyOn ?? []) as Array<DeviceActivityEvent>,
      };
      if (values.filterByDevice) {
        return { ...config, devices: values.devices ?? [] };
      }
      return { ...config, deviceProfiles: values.deviceProfiles ?? [] };
    }
    case NotificationRuleTriggerType.ENTITY_ACTION:
      return {
        triggerType,
        entityTypes: values.entityTypes ?? [],
        created: !!values.created,
        updated: !!values.updated,
        deleted: !!values.deleted,
      };
    case NotificationRuleTriggerType.RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT:
      return {
        triggerType,
        ruleChains: values.ruleChains ?? [],
        ruleChainEvents: values.ruleChainEvents ?? [],
        onlyRuleChainLifecycleFailures: !!values.onlyRuleChainLifecycleFailures,
        trackRuleNodeEvents: !!values.trackRuleNodeEvents,
        ruleNodeEvents: values.ruleNodeEvents ?? [],
        onlyRuleNodeLifecycleFailures: !!values.onlyRuleNodeLifecycleFailures,
      };
    case NotificationRuleTriggerType.EDGE_CONNECTION:
      return {
        triggerType,
        edges: values.edges ?? [],
        notifyOn: (values.notifyOn as Array<EdgeConnectivityEvent>) ?? [],
      };
    case NotificationRuleTriggerType.EDGE_COMMUNICATION_FAILURE:
      return { triggerType, edges: values.edges ?? [] };
    case NotificationRuleTriggerType.ENTITIES_LIMIT:
      return {
        triggerType,
        entityTypes: values.entityTypes ?? [],
        threshold: percentToFraction(values.threshold),
      };
    case NotificationRuleTriggerType.API_USAGE_LIMIT:
      return {
        triggerType,
        apiFeatures: values.apiFeatures ?? [],
        notifyOn: (values.notifyOn as Array<ApiUsageStateValue>) ?? [],
      };
    case NotificationRuleTriggerType.NEW_PLATFORM_VERSION:
      return { triggerType };
    case NotificationRuleTriggerType.RATE_LIMITS:
      return { triggerType, apis: values.apis ?? [] };
    case NotificationRuleTriggerType.TASK_PROCESSING_FAILURE:
      return { triggerType };
    case NotificationRuleTriggerType.RESOURCES_SHORTAGE:
      return {
        triggerType,
        cpuThreshold: percentToFraction(values.cpuThreshold),
        ramThreshold: percentToFraction(values.ramThreshold),
        storageThreshold: percentToFraction(values.storageThreshold),
      };
  }
}

/** Trigger form prefill from a loaded rule's triggerConfig (edit/copy). */
export function triggerConfigToFormValues(
  triggerType: NotificationRuleTriggerType,
  config: NotificationRuleTriggerConfig | undefined,
): TriggerFormValues {
  const values: TriggerFormValues = { ...(config as TriggerFormValues) };
  if (triggerType === NotificationRuleTriggerType.ALARM && config) {
    values.clearAlarmStatuses =
      (config as { clearRule?: { alarmStatuses?: Array<AlarmSearchStatus> } })
        .clearRule?.alarmStatuses ?? [];
  }
  if (triggerType === NotificationRuleTriggerType.DEVICE_ACTIVITY) {
    values.filterByDevice = !!(config as { devices?: Array<string> })?.devices;
  }
  if (triggerType === NotificationRuleTriggerType.ENTITIES_LIMIT) {
    values.threshold = (values.threshold ?? 0) * 100;
  }
  if (triggerType === NotificationRuleTriggerType.RESOURCES_SHORTAGE) {
    values.cpuThreshold = (values.cpuThreshold ?? 0) * 100;
    values.ramThreshold = (values.ramThreshold ?? 0) * 100;
    values.storageThreshold = (values.storageThreshold ?? 0) * 100;
  }
  delete (values as Partial<TriggerFormValues>).triggerType;
  delete (values as Partial<TriggerFormValues>).clearRule;
  return values;
}

export interface RulePayloadInput {
  basic: BasicFormValues;
  trigger: TriggerFormValues;
  source: NotificationRuleInfo | null;
  /** Copy mode: prefill from source but save as a new rule. */
  isCopy: boolean;
}

export function buildRulePayload(input: RulePayloadInput): NotificationRule {
  const { basic, trigger, source, isCopy } = input;
  const triggerType = basic.triggerType;
  const base: Partial<NotificationRule> =
    source && !isCopy ? { ...source } : {};

  const recipientsConfig: NotificationRule['recipientsConfig'] =
    triggerType === NotificationRuleTriggerType.ALARM
      ? { triggerType, escalationTable: basic.escalations ?? {} }
      : { triggerType, targets: basic.targets ?? [] };

  return {
    ...base,
    name: basic.name.trim(),
    enabled: basic.enabled,
    templateId: {
      entityType: EntityType.NOTIFICATION_TEMPLATE,
      id: basic.templateId,
    },
    triggerType,
    triggerConfig: buildTriggerConfig(triggerType, trigger),
    recipientsConfig,
    additionalConfig: { description: trigger.description ?? '' },
  } as NotificationRule;
}
