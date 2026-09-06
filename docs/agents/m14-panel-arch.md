# M14 专家小队裁决 · 前端架构与复用（m14-panel-arch）

> 镜头：前端架构与复用。裁决人：panel-arch（2026-09-06）。
> 输入：`docs/agents/m14-ngx-inventory-calculated-fields.md`、`m14-ngx-inventory-vc.md`、`m14-ngx-inventory-settings.md`、`m14-backend-contract.md`、`m14-implementation-notes.md`、`docs/spec/v2-subsystems-acceptance.md` §1/§2/§5/§6、先例 `docs/agents/m13-panel-arch.md`（体例与 R 编号风格沿用）。五份侦察文档末尾「裁决点」合计原始条目 30 条，去重合并并补齐落位空白后收口为 37 条裁决（R01–R37）。
> 准则（fork 铁律）：等价为底线、允许增量增强、禁止删减 TB 已有操作；照 ngx 口径；走 ui-antd 既有范式（m14-implementation-notes 为准，m12/m13 notes 承接）；不为未发生的需求提前抽象；范围外一律「登记不实施」。
> 所有 ui-antd 锚点均本镜头逐一复核过源码；对侦察结论的六处事实修正见 §2。

## 0. 裁决总表

| 编号 | 议题 | 一句话决议 |
|---|---|---|
| R01 | settings 组结构升级 | 组级放宽 `canSysAdminOrTenantAdmin`，现有五子页显式 `canSysAdmin` 收窄，静态 redirect 换按角色入口组件（SA→general / TA→home） |
| R02 | CF 独立页路由/菜单 | 顶级平铺 `/calculatedFields`（TA-only，照 otaPackages 形态）；不建详情路由页（操作全部列表内可达，登记收敛） |
| R03 | VC 独立页路由/菜单 | 顶级平铺 `/versionControl`（TA-only）；页形态 = repo gate 二段 + 全仓版本表 + 复数 create/restore 双面板 |
| R04 | 密码策略页路由 | `/settings/security-settings`（SA-only，随 settings 组——antd 无独立 /security-settings 树，two-fa/oauth2 先例）；Security + JWT 双卡同页 |
| R05 | VC 实体 tab 挂载 13 处 | 已挂 6 处自动受益；新挂 3 处（rule-chains dialog / widget-type details / OTA detail）；4 处无宿主面登记不实施 |
| R06 | access key | 不新增 key，全部用 `src/access.ts:20-27` 既有 6 个 |
| R07 | CF 服务层与类型层 | `services/tb/calculated-fields.ts` 增 5 函数 + 新建 `types/tb/calculated-fields.ts`（7 型 configuration 权威类型，修 ngx 漏字段）；服务内类型改指 types 层 |
| R08 | VC 服务层增量 | `version-control.ts` 增：tenant 全量 listVersions、repositorySettings 读/存/删/checkAccess、COMPLEX 双请求类型；**轮询基建已存在直接消费，不新建 hook** |
| R09 | 新域服务文件 | 新建 `queue.ts` / `ai-model.ts` / `trendz.ts` + `admin.ts` 增 securitySettings/jwtSettings/testSms 四对函数，全部挂 `services/tb/index.ts` |
| R10 | 类型层落位 | 新建 `types/tb/queue.ts` + `types/tb/ai-model.ts`；`types/tb/admin.ts` 增 SecuritySettings/JwtSettings/SMS 配置类型；UserPasswordPolicy 上移 admin.ts + auth.ts re-export；VC 类型留服务文件不迁 |
| R11 | M12 预留函数 | notification settings ×4 直接消费不迁移；requestEntitiesLimitIncrease 继续闲置（登记） |
| R12 | CF 独立页形态 | ProTable 手动喂数 + 页面私有 url-state（排序白名单 createdTime\|name）+ types/entityType/entities 三维过滤 + 编辑 Dialog + 行内 Copy/Export/Events/Debug/删除 |
| R13 | CF 组件树 | `pages/calculated-fields/` 下 list + components/（骨架 Dialog + 参数套件 + 输出套件 + 测试对话框 + 4 复杂配置器 + debug 设置按钮）；底座五件全部域私有，不升格共享层 |
| R14 | SCRIPT/TBEL 编辑器 | `CodeEditor(language='tbel')` + `tbelCompletionSource({contextVariables:['ctx',...参数名]})`——M8 既有资产全量覆盖 ngx 能力，零新库 |
| R15 | CF 测试对话框 | 域内新建 CfTestDialog（照 ScriptTestPanel 的 onRun 注入形态，载荷 `{expression, arguments}`），Rolling 参数空数组兜底 |
| R16 | CF 导入导出 | JSON 导出（剥 entityId → downloadBlob）+ 导入（拒 ALARM/未知类型 + TENANT 引用改写 + 回填 Dialog），照 ngx import-export 逻辑 |
| R17 | CF 实体 tab 挂载 | 表格+Dialog 抽共享 `CalculatedFieldsTable`（entity 模式/tenant 模式双 pageMode，照 ngx 双模式结构），v1 简版面板退役，4 处详情页换挂 |
| R18 | ALARM 型边界 | CF 独立页排除 ALARM（照 ngx）；alarm-rules 域（ALARM 型完整表单/条件树/排程）不进 M14，现有 AlarmRulesPanel 维持 v1 形态，spec 登记边界 |
| R19 | 服务端 8 限额参数 | 按ngx 默认值做前端常量消费（校验边界），authState 接线登记增强（同 maxResourceSize 先例） |
| R20 | VC 独立页形态 | gate 二段（未配置→RepositorySettingsForm；已配置→版本表）+ 复数 create 面板（16 类型 + syncStrategy + allEntities→实体多选）+ restore 面板（removeOtherEntities 逐字确认 + rollbackOnError） |
| R21 | diff 视图选型 | **不引 monaco/ace-diff**：antd 已有表格 diff（DiffModal，M5 已验收行为契约）即单实体 diff 形态；独立页（复数）ngx 本无 diff，M14 diff 工作量≈0 |
| R22 | repository settings 表单 | 抽共享 `RepositorySettingsForm`（props: detailsMode）三场景复用（settings 页 / VC 页 gate / auto-commit 页 gate）；凭据「不改 = 剥除字段」语义钉死（空串≠null） |
| R23 | auto-commit settings 页 | `/settings/auto-commit` TA-only 二段页 + 动态 per-type 列表；v1 的 AutoCommitCard（详情 VC tab 内）退役——功能被完全覆盖且数据同源，双编辑面互踩 |
| R24 | 分支选择器 | 抽 `BranchSelect`（AutoComplete 封装，freeInput/allowClear 两 prop），三形态合一，收敛 VersionControlPanel 内联 ×3 |
| R25 | notifications settings tab | `/settings/notifications` SA+TA 同页两形态（SYS=SMS 三 provider + MOBILE_APP 卡；TA=Slack 卡）+ testSms 弹窗 + M12 向导死文案升级跳转 |
| R26 | queues tab | `/settings/queues` SA-only 列表 + `/settings/queues/:id` 详情路由 + QueueForm（三 Collapse 区 + BATCH 条件字段 + name 编辑锁死 + topic 只读派生）+ Main 队列前端保护 |
| R27 | ai-models tab | `/settings/ai-models` TA-only 列表（行点击开编辑）+ 编辑 Modal（9 provider 白名单矩阵 + 静态型号清单照搬 + Check connectivity 弹窗） |
| R28 | home settings tab | `/settings/home` TA-only 双字段 SettingsCard（dashboardId 联想 + hideDashboardToolbar）；生效面归 M15，验收口径「保存成功即达标」 |
| R29 | trendz tab | 随 M14 实施（3 字段 SettingsCard）；全局状态位不做（antd 无消费点，登记） |
| R30 | security-settings 页双卡 | SecuritySettings 卡（补 passwordReuseFrequencyDays 类型）+ JWT 卡（改 issuer/key 先确认 → POST → 新 token 对就地换发走 token-store）；密码策略实时校验复用 password-policy.tsx 的 requirements |
| R31 | 凭据 null 回填总范式 | 全 M14 凭据类字段统一「已存即隐藏 + Change 勾选解锁 + 提交剥除未勾选字段」模式（repositorySettings 密码/私钥/passphrase、mail 密码同型） |
| R32 | locale 域文件 | 新建 `en-US/zh-CN/calculated-fields.ts`（pages.calculatedFields.*）+ `vc.ts`（pages.versionControl.*）+ `queue.ts`（pages.queues.*）+ `ai-model.ts`（pages.aiModels.*）；settings 增量进既有 settings/index.ts；menu key 双语同步 |
| R33 | 页面测试落位 | 每页 index.test.tsx 照 general 页模板；CF/VC/settings 增量纯函数全走 data.ts + 单测；EventsPanel 弹窗零改造复用零回归 |
| R34 | 服务层测试 | 各域 endpoints.test 补增量断言；轮询用 fake timers 断 2s 节拍与超时；导入租户改写/auto-commit map 语义/queue topic 派生/provider 白名单四组纯函数单测钉死 |
| R35 | e2e 边界 | settings SA tabs 补 sys-admin.spec 走查；VC 全链依赖真实 git 仓库 + CF testScript 依赖 TBEL 引擎在线，留人工验收（真实通道先例） |
| R36 | iot-hub 入口 | CF 列表「Add from IoT Hub」不做，登记 iot-hub 域依赖项（同 M11 口径） |
| R37 | waves 切分 | 七波严格序：服务层+类型层 → settings 组改造+六小件速赢 → settings 重件 → CF 底座+独立页 → CF 复杂配置器+tab 升级 → VC 独立页 → tab 挂载收尾+门禁 |

