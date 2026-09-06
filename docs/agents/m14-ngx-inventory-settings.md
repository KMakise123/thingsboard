# M14 ui-ngx settings 六小件 + 密码策略页操作面盘点（工作文档，agents 用）

> 由 scout-ngx(settings) 盘点产出（2026-09-06）。spec §6 的对照基准；随 M14 收尾可归档或删除。
> 范围：`/settings` 下 queues / notifications / home / trendz / ai-models 五个 tab 全量 + outgoing-mail（已由 ui-antd 交付，仅登记回归口径）+ `/security-settings/general` 密码策略页 + repository / auto-commit 两 tab 的路由/角色/入口（**表单细节归 scout-vc，见 `m14-ngx-inventory-vc.md`（如其产出）**）。
> 术语：ngx 把这些页面统称 settings tabs（SYS 侧菜单叫 "Platform"，TENANT 侧叫 "Settings"）；密码策略页在 `/security-settings/general`，不在 `/settings` 树下；SMS provider 与 Slack/Firebase 配置合用一个组件（`SmsProviderComponent`）挂在 `/settings/notifications`。

## 关键文件

- 路由/模块：`ui-ngx/src/app/modules/home/pages/admin/admin-routing.module.ts`、`admin.module.ts`；ai-model 独立路由 `ui-ngx/src/app/modules/home/pages/ai-model/ai-model-routing.module.ts`、`ai-model.module.ts`
- queue：`.../pages/admin/queue/queues-table-config.resolver.ts` + `queue.component.ts/.html`；共享表单 `.../components/queue/queue-form.component.ts/.html`
- notifications tab：`.../pages/admin/sms-provider.component.ts/.html` + `send-test-sms-dialog.component.ts`；provider 子表单 `.../components/sms/sms-provider-configuration.component.*` + `aws-sns/twilio/smpp-*-provider-configuration.component.*`
- outgoing-mail：`.../pages/admin/mail-server.component.ts/.html`
- home：`.../pages/admin/home-settings.component.ts/.html`；对照 `/home` 落地页 `.../pages/home-links/home-links-routing.module.ts` + `home-links.component.ts`
- trendz：`.../pages/admin/trendz-settings.component.ts/.html`；模型 `shared/models/trendz-settings.models.ts`；HTTP `core/http/trendz-settings.service.ts`
- ai-model：`.../pages/ai-model/ai-model-table-config.resolve.ts` + `ai-model-table-header.component.*`；编辑对话框 `.../components/ai-model/ai-model-dialog.component.*` + `check-connectivity-dialog.component.*`；模型 `shared/models/ai-model.models.ts`
- security-settings：`.../pages/admin/security-settings.component.ts/.html`
- 共享模型：`ui-ngx/src/app/shared/models/settings.models.ts`（mail/sms/repository/auto-commit/password policy/JWT 全在这）
- HTTP 服务：`core/http/admin.service.ts`、`core/http/queue.service.ts`、`core/http/ai-model.service.ts`、`core/http/trendz-settings.service.ts`、`core/http/dashboard.service.ts`（home tab 部分）、`core/http/notification.service.ts`（notification settings 部分）
- 菜单：`ui-ngx/src/app/core/services/menu.models.ts`
- 文案：`ui-ngx/src/assets/locale/locale.constant-en_US.json` 顶层 `admin.*` / `queue.*` / `ai-models.*` 段

## 1. 路由与权限总表

### 1.1 `/settings` 树（`admin-routing.module.ts`）

- 父路由 `/settings`：RouterTabsComponent，auth=[SYS_ADMIN, TENANT_ADMIN]（:224-235）；空路径重定向**按角色二分**：SYS→`/settings/general`、TENANT→`/settings/home`（:237-247）
- `/settings/general`（GeneralSettingsComponent）：**SYS only**（:248-259）。baseUrl + prohibitDifferentUrl + connectivity 六协议卡——ui-antd 已交付（spec 3.7），不在 M14 范围，仅登记
- `/settings/outgoing-mail`（MailServerComponent）：**SYS only**（:260-271）——ui-antd 已交付（见 §3.1 回归口径）
- `/settings/notifications`（SmsProviderComponent）：**SYS + TENANT**（:272-283）——同页两形态见 §3.2
- `/settings/queues`：列表 ''（EntitiesTableComponent）**SYS only**（:292-302）；详情 `:entityId`（EntityDetailsPageComponent）SYS + ConfirmOnExitGuard（:303-320）
- `/settings/home`（HomeSettingsComponent）：**TENANT only**（:321-332）——与 `/home` 落地页的区分见 §4
- `/settings/repository`（:333-344）、`/settings/auto-commit`（:345-356）：**TENANT only**，均 ConfirmOnExitGuard——表单细节归 scout-vc
- `/settings/trendz`（TrendzSettingsComponent）：**TENANT only**（:357-368）
- `...aiModelRoutes` 展开在 settings 树内（:369）：`/settings/ai-models` **TENANT only**，无详情子路由（`ai-model-routing.module.ts:25-40`）
- 旧路径重定向：`/settings/security-settings`→`/security-settings/general`（:370-373）、`/settings/oauth2`→`/security-settings/oauth2`（:374-377）、`/settings/2fa`→`/security-settings/2fa`（:387-390）、`/settings/sms-provider`→`/settings/notifications`（:391-394）

