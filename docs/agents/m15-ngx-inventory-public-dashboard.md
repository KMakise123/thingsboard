# M15 ui-ngx 匿名公共仪表盘（public dashboard）+ usage 下钻 states 盘点（工作文档，agents 用）

> 由 M15 scout 盘点产出（2026-09-07，仓库版本 4.4.0）。spec「匿名公共仪表盘 + home 首页 + 收口」中公开链路/匿名访问面的实现对照基准，兼作 fork antd usage 页补下钻导航的数据契约素材；随 M15 收尾可归档或删除。
> 结论先行：ngx 的「匿名公开」**不是裸匿名**——公开链接是 `/dashboard/{dashboardId}?publicId={publicCustomerId}`，前端把 `publicId` 拿去 `POST /api/auth/login/public` 换一张 **`isPublic=true` 的 CUSTOMER_USER JWT**（sub=publicCustomerId），此后所有 `/api/*` 都带这张 JWT（`dashboard.service.ts:151-167`、`auth.service.ts:139-144,315-331`）。匿名访问面走的是**顶层独立路由 `/dashboard/:id`**（app 根只有一个 router-outlet，没有 sidenav/头部壳），public 用户被强制 `forceFullscreen=true` + `readonly`（`app.component.html:20`、`auth.service.ts:404-406`、`dashboard-page.component.ts:521-523`）。usage 页 `/usage` 不是后端 dashboard 实体，而是前端打包资产 `assets/dashboard/api_usage.json` 直接喂给 `tb-dashboard-page [embedded]`（`api-usage-routing.module.ts:26-47`、`dashboard-view.component.html:18`）；该 JSON 共 **11 个 states、31 个 widget**，下钻靠 dashboard state 导航 API（`stateController.updateState/openState`）与 `?state=` base64 查询参数。

## 关键文件

- 公开链路服务：`ui-ngx/src/app/core/http/dashboard.service.ts`（makePublic :110-113 / makePrivate :115-118 / getPublicDashboardLink :151-167）
- 列表页动作：`ui-ngx/src/app/modules/home/pages/dashboard/dashboards-table-config.resolver.ts`（:229-240 动作、:471-512 实现）
- 公开对话框：`ui-ngx/src/app/modules/home/pages/dashboard/make-dashboard-public-dialog.component.ts/.html`；详情页公开链接：同目录 `dashboard-form.component.html:92-114`
- 匿名登录链路：`ui-ngx/src/app/core/auth/auth.service.ts`、`ui-ngx/src/app/core/guards/auth.guard.ts`、`ui-ngx/src/app/core/settings/settings.effects.ts:77-90`
- 公开（无壳）路由：`ui-ngx/src/app/modules/dashboard/dashboard-routing.module.ts` → `dashboard-pages.routing.module.ts`；登录公开段：`ui-ngx/src/app/modules/login/login-routing.module.ts`
- dashboard 展示组件：`ui-ngx/src/app/modules/home/components/dashboard-page/dashboard-page.component.ts/.html`（公开与登录共用）
- state 控制器：同目录 `states/`（`state-controller.component.ts`、`default-state-controller.component.ts`、`entity-state-controller.component.ts`、`states-component.directive.ts`）
- usage 页：`ui-ngx/src/app/modules/home/pages/api-usage/`、`ui-ngx/src/app/modules/home/components/dashboard-view/dashboard-view.component.ts/.html`
- usage 数据源：`ui-ngx/src/assets/dashboard/api_usage.json`（前端资产，非后端实体）
- api_usage 卡（Angular widget）：`ui-ngx/src/app/modules/home/components/widget/lib/cards/api-usage-widget.component.ts/.html`、设置模型 `lib/settings/cards/api-usage-settings.component.models.ts`
- 后端锚点（仅佐证）：`application/src/main/java/org/thingsboard/server/controller/DashboardController.java`（:156-157 读取权限、:308/:322 public 端点）、`service/security/auth/AbstractAuthenticationProvider.java:60-75`、`config/ThingsboardSecurityConfiguration.java:84,173-177`、`service/security/model/token/JwtTokenFactory.java:69,95,143-145`、`application/src/main/data/json/system/widget_types/api_usage.json`