## 1. 裁决明细

### A. 路由 / 菜单 / access

**R01 settings 组结构升级（M14 路由面最大前置项）**
【决议】`config/routes.ts` 的 settings 组（`:444-480`）做三件事：(1) 组级 `access` 从 `canSysAdmin` 放宽为 `canSysAdminOrTenantAdmin`（对齐 ngx `/settings` 树 `auth:[SYS_ADMIN, TENANT_ADMIN]`，`admin-routing.module.ts:224-235`）；(2) 现有五子页（general/outgoing-mail/two-fa/oauth2/audit-logs）各自显式 `access: 'canSysAdmin'` 收窄（行为不变，纯显式化）；(3) 静态 `{ path: '/settings', redirect: '/settings/general' }` 替换为按角色入口组件 `component: './settings/entry'`（`hideInMenu: true`，~15 行：useModel 取 authority，SA→replace('/settings/general')、TA→replace('/settings/home')），等价 ngx 的 `redirectTo` 按 authority 二分（`admin-routing.module.ts:237-247`）。头注「父级不能放 redirect」规矩不破——entry 是 component 不是 redirect。
【依据】ngx settings 树角色二分 + TA 默认落 home（scout-settings §1.1）；antd access 机制「组级是上限、子级可收紧」先例 = notifications 组（`routes.ts:546-583`：组 canAuthenticated、子页 canSysAdminOrTenantAdmin）；menu key `menu.settings.*` 子键由树过滤自动生成，组放宽后 TA 自动只看到有权限的子项。
【分歧】无。入口组件是 ngx redirectTo 语义的最小等价物，不引新机制。

**R02 CF 独立页路由/菜单**
【决议】顶级平铺：`{ name: 'calculatedFields', icon: <实现波选 antd 近似，如 functionOutlined>, path: '/calculatedFields', access: 'canTenantAdmin', component: './calculated-fields/list' }`。**不建** `/calculatedFields/:id` 详情路由页。菜单名 `menu.calculatedFields`（译文用 `entity.type-calculated-fields` 同句式「Calculated fields / 计算字段」）。不并入任何组（ngx 挂 TENANT「Data & processing」组与 rule_chains 并列，`menu.models.ts:959-964`——antd 无此组，ruleChains 即平铺先例，CF 照做）。
【依据】ngx 路由 auth=[TENANT_ADMIN]（scout-cf §1，后端 9 端点全 TENANT）；antd 平铺形态先例 otaPackages（`routes.ts:321-334`）。不建详情页的理由：ngx `/calculatedFields/:entityId` 详情页（tabs 仅 debug events，scout-cf §14-11）承载的全部操作——查看/编辑（抽屉+Dialog 同 FormGroup）、debug events、导出、删除——在 antd 列表页内均有落点（行点击开编辑 Dialog = 查看+改；行内 Events 按钮弹 Modal 内嵌 EventsPanel；Export/Delete 行内已有）。这是 M13 R21「双入口收敛单入口」同一原则的更进一步（CF 连按钮组都不重，收敛不损可达性）。spec 登记一条「有意收敛，操作等价清单对照」。
【分歧】无（scout-cf 裁决点 8 倾向「对齐 M13 OTA 形态」，本裁决细化：OTA 因按钮组五件+只读锁死表单值得独立页，CF 不值得——收敛深度按操作密度分级，原则一致）。

**R03 VC 独立页路由/菜单**
【决议】顶级平铺：`{ name: 'versionControl', path: '/versionControl', access: 'canTenantAdmin', component: './version-control/page' }`，`menu.versionControl`（「Version control / 版本控制」）。不搬 ngx 字面量路径 `/features/vc`（spec §5.0「URL 语义对照 ngx 不搬字面量」先例；antd 顶级驼峰惯例 /otaPackages /entityViews）。不建 settings 组内（ngx 挂 platform_section 组首位而非 settings 组，`menu.models.ts:993-997`——它是操作页不是配置页，平铺对齐）。
【依据】ngx `vc-routing.module.ts` auth=[TENANT_ADMIN] + ConfirmOnExit；scout-vc §1/§2。
【分歧】无。

**R04 密码策略页路由**
【决议】`{ name: 'securitySettings', path: '/settings/security-settings', access: 'canSysAdmin', component: './settings/security-settings' }`，挂 settings 组内。**不建** ngx 的 `/security-settings` 独立树——antd 既有惯例已把 security 类页面放 settings 组（two-fa 实为 ngx `/security-settings/2fa`、oauth2 实为 ngx `/security-settings/oauth2`，`routes.ts:464-478`），照惯例落位；URL 差异登记 spec。页内容 = SecuritySettings 卡 + JWT 卡双卡（R30）。ngx 的 `/settings/security-settings→/security-settings/general` 重定向族不实施（antd 无该树，无包袱）。
【依据】ngx `/security-settings/general` SYS-only（scout-settings §1.2/§5）；antd settings 组现役五页即 ngx security-settings 树的既定归宿。
【分歧】无。

**R05 VC 实体 tab 挂载 13 处落地清单（逐处盘点）**
【决议】以 antd 详情页实存事实逐处裁决（本镜头逐一核过 import 与 tab key）：

| # | ngx 挂载点（scout-vc §5） | antd 现状 | M14 动作 |
|---|---|---|---|
| 1 | Customer | 已挂（`customers/detail/index.tsx:425` version-control tab + VersionControlPanel import） | 无需改，面板升级自动受益 |
| 2 | Asset | 已挂（`assets/detail/index.tsx:389`） | 同上 |
| 3 | Device | 已挂（`devices/detail/index.tsx:438`） | 同上 |
| 4 | Entity View | 已挂（`entity-views/detail/index.tsx:425`） | 同上 |
| 5 | Dashboard（详情面板 + 编辑页按钮双入口） | **无宿主**：antd dashboard 只有 view（只读渲染页）与 editor（画布），无 ngx dashboard-tabs 管理详情面板 | 登记不实施（待 dashboard 详情面板形态决策，归 dashboard 域迭代） |
| 6 | Rule Chain | 可挂：`pages/rule-chains/details-dialog/`（Modal+Tabs，assembleDetailTabs registry 形态，头注亲验） | **新挂**：dialog 内加 version-control tab，commit/restore 后回调关闭+列表失效 |
| 7 | Device Profile | 已挂（`device-profiles/detail/index.tsx:297`，!isEdit 条件照 ngx 核对实现） | 同 1 |
| 8 | Asset Profile | 已挂（`asset-profiles/detail/index.tsx:166`） | 同 1 |
| 9 | Widgets Bundle | **无宿主**：bundle 只有 bundle-widgets 管理页，无详情面板 | 登记不实施 |
| 10 | Widget Type | 可挂：`resources/widget-types/details/index.tsx`（详情页已存在，无 tab 结构；其头注的 ROUTING GAP 已消解——`/resources/widget-types/:widgetTypeId` 路由已在 `routes.ts:165-172`） | **新挂**：详情页尾部加 version-control 区块（照该页 Descriptions 布局加折叠区块成本最低） |
| 11 | TBResource（resources 列表） | **无宿主**：resources/library/list 是纯列表页 | 登记不实施 |
| 12 | TBResource（resources-library） | 同上 | 登记不实施 |
| 13 | OTA Package | 可挂：`ota/packages/detail/index.tsx`（M13 R21 后置到 M14 的既定账） | **新挂**：单 Card 改「details + version-control」双 tab（页内 Tabs，`?tab=` 照 createDetailTabUrlState），isTenant 语义 = TA-only 路由已保证，sys 级包（tenantId NULL）行内本就只读可见，VC tab 对 sys 包隐藏（照 ngx isTenantOtaUpdate） |

新挂 3 处全部走同一包装：`VersionControlPanel` 升级版直接挂（props 已是 `{entityId, entityType}` 多态签名，VersionControlPanel.tsx:135-146 头注自述 DEVICE/ASSET/ENTITY_VIEW 皆可）。
【依据】scout-vc §5 表 + 本镜头 antd 侧逐文件复核（差异见 §2）。
【分歧】无。4 处登记项的定性：VC tab 是详情管理面板的附属品，宿主面板在 antd 不存在时「挂 tab」实为「新建 dashboard/bundle/resource 详情面」——超出 M14 合理增量且强绑各域形态决策，登记不等于删减（ngx 用户经由列表/其他入口对这些实体的操作全部仍在）。

**R06 access key**
【决议】零新增。六 key 全集（`src/access.ts:20-27`）覆盖 M14 全部页面：CF/VC=canTenantAdmin；settings 组=canSysAdminOrTenantAdmin（子页显式收窄）；密码策略/queues=canSysAdmin；home/trendz/ai-models/repository/auto-commit=canTenantAdmin；notifications tab 不写 access（继承组级 SA+TA，页内按角色渲染卡片）。
【依据】R01/R02/R03/R04；ngx 各路由 auth 数组（scout-settings §1、scout-cf §1、scout-vc §1）。
【分歧】无。