### 1.2 `/security-settings` 树（同文件）

- 父路由 auth=[SYS_ADMIN, TENANT_ADMIN]（:397-404）；空路径重定向按角色：SYS→`general`、TENANT→`auditLogs`（:406-416）
- `/security-settings/general`（SecuritySettingsComponent）：**SYS only**（:417-428）——密码策略 + JWT 两张卡，见 §5
- `/security-settings/2fa`（SYS，:429-440）、`oauth2`、`auditLogs`（:441-442）：不在 M14 密码策略段范围（2FA/OAuth2 ui-antd 已交付；audit-logs 已交付）

### 1.3 菜单挂载（`menu.models.ts`）

- **SYS_ADMIN**：「Platform」分组（MenuId.platform，icon miscellaneous_services，:360-368）下挂 general / outgoing-mail / notification_settings / queues 四项（:897-905）；「Security」分组（security_settings，icon security，:464-473）下挂 general(密码策略) / two_fa / oauth2(domains,clients) / audit_log（:882-896）
- **TENANT_ADMIN**：「Platform」toggle 分组（platform_section，:994-1010）内含 version_control + 「Settings」子分组（MenuId.settings）挂 **home_settings / notification_settings / repository_settings / auto_commit_settings / trendz_settings / ai_models** 六项 + api_usage。TENANT 的 security_settings 组只有 oauth2 clients + audit_logs，**无密码策略入口**
- MenuId 明细：ai_models path=/settings/ai-models icon auto_awesome（:309-317）；home_settings 菜单名 `admin.home`（:410-420）；notification_settings icon mdi:message-badge-outline（:421-431）；repository_settings icon manage_history（:432-442）；auto_commit_settings icon settings_backup_restore（:443-453）；queues icon swap_calls（:454-463）；trendz_settings icon trendz-settings（:798-808）；security_settings_general（:474-484）

### 1.4 后端权限矩阵（本仓 fork，登记）

- queues：列表/按 id/按名 `SYS_ADMIN, TENANT_ADMIN`（`QueueController.java:69-70,96-97,109-110`）；**保存/删除 SYS_ADMIN only**（:125-126,149-150）
- `/api/admin/securitySettings`、`/api/admin/jwtSettings`、`/api/admin/settings/testMail`、`/api/admin/settings/testSms`：全部 **SYS_ADMIN only**（`AdminController.java:164-180,185-201,208-209,246-247`）
- `/api/notification/settings` GET/POST：`SYS_ADMIN, TENANT_ADMIN`（`NotificationController.java:493-494,506-507`）
- `/api/mail/config/template`：`SYS_ADMIN, TENANT_ADMIN`（`MailConfigTemplateController.java:48-49`）
- `/api/trendz/settings` POST `TENANT_ADMIN`（:60-61）、GET `TENANT_ADMIN, CUSTOMER_USER`（`TrendzController.java:73-74`）
- `/api/ai/model` 全部端点（save/get/list/delete/chat）：**TENANT_ADMIN only**（`AiModelController.java:78-79,92-93,110-111,137-138,164-165`）
- `/api/tenant/dashboard/home/info` GET/POST：**TENANT_ADMIN only**（`DashboardController.java:472-473,492-493`）

## 2. queues tab（列表 + 嵌套策略表单）

### 2.1 列表（EntitiesTable 通用表壳，`queues-table-config.resolver.ts`）

- 表标题 "Queues"（`admin.queues`，:77）；锁定 `queueType = TB_RULE_ENGINE`（:44,71-73）——页面上**无 ServiceType 切换**（TB_CORE/TB_TRANSPORT/JS_EXECUTOR 不在此页管理）
- 列四根各 25%（:85-103）：name / partitions / submitStrategy（列值=策略 label 译文，:89-95）/ processingStrategy（同，:96-102）
- 通用默认继承（`entities-table-config.models.ts:178-195`）：搜索启用、分页 10/页、默认排序 createdTime DESC、批量选择启用；**无自定义行内过滤器、无 JSON 导出/导入**（`import-export.service.ts` 零 QUEUE 引用）
- fetch=`GET /api/queues?serviceType=TB_RULE_ENGINE`（:107）；load=`getQueueById`（:108）；save=`saveQueue` 后回读 getQueueById（:109-111）；delete=`DELETE /api/queues/{id}`（:112）
- **Main 队列保护（仅前端）**：`deleteEnabled` 与 `entitySelectionEnabled` 都要求 `queue.name !== 'Main'`（:113-114）→ Main 行无勾选框、删除按钮隐藏（`queue.component.ts:60-66` hideDelete）。后端**没有** Main 保护：`BaseQueueService.deleteQueue`（`dao/.../queue/BaseQueueService.java:75-89`）只处理 `fk_default_queue_device_profile` 外键报错「The queue referenced by the device profiles cannot be deleted!」；`QueueValidator.java:43-59` 只管 name 唯一 + 更新不可改名
- 删除确认四件套（:62-65）；行点击→右侧详情抽屉（`entities-table.component.ts:449-453`，handleRowClick 未设走默认 toggleEntityDetails）；抽屉内「Open details page」按钮跳 `/settings/queues/{id}`（`queue.component.html:19-24`，action 'open' 在 resolver :117-132）

