/**
 * Static templatization docs for the shared notification message editor —
 * the ${xxx} parameter reference shown in the per-type help dialog.
 *
 * Content is distilled from the upstream help markdown the ui-ngx editor
 * links to by helpId (ui-ngx/src/assets/help/en_US/notification/<type>.md);
 * only the type-specific parameters live here — the recipient_* params and
 * the value modifiers are common to every type and shown in a shared block.
 * Static (non-locale) content by design: parameter names are wire format.
 */
import { NotificationType } from '@/types/tb/notification';

export interface TemplateParamDoc {
  /** Wire parameter name, e.g. `alarmType` (used as ${alarmType}). */
  name: string;
  en: string;
  zh: string;
}

export const COMMON_TEMPLATE_PARAMS: Array<TemplateParamDoc> = [
  {
    name: 'recipientTitle',
    en: 'title of the recipient (first and last name if specified, email otherwise)',
    zh: '收件人名称（有名有姓时为姓名，否则为邮箱）',
  },
  {
    name: 'recipientEmail',
    en: 'email of the recipient',
    zh: '收件人邮箱',
  },
  {
    name: 'recipientFirstName',
    en: 'first name of the recipient',
    zh: '收件人名',
  },
  {
    name: 'recipientLastName',
    en: 'last name of the recipient',
    zh: '收件人姓',
  },
];

export const TEMPLATE_PARAMS_DOC: Record<
  NotificationType,
  Array<TemplateParamDoc>