### B. 服务层 · 类型层

**R07 CF 服务层与类型层**
【决议】(1) `services/tb/calculated-fields.ts` 增量 5 函数（各带 JSDoc 钉端点）：`getCalculatedFields`（GET /api/calculatedFields，tenant 全量，query 含 `types[]/entityType/entities[]/name[]/textSearch` + 分页，openapi `:11087`）、`getCalculatedFieldById`（GET /api/calculatedField/{id}）、`testCalculatedFieldScript`（POST /api/calculatedField/testScript，**响应 `{output, error}`，错误在 error 字段不抛 HTTP**）、`getLatestCalculatedFieldDebugEvent`（GET /api/calculatedField/{id}/debug，无则 null）、`getCalculatedFieldNames`（GET /api/calculatedFields/names?type=，输出 key/参数 key 联想用，sortProperty 固定 name）。既有三函数（entity-scoped/save/delete）签名不动。(2) 新建 `types/tb/calculated-fields.ts`：`CalculatedFieldType`（7 值枚举移入）、`CalculatedFieldConfiguration` 判别联合（Simple/Script/Propagation/Geofencing/RelatedEntitiesAggregation/EntityAggregation/Alarm 七型 + `Argument`/`Output`/`OutputStrategy`/`OutputStrategyType`/interval/watermark/zoneGroups 等子结构，照后端 `common/data/.../cf/configuration/` 权威建模）、`CalculatedFieldInfo`（列表行含 entityName）、`EntityCoordinates`；**Geofencing 类型补上 `entityCoordinates` 字段（ngx TS 模型漏写、后端 Java 有——antd 侧修掉，scout-cf §7.2）**。services 文件内现有 inline 类型（CalculatedFieldType/CalculatedField/CalculatedFieldConfiguration）改 import 自 types 层并 re-export 保持既有 import 路径不破。
【依据】notes §3 缺口表 + openapi 锚点亲验（`:11087/:11107`）；后端契约 §1.1/§2（configuration 多态结构与 testScript 错误语义）；ngx 模型漏字段勘误（scout-cf §7.2）。
【分歧】无。类型化是 4 复杂配置器表单回填/提交的硬前提（v1 `Record<string, unknown>` + `as unknown as` 手法在 7 型联合上不可持续）。

**R08 VC 服务层增量（含轮询基建修正）**
【决议】`services/tb/version-control.ts` 增量：(1) `listVersions(pageLink, branch)`——GET /api/entities/vc/version 全类型列表（独立页版本表取数）；(2) `getRepositorySettings`（GET，404 容错 null，照 getAutoCommitSettings 的 try/catch 形态）、`saveRepositorySettings`（POST，保存成功后失效 `['vc-branches']` 缓存——ngx clearBranchList 等价）、`deleteRepositorySettings`、`checkRepositoryAccess`（POST .../checkAccess）；(3) COMPLEX 请求类型：`ComplexVersionCreateRequest`（type/versionName/branch/syncStrategy/entityTypes[]）与 `EntityTypeVersionLoadRequest`（type=ENTITY_TYPE/versionId/entityTypes[]/rollbackOnError）+ `EntityTypeSyncStrategy`（MERGE/OVERWRITE）；(4) **轮询基建不新建**：`awaitVersionCreateResult`/`awaitVersionLoadResult` 已在（`version-control.ts:283-304`，2s 节拍 + 120s 上限，与 ngx timer(0,2000) 同拍），独立页直接消费；120s 上限低于后端 DeferredResult 180s——把 POLL_TIMEOUT_MS 提到 180s 一行改动，本波顺手对齐。`listEntityTypeVersions`（ngx 死代码）不做。
【依据】本镜头亲验 version-control.ts 全文（修正 scout-vc 裁决点 5 的「新建 useVcTask hook」——见 §2）；后端契约 §1.2；ngx entities-version-control.service.ts 函数表（scout-vc §6）。
【分歧】无。超时对齐 180s 属「与后端契约对齐的一行修正」，不算预建。

**R09 新域服务文件**
【决议】(1) 新建 `services/tb/queue.ts`：`getQueues`（GET /api/queues?serviceType=TB_RULE_ENGINE，显式 `sortProperty=createdTime&sortOrder=DESC`——后端缺省 id ASC，backend 契约 §0 通用约定）、`getQueueById`、`saveQueue`（POST，**固定 serviceType=TB_RULE_ENGINE 且不对响应做实体解析之外的重载**——非 RULE_ENGINE 时后端回空 body，backend §5-10）、`deleteQueue`。`device-profile.ts:100-110` 的 `getRuleEngineQueues`/`RuleEngineQueue` **不迁移**（消费方 tenant-profiles 不动，照 M13 R15 的 device-profile OTA 先例，两文件 JSDoc 互指）。(2) 新建 `services/tb/ai-model.ts`：`saveAiModel`/`getAiModelById`/`getAiModels`/`deleteAiModel`（**delete 响应 boolean、不存在回 false 不当 404**，backend §1.8）+ `checkAiModelConnectivity`（POST /api/ai/model/chat，DeferredResult 信封 Success/Failure）。(3) 新建 `services/tb/trendz.ts`：`getTrendzSettings`/`saveTrendzSettings`。(4) `admin.ts` 增：`getSecuritySettings`/`saveSecuritySettings`、`getJwtSettings`/`saveJwtSettings`（**响应是当前用户新 JwtPair**）、`sendTestSms`。四文件全挂 `services/tb/index.ts`（沿 notification→ota 的挂载先例，`index.ts:13-28` 现状 16 域）。
【依据】openapi 锚点亲验（`:1614` queues、`:5662` ai/model、`:888` trendz、`:5784/:5868` security/jwt）；notes §3 范式样板 ota.ts；backend 契约 §1.4/§1.5/§1.7/§1.8。
【分歧】无。

**R10 类型层落位**
【决议】(1) 新建 `types/tb/queue.ts`（Queue/QueueSubmitStrategy/QueueProcessingStrategy + 5+6 策略枚举）与 `types/tb/ai-model.ts`（AiModel/AiModelConfig 多态 + `AiProvider` 9 值 + **`AI_MODEL_PROVIDER_MAP` 白名单常量**——providerFieldsList/modelFieldsList/modelList 照 ngx `AiModelMap`（`ai-model.models.ts:103` 起）逐条搬，含 OPENAI baseUrl 特例与 OLLAMA auth 形态），`types/tb/index.ts` 各加一行。(2) `types/tb/admin.ts` 增 `SecuritySettings`/`UserPasswordPolicy`/`JwtSettings`/`JwtPair`/SMS provider 配置三型（AwsSns/Twilio/Smpp 判别联合）；**`UserPasswordPolicy` 从 `services/tb/auth.ts:22-34` 上移 types/tb/admin.ts，auth.ts `export type { UserPasswordPolicy } from '@/types/tb/admin'` re-export**——5 个既有消费者 import 路径不变，SecuritySettings 复用同型不出现双份（notes 裁决点 5 收口）。(3) **VC 类型不迁**：现役类型全住 `services/tb/version-control.ts`（M5 形态），R08 增量类型同文件追加，不为迁移而迁移。(4) 分页复用 `types/tb/page.ts`。
【依据】ngx ai-model.models.ts（白名单矩阵亲验）；notes §3/裁决点 5；EntityType 枚举已含 16 种 VC 可导出类型全部成员（`types/tb/entity.ts:22-45` 亲验）。
【分歧】无。

**R11 M12 预留函数直接消费**
【决议】`getNotificationSettings`/`saveNotificationSettings`/`getAvailableDeliveryMethods`/`getUserNotificationSettings`/`saveUserNotificationSettings`（`services/tb/notification.ts:164-202`）原样消费，零迁移零改签名。`requestEntitiesLimitIncrease`（:151-157）M14 仍无 UI 消费方，继续闲置（usage 域关联件，登记）。`getAvailableDeliveryMethods` 在 notifications settings 页落地时升级为真消费（当前可用渠道联动卡片显隐——超出 ngx 等价面的允许增强，可选）。
【依据】notes §3 预留函数表 + §9.1/§9.2；本镜头抽验 :151-157 在场。
【分歧】无。

### C. CF 组件架构

