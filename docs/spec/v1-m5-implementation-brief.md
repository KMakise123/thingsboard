# v1-M5 实现简报（仪表盘只读 + usage 页 + widget 补齐至 demo 锚点）

> 施工蓝图：所有 M5 实现 agent 从本文件取契约与约定。范围 = spec §3.10 全部 + §3.4 网关推迟项（#9 留痕）+ CU 第 4 菜单项（spec §1.2）。
> 事实来源：[v1-m5-recon-ui-antd.md](v1-m5-recon-ui-antd.md)、[v1-m5-recon-ui-ngx.md](v1-m5-recon-ui-ngx.md)（2026-09-02 双摸底）。架构裁决 = ADR 0003（#6 + #13 修订）。
> 分支 `feat/m5-dashboard-readonly`。后端 ：8080 与 dev server :8000（单实例）已在跑。

## 0. 交付面总览

| # | 面 | 路由（ui-antd） | ui-ngx 参照 | 施工 |
|---|---|---|---|---|
| A | 仪表盘列表 + 操作集（export/import JSON、assign 单+批、make public/private、manage customers、删除） | `/dashboards`（TA 编辑 + CU 只读）、`/customers/:id/dashboards`（升级 M2 最小面） | dashboards-table-config.resolver.ts | W3 |
| B | 只读页（states 双 controller + 全局 timewindow + toolbar + 布局渲染 + widget 容器） | `/dashboards/:dashboardId` | dashboard-page.component | W1（容器/布局/tw）+ W2（widget 实体） |
| C | 全屏 single-page 模式 | `/dashboard/:dashboardId`（layout:false） | dashboard-pages.routing singlePageMode | W1 |
| D | usage 页 | `/usage`（TA） | api-usage-routing（前端 asset `api_usage.json`） | W3 |
| E | gateways 系统仪表盘页 | `/entities/gateways`（TA） | gateways-routing（`GET /api/resource/dashboard/system/gateways_dashboard.json`） | W3 |
| F | widget 运行时（注册表 resolver + 容器 + RGL 布局 + 数据 hooks + 占位三态） | — | ADR 0003 | W1（骨架）+ W2（实体） |

**明确不做**（随验收登记修订记录/遗留清单，不建文件）：
- create-new-dashboard（v1 无编辑器，空白表无用；import 承担入口）
- react-1 运行时编译分支（ADR 0003 resolver 链中该分支实现归 v2 编辑器阶段 / ADR 0004；v1 实现内置命中 + 两类占位）
- home_page_widgets.*（home 首页 v2）、profile 页 homeDashboard 选择器（M4 已裁 v2）
- 匿名公共仪表盘页（make-public 仅改列表状态与公链生成；`?publicId=` 匿名查看归遗留清单）
- dashboard filters 面板与 entities-select：先实查锚点 6 份 JSON（4 demo + api_usage + gateways）是否实际使用，未用则省略并登记（W1 裁量）
- timezone 选择器、quick-interval 档（ui-ngx 有但 spec 未单列；成本裁剪，W1 登记）
- gateway_widgets.*、control_widgets.*（rpc 终端/远壳）等冷门 fqn：按 §7 渲染占位（锚点外允许）

## 1. 架构契约

### 1.1 目录所有权（防冲突地图）

