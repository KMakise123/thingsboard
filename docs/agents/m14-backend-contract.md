# M14 后端 API 契约盘点：Calculated Field / 版本控制(VC) / Admin Settings / 各设置页（工作文档，agents 用）

> 由 scout-backend 盘点产出（2026-09-06）。ui-antd M14 四域（计算字段、VC/git、settings 各 tab、AI 模型）服务层对接依据；随 M14 收尾可归档。体例同 `docs/agents/m13-backend-contract.md`。

通用约定（同 M13）：分页统一 `pageSize`/`page`/`textSearch`/`sortProperty`/`sortOrder`；`sortProperty` 缺省时排序为 **`id ASC`**（`common/data/src/main/java/org/thingsboard/server/common/data/page/PageLink.java:30-31`），列表必须显式传 `sortProperty=createdTime&sortOrder=DESC` 才是"最新在前"。错误映射：`IllegalArgumentException`/`DataValidationException`/`IncorrectParameterException` → **400**，其余 → 500（`application/src/main/java/org/thingsboard/server/controller/BaseController.java:455-461`）。

功能开关：VC 的 git 实现 `vc.git.service=local` 默认激活（`common/version-control/src/main/java/org/thingsboard/server/service/sync/vc/DefaultGitRepositoryService.java:54-55`，`matchIfMissing=true`），jgit 依赖在 `common/version-control/pom.xml:93-98` —— **fork 单机部署下 VC 域端点全部可用**；VC 请求经 `queue.vc` 主题（`application/src/main/resources/thingsboard.yml:2036-2048`），controller 侧 `DeferredResult` 超时 `queue.vc.request-timeout` 默认 180s（`EntitiesVersionControlController.java:88-89`）。TBEL 保存 CF 无独立开关，但 `tbelInvokeService` 未装配时 testScript 返回 "TBEL script engine is disabled!"（`DefaultTbCalculatedFieldService.java:133-135`）。

---

## 1. 端点表

### 1.1 CalculatedFieldController（`/api`，`application/src/main/java/org/thingsboard/server/controller/CalculatedFieldController.java`）

全部端点 `@PreAuthorize` 仅 `TENANT_ADMIN`（类内逐方法标注）。作用域由 `entityId` 决定；支持实体与类型白名单 `CalculatedField.SUPPORTED_ENTITIES`（`common/data/src/main/java/org/thingsboard/server/common/data/cf/CalculatedField.java:52-58`）：DEVICE/ASSET/DEVICE_PROFILE/ASSET_PROFILE = 全部类型；CUSTOMER = 仅 ALARM。

| 方法 | 路径 | 权限 | 参数 | 返回 | 锚点 |
|---|---|---|---|---|---|
| POST | `/api/calculatedField` | TENANT_ADMIN | body `CalculatedField`（服务端强制 `tenantId`；先 `checkEntityId(entityId, WRITE_CALCULATED_FIELD)` 再 `checkReferencedEntities(configuration)`） | `CalculatedField` | CalculatedFieldController.java:118-133 |
| GET | `/api/calculatedField/{calculatedFieldId}` | TENANT_ADMIN | path id | `CalculatedField` | :135-147 |
| GET | `/api/calculatedField/{entityType}/{entityId}`（params `pageSize,page`） | TENANT_ADMIN | 分页5参 + `type`（`CalculatedFieldType`，可选）+ `textSearch`（按 name） | `PageData<CalculatedField>` | :167-183（实际逻辑复用 :149-165 的 Hidden V1 端点） |
| GET | `/api/calculatedFields`（params `pageSize,page`） | TENANT_ADMIN | 分页5参 + `types`（可重复）+ `entityType` + `entities`（UUID 可重复）+ `name`（**可重复 query 参数**）；**types 不传时默认全部并剔除 ALARM**（:213-216） | `PageData<CalculatedFieldInfo>`（附 `entityName`） | :185-232 |
| GET | `/api/calculatedFields/names` | TENANT_ADMIN | `type`（必填）+ 分页参数；**sortProperty 固定 `name`**（:248），只能传 sortOrder | `PageData<String>` | :234-250 |
| DELETE | `/api/calculatedField/{calculatedFieldId}` | TENANT_ADMIN | path id；无引用保护，直接删 | 200 空 | :252-263 |
| GET | `/api/calculatedField/{calculatedFieldId}/debug` | TENANT_ADMIN | path id | 最新 1 条 `DEBUG_CALCULATED_FIELD` 事件的 body（无则 `null`） | :265-279 |
| POST | `/api/calculatedField/testScript` | TENANT_ADMIN | body `{expression, arguments}`（arguments 结构见 swagger 注释 :91-116） | `{output: string, error: string}`（**语法/运行错误不抛 HTTP 错误，放 error 字段**） | :281-290 |

### 1.2 EntitiesVersionControlController（`/api/entities/vc`，`application/src/main/java/org/thingsboard/server/controller/EntitiesVersionControlController.java`）

类级 `@PreAuthorize("hasAuthority('TENANT_ADMIN')")`（:82），每方法再查 `Resource.VERSION_CONTROL` 的 READ/WRITE。除 save/load 的 status 查询外全部返回 `DeferredResult`（超时 180s）。**fork 可用**（见头部）。