**R12 CF 独立页形态**
【决议】`pages/calculated-fields/list/`（list/index.tsx + url-state.ts + components/）：ProTable 手动喂数照 OTA 列表样板（`pages/ota/packages/list/index.tsx:724-759`）；页面私有 url-state 照 OTA `url-state.ts` 范式，**排序白名单 `createdTime|name` 钉死**（后端 dao 无列映射，entityName/type 排序会 Hibernate 500，backend §5-3）；过滤三维全做：types 多选（6 型，排除 ALARM）、entityType 单选（4 实体型）、entities 多选（实体选择器照 notifications 域 `RecipientEntitySelect` 的实体多选先例），URL 承载（照 audit-logs 多筛选 url-state 范式，数组 join 逗号）。默认排序 createdTime DESC 显式传。行内动作六件：Edit（开 Dialog）/ Copy（deepClone 剥 id，pageMode 语义下清 entityId 要求重选实体）/ Export（R16）/ Events（Modal 内嵌 `EventsPanel eventTypes=['DEBUG_CALCULATED_FIELD']`——零改造复用）/ Debug 设置（R13 的 debug-settings-button）/ Delete（确认四件套 + 批量删除走 useBatchRun）。顶部三 add 动作 = Create（Dialog）/ Import（R16）；**「Add from IoT Hub」不做**（R36）。
【依据】ngx table-config 双模式列集与动作矩阵（scout-cf §2，`calculated-fields-table-config.ts:137-156/:172-200` 亲验）；后端排序白名单（backend §5-3）；EventsPanel 现状亲验（`EventsPanel.tsx:27-36` 默认事件集已含 DEBUG_CALCULATED_FIELD、props 已 entity-agnostic）。
【分歧】无。三维过滤面板是 scout-cf 标记的新件，落位审计后无现成整体组件，按「两个下拉 + 一个实体多选」的组合实现（不做 ngx 的 overlay 弹出面板形态，Toolbar 内直接排布等价）。

**R13 CF 组件树与共用底座**
【决议】目录结构：

```
ui-antd/src/pages/calculated-fields/
  list/{index.tsx, url-state.ts, index.test.tsx}
  components/
    cf-dialog.tsx                  # 编辑骨架（name/entityId/type/debugSettings/configuration 分支 @switch 等价）
    arguments-table.tsx            # 参数套件：表格 + popover/抽屉参数面板（六类型共用）
    argument-panel.tsx             # 单参数编辑面板（校验全矩阵见依据）
    output-section.tsx             # 输出套件：output type/scope/strategy/IMMEDIATE 参数（六类型共用）
    test-dialog.tsx                # R15
    debug-settings-button.tsx      # debugSettings 小控件（failuresEnabled/allEnabled + 看事件动作）
    simple-configuration.tsx       # SIMPLE/SCRIPT 同组件 isScript 分流（照 ngx 同构）
    propagation-configuration.tsx
    geofencing-configuration.tsx   # + zone-groups 表格/面板两件
    related-entities-aggregation-configuration.tsx
    entity-aggregation-configuration.tsx
    metrics-panel.tsx              # 两聚合共用 metrics 面板
    calculated-fields-table.tsx    # R17 共享表格（entity 模式/tenant 模式）
    import-export.ts               # R16 纯函数（类型校验 + TENANT 改写）
```

底座五件（骨架/参数套件/输出套件/测试对话框/debug 按钮）全部**域私有**，不升格 `components/` 共享层——当前全仓仅 CF 一个消费者，rule of three 未触发。类型切换规则照 ngx `setupTypeChange`：SIMPLE↔SCRIPT 互切保留 configuration，其余切换清空（`calculated-field-form.service.ts:68-81` 亲验）；载入恢复照 `prepareConfig`：output 无 strategy 补 RULE_CHAIN、ENTITY_AGGREGATION 的 tz 规范化（:83-94）。编辑态 entityId 锁死（后端禁改，backend §5-2）。参数面板校验矩阵照 scout-cf §5 全量：名称必填/唯一/禁保留名 ['ctx','e','pi']/≤255、Rolling 仅 SCRIPT、limit 1..maxDataPointsPerRollingArg（默认 100）、timeWindow 默认 15 分钟、attribute scope 默认 SERVER_SCOPE、argumentName 跟随 key（watchKeyChange）、上限 maxArgumentsPerCF=10（R19 常量）。
【依据】ngx 组件目录亲验（components/ 七个子目录清单）；scout-cf §3-§7 全量交互矩阵；antd 域私有面板先例（DownlinksPanel、scope-shell）。
【分歧】无。

**R14 SCRIPT/TBEL 编辑器（零新库）**
【决议】SCRIPT 表达式编辑 = `CodeEditor(language='tbel')` + 通过 `extensions` prop 追加 `tbelCompletionSource({ contextVariables: ['ctx', ...参数名] })`。现有资产逐点对账 ngx 需求：TBEL 高亮已内置（`code-editor/tbel/highlight.ts`，M8 交付）；补全源已参数化（`tbel/completion.ts:22-29` `TbelCompletionOptions.contextVariables`，正是为不同签名脚本节点设计的开口）——ngx 的 `getCalculatedFieldArgumentsEditorCompleter`（参数名动态补全）由「参数名数组传 contextVariables」等价达成；TBEL 工具栏徽标沿 `editor.script.lang.tbel*` 既有文案。SIMPLE 表达式 = 普通 Input（pattern + ≤255 + math 帮助链接，照 ngx）。默认脚本常量（华氏转摄氏示例）照 ngx `calculatedFieldDefaultScript` 搬入域常量文件。**不引 Ace/monaco/任何新编辑器库**。
【依据】本镜头亲验 `code-editor/index.tsx:23-48`（language map + extensions 开口）、`tbel/completion.ts` 全文、`ScriptEditor.tsx`（JS/TBEL 切换先例）；scout-cf §4/§14-6（ngx 无专用编辑器，只是 Ace+TBEL+补全）。
【分歧】无。补全条目粒度差异登记：ngx 的补全含参数 key 内嵌提示与高亮规则树（models.ts:606-1042），antd 现有 TBEL 补全为「上下文变量 + 工具函数」两层——参数名补全等价、函数级文档提示登记增强（照 M11「补全规则等价简化」先例，spec §3.8）。

**R15 CF 测试对话框**
【决议】域内新建 `test-dialog.tsx`：形态照 `ScriptTestPanel` 的**依赖注入契约**（组件不发请求，`onRun` 由调用方注入——HTTP 铁律），但**不直接复用 ScriptTestPanel 本体**（其载荷 msg/metadata/msgType 是规则链语义，CF 是 `{expression, arguments}`，强改 props 即破坏 M8 冻结面）。布局：左参数（arguments 按 key 逐个 JSON 值输入，Rolling 参数显示为空数组兜底，照 ngx `table-config:412-418`）/ 右上表达式（CodeEditor 只读回显当前表达式，PROPAGATION 场景可编辑回填）/ 右下输出。「Test」调 `testCalculatedFieldScript`：error 字段非空 → 行内错误呈现（**不 toast**——语法/运行错误是 200+error 字段，backend §1.1）；output 正常展示并 beautify（`JSON.stringify(v, null, 2)` 等价）。入口条件：SCRIPT / RELATED_ENTITIES_AGGREGATION / PROPAGATION-带表达式（照 ngx `debugCfActionEnabled`，`models.ts:550-554` 口径写域内纯函数）。已保存 CF 先拉 debug 事件预填参数（getLatestCalculatedFieldDebugEvent）。测试通过后 Save 回填表达式进编辑 Dialog。
【依据】scout-cf §8；ScriptTestPanel 契约亲验（`ScriptTestPanel.tsx:1-15` 头注「execution is injected via onRun」）；backend §5-1（表达式错误不抛 HTTP）。
【分歧】无。

**R16 CF 导入导出**
【决议】导出：行内 Export → `getCalculatedFieldById` 取全量 → 剥 `entityId` → `downloadBlob` 存 JSON（ngx `exportCalculatedField` 等价，`import-export.service.ts:179-190` 口径）。导入：文件选择 → `JSON.parse`（解析失败 toast）→ 校验链（**ALARM 或未知 type 拒收** toast，照 ngx `:350-374`）→ **TENANT 引用改写**（arguments/zoneGroups 内 `refEntityId.entityType==='TENANT'` 的 id 重写为当前租户 id，纯函数进 `import-export.ts` + 单测）→ 回填编辑 Dialog（type 选择器锁定、按钮「Add」）→ 确认后 POST。无批量导出（ngx 无，scout-cf §14-4）。
【依据】ngx 导入链亲验（`calculated-fields-table-config.ts:350-397`）；downloadBlob 既有共享件（notes §12）。
【分歧】无。

**R17 CF 实体 tab 挂载（面板升级）**
【决议】新建共享 `CalculatedFieldsTable`（`pages/calculated-fields/components/`，props：`entityId?`——传=实体模式（entity-scoped 取数 + 行内 Edit + 行点击不开详情）/ 不传=tenant 模式（全量端点 + 三维过滤 + 行点击开编辑 Dialog）——照 ngx table-config 双 pageMode 的同构映射）。**v1 `CalculatedFieldsPanel`（`components/entities/detail/CalculatedFieldsPanel.tsx`）退役**：其头注自述「heavyweight editors stay v2」是挂账而非终态，M14 全类型编辑交付后面板成为功能子集，保留即双份实现漂移。devices/assets/device-profiles/asset-profiles 四处详情页 import 同 PR 换新组件（tab key `calculated-fields` 已在 `detail-tab-keys.ts`，零改）。实体模式默认列 createdTime/name/type 照 ngx tab 模式列集。回归面：四处详情页测试断言同 PR 更新，不做兼容垫片。
【依据】ngx `calculated-fields-table-config.ts:110-126` 双模式亲验（pageMode 挂 header/rowPointer/entityComponent，tab 模式无）；v1 面板头注亲验；spec §5.0「M12 连带迁移」同款「共享件收口、调用点同 PR」手法。
【分歧】无。这是本镜头对「实体 tab 怎么挂」的核心裁决：共享表格两种模式是 ngx 的真实结构，比「面板保留 + 独立页另写一份」更少代码。