- W1：`src/types/tb/dashboard.ts`、`src/types/tb/widget.ts`、`src/types/tb/timewindow.ts`（均新建）、`src/services/tb/dashboard.ts`（全量重写，兑现 RECON risk 5）、`src/core/dashboard/`（别名解析、states、模型工具）、`src/components/dashboard/`（运行时）、`src/pages/dashboards/view/`、`src/pages/dashboard-fullscreen/`、routes.ts 增 B/C 两组路由、menu locale 增 `menu.dashboards/usage/gateways`。
- W2：`src/components/widgets/`（注册表实现 + 占位组件归 W1 骨架后由 W2 充实）、`src/core/ws/`（补 TIMESERIES_HISTORY 类型化订阅；不碰既有 8 族方法签名）、widget locale 文案。
- W3：`src/pages/dashboards/list/`、`src/pages/customers/dashboards/`（升级）、`src/pages/usage/`、`src/pages/gateways/`、`src/services/tb/dashboard.ts` **只消费不新增**（缺端点回报 lead 由 W1 补）、routes.ts 增 A/D/E 路由、locale `dashboards/` 域扩 list/usage 键。
- 共享文件纪律：routes.ts、`locales/{zh-CN,en-US}.ts` 聚合器为跨 WP 触点——**按 WP 顺序串行提交**（W1 → W2 → W3），后到者 rebase 到已提交现实上追加，禁止并行改同文件。
- 嵌入资产：`ui-antd/public/static/dashboard/api_usage.json` 从 `ui-ngx/src/assets/dashboard/api_usage.json` 原样复制（W3）。

### 1.2 类型（手写，对齐 recon §8/§9；openapi `configuration` 是 JsonNode 不够用）

`src/types/tb/dashboard.ts`：`DashboardInfo`（id/tenantId/createdTime/title/image?/assignedCustomers?: ShortCustomerInfo[]/mobileHide?/mobileOrder?）、`Dashboard`（+configuration?: DashboardConfiguration）、`DashboardConfiguration { timewindow?, settings?, widgets: Record<string, Widget>, states: Record<string, DashboardState>, entityAliases, filters?, [k: string]: unknown }`、`DashboardState { name, root, layouts: Partial<Record<'main'|'right', DashboardLayout>> }`、`DashboardLayout { widgets: Record<string, WidgetLayout>, gridSettings: GridSettings, breakpoints?: … }`、`WidgetLayout { sizeX, sizeY, row, col, desktopHide?, mobileHide?, mobileHeight?, mobileOrder?, resizable?, preserveAspectRatio? }`、`GridSettings { columns?, minColumns?, margin?, outerMargin?, autoFillHeight?, rowHeight?, mobileAutoFillHeight?, mobileRowHeight?, mobileDisplayLayoutFirst?, backgroundColor?, backgroundSizeMode?, backgroundImageUrl?, layoutType?, layoutDimension? }`、`DashboardSettings { stateControllerId?, showTitle?, showDashboardsSelect?, showEntitiesSelect?, showFilters?, showDashboardLogo?, dashboardLogoUrl?, showDashboardTimewindow?, showDashboardExport?, showUpdateDashboardImage?, toolbarAlwaysOpen?, hideToolbar?, titleColor?, dashboardCss? }`。
默认值工具对齐 ui-ngx：`createDefaultGridSettings()`、`validateAndUpdateDashboard`（旧 widgets 数组→map、无 states 生成 default state、margin 缺省 10、outerMargin 缺省 true、stateControllerId 缺省 `'entity'`）、`getRootStateId`（root:true 优先，否则第一个 key）。

`src/types/tb/widget.ts`：`Widget { typeId?, typeFullFqn, sizeX, sizeY, row, col, config: WidgetConfig }`、`WidgetConfig { title?, showTitle?, useDashboardTimewindow?, timewindow?, datasources: Datasource[], alarmSource?, alarmFilterConfig?, targetDevice?, settings?, actions?, pageSize?, units?, decimals?, mobileHeight?, [k: string]: unknown }`、`Datasource { type: 'entity'|'device'|'function'|'alarm'|'entityCount'|'alarmCount', name?, entityAliasId?, entityId?, dataKeys: DataKey[], latestDataKeys? }`、`DataKey { name, type: 'timeseries'|'attribute'|'entityField'|'function'|'alarm', label?, units?, decimals?, color?, funcBody?, [k: string]: unknown }`。

`src/types/tb/timewindow.ts`：dashboard 级 Timewindow JSON（recon ui-ngx §3）：`{ selectedTab?: 'REALTIME'|'HISTORY', realtime?: { timewindowMs?, intervalMs? }, history?: { fixedTimewindow?: { startTimeMs, endTimeMs }, timewindowMs? }, aggregation?: { type: 'MIN'|'MAX'|'AVG'|'SUM'|'COUNT'|'NONE', interval?, limit? } }`。

