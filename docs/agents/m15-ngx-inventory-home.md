# M15 ui-ngx home 首页 / 登录落点 / home dashboard 链路盘点（工作文档，agents 用）

> 由 scout-ngx(home) 盘点产出（2026-09-07）。M15 spec 的对照基准；随 M15 收尾可归档或删除。
> 范围：登录成功后各角色落点、`/home` 路由与渲染链、home dashboard 数据链（`/api/dashboard/home` 与 `/api/tenant/dashboard/home/info` 两族端点）、`hideDashboardToolbar` 的作用链、`/home` 页 quick links 回落、dashboard state 取值、匿名公共仪表盘（publicId）链路事实。
> 术语：ngx 的「首页」指 `/home` 路由（组件 `HomeLinksComponent`，文件目录叫 home-links，**没有 `pages/home/` 目录**）；"home dashboard" 指 Tenant 在 `/settings/home` 配置的租户级首页仪表盘；「系统内置首页」指前端静态 JSON 资产（`assets/dashboard/*_home_page.json`），不是数据库里的 dashboard。

## 关键文件

- 登录组件：`ui-ngx/src/app/modules/login/pages/login/login.component.ts`（登录模块路由 `ui-ngx/src/app/modules/login/login-routing.module.ts`）
- 登录/落点核心：`ui-ngx/src/app/core/auth/auth.service.ts`（login / defaultUrl / gotoDefaultPlace / forceDefaultPlace）、`ui-ngx/src/app/core/guards/auth.guard.ts`
- 落点触发：`ui-ngx/src/app/app.component.ts`（setupAuth）
- `/home` 路由：`ui-ngx/src/app/modules/home/pages/home-links/home-links-routing.module.ts`（含 homeDashboardResolver）
- `/home` 组件：`ui-ngx/src/app/modules/home/pages/home-links/home-links.component.ts/.html/.scss`、`home-links.module.ts`
- 根路由：`ui-ngx/src/app/app-routing.module.ts`（空路径→home）
- HTTP 服务：`ui-ngx/src/app/core/http/dashboard.service.ts`（getHomeDashboard / getTenantHomeDashboardInfo / setTenantHomeDashboardInfo）
- 模型：`ui-ngx/src/app/shared/models/dashboard.models.ts`（HomeDashboard / HomeDashboardInfo）、`ui-ngx/src/app/shared/models/user.model.ts`（UserAdditionalInfo）
- TA 配置页：`ui-ngx/src/app/modules/home/pages/admin/home-settings.component.ts/.html`（路由在 `admin-routing.module.ts`）
- dashboard 渲染：`ui-ngx/src/app/modules/home/components/dashboard-page/dashboard-page.component.ts/.html`
- 菜单/quick links 数据：`ui-ngx/src/app/core/services/menu.models.ts`、`ui-ngx/src/app/core/services/menu.service.ts`、`ui-ngx/src/app/core/services/home.service.ts`
- 系统内置首页 JSON：`ui-ngx/src/assets/dashboard/sys_admin_home_page.json`、`tenant_admin_home_page.json`、`customer_user_home_page.json`（另有 api_usage.json）
- 文案：`ui-ngx/src/assets/locale/locale.constant-en_US.json`（`home.home`、`admin.home`、`admin.home-settings`、`dashboard.home-dashboard`/`dashboard.home-dashboard-hide-toolbar`）
- fork 后端对照：`application/src/main/java/org/thingsboard/server/controller/DashboardController.java`

## 1. 登录链路与落点

### 1.1 登录请求本身

- 登录表单提交走 `LoginComponent.login()` → `authService.login()`（`login.component.ts:55-70`）；组件内成功分支**不做任何导航**，只处理 credentialsExpired（→`login/resetExpiredPassword`）与 passwordViolation 两种错误（:61-68）
- `AuthService.login()` POST `/api/auth/login`，拿到 JWT 后 `setUserFromJwtToken(token, refreshToken, true)`；PRE_VERIFICATION_TOKEN→`login/mfa`、MFA_CONFIGURATION_TOKEN→`login/force-mfa`（`auth.service.ts:115-127`）
- OAuth2 登录按钮带 `?prevUri=<redirectUrl>`（`login.component.ts:76-82`）

### 1.2 落点决策（defaultUrl，三个角色统一逻辑，无 per-role 硬编码）