**R18 ALARM 型边界**
【决议】CF 独立页与类型下拉排除 ALARM（照 ngx `calculatedFieldTypes` 过滤 + 导入拒收，scout-cf §14-2）；**alarm-rules 域（ALARM 型 CF 的完整表单：createRules 按 severity 条件树/排程/propagate 关系）不进 M14**——ngx 侧它是 20+ 文件的独立域（`alarm-rules-table-config` + `buildAlarmRuleForm` + 条件/排程组件群）。antd 现有 `AlarmRulesPanel`（`components/entities/detail/AlarmRulesPanel.tsx`，v1 形态：alarm type + 单 severity 阈值 + rename/debugMode 编辑）保持不动，其头注「full condition-tree / schedule editors stay with the v2 rule work」继续有效。spec 登记边界：「M14 计算字段 = 独立页 6 型 + 4 实体 tab；alarm-rules 域后置专项」。后端 `/api/calculatedFields` 缺省排除 ALARM 的行为（backend §5-4）与此边界天然自洽，无额外取数处理。
【依据】scout-cf 裁决点 1 倾向采纳；antd AlarmRulesPanel 头注亲验。
【分歧】无。

**R19 服务端 8 限额参数**
【决议】8 个限额按后端默认值落成域常量（`types/tb/calculated-fields.ts` 导出 `CF_LIMITS = { maxArgumentsPerCF: 10, maxDataPointsPerRollingArg: 1000, maxRelationLevelPerCfArgument: 2, maxRelatedEntitiesToReturnPerCfArgument: 100, minAllowedDeduplicationIntervalInSecForCF: 10, minAllowedAggregationIntervalInSecForCF: 60, minAllowedScheduledUpdateIntervalInSecForCF: 10, intermediateAggregationIntervalInSecForCF: 300 }`），表单校验与默认值消费之。**不做 authState 接线**：antd `getInitialState` 仅拉 currentUser（`app.tsx` 亲验），无 sysParams/tenantProfile 通道；为限额接 auth 波管线 = 为边界场景预建机制。越界提交由后端 400 文案兜底（校验链在服务端，backend §3），前端常量只是体验层。authState 接线登记增强（同 spec §3.2「maxResourceSize 随 auth 波接入」先例）。tenant-profile 配置页暴露这 8 字段属 tenant-profile 域，不进 M14。
【依据】antd app.tsx 亲验；scout-cf §12 表（默认值即常量来源）；spec §3.2 先例。
【分歧】无。

### D. VC 组件架构

**R20 VC 独立页形态**
【决议】`pages/version-control/page/`（page/index.tsx + components/）：

```
ui-antd/src/pages/version-control/
  page/{index.tsx, index.test.tsx}
  components/
    versions-table.tsx        # 全仓版本表（分支选择/搜索 400ms 防抖/分页/createdTime DESC/id copy 截断 7 位）
    complex-create-modal.tsx  # 复数 create：branch/versionName/syncStrategy(默认 MERGE+hint) + entity-types 面板
    entity-types-create-form.tsx  # 16 类型展开面板（entityType 下拉去重/per-type syncStrategy/save flags/allEntities→实体多选 + 每类型手选）
    complex-restore-modal.tsx # 复数 restore：entityTypes 面板（removeOtherEntities 危险开关→逐字输入 "remove other entities" 确认/findExistingEntityByName 默认 true/load flags）+ rollbackOnError 默认 true
    branch-select.tsx         # R24
```

版本表行内动作 = Restore（复数模式走 complex restore，预选该版本）。结果流：create/restore 均 `saveEntitiesVersion/loadEntitiesVersion → await*Result`（既有轮询），全局提交中锁（Modal confirmLoading + 页面级 Spin 遮罩等价 ngx 顶栏进度条），成功按 added/modified/removed 与 per-type created/updated/deleted 计数呈现，错误走 `result.error` 与 `serverErrorText` 双通道（照现版 CommitModal/RestoreModal 已验收形态）。16 类型常量照 scout-vc §9.7：`exportableEntityTypes` 16 种做常量（后端 swagger 滞后以实capacity为准，验收真仓逐类型打勾，不支持者 spec errata 登记）。CUSTOMER 的 save/loadCalculatedFields 文案换 export/load alarm rules（照 ngx i18n 分支，常量表按类型映射）。branches 空数组 = 表空态「先配置仓库」。
【依据】scout-vc §2 全量交互矩阵；后端契约 §1.2（16 种清单 `DefaultEntitiesExportImportService.java:67-74`）；现版 CommitModal/RestoreModal 形态亲验（VersionControlPanel.tsx:437-956）。
【分歧】无。

**R21 diff 视图选型（推翻侦察倾向）**
【决议】**不引 ace-diff/jQuery/monaco/react-diff-viewer**。两层事实：独立页（复数模式）ngx 本无 diff 能力（scout-vc §8「diff 只有单实体」），故独立页零 diff 工作量；单实体 diff 已由 v1 `DiffModal` 交付且是已验收行为契约形态——「flatten 导出 JSON → path/value 行 + CHANGED/ADDED/REMOVED/SAME 四态 Tag + 差异计数 + 显示相同字段开关」（VersionControlPanel.tsx:609-763 亲验）。M14 不改其形态，仅随面板升级顺带保留。antd 的 diff = 字段表而非 ngx 的并排文本——这是「等价」口径下的有意形态差（信息等价：能看出改了什么、改前改后值），登记 spec 一句；并排文本 diff 登记为能力级增强（触发：验收者判字段表不可接受时，选型再议 monaco DiffEditor，**当下不预装依赖**）。
【依据】本镜头亲验 DiffModal 全文；scout-vc §8（复数无 diff）+ 裁决点 4（monaco 倾向——基于「antd 无 diff 资产」的错误前提，见 §2）。
【分歧】见 §2 追踪。

**R22 repository settings 表单**
【决议】抽共享 `RepositorySettingsForm`（放 `pages/version-control/components/repository-settings-form.tsx`，VC 域私有——三消费点全在 M14 交付面内），props：`detailsMode?: boolean`（detailsMode 下藏 Delete 按钮并压缩布局）。三场景挂载：`/settings/repository` 壳页、`/versionControl` 未配置 gate、`/settings/auto-commit` 未配置 gate（照 ngx 同一组件三场景结构，scout-vc §3）。字段与交互全量照 ngx：repositoryUri 必填 / defaultBranch 默认 'main' / readOnly 开关（保存后全 VC 域只读——versions 表 Create 禁用、auto-commit 表禁用+hint）/ showMergeCommits（存储位）/ authMethod 双态（USERNAME_PASSWORD/PRIVATE_KEY）动态校验 / **凭据不回显两段式**（R31）+ privateKey 文件上传（tb-file-input 等价 = antd Upload.Dragger，accept .pem，已有 fileName 则私钥非必填）。按钮三件：Delete（有 settings 才显示，确认后 DELETE + 失效缓存）/ Check access（表单合法即可点，POST checkAccess，成功 toast；**凭据留空沿用已存值由后端 restore 回填——前端提交前剥除未变更字段**，backend §5-6）/ Save（invalid 或非 dirty 禁用；成功 toast + `['vc-branches']`/`['vc-repo-info']` 缓存失效）。**修 ngx 模型缺口**：`RepositorySettings` TS 类型补 `readOnly` 字段（ngx 漏写、表单值实际携带、后端 Java 有，scout-vc §3）。
【依据】scout-vc §3 全量字段表；backend 契约 §3（保存链真实 clone/fetch、脱敏、空串≠null）。
【分歧】无。

**R23 auto-commit settings 页（含 v1 增强件退役）**
【决议】`/settings/auto-commit`（TA-only，settings 组内新子路由）= 二段 gate（无 repo → RepositorySettingsForm；有 → AutoCommitSettingsForm）。AutoCommitSettingsForm：动态 per-type 列表（每项 = entityType 下拉（exportableEntityTypes 去重已用）+ BranchSelect 自由输入形态（空 = Default）+ saveCredentials（仅 DEVICE）/saveAttributes/saveRelations/saveCalculatedFields 四开关），antd 形态用 Card 列表 + add/remove（ngx mat-expansion-panel 的等价物）；整表 readOnly 联动禁用 + hint；Delete（确认）/Save（dirty+valid 才可点，保存前 branch 非法名由后端 400 原文透出）。数据语义：整 map 读取（getAutoCommitSettings 404→null 已有）+ 整 map 保存，删空 map 时走 deleteAutoCommitSettings（照 v1 AutoCommitCard 的 mutationFn 语义，VersionControlPanel.tsx:1002-1021 亲验——该逻辑迁入新页）。**v1 AutoCommitCard 退役**：devices 等六处详情 VC tab 里的 auto-commit 卡移除——理由：(a) 其全部功能（per-type branch+四开关）被 settings 页等价覆盖且数据同源；(b) 双编辑面并存会在 readOnly 联动、已用类型去重上互踩（详情卡感知不到 settings 页的 per-type 上下文）；(c) 它是 v1 为「settings 页未存在」打的过渡补丁（面板头注自述 repository settings belong to the v2 settings pages——同逻辑适用于 auto-commit）。退役后 VC tab 面板体积减 ~170 行。**此项涉删除已交付 UI，进 §3 上交拍板，默认执行退役**。
【依据】scout-vc §4 全量；VersionControlPanel 头注与 AutoCommitCard 实现亲验；ngx 无实体详情 auto-commit 卡（scout-vc §5 形态对照）。
【分歧】见 §3。