### 1.3 widget 注册表 resolver（ADR 0003 定案，v1 实现范围）

```
resolve(typeFullFqn):
  builtIn registry hit            → 懒加载注册组件
  miss → GET /api/widgetType?fqn=…（若消费）descriptor.runtime === 'react-1' → v1 占位 'custom-unsupported'（编译归 v2）
  runtime 缺省（Angular）          → 占位 'angular-unsupported'
  404                             → 占位 'missing'
```
注册表接口：`{ [fqn: string]: { component: LazyExoticComponent, meta?: … } }`；占位三态文案收敛在注册表层（`暂未支持` + fqn 明示），容器无感知。v1 内置集 = 锚点 7 fqn + gauge 代表 + 静态兜底（§6 表）。

### 1.4 布局：react-grid-layout 2.x 完全受控只读（ADR 0003 #13 措辞）

- 依赖：`react-grid-layout@^2`（React 19 唯一可用线）。**W1 第一步先 spike**：安装 + 最小受控渲染测试通过后才在其上施工；若 utoopack 链路断，回报 lead 合议备选（不得私自换库）。
- TB 语义自行计算后喂 RGL：cols = `gridSettings.minColumns || columns || 24`；margin、outerMargin、rowHeight、autoFillHeight（Fit/滚动）、mobile（<768px）：单列栈（每 widget 一行，`mobileHide` 过滤、`mobileOrder` 排序、`mobileHeight`/`mobileRowHeight`(默认 70)/`mobileAutoFillHeight` 行高）、desktopHide 过滤、断点覆盖（`layout.breakpoints` 的 default/xs/sm/md/lg/xl 五档覆盖时按断点替换 widgets/gridSettings）。只读态 `isDraggable=false, isResizable=false, preventCollision`；RGL 只做网格几何换算，不用其响应式自动布局。碰撞语义 = 阻挡不挤压（gridster pushItems:false 等价，数据驱动布局静态可信）。
- right layout：state.layouts.right 存在时渲染双列（桌面 main/right 并排，移动端右列折叠为切换——toolbar show/hide details 对齐）。

### 1.5 states + URL 契约

- 路由组（W1）：`/dashboards/:dashboardId`（壳内只读页）+ `/dashboard/:dashboardId`（layout:false 全屏 single-page，hideFullscreen）。
- `?state=` 值 = `objToBase64(StateObject[])`，语义对齐 ui-ngx `core/utils.ts:221-227`（`btoa(encodeURIComponent(json).replace(...))`），逆 `base64toObj`；写回 merge + replace。非法 state → 回 root state（default controller 截断；entity controller 弹栈）。
- default controller：单层（`stateObject[0]`）；entity controller：压栈 + `stateParams.entityId` 解析实体名/label，面包屑 `insertVariable(stateName, entityName/entityLabel)`。
- 只读判定（简化自 ui-ngx :521-523，v1 全只读）：`/dashboard/:id` 与 embedded 恒只读；`/dashboards/:id` CU 只读、TA 只读但 toolbar 留 export/timewindow/全屏等非编辑元素。编辑器入口（edit FAB/update-image）一律不渲染，原则 3 的 v2 提示放 tooltip。

### 1.6 全局 timewindow（W1 新建模块，不合并旧两套）

