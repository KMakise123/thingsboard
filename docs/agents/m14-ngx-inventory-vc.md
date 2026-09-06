# M14 ui-ngx Version Control（VC）操作面盘点（工作文档，agents 用）

> 由 scout-ngx-vc 盘点产出（2026-09-06，仓库版本 4.4.0）。spec §6（VC 独立页 + repository/auto-commit settings tab）与 §5.6 登记（OTA 详情 VC tab、Edge 详情 VC tab 评估）的实现对照基准；随 M14 收尾可归档或删除。
> 结论先行：ngx 的 VC 域 = 1 个独立页 `/features/vc`（全仓库 Versions 表 + 复数实体 create/restore 双面板，**仅 TENANT_ADMIN**）+ 2 个 settings tab（`/settings/repository`、`/settings/auto-commit`，同样**仅 TENANT_ADMIN**——组件名带 "admin" 但与 SYS_ADMIN 无关，SYS 菜单/路由完全无 VC）+ **13 处实体详情 Version Control tab**（含 OTA；**Edge 详情没有**，7 tab 复核无 VC）+ 1 个 dashboard 编辑页 VC 弹出按钮。全部走 `/api/entities/vc/*` 与 `/api/admin/{repositorySettings,autoCommitSettings}` 两套端点，commit/restore 是「POST 拿 requestId → 每 2 秒轮询 status」的异步任务模型。没有分支新建/删除 UI，没有 checkout（只有 restore/load 语义）。

## 关键文件

- 路由/模块：`ui-ngx/src/app/modules/home/pages/vc/vc-routing.module.ts`、`vc.module.ts`、`pages/features/features-routing.module.ts`
- 独立页主组件：`ui-ngx/src/app/modules/home/components/vc/version-control.component.ts/.html`（无仓库→settings 表单，有仓库→版本表的二段开关）
- 版本表：`.../components/vc/entity-versions-table.component.ts/.html`
- 单实体对话框（popover）：`.../components/vc/entity-version-create.component.ts/.html`、`entity-version-restore.component.ts/.html`、`entity-version-diff.component.ts/.html`
- 复数实体面板：`.../components/vc/complex-version-create.component.ts/.html`、`complex-version-load.component.ts/.html`、`entity-types-version-create.component.html`、`entity-types-version-load.component.html`、`remove-other-entities-confirm.component.ts/.html`
- settings 表单：`.../components/vc/repository-settings.component.ts/.html`、`auto-commit-settings.component.ts/.html`
- settings 壳页：`.../pages/admin/repository-admin-settings.component.ts/.html`、`auto-commit-admin-settings.component.ts/.html`、`pages/admin/admin-routing.module.ts`
- 分支选择器：`ui-ngx/src/app/shared/components/vc/branch-autocomplete.component.ts/.html`
- 模型：`ui-ngx/src/app/shared/models/vc.models.ts`、`shared/models/settings.models.ts`（:467-498）
- 服务：`ui-ngx/src/app/core/http/entities-version-control.service.ts`、`core/http/admin.service.ts`（:85-131）、`core/auth/auth.selectors.ts`（:66-69）
- 后端：`application/src/main/java/org/thingsboard/server/controller/EntitiesVersionControlController.java`、`AdminController.java`（:265-377）、`service/sync/vc/DefaultEntitiesVersionControlService.java`（autoCommit :548-594）、`service/entitiy/AbstractTbEntityService.java`（:104-120）

## 1. 路由、菜单与权限