## A 部分：匿名公共仪表盘

### 1. 公开链路（make public → 链接生成）

- 列表/详情动作：tenant 作用域行内动作「make-public」（icon `share`，仅 `!isPublicDashboard(entity)` 可用）与「make-private」（icon `reply`，仅公开时可用），`dashboards-table-config.resolver.ts:229-240`；group 动作分支 `makePublic/makePrivate`（:612-617）。详情页有同名按钮（`dashboard-form.component.html:37-49`）。
- 「Public」列只在 tenant 作用域显示，值为 `isPublicDashboard(entity)` 勾选框（`dashboards-table-config.resolver.ts:196-198`）。
- `isPublicDashboard` 判定：`dashboard.assignedCustomers` 里存在 `public===true` 的 customer 即公开（`dashboard.models.ts:214-221`）。**DashboardInfo 没有 `publicCustomerId`/`isPublic` 字段**，公开性完全由 `assignedCustomers` 推导（`dashboard.models.ts:28-35`；`ShortCustomerInfo{customerId,title,public}` 在 `customer.model.ts:29-33`）。
- make public 调 `POST /api/customer/public/dashboard/{dashboardId}`（`dashboard.service.ts:110-113`）；后端把它实现为「把 dashboard 分配给租户内置的 Public customer」，成功后弹出公开对话框（`dashboards-table-config.resolver.ts:471-490`）。
- make private 调 `DELETE /api/customer/public/dashboard/{dashboardId}`（`dashboard.service.ts:115-118`），前端先 confirm（`dashboards-table-config.resolver.ts:492-512`）；后端即解除 Public customer 分配（`DashboardController.java:314,322`）。
- 公开链接生成：`getPublicDashboardLink`（`dashboard.service.ts:151-167`）——从 `assignedCustomers` 取第一个 public customer 的 `customerId.id` 作为 `publicCustomerId`，拼 `{protocol}//{hostname}[:port]/dashboard/{dashboardId}?publicId={publicCustomerId}`。**URL 形态就是 `/dashboard/{id}?publicId=xxx`**，不是别的路径。
- 对话框内容：链接 `<pre><code>` 展示 + 复制按钮（ngxClipboard）+ `tb-social-share-panel` 社交分享（`make-dashboard-public-dialog.component.html:34-53`）；`publicLink` 在构造器里由 `getPublicDashboardLink` 算出（`make-dashboard-public-dialog.component.ts:55`）。详情页公开后同样展示 disabled 输入框 + 复制按钮 + 社交面板（`dashboard-form.component.html:100-113`）。
- **embed 嵌入链接：ngx 4.4.0 没有专门的 embed 链接 UI**。只有两个通用查询参数可把任意 dashboard 变成嵌入形态：`?embedded=true`（去工具栏语境）与 `?hideToolbar=true`，`dashboard-page.component.ts:496-502` 消费；目前生产者仅移动端深链（`mobile.service.ts:164,167`）。公开链接本身不含这两个参数。

### 2. 匿名访问面（未登录打开公开链接走哪）

