# v1-M5 摸底：ui-ngx 参照事实清单（2026-09-02）

> M5 施工事实底稿之二（只读勘察）。路径均相对仓库根（ui-ngx/ 与 application/ 均为绝对段起点）。配对底稿：[v1-m5-recon-ui-antd.md](v1-m5-recon-ui-antd.md)。

## 1. 仪表盘只读页 / dashboard-page 结构

- 组件族目录：`ui-ngx/src/app/modules/home/components/dashboard-page/`。
- `dashboard-page.component.ts:155-163` — `tb-dashboard-page`，实现 `IDashboardController, HasDirtyFlag`，OnPush。
- `:230-236` — 状态位：`widgetEditMode`、`singlePageMode`、`forceFullscreen`、`readonly = false`（初始）。
- `:521-523` — 只读判定：`readonly = embedded || (singlePageMode && !widgetEditMode && !queryParam('edit')) || forceFullscreen || isMobileApp || authority===CUSTOMER_USER || queryParam('readonly')==='true'`。
- `:481-483` — 非 widgetEditMode 且非 readonly 且空仪表盘时自动进编辑（v1 不适用：原则 3 全只读）。
- `:200-201` — `hideToolbar = (hideToolbarValue||hideToolbarSetting()) && !isEdit || …`。
- `:330-333` — `toolbarOpened = !widgetEditMode && !hideToolbar && (toolbarAlwaysOpen()||isToolbarOpened||isEdit||showRightLayoutSwitch())`。
- `:396` — 悬浮编辑 FAB 区 `@if (!readonly && (hideToolbar || widgetEditMode))`（只读态不渲染）。
- `:429-433` — `tb-powered-by-footer`（`!embedded` 时显示）。

### states 机制（default vs entity controller）

- 注册表：`states/states-controller.module.ts:46-49` — `registerStatesController('default'|'entity', …)`。
- 选择/回退：`states/states-component.directive.ts:122-130` — `getStateController(statesControllerId)` 取不到回退 `'default'`，动态创建赋给 `dashboardCtx.stateController`。
- 挂载：`dashboard-page.component.html:20-29` — `<tb-states-component [statesControllerId]="dashboardConfiguration.settings.stateControllerId">`；`:67-76` — isEdit 时强制 `'default'`。
- 默认值：`core/services/dashboard-utils.service.ts:187-199` — 缺省 `settings.stateControllerId='entity'`。
- 抽象基类：`states/state-controller.component.ts:28-220` — 持 `stateObject: StateControllerState`、`currentState`、`syncStateWithQueryParam`；`:106-120` 监听 queryParamMap 的 `state`；`:134-151` `updateStateParam()` 写回（merge + replaceUrl）；`:180-182` `decodeStateParam = decodeURIComponent(stateURI)`。
- 状态类型：`states/state-controller.models.ts:20` — `StateControllerState = StateObject[]`；`core/api/widget-api.models.ts:172-183` — `StateObject{id,params}`、`StateParams{entityName?,entityLabel?,targetEntityParamName?,entityId?,[k]:any}`。
- Default controller：`states/default-state-controller.component.ts:38-269` — 单层状态 `stateObject[0]`；`parseState()` :211-244 截断到最后一层、非法 id 回退 `getRootStateId(states)`；`updateLocation()` :259-264 `objToBase64(this.stateObject)`。
- Entity controller：`states/entity-state-controller.component.ts:40-` — 压栈式 `stateObject.push(newState)` + `resolveEntity(params)`（:110-124、:143-158）；`getEntityId()` :160-168（默认取 `stateParams.entityId`）；面包屑 `getStateName()` :220-244 用 `insertVariable(stateName,'entityName'/'entityLabel',…)`。
- 保留状态：`states/states-controller.service.ts:35-61` — `preserveStateControllerState/withdraw/cleanupPreservedStates`（键 `instanceId + '_' + controllerId`）。
- state 打开：`dashboard-page.component.ts:1120-1134` — `openDashboardState(state)` → `getStateLayoutsData` → `updateLayouts()`（main/right）。
- Root state：`dashboard-utils.service.ts:629-637` — `getRootStateId` 返回 `root:true` 的 state，否则第一个 key。