路由树：
- `/features/vc`：独立页，`VersionControlComponent`，`canDeactivate: ConfirmOnExitGuard`，`auth: [TENANT_ADMIN]`，breadcrumb=MenuId.version_control（`vc-routing.module.ts:24-36`；经 `features-routing.module.ts:24-46` 挂载，features 父段本身也是 auth=[TENANT_ADMIN]）
- 旧路径 `/vc` 重定向到 `/features/vc`（`vc-routing.module.ts:39-44`）
- `/settings/repository`：`RepositoryAdminSettingsComponent`，`auth: [TENANT_ADMIN]`（`admin-routing.module.ts:334-344`）
- `/settings/auto-commit`：`AutoCommitAdminSettingsComponent`，`auth: [TENANT_ADMIN]`（`admin-routing.module.ts:346-356`）
- **SYS_ADMIN 没有任何 VC 路由**。组件名 `*-admin-settings` 只是沿袭 admin 目录，实际后端 `@PreAuthorize("hasAuthority('TENANT_ADMIN')")`（`AdminController.java:277,284,304,331,351,360,371`；EntitiesVersionControlController 类级 :82）——前后端一致收口到 TENANT_ADMIN

菜单（`menu.models.ts`）：
- MenuId 定义：repository_settings/auto_commit_settings（:78-79）、version_control（:112）
- 菜单项：repository_settings「Repository」path `/settings/repository` icon `manage_history`（:433-441）；auto_commit_settings「Auto-commit」path `/settings/auto-commit` icon `settings_backup_restore`（:444-453）；version_control「Version control」path `/features/vc` icon `history`（:779-787）
- TENANT_ADMIN 菜单组：`platform_section` 下先 version_control 再 settings 组（home/notification/repository/auto-commit/trendz/ai-models）（:993-1010）
- SYS_ADMIN 菜单组 platform 只有 general/mail/notifications/queues（:897-905），**无 VC 三项**
- CUSTOMER_USER：无 VC 菜单、无实体详情 VC tab（各 tab 都挂 `authority === TENANT_ADMIN` 守卫，§5）

i18n：`version-control.*` 段（locale.constant-en_US.json）+ `admin.repository*` / `admin.auto-commit*` 段；help 锚 `tb-help="repositorySettings"`（repository-settings.component.html:27）、`tb-help="autoCommitSettings"`（auto-commit-settings.component.html:25）

## 2. features/vc 独立页（全仓库版本操作面）

主组件是二段开关（`version-control.component.html:18-34`）：`hasRepository$`（全局 store）为假 → 内嵌 `tb-repository-settings`；为真 → `tb-entity-versions-table`。输入位：`singleEntityMode`（独立页不传=复数模式）、`externalEntityId`、`onBeforeCreateVersion`（详情场景保存前置钩子）、`versionRestored` 输出。`confirmForm()` 返回内嵌 settings 表单（version-control.component.ts:75-77），未保存离开触发 ConfirmOnExit。

**Versions 表**（`entity-versions-table.component.html`，复数模式与单实体模式共用组件，输入 singleEntityMode 区分）：
- 工具栏：标题（复数=Versions，单实体=Entity versions，:23）+ `tb-branch-autocomplete` 分支选择（selectionMode=true，:24-32）；单实体模式有「Create version」按钮（readOnly 时 disabled，:37-45）；refresh + search 按钮（:46-59）；复数模式有「Create entities version」按钮（:60-69）
- 搜索：独立 toolbar 文本框（400ms debounce，`entity-versions-table.component.ts:187-195`），pageLink.textSearch 透传后端
- 列（displayedColumns :78）：timestamp（可排序，默认 DESC，ts :149-150）/ id（截断 7 位 + tb-copy-button 复制全 hash，html :102-119）/ name（超 256 截断带 tooltip，:120-127）/ author（:128-133）/ actions（stickyEnd）
- 行内动作：单实体模式=「Compare with current」（diff popover）+「Restore version」（restore popover）（:140-157）；复数模式=「Restore version」（complex load popover）（:158-166）
- 分页：10/20/30（:183-188）；空态文案区分单实体/复数（:173-178）
- 取数：无 branch 返回空；单实体走 `listEntityVersions(pageLink, branch, externalEntityId)`（externalEntityId=entity.externalId||entity.id，回查语义：优先 externalId），复数走 `listVersions(pageLink, branch)`（ts :468-484）
- readOnly 仓库（`GET /api/admin/repositorySettings/info` → readOnly）：Create 按钮 disabled（html :40,64），diff/restore 不禁用

