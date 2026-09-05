# M12 ui-ngx 通知族操作面盘点（工作文档，agents 用）

> 由 scout-ngx 盘点产出（2026-09-05）。spec §4 与实现者的对照基准；随 M12 收尾可归档或删除。
> 注：`sent-notification-dialog.componet.ts` 在仓库中文件名拼错（componet），锚点按此拼写。

## 关键文件

- 路由/模块：`ui-ngx/src/app/modules/home/pages/notification/notification-routing.module.ts`
- inbox：`.../pages/notification/inbox/{inbox-table-config.resolver.ts, inbox-table-header.component.ts/.html, inbox-notification-dialog.component.ts/.html}`
- sent：`.../pages/notification/sent/{sent-table-config.resolver.ts, sent-notification-dialog.componet.ts/.html, sent-error-dialog.component.ts/.html}`
- recipient：`.../pages/notification/recipient/{recipient-table-config.resolver.ts, recipient-notification-dialog.component.ts/.html}`
- rule：`.../pages/notification/rule/{rule-table-config.resolver.ts, rule-notification-dialog.component.ts/.html, escalations.component.ts/.html, escalation-form.component.ts/.html}`
- template：`.../pages/notification/template/{template-table-config.resolver.ts, template-notification-dialog.component.ts/.html, template-configuration.ts, configuration/notification-template-configuration.component.ts/.html, configuration/notification-action-button-configuration.component.ts}`
- 共享：`ui-ngx/src/app/shared/models/notification.models.ts`、`ui-ngx/src/app/core/http/notification.service.ts`、`ui-ngx/src/app/shared/components/notification/{notification.component.ts/.html, template-autocomplete.component.ts}`
- 顶栏：`ui-ngx/src/app/modules/home/components/notification/{notification-bell.component.ts/.html, show-notification-popover.component.ts/.html, send-notification-button.component.ts/.html}`

## 1. 路由与权限

- `/notification`（五子 tab），auth=[TENANT_ADMIN, CUSTOMER_USER, SYS_ADMIN]，tabs 头部挂 SendNotificationButton（`notification-routing.module.ts:30-40`）
- `/notification/inbox`：三角色（:50-63）
- `/notification/sent`：TENANT + SYS（:64-77）
- `/notification/templates`：TENANT + SYS（:78-91）
- `/notification/recipients`：TENANT + SYS（:92-105）
- `/notification/rules`：TENANT + SYS（:106-119）
- 菜单五入口：`menu.models.ts:244-306`
- 结论：CUSTOMER_USER 只能看收件箱，其余四页 TENANT/SYS only；角色差异深入到对话框内部（trigger/target/filter 候选按 authority 收缩）

## 2. inbox 收件箱（列表页，无新增）

- 列表：只读表，列 createdTime/type/subject/text，subject/text 经 HTML sanitize 渲染（`inbox-table-config.resolver.ts:57-60,95-103`）
- 默认排序 createdTime DESC（:73）；分页/列排序/搜索走通用 EntitiesTable
- 未读/全部 toggle，切换重置排序与过滤（`inbox-table-header.component.html:18-25`、fetch 带 unreadOnly `:70-71`，默认 unreadOnly=true :80-82）
- 行点击 → 详情对话框（tb-notification 全量渲染），关闭时标已读（:75-78,155-171）
- 行内「标记已读」（仅未读行；末页最后一行已读后自动翻上一页）（:111-118,133-153）
- 「全部标记已读」（unreadOnly 模式下 resetSortAndFilter）（:88-93,120-131）
- 删除：单条 + 批量 + 确认文案（:60-74）
- 无编辑/新增；type 列显示 NotificationType 译名（:97-98）

## 3. sent 发送/已发通知

- 列表：无搜索框（searchEnabled=false :65）、无新增按钮，列 createdTime/status/deliveryMethods/templateName（:90-100）
- status 列：SCHEDULED/PROCESSING/SENT 彩色徽标 + 失败数红色 badge「N 次失败 >」（:92-94,147-176）
- 点击失败 badge → 失败明细对话框（按投递方式分组，error key chip + 错误文本）（:81-86、`sent-error-dialog.*`）
- 行内「再次发送」（SCHEDULED 时禁用）（:107-133）
- 删除：单条 + 批量（:69-74）；默认 createdTime DESC（:88）