### URL 契约

- 常规页路由：`pages/dashboard/dashboard-routing.module.ts:62-101` — `dashboards`（表格，auth TENANT_ADMIN+CUSTOMER_USER）与 `dashboards/:dashboardId`（DashboardPageComponent + ConfirmOnExitGuard + DashboardResolver）。
- Resolver：同文件 `:38-60` — `getDashboard(id)` → validateAndUpdateDashboard。
- 全屏单页：`modules/dashboard/dashboard-pages.routing.module.ts:56-71` — 路由 `dashboard/:dashboardId`（单数）`data.singlePageMode=true, breadcrumb.skip:true`。
- base64：`core/utils.ts:221-227` `objToBase64`（`btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g,…))`）；`:253-255` `base64toObj`；`:249-251` `objToBase64URI`。
- 写入：default-state-controller:259-264 + state-controller:134-151（`?state=` 参数）。
- 公共链接：`core/http/dashboard.service.ts:151-167` — `…/dashboard/{id}?publicId={publicCustomerId}`。
- 其它 query：`dashboard-page.component.ts:496-502` — `hideToolbar`、`embedded`；`:415-427` — `reload` 触发 alias 重解析。

### 系统级「仪表盘页」挂载器（usage/gateways 共用）

- `modules/home/components/dashboard-view/dashboard-view.component.ts:24-39` — `tb-dashboard-view` 仅从 `route.snapshot.data.dashboard` 取 dashboard；模板一行 `<tb-dashboard-page [embedded]="true" [dashboard]="dashboard">`（embedded ⇒ readonly）。

## 2. toolbar 全量（只读态可见元素）

文件 `dashboard-page.component.html:35-322`（外层 `dashboard-toolbar.component.html:18-33` mat-fab-toolbar，trigger `more_horiz`）：

- `:112-117` — 收起工具栏按钮 `arrow_forward`。
- `:122-127` — 右布局切换 show/hide details（移动端且有 right layout）。
- `:128-138` — 全屏 expand/exit（widgetEditMode||iframeMode||forceFullscreen||singlePageMode 时隐藏，:640-642）。
- `:142-147` — export 按钮（`currentDashboardId && !isMobileApp && displayExport() && !isEdit`）→ `importExport.exportDashboard`。
- `:148-155` — edit 按钮仅 `!readonly && !isEdit` 渲染（v1 原则 3：隐藏 + v2 提示）。
- `:230-235` — update-image：`!canEdit() || readonly` 时隐藏。
- `:256-278` — 只读态 timewindow：`displayDashboardTimewindow()` 时渲染双实例 `tb-timewindow`（桌面/移动各一），`[isEdit]="false"` + aggregation + timezone + save-as-default。
- `:294-301` — `tb-filters-edit` 与 `tb-aliases-entity-select`（`isEdit || !displayFilters()/displayEntitiesSelect()` 时隐藏）。
- `:302-308` — `tb-dashboard-select`（非 edit、非 embedded 且 displayDashboardsSelect）。
- 左侧面板 `:41-110`：notification-bell + 面包屑（内嵌 states-component）+ 可选 logo + 菜单按钮。
- settings 开关（`shared/models/dashboard.models.ts:167-182`）：`stateControllerId, showTitle, showDashboardsSelect, showEntitiesSelect, showFilters, showDashboardLogo, dashboardLogoUrl, showDashboardTimewindow, showDashboardExport, showUpdateDashboardImage, toolbarAlwaysOpen, hideToolbar, titleColor, dashboardCss`。缺省（:644-736）：`toolbarAlwaysOpen=true`、`showDashboardExport=true`、`showDashboardTimewindow=true`、`showTitle=false`、`showDashboardLogo=false`。