### 2.2 新增/编辑表单（`queue.component` 包一层 + `tb-queue-form` 共享组件）

> 形态：ngx 新增/编辑/详情同一表单（抽屉 + 独立详情页两处）；queue.component 把整个实体塞进 `queue` 单控件（`queue.component.ts:54-58`），prepareFormValue 再解包（:74-76）。表单被 device-profile 的「customer queues」复用（systemQueue=false 时启用重名校验，:176-195）——antd 侧注意两处消费。

| 字段 | 控件/默认值/校验 | 联动 | 锚点 |
|---|---|---|---|
| name | 必填，pattern `^[a-zA-Z0-9_.\-]+$` | **编辑态锁死**（newQueue=false 时 disable，:144-156；后端更新亦拒绝改名 QueueValidator:53-59） | ts :104；html :19-37 |
| topic | **无输入框**，表单持有但由 name 自动派生 `tb_rule_engine.{name}` | name 变化即覆写 | ts :120,132-136 |
| submitStrategy.type | 5 值 radio（SEQUENTIAL_BY_ORIGINATOR / SEQUENTIAL_BY_TENANT / SEQUENTIAL / BURST / BATCH），必填，每项带 tooltip hint | 选 BATCH 时显示 batchSize | 枚举+文案映射 `queue.models.ts:29-64`；radio html :49-60 |
| submitStrategy.batchSize | BATCH 时必填 min1，默认填 1000；非 BATCH 清空隐藏 | ts :207-222；html :62-81 |
| processingStrategy.type | 6 值 radio（RETRY_FAILED_AND_TIMED_OUT / SKIP_ALL_FAILURES / SKIP_ALL_FAILURES_AND_TIMED_OUT / RETRY_ALL / RETRY_FAILED / RETRY_TIMED_OUT），必填 + hint | — | `queue.models.ts:66-101`；html :95-107 |
| processingStrategy.retries | number，默认 3，min0 必填 | — | ts :115；html :110-125 |
| processingStrategy.failurePercentage | number，默认 0，min0 max100 必填 | — | ts :116；html :126-149 |
| processingStrategy.pauseBetweenRetries | number，默认 3，min1 必填 | — | ts :117；html :150-165 |
| processingStrategy.maxPauseBetweenRetries | number，默认 3，min1 必填 | — | ts :118；html :166-181 |
| pollInterval | number，默认 25，min1 必填 | — | ts :105；html :197-211 |
| partitions | number，默认 10，min1 必填 | — | ts :106；html :212-226 |
| consumerPerPartition | checkbox，默认 false | — | ts :107；html :232-234 |
| packProcessingTimeout | number，默认 2000，min1 必填 | — | ts :108；html :235-249 |
| additionalInfo.duplicateMsgToAllPartitions | checkbox，默认 false | — | ts :124；html :257-259 |
| additionalInfo.customProperties | textarea（hint：key=value） | — | ts :123；html :260-264 |
| additionalInfo.description | textarea（hint：仅内部使用） | — | ts :122；html :265-269 |

- 表单布局：三个默认展开的折叠面板「Submit settings / Processing settings / Polling settings」（html :38-255）+ additionalInfo 区（:256-270）
- 详情页/抽屉按钮：Delete（Main 隐藏）、Copy Id（toast `queue.idCopiedMessage`，`queue.component.ts:78-87`）

## 3. notifications 域（outgoing-mail + notifications 两个 tab）

### 3.1 outgoing-mail（SYS，ui-antd 已交付——回归口径）

- 字段全集（`mail-server.component.ts:69-98`）：mailFrom 必填；providerId 预设下拉（CUSTOM + 后端模板，默认 CUSTOM）；connection 折叠面板：smtpProtocol(smtp/smtps，默认 smtp) / smtpHost(默认 localhost 必填) / smtpPort(默认 25，pattern + ≤5 位) / timeout(默认 10000，6 位数字) / enableTls → tlsVersion 四选（TLSv1/1.1/1.2/1.3，:56,338-344）/ enableProxy → proxyHost/proxyPort(1-65535)/proxyUser/proxyPassword
- 认证区：username；Basic/OAuth2 toggle（enableOauth2）；Basic 侧 changePassword 复选闸门控制 password 输入显示（保存后 `showChangePassword` 复位 true，:154-161,355-366）；OAuth2 侧 clientId(≤255)/clientSecret(≤2048)/providerTenantId(仅 OFFICE_365)/authUri/tokenUri(URL pattern，CUSTOM 可编辑、预设锁定)/scope(string items)/redirectUri(只读 + copy)
- 预设联动：选非 CUSTOM 预设即用后端模板覆写 smtp/TLS/URI/scope 并清空 oauth2/proxy（:232-265）；OFFICE_365 用 providerTenantId 替换模板里 `%s` 派生 authUri/tokenUri（:223-230）
- redirectUri 构造器：domainForm(scheme 默认 HTTPS + name 默认当前 hostname) → `{scheme}://{host}{loginProcessingUrl}`（:123-129,268-282,374-382）
- 动作：Send test mail（`POST /api/admin/settings/testMail`，:346-353）；Save（`POST /api/admin/settings` key=mail，:355-366；提交前剥 changePassword、password 为 null 时剥除，:410-417）；Generate/Update access token（`GET /api/admin/mail/oauth2/authorize` 后整页跳转 IdP，:368-372；回调 `/api/admin/mail/oauth2/code` AdminController:444）
- **ui-antd 现状**：`ui-antd/src/pages/settings/outgoing-mail/index.tsx` 已按同语义实现（预设覆写、OFFICE_365 派生、change-password 闸门、redirect-URI 构造、generate-token 跳转）。M14 对此页只需回归验收，无需重做