- 触发链：`setUserFromJwtToken` notify → store `ActionAuthAuthenticated` → app.component `setupAuth` 里 `selectUserReady` 变化后调 `authService.gotoDefaultPlace(isAuthenticated)`（`app.component.ts:94-110`，skip(1) 只在用户加载完成后触发一次；:109 顺带 `reloadUser()`）
- `gotoDefaultPlace` → `defaultUrl(isAuthenticated, authState)` → `router.navigateByUrl`（`auth.service.ts:217-225`）
- `defaultUrl` 已登录分支（`auth.service.ts:278-310`）：
  - 兜底落点统一是 **`home`**（`auth.service.ts:291`）——SYS_ADMIN / TENANT_ADMIN / CUSTOMER_USER 三个角色登录后都先落到 `/home`，**不存在 per-role 的默认路由常量**
  - 有 `redirectUrl`（守卫在未登录访问受保护路由时记录，见 1.3）则优先回跳（:286-289）
  - TENANT_ADMIN / CUSTOMER_USER 且 `userDetails.additionalInfo.defaultDashboardId` 存在时改跳：`forceFullscreen`→`dashboard/{id}`，否则 `dashboards/{id}`（:293-300）。SYS_ADMIN **没有**这条分支
  - `isPublic` 用户（公共客户匿名用户）→ `dashboard/{lastPublicDashboardId}`（:301-303）
  - 未登录 → `login`（:307）
- `userHasDefaultDashboard` 判断依据 `userDetails.additionalInfo.defaultDashboardId`（`auth.service.ts:650-657`）；`userForceFullscreen` 依据 `isPublic` 或 `defaultDashboardFullscreen===true`（:638-644）
- `forceDefaultPlace`（`auth.service.ts:256-276`）：TA/CU 配了 default dashboard 且 forceFullscreen（或 isPublic）时，访问任何非 `account.*` / 非该 dashboard 的路径都会被弹回 dashboard——即"锁死在全屏默认仪表盘"模式
- 模型锚点：`UserAdditionalInfo` 同时含 `defaultDashboardId`/`defaultDashboardFullscreen`（用户级默认仪表盘）与 `homeDashboardId`/`homeDashboardHideToolbar`（租户级 home dashboard 镜像字段）（`user.model.ts:36-47`）

### 1.3 守卫（AuthGuard）交互

- 未登录访问受保护路由：记录 `redirectUrl=url` 后 `defaultUrl(false)` → login（`auth.guard.ts:86-89`）
- 已登录访问任意路由：先算 `defaultUrl(true, authState, path, params)`，非空则直接重定向（如空路径、login、forceDefaultPlace 命中）（`auth.guard.ts:141-144`）；否则校验 `data.auth` 数组，不含当前 authority → forbidden 弹窗（:146-149）；`data.redirectTo`（含按角色 map）→ 跳转（:150-157）
- 侧边菜单三角色都有 `{id: MenuId.home}` 项（`menu.models.ts:848`(SA)、`:919`(TA)、`:1030`(CU)）；MenuId.home 定义为 path `/home`、name `home.home`、icon `mdi:home-outline`（:122-132，MenuId 枚举 :48-49）
- 根路由空路径重定向到 `home`（`app-routing.module.ts:21-29`）

## 2. `/home` 路由本体与三角色

- 路由定义：`home-links-routing.module.ts:122-137`，path `home`，组件 `HomeLinksComponent`，`auth: [SYS_ADMIN, TENANT_ADMIN, CUSTOMER_USER]`（三角色全放行），`title: 'home.home'`，breadcrumb `MenuId.home`，resolver `homeDashboardResolver` 提供 `data.homeDashboard`
- 组件**没有角色分支**：三角色渲染同一组件；角色差异只体现在 resolver 的回落数据（见 §3）与 quick links 内容（菜单推导，见 §6）
- 组件从 `route.snapshot.data.homeDashboard` 取 dashboard（`home-links.component.ts:43`）；`hideMainToolbar` 初值 true，`ngOnInit` 里改为 `!!homeDashboard && !homeDashboard.isSystemDashboard`——即"配置了租户 home dashboard 时显示主工具栏，系统内置 JSON 首页时隐藏"（`home-links.component.ts:45,53-54`）
- 模块挂载：`HomeLinksModule` 声明于 `home-links.module.ts:25-37`，经 `home-pages.module.ts:20,56` 汇出（HomePagesModule）

## 3. home dashboard 数据链

### 3.1 resolver 与两个端点族