## 3. 全局 timewindow

模型：`ui-ngx/src/app/shared/models/time/time.models.ts`

- `:41-56` — `TimewindowType{REALTIME,HISTORY}`、`RealtimeWindowType{LAST_INTERVAL,INTERVAL}`、`HistoryWindowType{LAST_INTERVAL,FIXED,INTERVAL,FOR_ALL_TIME}`。
- `:160-173` — Timewindow JSON：`{displayValue?, selectedTab?, realtime?: IntervalWindow, history?: HistoryWindow, aggregation?: {interval,type,limit}, timezone?, hide…}`；`FixedWindow{startTimeMs,endTimeMs}` :124-127。
- `:134-158` — `AggregationType{MIN,MAX,AVG,SUM,COUNT,NONE}` + `Aggregation{interval,type,limit}`。
- `:283-308` — defaultTimewindow：`selectedTab:REALTIME, realtime{LAST_INTERVAL, interval:MINUTE, timewindowMs:HOUR}`, `aggregation{type: isDashboard?NONE:AVG, limit: maxDatapointsLimit}`。
- presets（last interval 档）`:1211-1337` — `defaultTimeIntervals` 共 25 档：1s/5s/10s/15s/30s/1m/2m/5m/10m/15m/30m/1h/2h/5h/6h/8h/10h/12h/1d/7d/WEEK/WEEK_ISO/30d/MONTH/QUARTER。
- quick interval presets `:207-259` — `QuickTimeInterval` 枚举 24 个（YESTERDAY…CURRENT_YEAR_SO_FAR）。
- 自动刷新：ui-ngx 全库无 `autoRefresh|refreshInterval` 实现——实时档为订阅流式推送（`SubscriptionTimewindow` :181-190，`createSubscriptionTimewindow` :842），无独立 auto-refresh 档位。
- `:1144-1203` — `clearTimewindowConfig`（序列化前按需裁剪字段）。
- 组件：`shared/components/time/timewindow.component.ts:139-199` — inputs `aggregation=false, timezone=false, asButton=false, isEdit, showSaveAsDefault=false`；面板 `timewindow-panel.component.html:18-243`（realtime/history toggle、interval、聚合类型 + group-interval + datapoints limit、时区、save-as-default）。
- 实例参考：`ui-ngx/src/assets/dashboard/api_usage.json` — `{"selectedTab":0,"realtime":{"realtimeType":0,"timewindowMs":86400000},"aggregation":{"type":"NONE","limit":50000}}`。

## 4. 仪表盘列表操作集

文件：`ui-ngx/src/app/modules/home/pages/dashboard/dashboards-table-config.resolver.ts`

- 行操作（tenant scope）`:221-247`：export（→`:430-435 exportDashboard(id)`）、make-public（:471-490）、make-private（:492-512）、manage-assigned-customers（:514-518）。
- customer scope `:249-270`：export、make-private（限当前公共客户）、unassign-from-customer。
- 批量（group）`:298-340`：tenant → assign-dashboards / unassign-dashboards；customer → unassign-dashboards。
- 头部 add `:342-381`：tenant → create-new-dashboard + import（`:396-404` importDashboard）；customer/edge → assign-new-dashboard。
- 管理客户对话框：`manage-dashboard-customers-dialog.component.ts:29-35` — actionType `'assign'|'manage'|'unassign'`；`:121-130` — assign→`addDashboardCustomers`、manage→`updateDashboardCustomers`、unassign→`removeDashboardCustomers`（forkJoin）。
- make public 弹窗：`make-dashboard-public-dialog.component.ts:43,55` — `publicLink = getPublicDashboardLink(dashboard)`。
- 导出/导入：`shared/import-export/import-export.service.ts:196-212`（exportDashboard：询问 includeResources → GET → 下载）、`:214-256` importDashboard（validate → prepare → validateAndUpdateDashboard → processEntityAliases → save；缺别名打开 EntityAliasesDialog）。
- 服务端点：`core/http/dashboard.service.ts`
  - `:54-57` GET `/api/tenant/dashboards`；`:65-68` GET `/api/customer/{customerId}/dashboards`
  - `:70-72` GET `/api/dashboard/{id}`；`:74-80` export（`?includeResources=true`）；`:82-84` GET `/api/dashboard/info/{id}`
  - `:91-93` POST `/api/dashboard`；`:95-97` DELETE `/api/dashboard/{id}`
  - `:99-103` POST `/api/customer/{customerId}/dashboard/{dashboardId}`（assign）；`:105-108` DELETE 同路径（unassign）
  - `:110-113` POST `/api/customer/public/dashboard/{id}`（makePublic）；`:115-118` DELETE 同路径（makePrivate）
  - `:120-136` POST `/api/dashboard/{id}/customers`、`/customers/add`、`/customers/remove`
  - `:138-149` GET `/api/dashboard/home`、GET/POST `/api/tenant/dashboard/home/info`
