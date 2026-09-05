# M13 ui-ngx Edge 操作面盘点（工作文档，agents 用）

> 由 scout-ngx 盘点产出（2026-09-06，仓库版本 4.4.0）。spec §5（Edge 实体全操作面）与实现者的对照基准；随 M13 收尾可归档或删除。
> 结论先行：ngx 的 Edge 家族 = 1 个 Edge 列表页（instances）+ 1 个「规则链模板」列表页 + Edge 详情面板（7 个通用 tab）+ 5 类**平级路由的子实体列表页**（assets/devices/entityViews/dashboards/ruleChains，复用各自实体的 table resolver，用 scope 变体驱动）。不存在「Edge 详情里嵌实体 tab」的结构。

## 关键文件

- 路由/模块：`ui-ngx/src/app/modules/home/pages/edge/edge-routing.module.ts`、`edge.module.ts`
- 列表：`.../pages/edge/edges-table-config.resolver.ts`、`edge-table-header.component.ts/.html`
- 详情：`edge.component.ts/.html`（overview 表单+按钮区）、`edge-tabs.component.ts/.html`（tab 装配）
- 指引对话框：`edge-instructions-dialog.component.ts/.html/.scss`
- Downlinks 表：`ui-ngx/src/app/modules/home/components/edge/{edge-downlink-table.component.ts, edge-downlink-table-config.ts, edge-downlink-table-header.component.ts/.html}`
- 模型/服务：`ui-ngx/src/app/shared/models/edge.models.ts`、`ui-ngx/src/app/core/http/edge.service.ts`
- 子实体复用：`pages/{asset/assets-, device/devices-, entity-view/entity-views-, dashboard/dashboards-}table-config.resolver.ts`、`pages/rulechain/rulechains-table-config.resolver.ts`
- 分配对话框：`ui-ngx/src/app/modules/home/dialogs/add-entities-to-edge-dialog.component.ts/.html`

## 1. 路由、菜单与权限

路由树（`edge-routing.module.ts`）：
- `/edgeManagement`（父段 breadcrumb=菜单，:46-53），默认重定向到 instances（:55-62）
- `/edgeManagement/instances`：列表，auth=[TENANT_ADMIN, CUSTOMER_USER]，data.edgesType='tenant'（:71-82）
- `/edgeManagement/instances/:entityId`：Edge 详情页（EntityDetailsPageComponent + 同一 resolver），同 auth（:83-99）
- `/edgeManagement/instances/:edgeId/assets`：列表+`:entityId` 详情，assetsType='edge'，auth 同上（:100-139）
- `/edgeManagement/instances/:edgeId/devices`：devicesType='edge'，auth 同上（:140-179）
- `/edgeManagement/instances/:edgeId/entityViews`：entityViewsType='edge'，auth 同上（:180-219）
- `/edgeManagement/instances/:edgeId/dashboards`：dashboardsType='edge'，auth 同上；`:dashboardId` 打开 DashboardPageComponent（:220-257）
- `/edgeManagement/instances/:edgeId/ruleChains`：ruleChainsType='edge'，**仅 TENANT_ADMIN**；`:ruleChainId` 打开 EDGE 类型的规则链画布（:258-302）
- `/edgeManagement/ruleChains`（规则链模板）：ruleChainsType='edges'，仅 TENANT_ADMIN；`:ruleChainId` 画布 + `ruleChain/import` 导入页（RuleChainImportGuard）（:305-369）
- 旧路径 `edgeInstances/...` 全量 301 到新路径（:372-426）；注意 dashboards/rulechains resolver 行内打开仍用旧路径字符串（`dashboards-table-config.resolver.ts:389-390`、`rulechains-table-config.resolver.ts:338-339`），靠这批 redirect 兜底

customers 视角（不叫 edgeManagement 段）：
- `/customers/:customerId/edgeInstances`：edgesType='customer'，仅 TENANT_ADMIN（`customer-routing.module.ts:191-228`）
- 全仓 `edgeManagement` 出现处：edge 路由/列表、菜单路径、`entity-type.models.ts:688`（EDGE 的 rootPath='/edgeManagement/instances'）、规则链三处跳转（`rulechain-page.component.ts:340,1733`、`rule-node-details.component.ts:56`、`rule-node-details.component.ts:187`、`rule-chain-autocomplete.component.ts:163`）