### 3.2 notifications tab（SYS+TENANT 同页两形态，`sms-provider.component.*`）

- **SYS_ADMIN 形态**：多一张「SMS provider」卡（html :18-52，helpId smsProviderSettings :25）——`tb-sms-provider-configuration` 单控件（type 选择 + 按 type 切换子表单，`sms-provider-configuration.component.ts:81-96,117-120`）+ Send test sms + Save。数据存 admin settings key=`sms`（GET 带 ignoreErrors，未配置时静默空表单 :67-81；save :101-109）
- **TENANT_ADMIN 形态**：只有「Slack settings」卡（botToken 单输入，html :53-74，helpId slackSettings）——这是通知中心 SLACK 投递方式的 provider 配置入口（M12 §4 已登记归 M14）
- **MOBILE_APP 卡（SYS only）**：Firebase service account JSON 文件上传（tb-file-input，accept .json，html :75-95）
- 保存链（notification settings）：GET `POST /api/notification/settings`（`notification.service.ts:99-105`）；保存时 deepTrim + **逐投递方式清洗**——任一字段为空串即删除整个 method 配置，否则补 `method` 字段（`sms-provider.component.ts:130-148`）
- confirmForm 双表单：smsProvider dirty 则盯 smsProvider，否则盯 notificationSettingsForm（:111-113）
- Send test sms 弹窗（`send-test-sms-dialog.component.ts`）：numberTo（pattern `^\+[1-9]\d{1,14}$`）+ message（必填 ≤1600，:59-62）→ `POST /api/admin/settings/testSms`（带表单当前 providerConfiguration，不必先保存，:69-87）
- SMS provider 三类型（`settings.models.ts:140-152`，**无 smtp 型**）：
  - AWS_SNS：accessKeyId / secretAccessKey(password) / region（默认 us-east-1）（aws html :20-40；createSmsProviderConfiguration :426-433）
  - TWILIO：numberFrom（pattern 放行 MG/PN 前缀 sender id）/ accountSid / accountToken（twilio html :20-45；:434-441）
  - SMPP：protocolVersion(3.3/3.4) / host / port / systemId / password 必填，systemType/bindType(TX/RX/TRX)/serviceType/sourceAddress/TON/NPI×2/addressRange/codingScheme(14 值) 选填（smpp ts :86-102；枚举表 settings.models.ts:184-372；默认值 :442-461）
  - 整体校验器按 type 分支（:381-414）

## 4. home tab（TENANT）与 `/home` 落地页的关系

- **`/settings/home`（HomeSettingsComponent，TENANT only）= 租户首页仪表盘选择器**：两个字段——dashboardId（tb-dashboard-autocomplete，scope=tenant、不自动选第一个）+ hideDashboardToolbar（checkbox，默认 true）（ts :47-50；html :37-47）。读 `GET /api/tenant/dashboard/home/info`、存 `POST /api/tenant/dashboard/home/info`（`dashboard.service.ts:142-149`；后端 TENANT_ADMIN only DashboardController:472-473,492-493）。保存即写 `HomeDashboardInfo{dashboardId, hideToolbar}`（ts :58-71）
- **`/home`（home-links，三角色共有）= 登录后落地页**：菜单分区链接网格（homeSections$，`home-links.component.ts:39`）+ 若租户设置了 home dashboard 则整页渲染该 dashboard（resolver 先 `GET /api/dashboard/home`，没有则回退各角色静态 JSON `/assets/dashboard/{sys_admin|tenant_admin|customer_user}_home_page.json`，`home-links-routing.module.ts:39-41,106-120`）
- **SYS_ADMIN 没有 home settings tab**：路由（§1.1）与菜单（§1.3）均无；SYS 的 `/settings` 默认落到 general
- 结论（裁决材料）：ngx 中「home settings」= TENANT 的仪表盘选择配置（2 字段表单）；「home 首页」= 全角色落地页（链接网格 + dashboard 渲染）。前者是 M14 settings tab 清单项，后者是 M15「home 首页」段的工作面

## 5. security-settings/general（密码策略页，SYS only）