- 表格列 `:187-201`：createdTime、title(50%)，tenant 追加 customersTitle(50%) 与 `dashboardIsPublic` checkbox；删除/新增启用条件 `:178-181`（仅 tenant scope）。

## 5. usage 页

- 路由：`modules/home/pages/api-usage/api-usage-routing.module.ts:34-49` — path `usage`，component `DashboardViewComponent`，auth `[TENANT_ADMIN]`。
- 数据：同文件 `:26-32` — `apiUsageDashboardJson = '/assets/dashboard/api_usage.json'`（前端静态资源）→ `tb-dashboard-view` → `tb-dashboard-page [embedded]`。
- 菜单：`core/services/menu.models.ts:788-797` — path `/usage`，icon `insert_chart_outlined`。
- 仪表盘内容（`ui-ngx/src/assets/dashboard/api_usage.json`）：title "Api Usage"，`settings.showDashboardTimewindow=false`、`showDashboardExport=false`，`gridSettings{columns:12, margin:12, autoFillHeight:true, mobileAutoFillHeight:true, mobileRowHeight:70}`；widgets：29×`system.time_series_chart`、1×`system.cards.timeseries_table`、1×`system.api_usage`。

## 6. gateways 页

- 路由：`modules/home/pages/gateways/gateways-routing.module.ts:34-49` — path `gateways`，component `DashboardViewComponent`，auth `[TENANT_ADMIN]`；`:51-57` 旧 `gateways` 重定向 `/entities/gateways`。
- 数据：同文件 `:26-32` — `gatewaysDashboardJson = '/api/resource/dashboard/system/gateways_dashboard.json'`（后端 TbResource）。
- 挂载方式与 usage 一致（embedded readonly）。
- 菜单：`menu.models.ts:625-634` — path `/entities/gateways`，icon `lan`。
- 仪表盘内容：`application/src/main/data/resources/dashboards/gateways_dashboard.json` — title "ThingsBoard IoT Gateways"，`stateControllerId='entity'`，`showDashboardExport=false`，grid `{columns:48, margin:12, autoFillHeight:true, mobileRowHeight:70}`；widgets：19×`system.cards.entities_table`、10×`system.gateway_widgets.markdown_card`、3×`system.line_chart`、2×`gateway_widgets.service_rpc`、2×`gateway_widgets.gateway_logs`、2×`control_widgets.rpc_debug_terminal`、2×`cards.timeseries_table`、2×`cards.aggregated_value_card`、各 1×`gateway_widgets.gateway_status/general_configuration/custom_statistics/connectors`、`control_widgets.rpc_remote_shell`、`alarm_widgets.alarms_table`。
- 后端注册：`DashboardSyncService.java:66` `GATEWAYS_DASHBOARD_KEY`；`InstallScripts.java:411-415` `loadSystemResources(resourcesDir.resolve("dashboards"), ResourceType.DASHBOARD)`。