- 位置：`src/components/dashboard/timewindow/`。presets = ui-ngx `defaultTimeIntervals` 25 档（recon ui-ngx §3）+ 自定义 history 区间（RangePicker）+ 聚合档（type + interval 自动 ~200 桶，复用 `detail/timewindow.ts` 的 `computeAggregationInterval` 思路）。
- **自动刷新口径（已裁决）**：realtime 档 = WS 流式订阅（TS cmd 持续推送，即"自动刷新"，横切 ≤5s 达标通道），不建显式 auto-refresh interval 档——ui-ngx CE 无此物，spec「presets + 自动刷新」由流式满足；W4 落账时在修订记录登记该口径。
- dashboard 级默认：`selectedTab REALTIME + timewindowMs HOUR + aggregation NONE(limit 50000)`；widget 级 `config.timewindow` 覆盖、`useDashboardTimewindow` 跟随（默认 true）。
- 不做：timezone、quick-interval、save-as-default（登记）。

### 1.7 别名解析（`src/core/dashboard/alias-resolver.ts`）

- 输入 `configuration.entityAliases`（`{ [aliasId]: { id, entityFilter, [stateParam 引用] } }` 形态以 6 份锚点 JSON 实际结构为准——W1 开工先枚举 4 demo + api_usage + gateways 六份 JSON 的 `entityAliases` 全部 filter type，实现的 type 集 = 实查集；实现外 type → 解析为空集 + console.warn。
- 已知必须支持（由锚点数据反推）：`singleEntity`；entity controller 状态参数引用（`state.entityId` → 当前 state params 替换）；api_usage 页租户实体（apiUsageState 或 tenant 单实体，以 JSON 实查为准）。
- 解析时机：dashboard 载入 + `?reload` + state 切换（entity controller 弹栈换实体时重解析受影响 alias）。输出 `aliasId → entityId[]`，供 datasource `entityAliasId` 消费；datasource.type `function` 数据源（widgetType defaultConfig 残留）→ 按 ui-ngx :503-542 口径转 `entity`（无 alias 时保空数据集渲染，不崩）。

### 1.8 widget 数据 hooks（W2，`src/components/widgets/hooks/`）

- `useWidgetDatasources(widget, dashboardTimewindow)`：解析 aliases → 实体键集 → 各类型订阅。
- timeseries（time_series_chart/timeseries_table）：历史种子（history 档固定区间 or realtime 档起始拉取）+ realtime 流式更新；**W2 需在 `src/core/ws/` 补 TIMESERIES_HISTORY 类型化订阅**（protocol.ts:104-110 已留 `tsCmd?/historyCmd?` 占位），遵守 10-cmd 预算（超预算 widget 页 console.warn + 队列化，不静默丢）。
- latest（值卡/表格 latest 列）：`subscribeLatestTelemetry`；entity 表格：`subscribeEntityData`（列 = config.dataKeys）；alarms 表：`subscribeAlarmData`。
- echarts 生命周期样板照 `TimeseriesHistoryModal.tsx:119-150`（init/ResizeObserver/dispose）+ `theme/charts.ts` 主题，禁止内联 hex。

## 2. 后端契约（源码 + recon；活体验证随 WP）

- `GET /api/dashboard/{id}`（全量含 configuration）、`GET /api/dashboard/info/{id}`（列表行）、`POST /api/dashboard`（save；import 用）、`DELETE /api/dashboard/{id}`、`GET /api/dashboard/{id}?includeResources=true`（export）。
- `POST /api/dashboard/{id}/customers`（update 全集）、`/customers/add`、`/customers/remove`（body: customerTitle[] + customerId[]，形态以活体响应为准）——manage customers 对话框三动作。
- `POST /api/customer/public/dashboard/{id}`（make public）、`DELETE` 同路径（make private）；公共链接 `…/dashboard/{id}?publicId={publicCustomerId}`（v1 只生成展示，匿名页不做）。
- `POST /api/customer/{customerId}/dashboard/{dashboardId}` / DELETE（assign/unassign，服务层已在 customer.ts）。
- `GET /api/resource/dashboard/system/gateways_dashboard.json`（gateways 页；W3 活体验证，404 则回报 lead 合议兜底：改读仓库 JSON 资产内嵌）。
- `GET /api/widgetType?fqn=…`（resolver miss 兜底探测；CE 全 Angular descriptor → 必落占位）。
- usage 数据：api_usage.json 内 widgets 自带 alias/datasource（多为租户 usage 实体）；`GET /api/usage/info` 供 `system.api_usage` 卡（W3 若实现简卡）。