> 单页两卡两保存链（`security-settings.component.ts`）。TENANT 无此页（§1.2/§1.3）。

### 5.1 Security Settings 卡（helpId securitySettings）

- General policy 组（html :35-107）：

| 字段 | 校验 | 锚点 |
|---|---|---|
| maxFailedLoginAttempts | min0（空=不锁定） | ts :79 |
| userLockoutNotificationEmail | email 格式 | ts :80 |
| userActivationTokenTtl | 必填 1-24（默认 24，单位小时） | ts :81 |
| passwordResetTokenTtl | 必填 1-24（默认 24，单位小时） | ts :82 |
| mobileSecretKeyLength | min1 | ts :83 |

- Password policy 组（ts :84-97；html :109-247）：

| 字段 | 校验 | 锚点 |
|---|---|---|
| minimumLength | 必填 6-50 | ts :86 |
| maximumLength | min6 + 自定义校验「不得小于 minimumLength」（lessMin 错误） | ts :87,136-146 |
| minimumUppercaseLetters / minimumLowercaseLetters / minimumDigits / minimumSpecialCharacters | 各 min0 | ts :88-91 |
| passwordExpirationPeriodDays | min0（0=不过期） | ts :92 |
| **passwordReuseFrequencyDays** | min0（0=不限制）——**TS 接口 `UserPasswordPolicy` 漏声明此字段但表单有、后端有**（`UserPasswordPolicy.java:47`） | ts :93 |
| allowWhitespaces | checkbox 默认 true | ts :94 |
| forceUserToResetPasswordIfNotValid | checkbox 默认 false，带 hint tooltip「改策略后存量密码不合规是否强制重置」 | ts :95；html :240-244 |

- 保存：merge 后 `POST /api/admin/securitySettings`（ts :115-120）；Undo 按钮（:148-150, html :249-253）；ConfirmOnExitGuard 盯 dirty 的那张卡（:221-223）
- **无 pwned-password（HIBP）检查、无密码历史条数（只有 reuse 天数）、无强制 2FA 开关**

### 5.2 JWT settings 卡（helpId jwtSecuritySettings，同页第二卡）

- 字段（ts :101-113）：tokenIssuer 必填；tokenSigningKey 必填 + base64 解码后长度 ≥64（:206-219）+ Generate key 按钮（`base64(randomAlphanumeric(64))`，:173-179）；tokenExpirationTime 必填 60-2147483647 秒；refreshTokenExpTime 必填 900-2147483647 且**必须大于 tokenExpirationTime**（:191-204）
- 保存链最重的交互：issuer 或 key 被改动时先弹确认框（`admin.jwt.info-header/info-message`，:160-171）→ `POST /api/admin/jwtSettings` **返回新 token 对** → 就地 `setUserFromJwtToken` 换发当前会话 → 回读刷新表单（:122-134）

## 6. trendz tab（TENANT）

- 字段三件（ts :45-50）：isTrendzEnabled checkbox（默认 false）；trendzUrl（pattern `https?://...`，**启用时追加 required**，:61-71）；apiKey（pattern `\S+`，保存时 trim，:87-96）
- 保存：`POST /api/trendz/settings`（`trendz-settings.service.ts:34-36`）+ **同步 dispatch `ActionAuthUpdateTrendzSettings` 进前端 auth 状态**（ts :98-102；reducer `auth.reducer.ts:113`）——菜单/入口按此状态显隐，antd 需要对等的全局状态位
- 模型 `{enabled, baseUrl, apiKey}`（`trendz-settings.models.ts:17-27`）；读 `GET /api/trendz/settings`（后端 GET 还放行 CUSTOMER_USER，`TrendzController.java:73-74`）
- **PE 属性判定（裁决材料）**：Trendz 是 ThingsBoard 外售的分析产品，但「连接配置」页在本仓 CE 后端（TrendzController + dao 层 trendz settings）与 ngx 前端都完整存在，无任何 PE-only 门控代码——它不是 PE-gated 页面，只是一个「外部服务连接器」表单；无测试连接按钮
- helpId trendzSettings；无测试/预览动作

## 7. ai-models tab（TENANT，列表 + 大编辑对话框）

### 7.1 路由与列表（`ai-model-routing.module.ts`、`ai-model-table-config.resolve.ts`）

- `/settings/ai-models` TENANT only，**settings 树内一员**（admin-routing :369 展开），无详情子路由；独立模块声明表头组件（`ai-model.module.ts:23-33`；对话框组件声明在 `home-components.module.ts`）
- 列表：selection + rowPointer + **detailsPanelEnabled=false**（:48-51）→ 行点击即开编辑对话框（handleRowClick，:81-84）；自定义表头（标题 + helpId aiModels，`ai-model-table-header.component.html:18-21`）；新增对话框宽 850px（:56）
- 列四根（:61-68）：createdTime(170px，默认排序 DESC :57) / name(33%) / provider(33%，显示译文) / modelId(33%)
- 动作：行内 Edit（:91-99）；删除单条+批量，确认四件套含模型名（:70-75，`DELETE /api/ai/model/{id}`）；搜索/分页通用默认（entity 注册 `entity-type.models.ts:501-510`，搜索文案复用 `action.search`）；**无导出/导入**（import-export 零引用）、无详情页、无批量编辑