## 7. demo 仪表盘清单（CE）

安装入口：`DefaultSystemDataLoaderService.java:347-352,428` — `loadDemoData()` → `InstallScripts.java:418-426` demo 目录 `data/json/demo/dashboards`。

目录 `application/src/main/data/json/demo/dashboards/`，共 4 个：

| 仪表盘 | states | widgets | typeFullFqn |
|---|---|---|---|
| Firmware (`firmware.json`) | default(root)+device_firmware_history/device_waiting/device_updating/device_updated/device_error（均 main）；10 widgets；2 aliases | entities_table ×5, html_value_card ×4, timeseries_table ×1 | `system.cards.entities_table`, `system.cards.html_value_card`, `system.cards.timeseries_table` |
| Software (`software.json`) | 同 firmware 结构；10 widgets | 同上 | 同上 |
| Rule Engine Statistics (`rule_engine_statistics.json`) | 仅 default；3 widgets；1 alias | time_series_chart ×2, timeseries_table ×1 | `system.time_series_chart`, `system.cards.timeseries_table` |
| Thermostats (`thermostats.json`) | default(root)/map/chart；8 widgets；2 aliases | map ×3, time_series_chart ×2, `input_widgets.update_multiple_attributes` ×1, entities_table ×1, alarms_table ×1 | `system.map`, `system.time_series_chart`, `system.input_widgets.update_multiple_attributes`, `system.cards.entities_table`, `system.alarm_widgets.alarms_table` |

其它 CE 自带系统仪表盘（非 demo 租户）：`gateways_dashboard.json`（见 §6）、`api_usage.json`（见 §5）、`sys_admin_home_page.json`、`tenant_admin_home_page.json`、`customer_user_home_page.json`（home 首页 v1 不做）。

**demo 用到的 fqn 去重（7 个）**：`system.cards.entities_table`、`system.cards.html_value_card`、`system.cards.timeseries_table`、`system.time_series_chart`、`system.map`、`system.input_widgets.update_multiple_attributes`、`system.alarm_widgets.alarms_table`。

## 8. 仪表盘数据模型（DashboardConfiguration）

文件：`ui-ngx/src/app/shared/models/dashboard.models.ts`

- `:28-35` `DashboardInfo`：`tenantId,title,image,assignedCustomers:ShortCustomerInfo[],mobileHide,mobileOrder`。
- `:184-192` `DashboardConfiguration`：`timewindow?, settings?, widgets?: {[id]:Widget}|Widget[], states?: {[id]:DashboardState}, entityAliases, filters, [k:string]:any`。
- `:159-163` `DashboardState { name, root, layouts }`；`:151,155-157` `DashboardLayoutId='main'|'right'`。
- `:102-106` `DashboardLayout { widgets: WidgetLayouts, gridSettings, breakpoints?: {[bp]?: Omit<DashboardLayout,'breakpoints'>} }`。
- `:37-52` `WidgetLayout { sizeX,sizeY,desktopHide,mobileHide,mobileHeight,mobileOrder,col,row,resizable,preserveAspectRatio }`。
- `:84-100` `GridSettings { layoutType, backgroundColor, columns, minColumns, margin, outerMargin, viewFormat, backgroundSizeMode, backgroundImageUrl, autoFillHeight, rowHeight, mobileAutoFillHeight, mobileRowHeight, mobileDisplayLayoutFirst, layoutDimension }`。
- `:116-142` `BreakpointSystemId='default'|'xs'|'sm'|'md'|'lg'|'xl'`；`:144-153` `LayoutDimension{type:'percentage'|'fixed',…}`；`LayoutType :54-60 = default|scada|divider`。
- `:194-208` `Dashboard{configuration?}`、`HomeDashboard{hideDashboardToolbar,isSystemDashboard?}`、`DashboardSetup{assignedCustomerIds?}`。
- 默认值：`dashboard-utils.service.ts:470-479` `createDefaultGridSettings() = {layoutType:'default', backgroundColor:'#eeeeee', columns:24, margin:10, outerMargin:true, backgroundSizeMode:'100%'}`；`:487-493 createDefaultState`；`:554-567 validateAndUpdateLayout`（margin 缺省 10、outerMargin 缺省 true）；`:100-135` 旧版 widgets 数组→map、无 states 时生成 `default` state。
- 布局渲染/行高：`dashboard.component.ts:91,98,101,235-243,607,616-618,650-669` — `minCols=columns||24`、`margin||10`、`fixedRowHeight`；`detectRowSize()`：移动端非 autofill `rowHeight = mobileRowHeight || 70`；autofill+mobile `(parentHeight - margin*(totalRows+(outerMargin?1:-1)))/totalRows`；gridType `Fixed`(mobile)/`Fit`(autofill)/`ScrollVertical`。
- `dashboard-layout.component.ts:77-119` — scada 强制 margin 0；`autoFillHeight` 在 isEdit||isScada 强制 false；`columns = minColumns||columns||24`。
- 上下文：`dashboard-page.models.ts:42-54` `DashboardContext{instanceId,state,breakpoint,getDashboard,dashboardTimewindow,aliasController,stateController,…}`；`:79-91` `DashboardPageLayoutContext`；`:100-175` `LayoutWidgetsArray`（从 `configuration.widgets[id]` 取 widget）。

