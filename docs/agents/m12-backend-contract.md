# M12 后端通知 API 契约盘点（工作文档，agents 用）

> 由 scout-backend 盘点产出（2026-09-05）。前端服务层与 spec §4 的对接依据；随 M12 收尾可归档或删除。

后端基类：所有控制器 `@RequestMapping("/api")` 或 `/api/notification`；返回 `BaseData` 实体自带 `id`（JSON 中 id 为 `{entityType:"NOTIFICATION_RULE", id:"uuid"}` 形式）、`createdTime`（long 毫秒）。
分页统一 query 参数：`pageSize`(int, required) / `page`(int, required) / `textSearch` / `sortProperty` / `sortOrder`（`ASC`|`DESC`）。注意 NotificationController 通知收件箱用的是 **`page` 而非 `pageOrder`**。

## 1. 端点表

### NotificationController（`/api`）

| 方法 | 路径 | 权限 | 参数 | 返回 |
|---|---|---|---|---|
| GET | `/api/notifications` | SYS/TENANT/CUSTOMER | `pageSize,page,textSearch,sortProperty,sortOrder,unreadOnly(bool,默认false),deliveryMethod(默认WEB,仅WEB/MOBILE_APP有效)` | `PageData<Notification>` |
| GET | `/api/notifications/unread/count` | 同上 | `deliveryMethod`（默认 **MOBILE_APP**，前端必须显式传 `WEB`） | `Integer` |
| PUT | `/api/notification/{id}/read` | 同上 | path id | void |
| PUT | `/api/notifications/read` | 同上 | `deliveryMethod`(默认WEB) | void |
| DELETE | `/api/notification/{id}` | 同上 | path id | void |
| POST | `/api/notification/request` | SYS/TENANT | body `NotificationRequest`（服务端强制 id=null；info/ruleId/status/stats/originatorEntityId 被忽略） | `NotificationRequest`（status=PROCESSING，异步发送） |
| POST | `/api/notification/entitiesLimitIncreaseRequest/{entityType}` | TENANT | path entityType | void |
| POST | `/api/notification/request/preview` | SYS/TENANT | body `NotificationRequest`（templateId 或 template 至少其一）；query `recipientsPreviewSize`(默认20) | `NotificationRequestPreview` |
| GET | `/api/notification/request/{id}` | SYS/TENANT | path id | `NotificationRequestInfo` |
| GET | `/api/notification/requests` | SYS/TENANT | 分页5参（textSearch 按模板名） | `PageData<NotificationRequestInfo>` |
| DELETE | `/api/notification/request/{id}` | SYS/TENANT | path id | void |
| POST | `/api/notification/settings` | SYS/TENANT | body `NotificationSettings` | `NotificationSettings` |
| GET | `/api/notification/settings` | SYS/TENANT | 无 | `NotificationSettings`（未配置时 `deliveryMethodsConfigs: {}`） |
| GET | `/api/notification/deliveryMethods` | SYS/TENANT/CUSTOMER | 无 | `List<NotificationDeliveryMethod>`（当前已配置可用通道） |
| POST | `/api/notification/settings/user` | 同上含 CUSTOMER | body `UserNotificationSettings` | `UserNotificationSettings` |
| GET | `/api/notification/settings/user` | 同上 | 无 | `UserNotificationSettings`（无则默认全开） |

### NotificationRuleController（`/api/notification`）

| 方法 | 路径 | 权限 | 参数 | 返回 |
|---|---|---|---|---|
| POST | `/api/notification/rule` | SYS/TENANT | body `NotificationRule`（triggerType 不可改；tenant 仅可用 tenantLevel=true 类型） | `NotificationRule` |
| GET | `/api/notification/rule/{id}` | SYS/TENANT | path id | `NotificationRuleInfo` |
| GET | `/api/notification/rules` | SYS/TENANT | 分页5参（textSearch 按 name） | `PageData<NotificationRuleInfo>` |
| DELETE | `/api/notification/rule/{id}` | SYS/TENANT | path id | void |

### NotificationTargetController（`/api/notification`）