### 7.2 编辑对话框（`ai-model-dialog.component.*`）

| 区块 | 内容 | 锚点 |
|---|---|---|
| name | 必填 ≤255 + 非空白 pattern | ts :99；html :37-51 |
| provider | 9 值下拉：OPENAI / AZURE_OPENAI / GOOGLE_AI_GEMINI / GOOGLE_VERTEX_AI_GEMINI / MISTRAL_AI / ANTHROPIC / AMAZON_BEDROCK / GITHUB_MODELS / OLLAMA（默认 OPENAI） | 枚举 `ai-model.models.ts:60-84`；html :57-66 |
| providerConfig | **按 provider 白名单启停**：OPENAI=[baseUrl, apiKey]；AZURE=[apiKey, endpoint, serviceVersion]；GEMINI=[apiKey]；VERTEX=[projectId, location, serviceAccountKey(文件), fileName]；MISTRAL=[apiKey]；ANTHROPIC=[apiKey]；BEDROCK=[region, accessKeyId, secretAccessKey]；GITHUB=[personalAccessToken]；OLLAMA=[baseUrl] | AiModelMap `ai-model.models.ts:103-226`；启停逻辑 ts :206-220；字段渲染 html :68-249 |
| OPENAI baseUrl 特例 | 默认 `https://api.openai.com/v1`；**baseUrl 改为非官方地址时 apiKey 变选填**（自建网关语义） | ts :80,145-148,184-194 |
| OLLAMA auth 特例 | 仅 OLLAMA 显示认证区：NONE/BASIC/TOKEN toggle → BASIC 显 username+password、TOKEN 显 token（带 hint） | ts :159-173,214-219；html :198-249 |
| modelId | 必填，tb-string-autocomplete 候选来自**前端静态清单**（各 provider 硬编码型号列表；AZURE 显示名 deployment name；清单为空的 provider 即自由输入） | html :256-266；fetchOptions ts :178-183 |
| 采样参数 | 按 provider 白名单渲染 number 行：temperature/topP/topK/frequencyPenalty/presencePenalty/maxOutputTokens/contextLength（temperature min0、topP 0.1-1、topK min0，各带 hint tooltip） | ModelFieldsAllList `ai-model.models.ts:101`；html :268-373 |
| 动作 | Cancel / **Check connectivity**（表单未保存也可测，invalid 时禁用）/ Save（dirty+invalid 禁用） | html :379-397 |

- **Check connectivity**：弹窗即发 `POST /api/ai/model/chat`，探测消息硬编码 "What is the capital of Ukraine?"，maxRetries=0 timeout=20s；SUCCESS 显示成功态，否则解析 errorDetails 展示（`check-connectivity-dialog.component.ts:48-82`）
- 保存：`POST /api/ai/model`（deepTrim，ts :243-246）；对话框标题恒为 `ai-models.ai-model`（ts :61，未随 add/edit 切换——上游小瑕疵，antd 无需照抄）
- 消费面：`entity.service.ts` 通用实体解析已注册 AI_MODEL（:189-190,485-487）；规则链 AI 节点消费同套 provider 配置与 `aiRuleNodeResponseFormats`（`ai-model.models.ts:234-242`）——antd 若做 ai-models 页，规则节点域是后续集成点（不在本段）

## 8. repository / auto-commit 入口登记（细节归 scout-vc）

- 路由：`/settings/repository`、`/settings/auto-commit`，均 TENANT only + ConfirmOnExitGuard（`admin-routing.module.ts:333-356`）；组件 `repository-admin-settings.component.*` / `auto-commit-admin-settings.component.*`（表单细节不在本盘点）
- 菜单：TENANT Settings 分组第三、四项（`menu.models.ts:993-1006`）
- 服务端（`admin.service.ts`）：repository get/save（保存后 clearBranchList 清 VC 分支缓存，:85-97）/ delete（:99-105）/ checkAccess（:107-110）/ info（:112-114）；auto-commit get / exists / save / delete（:116-131）；模型 `RepositorySettings` / `AutoCommitSettings`（`settings.models.ts:477-498`）

## 9. 服务端点全表（本段相关）