**单实体 Create version popover**（`entity-version-create.component.ts`，400px 弹层）：
- 字段：branch（必填，回填当前选中分支）、versionName（必填，默认 `{{entityName}} update` 译文，:89-90）、saveCredentials（仅 DEVICE 显示，:html :42）、saveAttributes / saveRelations（`entityTypesWithoutRelatedData` 类型隐藏，:45-50）、saveCalculatedFields（`typesWithCalculatedFields`=DEVICE/ASSET/ASSET_PROFILE/DEVICE_PROFILE/CUSTOMER 显示；**CUSTOMER 时文案换成 export-alarm-rules**，html :51-53）
- 默认值：saveRelations=false，saveAttributes/saveCredentials/saveCalculatedFields=true（ts :91-94）
- 提交前钩子：详情场景 `onBeforeCreateVersion()`（先保存实体再 commit，dashboard 编辑页用到）；提交后按实体类型强制裁剪 config（ts :114-127）
- 结果流：调 `saveEntitiesVersion`（2s 轮询）；done 且 added+modified=0 或有 error → 原地显示 nothing-to-commit/错误（:136-147）；HTTP 错误 → parseHttpErrorMessage 显示（:149-155）

**单实体 Restore popover**（`entity-version-restore.component.ts`）：
- 先 `getEntityDataInfo(externalEntityId, versionId)` 探测远端版本有什么（hasRelations/hasAttributes/hasCredentials/hasCalculatedFields，ts :89-95），据此显隐四个 load checkbox（html :30-41，CUSTOMER 文案 load-alarm-rules）
- 提交 `loadEntitiesVersion`（SINGLE_ENTITY），失败显示 `entityLoadErrorToMessage`（凭据冲突/缺引用实体/运行时三类，service :168-189）；成功回调 `versionRestored` → 外层刷新列表

**Diff popover**（`entity-version-diff.component.ts`）：
- `compareEntityDataToVersion(entityId, versionId)` 返回 currentVersion/otherVersion 两份 `EntityExportData` JSON（service :161-166），JSON.stringify(4 空格) 后用 **ace-diff** 双栏渲染（mode json，禁编辑，:118-141）；左右滚动条互相联动（jQuery 绑定，:146-157）
- 工具栏：prev/next 差异导航（基于 differ.diffs 行号跳转，:191-202）、差异计数、**Restore version 按钮**（diff 里可以直接进 restore popover，:301-332）、全屏切换；高度按行数自适应 132+n*16px（:112-117）
- 选型注意：ace-diff 依赖全局 `$`（jQuery）+ ace build 懒加载（`getAceDiff()`），antd 重写必须换实现

**复数 Create entities version popover**（`complex-version-create.component.ts`）：
- 字段：branch（必填）、versionName（必填，无默认值）、default syncStrategy（必填，默认 MERGE，:89；带 hint 译文：MERGE=只增改不删、OVERWRITE=会删掉仓库中未选实体）、entityTypes 面板
- entityTypes 面板（`entity-types-version-create.component.html`）：每个类型一个展开面板，字段=entityType 下拉（去重已用类型）、per-type syncStrategy（default/MERGE/OVERWRITE 三态）、saveCredentials（仅 DEVICE）、saveAttributes/saveRelations、saveCalculatedFields（CUSTOMER→export-alarm-rules）、allEntities 滑块（关掉则 `tb-entity-list` 手选 entityIds，:85-97）；add-entity-type/remove-all 按钮；默认配置工厂 `createDefaultEntityTypesVersionCreate()` 对全部 16 种 exportableEntityTypes 预置（vc.models.ts:107-121）
- 提交 `saveEntitiesVersion`（COMPLEX）；结果显示 added/modified/removed 计数（ts :124-144）