| 方法 | 路径 | 权限 | 参数 | 返回 | 锚点 |
|---|---|---|---|---|---|
| POST | `/api/entities/vc/version` | TENANT_ADMIN | body `VersionCreateRequest`（`SINGLE_ENTITY`/`COMPLEX`） | `UUID` requestId（异步） | EntitiesVersionControlController.java:162-167 |
| GET | `/api/entities/vc/version/{requestId}/status` | TENANT_ADMIN | path requestId | `VersionCreationResult`（done/added/modified/removed/version/error） | :195-200 |
| GET | `/api/entities/vc/version/{entityType}/{externalEntityUuid}`（params `pageSize,page`） | TENANT_ADMIN | `branch`（必填）+ 分页5参（sortProperty 文档值 `timestamp`） | `PageData<EntityVersion>` | :238-259 |
| GET | `/api/entities/vc/version/{entityType}`（params `pageSize,page`） | TENANT_ADMIN | `branch` + 分页5参 | `PageData<EntityVersion>` | :267-285 |
| GET | `/api/entities/vc/version`（params `pageSize,page`） | TENANT_ADMIN | `branch` + 分页5参 | `PageData<EntityVersion>`（全类型） | :292-308 |
| GET | `/api/entities/vc/entity/{entityType}/{versionId}` | TENANT_ADMIN | path | `List<VersionedEntityInfo>` | :316-323 |
| GET | `/api/entities/vc/entity/{versionId}` | TENANT_ADMIN | path | `List<VersionedEntityInfo>`（全类型） | :330-335 |
| GET | `/api/entities/vc/info/{versionId}/{entityType}/{externalEntityUuid}` | TENANT_ADMIN | path | `EntityDataInfo`（hasRelations/hasAttributes/hasCredentials） | :343-353 |
| GET | `/api/entities/vc/diff/{entityType}/{internalEntityUuid}` | TENANT_ADMIN | path；**`versionId` 是 query 参数**（:365） | `EntityDataDiff` | :359-369 |
| POST | `/api/entities/vc/entity` | TENANT_ADMIN | body `VersionLoadRequest`（`SINGLE_ENTITY`/`ENTITY_TYPE`） | `UUID` requestId（异步） | :430-435 |
| GET | `/api/entities/vc/entity/{requestId}/status` | TENANT_ADMIN | path requestId | `VersionLoadResult`（done/result[]/error） | :472-477 |
| GET | `/api/entities/vc/branches` | TENANT_ADMIN | 无 | `List<BranchInfo>`（default 分支排最前：优先取 settings 的 defaultBranch，:504-519） | :499-520 |

VC 可版本化的实体类型（fork 实际清单，非 javadoc 所写 8 种）：`CUSTOMER, RULE_CHAIN, TB_RESOURCE, DASHBOARD, ASSET_PROFILE, ASSET, DEVICE_PROFILE, OTA_PACKAGE, DEVICE, ENTITY_VIEW, WIDGET_TYPE, WIDGETS_BUNDLE, NOTIFICATION_TEMPLATE, NOTIFICATION_TARGET, NOTIFICATION_RULE, AI_MODEL`（`application/src/main/java/org/thingsboard/server/service/sync/ie/DefaultEntitiesExportImportService.java:67-74`）。CALCULATED_FIELD 不是独立可版本化实体，仅作为设备/资产等的附属随 `saveCalculatedFields`/`loadCalculatedFields` 配置进出（`common/data/src/main/java/org/thingsboard/server/common/data/sync/vc/request/create/VersionCreateConfig.java:34`；load 侧 :305,:364）。

### 1.3 VC settings + auto-commit（`AdminController`，`/api/admin`，`application/src/main/java/org/thingsboard/server/controller/AdminController.java`）

**只有 TENANT_ADMIN 一套**，SYS_ADMIN 无 repository/autoCommit 端点（PE 的 sysadmin 默认 repo 在本 fork 不存在）。存储复用 tenant 级 admin settings：key=`entitiesVersionControl`（`DefaultTbRepositorySettingsService.java:31`）、key=`autoCommitSettings`（`DefaultTbAutoCommitSettingsService.java:30`）。

| 方法 | 路径 | 权限 | 参数 | 返回 | 锚点 |
|---|---|---|---|---|---|
| GET | `/api/admin/repositorySettings` | TENANT_ADMIN | 无 | `RepositorySettings`（**password/privateKey/privateKeyPassword 置 null**，:269-271） | AdminController.java:262-273 |
| GET | `/api/admin/repositorySettings/exists` | TENANT_ADMIN | 无 | `boolean` | :275-282 |
| GET | `/api/admin/repositorySettings/info` | TENANT_ADMIN | 无 | `RepositorySettingsInfo{configured, readOnly}` | :284-299 |
| POST | `/api/admin/repositorySettings` | TENANT_ADMIN | body `RepositorySettings`；服务端强制 `localOnly=false`（:307）；**保存前会真实 `initRepository`（clone/fetch），失败 500 "Failed to init repository!"**（DefaultEntitiesVersionControlService.java:516-526） | `RepositorySettings`（脱敏后） | AdminController.java:301-315 |
| DELETE | `/api/admin/repositorySettings` | TENANT_ADMIN | 无；同时清本地 git 目录 | 200 空 | :317-326 |
| POST | `/api/admin/repositorySettings/checkAccess` | TENANT_ADMIN | body `RepositorySettings`（凭据为空时**沿用已存值**，restore :37-52）；失败 400 "Unable to access repository: ..." | 200 空 | :328-338 |
| GET | `/api/admin/autoCommitSettings` | TENANT_ADMIN | 无 | `AutoCommitSettings`（不存在时 404，checkNotNull） | :340-347 |
| GET | `/api/admin/autoCommitSettings/exists` | TENANT_ADMIN | 无 | `boolean` | :349-356 |
| POST | `/api/admin/autoCommitSettings` | TENANT_ADMIN | body `AutoCommitSettings`（Map<EntityType, AutoVersionCreateConfig>）；**每个 branch 先过 `VcUtils.checkBranchName`**（:363） | `AutoCommitSettings` | :358-366 |
| DELETE | `/api/admin/autoCommitSettings` | TENANT_ADMIN | 无 | 200 空 | :368-377 |