- 首次进入（无 token）：`AuthGuard.canActivate` 发现 URL 带 `publicId` → 清掉本地残留 token（`setUserFromJwtToken(null,null,false)`）→ `reloadUser()` → 先返回 `false` 中断本次导航（`auth.guard.ts:76-85`）。
- `reloadUser()` → `loadUser()`：从 query 取 `publicId`（`utils.service.ts:336-347`），调 `publicLogin(publicId)` = `POST /api/auth/login/public` body `{publicId}`（`auth.service.ts:139-144,315-331`；`PublicLoginRequest` 模型 `login.models.ts:24-26`），拿到 token+refreshToken 后 `procceedJwtTokenValidate()`。
- 后端按 publicId 查 Public customer，构造 `SecurityUser`：`authority=CUSTOMER_USER`、`customerId=Public customer`、principal 类型 `PUBLIC_ID`（`AbstractAuthenticationProvider.java:60-75`）；JWT claims 含 `isPublic`，`sub`=publicId（`JwtTokenFactory.java:69,95,143-145`）。端点注册：`ThingsboardSecurityConfiguration.java:84,173-177`。
- 解码后 `authUser.isPublic=true` → **`forceFullscreen=true`**，且只拉 `/api/system/params`，不拉 userDetails（`auth.service.ts:392-417`；`AuthUser.isPublic` 模型 `user.model.ts:66-77`）。
- 认证完成后 `notifyAuthenticated` → app 级订阅触发 `gotoDefaultPlace(true)` → public 用户 `defaultUrl` 直接解析到 `dashboard/${lastPublicDashboardId}`，`lastPublicDashboardId` 由路由效果在每次进入 `/dashboard/:id` 时记录（`app.component.ts:94-110`、`auth.service.ts:301-302`、`settings.effects.ts:77-90`、`auth.models.ts:63`）。
- **无壳/有壳差异**：`/dashboard/:id` 是与 `home`、`login` 平级的顶层路由（`app.module.ts:61-79` 挂 `DashboardRoutingModule`；`dashboard-routing.module.ts:23-35` lazy load；`dashboard-pages.routing.module.ts:54-71` 声明 `singlePageMode:true`），而 `app.component.html:20` 只有一个 `<router-outlet>`——**没有 sidenav、没有顶栏，天然全屏**。有壳的 `/dashboards/:id`（复数，登录用户日常入口）在 home 壳内（`home/pages/dashboard/dashboard-routing.module.ts:83-98`）。两个路由共用同一个 `DashboardResolver` 与 `DashboardPageComponent`。
- public 用户也进不去 home 壳页面：`forceDefaultPlace` 对 `isPublic` 用户恒重定向回 dashboard（`auth.service.ts:259-272`）；守卫还要求已认证 public 用户的 URL `publicId` 必须与 JWT `sub` 一致，不一致则 logout 或重载（`auth.guard.ts:122-131`）。路由 `data.auth` 为 `[TENANT_ADMIN, CUSTOMER_USER]`，public JWT 的 scope 即 `CUSTOMER_USER`，可过（`dashboard-pages.routing.module.ts:63`、`auth.service.ts:399-403`）。

### 3. publicId 的消费与 dashboard 数据端点

- 消费路径是「**查询参数 → 换 JWT → 后续带 Authorization 头**」，不存在「publicId 直接当请求头/参数透传」的用法。唯一再写回 URL 的是 `settings.effects.ts:77-90`：public 用户每次路由到 `/dashboard/...` 就用 `updateQueryParam('publicId', authUser.sub)` 把 publicId 补回地址栏（刷新/分享后仍可用），`utils.service.ts:358-363` 用 `history.replaceState` 实现。
- dashboard 数据端点：`GET /api/dashboard/{dashboardId}`（`dashboard.service.ts:70-72`），由 `DashboardResolver` 调用（`home/pages/dashboard/dashboard-routing.module.ts:47-59`）；public 用户（CUSTOMER_USER + customerId=Public customer）因 dashboard 已分配给该 customer 而有读权限（`DashboardController.java:156-157` `hasAnyAuthority('TENANT_ADMIN','CUSTOMER_USER')` + `checkDashboardId(READ)`）。
- resolver 里的差异化逻辑：public 用户**跳过**「访问上报」`userSettingService.reportUserDashboardAction(...VISIT)`（`dashboard-routing.module.ts:51-53`）。
- 匿名可用的其它端点：`/api/system/params`（`auth.service.ts:456-466`，public 分支必调）；后续 telemetry/ws 请求都凭该 JWT 走正常鉴权。
- `publicId` 无效/过期链接：`publicLogin` 报错 → `catchError` 里 `updateQueryParam('publicId', null)` 抹掉参数并抛错（`auth.service.ts:327-331`）→ `notifyUnauthenticated` → app 跳 `/login`（`app.component.ts:106-107`、`auth.service.ts:306-308`）。

### 4. 匿名态 UI 差异（toolbar、编辑、品牌）