**复数 Restore popover**（`complex-version-load.component.ts`）：
- entityTypes 面板（`entity-types-version-load.component.html`）：每类型=entityType 下拉、removeOtherEntities（**危险开关**：勾选时先回滚勾选再弹确认 popover，需逐字输入 "remove other entities" 才真正生效——`entity-types-version-load.component.ts:228-255`、`remove-other-entities-confirm.component.ts:40` + html :34-39）、findExistingEntityByName（默认 true）、loadCredentials/loadAttributes/loadRelations/loadCalculatedFields；另有 rollbackOnError 滑块（默认 true，`complex-version-load.component.ts:83`，html :33-35）
- 提交 `loadEntitiesVersion`（ENTITY_TYPE）；结果按类型显示 created/updated/deleted 计数（ts :94-109），错误显示 `entityLoadErrorToMessage`

## 3. Repository settings 表单（全 VC 域共用一份组件，仅 TENANT）

`tb-repository-settings`（components/vc/repository-settings.component.ts）在三个场景复用：`/settings/repository` 壳页（repository-admin-settings.component.html:18）、`/features/vc` 未配置时（version-control.component.html:19-24，detailsMode）、`/settings/auto-commit` 未配置时（auto-commit-admin-settings.component.html:19-21）。**SYS 与 TENANT 没有两份组件**——upstream 4.4 里它就是 tenant 级配置。

字段集（form 定义 ts :82-93，模板 :39-116）：

| 字段 | 控件/行为 | 锚点 |
| --- | --- | --- |
| repositoryUri | 必填文本 | ts :83、html :39-47 |
| defaultBranch | 文本，默认 'main' | ts :84、html :48-51 |
| readOnly | checkbox（false 默认）；true 时提交后全 VC 域进入只读（versions 表 Create 禁用、auto-commit 表禁用+hint） | ts :85、html :53-55 |
| showMergeCommits | checkbox（false 默认）；仅存储位，4.4 UI 无消费点（不折行显示 merge commit） | ts :86、html :56-58 |
| authMethod | 下拉 USERNAME_PASSWORD / PRIVATE_KEY（必填），切换触发 updateValidators | ts :87、:199-233、html :62-71 |
| username | 密码模式启用 | html :72-77 |
| password | 密码框；已保存时隐藏，需勾「Change password / access token」才出现并可编辑（置空+enable，:183-189） | html :78-92 |
| privateKeyFileName / privateKey | 私钥模式：tb-file-input 拖拽上传；已有 fileName 则 privateKey 非必填 | ts :90-91、:222-226、html :94-101 |
| privateKeyPassword | passphrase；同密码的「Change passphrase」两段式（:191-197） | html :102-115 |

- 加载：hasRepository 才调 `GET /api/admin/repositorySettings`（ignoreErrors），404 容错为 null（ts :105-129）；后端返回时密码/私钥/passphrase 已置 null（`AdminController.java:269-271`）——**凭据永不回显**，编辑走「勾选变更→重新输入」模式
- 按钮：Delete（有 settings 才显示，确认框后 `DELETE /api/admin/repositorySettings`，并广播 `ActionAuthUpdateHasRepository(false)`，ts :159-181）/ Check access（表单合法即可点，`POST /api/admin/repositorySettings/checkAccess`，成功 toast "Repository access successfully verified!"，:132-138）/ Save（invalid 或非 dirty 禁用；成功广播 hasRepository=true，保存后 `entitiesVersionControlService.clearBranchList()` 清分支缓存，:140-157 + admin.service.ts:89-97）
- TS `RepositorySettings` 接口**漏了 readOnly 字段**（settings.models.ts:477-487），但 form.value 提交时带 readOnly，后端 Java 类有该字段——antd 建模时别照抄这个缺口

## 4. Auto-commit settings 表单（TENANT）

`/settings/auto-commit` 壳页同样是二段开关（auto-commit-admin-settings.component.html:18-24）：无 repository → repository settings 表单（先配仓库）；有 → `tb-auto-commit-settings`。