auto-commit 生效链（实体保存时由各 controller 基类触发，`AutoCommitController.java:27-39` 是基类非 REST）：repo settings 缺失或 `readOnly=true`、或 autoCommitSettings 缺失、或该 entityType 无配置 → 静默跳过；branch 为空 → 用 repo 的 defaultBranch，再退 `"auto-commits"`；commit message 固定 `"auto-commit at <ISO 时间戳>"`（`DefaultEntitiesVersionControlService.java:548-572`）。

### 1.4 Admin settings / 安全设置（`AdminController` 续）

| 方法 | 路径 | 权限 | 参数 | 返回 | 锚点 |
|---|---|---|---|---|---|
| GET | `/api/admin/settings/{key}` | SYS_ADMIN | key（`general`/`mail`/`sms`/`securitySettings`/`entitiesVersionControl`/`autoCommitSettings`…自由 key）；**key=mail 时响应剔除 `password`/`refreshToken`**（:133-136） | `AdminSettings` | AdminController.java:124-138 |
| POST | `/api/admin/settings` | SYS_ADMIN | body `AdminSettings`；key=`mail` 保存后热更新邮件配置（:152-153），key=`sms` 热更新短信配置（:156-157） | `AdminSettings`（mail 脱敏） | :140-160 |
| GET | `/api/admin/securitySettings` | SYS_ADMIN | 无 | `SecuritySettings`（未配置时返回**默认值**而非 404，见 §3） | :162-181 |
| POST | `/api/admin/securitySettings` | SYS_ADMIN | body `SecuritySettings` | `SecuritySettings` | :171-181 |
| GET | `/api/admin/jwtSettings` | SYS_ADMIN | 无 | `JwtSettings` | :183-190 |
| POST | `/api/admin/jwtSettings` | SYS_ADMIN | body `JwtSettings`；**响应是当前用户新 `JwtPair`**（旧 token 语义变化） | `JwtPair` | :192-203 |
| POST | `/api/admin/settings/testMail` | SYS_ADMIN（只需 READ） | body `AdminSettings`(key=mail)；**body 无 password 时回填存储值**（:225-228） | 200 空（失败 400 带底层错误） | :205-241 |
| POST | `/api/admin/settings/testSms` | SYS_ADMIN（只需 READ） | body `TestSmsRequest`（numberTo 等） | 200 空 | :243-260 |
| GET | `/api/admin/mail/oauth2/loginProcessingUrl` | SYS_ADMIN | 无 | 字符串 `"/api/admin/mail/oauth2/code"` | :406-414 |
| GET | `/api/admin/mail/oauth2/authorize` | SYS_ADMIN | query prevUri 可选 | 授权 URL（带引号文本）；**设置 cookie 后 302 流程** | :416-442 |
| GET | `/api/admin/mail/oauth2/code`（params `code,state`） | 匿名可回调 | code/state（**校验 state cookie**，:454-457） | 302 → prevUri | :444-484 |
| GET | `/api/mail/config/template` | SYS/TENANT | 无 | 邮件服务商 SMTP 预设模板 JSON（MailConfigTemplateController.java:37-55） | — |
| GET | `/api/admin/updates` | SYS_ADMIN | 无 | `UpdateMessage` | AdminController.java:379-386 |
| GET | `/api/admin/systemInfo` / `/api/admin/featuresInfo` | SYS_ADMIN | 无 | `SystemInfo` / `FeaturesInfo` | :388-404 |

### 1.5 Queue（`QueueController`，`/api`，`application/src/main/java/org/thingsboard/server/controller/QueueController.java`）

| 方法 | 路径 | 权限 | 参数 | 返回 | 锚点 |
|---|---|---|---|---|---|
| GET | `/api/queues`（params `pageSize,page`） | SYS/TENANT | `serviceType`（必填，**仅 `TB-RULE-ENGINE` 有数据**，其余返回空 PageData :86-91）+ 分页5参（sortProperty 文档值 `createdTime,name,topic`） | `PageData<Queue>`（SYS 查系统队列，TENANT 查本租户队列） | QueueController.java:66-92 |
| GET | `/api/queues/{queueId}` | SYS/TENANT | path id；`checkQueueId`：系统队列（tenantId 为 null）对非 isolated 租户 403（BaseController.java:837-848） | `Queue` | :94-105 |
| GET | `/api/queues/name/{queueName}` | SYS/TENANT | path name | `Queue` | :107-116 |
| POST | `/api/queues`（params `serviceType`） | **仅 SYS_ADMIN** | body `Queue`；serviceType 非 `TB-RULE-ENGINE` 时**返回 null（空 body 200）**（:143-144） | `Queue` | :118-146 |
| DELETE | `/api/queues/{queueId}` | **仅 SYS_ADMIN** | path id；被 device profile 引用时 400（BaseQueueService.java:83） | 200 空 | :148-158 |

### 1.6 Notification settings（`NotificationController` 尾段，`application/src/main/java/org/thingsboard/server/controller/NotificationController.java`）

| 方法 | 路径 | 权限 | 参数 | 返回 | 锚点 |
|---|---|---|---|---|---|
| GET | `/api/notification/settings` | SYS/TENANT | 无（SYS 存 SYS_TENANT_ID，TENANT 存本租户，:510） | `NotificationSettings` | NotificationController.java:506-512 |
| POST | `/api/notification/settings` | SYS/TENANT | body `NotificationSettings`（`deliveryMethodsConfigs` @NotNull，key 为 `NotificationDeliveryMethod`） | `NotificationSettings` | :493-501 |
| GET | `/api/notification/deliveryMethods` | SYS/TENANT/CUSTOMER | 无 | 当前可用的投递方式列表 | :514-521 |
| GET | `/api/notification/settings/user` | SYS/TENANT/CUSTOMER | 无 | `UserNotificationSettings`（按用户的通知已读/弹窗偏好） | :531-535 |
| POST | `/api/notification/settings/user` | SYS/TENANT/CUSTOMER | body `UserNotificationSettings` | `UserNotificationSettings` | :524-529 |