- `isPublicUser()` = `authUser.isPublic`（`dashboard-page.component.ts:866-868`）。readonly 判定含 `forceFullscreen`，public 用户恒 readonly → 不出「edit-mode」按钮（`dashboard-page.component.ts:521-523`、html `:148-155` 由 `!readonly` 控制）。
- toolbar 显隐：`hideToolbarSetting` 在 `!forceFullscreen || isMobileApp || isPublicUser()` 时才允许应用 dashboard 设置里的 hideToolbar，即**公开仪表盘的工具栏可被 dashboard settings 彻底隐藏**（`dashboard-page.component.ts:653-660`）。
- 用户菜单/通知：左面板与右面板的 `tb-user-menu`、`tb-notification-bell` 都包了 `!isPublicUser()`（html `:42-45、:78-80、:118-121、:129-131`）。
- 品牌/入口：`showDashboardLogo()` 仅在 `forceFullscreen || singlePageMode || isFullscreen` 时显示 dashboard 设置里的 logo（`dashboard-page.component.ts:729-736`）——**public 强制 forceFullscreen，所以公开页会显示 logo**；`tb-logo` 的链接 `getDashboardLogoLink()` 在 forceFullscreen 下返回 null（点 logo 不跳转，`dashboard-page.component.ts:271,1791-1793`、html `:100-102`）。**没有登录按钮/入口**。
- 其它 toolbar 件：全屏按钮 `hideFullscreenButton()` 对 forceFullscreen 隐藏（`:640-642`、html `:132-137`）；timewindow 走 `displayDashboardTimewindow()`（dashboard settings 默认 true，html `:256-278`）；export 按钮走 `displayExport()`（dashboard settings 可关，`:675-682`）；dashboards 切换器 `tb-dashboard-select` 对 embedded/singlePage 隐藏（html `:302-308`）。github badge 仍在（html `:309-313`）。
- 顶部状态切换器：`tb-states-component`（html `:19-30`），非编辑态藏在 breadcrumb 模板里；状态多于 1 个时由 state controller 渲染下拉（`default-state-controller.component.html:22-29`；entity 版面包屑 `entity-state-controller.component.html`）。

### 5. unshare / make-private 后公开链接的行为

- 前端**没有**主动吊销已发出去的 JWT 的机制：public JWT 在浏览器 localStorage 里活到自然过期（含 refreshToken，可续期）。链接是否还能用完全由后端每次鉴权决定——make private 后 dashboard 不再属于 Public customer，`GET /api/dashboard/{id}` 被拒（`DashboardController.java:156-166` + 访问检查），前端 `DashboardResolver` 对 `getDashboard` **没有** catchError（只对 visit 上报有，`dashboard-routing.module.ts:47-59`）→ 导航失败：全局拦截器弹错误 toast，页面停留/空白（`global-http-interceptor.ts:98-111` 处理 401/错误码；403 走 toast 分支）。最终呈现需实测（见「遗留问题」）。
- 对仍持有旧 publicId 的访客：守卫会拿 URL `publicId` 再走一遍 `publicLogin`——publicId 本身（=Public customer UUID）在 make private 后**仍有效**（customer 未删，只是不再挂这个 dashboard），登录仍成功，但随后 `getDashboard` 被拒，同样落到上一条。若整个 Public customer 被删（如删租户级联），`publicLogin` 失败 → 抹 publicId → 跳 `/login`（`auth.service.ts:327-331`）。
- tenant 侧 confirm 文案 `dashboard.make-private-dashboard-*`（`dashboards-table-config.resolver.ts:496-501`）。

### 6. 是否有独立的 public-dashboard 页面目录

- **没有**。公开访问复用 `DashboardPageComponent` + 同一个 `DashboardResolver`，仅靠顶层路由 `/dashboard/:id`（`modules/dashboard/`，目录名只表「无壳 dashboard 页」，不表 public）+ `publicId` 查询参数 + JWT claim 区分。`module: 'public'` 这个 route data 只出现在 login 模块 9 条路由上（`login-routing.module.ts:51-135`），语义是「未认证也可进入的页面」，dashboard 公开页并未使用它（它靠 query param 分支，`auth.guard.ts:79-85`）。

