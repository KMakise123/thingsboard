# M14 验收范围与 spec §6 措辞裁决（panel-scope，工作文档）

> 由 panel-scope 镜头产出（2026-09-06）。依据五份侦察底稿（`m14-ngx-inventory-calculated-fields.md`、`m14-ngx-inventory-vc.md`、`m14-ngx-inventory-settings.md`、`m14-backend-contract.md`、`m14-implementation-notes.md`）+ spec `docs/spec/v2-subsystems-acceptance.md` §1/§2 定案原则、§4/§5 措辞样板；体例对齐 `m13-panel-scope.md`。
> 关键结论已回源码抽查复核（不采信转述）：`admin-routing.module.ts` /settings 与 /security-settings 全部 auth 数组、`menu.models.ts` SYS/TENANT 菜单分组、`device-tabs/asset-tabs/customer-tabs/device-profile-tabs/asset-profile-tabs/ota-update-tabs/edge-tabs` 七处 tab 挂载实文、fork `CalculatedFieldType.java` 七值枚举、pwned 双侧（ui-ngx + fork 后端）grep 零命中、ui-antd `DETAIL_TAB_KEYS` 与 `AlarmRulesPanel/CalculatedFieldsPanel/VersionControlPanel` 消费图谱、`config/routes.ts` settings 组、dashboard 编辑器 VC 占位按钮实文。
> **复核勘误一处**：`m14-backend-contract.md` §2 的 `CalculatedFieldType` 列表漏写 `ENTITY_AGGREGATION`——fork 后端实为七值（`CalculatedFieldType.java:17-24`），与 ngx 前端枚举（`calculated-field.models.ts:87-95`）完全一致：七型中六型进独立页、ALARM 排除。后续引用以七值为准。
> 结论速览：**范围裁决 26 项**（进 M14 实施 16、登记不实施/归后续域 6、实现口径不进 spec 4）；**§6 预计可勾选验收条目 51 条**（6.1×18 + 6.2×10 + 6.3×12 + 6.4×3 + 6.5×8）；**强制偏好项 0 个**（2 条小队内注记，见文末）。

---

## 0. 范围裁决总表