菜单（`menu.models.ts`）：
- MenuId 定义 edge_management/edges/edge_instances（:106-108）
- 菜单项：edge_management（toggle，icon settings_input_antenna，:716-724）、edges「Instances」（:726-735）、edge_instances（customer 用，:737-746）、rulechain_templates「Rule chain templates」（:747-757）
- TENANT_ADMIN 菜单组：edge_management = [edges, rulechain_templates]（:1011-1017）；CUSTOMER_USER 顶层 edge_instances（:1057）；SYS_ADMIN 无 Edge 菜单
- 显隐开关：三个菜单项挂 `authState.edgesSupportEnabled` 过滤（:832-842，过滤逻辑 :1090-1105）；该值来自 `GET /api/system/params`（`core/auth/auth.service.ts:456-466`，`core/auth/auth.models.ts:25`）。注意 customer 的 edge_instances **没有**挂此过滤，恒显（4.4 的不一致点）
- 客户侧入口：客户详情按钮 manageEdges（`customer.component.html:49-56`）、客户列表行内 manage-customer-edges（`customers-table-config.resolver.ts:105-118`、跳转 :178-183）
- i18n 英文名：locale.constant-en_US.json:2881（Edge instances）、:2887（Edge management）、:2956（Rule chain templates）

EntityType 注册（`entity-type.models.ts`）：译文 :197-207、helpId 'edges' :578-580、rootPath :688

## 2. Edge instances 列表（三 scope：tenant / customer / customer_user）

scope 由路由 data.edgesType 决定；CUSTOMER_USER 强制改写为 'customer_user' 并以本人 customerId 取数（`edges-table-config.resolver.ts:109-121`）。标题：客户视角显示「客户名: Edge instances」或 public 客户显示 Public edges（:126-135）。

- 列：createdTime / name / type / label；tenant 追加 customer + public 复选列（:150-167）
- 取数：tenant→`GET /api/tenant/edgeInfos`；customer(_user)→`GET /api/customer/{customerId}/edgeInfos`（:169-185；`edge.service.ts:62-66,84-88`）；删除：tenant→DELETE edge，customer 系→仅「解除分配」（:173-184）
- 顶栏：类型筛选下拉（`edge-table-header.component.html:18-24`，切换 resetSortAndFilter `edge-table-header.component.ts:38-41`，类型源 `GET /api/edge/types` `entity.service.ts:1552-1566`）；tenant 头部按钮=新增+导入，customer 头部按钮=分配已有 Edge（:319-348）
- 行内操作（tenant，:189-245）：make public（未分配时）/ assign to customer（未分配时）/ unassign（已分配非 public）/ make private（public 时）/ manage assets / devices / entity views / dashboards / rule chains（跳子列表页）
- 行内操作（customer scope，:247-261）：unassign / make private；customer_user（:263-289）：manage assets/devices/entityViews/dashboards（无 rulechains、无分配类操作）
- 批量：tenant 批量分配客户（:296-305）；customer 批量解除分配（:306-315，逐条 forkJoin :489-515）
- 开关：addEnabled 除 customer_user；批量删除与单删仅 tenant（:141-143）；customer_user 详情只读 detailsReadonly（:105）
- 新增流程：泛型 AddEntityDialog 包 tb-edge 表单（:535-559）；保存成功广播 `edgeSaved`（:99），且**默认自动弹出安装指引对话框**，除非用户设置 notDisplayInstructionsAfterAddEdge（:546-555；该设置在指引对话框勾选后写入用户偏好 `edge-instructions-dialog.component.ts:86-93`）
- 导入：homeDialogs.importEntities(EDGE) → `POST /api/edge/bulk_import`（:350-357；`import-export.service.ts:593-601`、`edge.service.ts:113-115`）。**没有导出**（import-export 的 exportEntity 分支无 EDGE，列表也无导出按钮）
- 详情按钮区与表单见 §3/§4；动作分发表 :582-621（open/makePublic/assign/unassign/openEdgeXxx/syncEdge/openInstallInstructions/openUpgradeInstructions）

## 3. 新增/编辑 Edge 对话框（字段级）

表单构建 `edge.component.ts:71-88`，模板 `edge.component.html:147-205`：

| 字段 | 控件/校验 | 锚点 |
| --- | --- | --- |
| name | 必填，maxLength 255（错误文案 name-required/name-max-length） | ts :74、html :149-158 |
| type | tb-entity-subtype-autocomplete（EDGE 子类型），必填，默认 'default' | ts :75、html :159-164 |
| label | 可空，maxLength 255 | ts :76、html :190-197 |
| routingKey（Edge key） | **禁用只读**；新建时前端本地生成 `guid()` | ts :77,138-143、html :166-177 |
| secret（Edge secret） | **禁用只读**；新建时前端本地生成 `generateSecret(20)` | ts :78,138-143、html :178-189 |
| additionalInfo.description | 多行文本，自动伸缩 | ts :79-83、html :198-203 |