**发送向导对话框**（复用三入口：顶栏按钮、sent 页、notify-again）：
- 三步 stepper：Setup → Compose（仅「从零开始」）→ Review（html :33-40,153-167,168-277；校验 allValid ts :267-277）
- Setup：从零开始/使用模板 toggle（联动启停 template :140-151）；模板下拉（只列 GENERAL 类型，可搜索/可新建/可编辑 :219-246）
- 接收人多选（NOTIFICATION_TARGET，按 GENERAL 过滤）+「新建接收人」快捷入口（ts :297-318）
- 投递方式开关组（WEB 常亮强制、atLeastOne 校验、可用方式来自 GET /deliveryMethods、不可用禁用并归零、刷新按钮）（html :62-108；ts :361-382）
- 投递方式权限门：WEB 任何人可发不可配置；SYS_ADMIN 可配所有；TENANT_ADMIN 仅 SLACK 可配；其余「联系管理员」tooltip；跳转 /settings/outgoing-mail(EMAIL)、/settings/notifications(SMS/SLACK/MOBILE_APP)（ts :324-359）
- 定时发送 additionalConfig（enabled + 时区 + 时间，min=当前、max=+7 天，提交换算 sendingDelayInSec）（ts :131-163,251-295）
- Compose：tb-template-configuration（GENERAL，预填 deliveryMethodsTemplates）
- Review：POST /notification/request/preview（ts :235-249）；接收总数、按 target 计数、接收人 chips；按启用方式渲染六种预览块（html :202-274）
- 底部 Back/Next/Send（:281-289）；提交 POST /api/notification/request（ts :227-233）

## 4. recipients 接收人

- 列表：新增/行点击编辑/删除单条+批量（`recipient-table-config.resolver.ts:56-83`）；列 createdTime/name/类型/描述
- 对话框：name 必填；类型 radio 三选 PLATFORM_USERS / SLACK / MICROSOFT_TEAMS（html :44-52）
- PLATFORM_USERS → usersFilter 下拉（ts :88-221）：
  - ALL_USERS（无附加字段）
  - TENANT_ADMINISTRATORS：仅 SYS_ADMIN 见「按租户/租户配置档」toggle → tenantsIds 或 tenantProfilesIds 多选（html :66-102）
  - CUSTOMER_USERS → customerId 自动补全
  - USER_LIST → usersIds 多选
  - ORIGINATOR_ENTITY_OWNER_USERS / AFFECTED_USER（无附加字段，选项存在）
  - SYSTEM_ADMINISTRATORS / AFFECTED_TENANT_ADMINISTRATORS：仅 SYS_ADMIN 可见
- SLACK → 会话类型 radio（公开/私有频道/私聊）+ Slack 会话自动补全（html :126-141）
- MICROSOFT_TEAMS → useOldApi 开关（新 API workflow-url / 旧 API webhook-url 标签切换 + 弃用公告外链）+ webhookUrl + channelName（html :143-173）
- description 文本域；保存 POST /api/notification/target（ts :192-204）

## 5. rules 通知规则（工作量核心）

- 列表：新增/行点击编辑/删除单条+批量（`rule-table-config.resolver.ts:57-86`）；列 createdTime/name/templateName/triggerType/描述
- 行内：启用/停用 toggle（直接 saveNotificationRule）+「复制规则」（:93-144）
- 对话框 stepper：基本设置 → 触发器设置（按 triggerType 动态步骤）（html :34-118）
- 基本：name / enabled 开关 / triggerType 下拉 / 模板选择（allowCreate/allowEdit，候选按 triggerType 过滤 :255-265）
- 接收面二分：非 ALARM → targets 多选 + 新建接收人快捷入口；ALARM → 升级链 escalations + clearRule（仅升级链 >1 级时可配 :223-231,508-510）
- 升级链：首行固定 0 秒，后续「在 X 之后通知」间隔（min 1 分钟 max 7 天）+ targets 多选 + 新建接收人；添加阶段/行删除（`escalations.*`、`escalation-form.*`；数据 `{delayInSec: targets[]}`）
- 编辑时 triggerType 锁定；复制时名称追加 "(copy)"（ts :374-386）