- 数据模型：`AutoCommitSettings = { [entityType]: { branch, saveRelations, saveAttributes, saveCredentials, saveCalculatedFields } }`（settings.models.ts:494-498）；加载先 `GET /api/admin/autoCommitSettings/exists` 再 GET（auto-commit-settings.component.ts:66-76）
- **没有 syncStrategy**——auto-commit 的配置只有 commit 目标分支 + 四个保存开关；MERGE/OVERWRITE 是手动 complex create 的概念，两者不要混
- **关联实体的选择形态**：按 EntityType 粒度配置（`tb-entity-type-select`，选项=exportableEntityTypes 去重已用类型，ts :146-154），**不是**选具体实体/profile；每个配置项=`tb-branch-autocomplete`（空=Default，即仓库 defaultBranch，后端 fallback 再到 'auto-commits' 分支，`DefaultEntitiesVersionControlService.java:563-565`）+ 四个 checkbox（saveCredentials 仅 DEVICE、saveCalculatedFields 按 typesWithCalculatedFields 显隐，html :84-99）
- UI 形态：mat-expansion-panel 列表，面板标题=「类型名 (auto-commit to <branch> branch)」（entityTypeText 带 HTML，ts :132-144）；add-entity-type / remove-all / 行内 remove；空态提示 no-auto-commit-entities-prompt（html :107-112,113-127）
- readOnly 联动：`getRepositorySettingsInfo().readOnly` 为真时整个 fieldset 禁用 + 底部 hint「Auto-commit feature doesn't work with enabled read-only option...」（ts :83、html :36,130-132）
- 按钮：Delete（确认框）、Save（invalid/非 dirty/readOnly 禁用）；保存时后端校验分支名（`AdminController.java:363` VcUtils.checkBranchName）
- **auto-commit 的触发不在前端**：后端在各实体的 Tb*Service 保存后调 `autoCommit(user, entityId)`（DefaultTbDeviceService.java:69、DefaultTbAssetService.java:53、DefaultTbDashboardService.java:61、DefaultTbCustomerService.java:45、DefaultTbDeviceProfileService.java:47、DefaultTbAssetProfileService.java:47、DefaultTbEntityViewService.java:94、DefaultTbAiModelService.java:47、DefaultWidgetTypeService.java:63、DefaultWidgetsBundleService.java:51,77,83——**rule chain 与 OTA package 无自动 commit**），异步执行，无进度反馈 UI

## 5. 实体侧 VC 挂载点（13 tab + 1 按钮）

统一形态：详情面板尾部 `mat-tab label=version-control.version-control`，内容 `<tb-version-control detailsMode singleEntityMode ...>`（三传 entityId/entityName/externalEntityId=entity.externalId||entity.id，restore 后回调 entitiesTableConfig.updateData()）。外层守卫分三档：

| 实体 | 守卫条件 | 锚点 |
| --- | --- | --- |
| Customer | TENANT_ADMIN | customer-tabs.component.html:53-63 |
| Asset | TENANT_ADMIN | asset-tabs.component.html:53-61 |
| Device | TENANT_ADMIN | device-tabs.component.html:55-61 |
| Entity View | TENANT_ADMIN | entity-view-tabs.component.html:58-65 |
| Dashboard | TENANT_ADMIN | dashboard-tabs.component.html:24-31 |
| Rule Chain | TENANT_ADMIN | rulechain-tabs.component.html:67-74 |
| Device Profile | TENANT_ADMIN 且 !isEdit | device-profile-tabs.component.html:104-114 |
| Asset Profile | TENANT_ADMIN | asset-profile-tabs.component.html:31-42 |
| Widgets Bundle | isTenantWidgetsBundle() 且 TENANT_ADMIN | widgets-bundle-tabs.component.html:18-25 |
| Widget Type | isTenantWidgetType() 且 TENANT_ADMIN | widget-type-tabs.component.html:18-25 |
| TBResource（resources 库） | tenantId≠NULL_UUID 且 TENANT_ADMIN 且 !isEdit | admin/resource/resource-tabs.component.html:24-31 |
| TBResource（resources-library） | 同上 | admin/resource/resource-library-tabs.component.html:18-25 |
| **OTA Package** | isTenantOtaUpdate()（tenantId≠NULL_UUID）且 TENANT_ADMIN | ota-update-tabs.component.html:18-25（isTenantOtaUpdate 定义 ota-update-tabs.component.ts:37-39） |