| # | 裁决项 | 定案 | 归属 | 关键依据 |
|---|---|---|---|---|
| 1 | 「settings 六小件」vs 七项出入 | **七项收口**（queues/notifications/home/repository/auto-commit/trendz/ai-models）；spec §2 里程碑表 M14 行「六小件」措辞随 §6 定稿一并勘误为「settings 七件」。outgoing-mail **不入清单**（ui-antd v1 已交付同语义页），走查单保留回归条目 | M14（6.3）；标题勘误随定稿 | ngx TENANT settings 组菜单恰六项 + queues 归 SYS Platform 组，页数与菜单项数本来就是两个口径；antd `pages/settings/outgoing-mail/index.tsx`（1004 行）在役 |
| 2 | 计算字段 ALARM 型 / alarm-rules tab | **ALARM 不进独立页**（照 ngx `calculatedFieldTypes` 过滤钉死）；alarm-rules tab 面板**归告警域**——ui-antd v1 已在 5 实体（device/asset/customer/device-profile/asset-profile）交付基础操作面（列表/建/改/删），非删减状态；其全量编辑器深化（按严重级条件树/排程/propagate/clearRule）登记增强、归告警域后续工作。VC 域的 CUSTOMER「load/export alarm-rules」文案分支照抄（属 VC 条目不属告警域） | M14 边界钉死 + 6.6 登记 | ngx 实体 tab 挂 alarm-rules 已复核（device-tabs:38-40 等 5 处）；antd `AlarmRulesPanel.tsx` 头注明写「full condition-tree / schedule editors stay with the v2 rule work」——v1 既有边界，M14 不翻案不冒领 |
| 3 | OTA 详情 VC tab | **进 M14 正式验收项**（M13 §5.6 登记兑现）：薄挂载（OTA 详情组件加 tab 复用共享 VC 面板） | M14（6.2-8） | ngx `ota-update-tabs.component.html:19-25` 实存（本镜头复核，守卫 `isTenantOtaUpdate() && TENANT_ADMIN`）；推翻 M13「ngx 无」预期的是源码事实，登记兑现即等价 |
| 4 | Edge 详情 VC tab | **钉死不做**（维持 M13 结论）：复核 `edge-tabs.component.html` 七 tab 无 VC，spec 用「无」清单锁死不凭空造 | 6.6 登记（维持 M13 §5.6 口径） | 本镜头复核 edge-tabs 全文 |
| 5 | GEOFENCING 等复杂类型取舍 | **六型全量进 M14**，交付波次放末（底座→SCRIPT→PROPAGATION→两聚合→GEOFENCING→挂载收尾）。无地图组件已源码证实（zone=引用实体 perimeter 属性的纯表单），不构成降级理由；沿 M13 R05/R07 先例：ngx 有此面就不砍 | M14（6.1-15） | ngx `geofencing-configuration.component.ts` 全量在役；fork 后端七值枚举 + GeofencingCalculatedFieldConfiguration 字段齐 |
| 6 | home settings 边界 | **配置页归 M14**（2 字段表单：dashboardId + hideDashboardToolbar），验收口径「保存成功即达标」；**生效面**（登录落点渲染 tenant dashboard、/home 链接网格）归 M15，spec 措辞互指不混写。SYS 无此 tab 钉死 | M14（6.3-5）+ M15 边界 | ngx `/settings/home` TENANT only（routes 复核）；`/home` 三角色落地页是另一张脸 |
| 7 | 密码策略页范围 | **整页交付**：SecuritySettings 卡（General policy 组 5 字段 + Password policy 组 12 字段，一卡一保存链）+ JWT 卡（含保存即签发新 token 换发会话链），照 ngx 同页两卡结构，不拆页 | M14（6.4） | ngx `security-settings.component.ts` 单页两卡两保存链（scout-settings §5 复核）；JWT 拆页会割裂「issuer/key 变更→确认→换发→回读」交互链 |
| 8 | trendz / ai-models | **随 M14 全量交付**：fork 后端端点齐备无 PE 门控（TrendzController/AiModelController 在役，四域 REST 面零 fork 提交=纯上游 4.4），ngx 4.4 CE 自带完整 UI，砍掉即删减；trendz 仅 3 字段成本极低，ai-models 中偏大殿后。trendz apiKey 对 CU 泄露另行登记缺陷（前端不建 CU 入口规避） | M14（6.3-8/9/10/11） | scout-backend §1.7/§1.8 + §6 零本土化；fork 产品方向（类 PE 重实现）既定 |
| 9 | pwned-password 检查 | **登记不实施**：本版 ngx 与 fork 后端双侧 grep 零命中（本镜头复核），spec 若有期望按「无」清单钉死 | 6.6 登记 | 本镜头双侧 grep 实证 |
| 10 | iot-hub / mobile-center | **登记不越界**：ngx 有独立域（pages/iot-hub、pages/mobile 在役）但不在 #16 M14 范围；CF 列表「Add from IoT Hub」按钮**不做**（登记 iot-hub 域依赖项） | 6.6 登记 | 本镜头 ls 实证两目录在役；ngx `iot-hub-routing.module.ts` TENANT only |
| 11 | VC 16 类型 tab 挂载清单 | 以 ui-antd 既有详情承载为事实基础定验收：**已挂 6 处回归确认**（customer/asset/device/entity-view/device-profile/asset-profile 的 VersionControlPanel 在役）+ **补挂 3 处**（OTA 详情 tab、rule-chain 详情对话框加 tab、dashboard 编辑器占位按钮接真）+ **无承载登记 4 类不实施**（widgets-bundle 管理页非 tab 壳、widget-type 详情页有路由缺口、TBResource 两处列表页无详情壳） | M14（6.2-8/9）+ 6.6 登记 | 本镜头逐页 grep 实证 6 处消费点；`dashboards/editor/shell.tsx:812-827` 占位 stub 实文；widget-type 详情头注自述路由缺口 |
| 12 | M12/M13 遗留连带 | 三件**进 M14 正式条目**：①发送向导「渠道未配置」tooltip 升级为跳 `/settings/notifications` 链接（SA/TA 有 tab 时）；②notification settings 预留函数 ×3 消费（get/save/deliveryMethods）；③VC 面板「未配仓库」降级提示补跳转链接。user 级通知偏好 ×2 函数**维持 M12 登记不实施**（账号域） | M14（6.5-1/2）+ 6.6 | M12 §4.7 明写「待 M14 settings tab 落地后补」；`wizard.tsx:641-651` 死文案实文；`VersionControlPanel.tsx:13-14` 头注自留接口 |
| 13 | queues 角色口径 | **SYS only 照 ngx**（菜单挂 SYS Platform 组、路由两段 auth 均 [SYS_ADMIN]）；TENANT 只读视图**登记不实施**（ngx 无此面）。Main 队列删除保护=antd 前端禁删禁选等价 + 「API 层无 Main 保护」登记边界，后端补保护另立 issue | M14（6.3-1/2）+ 6.6/6.7 | ngx routes 复核（queues 列表+详情均 SYS only）；后端 save/delete 仅 SYS_ADMIN（QueueController:125,149） |
| 14 | settings 组路由重组（技术定案） | antd `/settings` 组级 access 从 `canSysAdmin` 放宽为 `canSysAdminOrTenantAdmin`，子级显式收权：既有五页（general/outgoingMail/twoFa/oauth2/auditLogs）显式 `canSysAdmin`，notifications=`canSysAdminOrTenantAdmin`，home/repository/autoCommit/trendz/aiModels/security-settings=`canTenantAdmin` 或 `canSysAdmin` 按矩阵；组级是上限、子级收紧有 notifications 组先例。`/settings` 空路径重定向按角色分支（SYS→general、TENANT→home，等价 ngx redirectTo） | 实现口径，不进 spec 条目（角色矩阵进 6.0） | `config/routes.ts:447-480` 现状 + notifications 组混合角色先例；ngx 空 path redirectTo 二分实文 |
| 15 | CF 独立页详情形态 | 等价基线=「列表页 + 编辑 Dialog + 通用事件弹窗」（照 ngx 实体 tab 模式交互，操作面全覆盖）；ngx 独立页的右侧详情抽屉（debug tab）形态登记增强，不做硬门槛 | 实现口径 + 6.6 登记 | ngx pageMode rowPointer 开抽屉、tab 模式走 EventsDialog（table-config :241-255 vs :291-319）；antd notes §6 建议同 |
| 16 | SCRIPT/TBEL 编辑器选型 | 不造可视化编辑器（ngx 也无，钉死）；用 ui-antd 现有代码编辑器资产（M11 SCADA/规则链）包「参数名补全 + TBEL 高亮 + 测试按钮」，补全/高亮规则数据结构可照抄 ngx models.ts:606-1042 | 实现口径；「无专用编辑器」进 6.0 无清单 | scout-cf §14-6；M9/M11 CodeMirror 先例 |
| 17 | CF 导入导出保留度 | **保留全量**（JSON 导出 + 导入类型校验拒 ALARM + 租户引用 id 改写），对齐 fork「类 PE 功能重实现」方向；导出格式与上游互通 | M14（6.1-16） | ngx import-export.service.ts:179-190,1247-1249 |
| 18 | hasRepository 全局状态方案 | 行为契约进 spec：「页面按『仓库是否已配置』二段呈现」；实现定：antd 登录链路无该字段时进页 `GET /api/admin/repositorySettings/exists` 探测（端点后端在役），或全局 context 初值——不钉机制 | 实现口径（契约进 6.0） | ngx ngrx sysParams + 本地广播；scout-vc 裁决点 3 |
| 19 | VC diff 形态 | **现有 changed-fields 表形态保留为等价基线**（v1 面板已交付 compare-with-current，信息等价），双栏并排 JSON + 差异导航/全屏登记增强；复数版本无 diff 照 ngx 钉死 | 实现口径 + 6.6 登记 | `VersionControlPanel.tsx` 头注（diff=changed-fields table）；ngx ace-diff+jQuery 方案不复刻（scout-vc 裁决点 4 选型不采纳为硬门槛） |
| 20 | removeOtherEntities 危险开关 | **保留逐字确认**交互（输入 "remove other entities" 才生效）；验证串保留英文原文对齐验收口径，周边文案中文化 | M14（6.2-5） | ngx entity-types-version-load.component.ts:228-255 + remove-other-entities-confirm；删除全部未含实体属不可逆动作 |
| 21 | VC 凭据「留空=沿用」语义 | 行为契约进 spec：GET 永不回显三凭据字段；提交时空凭据字段必须**删字段**而非传空串（空串=覆盖为空，null=沿用）；checkAccess 同理。实现侧建议封 `stripBlankCredentials` 工具 + 端点单测钉住 | 契约进 6.0；工具为实现口径 | backend contract §5-6（Jackson 空串非 null、restore 只认 null）；scout-vc 裁决点 9 |
| 22 | Main 队列保护口径 | 前端等价：Main 行无勾选框、删除按钮隐藏（`queue.name !== 'Main'`）；提交吃后端外键 400 报错为兜底；「后端无 Main 白名单」登记缺陷边界（实际被默认 profile 引用兜底删不掉） | M14（6.3-1）+ 6.7 | ngx queues-table-config.resolver.ts:113-114 仅前端保护；BaseQueueService.java:75-89 |
| 23 | CF 服务端 8 限额参数消费 | **必接**（表单校验边界，否则 Rolling/interval 上限错）；tenant-profile 配置页暴露这 8 字段属 tenant-profile 域**不进 M14**（登记依赖） | 契约进 6.1-6；暴露面 6.6 登记 | authState 下发 8 参数（scout-cf §12）；fork 默认值链已核（DefaultTenantProfileConfiguration:174-202） |
| 24 | 用户级通知偏好落位 | **不进 M14**（维持 M12 §4.0 登记）：saveUserNotificationSettings/getUserNotificationSettings 挂账号域后续波次；M14 只消费 notification settings 三函数 | 6.6 登记（维持） | M12 登记在案；scout-antd §9.2 |
| 25 | ai-models 交互形态 | 列表 + 编辑 dialog 等价（行点击即编辑、无详情页钉死、无导出导入钉死）；**Check connectivity 保留**（未保存可测，唯一配置验证手段）；静态型号清单原样搬迁（fork 可自行增删，不发明 API） | M14（6.3-9/10/11） | scout-settings §7；ngx 对话框标题不区分 add/edit 属上游小瑕疵不复刻 |
| 26 | 自动化衔接与实测清单 | e2e/自动化回归项归 #12 基线扩充（沿 M11 §3.7/M12 4.0 口径）；scout-backend §9 的 T1–T10 curl 实测清单随 wave-1 真机执行，实测结论回写 6.7 缺陷登记（trendz 泄露、mail 覆盖语义两项必测） | #12 + wave-1 | 三里程碑既定口径；T6/T10 直接决定两条缺陷登记的最终措辞 |