## 3. ui-ngx parity 细节清单（易漏抄）

- 列表列：createdTime、title；tenant scope 追加 customersTitle 列 + isPublic checkbox；CU 无操作列（只读 + 打开）。
- 行操作 tenant：export、make-public/make-private（按当前状态切换）、manage-assigned-customers、删除（danger confirm）。customer scope：export、unassign、make-private（仅公共客户）。批量：assign / unassign（tenant scope）。
- assign 单个走 `AssignCustomerModal`；manage customers 对话框 = 从已分配集增/删/设全集三动作（forkJoin 逐个调 add/remove/update）。
- export 文件名 = `{title}.json`；v1 不弹 includeResources 询问（直接 `includeResources=true`），登记口径。
- import：文件选择 → JSON 结构校验（title + configuration 必在）→ `POST /api/dashboard` 保存 → 刷新列表 + 成功 toast；缺别名不弹别名对话框（v1 无编辑器，resolver 空集兜底渲染），登记口径。
- toolbar 只读元素（§1.5 settings 开关控制）：timewindow（showDashboardTimewindow）、export（showDashboardExport）、全屏切换、dashboards-select（showDashboardsSelect，壳内页跳转其它仪表盘）、右布局切换（移动+右列）、powered-by footer（非 embedded）、收起按钮。edit/update-image/FAB 不渲染。
- 布局 title 显示：settings.showTitle 时页头渲染 dashboard title + titleColor。
- dashboardCss / backgroundColor / backgroundImageUrl：背景色与图应用容器（css 注入 v1 可省 dashboardCss，登记）。

## 4. ui-antd 落点与红线

- 路由全在 `config/routes.ts`；菜单文案进 `locales/{zh-CN,en-US}/menu.ts`；dashboards 域文案新建 `locales/*/dashboards/`（聚合器两份都要 spread，`check-locale` 兜底）。插值一律 `{name}` 形态禁手拼。
- UI 复用优先：PageContainer、AssignCustomerModal、useBatchRun/BatchProgressModal、use-authority、serverErrorText、列表 URL state 工厂（`createListUrlState`）、scope-page-shell。
- 服务层测试照 `*.endpoints.test.ts`；页面测试照 `assets/list/index.test.tsx` hoisted mock；纯函数（state base64、timewindow、alias、布局换算）用 `data.test.ts` 风格。
- 写 antd 组件前 `npx antd info <Component>`；ui-antd 有 antd skill（`.claude/skills`），涉及 antd 组件先读。
- **红线**：不动 token-store、client.ts 豁免表/刷新单飞、dev proxy 顺序；biome + check-locale + tsc + vitest 提交前全绿，WP 收尾 `npm run build`；颜色只用 antd token / `theme/charts.ts`；WS 10-cmd 预算不可突破。
- dev server :8000 单实例常驻。**唯一例外**：W1 安装新依赖（rgl、W2 leaflet）后允许「杀旧起新」一次（保持 8000 单实例），其余时候禁重启；vitest 随便跑。
- 新依赖白名单：`react-grid-layout`（W1）、leaflet（W2，地图实现方式 spike 后定，禁引大型封装库）。

## 5. 施工队编成与提交单元

| WP | 任务 | 提交单元（每单元门禁绿后 commit） |
|---|---|---|
| W1 dash-core | §1 全部 + B/C 路由 + 壳内只读页 + 全屏页 + view 嵌入组件（D/E 消费面） | ①rgl spike ②types ③services+端点测试 ④alias resolver ⑤states 双 controller ⑥grid 布局 ⑦容器+registry+占位 ⑧timewindow ⑨toolbar+页面+路由+菜单 |
| W2 widget-engine | §6 锚点 7 fqn + gauge 代表 + WS timeseries 补齐 | ①ws timeseries 订阅 ②time_series_chart ③entities_table ④timeseries_table ⑤html_value_card ⑥alarms_table ⑦map（leaflet spike 先行）⑧update_multiple_attributes ⑨gauge 代表 |
| W3 dash-list | §0.A/D/E 全部 | ①列表页+URL state+行操作 ②import/export ③manage customers+批量 ④customer scope 升级 ⑤usage 页 ⑥gateways 页 |
| W4 verify | 门禁 + 真机走查 + 落账 | 见 §7 |