- dashboard 编辑页另有第三入口：工具栏 VC 按钮（isEdit && isTenantAdmin()，dashboard-page.component.html:172-184），点开 popover 式 VersionControlComponent（singleEntityMode，dashboard-page.component.ts:1713-1735），带 onBeforeCreateVersion（先存 dashboard 再 commit）
- **Edge 详情没有 VC tab**（复核 M13 结论成立）：edge-tabs.component.html 全文 7 个 tab（attributes/telemetry/alarms/events/downlinks/relations/audit-logs），无 tb-version-control
- tb-version-control 在详情里未配置仓库时会**就地变成 repository settings 表单**（detailsMode 卡片），等于每个实体详情都是仓库配置入口
- CUSTOMER_USER：以上 13 处全部被守卫挡住；VC 域整体与 customer user 无关

## 6. 服务与端点

**EntitiesVersionControlService**（core/http/entities-version-control.service.ts，全部 `/api/entities/vc`）：

| 函数 | 端点 | 锚点 |
| --- | --- | --- |
| listBranches()（内存缓存，登录用户切换清空） | GET /branches | :71-83 |
| getEntityDataInfo(externalEntityId, versionId) | GET /info/{versionId}/{entityType}/{externalEntityUuid} | :85-90 |
| saveEntitiesVersion(request)（POST 拿 requestId → timer(0,2000) 轮询 status；全局 loading 锁；finalize 清分支缓存） | POST /version + GET /version/{requestId}/status | :92-115 |
| listEntityVersions(pageLink, branch, externalEntityId) | GET /version/{entityType}/{externalEntityUuid}?branch= | :117-123 |
| listEntityTypeVersions(...)（**前端零调用，死代码**） | GET /version/{entityType}?branch= | :125-131 |
| listVersions(pageLink, branch) | GET /version?branch= | :133-138 |
| loadEntitiesVersion(request)（同 save 的轮询模型） | POST /entity + GET /entity/{requestId}/status | :140-159 |
| compareEntityDataToVersion(entityId, versionId) | GET /diff/{entityType}/{internalEntityUuid}?versionId= | :161-166 |
| entityLoadErrorToMessage(error)（纯前端翻译） | — | :168-189 |

**AdminService VC 部分**（admin.service.ts）：getRepositorySettings GET /api/admin/repositorySettings（:85-87）、saveRepositorySettings POST（保存后 clearBranchList，:89-97）、deleteRepositorySettings DELETE（:99-105）、checkRepositoryAccess POST .../checkAccess（:107-110）、getRepositorySettingsInfo GET .../info（:112-114）、getAutoCommitSettings/autoCommitSettingsExists/saveAutoCommitSettings/deleteAutoCommitSettings（:116-131）。

**后端要点**（fork 核实：git log 显示 VC 后端仅 open-api 文档层提交，逻辑为 upstream 4.4 原样）：
- `EntitiesVersionControlController`：类级 `@PreAuthorize("hasAuthority('TENANT_ADMIN')")` + 每端点 `Resource.VERSION_CONTROL` 的 READ/WRITE 校验（:82）；比前端多两个**未被 UI 消费**的端点：`GET /entity/{entityType}/{versionId}` 与 `GET /entity/{versionId}`（列出版本中的实体清单，:316-335）；branches 端点把 settings.defaultBranch 排到返回首位标记 default（:499-520）；异步操作超时 `queue.vc.request-timeout:180000`（:88-89）
- swagger 注释仍写「Supported entity types: CUSTOMER, ASSET, RULE_CHAIN, DASHBOARD, DEVICE_PROFILE, DEVICE, ENTITY_VIEW, WIDGETS_BUNDLE」（:93,373）——**滞后**；前端 exportableEntityTypes 已是 16 种（vc.models.ts:24-41，新增 WIDGET_TYPE/TB_RESOURCE/OTA_PACKAGE/NOTIFICATION_TEMPLATE/TARGET/RULE/AI_MODEL）。实际能力以运行时为准，验收用真仓实测
- 版本创建时分支不存在会自动建空分支（EntitiesVersionControlController.java:96 注释）——分支「创建」只经由 commit 发生，无独立管理端点