> = {
  [NotificationType.GENERAL]: [],

  [NotificationType.ALARM]: [
    { name: 'alarmType', en: 'alarm type', zh: '告警类型' },
    {
      name: 'action',
      en: "one of: 'created', 'severity changed', 'acknowledged', 'cleared', 'deleted'",
      zh: "取值：'created'（创建）、'severity changed'（严重级别变更）、'acknowledged'（确认）、'cleared'（清除）、'deleted'（删除）",
    },
    {
      name: 'alarmId',
      en: 'the alarm id as uuid string',
      zh: '告警 ID（UUID 字符串）',
    },
    {
      name: 'alarmSeverity',
      en: 'alarm severity (lower case)',
      zh: '告警严重级别（小写）',
    },
    { name: 'alarmStatus', en: 'the alarm status', zh: '告警状态' },
    {
      name: 'alarmOriginatorEntityType',
      en: "the entity type of the alarm originator, e.g. 'Device'",
      zh: "告警来源实体的类型，如 'Device'",
    },
    {
      name: 'alarmOriginatorName',
      en: "the name of the alarm originator, e.g. 'Sensor T1'",
      zh: "告警来源实体的名称，如 'Sensor T1'",
    },
    {
      name: 'alarmOriginatorLabel',
      en: 'the label of the alarm originator',
      zh: '告警来源实体的标签',
    },
    {
      name: 'alarmOriginatorId',
      en: 'the alarm originator entity id as uuid string',
      zh: '告警来源实体 ID（UUID 字符串）',
    },
    {
      name: 'details.<key>',
      en: "any key field from the alarm's details, e.g. details.data",
      zh: '告警详情中的任意字段，如 details.data',
    },
  ],

  [NotificationType.DEVICE_ACTIVITY]: [
    {
      name: 'deviceId',
      en: 'the device id as uuid string',
      zh: '设备 ID（UUID 字符串）',
    },
    { name: 'deviceName', en: 'the device name', zh: '设备名称' },
    { name: 'deviceLabel', en: 'the device label', zh: '设备标签' },
    { name: 'deviceType', en: 'the device type', zh: '设备类型' },
    {
      name: 'eventType',
      en: "one of: 'inactive', 'active'",
      zh: "取值：'active'（活跃）、'inactive'（失联）",
    },
  ],

  [NotificationType.ENTITY_ACTION]: [
    {
      name: 'entityType',
      en: "the entity type, e.g. 'Device'",
      zh: "实体类型，如 'Device'",
    },
    {
      name: 'entityId',
      en: 'the entity id as uuid string',
      zh: '实体 ID（UUID 字符串）',
    },
    { name: 'entityName', en: 'the name of the entity', zh: '实体名称' },
    {
      name: 'actionType',
      en: "one of: 'added', 'updated', 'deleted'",
      zh: "取值：'added'（新增）、'updated'（更新）、'deleted'（删除）",
    },
    {
      name: 'userId',
      en: 'id of the user who made the action',
      zh: '操作用户的 ID',
    },
    {
      name: 'userTitle',
      en: 'title of the user who made the action',
      zh: '操作用户的名称',
    },
    {
      name: 'userEmail',
      en: 'email of the user who made the action',
      zh: '操作用户的邮箱',
    },
    {
      name: 'userFirstName',
      en: 'first name of the user who made the action',
      zh: '操作用户的名',
    },
    {
      name: 'userLastName',
      en: 'last name of the user who made the action',
      zh: '操作用户的姓',
    },
  ],

  [NotificationType.ALARM_COMMENT]: [
    { name: 'alarmType', en: 'alarm type', zh: '告警类型' },
    {
      name: 'alarmId',
      en: 'the alarm id as uuid string',
      zh: '告警 ID（UUID 字符串）',
    },
    {
      name: 'alarmSeverity',
      en: 'alarm severity (lower case)',
      zh: '告警严重级别（小写）',
    },
    { name: 'alarmStatus', en: 'the alarm status', zh: '告警状态' },
    {
      name: 'alarmOriginatorEntityType',
      en: "the entity type of the alarm originator, e.g. 'Device'",
      zh: "告警来源实体的类型，如 'Device'",
    },
    {
      name: 'alarmOriginatorName',
      en: "the name of the alarm originator, e.g. 'Sensor T1'",
      zh: "告警来源实体的名称，如 'Sensor T1'",
    },
    {
      name: 'alarmOriginatorLabel',
      en: 'the label of the alarm originator',
      zh: '告警来源实体的标签',
    },
    {
      name: 'alarmOriginatorId',
      en: 'the alarm originator entity id as uuid string',
      zh: '告警来源实体 ID（UUID 字符串）',
    },
    { name: 'comment', en: 'text of the comment', zh: '评论内容' },
    {
      name: 'action',
      en: "one of: 'added', 'updated'",
      zh: "取值：'added'（新增评论）、'updated'（更新评论）",
    },
    {
      name: 'userTitle',
      en: 'title of the user who made the action',
      zh: '操作用户的名称',
    },
    {
      name: 'userEmail',
      en: 'email of the user who made the action',
      zh: '操作用户的邮箱',
    },
    {
      name: 'userFirstName',
      en: 'first name of the user who made the action',
      zh: '操作用户的名',
    },
    {
      name: 'userLastName',
      en: 'last name of the user who made the action',
      zh: '操作用户的姓',
    },
  ],

  [NotificationType.ALARM_ASSIGNMENT]: [
    { name: 'alarmType', en: 'alarm type', zh: '告警类型' },
    {
      name: 'alarmId',
      en: 'the alarm id as uuid string',
      zh: '告警 ID（UUID 字符串）',
    },
    {
      name: 'alarmSeverity',
      en: 'alarm severity (lower case)',
      zh: '告警严重级别（小写）',
    },
    { name: 'alarmStatus', en: 'the alarm status', zh: '告警状态' },
    {
      name: 'alarmOriginatorEntityType',
      en: "the entity type of the alarm originator, e.g. 'Device'",
      zh: "告警来源实体的类型，如 'Device'",
    },
    {
      name: 'alarmOriginatorName',
      en: "the name of the alarm originator, e.g. 'Sensor T1'",
      zh: "告警来源实体的名称，如 'Sensor T1'",
    },
    {
      name: 'alarmOriginatorLabel',
      en: 'the label of the alarm originator',
      zh: '告警来源实体的标签',
    },
    {
      name: 'alarmOriginatorId',
      en: 'the alarm originator entity id as uuid string',
      zh: '告警来源实体 ID（UUID 字符串）',
    },
    {
      name: 'assigneeTitle',
      en: 'title of the assignee',
      zh: '被分配人的名称',
    },
    {
      name: 'assigneeEmail',
      en: 'email of the assignee',
      zh: '被分配人的邮箱',
    },
    {
      name: 'assigneeFirstName',
      en: 'first name of the assignee',
      zh: '被分配人的名',
    },
    {
      name: 'assigneeLastName',
      en: 'last name of the assignee',
      zh: '被分配人的姓',
    },
    {
      name: 'assigneeId',
      en: 'the id of the assignee as uuid string',
      zh: '被分配人 ID（UUID 字符串）',
    },
    {
      name: 'userTitle',
      en: 'title of the user who made the action',
      zh: '操作用户的名称',
    },
  ],

  [NotificationType.RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT]: [
    {
      name: 'componentType',
      en: "one of: 'Rule chain', 'Rule node'",
      zh: "取值：'Rule chain'（规则链）、'Rule node'（规则节点）",
    },
    {
      name: 'componentId',
      en: 'the component id as uuid string',
      zh: '组件 ID（UUID 字符串）',
    },
    {
      name: 'componentName',
      en: 'the rule chain or rule node name',
      zh: '规则链或规则节点名称',
    },
    {
      name: 'ruleChainId',
      en: 'the rule chain id as uuid string',
      zh: '规则链 ID（UUID 字符串）',
    },
    { name: 'ruleChainName', en: 'the rule chain name', zh: '规则链名称' },
    {
      name: 'eventType',
      en: "one of: 'started', 'updated', 'stopped'",
      zh: "取值：'started'、'updated'、'stopped'",
    },
    {
      name: 'action',
      en: "one of: 'start', 'update', 'stop'",
      zh: "取值：'start'、'update'、'stop'",
    },
    { name: 'error', en: 'the error text', zh: '错误文本' },
  ],

  [NotificationType.ENTITIES_LIMIT]: [
    {
      name: 'entityType',
      en: "one of: 'Device', 'Asset', 'User', etc.",
      zh: "取值：'Device'、'Asset'、'User' 等",
    },
    {
      name: 'currentCount',
      en: 'the current count of entities',
      zh: '当前实体数量',
    },
    {
      name: 'limit',
      en: 'the limit on number of entities',
      zh: '实体数量上限',
    },
    {
      name: 'percents',
      en: 'the percent from the notification rule configuration',
      zh: '通知规则配置中的百分比',
    },
    { name: 'tenantId', en: 'id of the tenant', zh: '租户 ID' },
    { name: 'tenantName', en: 'name of the tenant', zh: '租户名称' },
  ],

  [NotificationType.ENTITIES_LIMIT_INCREASE_REQUEST]: [
    {
      name: 'entityType',
      en: "one of: 'Device', 'Asset', 'Customer', 'User', 'Dashboard', 'Rule chain', 'Edge'",
      zh: "取值：'Device'、'Asset'、'Customer'、'User'、'Dashboard'、'Rule chain'、'Edge'",
    },
    {
      name: 'userEmail',
      en: 'email of the user who sends the request',
      zh: '发起请求用户的邮箱',
    },
    {
      name: 'increaseLimitActionLabel',
      en: 'label of the button used to open the Limits Management page',
      zh: '打开限制管理页面的按钮文案',
    },
    {
      name: 'increaseLimitLink',
      en: 'link to the Limits Management page',
      zh: '限制管理页面链接',
    },
    {
      name: 'baseUrl',
      en: 'used to construct the full URL in email notifications',
      zh: '用于在邮件通知中拼接完整 URL',
    },
  ],

  [NotificationType.API_USAGE_LIMIT]: [
    {
      name: 'feature',
      en: "API feature the limit applies to, e.g. 'Device API', 'Telemetry persistence'",
      zh: "受限的 API 功能，如 'Device API'、'Telemetry persistence'",
    },
    {
      name: 'status',
      en: "one of: 'enabled', 'warning', 'disabled'",
      zh: "取值：'enabled'、'warning'、'disabled'",
    },
    {
      name: 'unitLabel',
      en: "name of the limited unit, e.g. 'message', 'data point'",
      zh: "受限单位名称，如 'message'、'data point'",
    },
    {
      name: 'limit',
      en: 'the limit on used feature units',
      zh: '功能用量上限',
    },
    {
      name: 'currentValue',
      en: 'current number of used units',
      zh: '当前已用用量',
    },
    { name: 'tenantId', en: 'id of the tenant', zh: '租户 ID' },
    { name: 'tenantName', en: 'name of the tenant', zh: '租户名称' },
  ],

  [NotificationType.NEW_PLATFORM_VERSION]: [
    {
      name: 'latestVersion',
      en: 'the latest platform version available',
      zh: '可用的最新平台版本',
    },
    {
      name: 'latestVersionReleaseNotesUrl',
      en: 'release notes link for the latest version',
      zh: '最新版本发布说明链接',
    },
    {
      name: 'upgradeInstructionsUrl',
      en: 'upgrade instructions link for the latest version',
      zh: '最新版本升级指引链接',
    },
    {
      name: 'currentVersion',
      en: 'the current platform version',
      zh: '当前平台版本',
    },
    {
      name: 'currentVersionReleaseNotesUrl',
      en: 'release notes link for the current version',
      zh: '当前版本发布说明链接',
    },
  ],

  [NotificationType.RULE_NODE]: [
    {
      name: 'originatorType',
      en: "type of the originator, e.g. 'Device'",
      zh: "消息来源实体类型，如 'Device'",
    },
    { name: 'originatorId', en: 'id of the originator', zh: '消息来源实体 ID' },
    {
      name: 'customerId',
      en: 'id of the customer if any',
      zh: '客户 ID（如有）',
    },
    { name: 'msgType', en: 'type of the message', zh: '消息类型' },
  ],

  [NotificationType.RATE_LIMITS]: [
    {
      name: 'api',
      en: "rate-limited API label, e.g. 'REST API requests', 'transport messages'",
      zh: "被限流的 API 名称，如 'REST API requests'、'transport messages'",
    },
    {
      name: 'limitLevelEntityType',
      en: "entity type of the limit level entity, e.g. 'Tenant', 'Device'",
      zh: "限流层级实体的类型，如 'Tenant'、'Device'",
    },
    {
      name: 'limitLevelEntityId',
      en: 'id of the limit level entity',
      zh: '限流层级实体 ID',
    },
    {
      name: 'limitLevelEntityName',
      en: 'name of the limit level entity',
      zh: '限流层级实体名称',
    },
    { name: 'tenantId', en: 'id of the tenant', zh: '租户 ID' },
    { name: 'tenantName', en: 'name of the tenant', zh: '租户名称' },
  ],

  [NotificationType.EDGE_CONNECTION]: [
    {
      name: 'edgeId',
      en: 'the edge id as uuid string',
      zh: 'Edge 实例 ID（UUID 字符串）',
    },
    { name: 'edgeName', en: 'the name of the edge', zh: 'Edge 实例名称' },
    {
      name: 'eventType',
      en: 'connectivity status: connected or disconnected',
      zh: '连接状态：connected（已连接）或 disconnected（断开）',
    },
  ],

  [NotificationType.EDGE_COMMUNICATION_FAILURE]: [
    {
      name: 'edgeId',
      en: 'the edge id as uuid string',
      zh: 'Edge 实例 ID（UUID 字符串）',
    },
    { name: 'edgeName', en: 'the name of the edge', zh: 'Edge 实例名称' },
    {
      name: 'failureMsg',
      en: 'the failure message that occurred on the Edge',
      zh: 'Edge 上发生的故障信息',
    },
  ],

  [NotificationType.TASK_PROCESSING_FAILURE]: [
    {
      name: 'taskType',
      en: "the task type, e.g. 'telemetry deletion'",
      zh: "任务类型，如 'telemetry deletion'",
    },
    { name: 'taskDescription', en: 'the task description', zh: '任务描述' },
    { name: 'error', en: 'the error stacktrace', zh: '错误堆栈' },
    { name: 'tenantId', en: 'the tenant id', zh: '租户 ID' },
    {
      name: 'entityType',
      en: 'the type of the entity the task relates to',
      zh: '任务相关实体的类型',
    },
    {
      name: 'entityId',
      en: 'the id of the entity the task relates to',
      zh: '任务相关实体的 ID',
    },
    {
      name: 'attempt',
      en: 'the number of attempts processing the task',
      zh: '任务已尝试处理次数',
    },
  ],

  [NotificationType.RESOURCES_SHORTAGE]: [
    {
      name: 'resource',
      en: 'the resource name, e.g. "CPU", "RAM", "STORAGE"',
      zh: '资源名称，如 "CPU"、"RAM"、"STORAGE"',
    },
    {
      name: 'usage',
      en: 'the current usage value of the resource',
      zh: '资源当前用量',
    },
    {
      name: 'serviceId',
      en: 'the service id (useful in cluster setup)',
      zh: '服务 ID（集群部署下定位用）',
    },
    {
      name: 'serviceType',
      en: 'the service type (useful in cluster setup)',
      zh: '服务类型（集群部署下定位用）',
    },
  ],
};