- 只读字段在 updateFormState 里始终 disable（ts :108-112）；**UI 无「重新生成 key/secret」**，无 license、无 cloud endpoint、无 customer 字段（分配靠列表/详情动作，html :137-142 只读展示 assignedToCustomer + public 提示 :143-146）
- key/secret 行在 customer_user 隐藏（html :166,178）；编辑页加载时调 `GET /api/edge/{id}/upgrade/available` 得 upgradeAvailable（ts :102-105），驱动 §4 指引按钮二态

## 4. Edge 详情（按钮区 + tab 装配）

详情按钮区（`edge.component.html`，均为 isEdit 或 customer_user 时隐藏）：
- 打开详情页 open（:19-24）；make public（:25-30，仅 tenant 未分配）；assign to customer（:31-36）；unassign/make private（:37-42，tenant+customer scope）
- manage assets/devices/entityViews/dashboards（:43-66，tenant+customer_user）；manage rule chains（:67-72，仅 tenant）
- delete（:73-78，deleteEnabled 即 tenant）
- 复制三连：Copy ID / Copy Edge key / Copy Edge secret（:79-106，key/secret 对 customer_user 隐藏；toast :114-136 of ts）
- Sync Edge（:107-114）→ `POST /api/edge/sync/{id}`，toast「同步进程已启动」即返回，无状态轮询（`edges-table-config.resolver.ts:517-533`、`edge.service.ts:101-103`）
- 指引二态按钮：无升级→Install & Connect Instructions；有升级→Upgrade Instructions（:116-134）

详情 tabs（`edge-tabs.component.html`；枚举来自基类 `entity-tabs.component.ts:44-57`）：
1. Attributes（SERVER_SCOPE，tb-attribute-table，全角色，:18-27）
2. Latest telemetry（禁用 scope 选择，:28-38）
3. Alarms（tb-alarm-table，:39-44）
4. Events（**tb-event-table defaultEventType=ERROR**，全角色，:45-51）——这是 Edge 实体自身的 ERROR 事件：`GET /api/events/EDGE/{id}/ERROR`（`event.service.ts:37`），列=时间/server/method/error 弹窗（`event-table-config.ts:200-216`）
5. Downlinks（tb-edge-downlink-table，**仅 TENANT_ADMIN**，:52-58）→ 见 §5
6. Relations（tb-relation-table，:59-64）
7. Audit logs（仅 TENANT_ADMIN，:65-70）
- 没有 credentials tab、没有 overview/attributes 之外的 Edge 专属 tab；也没有「Edge 详情内嵌设备/资产列表」——那些是 §6 的平级路由页

## 5. Downlinks tab（Edge 同步事件表，TENANT_ADMIN only）

`edge-downlink-table-config.ts`：
- 开关：时间分页（useTimePageLink）、无搜索/新增/删除/多选/详情面板，loadDataOnInit=false（:71-84），默认 createdTime DESC（:84）；表头组件是空 div（`edge-downlink-table-header.component.html:18-19`）——无时间段选择 UI
- 取数：先读 Edge 的 SERVER_SCOPE 属性 `queueStartTs`，再 `GET /api/edge/{id}/events`（:89-94；`edge.service.ts:95-99`）——这是全 ngx 唯一消费 edge events 端点的地方
- 列（:105-145）：createdTime / type（20 种 EdgeEventType 译名 `edge.models.ts:100-123`）/ action（21 种 EdgeEventActionType 译名 :125-149）/ entityId / status / data 查看
- status 是**派生值**：createdTime ≤ queueStartTs → Deployed（黑），否则 Pending（灰），颜色 `edge.models.ts:159-164`（:121-126,147-157）
- data 查看：非 ADMIN_SETTINGS 且非 DELETED 才可点（:159-162）；内容经 `entityService.getEdgeEventContent`（按类型回查实体或直接用 body，`entity.service.ts:1509-1550`）→ JSON 弹窗（:164-183）；取不到则左上错误 toast（:185-194）

## 6. Edge 子实体列表页（平级路由，逐个）

通用模式：resolver 读 route.data.xxxType='edge' → scope 变体；CUSTOMER_USER 再改写为 `edge_customer_user`（只读）。表标题=「Edge 名: 实体复数」。

