# v1-M5 摸底：ui-antd 现状事实清单（2026-09-02）

> M5 施工事实底稿之一（只读勘察）。路径均相对 `ui-antd/`。配对底稿：[v1-m5-recon-ui-ngx.md](v1-m5-recon-ui-ngx.md)。

## 1. 路由现状（config/routes.ts）

- `config/routes.ts:171-176` — 唯一 dashboard 路由：`{ name: 'customers.dashboards', path: '/customers/:id/dashboards', access: 'canTenantAdmin', component: './customers/dashboards', hideInMenu: true }`（客户作用域页，M2 最小实现）。
- `config/routes.ts:1-322` — 不存在 `/dashboards` 租户列表路由、usage 路由、gateways 路由（全文件确认）。
- `config/routes.ts:298-318` — `/account` 家族只有 `profile` + `security`，无 profile 内 home-dashboard 选择路由。
- `src/pages/account/profile/index.tsx:3` — 注释明确 "profile.component parity minus the M5 dashboard/unit facets"。
- `config/routes.ts:147-148` — 路由约定：scope 页是 detail 的扁平兄弟路由（react-router 长路径优先）。

## 2. 仪表盘服务层与类型

- `src/services/tb/dashboard.ts:1-13` — 文件头自称 "minimal M2 seed"，"The dashboards domain (M5) owns the full DashboardInfo type… replace this digest then (RECON risk 5)"。
- `src/services/tb/dashboard.ts:20-24` — 唯一类型 `DashboardDigest { id:{entityType:'DASHBOARD'; id}, createdTime, title }`。
- `src/services/tb/dashboard.ts:27-34` — 唯一方法 `getTenantDashboards(pageLink): Promise<PageData<DashboardDigest>>` → `GET /api/tenant/dashboards`。没有 getDashboardById / saveDashboard / deleteDashboard。
- `src/services/tb/customer.ts:58-62` — `CustomerDashboardInfo`（同 Digest 三字段）；`:65-73` `getCustomerDashboards(customerId, pageLink)` → `GET /api/customer/{customerId}/dashboards`；`:76-83` `assignDashboardToCustomer` → `POST /api/customer/{customerId}/dashboard/{dashboardId}`；`:86-93` `unassignDashboardFromCustomer` → `DELETE` 同路径。
- `src/services/tb/dashboard.endpoints.test.ts:29-43` — 唯一测试钉住 `/api/tenant/dashboards` + `{ pageSize, page, textSearch, sortProperty, sortOrder }`。
- `src/services/tb/customer.endpoints.test.ts:88-106` — 钉住 scope 列表/assign/unassign 三端点。
- `src/services/tb/index.ts:16` — `export * from './dashboard'` 已挂入 barrel。
- 类型完整度：DashboardInfo / DashboardConfiguration / WidgetConfig / datasource / alias 全部不存在（`src/types/tb/index.ts:15-23` 导出清单无 dashboard 文件）。生成层素材：`src/types/tb/openapi/index.ts:20257-20285`（`DashboardInfo` schema，无 configuration 字段）、`16845-16876`（`Dashboard` schema，`configuration?: JsonNode` @16872）、`14563-14568`（`HomeDashboardInfo`）、`376-473`（widgetsBundle / widgetType 端点路径）、`33763`（getDashboardById）。
- `src/types/tb/entity.ts:21-22` — `EntityType` 枚举已有 `WIDGETS_BUNDLE` / `WIDGET_TYPE`；`telemetry.ts:47-48` 已预留 `KvEntry` 别名。

## 3. widget 运行时现状

- 不存在：typeFullFqn 注册表、WidgetContainer、「暂未支持」占位符组件（全 src grep 仅命中 types/openapi）。
- react-grid-layout 不存在：`package.json:28-58` 依赖里没有；node_modules 中也只有 `echarts` 匹配。布局库需新增依赖。
- echarts：`package.json:36` `"echarts": "^6.0.0"`（直用，无 echarts-for-react）。src 唯一 echarts 使用点 `TimeseriesHistoryModal.tsx:14`。
- 可复用 WS 运行时：
  - `src/core/ws/manager.ts:216-242` — `WsManager` 接口：`subscribeAttributes / subscribeLatestTelemetry / subscribeEntityData / subscribeEntityCount / subscribeAlarmData / subscribeAlarmCount / subscribeAlarmStatus / subscribeUnreadNotificationCount`；`:114-120` `LatestTelemetryParams { entityId, keys?, timeWindowMs=60_000, seed? }`。
  - `manager.ts:721-748` — `subscribeEntityData` 返回带 `update({query?, latestCmd?})` 的 `EntityDataSubscription`（同 cmdId 改排序/分页不重订阅）。
  - `src/core/ws/hooks.ts:42-55` `getDefaultWsManager()`（单例多路复用 socket）；`:91-110` `useAttributeSubscription`；`:113-132` `useLatestTelemetrySubscription`。
  - `src/core/ws/protocol.ts:104-110` — `EntityDataCmd` 已有 `historyCmd?` / `tsCmd?` 占位（`Record<string, unknown>`，未实现类型化）。
  - 缺口：`TIMESERIES_HISTORY` 枚举已定义（protocol.ts:23）但 manager 无对应 subscribe 方法。
  - WS 预算红线：`src/components/entities/detail/detail-tabs.tsx:7-8` "WS manager 的 10-cmd budget"（manager.ts:129，每页帧最多 10 cmd）。