/** Locale key tail (templateConfig.type.*) per notification type. */
const TYPE_NAME_KEYS: Record<NotificationType, string> = {
  [NotificationType.GENERAL]: 'general',
  [NotificationType.ALARM]: 'alarm',
  [NotificationType.DEVICE_ACTIVITY]: 'deviceActivity',
  [NotificationType.ENTITY_ACTION]: 'entityAction',
  [NotificationType.ALARM_COMMENT]: 'alarmComment',
  [NotificationType.ALARM_ASSIGNMENT]: 'alarmAssignment',
  [NotificationType.RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT]:
    'ruleEngineLifecycleEvent',
  [NotificationType.ENTITIES_LIMIT]: 'entitiesLimit',
  [NotificationType.ENTITIES_LIMIT_INCREASE_REQUEST]:
    'entitiesLimitIncreaseRequest',
  [NotificationType.API_USAGE_LIMIT]: 'apiUsageLimit',
  [NotificationType.NEW_PLATFORM_VERSION]: 'newPlatformVersion',
  [NotificationType.RULE_NODE]: 'ruleNode',
  [NotificationType.RATE_LIMITS]: 'rateLimits',
  [NotificationType.EDGE_CONNECTION]: 'edgeConnection',
  [NotificationType.EDGE_COMMUNICATION_FAILURE]: 'edgeCommunicationFailure',
  [NotificationType.TASK_PROCESSING_FAILURE]: 'taskProcessingFailure',
  [NotificationType.RESOURCES_SHORTAGE]: 'resourcesShortage',
};

/** Full locale key of the notification type display name. */
export function notificationTypeNameKey(type: NotificationType): string {
  return `pages.notifications.sent.templateConfig.type.${TYPE_NAME_KEYS[type]}`;
}