- `homeDashboardResolver`（`home-links-routing.module.ts:106-120`）：先 `dashboardService.getHomeDashboard()`；返回 falsy（未配置）→ `getHomeDashboard(store, resourcesService)` 走 JSON 资产回落
- `getHomeDashboard()` → **GET `/api/dashboard/home`**（`dashboard.service.ts:138-140`）——`/home` 页实际消费的是这个端点
- TA 配置页用的是另一族：`getTenantHomeDashboardInfo()` → GET `/api/tenant/dashboard/home/info`（`dashboard.service.ts:142-144`）、`setTenantHomeDashboardInfo()` → POST 同路径（:146-149）。**全仓 grep 这两个函数只被 home-settings 组件消费**（`home-settings.component.ts:51,66`）
- 模型：`HomeDashboard = Dashboard + hideDashboardToolbar + isSystemDashboard?`；`HomeDashboardInfo = {dashboardId, hideDashboardToolbar}`（`dashboard.models.ts:200-208`）

### 3.2 resolver 的 JSON 资产回落（"默认 home dashboard 是系统内置 dashboard"的确切含义）

- 按角色取静态资产：SYS→`/assets/dashboard/sys_admin_home_page.json`、TA→`tenant_admin_home_page.json`、CU→`customer_user_home_page.json`（`home-links-routing.module.ts:39-41,43-55`）；经 `resourcesService.loadJsonResource` HTTP GET 静态文件（`resources.service.ts:127-140`），三个文件真实存在于仓库（64KB/124KB/28KB 量级）
- 回落处理 `applySystemParametersToHomeDashboard`（:57-104）：按角色注入 store 参数——TA 用 `selectHomeDashboardParams`（persistDeviceStateToTelemetry + mobileQrEnabled，`auth.selectors.ts:86-90`）、SA 用 mobileQrEnabled、CU 用 persistDeviceStateToTelemetry——据此改写 JSON 里特定 filter/widget 配置（:81-97）；最后强制 `hideDashboardToolbar=true`、`isSystemDashboard=true`（:98-99）
- 结论：**默认首页不是数据库内置 dashboard，而是打包在前端 assets 里的静态 JSON**，渲染时同样走 `tb-dashboard-page`

### 3.3 fork 后端语义登记（DashboardController.java，本轮实测源码）

- GET `/api/dashboard/home`（`DashboardController.java:422-450`）：**SYS+TA+CU 全放行**；查 additionalInfo 顺序 User →（CU 时）Customer → Tenant（:431-446）；命中则 gzip 写出 `HomeDashboard(dashboard, hideDashboardToolbar)`（:447-449，extract :518-532，hideDashboardToolbar 缺省 true）；**未命中什么都不写 → 200 空 body**（SA 直接 return，:428-430）。Angular `http.get` 空 body 得 null，正对上 resolver 的 falsy 分支
- GET `/api/dashboard/home/info`（:457-467）：三角色放行，SA 返回 null
- GET `/api/tenant/dashboard/home/info`（:472-487）：**TENANT_ADMIN only**；未配置恒 200 `{dashboardId:null, hideDashboardToolbar:true}`（默认值在 :477-478）——即任务口径里"GET 恒 200"的端点是**这个**，不是 `/home` 页消费的 `/api/dashboard/home`
- POST `/api/tenant/dashboard/home/info`（:492-516）：TENANT_ADMIN only；dashboardId 非空写入 tenant.additionalInfo（含 hideDashboardToolbar），**dashboardId 为 null 则删除两个 key**（:510-513），即"取消配置"合法

## 4. hideDashboardToolbar 如何作用于渲染

- 传递链：后端 `HomeDashboard.hideDashboardToolbar` → `home-links.component.html:19` `[hideToolbar]="homeDashboard.hideDashboardToolbar"` → `DashboardPageComponent` 的 `hideToolbar` setter/getter（`dashboard-page.component.ts:192-201`）
- getter 是 OR 逻辑：`(输入值 || dashboard 配置的 settings.hideToolbar) && !isEdit`，加 widget 编辑态强制隐藏（:199-201；配置项分支 `hideToolbarSetting()` :653-660）
- 效果（模板 `dashboard-page.component.html`）：
  - 整条 `tb-dashboard-toolbar` 加 `!hidden`（:38）；`toolbarOpened` getter 因此为 false（`dashboard-page.component.ts:330-333`）
  - 一起消失的：面包屑 + states 切换器（在 toolbar 内）、通知铃、全屏按钮（:132-137）、导出（:142-147）、编辑模式按钮（:148-155）、timewindow、filters、dashboard 下拉（embedded 本来就隐藏，:302-308）
  - **dashboard 标题不受 hideDashboardToolbar 控制**：`tb-dashboard-title` 在 toolbar 外（:332-343），由 `settings.showTitle` 决定（`displayTitle()`，`dashboard-page.component.ts:662-669`）
  - toolbar 隐藏时若 `!readonly` 会出现悬浮编辑 FAB（:396-428）；embedded 场景 readonly=true，见 §5