- **assets**（scope 'edge'/'edge_customer_user'）：fetch `GET /api/edge/{id}/assets`（`assets-table-config.resolver.ts:189-191`）；头部动作=「分配已有资产」对话框（:322-328）；行内=Unassign from edge（:246-252）；批量 unassign（:281-287）；customer_user 只读（:108,126-127,156）；对话框 `add-entities-to-edge-dialog.component.ts`（forkJoin 逐条 `POST /api/edge/{edgeId}/asset/{id}`，:116-145；`asset.service.ts:110-121`）
- **devices**：fetch 走 **device info query filter**（POST 查询，filter.edgeId，`devices-table-config.resolver.ts:270-287`）；头部动作=「分配已有设备」（:441-450）；行内=Unassign from edge（:357-366）；批量 unassign（:392-401）；edge_customer_user 只读+View credentials（:347-356）。**edge scope 内不能新建/导入设备**，也没有 manage credentials（那是 tenant/customer scope 专属 :318-345）；端点 `device.service.ts:200-216`
- **entityViews**：fetch `GET /api/edge/{id}/entityViews`（`entity-views-table-config.resolver.ts:187-189`）；头部=分配已有（:303-309）；行内 unassign（:243-252）；批量（:278-284）；customer_user 只读（:108,125-126,156）；端点 `entity-view.service.ts:95-107`
- **dashboards**：fetch `GET /api/edge/{id}/dashboards`（`dashboards-table-config.resolver.ts:208-210`）；行内=导出+unassign（:271-286）；批量 unassign（:329-335）；头部=分配已有（:370-378）；行内打开 dashboard 用旧路径 `edgeInstances/{edgeId}/dashboards/{id}`（:389-390）；customer_user 只读（:121,147-148,179）；端点 `dashboard.service.ts:186-201`
- **ruleChains（Edge 实例内的规则链）**：fetch `GET /api/edge/{id}/ruleChains`（`rulechains-table-config.resolver.ts:196-204`）；root 复选列显示该 Edge 的根规则链（:137-147）；头部=分配已有（:183-192）；行内=Set root（确认后 `POST /api/edge/{edgeId}/{ruleChainId}/root` :273-280,366-395）+ Unassign（根链禁用 :281-287）；批量 unassign（:216-225）；**进入页面前有缺失检查**：`GET /api/edge/missingToRelatedRuleChains/{id}`，缺则 alert 列出缺失（:447-459；`edge.service.ts:105-107`）；本页删除/新建禁用（:123）
- **规则链模板页**（/edgeManagement/ruleChains，scope 'edges'）：fetch=自动分配链列表 `GET /api/ruleChain/autoAssignToEdgeRuleChains`（:199-200,606-612）；列=root 模板复选 + assignToEdge 复选（:148-154）；行内=Set Edge template root / Set(Unset) auto-assign to edge（:251-271；`rule-chain.service.ts:279-292`）；头部=新建/导入（EDGE 类型）/IoT Hub（:159-181）；导入走 `ruleChain/import` 守卫路由（`edge-routing.module.ts:347-367`）；画布打开 ruleChainType=EDGE（:326-346）；核心服务端点 `rule-chain.service.ts:265-296`

## 7. 安装/升级指引对话框

`edge-instructions-dialog.component.ts/.html`：
- 三态标题：新建后自动弹（install-connect-instructions-edge-created，且显示「不再显示」开关）/ 升级指引 / 主动打开的安装指引（:66-76）
- 内容：Docker / Ubuntu / CentOS-RHEL 三个 tab（html :31-71），markdown 由后端拼好返回：`GET /api/edge/instructions/install/{edgeId}/{method}` 或升级 `GET /api/edge/instructions/upgrade/{edgeVersion}/{method}`（ts :99-118；`edge.service.ts:117-123`）；升级判定：先读 Edge 的 SERVER_SCOPE 属性 `edgeVersion`（`edge.models.ts:192`），有值才走 upgrade（ts :103-110）；已加载内容按 method 缓存（ts :100,114-117）
- 关闭时若勾选不再显示 → 写用户设置 notDisplayInstructionsAfterAddEdge（ts :86-93）；加载中转圈（html :74-80）
- 无「重新生成 secret」、无 connect JSON 视图——连接参数（key/secret）只在详情页复制按钮里

## 8. 角色差异汇总