**R24 分支选择器**
【决议】抽 `BranchSelect`（`pages/version-control/components/branch-select.tsx`）：AutoComplete 封装，props `{ branches, value, onChange, freeInput?: boolean, allowClear?: boolean, defaultHint?: boolean }`。三消费形态：versions 表/复数面板 = 选择态（freeInput=false）；单实体 create 弹窗（详情 tab）= 自由输入态（freeInput=true，输入新分支名 = 往新分支提交）；auto-commit settings = 自由输入 + allowClear + 空占位「Default（仓库默认分支）」。default 分支项 label 附 `(default)` 后缀（现版行为，VersionControlPanel.tsx:325-328 亲验）。VersionControlPanel 内联 AutoComplete ×3 收敛为该组件。
【依据】scout-vc 裁决点 10（三形态合一）；ngx branch-autocomplete selectionMode 语义。
【分歧】无。

### E. settings 六小件

**R25 notifications settings tab（SA+TA 两形态一组件）**
【决议】`/settings/notifications`（settings 组内，**不写 access** 继承组级 SA+TA）：单页多卡，卡片按角色渲染——(1) **SMS provider 卡（SA）**：type 三选（AWS_SNS/TWILIO/SMPP，无 smtp）+ 三 provider 子表单组件（`sms-provider-configuration/` 下 aws-sns/twilio/smpp 三文件，校验矩阵照 scout-settings §3.2：SMPP 14 值 codingScheme 等）+ Save（admin settings key=`sms`，GET ignoreErrors 容错未配置）+ **Send test sms 弹窗**（numberTo pattern `^\+[1-9]\d{1,14}$` + message ≤1600，POST testSms 带表单当前 providerConfiguration 不必先保存）；(2) **MOBILE_APP 卡（SA）**：Firebase service account JSON 上传（Upload.Dragger accept .json）；(3) **Slack 卡（SA+TA）**：botToken 单输入，存 notification settings（GET/POST /api/notification/settings，M12 预留函数）。保存链统一 SettingsCard 范式；notification settings 保存时 deepTrim + **逐投递方式清洗**（任一字段空串删整个 method 配置、否则补 method 字段——纯函数抽 data.ts + 单测，two-fa 单次变换血泪教训口径）。M12 闭环：`pages/notifications/sent/wizard.tsx:641-651` 的 deliveryMethodNotConfigured 死文案升级为「前往设置」跳转（SA 跳本页；TA 同页可跳；CU 无入口保留文案）。
【依据】scout-settings §3.2；notes §1/§9.1；预留函数 R11。
【分歧】无。SYS/TENANT 用「一页按角色显隐卡」而非「一组件两变体」——卡片粒度独立、保存链各自独立，与 general 页双卡同构，不需要变体抽象。

**R26 queues tab**
【决议】`/settings/queues`（SA-only）：列表页照 ProTable 手动喂数（getQueues，锁 TB_RULE_ENGINE），四列 name/partitions/submitStrategy/processingStrategy（策略列显译文 label），搜索/分页/排序，**无导出/导入**（ngx 零引用）；Main 队列保护 = 前端禁勾选 + 隐藏删除（`queue.name !== 'Main'`，照 ngx `queues-table-config.resolver.ts:113-114`），API 层无 Main 保护登记边界。详情路由 `/settings/queues/:id`（hideInMenu）+ 抽屉语义收敛为路由详情页（照 OTA detail 形态：PageContainer + Card + 单 Form）。QueueForm 三 Collapse 区（Submit/Processing/Polling）+ additionalInfo 区：submitStrategy.type 5 值 Radio（BATCH 时出 batchSize 必填 min1 默认 1000）、processingStrategy.type 6 值 Radio + 五数字字段（默认 3/0/3/3）、pollInterval 默认 25、partitions 默认 10、consumerPerPartition、packProcessingTimeout 默认 2000、duplicateMsgToAllPartitions、customProperties/description textarea。**name 编辑态锁死**（后端禁改，backend §5「Queue name can't be changed!」）；**topic 无输入框**、由 name 派生 `tb_rule_engine.{name}` 只读展示（表单持有随 name 变化覆写——纯函数单测）。删除被 device profile 引用 → 后端 400 原文 toast（无预检，M13 R19 同口径）。TENANT 只读视图不做（ngx 菜单 queues 仅挂 SYS 段，`menu.models.ts:897-905`）。
【依据】scout-settings §2 全量；backend §1.5/§3（Queue 校验链 + 权限）；条件子字段先例 TenantProfileQueues（notes §6.1）。
【分歧】无。

**R27 ai-models tab**
【决议】`/settings/ai-models`（TA-only）：列表页（getAiModels，四列 createdTime/name/provider/modelId，默认 createdTime DESC）+ 自定义表头（标题 + 帮助），**行点击直接开编辑 Modal**（ngx detailsPanelEnabled=false 同构，antd 无抽屉范式照 dialog 收敛先例）+ 行内 Edit + 单条/批量删除（确认四件套含模型名）。编辑 Modal（~850px 照 ngx 宽度）：name/provider 下拉（9 值，R10 枚举）/ providerConfig 字段白名单矩阵（**由 `AI_MODEL_PROVIDER_MAP` 常量驱动渲染**——每个字段一行受控输入，serviceAccountKey 用 Upload 文件读取为 string）/ OPENAI baseUrl 特例（默认 `https://api.openai.com/v1`；baseUrl 非官方地址时 apiKey 变选填——域内纯函数 + 单测）/ OLLAMA 认证区（NONE/BASIC/TOKEN Segmented→username+password 或 token）/ modelId（Select showSearch，候选=modelList 静态清单，空清单 = 自由输入模式 AutoComplete）/ 采样参数按 modelFieldsList 白名单渲染 number 行（temperature min0、topP 0.1-1、topK min0，各带 hint）。**Check connectivity**：Modal 内「Check connectivity」按钮（表单未保存也可测、invalid 禁用）→ 弹窗发 `checkAiModelConnectivity`（探测消息硬编码照 ngx "What is the capital of Ukraine?" 不必中文化——协议探测串非 UI 文案；登记一句）→ SUCCESS/Failure 两态呈现。保存 deepTrim POST。对话框标题区分新增/编辑（**不照抄 ngx 恒为 ai-models.ai-model 的上游小瑕疵**，scout-settings §7.2）。表单值⇄wire 转换抽 `data.ts`（provider config 多态归一/展开）+ 往返单测。
【依据】scout-settings §7 全量；ngx AiModelMap 亲验；backend §1.8/§3（SSRF 校验、delete false 语义）。
【分歧】无。静态型号清单原样搬迁（fork 可自行增删），不发明 models API（scout-settings 裁决点 7 采纳）。

**R28 home settings tab**
【决议】`/settings/home`（TA-only）：单 SettingsCard 双字段——dashboardId（Select showSearch 远程联想 tenant scope dashboards，走 `services/tb/dashboard.ts` 既有列表函数；允许清空 = 清除 home dashboard，POST null 语义）+ hideDashboardToolbar（checkbox 默认 true）。GET/POST `/api/tenant/dashboard/home/info`（service 函数 2 个加进 dashboard.ts 或独立小文件——**加进 dashboard.ts**，同域聚合）。验收口径「保存成功即达标」，生效面（登录落点、/home 渲染）归 M15 §7，spec 写明。
【依据】scout-settings §4；backend §1.9；dashboard 选择先例（CustomerDashboardAssignDialog/selects.tsx 亲验在场）。
【分歧】无。

**R29 trendz tab**
【决议】随 M14 实施（砍掉 = 删减 TB 已有配置面，且成本 3 字段）：`/settings/trendz`（TA-only）单 SettingsCard：isTrendzEnabled checkbox（默认 false，关 = 其余字段禁用）/ trendzUrl（pattern `https?://`，启用时追加 required）/ apiKey（pattern \S+，保存 trim）。service 走新 `trendz.ts`（R09）。**全局状态位不做**：ngx 保存后 dispatch ActionAuthUpdateTrendzSettings 驱动菜单/入口显隐，antd 的 trendz 消费点为零（无 trendz 专属菜单项——菜单挂 settings 组恒显，grep 全仓无 trendz 状态消费），状态位属为不存在的消费者预建机制，登记。无测试连接按钮（ngx 无）。
【依据】scout-settings §6 + 裁决点 3；antd 全仓 grep 亲验无消费点。
【分歧】无。