- `hideMainToolbar`（home-links 传入）另有独立用途：ngOnInit 里 true 时调 `homeService.setHideMainToolbar(true)`（`dashboard-page.component.ts:390-392`），进而隐藏**整个应用壳层的顶部工具栏**（面包屑/搜索/全屏/通知铃，`home.component.html:53-104`）；每次路由组件切换会被重置为 false（`home.service.ts:57-58`）。embedded=true 时 Powered-by 页脚也隐藏（`dashboard-page.component.html:429-433`）

## 5. 编辑入口与「设为 home」

- `/home` 页内**没有**编辑入口：embedded=true 使 `readonly=true`（`dashboard-page.component.ts:521-523`），而工具栏编辑按钮（html:148-155）与悬浮 FAB（html:396-428）都要求 `!readonly`；`canEdit()` 只认 TENANT_ADMIN（或 widget 编辑态下的 SYS_ADMIN，`dashboard-page.component.ts:878-880`）
- home dashboard 的编辑路径：TA 从 Dashboards 列表打开对应 dashboard 进入编辑器（`/dashboard/:dashboardId`，`dashboard-pages.routing.module.ts:56-71`，auth=[TENANT_ADMIN, CUSTOMER_USER]），编辑保存走通用 `saveDashboard` 链
- 「把当前 dashboard 设为 home」的唯一配置入口是 **`/settings/home`**（TENANT_ADMIN only，`admin-routing.module.ts:321-332`）：`tb-dashboard-autocomplete`（scope=tenant，selectFirstDashboard=false）+ "Hide home dashboard toolbar" checkbox（`home-settings.component.html:37-47`）；保存逻辑允许 dashboardId 为 null（即取消配置，`home-settings.component.ts:58-71`）。源码 grep 无任何"仪表盘页内一键设为 home"的按钮/调用点
- `/settings` 空路径对 TA 的重定向目标就是 `/settings/home`（`admin-routing.module.ts:237-247`）

## 6. `/home` 页除 dashboard 外的内容（quick links 回落页）

- `@if (homeDashboard)` 渲染 dashboard，`@else` 渲染 quick links 网格——**二选一，配了 home dashboard 就完全看不到 quick links**（`home-links.component.html:18-44`）
- quick links 数据源：`menuService.homeSections()`（`home-links.component.ts:39`；`menu.service.ts:115-117`），由登录用户的侧边菜单顶级节推导 `buildUserHome`（`menu.service.ts:60-75`；`menu.models.ts:1067-1070`）：`type:link` 的顶级节变成单卡单项、`type:toggle` 的分组节变成多格卡，**MenuId.home 自身被排除**（`menu.models.ts:1107-1121`）。内容随角色菜单自动变化（SA/TA/CU 菜单映射见 §1.3 锚点）
- 布局：响应式 2/3/4 列（`home-links.component.ts:41,63-72`），每卡内 `mat-grid-tile` + `mat-stroked-button` 大图标 + routerLink 跳转（html:21-43）
- M15 是否对齐：quick links 只是"未配置 home dashboard 时的回落页"，若 ui-antd 决定有 home dashboard 兜底（JSON 资产或空态页），可不在首版复刻 quick links——事实层面它是菜单的再渲染，无独立数据

## 7. dashboard state（states）取值

- home-links 渲染**不传 `currentState`**（html:19），`syncStateWithQueryParam` 用默认 true（`dashboard-page.component.ts:206-207`）
- embedded 时 `setStateDashboardId=false`（`dashboard-page.component.ts:492-494`）——states 组件拿 `dashboardId=''`，状态不入 dashboard 上下文（`dashboard-page.component.html:20-29`）
- 默认 state：`default-state-controller` 初始化取 `dashboardUtils.getRootStateId(states)`（`default-state-controller.component.ts:189-191`）；`getRootStateId` 返回 `root:true` 的 state，否则第一个 key（`dashboard-utils.service.ts:629-637`）。即 home dashboard 的入口 state = 其 `configuration.states` 中 root:true 的那个（常规 dashboard 命名 'main' 只是惯例，不是硬编码）
- stateControllerId 取自 `dashboard.configuration.settings.stateControllerId`（`dashboard-page.component.html:20-29`），缺省 'default'