**触发类型 14 种**（`notification.models.ts:674-706`；按角色收缩 ts :520-534）：
- TENANT/SYS 都可见（8）：ALARM、DEVICE_ACTIVITY、ENTITY_ACTION、ALARM_COMMENT、ALARM_ASSIGNMENT、RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT、EDGE_CONNECTION、EDGE_COMMUNICATION_FAILURE
- 仅 SYS_ADMIN（6）：ENTITIES_LIMIT、API_USAGE_LIMIT、NEW_PLATFORM_VERSION、RATE_LIMITS、TASK_PROCESSING_FAILURE、RESOURCES_SHORTAGE
- 默认值：SYS=ENTITIES_LIMIT、TENANT=ALARM（:200）

各 trigger 配置表单（triggerConfig 字段）：
- ALARM（ts :246-255；html :119-170）：alarmTypes(字符串列表) / alarmSeverities(多选) / notifyOn(必填多选 CREATED|SEVERITY_CHANGED|ACKNOWLEDGED|CLEARED，默认 CREATED) / clearRule.alarmStatuses(多选，仅升级链>1 级启用)
- DEVICE_ACTIVITY（:257-276）：filterByDevice(设备/设备配置档 toggle) → devices 或 deviceProfiles 二选一 / notifyOn(ACTIVE|INACTIVE，默认 INACTIVE)；保存时删 filterByDevice（:447-449）
- ENTITY_ACTION（:278-285）：entityTypes(多选，排除清单 :536-549) / created / updated / deleted 三开关
- ALARM_COMMENT（:287-295）：alarmTypes / alarmSeverities / alarmStatuses / onlyUserComments / notifyOnCommentUpdate
- ALARM_ASSIGNMENT（:297-304）：alarmTypes / alarmSeverities / alarmStatuses / notifyOn(ASSIGNED|UNASSIGNED 必填)
- RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT（:306-315）：ruleChains / ruleChainEvents(STARTED|UPDATED|STOPPED) / onlyRuleChainLifecycleFailures / trackRuleNodeEvents → 展开 ruleNodeEvents + onlyRuleNodeLifecycleFailures
- EDGE_CONNECTION（:233-238）：edges(多选) / notifyOn(空=全部)
- EDGE_COMMUNICATION_FAILURE（:240-244）：edges(多选)
- ENTITIES_LIMIT（:317-322）：entityTypes(DEVICE/ASSET/CUSTOMER/USER/DASHBOARD/RULE_CHAIN) / threshold(滑杆 0-100%，提交 ÷100 :450-452)
- API_USAGE_LIMIT（:324-329）：apiFeatures(多选) / notifyOn(默认 WARNING)
- NEW_PLATFORM_VERSION（:331-335）：无配置字段
- RATE_LIMITS（:337-341）：apis(字符串列表，预定义 LimitedApi 选项)
- TASK_PROCESSING_FAILURE（:343-347）：ts 声明 taskTypes 但 UI 无输入，步骤内仅描述
- RESOURCES_SHORTAGE（:349-355）：cpuThreshold / ramThreshold / storageThreshold 三个 0-100% 滑杆（提交 ÷100）
- 每个 trigger 步骤底部 additionalConfig.description 文本域；保存把表单值并入 triggerConfig（:441-467）

## 6. templates 模板

- 列表：新增/行点击编辑/删除单条+批量/行内复制（`template-table-config.resolver.ts:55-95`）；列 createdTime/notificationType/name
- 对话框 stepper Setup → Compose（html :34-92）：name 必填 / notificationType 下拉（编辑锁定、复制加 "(copy)"）/ 类型候选按角色收缩（ts :182-197）/ 投递方式开关组 atLeastOne（`template-configuration.ts:59-99`）
- Compose：tb-template-configuration，「输入字段支持模板化」提示 + 按类型出参文档帮助弹窗（`notification-template-configuration.component.html:18-28`）

**NotificationType 17 种**（`notification.models.ts:520-538`；译名+helpId :569-672）：GENERAL、ALARM、DEVICE_ACTIVITY、ENTITY_ACTION、ALARM_COMMENT、ALARM_ASSIGNMENT、RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT、ENTITIES_LIMIT、ENTITIES_LIMIT_INCREASE_REQUEST、API_USAGE_LIMIT、NEW_PLATFORM_VERSION、RULE_NODE、RATE_LIMITS、EDGE_CONNECTION、EDGE_COMMUNICATION_FAILURE、TASK_PROCESSING_FAILURE、RESOURCES_SHORTAGE