- **SYS_ADMIN**：无任何 Edge 路由/菜单
- **TENANT_ADMIN**：全量。instances CRUD+分配+public+导入+sync+指引；五个子实体页可写；rulechains/规则链模板页仅此角色；Downlinks/Audit tabs 仅此角色
- **CUSTOMER_USER**：只读。列表可看（customer_user scope，删除=解除分配但按钮不可达）、详情只读（detailsReadonly `edges-table-config.resolver.ts:105`）；可进 assets/devices/entityViews/dashboards 四个子列表（只读，设备可看凭据）；key/secret/sync/指引按钮全部隐藏（`edge.component.html:94,103,111,121`）；tabs 只剩 attributes/telemetry/alarms/events/relations
- 菜单开关 edgesSupportEnabled 只约束 TENANT 侧三项（§1）

## 9. 范围边界（4.4 ngx 里没有的东西，spec 不要凭空补）

- 无 Edge 导出（仅 bulk import）；无 activate/连接状态 UI（EdgeConnectionEvent 枚举仅被通知规则触发器用，`rule-notification-dialog.component.ts:141-142`）
- 无 Edge license / cloud endpoint / secret 重新生成 / connect JSON
- 「edge.events」tab ≠ Edge 同步事件（§4.4 结论）；真正的同步事件面 = Downlinks tab（§5）
- Edge 画布（EDGE 类型规则链编辑器）属于规则链域，仅在 edgeManagement 路由下换了 ruleChainType（`edge-routing.module.ts:291,337,360`）

## 10. 工作量分级

**最重**
1. Edge 子实体五页：assets/devices/entityViews/dashboards/ruleChains 都要「复用各实体列表 + edge scope 变体」，每页各自的角色收缩/分配对话框/批量 unassign 各不相同；且 antd 侧这些实体列表若尚未具备 scope 参数化能力，是本里程碑最大前置改造
2. 规则链模板页 + Edge 内规则链（root 机制、auto-assign、missingToRelatedRuleChains 检查、EDGE 画布入口）——除画布本身外仍有 8 个端点交互

**中**
3. instances 列表三 scope 动作矩阵 + 分配/解除分配/public 泛型对话框
4. Downlinks 表（queueStartTs 派生状态 + 按类型回查实体内容）——逻辑零碎但面窄
5. 详情按钮区 14 个动作 + 指引对话框（后端拼 markdown，前端纯渲染）

**轻**
6. 新增/编辑对话框（6 字段，key/secret 本地生成）
7. 路由/菜单/edgesSupportEnabled 开关

## 11. 裁决点（M13 实现需拍板）

1. **子实体页形态**：照 ngx 做平级路由列表页，还是做成 Edge 详情内嵌 tab？倾向：跟 ngx 平级路由走（antd 已有路由习惯），但列表组件必须复用 ui-antd 现有设备/资产/实体视图/仪表盘页面并加 scope prop，避免第二套实现。
2. **设备列表取数端点**：ngx 用 POST device-info-query + filter.edgeId，而 `GET /api/edge/{id}/devices` 也在。倾向：用 GET 端点（幂等、好缓存），除非 antd 已有 query-filter 封装可白拿（含 active/deviceProfile 过滤）。
3. **events tab 语义**：照抄 ngx（Edge 实体 ERROR 事件）还是直接做 Edge 同步事件表？倾向：两个都登记进 spec——ERROR tab 按 ngx 对齐（便宜），同步事件表以 Downlinks tab 形式单独验收（依赖 `/api/edge/{id}/events` + queueStartTs），可列为 P1 可降级项。
4. **规则链模板页范围**：Set root/auto-assign/导入/EDGE 画布是一整块。倾向：M13 至少覆盖「Edge 内规则链分配+Set root+缺失检查」；规则链模板管理页与 EDGE 画布划给规则链里程碑，spec 里登记为边界外。
5. **升级指引**：依赖后端 edgeVersion 属性与 `/api/edge/instructions/upgrade`。倾向：M13 只做安装指引；upgrade available 检测做成能力探测（接口 404 时隐藏按钮），不承诺升级面。
6. **key/secret 生成位置**：ngx 在前端生成（guid+20 位随机）。倾向：antd 保持前端生成以对齐行为；但要在 spec 明确「无重新生成入口」是否为有意设计，若是缺口应另开 issue 而不是混进 M13。
7. **customer_user 恒显菜单**：ngx 的 customer 菜单不受 edgesSupportEnabled 约束。倾向：fork 里统一受开关控制，修正这个不一致，并在 spec 写成权限契约项。
8. **sync 的反馈形态**：ngx 是 fire-and-forget toast。倾向：保持一致（后端没有进度查询端点），不做轮询假状态。