**R30 security-settings 页双卡（含 JWT 换发链）**
【决议】`/settings/security-settings`（SA-only，R04）双 SettingsCard：(1) **SecuritySettings 卡**：General policy 组（maxFailedLoginAttempts min0 / userLockoutNotificationEmail email / userActivationTokenTtl 必填 1-24 / passwordResetTokenTtl 必填 1-24 / mobileSecretKeyLength min1）+ Password policy 组（minimumLength 6-50 / maximumLength min6+自校验不小于 minimum / 四个 minimumX min0 / passwordExpirationPeriodDays min0 / passwordReuseFrequencyDays min0 / allowWhitespaces 默认 true / forceUserToResetPasswordIfNotValid 默认 false+hint）。保存 merge 整包 POST securitySettings；Undo 照 SettingsCard。**实时密码策略预览不做**（ngx 无此能力），但 `pages/user/components/password-policy.tsx` 的 requirements 常量与两卡数值口径保持一致（改策略后用户侧提示同源，登记一句——不建依赖，只对齐语义）。(2) **JWT 卡**：tokenIssuer 必填 / tokenSigningKey 必填 + base64 解码 ≥64 字节自校验 + Generate key 按钮（前端 `btoa(randomAlphaNumeric(64))` 等价）/ tokenExpirationTime 60..2147483647 / refreshTokenExpTime 900.. 且大于 tokenExpirationTime 自校验。保存链最重交互照 ngx 全量：issuer 或 key 被改动 → 保存前确认 Modal（警示文案照 ngx info-header/info-message 两段）→ POST jwtSettings → **响应是当前用户新 JwtPair，就地换发**：`token-store` 写入新 token 对（`src/core/auth/token-store.ts` 亲验在场）+ 刷新 initialState.currentUser（setInitialState 管线）→ 回读刷新表单。取消链路 = 不发请求。
【依据】scout-settings §5 全量；backend §2（UserPasswordPolicy 全 Integer 无后端约束——前端校验即唯一防线，校验矩阵按上表钉死）/§5-12/§5-13；token-store 亲验。
【分歧】无。

**R31 凭据 null 回填总范式（M14 统一口径）**
【决议】凡「GET 脱敏、留空 = 不变」的凭据字段（repositorySettings 的 password/privateKey/privateKeyPassword；admin settings mail 的 password 已有实现照旧；ai-model 的 apiKey 不脱敏不属于此类）统一三段式：已存值在场时隐藏输入 + 显示「已配置」态；「Change xxx」勾选解锁输入（解锁时置空 enable）；**提交序列化时未勾选字段直接剥除（不发 null、不发空串）**——后端 restore 只认字段缺失（空串 ≠ 留空，Jackson 空串非 null，backend §5-6 钉死）。落位：RepositorySettingsForm 内做通用小工具 `stripUnchangedCredentials(values, changedFlags)` 纯函数 + 单测；导入导出/测试链（checkAccess）同一剥除逻辑复用。
【依据】backend §5-6 + T3 实测清单；scout-vc 裁决点 9；outgoing-mail 既有 change-password 闸门先例（notes §1）。
【分歧】无。

### F. locale · 测试 · 收尾

**R32 locale 域文件与 menu key**
【决议】新建四对域文件（单文件形态，照 `edge.ts`/`ota.ts` 先例；超体量可升目录，先例 devices/）：`en-US/zh-CN/calculated-fields.ts`（前缀 `pages.calculatedFields.*`——**新前缀独立成域**，v1 面板的 `pages.devices.detail.cf*` 旧 key 随面板退役一并删除，避免同义 key 双文件撞 check-locale 去重规则）/ `vc.ts`（`pages.versionControl.*`——面板旧 key `pages.devices.detail.vc*` 同步迁移删除）/ `queue.ts`（`pages.queues.*`）/ `ai-model.ts`（`pages.aiModels.*`）。settings 六小件文案进既有 `settings/index.ts` 目录文件（key 前缀 `pages.settings.<域>.*`：notificationSettings/queues/home/trendz/securitySettings/repository/autoCommit）。聚合文件 `en-US.ts`/`zh-CN.ts` 各加 import+spread。menu key 双语同步：`menu.calculatedFields`、`menu.versionControl`、`menu.settings.{notifications,queues,home,repository,autoCommit,trendz,aiModels,securitySettings}` 八个子键。全量 formatMessage 带 defaultMessage；`npm run check-locale` 双规则（zh/en 全等 + 单 locale 内 key 不重定义）过门禁。trendz/security-settings 等卡片标题对照 ngx 译名口径。
【依据】notes §7；m13 R27 体例；check-locale.mjs 双规则亲验；R17/R23 的面板退役连带 key 清理。
【分歧】无（notes 裁决点 7 的「新前缀 vs 复用 devices 前缀」收口为新前缀——复用会造成 devices 域文件膨胀且语义错位，退役删除则无去重冲突）。

**R33 页面测试落位**
【决议】每页 `index.test.tsx` 照 settings 族模板（`pages/settings/general/index.test.tsx`：createIntl + RawIntlProvider + mock @umijs/max + vi.hoisted service mock + QueryClientProvider；ProTable 页加 pro-components→antd Table 替身，先例 `pages/notifications/sent/index.test.tsx:53-75`）。专项：(1) CF 独立页测试断三维过滤参数进 query、排序白名单（entityName 列头无排序触发）、导入 Dialog 类型拒收；(2) VC 独立页测试 gate 两态、复数 create payload 形状（syncStrategy/entityTypes 数组）、removeOtherEntities 未输入验证串时确认按钮禁用；(3) queues 表单 BATCH 条件字段出现/消失、name 编辑态禁用；(4) ai-model provider 切换重渲染字段集（白名单驱动断言）；(5) security-settings JWT 确认链（改 issuer → 保存弹确认 → 确认后调 saveJwtSettings → token-store 更新断言（mock token-store 模块））；(6) 详情页 tab 挂载的回归（OTA detail 双 tab、rule-chains dialog 新 tab）随各页既有测试文件增量。EventsPanel 复用（R12 Events 弹窗）零改造零新增测试。
【依据】notes §6/§8 测试范式；m13 R28 体例。
【分歧】无。

**R34 服务层测试与轮询测试**
【决议】(1) 各域 endpoints.test 增量断言（mock ./http 断 URL+展平 query）：calculated-fields（5 新函数，含 testScript 的 error 字段语义注释）、version-control（listVersions + repositorySettings 四函数 + COMPLEX 请求体形状；存量函数顺带补齐——该文件既有 endpoints.test，增量跟进）、queue/ai-model/trendz/admin 新函数。(2) **轮询测试**：`awaitVersionCreateResult` 用 `vi.useFakeTimers()` 推进断 2s 节拍、done 即返、超时抛错三路径（放进 version-control.endpoints.test.ts，POLL_TIMEOUT 调 180s 的改动一并钉住）。(3) 纯函数单测四组：import-export 的 TENANT 改写与类型拒收；auto-commit map 的「禁用删项/删空走 DELETE」语义；queue topic 派生（name 变化覆写、编辑态不派生错）；ai-model 白名单（provider→字段集映射 + OPENAI baseUrl 特例 apiKey 可选性）。
【依据】notes §3（ota.ts 范式 + endpoints 测试范式）；本镜头亲验 version-control 轮询实现可 fake-timers 化（delay 基于 setTimeout）。
【分歧】无。

**R35 e2e 边界**
【决议】sys-admin.spec 补 settings 走查（queues 列表可达 + security-settings 双卡渲染 + redirect 按角色落点：SA 手打 /settings 落 general）；TA 侧 settings 新 tab 的 smoke 归 tenant spec（home/trendz/ai-models 可达 + 保存链一次）。**VC 全链不进 e2e**：真实 git 仓库 + 网络 clone 是外部依赖（backend T3 自认 file:// 不一定可用），留人工验收（沿 M12「真实通道留人工」先例）；CF 独立页可 seed（testScript 依赖 TBEL 引擎在线——本机后端 tbelInvokeService 默认装配则可进，不可进则留人工，登记二选一）。
【依据】backend §9 T3/T4 的外部依赖声明；notes §8 e2e 现状。
【分歧】无。

**R36 iot-hub 入口**
【决议】CF 列表「Add from IoT Hub」不实施：入口依赖整个 iot-hub 域（browse/install/详情卡全套），iot-hub 缓做是 M11 既定口径（spec §1 通用边界「iot-hub 相关入口不在各里程碑——登记不实施」）。antd CF 列表 add 动作 = Create + Import 两件，登记缺失入口一条。
【依据】spec §1 iot-hub 条；scout-cf 裁决点 6；ngx `table-config:147-156`（三动作中的第三件）。
【分歧】无。

**R37 waves 切分（七波严格序，每波一个可合并逻辑单元）**
【决议】依赖排序定波（服务层先行；settings 组改造是大量子路由的前置；CF/VC/settings 三线交错点全在服务层与共享件）：