## B 部分：usage 下钻 states（fork antd 评估素材）

### 7. usage 页路由、组件与 states 清单

- 路由 `/usage`，`auth:[TENANT_ADMIN]`，组件 `DashboardViewComponent`，resolver 直接 `resourcesService.loadJsonResource('/assets/dashboard/api_usage.json')`（`api-usage-routing.module.ts:26-49`）。菜单项 MenuId.api_usage「Api Usage」path `/usage` icon `insert_chart_outlined`，挂在 TENANT_ADMIN 菜单 platform 组尾部（`menu.models.ts:113,789-797,1008`）。
- `DashboardViewComponent` 只有一行模板 `<tb-dashboard-page [embedded]="true" [dashboard]="dashboard">`（`dashboard-view.component.ts:30-38`、html `:18`）——即 usage 页=嵌入式跑一个**前端资产 dashboard**，`embedded=true` 时 `readonly`、无 dashboardId、无路由 data 依赖（`dashboard-page.component.ts:396-402,521`）。
- JSON 顶层：`title:"Api Usage"`、`configuration{widgets(31), states(11), entityAliases(2), filters, timewindow, settings}`（`api_usage.json:8` 起的 widgets、:11499 起的 states）。timewindow 默认 realtime 24h、aggregation NONE/limit 50000；`settings.stateControllerId:"entity"`，且 showTitle/showDashboardsSelect/showEntitiesSelect/showDashboardTimewindow/showDashboardExport/showFilters/showDashboardLogo 全 false、toolbarAlwaysOpen true（`api_usage.json:12353` alias、:12380 settings）。
- entityAliases（2 个）：`Api usage state`（filter type `apiUsageState`，单实体，api_usage.json:12353）与 `TbServiceQueues`（entityType=QUEUE_STATS，多选）。`apiUsageState` filter 由 `entity.service.ts:731,1057-1059` 透传后端，解析到当前租户的 API_USAGE_STATE 实体。
- **states 清单**（state id / 名称 i18n key / 布局与 widget 数；json 行号锚点为 states 段内条目起点）：
  - `default`（root，「Api Usage」，:11500）：main=**api_usage 卡**（`system.api_usage`，widget 07e3a570，:11191）；right=4 个 hourly 图——transport-messages / transport-data-point / rule-engine / data-points-storage-days（`system.time_series_chart`）。
  - `rule_engine_statistics`（:2235 附近定义，「Rule engine statistics」）：**仅 main**，3 个 widget——queue-stats（time_series_chart）、processing-failures-and-timeouts（time_series_chart）、exceptions（`system.cards.timeseries_table`）。是唯一被二级下钻（「view statistics」）指向的 state。
  - `transport_messages`（:11213）：main=api_usage 卡；right=3（hourly/daily/monthly transport-msg chart）。
  - `transport_data_points`（:11238）：main=api_usage 卡；right=3（data-points hourly/daily/monthly）。
  - `rule_engine_executions`（:11263）：main=api_usage 卡；right=3（rule-engine hourly/daily/monthly）。
  - `javascript_function_executions`（:11288）：main=api_usage 卡；right=3（js hourly/daily/monthly）。
  - `tbel_function_executions`（:11313）：main=api_usage 卡；right=3（tbel hourly/daily/monthly）。
  - `data_points_storage_days`（:11338）：main=api_usage 卡；right=3（storage hourly/daily/monthly）。
  - `alarms_created`（:11363）：main=api_usage 卡；right=3（alarms hourly/daily/monthly）。
  - `emails`（:11388）：main=api_usage 卡；right=3（emails hourly/daily/monthly）。
  - `sms`（:11413）：main=api_usage 卡；right=3（sms hourly/daily/monthly）。