**六种投递方式模板字段**（表单构建 :219-303）：
- WEB（:222-247）：subject(必填≤150) + body(必填≤250 纯文本) + additionalConfig.icon{enabled,icon,color} + actionButtonConfig
- MOBILE_APP（:264-288）：subject(必填≤50) + body(必填≤150) + icon + onClick（ALARM/ALARM_ASSIGNMENT/ALARM_COMMENT 有专属 hint :159-167）
- SMS（:254-257）：仅 body(必填≤320)
- EMAIL（:248-252）：subject(必填≤250) + body 必填（hugeRTE 富文本）
- SLACK（:259-263）：仅 body(必填)
- MICROSOFT_TEAMS（:289-296）：subject(可选) + body(必填) + themeColor(色板) + button(动作按钮)
- 每 method 自动注入 enabled + method；未启用方式整块禁用（:190-207）

**动作按钮**（WEB actionButtonConfig / TEAMS button / MOBILE onClick 共用，:84-126）：enabled / text(≤50，mobile 隐藏) / linkType(LINK|DASHBOARD) / link(≤300) / dashboardId / dashboardState / setEntityIdInState（linkType 联动启停）

**模板参数**：正文/主题支持 `${xxx}` 模板化，无结构化字段编辑器，仅「查看文档」按类型弹帮助；保存 POST /api/notification/template

## 7. 顶栏通知铃铛

- 挂载：home.component.html:94（另 dashboard-page、widget-editor 内嵌）
- 铃铛 + 未读徽标（≥100 显示 99+），未读数走 WS 订阅（`notification-bell.component.ts:47-56,102-109`）
- 点击开关 400px popover，打开期间暂停 count 订阅、关闭恢复（:77-100）
- popover：标题 + 全部标记已读（有通知时显示，WS 命令）；最近 6 条（:47）；未读可单条已读（WS 命令）；空态插画；底部「查看全部」跳 /notification/inbox（:87-93）
- tb-notification 渲染（`notification.component.*`）：自定义图标（additionalConfig.icon）或按 type 图标；title/message innerHTML；动作按钮（LINK 外链新窗口 / DASHBOARD 带 state 站内跳转，点击导航并关 popover）；已读隐藏「标记已读」；ALARM 未清除按严重级别着色；相对时间
- 收件箱对话框与 popover 共用 tb-notification

## 8. 范围边界（不进 M12）

- `/settings/notifications`（SMS provider + Slack botToken + MOBILE_APP Firebase，SYS/TENANT，`admin-routing.module.ts:272-282`）→ 归 M14 settings tab
- `/account/notificationSettings`（用户级「通知类型 × 投递方式」矩阵 + reset-all + 保存，三角色）→ 登记归属待定（建议账号设置域）
- 仪表盘「未读通知」widget → widget 域，不在 M12

## 9. 工作量分级

**最重**
1. 规则向导：14 种 trigger × 配置表单（5 种带多字段联动）+ 升级链编辑器 + 角色收缩。仅 trigger 面就 ≈40 个字段控件
2. 发送向导：三步 stepper、六方式预览、投递方式探测 + 权限门、定时发送时区换算、模板/从零双模式
3. 模板对话框 + compose：六方式 × 各异校验（150/250/320/50 上限）+ EMAIL 富文本 + 动作按钮/点击动作（7 字段）+ 图标/颜色

**中**
4. recipients 对话框：3 目标类型 × 8 usersFilter 变体 + Slack/Teams 字段 + 角色差异
5. 三个标准 CRUD 表壳（recipients/templates/rules 列表）本身快；差异在行内操作（启用 toggle、复制、失败 badge）

**可简化（能力级登记）**
- NEW_PLATFORM_VERSION / TASK_PROCESSING_FAILURE：无（UI）配置字段，可合并「无配置 trigger」一条
- EDGE_CONNECTION / EDGE_COMMUNICATION_FAILURE：可合并「Edge 类 trigger」一条
- 7 种平台级 NotificationType 仅 SYS_ADMIN 场景，可整组登记后置
- CUSTOMER_USER 差异只落在「只读 inbox + 无发送按钮」，一条权限契约项
- inbox / 铃铛逻辑简单，建议首块交付