注意：mail/sms 的**服务器连接**配置不在 notification settings 里（走 `/api/admin/settings` key=`mail`/`sms`），notification settings 只管各投递通道（SLACK/MICROSOFT_TEAMS/MOBILE_APP 等的 token/config）。

### 1.7 Trendz（`TrendzController`，`/api`，`application/src/main/java/org/thingsboard/server/controller/TrendzController.java`）

| 方法 | 路径 | 权限 | 参数 | 返回 | 锚点 |
|---|---|---|---|---|---|
| GET | `/api/trendz/settings` | TENANT/CUSTOMER | 无 | `TrendzSettings`（未配置返回空对象；**不脱敏**，见 §5-9） | TrendzController.java:70-78 |
| POST | `/api/trendz/settings` | TENANT | body `TrendzSettings` | `TrendzSettings` | :50-68 |

存储：tenant 级 admin settings key=`trendz`（`dao/src/main/java/org/thingsboard/server/dao/trendz/DefaultTrendzSettingsService.java:39-61`）。

### 1.8 AI 模型（`AiModelController`，`/api/ai/model`，`application/src/main/java/org/thingsboard/server/controller/AiModelController.java`）

| 方法 | 路径 | 权限 | 参数 | 返回 | 锚点 |
|---|---|---|---|---|---|
| POST | `/api/ai/model` | TENANT_ADMIN | body `AiModel`（@Valid；tenantId 强制取当前用户） | `AiModel` | AiModelController.java:78-85 |
| GET | `/api/ai/model/{modelUuid}` | TENANT_ADMIN | path UUID | `AiModel` | :92-103 |
| GET | `/api/ai/model`（params `pageSize,page`） | TENANT_ADMIN | 分页5参（sortProperty 文档值 `createdTime,name,provider,modelId`） | `PageData<AiModel>` | :110-128 |
| DELETE | `/api/ai/model/{modelUuid}` | TENANT_ADMIN | path UUID；**不存在时返回 `false` 而非 404** | `boolean` | :137-156 |
| POST | `/api/ai/model/chat` | TENANT_ADMIN | body `TbChatRequest{systemMessage?, userMessage, chatModelConfig}`（**不落库，直接调用模型**） | `DeferredResult<TbChatResponse>`（Success(text)/Failure(message) 信封） | :164-176 |

### 1.9 Home dashboard（`DashboardController`，`application/src/main/java/org/thingsboard/server/controller/DashboardController.java`）

"home" tab 不是 admin settings key，而是这组端点（tenant 级配置存 `Tenant.additionalInfo.homeDashboardId`）：

| 方法 | 路径 | 权限 | 参数 | 返回 | 锚点 |
|---|---|---|---|---|---|
| GET | `/api/dashboard/home` | 全角色 | 无（SYS_ADMIN 直接返回空体 :428-430） | `HomeDashboard`（user→customer→tenant 三级回退） | DashboardController.java:415-450 |
| GET | `/api/dashboard/home/info` | 全角色 | 无 | `HomeDashboardInfo`（SYS 返回 null） | :452-467 |
| GET | `/api/tenant/dashboard/home/info` | TENANT_ADMIN | 无 | `HomeDashboardInfo{dashboardId, hideDashboardToolbar}` | :469-487 |
| POST | `/api/tenant/dashboard/home/info` | TENANT_ADMIN | body `HomeDashboardInfo`（dashboardId 需有 READ 权限；传 null 即清除） | 200 空 | :489-514 |

---

## 2. DTO 字段清单

### CalculatedField（`common/data/src/main/java/org/thingsboard/server/common/data/cf/CalculatedField.java:50-92`）extends BaseData
`tenantId, entityId`（目标实体，更新禁改）, `type: CalculatedFieldType`, `name`(NoXss+Length), `debugMode`(deprecated, @JsonIgnore 序列化但可反序列化 :127-136), `debugSettings: DebugSettings`, `configurationVersion: int`, `configuration: CalculatedFieldConfiguration`(@NotNull @Valid), `version: Long`(VC 用), `additionalInfo: JsonNode` + `id, createdTime`

- **CalculatedFieldType**（`cf/CalculatedFieldType.java:26-34`）：`SIMPLE, SCRIPT, GEOFENCING, ALARM, PROPAGATION, RELATED_ENTITIES_AGGREGATION`
- **configuration** 是多态 JSON（按 type 反序列化）：`SimpleCalculatedFieldConfiguration`（+`useLatestTs`）、`ScriptCalculatedFieldConfiguration`、`AlarmCalculatedFieldConfiguration`（`createRules: Map<AlarmSeverity, AlarmRule>`/`clearRule`/propagate 系 :42-53）、`PropagationCalculatedFieldConfiguration`、`RelatedEntitiesAggregationCalculatedFieldConfiguration` 等；公共基类字段 `arguments: Map<String, Argument>`、`expression: String`、`output`(@NotNull)（`cf/configuration/BaseCalculatedFieldConfiguration.java:28-32`）
- **Argument**（`cf/configuration/Argument.java:27-54`）：`refEntityId`（引用实体，可为 null=本实体）、`refDynamicSourceConfiguration`、`refEntityKey`（key+type：SINGLE_VALUE/TS_ROLLING…）、`defaultValue`、`limit`、`timeWindow`