- widget 总账：31 个 = 1×`system.api_usage` 卡 + 29×`system.time_series_chart` + 1×`system.cards.timeseries_table`。**api_usage 卡本身在 10 个 state 的 main 里复用同一个 widget id**（07e3a570）；各下钻 right 的 3 图 = 27 + rule_engine_statistics 3 = 30 个非卡 widget。
- 与「fork v1 已交付 default main+right 两态」对账：ngx 的 default right 恰好 4 个 hourly 图；fork 若按 ngx 对齐，right 应是这 4 个而不是 3 个。

### 8. 状态切换机制（api_usage 卡如何触发下钻、?state= 语义）

- usage dashboard 的 `settings.stateControllerId="entity"`（api_usage.json:12380）→ `tb-states-component` 按该 id 从 `StatesControllerService` 取 `EntityStateControllerComponent`（`states-component.directive.ts:122-132`、`states-controller.service.ts`；未知 id 回退 default）。
- `stateControllerId:"entity"` 意味着 `stateObject` 是**栈**（数组）：`openState`=push、`updateState`=替换栈顶、`navigatePrevState`=裁剪；`resolveEntity` 会先解析 params.entityId 补 entityName/Label（`entity-state-controller.component.ts:110-124,143-158,322-342`）。
- api_usage 卡触发下钻：每条 `apiUsageDataKeys` 带 `state` 字段（卡片 settings 模型 `api-usage-settings.component.models.ts:42-48`；api_usage.json 里 9 条 key 的 state 分别指向上表 9 个 feature state）；行渲染成可点列表，click → `updateState($event, api.state)` → `ctx.stateController.updateState(stateName, getStateParams(), ctx.isMobile)`（`api-usage-widget.component.html:23-27`、`:105-110` 追踪当前 stateId 高亮、`:121-126`）。
- 回到主视图：api_usage 卡 headerButton 有一个 custom 动作「Go to default view」：`showWidgetActionFunction` 仅在非 default state 显示，`customFunction` 调 `widgetContext.stateController.updateState(settings.targetDashboardState)`（默认 `'default'`，api_usage.json:11461-11463 动作、:1078-1082 targetDashboardState 默认值在设置模型 `api-usage-settings.component.models.ts:94`）。
- 二级下钻：rule-engine 三个图表卡 headerButton 有 `openDashboardState` 类型动作「view statistics」，`targetDashboardStateId:"rule_engine_statistics"`，hourly 不带 entityId、daily/monthly `setEntityId:true`（api_usage.json:2227、:4543、:4979；daily/monthly 指向 QUEUE_STATS 实体用于 exceptions 表）。执行链：`widget.component.ts:1138-1155` → `stateController.openState(targetDashboardStateId, params, openRightLayout)`；`openDashboardState` 动作类型定义在 `widget.models.ts:615,675`。
- `?state=` 查询参数语义：**`objToBase64(StateControllerState)`，即 `[{id:string, params:{entityId?,entityName?,entityLabel?,...}}]` 的 JSON→base64**（`state-controller.models.ts:20`、`state-controller.component.ts:106-119` 监听 queryParamMap、`utils.ts:221-227,253-255` 编解码；URL 值再 encodeURIComponent）。entity controller 特例：**栈长度为 1 且是 root state 且 params 为空时，把 state 参数清空**（URL 无 ?state），下钻后才写 `?state=<base64>`（`entity-state-controller.component.ts:299-320`；default controller 则始终写参数，`default-state-controller.component.ts:246-264`）。
- 切 state 后真正驱动 widget 集合切换的是 `dashboardCtrl.openDashboardState(stateId)`（`dashboard-page.component.ts:1120-1134`：取 `getStateLayoutsData` → 更新 main/right 布局）。对 fork 的含义：**手工补下钻导航时无需 ngx 的 stateController，只要消费同一份 api_usage.json 的 `states` + api_usage 卡 settings 的 `state`/`targetDashboardState` 字段，自行实现「换 state → 按 state 渲染对应 main/right widget 子集 + 维护 ?state= base64 契约」即可**；fork v1 的 Angular 占位卡需要在其上补「点击行→切 state」的等价物。

### 9. 系统内置 usage dashboard 的数据来源