## 9. widget 类型元数据

- 类型枚举/模板 fqn：`shared/models/widget.models.ts:78-136` — timeseries→`system.time_series_chart`、latest→`system.cards.attributes_card`、rpc→`system.gpio_widgets.basic_gpio_control`、alarm→`system.alarm_widgets.alarms_table`、static→`system.cards.html_card`。
- `:921-963` `WidgetConfig`（title/showTitle/useDashboardTimewindow/timewindow/datasources/alarmSource/targetDevice/settings/actions/pageSize/units/decimals/mobileHeight…）；`:965-978` `BaseWidgetInfo{id?,typeFullFqn,type}` + `Widget{typeId,sizeX,sizeY,row,col,config}`；`:160-177` `WidgetTypeDescriptor`；`:179-206` `WidgetTypeParameters`。
- 安装库：`application/src/main/data/json/system/widget_types/` 共 524 个 json；字段 `fqn/name/deprecated/image/descriptor{type,sizeX,sizeY,templateHtml,controllerScript,defaultConfig,…}/tags/resources`。bundle 前缀分布：`input_widgets`(26)、`cards`(14)、`digital_gauges`(13)、`gateway_widgets`(11)、`control_widgets`(10)、`maps_v2`(9)、`charts`(9)、`home_page_widgets`(6)、`analogue_gauges`(5)、`gpio_widgets`(4)…
- bundle 清单：`application/src/main/data/json/system/widget_bundles/`（28 个）。
- 默认尺寸（descriptor sizeX×sizeY）：`time_series_chart`/`line_chart` = timeseries 8×5；`bars`/`pie`/`radar` = latest 5×4；`entities_table` = latest 7×6；`timeseries_table` = timeseries 8×6；`alarms_table` = alarm 10×6；`attributes_card`/`html_value_card` = latest 7×3；`markdown_card` = latest 5×3；`value_card` = latest 3×3；`aggregated_value_card`/`api_usage` = latest 7×3；`map` = latest 8×6；`update_multiple_attributes` = latest 7×3；`entity_count`/`alarm_count` = latest 3×1。
- datasources 默认：`defaultConfig` 内 `datasources:[{type:'function',…}]`；落仪表盘时 `dashboard-utils.service.ts:503-542` 把 `function` 换 `entity`（basic 换 `device`）并清 funcDataKeys、只取第一个 datasource。