| 方法 | 路径 | 权限 | 参数 | 返回 |
|---|---|---|---|---|
| POST | `/api/notification/target` | SYS/TENANT | body `NotificationTarget` | `NotificationTarget` |
| GET | `/api/notification/target/{id}` | SYS/TENANT | path id | `NotificationTarget` |
| POST | `/api/notification/target/recipients` | SYS/TENANT | body `NotificationTarget`(仅 PLATFORM_USERS)；`pageSize,page` | `PageData<User>` |
| GET | `/api/notification/targets` | SYS/TENANT | 分页5参（textSearch 按 name） | `PageData<NotificationTarget>` |
| GET | `/api/notification/targets/list` | SYS/TENANT | `ids`（必填，逗号分隔 UUID） | `List<NotificationTarget>` |
| GET | `/api/notification/targets/notificationType/{notificationType}` | SYS/TENANT | path NotificationType；分页5参 | `PageData<NotificationTarget>` |
| DELETE | `/api/notification/target/{id}` | SYS/TENANT | path id | void |

注意：tenant 保存 target 的限制——`USER_LIST` 需逐个 user 可读；`CUSTOMER_USERS` 需 customer 可读；`TENANT_ADMINISTRATORS` 不得带 `tenantsIds/tenantProfilesIds`；`SYSTEM_ADMINISTRATORS` 对 tenant 403。

### NotificationTemplateController（`/api/notification`）

| 方法 | 路径 | 权限 | 参数 | 返回 |
|---|---|---|---|---|
| POST | `/api/notification/template` | SYS/TENANT | body `NotificationTemplate` | `NotificationTemplate` |
| GET | `/api/notification/template/{id}` | SYS/TENANT | path id | `NotificationTemplate` |
| GET | `/api/notification/templates` | SYS/TENANT | 分页5参 + `notificationTypes`(可重复枚举数组，缺省=全部；textSearch 按 name/notificationType) | `PageData<NotificationTemplate>` |
| DELETE | `/api/notification/template/{id}` | SYS/TENANT | path id | void |
| GET | `/api/notification/slack/conversations` | SYS/TENANT | `type`(DIRECT/PUBLIC_CHANNEL/PRIVATE_CHANNEL), `token`(缺省→用 settings 的 SLACK botToken) | `List<SlackConversation>` |

## 2. DTO 字段清单

包根：`common/data/src/main/java/org/thingsboard/server/common/data/notification/`

### Notification（收件箱条目）extends BaseData
`requestId, recipientId, type: NotificationType, deliveryMethod, subject, text, additionalConfig: JsonNode, info: NotificationInfo, status: SENT|READ`

### NotificationRequest extends BaseData implements HasName
`tenantId, targets: List<UUID>`(@NotEmpty, 裸 UUID 数组), `templateId` / `template`(内联, 二选一), `info`, `additionalConfig: NotificationRequestConfig`, `originatorEntityId: EntityId`(polymorphic), `ruleId`, `status: PROCESSING|SENT|SCHEDULED`, `stats`
- NotificationRequestConfig: `sendingDelayInSec: int`（≤604800）
- NotificationRequestStats（响应）: `sent: Map<DeliveryMethod,int>`, `errors: Map<DeliveryMethod, Map<String,String>>`(recipient title→error), `totalErrors: int`, `error: String`
- NotificationRequestInfo = NotificationRequest + `templateName: String`, `deliveryMethods: List<DeliveryMethod>`

### NotificationRequestPreview
`processedTemplates: Map<DeliveryMethod, DeliveryMethodNotificationTemplate>`, `totalRecipientsCount: int`, `recipientsCountByTarget: Map<String,int>`, `recipientsPreview: Collection<String>`

### NotificationRule extends BaseData
`tenantId, name(≤255), enabled: boolean, templateId, triggerType, triggerConfig(多态, discriminator triggerType), recipientsConfig(多态, 同), additionalConfig: NotificationRuleConfig{description}, externalId`
- NotificationRuleInfo = NotificationRule + `templateName`, `deliveryMethods`
- 校验：`triggerType == triggerConfig.triggerType == recipientsConfig.triggerType`

**NotificationRuleTriggerType**（`tenantLevel` 标记）：
- tenant 级：`ENTITY_ACTION, ALARM, ALARM_COMMENT, ALARM_ASSIGNMENT, DEVICE_ACTIVITY, RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT, EDGE_CONNECTION, EDGE_COMMUNICATION_FAILURE`
- sysadmin 级：`NEW_PLATFORM_VERSION, ENTITIES_LIMIT, API_USAGE_LIMIT, RATE_LIMITS, TASK_PROCESSING_FAILURE, RESOURCES_SHORTAGE`

**triggerConfig 多态**（全部带 `triggerType` 字段回显）：