## 4. timewindow 组件（可复用）

- `src/components/entities/detail/timewindow.ts:20-87` — `TIMEWINDOW_PRESETS`（5m…30d 共 11 档）；`:89` `CUSTOM_TIMEWINDOW_ID='custom'`；`:96-121` `computeAggregationInterval(windowMs)`（~200 桶取整）；`:124-131` `presetRange(presetId)`。测试：`timewindow.test.ts`。
- `src/components/entities/detail/TimeseriesHistoryModal.tsx:43-54` — props `{ open, entityId, telemetryKey, onClose }`；`:75-82` range 在 open 翻转时冻结；`:84-111` useQuery + `getTimeseries`（`services/tb/attributes.ts:117-132`，`TimeseriesQuery { keys, startTs, endTs, limit, agg, interval, orderBy, useStrictDataTypes }` @99-110）；`:178-199` echarts line option；`:222-263` Segmented+RangePicker+Select(聚合)——无自动刷新实现。
- 告警页过滤器 timewindow：`src/pages/alarms/url-state.ts:33-50` — 第二套 `TIMEWINDOW_PRESETS`（仅 `{id, ms}`）+ `TimewindowSelection = presetId | 'all' | 'custom'`；`:74-77` URL 键 `tw/twStart/twEnd`；`:135-188` parse；`:190-249` serialize；`:255-282` `useAlarmsPageUrlState()`。
- 告警 WS 侧映射：`src/components/alarms/use-global-alarm-data.ts:31-55` — `ALL_TIME_WINDOW_MS = 20y`（固定区间折算为 `startTs + timeWindow`）。

## 5. 列表页操作集可复用件

- 批量 fan-out：`src/components/shared/use-batch-run.ts:30-79` — `useBatchRun()` → `{ state, run(items, keyOf, task): Promise<BatchSummary>, reset }`；进度弹窗 `src/components/shared/BatchProgressModal.tsx:11-15` `{ open, state, onClose }`。
- Assign to customers（实体无关）：`src/components/entities/AssignCustomerModal.tsx:17-25` — `{ open, entityCount, onClose, onConfirm(customer), confirmLoading? }`（防抖搜索 Select，过滤公共客户 @70-71）。
- 单删确认样板：`src/pages/devices/list/index.tsx:199-225`（`modal.confirm` + `okButtonProps:{danger:true}`）；批量删除 `:227-283`；unassign（单+批）`:285-304`；rowSelection `:166-169`。
- make-public / make-private 样板：资产 `src/pages/assets/list/index.tsx:295-336`（POST public-customer）+ `:526-551` 行菜单按状态切换；实体视图 `src/pages/entity-views/list/index.tsx:189-272, 491`。
- CSV import 先例：`src/components/devices/csv-import.ts`（`parseCsv` @143-164 等）；弹窗 `src/components/devices/DeviceImportModal.tsx:50-55` — `{ open, onClose, onImported(result) }`；assets 版 `AssetImportModal.tsx`。
- customer-scope 页骨架：`src/pages/customers/scope-page-shell.tsx:27-36` — `CustomerScopePageShellProps { customerId?, customerTitle?, title, loadError?, extra?, children }`。
- 列表 URL state 工厂：`src/pages/customers/list-url-state.ts:35-38` — `createListUrlState({ sortProperty, sortDirection })` → `{ parse, serialize, toPageLink, useListUrlState }`。
- M2 dashboard scope 页现况：`src/pages/customers/dashboards/index.tsx:1-7` — "MINIMAL face only… No rendering, no CRUD: the dashboards domain owns that in M5"；`:101` assignDialog、`:138-163` unassign confirm、`:165-203` 列。
- Assign dashboard 对话框：`src/components/customers/CustomerDashboardAssignDialog.tsx:15-21` — `{ open, onClose, onConfirm(dashboardId), confirmLoading? }`。
- 权限 hook：`src/components/shared/use-authority.ts:49-51` `useAuthority()`。

## 6. 权限与菜单

- `src/access.ts:19-25` — 权限键全集 5 个：`canSysAdmin / canTenantAdmin / canCustomerUser / canTenantOrCustomer / canAuthenticated`。无资源级细粒度键——dashboard 页用 `canTenantAdmin` / `canTenantOrCustomer`。
- CU 四菜单现状：devices（:88-93）、assets（:106-111）、alarms（:187-192）均 `canTenantOrCustomer`；dashboard 不在 CU 菜单（spec §1.2 第 4 项待 M5 补）。
- 菜单 locale：`src/locales/zh-CN/menu.ts` 已有 `menu.customers.dashboards: '客户仪表盘'`，无 `menu.dashboards` / `menu.usage` / `menu.gateways`。