## 7. 角色差异汇总

- **SYS_ADMIN**：无 VC 路由、无菜单、后端 @PreAuthorize 拒绝。VC 域 100% 与系统管理员无关（「settings 六小件」中 repository/auto-commit 归 TENANT settings 组）
- **TENANT_ADMIN**：全量。/features/vc、/settings/repository、/settings/auto-commit、13 个实体详情 VC tab、dashboard 编辑页按钮；全部写操作
- **CUSTOMER_USER**：零入口（路由 auth、tab 守卫、后端 TENANT_ADMIN 三层都挡）

按钮级权限：路由 auth 之外没有更细的 permission 指令；UI 级收缩只有两处——readOnly 仓库使 Create/commit 类按钮与 auto-commit 设置禁用（entity-versions-table.component.html:40,64、auto-commit-settings.component.html:36），以及 isEdit/tenant 归属守卫（§5 表）。后端统一 `Resource.VERSION_CONTROL` + Operation（READ/WRITE/DELETE）。

## 8. 范围边界（4.4 ngx 里没有的东西，spec 不要凭空补）

- **无分支管理 UI**：不能新建/删除/重命名分支；分支只经「往不存在的分支 commit」隐式创建（后端注释 :96）；分支列表有前端缓存（登录级），保存 repository settings 后才失效
- **无 checkout/工作区概念**：只有 commit（create version）与 restore/load；没有「切换分支后当前数据变化」的会话语义，分支选择仅过滤 commit 列表
- **无 commit diff 视图（仓库级）**：diff 只有「单实体当前 vs 指定版本」（popover）；复数版本没有 diff/预览，restore 靠配置项兜底（rollbackOnError/removeOtherEntities 确认）
- **无「列出版本包含哪些实体」的 UI**：后端 listEntitiesAtVersion/listAllEntitiesAtVersion 存在但前端不消费
- **listEntityTypeVersions 是前端死代码**（service 有函数无调用方）
- **showMergeCommits 无消费**：表单可存，但 4.4 版本表不因它改变渲染
- **无 auto-commit 手动触发/进度 UI**：触发纯后端（保存实体时），settings 页只管配置
- **无 per-entity-type 的版本列表页**：复数模式只有一个扁平 Versions 流（按分支全量），不做类型过滤
- 版本表无行展开、无多选批量操作

## 9. 裁决点（M14 实现需拍板）