顺序：W1 → W2 → W3 串行（共享触点纪律）；W4 收口。任一 agent 中断由 lead 派后继 agent 从 brief + git log 接管（进度在提交里，不在会话里）。

## 6. widget 锚点清单（验收 = 4 demo 仪表盘渲染零占位）

| fqn | 出处 | 形态 | 数据通道 | 注册名备注 |
|---|---|---|---|---|
| `system.time_series_chart` | rule_engine ×2、thermostats ×2、api_usage ×29 | echarts 折线/柱（config.settings 图形切换） | timeseries 订阅（历史+流式）+ agg | 柱状形态经同一组件（series type） |
| `system.cards.entities_table` | firmware/software ×5+5、thermostats ×1、gateways ×19 | 实体表格（列 = dataKeys，分页） | subscribeEntityData | |
| `system.cards.timeseries_table` | firmware/software ×1+1、rule_engine ×1、gateways ×2、api_usage ×1 | 时序表格（实体行 × key 列，latest/时序混合以 JSON 实查） | latest + timeseries | |
| `system.cards.html_value_card` | firmware/software ×4+4 | 值卡（config.settings 模板/样式 + latest 值替换） | subscribeLatestTelemetry | 勘误（W2 锚点实查）：锚点 8 张全为 `entityCount` datasource + `count` key + filterId keyFilters，实走 subscribeEntityCount 双通道，entity 形态才回落 subscribeLatestTelemetry |
| `system.alarm_widgets.alarms_table` | thermostats ×1、gateways ×1 | 告警表格（alarmSource + filterConfig） | subscribeAlarmData | |
| `system.map` | thermostats ×3（map state） | 地图打点（实体 + lat/lng 遥测） | aliases + latest | leaflet 直用，W2 spike 定型 |
| `system.input_widgets.update_multiple_attributes` | thermostats ×1 | 属性编辑卡（当前值 + 保存） | latest + attributes save | v1 交付功能版（保存链路已有服务） |
| gauge 代表 | demo 无；spec 四类先行单列 | echarts gauge 弧形值卡（min/max/units） | subscribeLatestTelemetry | 挂 `system.analogue_gauges.radial_gauge`，测试证明渲染 |

占位策略：锚点外冷门 fqn（gateway_widgets.*、control_widgets.*、api_usage、markdown_card、aggregated_value_card、mobile_app_qr_code 等）一律 ADR 0003 占位三态。其中 `system.cards.markdown_card` 若 W2 有余量可实现（纯渲染），否则占位登记。

## 7. 验收口径（W4；对齐 spec §3.10 checklist + §3.11 横切）

- 门禁：biome + check-locale + tsc + vitest + build 全绿。
- 真机（browseros，TA 登录）：①四个 demo 仪表盘逐个打开渲染走查（states 切换、面包屑、URL `?state=` 刷新恢复、timewindow 改档数据随之、零「暂未支持」）②`/dashboard/:id` 全屏往返 ③列表操作集逐项（export 下载内容校验、import 往返、assign/unassign 单+批、make public/private、manage customers、删除确认）④usage 页 / gateways 页渲染 ⑤CU 登录：四菜单含仪表盘、只读无编辑入口 ⑥移动断点单列栈（devtools viewport）。demo 租户若本地缺失：经 import 链路导入 4 份 demo JSON（顺带验收 import）。
- 落账：spec §3.10 勾选 + §3.4 网关项收口 + 修订记录（本简报「明确不做」各条）+ BCR 新增（活体验证中的后端契约偏差）。