| 函数 | 端点 | 角色 | 锚点 |
|---|---|---|---|
| QueueService.getTenantQueuesByServiceType | GET /api/queues?serviceType= | SA+TA | `queue.service.ts:43-48` |
| QueueService.getQueueById / getQueueByName | GET /api/queues/{id}、/api/queues/name/{name} | SA+TA | :35-41 |
| QueueService.saveQueue | POST /api/queues?serviceType= | SA | :50-52 |
| QueueService.deleteQueue | DELETE /api/queues/{id} | SA | :54-56 |
| QueueService.getQueueStatistics* | GET /api/queueStats* | （api-usage 域消费，本页不用） | :62-83 |
| AdminService.get/saveAdminSettings | GET/POST /api/admin/settings[/{key}] | 按 key | `admin.service.ts:48-55` |
| AdminService.sendTestMail / sendTestSms | POST /api/admin/settings/testMail、/testSms | SA | :57-65 |
| AdminService.get/saveSecuritySettings | GET/POST /api/admin/securitySettings | SA | :67-75 |
| AdminService.get/saveJwtSettings | GET/POST /api/admin/jwtSettings | SA（save 返回新 token 对） | :77-83 |
| AdminService.getMailConfigTemplate | GET /api/mail/config/template | SA+TA | :149-151 |
| AdminService.getLoginProcessingUrl / generateAccessToken | GET /api/admin/mail/oauth2/loginProcessingUrl、/authorize | SA | :141-147 |
| NotificationService.get/saveNotificationSettings | GET/POST /api/notification/settings | SA+TA | `notification.service.ts:99-105` |
| DashboardService.get/setTenantHomeDashboardInfo | GET/POST /api/tenant/dashboard/home/info | TA | `dashboard.service.ts:142-149` |
| TrendzSettingsService.get/saveTrendzSettings | GET/POST /api/trendz/settings | TA（读 +CU） | `trendz-settings.service.ts:30-36` |
| AiModelService.save/get/getById/delete | /api/ai/model 族 | TA | `ai-model.service.ts:34-48` |
| AiModelService.checkConnectivity | POST /api/ai/model/chat | TA | :50-52 |

## 10. i18n key 域与帮助

- `admin.*`（163 键，本段相关子域）：`queue-name/queue-partitions/queue-submit-strategy/queue-processing-strategy/queues`；`sms-provider*`（type 三译名）、`number-from/twilio-*/aws-*`、`send-test-sms/test-sms-sent/sms-message*`；`slack-settings/slack-api-token`、`mobile-settings/firebase-service-account-file/select-firebase-service-account-file`；`outgoing-mail*`、`mail-from*`、`enable-tls/tls-version/enable-proxy/proxy-*`、`oauth2.*`（basic/oauth2/client-id/client-secret/microsoft-tenant-id/authorization-uri/token-uri/scope/redirect-uri/generate-access-token/token-status-*）；`notifications-settings`；`home-settings` + `dashboard.home-dashboard/home-dashboard-hide-toolbar`；`trendz/trendz-settings/trendz-url*/trendz-api-key/trendz-enable`；`security-settings/general-policy/password-policy/minimum-password-length*/maximum-password-length*/minimum-uppercase-letters…/password-expiration-period-days*/password-reuse-frequency-days*/allow-whitespace/force-reset-password-if-no-valid*/max-failed-login-attempts*/user-lockout-notification-email/user-activation-token-ttl*/password-reset-token-ttl*/mobile-secret-key-length*`；`jwt.*`（security-settings/issuer-name*/signings-key*/generate-key/expiration-time*/refresh-expiration-time*/info-header/info-message）
- `queue.*`（68 键）：strategies.*（11 个 label+hint）、batch-size*、retries*/failure-percentage*/pause-between-retries*/max-pause-between-retries*、poll-interval*、partitions*、consumer-per-partition、processing-timeout*、duplicate-msg-to-all-partitions、custom-properties*、description*、delete/delete-queue-*/delete-queues-*、copyId/idCopiedMessage、add/details/search（实体注册）
- `ai-models.*`（80 键）：`ai-providers.*` 9 译名、authentication(-type.*)、api-key-open-ai-required、deployment-name*、temperature/top-p/top-k/…/-hint、check-connectivity、delete-model(s)-*、no-found、selected-fields、add
- 菜单：`security.security`；实体注册：QUEUE `entity.type-queue`（`entity-type.models.ts:367-375`，helpLinkId=queue :626-630，详情 URL=/settings/queues :692）、AI_MODEL `entity.type-ai-model(s)`（:501-510，helpLinkId=aiModels :657-661，**无详情 URL 注册**）
- 帮助 helpId 清单：`outgoingMailSettings`、`smsProviderSettings`、`slackSettings`、`securitySettings`、`jwtSecuritySettings`、`trendzSettings`、`aiModels`（+实体 `queue`）。本地 assets 无这些 md（`assets/help/en_US/` 仅 rulechain/notification 等域），运行时从远端 helpBaseUrl 拉取；antd 侧可自定（跳官方文档或省略）

## 11. 「无」清单（本版 ngx 没有的 settings 能力，只认本仓源码）

- 密码策略：**无 pwned-password（HIBP）泄露检查**；无「密码历史条数」维度（只有 reuse 频率天数）；无强制 2FA 开关；passwordReuseFrequencyDays 后端有、ngx TS 接口漏声明（仅表单持有）
- queues：**无 topic 输入框**（自动派生 `tb_rule_engine.{name}`，不可自定义）；无 ServiceType 切换（锁 TB_RULE_ENGINE）；无队列统计 UI（queueStats 端点归 api-usage 域）；Main 保护仅前端，后端无
- notifications tab：SMS provider 无 smtp 型（AWS_SNS/TWILIO/SMPP 三种）；无 EMAIL 卡（email 投递配置在 outgoing-mail 独立 tab）；deliveryMethodsConfigs 只暴露 SLACK 与 MOBILE_APP 两键（无其余投递方式配置 UI）；test sms 仅 SYS 可用（端点 SA only）
- home：无 SYS 版 home settings；除 dashboardId + hideDashboardToolbar 外无任何展示配置
- trendz：无测试连接按钮；无每租户启停之外的粒度
- ai-models：无详情路由页；无导出/导入；无批量编辑；模型候选是**前端静态硬编码清单**（无 models API），部分 provider（AZURE/GITHUB/BEDROCK/OLLAMA）清单为空即自由输入；对话框标题不区分新增/编辑（上游小瑕疵）
- 通用：settings 各 tab 无任何导出/导入；无操作审计视图（审计在 audit-logs 域）