- **不是 sys admin 预置的 dashboard 实体**——它根本不进数据库：`/usage` 的 dashboard 是 `ui-ngx/src/assets/dashboard/api_usage.json` 前端静态资源，经 `ResourcesService.loadJsonResource` 注入（`api-usage-routing.module.ts:26-32`），无 id 字段（`d.get('id')` 为 None）。
- widget **类型**定义才是后端系统数据：`application/src/main/data/json/system/widget_types/api_usage.json`（fqn `api_usage`→`system.api_usage`，type latest，`templateHtml:"<tb-api-usage-widget [ctx]=\"ctx\">"`，安装时入库）；前端 Angular 组件 `ApiUsageWidgetComponent`（selector `tb-api-usage-widget`）注册于 `widget-components.module.ts:98,158,223`。
- 数据本身：卡片订阅 alias「Api usage state」实体的 27 个 timeseries key（9 feature × status/maxLimit/current，key 名如 `transportApiState/transportMsgLimit/transportMsgCount`，`api-usage-settings.component.models.ts:81-93` 默认集；订阅逻辑 `api-usage-widget.component.ts:75-100`）。另有 REST `GET /api/usage`（`usage-info.service.ts:32-34`、`UsageInfo` 模型 `usage.models.ts:17-39`）——那是 home 首页 usage-info 卡用的轻量接口，与 `/usage` 页的 dashboard 无关（fork 对账时勿混）。
- 同目录还有 `sys_admin_home_page.json` / `tenant_admin_home_page.json` / `customer_user_home_page.json`（内含 `apiUsageState` 类型 widget），是 home 首页默认 dashboard 资产，M15 home 部分的素材。

### 10. fork 补下钻需要消费的数据契约（汇总）

1. `api_usage.json`（fork 需自带等价资产或改造成 TS/JSON 模块）中的：`configuration.states`（11 个，id+name i18n+layouts.widgets 映射）、`configuration.widgets`（31 个完整配置）、`configuration.settings.stateControllerId:"entity"`（决定栈语义，fork 也可简化为单层）。
2. api_usage 卡 settings 契约：`dsEntityAliasId` + `apiUsageDataKeys[].state`（feature→state 映射，下钻入口）+ `targetDashboardState`（返回默认态）。fork 的占位卡只要拿到这份数据即可实现同款交互。
3. URL 契约：`/usage?state=objToBase64([{id,params}])`（entity controller 在 root 态时省略该参数）；解析失败/未知 state 回退 root（`entity-state-controller.component.ts:254-283`）。
4. i18n 契约：JSON 内所有 `{i18n:<key>}` 占位由 `customTranslation`+`i18nRegExp` 在前端展开，key 表在 `assets/locale/locale.constant-en_US.json:881`（`api-usage.*`，含 :10491 `widgets.api-usage.go-to-main-state`）；`utils.service.ts:209-222`。

## 遗留问题

1. **make-private 后公开访客的实际观感未实测**：代码面结论是「getDashboard 被拒 → 拦截器 toast + 导航失败（停留/空白）」，但 403 的具体响应体、是否触发跳登录、DashboardPages 路由失败后的 UI 兜底，需要起后端+浏览器实测（M15 走查项）。
2. public JWT 的 TTL/续期与「链接长期有效性」的配合（默认 JWT 2.5h、refresh 可续）未深挖——fork 若做「链接永不过期」语义需另立方案，本稿只记机制。
3. `/dashboards/:id`（有壳路由）对 public 用户的行为未逐条验证：理论上 auth 数组含 CUSTOMER_USER 可进，但 `forceDefaultPlace` 会把它拉回 `/dashboard/:id`；仅从代码推断。
4. `openDashboardState` 动作里 daily/monthly 图 `setEntityId:true` 携带的 QUEUE_STATS entityId 对 `rule_engine_statistics` 的 exceptions 表 widget 的实际过滤效果未验证（params.entityId 如何进 alias「TbServiceQueues」取决于 dashboard-utils 的 alias 解析，未展开）。
5. fork antd 侧是否照搬 `stateControllerId:"entity"` 的栈式语义（多级下钻+面包屑）还是简化为平铺两态，属合议组方案决策，本稿不预设立场。