### RepositorySettings（`common/data/src/main/java/org/thingsboard/server/common/data/sync/vc/RepositorySettings.java:23-36`）
`repositoryUri, authMethod: USERNAME_PASSWORD|PRIVATE_KEY`（`RepositoryAuthMethod.java:18-21`）, `username, password, privateKeyFileName, privateKey, privateKeyPassword, defaultBranch, readOnly: boolean, showMergeCommits: boolean, localOnly: boolean`（localOnly 前端传了也会被强制 false）

### AutoCommitSettings（`sync/vc/AutoCommitSettings.java:23-27`）
`HashMap<EntityType, AutoVersionCreateConfig>`；`AutoVersionCreateConfig` = `VersionCreateConfig{saveRelations, saveAttributes, saveCredentials, saveCalculatedFields}` + `branch: String`（`AutoVersionCreateConfig.java:25-30`、`VersionCreateConfig.java:26-35`）

### AdminSettings（`common/data/src/main/java/org/thingsboard/server/common/data/AdminSettings.java:26-35`）
`tenantId, key`(NoXss+Length), `jsonValue: JsonNode`（自由 JSON）+ `id, createdTime`。已知 key：SYS 级 `general, mail, sms, securitySettings`；tenant 级 `entitiesVersionControl, autoCommitSettings, trendz`

### SecuritySettings（`security/model/SecuritySettings.java:29-53`）
`passwordPolicy: UserPasswordPolicy, maxFailedLoginAttempts, userLockoutNotificationEmail, mobileSecretKeyLength, userActivationTokenTtl`(@NotNull 1-24), `passwordResetTokenTtl`(@NotNull 1-24)

### UserPasswordPolicy（`security/model/UserPasswordPolicy.java:25-48`，密码策略）
`minimumLength, maximumLength, minimumUppercaseLetters, minimumLowercaseLetters, minimumDigits, minimumSpecialCharacters, allowWhitespaces=true, forceUserToResetPasswordIfNotValid=false, passwordExpirationPeriodDays, passwordReuseFrequencyDays`（**全是 Integer/Boolean，无 @Min/@Max 约束**——负数/颠倒也能存）

### JwtSettings（`security/model/JwtSettings.java:33-52`）
`tokenIssuer, tokenExpirationTime(min 1min), refreshTokenExpTime(min 15min), tokenSigningKey`（必填、合法 Base64、解码后 ≥512 位；`DefaultJwtSettingsValidator.java:40-66`）

### Queue（`common/data/src/main/java/org/thingsboard/server/common/data/queue/Queue.java:35-48`）extends BaseDataWithAdditionalInfo
`tenantId, name, topic, pollInterval, partitions, consumerPerPartition, packProcessingTimeout, submitStrategy{type, batchSize}, processingStrategy{type, retries, failurePercentage, pauseBetweenRetries, maxPauseBetweenRetries}, customProperties` + `additionalInfo`

### NotificationSettings（`notification/settings/NotificationSettings.java:29-35`）
`deliveryMethodsConfigs: Map<NotificationDeliveryMethod, NotificationDeliveryMethodConfig>`(@NotNull @Valid)；**NotificationDeliveryMethod**（`NotificationDeliveryMethod.java:22-29`）：`WEB, EMAIL, SMS, SLACK, MICROSOFT_TEAMS, MOBILE_APP`

### TrendzSettings（`trendz/TrendzSettings.java:27-33`）
`enabled: boolean, baseUrl: String, apiKey: String`

### AiModel（`ai/AiModel.java:43-100`）extends BaseData
`tenantId`(只读), `version`(只读), `name`(@NotBlank 1-255 NoXss NoNullChar), `configuration: AiModelConfig`(@NotNull @Valid，多态：provider config 含 OpenAi/AzureOpenAi/Ollama 等的 baseUrl/endpoint/apiKey), `externalId`

### VC 相关
`EntityVersion{timestamp, id(commit hash), name, author}`、`BranchInfo{name, default}`、`VersionedEntityInfo{externalId(entityId), entityType}`、`EntityDataInfo{hasRelations, hasAttributes, hasCredentials}`、`VersionCreationResult{done, added, modified, removed, version, error}`、`VersionLoadResult{done, result[{entityType, created, updated, deleted}], error}`（`common/data/src/main/java/org/thingsboard/server/common/data/sync/vc/`）

---

## 3. 服务层行为差异（校验链）