| 类型 | 字段 |
|---|---|
| ENTITY_ACTION | `entityTypes: Set<EntityType>, created, updated, deleted: boolean` |
| ALARM | `alarmTypes: Set<String>, alarmSeverities: Set<AlarmSeverity>, notifyOn: Set<AlarmAction>`(CREATED/SEVERITY_CHANGED/ACKNOWLEDGED/CLEARED, @NotEmpty), `clearRule: { alarmStatuses: Set<AlarmSearchStatus> }` |
| ALARM_COMMENT | `alarmTypes, alarmSeverities, alarmStatuses: Set<AlarmSearchStatus>, onlyUserComments: boolean, notifyOnCommentUpdate: boolean` |
| ALARM_ASSIGNMENT | `alarmTypes, alarmSeverities, alarmStatuses, notifyOn: Set<ASSIGNED|UNASSIGNED>`(@NotEmpty) |
| DEVICE_ACTIVITY | `devices: Set<UUID>` 或 `deviceProfiles: Set<UUID>`(二选一), `notifyOn: Set<ACTIVE|INACTIVE>`(@NotEmpty) |
| RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT | `ruleChains: Set<UUID>`(空=全部), `ruleChainEvents: Set<STARTED|UPDATED|STOPPED>`, `onlyRuleChainLifecycleFailures: boolean`, `trackRuleNodeEvents: boolean`, `ruleNodeEvents`, `onlyRuleNodeLifecycleFailures: boolean` |
| EDGE_CONNECTION | `edges: Set<UUID>`(空=全部), `notifyOn: Set<CONNECTED|DISCONNECTED>` |
| EDGE_COMMUNICATION_FAILURE | `edges: Set<UUID>` |
| ENTITIES_LIMIT | `entityTypes: Set<EntityType>, threshold: float`(≤1, 百分比小数) |
| API_USAGE_LIMIT | `apiFeatures: Set<ApiFeature>, notifyOn: Set<ApiUsageStateValue>` |
| RATE_LIMITS | `apis: Set<LimitedApi>` |
| RESOURCES_SHORTAGE | `cpuThreshold/ramThreshold/storageThreshold: float`(各≤1) |
| NEW_PLATFORM_VERSION / TASK_PROCESSING_FAILURE | 无字段（空对象） |

**recipientsConfig 多态**（discriminator `triggerType`）：
- 默认（除 ALARM 外全部）：`targets: List<UUID>`(@NotEmpty)
- ALARM → `escalationTable: Map<Integer, List<UUID>>`（key=延迟分钟数, value=target ids）

### NotificationTarget extends BaseData
`tenantId, name(≤255), configuration: NotificationTargetConfig(discriminator type), externalId`
- 公共配置字段：`description: String`(≤500), `type`
- `PLATFORM_USERS` → `usersFilter: UsersFilter`(discriminator `type`)
- `SLACK` → `conversationType: SlackConversationType, conversation: SlackConversation`(@NotNull)
- `MICROSOFT_TEAMS` → `webhookUrl, channelName, useOldApi: Boolean`(默认 true)

**UsersFilter 多态**：

| type | 字段 | 备注 |
|---|---|---|
| USER_LIST | `usersIds: List<UUID>` | |
| CUSTOMER_USERS | `customerId: UUID` | |
| TENANT_ADMINISTRATORS | `tenantsIds: Set<UUID>, tenantProfilesIds: Set<UUID>` | sysadmin 可带；tenant 必须为空 |
| AFFECTED_TENANT_ADMINISTRATORS | 无字段 | sysadmin |
| SYSTEM_ADMINISTRATORS | 无字段 | sysadmin only |
| ALL_USERS | 无字段 | sysadmin→全平台；tenant→本租户 |
| ORIGINATOR_ENTITY_OWNER_USERS | 无字段 | 规则用（forRules） |
| AFFECTED_USER | 无字段 | 规则用（forRules） |

- SlackConversation: `type, id, name, wholeName, email`
- Target type→通道映射：PLATFORM_USERS→{WEB,EMAIL,SMS,MOBILE_APP}；SLACK→{SLACK}；MICROSOFT_TEAMS→{MICROSOFT_TEAMS}

### NotificationTemplate extends BaseData
`tenantId, name(≤255), notificationType: NotificationType, configuration: NotificationTemplateConfig, externalId`
- NotificationTemplateConfig: `deliveryMethodsTemplates: Map<DeliveryMethod, DeliveryMethodNotificationTemplate>`(@NotEmpty；discriminator `method`)

**DeliveryMethodNotificationTemplate**（公共：`enabled: boolean, body: String, method`）：