## 8. 边界：未配置 home dashboard 时 /home 显示什么

- 后端 GET `/api/dashboard/home` 空 200（fork `DashboardController.java:424-450`；SA 恒空）→ resolver 回落 JSON 资产（§3.2）→ 三角色各自看到系统内置首页（embedded、hideDashboardToolbar=true、isSystemDashboard=true，应用壳层顶部工具栏也被隐藏，见 §4）
- 若回落 JSON 也加载失败（资源 404）：`loadJsonResource` 的 subject 会 error，resolver 链路 error → 路由解析失败（`resources.service.ts:127-140`），无更细的兜底 UI（源码未见 catch）
- TA「取消配置」（POST dashboardId=null）后 tenant.additionalInfo 移除 key（`DashboardController.java:510-513`）→ 下次进 /home 回到 JSON 内置首页

## 附：匿名公共仪表盘（publicId）链路事实（M15 相关）

- 公共 dashboard 路由就是 `/dashboard/:dashboardId`（`dashboard-pages.routing.module.ts:56-71`）；匿名访问靠 `?publicId=<publicCustomerId>` 查询参数 + 公共登录
- 链路：未登录带 publicId 访问 → AuthGuard 清 token 并 `reloadUser()`（`auth.guard.ts:81-85`）→ `loadUser` 检测 URL `publicId` 参数 → `publicLogin(publicId)` POST `/api/auth/login/public`（`auth.service.ts:139-144,315-331`）→ 得到 `isPublic` 的 CUSTOMER_USER → `defaultUrl` 跳 `dashboard/{lastPublicDashboardId}`（:301-303），且 isPublic 天然 forceFullscreen（`userForceFullscreen`，:638-644 → :296-297）
- `lastPublicDashboardId`：公共用户导航到 dashboard 路由时在 ActivationEnd 里记录（`settings.effects.ts:77-90`）；已登录公共用户 publicId 不匹配则强制 logout/reload（`auth.guard.ts:122-131`；`parsePublicId` `auth.service.ts:596-605`）
- `data.module === 'public'` 只用于 login 系列路由（`login-routing.module.ts:45-139`），dashboard 路由不带该标记；公共用户以 CUSTOMER_USER 身份通过 `/dashboard/:dashboardId` 的 auth 校验

## 遗留问题

1. fork 后端 `/api/auth/login/public` 与 public customer 的完整语义（PublicController/AuthController 权限、isPublic JWT 声明）本轮未查，需后端侦察确认匿名仪表盘链路在 fork 上可用。
2. 两个"home"端点语义易混：`/api/dashboard/home`（/home 页读，未配置=200 空 body，三角色）vs `/api/tenant/dashboard/home/info`（TA 配置页读写，未配置=200 `{dashboardId:null, hideDashboardToolbar:true}`，TENANT_ADMIN only）。M15 若让 ui-antd 复用 info 端点做落点判断，CU/SA 会 403；若复用 `/api/dashboard/home`，需处理"空 body"分支。归方案组裁决。
3. 回落 JSON（`*_home_page.json`）里的 widget 依赖（markdown 函数、mobile QR 占位、特定 filter id 'Active Devices'/'Inactive Devices'）在 ui-antd 新渲染器能否等价渲染未验证。
4. embedded home dashboard + `syncStateWithQueryParam=true` 时 state 是否会写进 `/home?state=...`（default-state-controller 对 dashboardId='' 的 URL 同步行为）未实测。
5. 静态 JSON 资产体积可观（SA 124KB / TA 66KB / CU 28KB），ui-antd 若照搬需确认打包与后端 gzip 语义（ngx 端是静态文件，不走 `/api/dashboard/home` 的 gzip 分支）。
6. M15「匿名公共仪表盘」目标形态（沿用 publicId 免登录链路，还是新增完全公开路由）未定，本稿只登记 ngx 现状。
7. ngx 无「当前 dashboard 一键设为 home」入口（grep 已确证仅 `/settings/home` 一处）；若 M15/PE 对齐需要该入口，属新功能设计，归方案组。