## 12. 工作量分级 + 裁决点

**工作量分级**（相对标尺：M11 资源库五合一=大量、M12 templates 一页=中量）：

| 块 | 量级 | 重心 |
|---|---|---|
| queues | **中偏大** | 嵌套策略表单（5+6 radio 白名单 hint、BATCH 条件字段、11 个数字字段校验矩阵）+ Main 前端保护 + 详情页路由 |
| notifications（sms+slack+mobile） | 中 | 三 provider 子表单 + testSms 弹窗 + 保存时投递方式清洗；SYS/TENANT 双形态同页 |
| outgoing-mail | 0（已交付） | 仅回归验收 |
| home | **极小** | 2 字段表单 + 1 端点 |
| trendz | **极小** | 3 字段表单 + 全局状态位 |
| ai-models | **中偏大** | 9 provider 字段白名单矩阵 + 静态型号清单 + connectivity 弹窗 |
| security-settings/general | 中 | 两卡两保存链；JWT 卡的就地换发 token 交互链 |
| repository / auto-commit | （scout-vc 定） | — |

建议交付顺序：home + trendz（速赢）→ security-settings → notifications → queues → ai-models（最重殿后）；repository/auto-commit 按 scout-vc 结论插排。

**裁决点（需 panel-scope 拍板）**：

1. **「六小件」vs 七项出入**：spec §6 标题写六小件、列了 queues/notifications/home/repository/auto-commit/trendz/ai-models 七项。倾向：按七项收口（标题勘误），repository/auto-commit 深度归 scout-vc；依据本盘点 §1/§8 的路由-菜单事实。
2. **outgoing-mail 是否入 M14 清单**：ui-antd 已交付同语义页面（`ui-antd/src/pages/settings/outgoing-mail/index.tsx`）。倾向：不重做，M14 只保留「notifications tab」并在走查时对 outgoing-mail 做回归；spec §6 若写「notifications settings」应注明 mail 部分已交付。
3. **trendz 实施还是登记不实施**：本仓 CE 后端与 ngx 均有完整 trendz settings（无 PE 门控；Trendz 本身是外部产品，此页只是连接配置，见 §6）。倾向：**随 M14 实施**——3 字段成本极低且 menu 状态位影响导航一致性；若 fork 本土化决定砍 Trendz 概念，则应整链登记不实施（含菜单项），不留「有路由无菜单」的半成品。
4. **home settings 归 M14 还是 M15**：倾向 **M14 做配置页本身**（spec §6 明列；工作量极小），其**生效面**（登录落点 → tenant home dashboard 渲染、/home 链接网格）属 M15 §7「home 首页」；M14 验收口径需写明「保存成功即达标，页面效果待 M15」。注意 SYS 无此 tab、`/home` 是三角色落地页（§4），勿把两者混写。
5. **Main 队列删除保护口径**：ngx 仅前端禁删/禁选，后端可删（§2.1）。倾向：antd 等价实现（禁用勾选与删除 + 提交吃外键报错），并登记「API 层无 Main 保护」为已知边界；是否给 fork 后端补保护另立 issue，不进 M14。
6. **密码策略字段口径**：antd 应把 `passwordReuseFrequencyDays` 补进 TS 类型（后端已有，`UserPasswordPolicy.java:47`）；**pwned-password 检查本版不存在，spec 若有此期望按「登记不实施」处理**。JWT 卡是否随密码策略页一起交付：倾向随页交付（ngx 同页两卡；JWT 保存会就地换发当前会话 token，交互链必须整体对齐）。
7. **ai-models 交互形态与型号清单**：ngx=850px 对话框（无详情页、行点击即编辑）。antd 可沿用 drawer/dialog 二选一，但「未保存即可测连通性」（POST /api/ai/model/chat 探测）建议保留——它是唯一可用的配置验证手段。静态型号清单（硬编码 2025-2026 型号名）倾向原样搬迁（fork 可自行增删），不为其发明 API。
8. **notifications tab 的 TENANT 形态**：TENANT 只有 Slack botToken 一张卡（mobile 卡 SYS only，SMS provider 卡 SYS only）。倾向照切；M12 登记的「EMAIL/SMS/SLACK/MOBILE_APP provider 配置入口」在本 tab 落地时，EMAIL 指向 outgoing-mail（已交付）、SMS 指向 SYS 卡，验收口径写清角色边界。