**CF 保存链**：`CalculatedFieldController.save` → `TbCalculatedFieldService.save`（更新时**禁改 entityId**："Changing the calculated field target entity after initialization is prohibited."，`DefaultTbCalculatedFieldService.java:185-189`；校验 entityId 类型/类型与实体匹配/实体存在 :191-201）→ dao `BaseCalculatedFieldService.save`（填充聚合类 scheduledUpdateInterval 默认值 :87-95）→ `CalculatedFieldDataValidator`：
- 创建限流：每实体 CF 数（不含 ALARM）超过租户 profile `maxCalculatedFieldsPerEntity`（默认 **5**）→ "Calculated fields per entity limit reached!"（`CalculatedFieldDataValidator.java:58-69`；默认值 `DefaultTenantProfileConfiguration.java:174`）
- 每 CF arguments 数超 `maxArgumentsPerCF`（默认 **10**）→ "Calculated field arguments limit reached!"（:80-91；默认 :177）
- `configuration.validate()`：argument 名 `ctx` 保留、"…doesn't support relation query configuration!"（`BaseCalculatedFieldConfiguration.java:35-46`）
- scheduling：scheduledUpdateEnabled 时按 `minAllowedScheduledUpdateIntervalInSecForCF`（默认 10s，:97-104/:180）校验；relation query 参数层级上限 `maxRelationLevelPerCfArgument`（默认 2，:106-120/:184）；deduplication 最小间隔（默认 10s :122-131/:200）、entity aggregation 最小间隔（默认 60s :133-145/:202）
- **唯一性**：DB 约束 `calculated_field_unq_key UNIQUE(entity_id, type, name)`（`dao/src/main/resources/sql/schema-entities.sql:940`），撞键错误文案 "Calculated field with such name and type already exists"（ALARM 型为 "Alarm rule with such type already exists"，`BaseCalculatedFieldService.java:111-116`）。同实体只允许一条 ALARM 型即由此约束产生（ALARM 型 name 固定为 "Alarm"）。
- **表达式语法校验不在保存链**：保存只做结构校验；TBEL 语法/运行错误只在 `testScript` 端点暴露（`DefaultTbCalculatedFieldService.java:116-169`，20s 超时 :64）。**前端必须先 testScript 再保存。**
- 引用实体校验（`BaseController.checkReferencedEntities:685-694`）：TENANT 引用直接放行；CUSTOMER/ASSET/DEVICE 需 READ 权限；其他类型 400 "Unsupported referenced entity type"。

**CF 查询排序**：`/api/calculatedField/{entityType}/{entityId}` 与 `/api/calculatedFields` 的分页全部走 `DaoUtil.toPageable(pageLink)`（无列映射，`dao/src/main/java/org/thingsboard/server/dao/sql/cf/JpaCalculatedFieldDao.java:81,87,94,110`）。合法 sortProperty = 实体属性名（`createdTime/name/type/id…`），swagger 白名单只标 `createdTime,name`；传别名（如 `entityName`）会 Hibernate 解析失败 500 —— 与 M13 Edge 非 Info 端点同型风险。`/api/calculatedFields/names` 固定按 name 排序且 `toPageable(pageLink,false)`（不追加 id 次级排序，:118-122）。