## 7. locale 与测试约定

- 结构：`src/locales/{zh-CN,en-US}/` 按域分文件；域内可聚合（`src/locales/en-US/customers/index.ts`）。聚合器 `src/locales/en-US.ts:5-39`、`src/locales/zh-CN.ts:9-` —— umi 只扫顶层文件，新域文件要手动 import + spread 到两份聚合器。
- 门禁：`scripts/check-locale.mjs:1-9` — zh/en key 集合一致 + 单 locale 内 key 不重复，挂 `npm run lint`。
- 服务层测试模板：`*.endpoints.test.ts` — `vi.mock('./http')` + 断言 `tbHttp.get/post/delete` 的 (path, query)。
- 页面测试 hoisted mock 模式：`src/pages/assets/list/index.test.tsx:27-33`（`vi.hoisted` + `vi.mock('@umijs/max')`）、`:39-64`（services/token-store/ws hooks mock）、`:70-107`（ProTable mock + dot-path rowKey）、`:22-25`（createIntl + zh locale 注入）。
- 测试基建：`vitest.config.ts:4-38` — alias `@`→src、happy-dom、setupFiles `tests/setupTests.ts`；`tests/setupTests.ts:84-105` mock matchMedia/ResizeObserver（空实现）。
- `package.json:7-24` scripts：`dev`（UMI_ENV=dev MOCK=none）、`lint`（biome check && check-locale && tsc --noEmit，提交门禁）、`biome`（--write）、`test`（vitest）、`build`（max build）、`tsc`。

## 8. 可复用基建

- `src/components/layout/page-container.tsx:56-73` — `TbPageContainerProps`（+`breadcrumbLabel?/onBack?/dirty?`）；`:143-224` 默认导出（title 从 `menu.<route name>` 解析、dirty 返回守卫）。
- `src/components/entities/server-error-text.ts:9-17` — `serverErrorText(error)`。
- use-copy 两份本地变体：`src/pages/account/security/use-copy.ts:9`、`src/components/devices/use-copy.ts`。
- 实体通用 tab：`src/components/entities/detail/detail-tabs.tsx:30-57`；URL state 工厂 `url-state.ts`。
- 实体 detail 面板族（`src/components/entities/detail/`，多态 `entityId: EntityId`）：`LatestTelemetryPanel.tsx`、`AttributesPanel.tsx`、`AlarmsPanel.tsx`、`AlarmRulesPanel.tsx`、`CalculatedFieldsPanel.tsx`、`RelationsPanel.tsx`、`AuditLogsPanel.tsx`、`VersionControlPanel.tsx`、`TimeseriesHistoryModal.tsx`、`AlarmDetailsModal.tsx`、`use-entity-keys.ts`、`attribute-value.ts`。
- 图表主题：`src/theme/charts.ts:26` `CHART_THEME_NAME='tb-light'`；`:32-39` `resolveSeriesColor`；`:42-45` `resolveChartColors`；`:52-84` `buildEChartsTheme`。色板 `src/theme/brand/config.ts:86-97`（8 slot）。红线：图表禁止内联 hex。
- 禁页组件 `src/components/layout/forbidden.tsx`；应用桥 `antd-app-bridge.tsx`；ws-manager 布线 `components/layout/ws-manager.ts`。
- HTTP/Query 基建：`src/core/http/client.ts`（tbHttp、createTokenRefresher）、`src/core/query-client.ts`（4xx 不重试）。

## 9. dev proxy 与本地启动

- `config/proxy.ts:13` — `TB_PROXY_TARGET || 'http://localhost:8080'`；`:16-34` 代理顺序 `/api/ws`（ws:true，排 `/api` 前）→ `/api` → `/oauth2` → `/login/oauth2`。
- 启动 `package.json:10` `dev = cross-env UMI_ENV=dev MOCK=none max dev`（:8000 单实例常驻，禁止双实例）。
- `config/config.ts:200-209` utoopack + md-raw-loader；`:141-149` locale 默认 zh-CN；`:133-136` moment2dayjs 不可删。

## 对 M5 施工最关键的三条缺口

1. 服务层只有 3 个 digest 级端点；`getDashboardById`/save/delete/home-dashboard 仅 openapi 生成层有素材，`Dashboard.configuration` 是 `JsonNode`，WidgetConfig/alias/datasource 类型需全部手写。
2. 无任何 widget 运行时；可复用 `WsManager.subscribeEntityData/.subscribeLatestTelemetry` + `TimeseriesHistoryModal` 的 echarts 生命周期样板 + `theme/charts.ts` 主题。
3. timewindow 两套并存实现且都无自动刷新；dashboard 版需裁决合并或新建。