1. **「admin-settings 命名」纠偏**：任务输入假设 repository-admin-settings/auto-commit-admin-settings 是 SYS 侧 settings tab——实测它们挂在 `/settings/{repository,auto-commit}`、auth 与后端 PreAuthorize 均 TENANT_ADMIN，SYS 无此域。倾向：spec §6 按 TENANT settings 六小件归位写死，antd 路由用 `/settings/repository`、`/settings/auto-commit` 对齐，不建 SYS 版本。
2. **OTA 详情 VC tab 归属**：ngx 4.4 里 OTA 详情**确实有** VC tab（§5，isTenantOtaUpdate=TENANT_ADMIN 且非 sys 级包），M13 §5.6 登记与 ngx 一致、不是 ngx 缺失。倾向：M14 把 OTA 详情 VC tab 列为正式验收项（薄挂载：antd OTA 详情组件加一个 tab 复用 VC 面板），而 Edge 详情 VC tab 维持「无」结论，仅作 §5.6 增强登记不实现。
3. **hasRepository 全局状态方案**：ngx 用 ngrx store（sysParams 初始化 + 保存/删除时本地广播）。倾向：antd 用全局 context/状态库等价物，初值从登录 sysParams（SystemParams.hasRepository，SystemParams.java:29）拿；若 antd 登录链路没有该字段，可降级为进页时 `GET /repositorySettings/exists` 探测，但要在 spec 写明。
4. **diff 视图选型**：ngx 用 ace-diff+ace+jQuery。倾向：antd 重写选 monaco DiffEditor（json 高亮、左右同步、差异导航开箱即用）或 react-diff-viewer 类轻量方案；验收点=双栏 JSON、差异计数、上下导航、全屏、可从 diff 直接 restore。ace 方案不值得复刻。
5. **异步任务模型**：commit/restore 都是「POST→requestId→2s 轮询 status」。倾向：antd 保持同模型（后端语义决定的），封装一个 useVcTask 轮询 hook；全局 loading 锁（ngx 用 ActionLoadStart/Finish 顶栏进度条）在 antd 可用全局 loading 条/遮罩等价实现。
6. **danger 操作强度**：removeOtherEntities 要逐字输入 "remove other entities"（ngx 特有交互）。倾向：保留（删除全部未含实体属不可逆动作），文案可中文化但验证串建议保留英文原文以对齐验收口径；delete repository/auto-commit settings 用普通确认框即可。
7. **exportableEntityTypes 16 种的后端实底**：swagger 注释只认 8 种，前端 16 种，4.4 后端实际支持范围需实测（尤其 OTA_PACKAGE/TB_RESOURCE/AI_MODEL/NOTIFICATION_*）。倾向：antd 类型清单照前端 16 种做常量，验收用真仓实测逐类型打勾；不支持的类型实测若后端报错，在 spec errata 登记，不擅自裁清单。
8. **CUSTOMER 的 alarm-rules 文案分支**：save/loadCalculatedFields 在 CUSTOMER 上显示为 export/load alarm rules（i18n 分支）。倾向：照抄（语义=customer 的告警规则随 calculated fields 机制存取），antd 常量表按类型映射文案。
9. **settings 表单「凭据不回显」模式**：后端 GET 永远 null 密码/私钥，前端用「Change password/passphrase」勾选解锁输入。倾向：antd 复刻该交互（AntD Form 初值置空 + 勾选后渲染受控输入），别做成「密码占位符可编辑」的假象，否则会把 null 提交覆盖真凭据。
10. **分支选择器双模式**：ngx branch-autocomplete 有 selectionMode（只能选已有分支，versions 表/restore 用）与自由输入模式（创建面板用，输入新名=往新分支提交）。倾向：antd 一个 Select(allowClear)+showSearch 组件带 freeInput prop 两种形态，auto-commit settings 用的是「自由输入+已有分支补全」的第三形态（emptyPlaceholder=Default），三处合一组件 + 三种 props 组合。
11. **VC tab 挂载的复用架构**：13 处详情 tab 全是同一个组件换 props。倾向：antd 做一个 `<VersionControlTab entityId entityName externalEntityId onRestored>` 包装（内部含「未配仓库→settings 表单」分支），各详情页一行接入；把「未配仓库就地显示 settings」也保留（这是 4.4 的实际行为，用户可在任意详情里配仓库）。

## 10. 工作量分级

**最重**
1. `/features/vc` 独立页整块：Versions 表（分支选择/搜索/分页排序/id 复制）+ 复数 create 面板（16 类型配置、syncStrategy、tb-entity-list 选实体）+ 复数 restore 面板（removeOtherEntities 逐字确认、rollbackOnError）+ 双异步任务轮询与结果/错误流——ngx 侧对应约 8 个组件文件，antd 要一次成型
2. 单实体 diff 视图（ace-diff 替代选型 + 双栏联动 + 导航/全屏/diff 内 restore）

**中**
3. repository settings 表单（双 authMethod 动态校验、凭据不回显两段式、checkAccess、delete 确认、readOnly 联动全 VC 域）
4. auto-commit settings（动态展开面板 FormArray、类型去重下拉、分支补全、readOnly 禁用联动）
5. 13 处详情 tab 挂载 + dashboard 编辑页按钮（每个都是薄挂载但需逐页验收，device-profile/resource 有 !isEdit 附加条件）

**轻**
6. 路由/菜单/hasRepository 状态、branch-autocomplete 组件、单实体 create/restore 弹层（字段少，复用 §10.1 的轮询基建）
7. 分支选择器与 entity-type 选择器若 antd 已有等价物，仅包一层