1. **服务层 + 类型层（全 M14 地基）**：`types/tb/{calculated-fields,queue,ai-model}.ts` + admin.ts 类型增量 + UserPasswordPolicy 上移 + types index；`services/tb/{calculated-fields,version-control,queue,ai-model,trendz,admin}.ts` 全部增量 + 各 endpoints.test（含轮询 fake-timers、180s 对齐）；index.ts 挂三新域。纯增量无 UI。顺手按 backend §9 实测 T1/T2/T3/T5/T7/T9/T10（curl，结论只改登记文案）。**settings 组结构改造（R01 三件事）也属本波**——它是纯 routes.ts 改动且是后续波的前置。
2. **settings 速赢 + password policy**：home（R28）+ trendz（R29）+ security-settings 双卡（R30，含 JWT 换发链）+ `/settings/repository` 壳页（R22 表单随本波首挂，因为 VC gate 也要它——组件在本波落 `pages/version-control/components/`）+ locale settings 增量 + 页面测试。速赢先行验证组改造没破 SA 既有五页（回归断言随测试）。
3. **settings 重件**：notifications settings（R25，三 provider 子表单 + testSms 弹窗 + 向导跳转闭环）→ queues（R26 列表+详情+表单）→ ai-models（R27，白名单矩阵 + connectivity）+ auto-commit settings 页（R23，依赖 R22 的 gate 表单）+ locale + 测试。本波最重，内部顺序可由实现会话按人力再排。
4. **CF 底座 + 独立页**：组件树骨架（R13 五底座）+ SIMPLE/SCRIPT 配置器 + test dialog（R14/R15）+ 列表页三维过滤（R12）+ 导入导出（R16）+ locale calculated-fields.ts + 测试。
5. **CF 复杂配置器 + tab 升级**：PROPAGATION → 两聚合（metrics 面板）→ GEOFENCING（zone 两件套，末位）+ `CalculatedFieldsTable` 双模式抽取 + **v1 面板退役 + 四处详情页换挂 + locale key 迁移删除**（R17/R32 连带面同 PR 收口）+ 测试。
6. **VC 独立页**：page + versions-table + complex create/restore 双面板 + BranchSelect + diff 形态保持确认（R21）+ locale vc.ts + 测试。
7. **挂载收尾 + 门禁**：VC tab 新挂三处（rule-chains dialog / widget-type details / OTA detail 双 tab 改造）+ 旧 AutoCommitCard 退役（R23，若 §3 拍板执行）+ 版本表/详情页回归 + e2e 登记（R35）+ 全量门禁收尾（lint 0 error/tsc/vitest 定向/check-locale）。

每波收口跑定向门禁并 commit（限额中断恢复靠逻辑单元 commit）；合并顺序即波序。波 2/3 与波 4/5（settings 线 vs CF 线）在 1 完成后无相互依赖，可并行由实现主会话决定。
【依据】scout-cf §15 交付顺序（底座→SCRIPT→PROPAGATION→聚合→GEOFENCING→tab 挂载）采纳为波 4/5 内序；scout-settings §12 顺序（home+trendz→security→notifications→queues→ai-models）采纳为波 2/3 内序；全局依赖（服务层→组改造→各线）为本镜头排序。
【分歧】无。

## 2. 与侦察倾向的差异（推翻与修正清单）

| 条目 | 侦察原倾向 | 本裁决 | 性质 |
|---|---|---|---|
| R08 | scout-vc 裁决点 5：封装 `useVcTask` 轮询 hook | **推翻**——轮询基建已存在（`version-control.ts:256-304` pollUntilDone/await×2，2s 节拍同 ngx），UI 层 useMutation 直消；仅 120s 超时上限顺手对齐后端 180s | 事实修正 |
| R21 | scout-vc 裁决点 4：diff 重写选 monaco DiffEditor / react-diff-viewer | **推翻**——前提失真：antd 已有表格 diff（DiffModal 已验收形态）且独立页（复数）ngx 本无 diff；不引新库，并排文本登记增强 | 事实修正 |
| R22/R23 | scout-vc 裁决点 3：hasRepository 用全局 context/状态库等价物 | 降级——维持现状 per-mount `useQuery(['vc-repo-info'])`（已工作），settings 页保存/删除后 `invalidateQueries` 同 key 即全站联动（含详情 tab gate），无需新全局状态机制 | 简化 |
| R07/R08 | notes §3 缺口表 | **修正**——缺口比文档小：autoCommit 的 GET/POST/DELETE 已全在（`version-control.ts:143-174`，notes 只说「repositorySettings 没有 save」但表格易读成整个 VC settings 缺失）；真缺口 = repositorySettings 系 4 函数 + listVersions + COMPLEX 类型 + CF 5 函数 | 事实修正 |
| R05 | scout-vc §5「13 处详情 tab 全是同一组件换 props、一行接入」 | **修正**——antd 实情：6 处 v1 已挂、3 处可挂、4 处无宿主详情面板（dashboard/widgets-bundle/TBResource×2）登记不实施；「13 处一行接入」不成立 | 事实修正 |
| R12 | scout-cf §8「debug 事件查看两形态需复用评估」（其裁决点 5「开工先盘 ui-antd 现状」） | **已盘结**——EventsPanel 已 entity-agnostic + `eventTypes` 参数化 + DEBUG_CALCULATED_FIELD 在默认集合（`EventsPanel.tsx:27-52` 亲验），Events 弹窗零改造复用；独立页右侧详情 debug tab 形态随「不建详情页」（R02）消解 | 侦察悬问收口 |
| R02 | notes 裁决点 3（CF 独立页形态开放）、scout-cf 裁决点 8 | 收口——平铺列表 + 编辑 Dialog，**不建详情路由页**（与 OTA 差异化：操作密度不同，收敛不损可达性），spec 登记对照清单 | 裁决细化 |
| R17 | notes §9.5「面板保留不动（双入口并存语义）」 | **推翻**——ngx 双入口是同一 table-config 双 pageMode，不是两份实现；v1 面板是功能子集挂账件（头注自述 stay v2），M14 交付后保留即漂移；共享表格双模式才是照抄上游结构 | 推翻 |
| R23 | v1 AutoCommitCard 存续 | 退役（涉删除已交付 UI，§3 上交；技术理由见 R23） | 待拍板默认执行 |
| R30 | notes 裁决点 5（UserPasswordPolicy 上移 vs 留守） | 收口——上移 types/tb/admin.ts + auth.ts re-export（零消费方破坏） | 裁决收口 |
| R37 | 两份侦察各自的域内顺序 | 全局重排——域内序采纳，全局序按「服务层 → 组改造 → 三线」依赖重切七波 | 整合 |

## 3. 仍需用户拍板的偏好项

**技术性偏好项：零。** 36 条技术裁决均可在「等价为底线 + 照 ngx 口径 + 仓内既有范式」三准则下唯一推出。

上交一项范围/存量处置裁决（非偏好，涉删除已交付 UI）：

- **R23b：v1 AutoCommitCard（设备等六处实体详情 VC tab 内的 auto-commit 卡）是否随 M14 auto-commit settings 页交付而退役。** 默认执行退役（功能被 settings 页完全等价覆盖、数据同源、双编辑面互踩、v1 头注自认过渡件）；保留的代价是 settings 页与六张详情卡永久双写同一 map，readOnly 联动与已用类型去重需要在两处各自维护。若用户要保留双入口，架构不变、仅删 R23 退役条目与波 7 对应动作。不表态 = 按默认退役执行。

另登记一处**形态差异知情项**（无需拍板，验收口径知情即可）：antd 的单实体 VC diff 为「字段表」（DiffModal 形态）而非 ngx 的并排文本（R21）；CF 无独立详情路由页（R02）。

## 4. 登记不实施清单（本镜头汇总）

- CF「Add from IoT Hub」入口（R36，iot-hub 域依赖，同 M11 口径）
- alarm-rules 域（ALARM 型 CF 完整表单/条件树/排程；现有 AlarmRulesPanel 维持 v1 形态）（R18，归专项里程碑）
- CF/VC 的 authState 限额接线（maxArgumentsPerCF 等 8 参 + maxResourceSize 同款）（R19；触发条件：auth 波建 sysParams 管线时一行接入）
- TBEL 函数级文档补全提示（现有两层补全等价够用）（R14）
- VC 并排文本 diff（monaco DiffEditor 候选）（R21，触发：验收判字段表不足）
- VC tab 四处无宿主挂载：Dashboard（详情面板 + 编辑页工具栏按钮双入口）/ Widgets Bundle / TBResource ×2（R05；触发：各宿主域详情面板形态决策）
- ngx `/security-settings` 独立树与 `/settings/*→/security-settings/*` 重定向族（R04，antd 归 settings 组，无包袱）
- listEntityTypeVersions（ngx 前端死代码）（R08）
- queues 的 TENANT 只读视图、topic 输入框、ServiceType 切换、Main 保护的后端化（R26；后端 Main 保护另立 issue）
- trendz 全局状态位接线（antd 零消费点）（R29）
- password policy 实时预览面板、pwned-password（HIBP）检查、密码历史条数、强制 2FA 开关（ngx 本无，spec 勿凭空补）（R30）
- ai-models 详情路由页、导出/导入、批量编辑（ngx 本无）（R27）
- requestEntitiesLimitIncrease 的 UI 消费（usage 域关联件）（R11）
- e2e 的 VC 全链与（若 TBEL 未装配）CF testScript 真机链（R35，留人工）
- M12 预留 `getAvailableDeliveryMethods` 的卡片显隐联动为可选增强，默认不接（R11）