| method | 字段 | 校验 |
|---|---|---|
| WEB | `subject, additionalConfig: JsonNode`（`{icon:{enabled,icon,color}, actionButtonConfig:{enabled,text,link}}`） | subject≤150；body≤250；button text≤50, link≤300 |
| EMAIL | `subject` | subject≤250 |
| SMS | 无附加 | body≤320 |
| SLACK | 无附加 | |
| MICROSOFT_TEAMS | `subject, themeColor, button:{enabled,text,linkType:LINK|DASHBOARD,link,dashboardId:UUID,dashboardState,setEntityIdInState:boolean}` | |
| MOBILE_APP | `subject, additionalConfig: JsonNode` | |

### NotificationType 枚举
`GENERAL, ALARM, DEVICE_ACTIVITY, ENTITY_ACTION, ALARM_COMMENT, RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT, ALARM_ASSIGNMENT, NEW_PLATFORM_VERSION, ENTITIES_LIMIT, ENTITIES_LIMIT_INCREASE_REQUEST, API_USAGE_LIMIT, RULE_NODE, RATE_LIMITS, EDGE_CONNECTION, EDGE_COMMUNICATION_FAILURE, TASK_PROCESSING_FAILURE, RESOURCES_SHORTAGE`

### NotificationSettings
`deliveryMethodsConfigs: Map<DeliveryMethod, Config>`(@NotNull；多态仅 SLACK(`botToken`@NotEmpty) 和 MOBILE_APP(`firebaseServiceAccountCredentialsFileName/firebaseServiceAccountCredentials`) 有具体类；MOBILE_APP 仅 sysadmin 可保存)

### UserNotificationSettings（用户级偏好）
`prefs: Map<NotificationType, NotificationPref{enabled, enabledDeliveryMethods: Map<WEB|EMAIL|SMS, boolean>}>`

## 3. WS 通知订阅命令

- 端点：`/api/ws/plugins/notifications`（query `?token=<jwt>` 或首帧 authCmd 认证）
- 命令（cmd 带 `type` 字段，新式 `{"authCmd":..., "cmds":[...]}` 包裹）：
  - `NOTIFICATIONS` → `{cmdId, limit: int, types?: Set<NotificationType>}`
  - `NOTIFICATIONS_COUNT` → `{cmdId}`
  - `MARK_NOTIFICATIONS_AS_READ` → `{cmdId, notifications: List<UUID>}`
  - `MARK_ALL_NOTIFICATIONS_AS_READ` → `{cmdId}`
  - `NOTIFICATIONS_UNSUBSCRIBE` → `{cmdId}`
- 出站更新：**每条消息是裸 JSON 对象（非数组包装）**，`cmdId, errorCode, errorMsg` 平铺：
  - NOTIFICATIONS 更新：`{cmdId, errorCode, errorMsg, notifications?: Notification[]|null, update?: Notification|null, totalUnreadCount: int, sequenceNumber: int}`。`notifications` 非空=全量快照；`update` 非空=增量；都空=仅 count 变化。
  - NOTIFICATIONS_COUNT 更新：`{cmdId, errorCode, errorMsg, totalUnreadCount, sequenceNumber}`
  - 订阅建立后立即推一次全量（unread 按 createdTime 倒序，deliveryMethod 固定 WEB，条数 ≤ limit）
- 与 ui-antd `protocol.ts` 现有 `UnreadSubCmd` 形状一致；返回侧需补 `sequenceNumber`、`errorCode/errorMsg` 与 `update` 增量分支。

## 4. 本机可验证性评估（只读结论）

- **WEB 通道：无外部依赖，可端到端跑通。** 链路 POST `/api/notification/request`（template `deliveryMethodsTemplates.WEB.enabled=true` + PLATFORM_USERS target）→ 异步落库 → GET `/api/notifications` / WS 订阅可见 → PUT read。唯一前置是用户/权限数据（本机已有）。
- **EMAIL**：需 sysadmin AdminSettings key `mail`（`/api/admin/settings/mail`），本机需外部 SMTP。
- **SMS**：需 sysadmin AdminSettings key `sms`（`/api/admin/settings/sms`），需真实 SMS 网关。
- **SLACK**：需 tenant notification settings 配 `SLACK.botToken` + 外网 Slack API。
- **MOBILE_APP**：需 Firebase 项目，本机不可验证。
- **MICROSOFT_TEAMS**：CRUD 与 preview 可本地验证；全链路发送需真实 webhook URL。
- 结论：M12 端到端自动化路径 = **WEB 通知**（CRUD target/template/rule + 发请求 + 收件箱 REST + WS 订阅 + preview）。SMS/EMAIL/SLACK 仅验证配置表单与错误路径（deliveryMethods 缺失、发送报错进 `stats.errors`）。真实短信/邮件到达测试留给人（用户），符合 M12 验收边界。