**VC settings 保存链**：branch 名校验（空格/`..`/`~`/`^`/`:`/`\`/以 `/`、`.lock` 结尾 → 400 "Branch name is invalid"，`VcUtils.java:24-33`）→ 凭据回填（空密码/私钥沿用存储值，`DefaultTbRepositorySettingsService.java:37-52`）→ **真实 clone/fetch 验证**（成功才落库；失败 500，`DefaultEntitiesVersionControlService.java:516-526`）。GET/checkAccess 响应永远脱敏三凭据字段。autoCommitSettings 存储同机制但**无 init 校验**。

**Queue 校验**（`dao/src/main/java/org/thingsboard/server/dao/service/validator/QueueValidator.java`）：创建时 name/topic 在同租户唯一（:43-50）；**更新禁改 name/topic**（"Queue name can't be changed!"/"Queue topic can't be changed!"，:58-63）；非 SYS 租户要求 profile `isolatedTbRuleEngine` 否则 "Tenant should be isolated!"（:68-75）；`pollInterval/partitions/packProcessingTimeout ≥ 1`、BATCH 策略 batchSize ≥1、processingStrategy 的 retries/failurePercentage/pause 区间校验（:80-118）。删除保护仅一个：被 device profile 引用 → 400 "The queue referenced by the device profiles cannot be deleted!"（`dao/src/main/java/org/thingsboard/server/dao/queue/BaseQueueService.java:75-92`）；保存/删除会同步建 topic + 广播集群（`DefaultTbQueueService.java:52-72,175-185`）。**系统 Main 队列无特殊白名单**，仅靠 device profile 引用兜底（Main 被所有默认 profile 引用，实际删不掉）。

**SecuritySettings**：读取时无存储则返回默认值（minLength=6/maxLength=72/mobileSecretKeyLength=64/两个 TTL=24，`DefaultSecuritySettingsService.java:50-58`），存储 key=`securitySettings`；保存只做 `ConstraintValidator.validateFields`（:64-65，仅约束两个 TTL 的 @NotNull/@Min/@Max）。

**AiModel**：SSRF 校验 provider URL（OpenAI/Azure/Ollama 的 baseUrl/endpoint 过内网地址，`AiModelDataValidator.java:74-92`）；禁 SYS 租户（:67-69）；更新要求记录存在（:43-49）。`/api/ai/model/chat` 不校验模型记录是否已保存——`chatModelConfig` 直接来自请求体。

**mail 配置热更新**：保存 admin settings key=`mail` 后服务端即时重建 JavaMailSender（`AdminController.java:152-153`），key=`sms` 同理（:156-157）。

---

## 4. 权限总矩阵（四域 × 角色）

| 能力 | SYS_ADMIN | TENANT_ADMIN | CUSTOMER_USER |
|---|---|---|---|
| CF 全部 8 端点（CRUD/列表/debug/testScript） | ✗ | ✓ | ✗ |
| VC 操作（version/entity/branches/diff/info） | ✗ | ✓ | ✗ |
| repositorySettings / autoCommitSettings 全部 | ✗ | ✓ | ✗ |
| admin settings（`/api/admin/settings*`，key=mail/sms/general） | ✓ | ✗ | ✗ |
| securitySettings / jwtSettings 读写 | ✓ | ✗ | ✗ |
| testMail / testSms / mail oauth2 流程 | ✓ | ✗ | ✗ |
| mail config templates 读 | ✓ | ✓ | ✗ |
| Queue 读（列表/按 id/按 name） | ✓（系统队列） | ✓（本租户；非 isolated 租户通常为空） | ✗ |
| Queue 增/删 | ✓ | ✗ | ✗ |
| notification settings（租户/系统级）读写 | ✓ | ✓ | ✗ |
| notification deliveryMethods / user settings 读写 | ✓ | ✓ | ✓ |
| trendz settings 读 / 写 | ✗ | ✓ / ✓ | ✓（读） / ✗ |
| AI model CRUD + chat | ✗ | ✓ | ✗ |
| dashboard/home 系 | 仅 GET（返回空/null） | ✓（tenant home info 读写） | GET home 两端点 |
| `/api/admin/updates`、`systemInfo`、`featuresInfo` | ✓ | ✗ | ✗ |

注：CF 的 ACL 走目标实体的 `WRITE_CALCULATED_FIELD`/`READ_CALCULATED_FIELD` 操作（`CalculatedFieldController.java:130,145,163`），实现上仅 TENANT_ADMIN 能过 PreAuthorize，CUSTOMER 注解层即被拦。

---

## 5. 已知坑（前端易踩）

1. **CF 保存不校验表达式语法**：错误 expression 照样入库，运行期才在 debug event 里报错。表单流程必须"testScript 通过 → 再 POST"。
2. **CF 更新禁改 entityId**（只此一个禁改字段，type/name/configuration 均可改）；换目标实体只能删了重建。
3. **CF 列表 sortProperty 别名 500 风险**：dao 无列映射（JpaCalculatedFieldDao.java:81-110），`CalculatedFieldInfo.entityName` 不能作为 sortProperty（那只是内存拼接字段，BaseCalculatedFieldService.java:165-174）。UI 只允许 `createdTime/name`。
4. **`/api/calculatedFields` 缺省排除 ALARM 型**（CalculatedFieldController.java:213-216）：做"全部计算字段"页要单独取 ALARM（按实体 `/api/calculatedField/{entityType}/{entityId}?type=ALARM`），否则报警规则列不出来。
5. **`/api/queues` 对 TENANT_ADMIN 名不副实**：save/delete 仅 SYS_ADMIN；GET 返回本租户 DB 记录，非 isolated 租户恒为空列表（真正的默认队列在 tenant profile JSON 里）。ui-antd 若做 tenant 侧 queues 页需按此裁剪（只读或仅 SYS）。
6. **VC save repository settings 是"验证式保存"**：会真实 clone；私钥/密码字段 GET 回来永远是 null，编辑表单必须"留空=不变"（服务端 restore 回填，留空才沿用旧值——**传空字符串 ≠ 留空**，Jackson 反序列化空串非 null，restore 只认 null）。checkAccess 同理。
7. **autoCommitSettings branch 校验在前**：先 `VcUtils.checkBranchName` 再 ACL，非法分支名 400；但 `AutoVersionCreateConfig` 其余字段（saveAttributes 等）无校验。
8. **GET `/api/admin/autoCommitSettings` 在未配置时 404**（checkNotNull），不是返回空对象；前端要用 `exists` 端点或 catch 404。
9. **trendz apiKey 对 CUSTOMER_USER 泄露**：`/api/trendz/settings` 对 customer 用户返回完整 `apiKey`（TrendzController.java:70-78 + DefaultTrendzSettingsService.java:57-61 无脱敏）。是否前端隐藏/收紧权限需裁决。
10. **saveQueue 对非 TB-RULE-ENGINE serviceType 返回 null**（空 body）：前端固定传 `TB-RULE-ENGINE` 即可，但别对响应做实体解析。
11. **mail 表单的"留空密码"语义**：GET `settings/mail` 不返回 password；testMail 会自动回填（AdminController.java:225-228），但 **POST 保存不会回填**——保存时若 password 传空串会覆盖掉真实密码（admin settings 是整包 jsonValue 覆盖式保存）。ui-antd 编辑邮件配置必须把 GET 到的 jsonValue 原样带回或引导用户重输密码。
12. **securitySettings 保存整包覆盖**：passwordPolicy 数字字段无范围校验，前端需自行限制（否则可存出 min>max 的死锁策略）。
13. **jwtSettings 保存即签发新 token pair**：保存后旧 token 是否失效取决于签名 key 是否变更；前端保存成功要处理响应里的新 token。
14. **VC 请求默认 180s 超时**：save/load/branches 都是 DeferredResult；大 repo 首次 clone 可能顶满 180s，前端 loading 与重试策略要按此设计。

---

## 6. fork 本土化改动检查

对 CalculatedFieldController、EntitiesVersionControlController、AdminControlller、QueueController、AiModelController、TrendzController 六个控制器及 `dao/cf`、`common/version-control`、`application/.../service/sync/vc` 执行 `git log --author="HJH|俊壕"`：**全部为空**，即四域 REST 面无任何 fork 提交，纯上游 4.4 代码。无需登记本土化差异；与网上 3.x/PE 文档的差异均来自上游 4.x 本身（如 CF 类型扩展 GEOFENCING/PROPAGATION/RELATED_ENTITIES_AGGREGATION、AiModel 成为 VC 可导出实体、trendz apiKey 字段）。

## 7. openapi 快照对照

`ui-antd/api/tb-openapi.json` 与代码比对：四域端点**路径与方法完全一致**，无缺失/形变。仅两处快照之外的差异：代码里另有 Hidden 端点 `GET /api/{entityType}/{entityId}/calculatedFields`（V1 别名，CalculatedFieldController.java:149-165，建议前端不用）；快照不含各端点 `@Hidden` 行为差异。以代码为准。

---

## 8. 裁决点

1. **fork 无缺失端点**：四域全部端点在 fork 中存在且实现齐备（VC git 走默认 `vc.git.service=local` + jgit，DefaultGitRepositoryService.java:54-55）。M14 不需要后端补洞。
2. **queues tab 的角色裁剪**：save/delete 仅 SYS_ADMIN（QueueController.java:125,149），TENANT 只读且通常空列表。ui-antd 的 queues 页面建议仅对 SYS_ADMIN 开放写；TENANT 侧是否保留只读视图需拍板。
3. **CF 列表 sortProperty 白名单**：前端硬编码 `createdTime|name`，其余一律不发（500 风险，§3 排序段）。无 M13 customerTitle 那种"swagger 允许但必 500"的陷阱——本次 swagger 白名单与 dao 属性名一致。
4. **trendz apiKey 泄露给 customer**（§5-9）：收紧为 TENANT-only 或前端脱敏，需产品拍板。
5. **VC settings 编辑表单的凭据语义**：null=沿用旧值 / 空串=覆盖为空。前端必须把空凭据字段序列化时删掉（不是传 ""）。建议封一个 `stripBlankCredentials` 工具。
6. **CF ALARM 型的独立入口**：`/api/calculatedFields` 聚合列表排除 ALARM；报警规则管理是否并入 M14 CF 页、还是走 device profile 详情页，需拍板。
7. **mail 密码覆盖坑**（§5-11）：整包覆盖式保存 + GET 脱敏的组合意味着"不改密码也要重传旧密码"做不到——需前端约定"密码框留空 = 请求体不带 password 字段"，但保存时留空仍会把 password 置空并破坏邮件发送（testMail 有回填、saveAdminSettings 没有）。此为硬契约，UI 必须强制"修改邮件配置时重输密码"或引导只改非密码字段后单独 testMail。需实测确认空串覆盖行为（§9-T6）。
8. **AiModel chat 与模型记录解耦**：chat 直接吃请求体里的 config，M14 的"AI 对话测试"可以不先保存模型；但 secret 会出现在请求体（audit log 是否记录 body 未盘点）。
9. **VC 180s DeferredResult**：超时后前端拿到的错误形态（AsyncRequestTimeoutException → 500 "Request timeout"，BaseController.java:464-465）需在错误映射表里占位。

---

## 9. 实测清单（wave 1 真机 curl 验证；前置：run-tb-backend 起本机后端，TENANT_ADMIN/SYS_ADMIN token 各一）

- **T1 CF 基本 CRUD + 排序**：POST `/api/calculatedField`（SIMPLE 型，DEVICE 实体，1 个 argument + expression `return {a: 1};`）→ 201 语义 200；GET `/api/calculatedField/{entityType}/{entityId}?pageSize=10&page=0&sortProperty=createdTime&sortOrder=DESC` 有数据；同名同型再 POST → 400 消息含 "already exists"。判据：三步全过。
- **T2 CF testScript 与禁改**：POST `/api/calculatedField/testScript` 传坏表达式 → 200 且 `error` 非空（非 HTTP 错误）；对已建 CF 更新时改 `entityId` → 400 "Changing the calculated field target entity after initialization is prohibited."。判据：错误按预期返回。
- **T3 VC settings 全链**：POST `/api/admin/repositorySettings`（指向本机 `file:///` 不支持的话用 GitHub 私有仓或跳过 T3.1）→ 成功后 GET `/api/admin/repositorySettings` 确认 password/privateKey 为 null；POST `checkAccess` 传 **password 字段缺省** → 200（回填生效）；POST autoCommitSettings branch=`a b` → 400 "Branch name is invalid"。判据：脱敏、回填、分支校验三点成立。
- **T4 VC branches/version 只读链**（依赖 T3 repo 可用）：GET `/api/entities/vc/branches` → 数组非空且 default 在首位；POST `/api/entities/vc/version`（SINGLE_ENTITY，DEVICE）→ 拿 requestId 轮询 status 至 `done=true`。判据：异步任务闭环。
- **T5 queue 权限**：TENANT token POST `/api/queues` → 403；SYS token POST（serviceType=TB-RULE-ENGINE，name=smoke14）→ 200；重复 POST 同 name → 400 "Queue with name: smoke14 already exists!"。判据：角色差异 + 唯一性。
- **T6 mail settings 覆盖语义**：SYS token POST `/api/admin/settings` key=mail（带 password=test123）→ GET 确认无 password 字段且 testMail 对错误服务器返回 400 带底层错误；再 POST 一次 **不带 password 字段**（模拟前端留空）→ 用任意外部手段（查库 `select json_value from admin_settings where key='mail'`）确认 password 是否变空/丢失。判据：确定 §8-7 的裁决结论。
- **T7 securitySettings 回环**：GET → POST 回显（passwordPolicy.minimumLength=8）→ GET 确认持久化；POST `userActivationTokenTtl=0` → 400。判据：默认值存在 + @Min 生效。
- **T8 notification settings**：TENANT POST `/api/notification/settings`（`{"deliveryMethodsConfigs":{}}`）→ 200；GET 回读一致；CUSTOMER token GET → 403、GET `/api/notification/settings/user` → 200。判据：三级角色矩阵成立。
- **T9 ai model SSRF**：TENANT POST `/api/ai/model`（OpenAiProviderConfig baseUrl=`http://127.0.0.1:8080`）→ 400 "AI model provider URL is not allowed"；改为公网合法 URL → 200；DELETE 不存在 id → `false`。判据：SSRF 拦截 + delete 语义。
- **T10 trendz 回环**：TENANT POST `{enabled:true, baseUrl:"https://trendz.example.com", apiKey:"k1"}` → CUSTOMER token GET `/api/trendz/settings` 确认 apiKey 是否裸露（验证 §8-4）；CUSTOMER POST → 403。判据：泄露事实坐实或推翻。