---

## 1. spec §6 定稿要点（起草稿，随 M14 开工落盘）

> 定稿时同步动作：spec §2 里程碑表 M14 行「settings 六小件」勘误为「settings 七件」；修订记录补一条「M14 段定稿」。

### 6.0 通用边界（四域共守，行为契约，非勾选条目）

- 路由族：CF=`/calculatedFields`（列表，域平铺顶级）；VC=`/version-control`（独立页，域平铺顶级）；settings 七件=「/settings/** 组内子路由」（notifications/home/repository/auto-commit/trendz/ai-models/queues + security-settings）；密码策略页=`/settings/security-settings`（语义对齐 ngx `/security-settings/general`，不搬字面量）。URL 语义对照 ngx `/calculatedFields`、`/features/vc`、`/settings/*`，不搬字面量。
- 角色矩阵（ngx auth 数组 + fork 后端 PreAuthorize 双权威，见本档 §2）：CF/VC 全域 TENANT_ADMIN only（路由、菜单、后端三层一致，CUSTOMER 零入口、SYS 零入口——CF 连后端只读能力都没有，与 M13 OTA 不同）；queues 页 SYS only；notifications tab SYS+TENANT 双形态；home/repository/auto-commit/trendz/ai-models TENANT only；security-settings/outgoing-mail SYS only；密码策略页 TENANT 无入口（ngx TENANT security 组只有 oauth2 clients + audit-logs）。
- 菜单归属（见本档 §3）：CF 与 VC 为 TENANT 顶级平铺两项；settings 组子路由按 access 树过滤。
- 「等价 + 禁止删减」四域双向清单（钉进 spec 正文）：
  - **ngx 有什么就必须列什么**：CF 六型配置器全套（SIMPLE/SCRIPT/PROPAGATION/RELATED_ENTITIES_AGGREGATION/ENTITY_AGGREGATION/GEOFENCING）+ 参数/输出/测试/debug/导入导出/三维过滤底座 + 实体 tab 存量并存；VC 独立页复数双面板 + repository/auto-commit 两 settings 表单 + 详情 tab 有承载九处（6 回归 + 3 补挂）；settings 七件全量 + outgoing-mail 回归；密码策略两卡；M12/M13 连带三件。实现不得以「简化」名义砍条目，砍不得的复杂面（GEOFENCING）不得降级。
  - **ngx 没有什么就不凭空造**（侦察「无」清单，spec 原文钉死）：CF 无 CUSTOMER_USER 任何入口（连后端都没有）、ALARM 型不进独立页、GEOFENCING 无地图组件、无批量导出/批量编辑、排序白名单仅 createdTime/name、无 CF 专用可视化表达式编辑器、无复制 ID 按钮、无草稿/两步保存、详情页无 audit/relations 附加 tab；VC 无分支管理 UI（新建/删除/重命名）、无 checkout 会话语义、无仓库级 commit diff、无「列出版本包含哪些实体」UI、无 per-entity-type 版本列表页、无 auto-commit 手动触发/进度 UI、复数版本无 diff；queues 无 topic 输入框（派生 `tb_rule_engine.{name}`）、无 ServiceType 切换（锁 TB_RULE_ENGINE）、无队列统计 UI；notifications tab 的 SMS provider 无 smtp 型（三型 AWS_SNS/TWILIO/SMPP）、EMAIL 卡不在本页（outgoing-mail 独立 tab）、testSms 仅 SYS；home 无 SYS 版、除两字段外无展示配置；trendz 无测试连接按钮；ai-models 无详情路由、无导出导入、模型候选为前端静态清单；密码策略无 pwned-password 检查、无密码历史条数维度、无强制 2FA 开关；settings 各 tab 无导出导入。以上任何一项如实现，属能力级增强，须先改 spec 再动手。
- 关键行为契约（沿 backend contract §3/§5，随开工落定措辞）：
  - CF 保存链**必须先 testScript 通过再 POST**（后端保存不校验表达式语法，错误照样入库）；CF 更新禁改 entityId（唯一禁改字段，换实体=删了重建）；CF 列表 sortProperty 白名单 `createdTime|name`（entityName 是内存拼接字段，作排序参数 500）。
  - VC 凭据语义：GET 永不回显 password/privateKey/passphrase；提交时空凭据**删字段不传空串**（空串=覆盖为空）；repository settings 保存是「验证式保存」（真实 clone/fetch，失败 500）；autoCommitSettings 未配置 GET 404（用 exists 端点或 catch）；commit/restore 走「POST 拿 requestId → 2s 轮询 status」异步任务模型，DeferredResult 180s 超时要进 loading/重试设计。
  - VC 后端实际可版本化 16 类型（DefaultEntitiesExportImportService.java:67-74），swagger 注释 8 种属滞后——antd 类型清单照前端 16 种做常量，验收用真仓逐类型实测，后端不支持的实测报错走 errata 登记，不擅自裁清单。
  - mail 整包覆盖保存无密码回填（testMail 有、saveAdminSettings 无）：outgoing-mail 回归时确认「密码框留空=请求体不带 password 字段」语义不被破坏（T6 实测定论）。
  - securitySettings 的 passwordPolicy 数字字段后端无范围校验（可存出 min>max 死锁策略）：前端必须做 maximumLength ≥ minimumLength 联动校验（ngx 前端同款自校验）。
- 取数端点契约：CF 独立页走 tenant 全量 `GET /api/calculatedFields`（types 不传时后端默认剔除 ALARM——无 ALARM 聚合入口照 ngx 钉死）；`/api/queues` 固定传 `serviceType=TB-RULE-ENGINE` 且不对响应做实体解析（非该类型返回 null body）。
- 实体类型注册：CALCULATED_FIELD / QUEUE / AI_MODEL 的名称、新增文案、空态、搜索占位、helpId 语义对齐（ngx `entity-type.models.ts:488-498,367-375,501-510`；AI_MODEL 无详情 URL 注册属上游事实照抄）。
- 横切契约（沿 M11 §3.7 口径，随收尾勾账）：i18n zh/en key 全等（check-locale 门禁）+ 菜单 key 双语；主题零内联色值（颜色全走 antd token）；数据保全——fixture 终态全 DELETE、git 仓库 fixture 清理、settings 域不留脏配置（尤其 jwtSettings/securitySettings 走查后回读默认值）、system 数据零改动；门禁 lint 0 error / tsc / vitest 定向全绿 / check-locale；自动化回归项归 #12 基线扩充（本 spec = 人工验收载体）。

### 6.1 计算字段独立页操作面（对齐 ngx CF 盘点 §2–§11）

- [ ] 列表页骨架：列 createdTime(默认排序 createdTime DESC)/name/entityType/entityName（实体详情页跳链）/type，搜索/分页/排序白名单 createdTime|name，行点击进详情态（锚点 `calculated-fields-table-config.ts:110-170`）
- [ ] 三维过滤面板（仅独立页）：types 多选六型 / entityType 四实体型 / entities 实体多选，按钮文案拼已选条件，变更后刷新（锚点 `calculated-fields-filter-config.component.ts:134-138,257-286`）
- [ ] 新增入口与类型域：Create（开编辑 dialog）+ Import 两件；类型下拉六型不含 ALARM（钉死）；「Add from IoT Hub」不做（6.6）；批量仅删除（锚点 `:137-156`、`calculated-field.models.ts:131`）
- [ ] 编辑表单骨架：name（必填 ≤255）/ debugSettings（失败调试默认开）/ entityId（`tb-entity-select` 等价四实体型选择器，编辑态锁定+owner 联动）/ type 切换规则（SIMPLE↔SCRIPT 互切保配置、其余清空 configuration）（锚点 `calculated-field-form.service.ts:39-94`、component ts:142-168）
- [ ] 参数套件（六型共用）：参数表格 + popover 编辑面板 + 校验（组内唯一、保留名 ctx/e/pi、attribute 型 scope 联动、Rolling 仅 SCRIPT 可选、watchKeyChange 跟随）（锚点 scout-cf §5）
- [ ] 服务端限额消费：maxArgumentsPerCF / maxDataPointsPerRollingArg / maxRelationLevelPerCfArgument / maxRelatedEntitiesToReturnPerCfArgument / 各 minAllowed*Interval / intermediateAggregationInterval 八参数接进表单校验边界（锚点 scout-cf §12）
- [ ] 输出套件：ATTRIBUTES/TIME_SERIES + scope（仅 ATTRIBUTES×Device 族）+ 输出策略 IMMEDIATE（参数开关组+useCustomTtl）/RULE_CHAIN（参数面板锁定）+ 载入无 strategy 补默认（锚点 scout-cf §6）
- [ ] SIMPLE 配置器：参数表禁 Rolling（报错提示）+ 表达式 input（必填 ≤255 + math 函数帮助弹窗可省略）+ useLatestTs 仅 Timeseries 输出（锚点 scout-cf §4）
- [ ] SCRIPT 配置器：代码编辑器（Ace 等价物）+ functionName=calculate + TBEL 语义 + 参数名补全与高亮（数据结构照抄 ngx models.ts:606-1042）+ 测试按钮（arguments 无效禁用）+ 默认脚本（锚点 scout-cf §4）
- [ ] 表达式测试对话框：SCRIPT/RELATED_ENTITIES_AGGREGATION/PROPAGATION-带表达式 三入口；已存 CF 用最新 debug 事件预填；Test script 走 `POST /api/calculatedField/testScript`（错误进 error 字段非 HTTP 错误）；Save 回填表达式；**保存前必须 testScript 通过**（后端保存链不校验语法）（锚点 scout-cf §8、backend §5-1）
- [ ] debug 事件与 debug settings：行内 debug 配置按钮（策略面板等价）+ 事件查看（列表=通用事件弹窗、详情态=debug 专页）+ 「Test with this message」回填链（锚点 scout-cf §8）
- [ ] PROPAGATION 配置器：relation（direction 默认 TO、relationType 写死 ['Contains','Manages'] 照抄收口成常量）+ applyExpressionToResolvedArguments 联动 + 表达式默认脚本 + output（锚点 scout-cf §7.1）
- [ ] RELATED_ENTITIES_AGGREGATION 配置器：relation（FROM 默认）+ 变体参数表（defaultValue 必填、候选按 relation 过滤）+ metrics 面板 + deduplicationIntervalInSec 默认服务端 min（锚点 scout-cf §7.3）
- [ ] ENTITY_AGGREGATION 配置器：周期八值 + tz + CUSTOM durationSec 下限 + offsetSec 动态 hint（可简化为静态提示，登记增强）+ allowWatermark + produceIntermediateResult 阈值联动 + metrics 共用面板（锚点 scout-cf §7.4/7.5）
- [ ] GEOFENCING 配置器：entityCoordinates（经纬 key 名必填，antd 建模补 ngx TS 漏字段）+ zoneGroups 两件套（zone 面板：引用实体/CURRENT/TENANT/OWNER/RELATION_QUERY、relation levels 拖拽上限 2、perimeterKeyName、reportStrategy 三值、createRelations 联动）+ scheduledUpdateEnabled 默认开（锚点 scout-cf §7.2）
- [ ] 导入导出：单条 JSON 导出（剥 entityId）+ 导入（ALARM/未知 type 拒收 toast、TENANT 引用 id 改写、类型选择禁用）（锚点 `import-export.service.ts:179-190,1247-1249`、table-config :350-396）
- [ ] 复制与删除：Copy（deepClone 删 id，pageMode 清 entityId/entityName 要求重选）+ 删除单条/批量 + 确认四件套（锚点 table-config :172-200,321-348）
- [ ] 实体 tab 存量并存回归：device/asset/device-profile/asset-profile 四处 `CalculatedFieldsPanel` 保留（tab 模式无三维过滤、行内 Edit、编辑走 dialog），与独立页共用 service 函数；alarm-rules tab 归告警域不动（锚点 scout-cf §11、ngx device-tabs:34-41）

### 6.2 VC 独立页与详情 tab 挂载（对齐 ngx VC 盘点 §2–§6）

- [ ] 独立页二段开关：无仓库→内嵌 repository settings 表单；有仓库→Versions 表；dirty 离开确认（ConfirmOnExit 等价）；「仓库是否已配置」二段呈现为行为契约（探测机制实现定，见 6.0）（锚点 `version-control.component.html:18-34`）
- [ ] repository settings 表单：repositoryUri/defaultBranch(默认 main)/readOnly/showMergeCommits/authMethod 双态动态校验（USERNAME_PASSWORD/PRIVATE_KEY）+ 凭据不回显两段式（Change password/passphrase 勾选解锁）+ Check access（留空沿用存储值）+ Delete 确认 + readOnly 全域联动 + 保存后清分支缓存；空凭据删字段契约端点单测钉住（锚点 scout-vc §3、backend §5-6）
- [ ] Versions 表（复数+单实体共用形态）：分支选择器（selectionMode 只选已有/自由输入两形态）/ 搜索 400ms 防抖 / 列 timestamp(默认 DESC)/id(截断+复制全 hash)/name/author / 分页 10/20/30 / readOnly 时 Create 禁用 / 单复数空态文案（锚点 `entity-versions-table.component.*`）
- [ ] 复数 create 面板：branch + versionName + syncStrategy（MERGE/OVERWRITE 必选带 hint）+ entityTypes 面板（16 类型展开面板：per-type syncStrategy/saveCredentials 仅 DEVICE/saveAttributes/saveRelations/saveCalculatedFields、allEntities 关则实体手选）（锚点 `complex-version-create.component.*`、`entity-types-version-create.component.html`）
- [ ] 复数 restore 面板：entityTypes 面板（removeOtherEntities 危险开关**逐字输入确认**、findExistingEntityByName 默认 true、load 四开关含 saveCalculatedFields 文案分支）+ rollbackOnError 默认 true + 按类型结果计数 + 错误三态文案（凭据冲突/缺引用实体/运行时）（锚点 scout-vc §2）
- [ ] 单实体 create/restore 弹层：versionName 默认 `{{entityName}} update`、saveCredentials 仅 DEVICE、saveCalculatedFields 按 typesWithCalculatedFields 显隐（CUSTOMER 文案换 alarm-rules）；restore 前先 getEntityDataInfo 探测显隐四开关（锚点 `entity-version-create/restore.component.*`）
- [ ] 异步任务与结果流：commit/restore「POST→requestId→2s 轮询」+ 全局 loading 锁 + done 且 added+modified=0 显示 nothing-to-commit + HTTP/任务错误双通道展示 + finalize 清分支缓存（锚点 `entities-version-control.service.ts:92-159`）
- [ ] 详情 tab 补挂三处：OTA 详情（M13 §5.6 兑现，守卫 TA+租户包）/ rule-chain 详情对话框加 tab / dashboard 编辑器占位按钮接真（ngx 编辑器弹层语义，onBeforeCreateVersion 先存再 commit 等价）（锚点 `ota-update-tabs.component.html:19-25`、`rulechain-tabs.component.html:67-74`、`dashboard-page.component.html:172-184`）
- [ ] 详情 tab 存量回归六处：customer/asset/device/entity-view/device-profile/asset-profile 的 VersionControlPanel 与独立页共用一套实现后仍可用（commit/版本表/diff/restore 冒烟）；device-profile 保持非编辑态条件（锚点本档 §0-11 消费图谱）
- [ ] 「未配仓库」降级提示升级：面板/独立页未配仓库态补「去配置」跳转链接指向 `/settings/repository`（M13 遗留连带，锚点 `VersionControlPanel.tsx:13-14` 自留接口）

### 6.3 settings 七件操作面（对齐 ngx settings 盘点 §2–§8）

- [ ] queues 列表（SYS only）：四列 name/partitions/submitStrategy/processingStrategy、锁 TB_RULE_ENGINE、Main 行无勾选框无删除（前端保护）、搜索/分页/默认 createdTime DESC、行点击详情抽屉 + Open details page（锚点 `queues-table-config.resolver.ts:44-132`）
- [ ] queues 表单（嵌套策略三面板）：name 编辑态锁死 + topic 自动派生不可输入（钉死）+ submitStrategy 五值 radio（BATCH 出 batchSize 默认 1000）+ processingStrategy 六值 radio + retries/failurePercentage/pause 三数字组 + pollInterval/partitions/packProcessingTimeout/consumerPerPartition/additionalInfo 三件；删除吃后端 400 引用报错（锚点 scout-settings §2.2、backend §3）
- [ ] notifications tab SYS 形态：SMS provider 卡（AWS_SNS/TWILIO/SMPP 三型子表单，无 smtp 型钉死）+ MOBILE_APP 卡（Firebase service account JSON 上传）+ Send test sms 弹窗（numberTo pattern + message ≤1600，不必先保存）（锚点 scout-settings §3.2）
- [ ] notifications tab TENANT 形态与保存链：仅 Slack botToken 卡；保存走 `POST /api/notification/settings`（deepTrim + 逐投递方式清洗：空串删整个 method、否则补 method 字段）；confirmForm 双表单盯 dirty（锚点 `sms-provider.component.ts:111-148`）
- [ ] home settings（TENANT only）：dashboardId 选择器（scope=tenant、不自动选第一个）+ hideDashboardToolbar（默认 true）→ `POST /api/tenant/dashboard/home/info`；**验收口径=保存成功即达标，/home 生效面归 M15**（锚点 `home-settings.component.*`、DashboardController:472-514）
- [ ] repository / auto-commit 两 tab 挂载：`/settings/repository`、`/settings/auto-commit` TENANT only + dirty 离开确认；表单本体按 6.2-2 验收不重复；auto-commit tab 二段开关（无仓库先见 repository 表单）（锚点 `admin-routing.module.ts:333-356`、`auto-commit-admin-settings.component.html:18-24`）
- [ ] auto-commit 设置面板：按 EntityType 粒度展开面板（选项=16 类型去重已用）+ 每项 branch 自由输入补全（空=Default）+ 四 checkbox（saveCredentials 仅 DEVICE、saveCalculatedFields 显隐）+ readOnly 全 fieldset 禁用 + hint + remove-all；**无 syncStrategy 钉死**（与手动 create 面板不要混）；非法分支名吃后端 400（锚点 scout-vc §4）
- [ ] trendz settings（TENANT only）：isTrendzEnabled + trendzUrl（启用时必填 + URL pattern）+ apiKey（trim）→ `POST /api/trendz/settings` + 保存后同步全局状态位（菜单/入口按此显隐，antd 对等实现）（锚点 `trendz-settings.component.ts:45-102`）
- [ ] ai-models 列表（TENANT only）：四列 createdTime/name/provider/modelId、行点击即编辑 dialog（无详情页钉死）、删除单条+批量、搜索/分页/默认 createdTime DESC、无导出导入（锚点 scout-settings §7.1）
- [ ] ai-models 编辑对话框：name + provider 九值下拉 + providerConfig 按白名单启停矩阵（9 provider 字段表）+ OPENAI baseUrl 特例（非官方地址 apiKey 变选填）+ OLLAMA 认证三态 + modelId 静态清单补全（空清单自由输入）+ 采样参数白名单渲染（锚点 `ai-model-dialog.component.*`、`ai-model.models.ts:60-226`）
- [ ] ai-models Check connectivity：表单未保存可测（invalid 禁用）、`POST /api/ai/model/chat` 探测、成功态/失败 errorDetails 展示（锚点 `check-connectivity-dialog.component.ts:48-82`）
- [ ] outgoing-mail 回归（v1 已交付不重做）：预设覆写、OFFICE_365 派生、change-password 闸门、redirect-URI 构造、generate-token 跳转五链路冒烟；**「密码留空=不带字段」语义 + testMail 回填**回归确认（T6 定论回写 6.7）（锚点 `pages/settings/outgoing-mail/index.tsx:234-248`）

### 6.4 密码策略页操作面（SYS only，对齐 ngx security-settings §5）

- [ ] General policy 组：maxFailedLoginAttempts（空=不锁定）/ userLockoutNotificationEmail（email 格式）/ userActivationTokenTtl（1-24 默认 24）/ passwordResetTokenTtl（同）/ mobileSecretKeyLength（min1）；Undo 按钮 + dirty 离开确认（锚点 `security-settings.component.ts:79-83`）
- [ ] Password policy 组：minimumLength(6-50)/maximumLength（**不得小于 minimumLength 联动校验**，防 min>max 死锁策略）/ 四类最少字符 / passwordExpirationPeriodDays / passwordReuseFrequencyDays（antd 类型补全 ngx TS 漏字段）/ allowWhitespaces（默认 true）/ forceUserToResetPasswordIfNotValid（默认 false 带 hint）（锚点 ts:84-97,136-146、backend §5-12）
- [ ] JWT 卡：tokenIssuer 必填 + tokenSigningKey（base64 解码 ≥64 位 + Generate key 按钮）+ tokenExpirationTime/refreshTokenExpTime（后者必须大于前者）+ **保存链**：issuer/key 被改先弹确认框 → `POST /api/admin/jwtSettings` 返回新 token 对 → 就地换发当前会话 → 回读刷新表单（锚点 ts:101-134,160-219）

### 6.5 M12/M13 连带交付与横切收尾

- [ ] 发送向导「渠道未配置」tooltip 升级：`deliveryMethodNotConfigured` 死文案改为跳 `/settings/notifications` 链接（SA/TA 按 tab 可达性显隐；CU 保留文案）（锚点 `wizard.tsx:641-651`、M12 §4.7 登记兑现）
- [ ] notification settings 预留函数消费：getNotificationSettings/saveNotificationSettings/getAvailableDeliveryMethods 三函数接入 6.3-3/4 页面（零 UI 消费方状态终结）；user 偏好两函数维持登记不实施（锚点 `services/tb/notification.ts:151-202`）
- [ ] 权限快照三登录：CU 直达 `/calculatedFields`、`/version-control`、`/settings/*` TENANT 页与 security-settings 全部拒绝页；SYS 登录 `/settings` 落 general、TENANT 落 home；TA 无 queues/security-settings/outgoing-mail 入口（矩阵见本档 §2）
- [ ] i18n 横切：新增 `pages.calculatedFields.*`/VC 独立页/settings 增量域 zh/en key 全等（check-locale 门禁）+ 新 menu key 双语；CF 面板存量 `pages.devices.detail.cf*` 前缀不动（锚点 scout-antd §7）
- [ ] 主题横切：零内联色值，新增页颜色全走 antd token（沿 M11 §3.7 口径）
- [ ] 数据保全：CF/VC fixture（计算字段/版本/分支/queue/ai model）终态全 DELETE；git 仓库 fixture 清理；jwtSettings/securitySettings/trendz 走查后回读默认值；system 数据零改动
- [ ] 门禁：lint 0 error（基线 warnings 只降不升，grep `^Found` 防截尾）/ tsc / vitest 定向全绿（波次门禁用目标目录跑法）/ check-locale（锚点 memory 两条口径）
- [ ] e2e 与 #12 登记：settings 走查补进 `e2e/specs/smoke/sys-admin.spec.ts`；M14 回归项（CF CRUD 主路径、VC commit/restore 异步闭环、settings 七页保存链）登记 #12 基线扩充（comment 留痕）

### 6.6 能力级增强登记（只登记不验收，不设硬门槛）

- alarm-rules tab 编辑器深化（按严重级条件树/排程/propagate/clearRule 全量编辑器，20+ 组件群）——归告警域后续工作；v1 基础操作面在场维持现状
- Edge 详情 version-control tab（维持 M13 §5.6 登记；`Edge.version` 字段为 VCS 预留）
- iot-hub 域（CF 列表「Add from IoT Hub」按钮 + 独立市场入口页）与 mobile-center 域——不在 M14，整域登记
- pwned-password（HIBP）泄露检查、密码历史条数维度、强制 2FA 开关——本版 ngx/后端双侧均无
- CF 右侧详情抽屉/独立详情页形态（现「列表+dialog」等价基线之上）；CF math 函数帮助弹窗；ENTITY_AGGREGATION offsetSec 的 moment 动态 hint（现可静态提示）
- 双栏并排 JSON diff + 差异导航/全屏（现 changed-fields 表等价基线之上）
- tenant-profile 配置页暴露 CF 八限额字段（tenant-profile 域，M14 只消费不暴露）
- 用户级通知偏好 `/account/notificationSettings`（账号域，维持 M12 登记）
- 后端 Main 队列删除保护（另立 issue，不混 M14）
- widget-type 详情路由缺口补齐后挂 VC tab（widget-type 域先补路由）；widgets-bundle/TBResource 详情壳先建后挂 VC tab
- queues 的 TENANT 只读视图、ServiceType 切换、队列统计 UI（ngx 均无）
- trendz 测试连接按钮；ai-models 模型候选 API 化（现静态清单）；ai-models 对话框标题区分 add/edit（上游小瑕疵有意不复刻）
- ngx 旧路径 301 重定向族（`/vc→/features/vc`、`/settings/sms-provider→/settings/notifications`、`/settings/security-settings→/security-settings/general` 等）——antd 全新路由无历史包袱不实施
- settings 组内子路由的 e2e 覆盖深度（sys-admin.spec 最小断言之外的扩展）

### 6.7 缺陷登记（照 §4.8 体例：前端已规避 / 待后端修复 / 上游对照；随 wave-1 实测回写定论）

- CF 保存链不校验表达式语法（错误 expression 照样入库，运行期 debug event 才报错，`DefaultTbCalculatedFieldService.java:116-169`）：前端规避 = testScript 通过再保存（6.1-10 硬门槛）。
- CF 更新禁改 entityId（`DefaultTbCalculatedFieldService.java:185-189`）：前端规避 = 编辑态锁定目标实体选择器（6.1-4）。
- CF 列表 sortProperty 别名 500 风险（dao 无列映射，`JpaCalculatedFieldDao.java:81-110`；`entityName` 是内存拼接字段）：前端规避 = 排序白名单 `createdTime|name`，与 swagger 白名单一致、无 M13 customerTitle 型陷阱。
- `/api/calculatedFields` 缺省剔除 ALARM 型（`CalculatedFieldController.java:213-216`）：上游行为非缺陷——「无 ALARM 聚合入口」照 ngx 钉死，登记为边界对照。
- `/api/queues` 角色名不副实：save/delete 仅 SYS_ADMIN，TENANT GET 通常空列表（非 isolated 租户真队列在 tenant profile JSON）：前端规避 = 页面 SYS only（6.3-1）。
- `saveQueue` 对非 TB-RULE-ENGINE serviceType 返回 null 空 body（`QueueController.java:143-144`）：前端固定传 TB-RULE-ENGINE 且不解析响应体。
- VC 凭据「空串 ≠ 留空」（Jackson 空串非 null、restore 回填只认 null，backend §5-6）：前端规避 = 空凭据字段序列化时删字段（`stripBlankCredentials`），端点单测钉住。
- `GET /api/admin/autoCommitSettings` 未配置时 404（checkNotNull 非 404 语义兜底）：前端规避 = 先 exists 或 catch 404 视为空配置。
- trendz apiKey 对 CUSTOMER_USER 裸露（`TrendzController.java:70-78` 无脱敏，T10 实测定论）：前端规避 = 不建 CU 入口；**待后端修复候选**（收紧 TENANT-only 或 GET 脱敏）。
- mail 整包覆盖保存无密码回填（testMail 有、saveAdminSettings 无，backend §5-11）：前端规避 = 「密码框留空=请求体不带 password 字段」既有实现维持；T6 实测（空串是否覆盖）定论后回写本条。
- securitySettings 的 passwordPolicy 全字段无 @Min/@Max（`UserPasswordPolicy.java:25-48`，可存出 min>max 死锁策略）：前端规避 = maximumLength ≥ minimumLength 联动校验 + 各字段范围（照 ngx 前端）；后端补约束另立 issue。
- `POST /api/admin/jwtSettings` 保存即签发新 token 对（旧 token 是否失效取决于签名 key 是否变更）：前端规避 = 保存成功就地换发会话（6.4-3 交互链整体对齐）。
- VC DeferredResult 180s 超时（大 repo 首次 clone 可能顶满，`EntitiesVersionControlController.java:88-89`）：前端 loading/重试按此设计；超时错误形态（AsyncRequestTimeoutException → 500）进错误映射占位。
- VC swagger 注释 8 种可版本化类型滞后（实际 16 种，`DefaultEntitiesExportImportService.java:67-74`）：验收以真仓实测为准；后端实测不支持的类型走 errata 登记，不擅自裁前端清单。
- 上游 TS 模型滞后三处对照：ngx `CalculatedFieldGeofencingConfiguration` 漏 entityCoordinates、`RepositorySettings` 漏 readOnly、`UserPasswordPolicy` 漏 passwordReuseFrequencyDays——antd 建模一律补全（后端字段均实存），不照抄缺口。
- 上游小瑕疵对照：ai-model 对话框标题不随 add/edit 切换；ngx TS 模型 RELATED/ENTITY_AGGREGATION 的 output.decimalsByDefault 字段 UI 不渲染（payload 直传保留）——antd 按「模型补全、UI 照 ngx 面呈现」处理，注释留痕。

---

## 2. 角色矩阵定案（ngx auth 数组 + fork 后端 PreAuthorize 为权威，本镜头已复核）

| 能力面 | SYS_ADMIN | TENANT_ADMIN | CUSTOMER_USER |
|---|---|---|---|
| CF 独立页 + 实体 tab | **无任何入口**（路由/菜单/后端 9 端点三层一致全 TENANT only；连只读后端能力都没有） | 全量（六型 + 全操作面） | 无任何入口 |
| VC 独立页 / repository / auto-commit / 详情 tab | 无（后端类级 `TENANT_ADMIN`，fork 无 PE 的 sys 默认 repo） | 全量 | 无（三层同挡） |
| queues 页 | 读写全量（save/delete 后端仅 SYS） | 无页面入口（后端 GET 放行只读但 ngx 菜单/路由均 SYS only，antd 不建 TENANT 入口） | 无 |
| notifications settings tab | SMS 三型卡 + MOBILE_APP 卡 + 保存链（testSms 后端 SA only） | 仅 Slack 卡 | 无 |
| home / repository / auto-commit / trendz / ai-models | 无（home 无 SYS 版；repository/auto-commit 后端拒绝） | 全量 | 无（trendz 读后端放 CU 但前端无入口——泄露缺陷登记 6.7） |
| security-settings（密码策略页）/ outgoing-mail / testMail / testSms | 全量 | 无（ngx TENANT security 组只有 oauth2 clients + audit-logs） | 无 |
| outgoing-mail（v1 存量回归） | 读写 | 无 | 无 |

spec 措辞定案：SYS_ADMIN 行对 CF/VC 写成一条否定性契约——「SYS_ADMIN 无 CF/VC/settings 租户件的任何页面、菜单与后端能力（前后端双证实）；这四域 100% 与系统管理员无关」（对照 M13 OTA 的「后端有只读不建入口」是不同形态，勿混写）。CUSTOMER_USER 差异收敛为一条——「四域零入口，直达路由拒绝页」。

## 3. 菜单归属定案（antd 对齐口径）

- **CF 独立页**：域平铺顶级一项 `/calculatedFields`（ngx 挂 TENANT「Data & processing」分组与规则链并列、icon `mdi:function-variant`；antd 无该分组概念，照 otaPackages 平铺先例），`access: 'canTenantAdmin'`。
- **VC 独立页**：域平铺顶级一项 `/version-control`（ngx `/features/vc` 挂 TENANT platform_section 顶部独立项、icon `history`；语义对齐不搬字面量），`access: 'canTenantAdmin'`。
- **settings 组**：保留 `/settings` 组形态，组级 access 放宽 `canSysAdminOrTenantAdmin`，子级显式收权——既有五页（general/outgoingMail/twoFa/oauth2/auditLogs）补显式 `canSysAdmin`（菜单可见性不变）；新增子路由 `notifications`（`canSysAdminOrTenantAdmin`）/ `home`、`repository`、`autoCommit`、`trendz`、`aiModels`（均 `canTenantAdmin`）/ `securitySettings`（`canSysAdmin`）。queues 落 SYS 侧：作为 settings 组内 `canSysAdmin` 子路由（ngx 菜单在 SYS Platform 组，antd settings 组即 SYS 的设置面，语义等价）。`/settings` 空路径重定向按角色分支（SYS→general、TENANT→home；umi 静态 redirect 做不到分支，用轻量分支组件等价实现）。
- **不建菜单**：iot-hub、mobile-center、alarm-rules 独立页（ngx 也无）、VC 的 SYS 侧任何入口。
- i18n：新 menu key 双语 key-for-key parity；文案对照 ngx en_US（Calculated fields / Version control / Repository / Auto-commit / Home / Trendz / AI models / Queues / Security settings）。

## 4. 真机走查作业单骨架（沿 M13 §4 先例：每条验收项可驱动）

- 前置 fixture（一次性）：run-tb-backend 起后端（PG18 口径）→ SYS/TENANT/CU 三 token 备好（T1–T10 curl 清单前置跑一轮，trendz 泄露与 mail 覆盖语义两实测定论回写 6.7）→ `git init --bare` 建本地裸仓作 VC fixture（repositoryUri 指向本地路径，验证式保存会真实 clone）→ 预建设备×2、资产×1、device profile×1、客户×1、仪表盘×1、EDGE 类型规则链×1。
- CF 主链驱动序：新建 SIMPLE（1 参数 + 表达式）→ **故意写坏表达式走 testScript 看错误字段 → 修正后保存** → 列表五列/三维过滤逐维（types/entityType/entities）/搜索/排序 → 编辑态 entityId 锁定实证 → 复制（要求重选实体）→ 导出 JSON → 删字段导入回灌（改名 + 改租户引用）→ SCRIPT 型（补全/高亮在场 + 测试对话框全链）→ PROPAGATION → 两聚合（周期/水位/metrics）→ GEOFENCING（zone 面板 + relation levels 拖拽）→ 同名同型重存吃「already exists」400 → 实体 tab 四处冒烟（tab 模式无过滤头、行内 Edit）→ 批量删除 → fixture 清零。
- VC 主链驱动序：独立页无仓库态（settings 表单内嵌）→ 配置本地裸仓（凭据留空 checkAccess 200 实证回填语义）→ GET 确认三凭据字段 null → 复数 create（单类型 allEntities 开）→ 轮询至 done → Versions 表行/id 复制 → diff（changed-fields 表形态）→ 改实体再 commit 生成第二版本 → restore 上一版本（单实体弹层四开关探测）→ 复数 restore（removeOtherEntities 逐字确认流走一遍假确认 + 真确认各一次）→ readOnly 开关联动（Create/设置禁用 + auto-commit hint）→ 七处详情 tab 逐处冒烟（6 存量 + OTA/rule-chain/dashboard 三补挂）→ delete repository → 空态回归。
- settings 七件主链：queues（SYS 登录：Main 行禁删对照普通行删除 → BATCH 条件字段 → 编辑锁名）→ notifications SYS 形态（SMPP 子表单保存 + testSms 弹窗）→ notifications TENANT 形态（Slack 卡 + 保存清洗链）→ home（保存 toast + API 复核，声明 M15 生效面）→ auto-commit（类型面板 + 非法分支名 400 + readOnly 禁用）→ trendz（三字段 + 状态位翻转）→ ai-models（OpenAI 建档 + Check connectivity 双态 + OLLAMA 认证切换 + SSRF 内网地址吃 400）→ 密码策略页（两卡各改一字段落库回读 + JWT 卡改 key 走确认→换发→回读全链 + max<min 联动拦截）→ outgoing-mail 五链路回归 + 密码留空语义复核。
- 角色快照：CU 直达四条路由拒绝页快照；SYS 登录菜单零 CF/VC 项 + `/settings` 落 general；TENANT 登录 `/settings` 落 home、无 queues/security-settings/outgoing-mail 项。
- 证据形式：每条截图或 DOM 探针 + API 复核（网络面板/curl 回读）；走查全文落 `docs/spec/v2-m14-browser-walkthrough.md`（开工时建），勾账回写 spec §6。
- 数据保全：终态 DELETE 清单（计算字段、VC 版本与分支、queue、ai model、trendz/jwt/security settings 回读默认、git fixture 目录删除），system 数据零改动；VC 走查前确认 queue.vc 本地 git 目录可清理。

## 5. 仍需用户拍板的偏好项

**0 个强制项。** 26 项裁决全部可在小队合议框架内定案（源码可证事实 + fork 铁律「等价为底线、允许增量增强、禁止删减」+ 既有范式先例覆盖了全部出入点，无用户口味依赖）。两条小队内注记留痕：

- **alarm-rules 深化的边界归属（裁决 #2）**：本定案（归告警域、M14 只钉「ALARM 不进独立页」）与「禁止删减」存在表观张力。定案理由：① ui-antd 的 alarm-rules tab 是 v1 已交付在场面（五实体、建/改/删/列表可用），非 M14 删除任何东西；②「全量编辑器留给 v2 rule work」是 v1 spec 明文边界，M14 翻案属扩范围而非补等价；③ ALARM 型在 ngx 不进独立页、独立页六型与告警域数据面（`/api/alarm/rule`）本就是两条线。若告警域里程碑迟迟不开，深化可按能力级增强清单随 M14 波次顺带（不改变验收范围）。
- **dashboard 编辑器 VC stub 接真的波次弹性（裁决 #11）**：本定案把「占位按钮接真」列入 M14 验收（等价驱动：ngx 编辑器入口是功能性的，antd stub 是死按钮）。若实现波评估编辑器域（M7–M9 遗产）接线成本超预期，可降级为「dashboard 的单实体 create/restore 经独立页/详情 tab 已覆盖、编辑器按钮保留占位并在 6.6 增强登记」——属波次切分而非范围裁剪，与 M13 裁决 #6 的弹性注记同型。
