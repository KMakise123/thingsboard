# M15 前端现状底稿（home 首页 + 匿名公共仪表盘 + usage 下钻评估）

> 由 ui-antd 侦察产出（2026-09-07）。只写事实与锚点，不做方案设计。锚点为 `file:line`，默认相对 `ui-antd/`，另注明者除外（`ui-ngx/` = 上游参照、`openapi` = `src/types/tb/openapi/index.ts`）。随 M15 收尾可归档或删除。

## 0. 结论速览

- **登录落点已就绪三处**：`roleDefaultPath`（SA→/tenants、其余→/devices）、登录成功消费 `?redirect=`、`/` 与 404 兜底走 `pages/home/entry.tsx` 角色分流。**home dashboard 概念尚未进入任何落点逻辑**——`roleDefaultPath` 是纯角色查表，不看 home settings。
- **M14 的 settings/home 页只管存**：`pages/settings/home/index.tsx:13` 注释明写「生效面 (login landing / /home rendering) is M15 scope — acceptance here is a successful save round-trip」——这就是该页 grep 命中 M15 的全部内容，不是代码，是留给 M15 的欠账。
- **服务层八成现成**：home info GET/POST、make-public/private、getDashboard 都在 `services/tb/dashboard.ts`；**缺 `POST /api/auth/login/public`（publicId 换 PUBLIC_USER JWT）**——openapi 快照里也没有这个端点定义（`openapi` 全文 grep `login/public` 零命中）。
- **只读运行时完整**：多 states、`?state=` 深链、timewindow、toolbar、全屏都是 M5/M7 已交付能力；公开页可直接复用 `DashboardPage`/`use-states-controller`，但现有 consumers（view/fullscreen/usage）全部带登录态假设。
- **WS 无法匿名连接**：manager 在 `ensureToken()` 返回 null 时直接 abandon（`core/ws/manager.ts:516-533`）。上游机制是 public login 拿到 PUBLIC_USER token 后照常走带 token 通道——注入点在 `components/layout/ws-manager.ts:30-36`。
- **usage 页是静态资产播放器**：fetch 前端内置 `api_usage.json` 渲染，**无任何 state 参数/下钻处理**；下钻落空的原因就在这。
- **列表页 make-public 链接已能生成并复制**（`/dashboard/{id}?publicId={publicCustomerId}`），但 toast 明示「链接仅供参考，匿名页面后续交付」。
- **测试缺口集中**：`pages/dashboards/view`、`pages/usage`、`pages/dashboard-fullscreen` 三个页面目录**零测试文件**；可照抄的范式在 entry.test、list/index.test、components/dashboard/*、e2e dashboards.spec。

## 1. 登录落点链

### 1.1 `/` 与 404 兜底：home/entry

- 路由挂法：`config/routes.ts:87`（`{ path: '/', component: './home/entry' }`，无 name、无 access，渲染在 app shell 内）；404 兜底 `config/routes.ts:713`（`{ path: '*', redirect: '/' }`）。
- 组件行为 `pages/home/entry.tsx:17-33`：currentUser 就位且 `tokenStore.isTokenValid('jwt')` 通过（token-first guard，`:29`）→ `history.replace(roleDefaultPath(user))`；否则渲染全屏 Spin 原地等待。
- OAuth2 回调消费 `pages/home/entry.tsx:38-63`：URL 带 `?accessToken=&refreshToken=` 时 `tokenStore.setTokens` + 剥 query + `getCurrentUser` → `setInitialState`；`oauth2Consumed` ref 保证只消费一次（`:37, :47`）。
- 后端 302 回 `/?accessToken=…&refreshToken=…` 的契约写在头注 `pages/home/entry.tsx:13-16`。

### 1.2 roleDefaultPath 现状

- `pages/user/utils.ts:54-56`：`user?.authority === Authority.SYS_ADMIN ? '/tenants' : '/devices'`——只认 SA/非 SA 两档，TA 与 CU 同落 `/devices`；**无 home-dashboard 分支、不读任何服务端设置**。
- 头注释 `pages/user/utils.ts:51-53` 明示这是 spec §3.2 的角色落地页语义。

### 1.3 登录成功后跳哪

- `pages/user/login/index.tsx:144-145`：登录成功 → `getSafeRedirectUrl(getQueryParam('redirect')) ?? roleDefaultPath(user)`。
- `getSafeRedirectUrl` 防开放重定向：仅同源相对路径且非裸 `/`（`pages/user/utils.ts:34-48`）。
- MFA 分叉：PRE_VERIFICATION → `/user/mfa`、MFA_CONFIGURATION → `/user/force-mfa`，`?redirect=` 透传（`pages/user/login/index.tsx:134-138`，转发器 `:36-39`）；密码过期 → `/user/reset-expired-password`（`:152`）。
- 已登录回流守卫：挂载时已有有效用户直接 `history.replace(roleDefaultPath(...))`（`:61-85`，mounted ref 防 `?redirect` 被 clobber）。
- OAuth2 authorize 出站跳转把 `?redirect` 转成上游 `?prevUri`（`pages/user/login/index.tsx:164-168`）。

### 1.4 layout 匿名拦截（onPageChange）

- `src/app.tsx:162-175`：ProLayout `onPageChange`——无 `initialState.currentUser` 且路径不在 `/user/` 前缀 → `history.replace('/user/login?redirect=<当前完整地址>')`。
- 影响面：`/` 路由（home/entry）在 app shell 内，匿名访问由这里兜住（entry.tsx:11 头注自述「Anonymous visitors are picked up by the layout runtime's onPageChange」）。
- 统一 401 退出 `src/app.tsx:57-66`（`handleUnauthorized`）：清 token + 重置 WS + 跳 `?redirect=`；HTTP 与 WS 两条通道都汇到这里（`:68-71` 组合根安装）。
- `getInitialState`（`src/app.tsx:117-126`）：无本地有效 token 时不发 `/api/auth/user`，`currentUser` 直接 null；MFA 过渡 token 不拉用户（`:122-124`）。
- **layout:false 的路由不触发 onPageChange**（不渲染 ProLayout）；现有先例 `/dashboard/:dashboardId`（fullscreen，`config/routes.ts:705-710`）与 `/user` 族（`:21-66`）都走这条通道，其访问控制只能靠路由自身处理。

### 1.5 access key 清单

`src/access.ts:20-27` 共 6 个：`canSysAdmin` / `canTenantAdmin` / `canCustomerUser` / `canSysAdminOrTenantAdmin` / `canTenantOrCustomer` / `canAuthenticated`。字典只由 `currentUser.authority` 推导（`:32-43`）——**没有 PUBLIC_USER 位，`isPublic` 不参与 access 计算**（token-store 的 claim 类型里倒是有 `isPublic?: boolean`，`src/core/auth/token-store.ts:21`）。

### 1.6 相关旁证

- `/settings` 组落地已是「角色分流组件」先例：SA→general、TA→home（`pages/settings/entry/index.tsx:15-25`；路由 `config/routes.ts:477-483`）。
- settings/home 页路由：`config/routes.ts:515-520`（menu id `menu.settings.home`，`access: 'canTenantAdmin'`）。

## 2. home settings（M14 已交付）

- 页面：`pages/settings/home/index.tsx`（154 行）。表单两个字段：`dashboardId`（dashboardId 文本 UUID，`DashboardSelect` 服务端搜索选中，**绝不自动选第一个候选**，`:5-7`）+ `hideDashboardToolbar`（Checkbox，默认 true，`:141-150`）。
- 服务函数：`getTenantHomeDashboardInfo` / `setTenantHomeDashboardInfo` / `getDashboardInfo`（预解析已选 dashboard 的 title 供 Select 显示，`:88-93`）。
- 保存链是标准 SettingsCard 范式：`useQuery(['settings','home-dashboard'])` 快照 → `setFieldsValue`（`:48-56`）→ `onValuesChange` 置 dirty → `useMutation` 组 `dashboardId: {entityType:'DASHBOARD', id} | null` 整包 POST（`:58-84`）→ 成功 toast + refetch，失败共用 `pages.settings.common.saveFailed`。
- 线上契约（`:10-14` + 服务层 JSDoc `services/tb/dashboard.ts:28-38`）：GET 永远 200，未配置读 `{dashboardId:null, hideDashboardToolbar:true}`；POST 200 空体；`dashboardId:null` 即清除（存 `Tenant.additionalInfo`）。
- **M15 字样出处**：`pages/settings/home/index.tsx:13` 的 wire-contract 注释——「The 生效面 (login landing / /home rendering) is M15 scope — acceptance here is a successful save round-trip」。即 M14 只验收保存往返，落地渲染整体划给 M15。
- `getTenantHomeDashboardInfo` 的 UI 消费方**全仓仅此一页**（`services/tb/dashboard.ts:41` 的定义 + `pages/settings/home/index.tsx:24,40`；全 src grep 无第三处）。

## 3. 服务层

### 3.1 `services/tb/dashboard.ts` 现有函数清单

| 函数 | 行号 | 端点 | M15 相关性 |
| --- | --- | --- | --- |
| `getTenantHomeDashboardInfo` | `:41-45` | GET `/api/tenant/dashboard/home/info` | home 落点读取 |
| `setTenantHomeDashboardInfo` | `:48-52` | POST 同路径（200 空体） | home 落点保存 |
| `getTenantDashboards` | `:55-62` | GET `/api/tenant/dashboards` | 列表/工具箱选择器 |
| `getDashboard` | `:65-67` | GET `/api/dashboard/{id}`（含 configuration） | home/公开页渲染主体 |
| `getDashboardInfo` | `:70-74` | GET `/api/dashboard/info/{id}` | settings/home 回显 title |
| `exportDashboard` | `:80-84` | GET 同 getDashboard + `includeResources=true` | toolbar 导出 |
| `saveDashboard` | `:87-89` | POST `/api/dashboard` | 导入 |
| `deleteDashboard` | `:92-94` | DELETE `/api/dashboard/{id}` | 列表行操作 |
| `updateDashboardCustomers` / `add…` / `remove…` | `:100-130` | POST `…/customers[/add|/remove]` | 分配客户 |
| `makeDashboardPublic` | `:133-139` | POST `/api/customer/public/dashboard/{id}` | make public |
| `makeDashboardPrivate` | `:142-148` | DELETE 同路径 | make private |
| `getSystemResourceDashboard` | `:155-161` | GET `/api/resource/dashboard/system/{path}` | gateways 页 |
| `findEntitiesByFilter` / `findAllEntitiesByFilter` | `:192-237` | POST `/api/entitiesQuery/find` | alias 解析（含 `apiUsageState` filter，`:189`） |

### 3.2 出口

`services/tb/index.ts:16` 挂了 `./dashboard`（16 个域之一，`:13-31`）；页面两种引用形态并存（挂载面 `@/services/tb`、直引 `@/services/tb/dashboard`，settings/home 用的是后者）。

### 3.3 公开链缺口

- **`POST /api/auth/login/public`（body `{publicId}` → `LoginResponse`）在 `services/tb/` 不存在**；openapi 快照同样没有（`openapi` grep `login/public|publicLogin` 零命中；`/api/auth/*` 族里亦无 public 字样）。
- 上游参照（ui-ngx，非本仓现状）：`ui-ngx/src/app/core/auth/auth.service.ts:139-144` `publicLogin(publicId)` → `POST /api/auth/login/public`；`ui-ngx/src/app/shared/models/login.models.ts:25` 请求类型带 `publicId` 字段。
- customer 侧分配端点在 `services/tb/customer.ts:60-86`（`getCustomerDashboards` / assign / unassign），不在 dashboard.ts。

## 4. dashboard 只读运行时（M5/M7 交付）

### 4.1 view 页（`pages/dashboards/view/index.tsx`，65 行薄壳）

- `useDashboard(dashboardId)` 拉 `GET /api/dashboard/{id}` + `validateAndUpdateDashboard` 归一（`components/dashboard/use-dashboard.ts:12-25`）→ `DashboardPage`（`:56-62`）。
- TA 打开**空 dashboard 自动跳编辑器**（`:29-37`，widgets 为空 → `history.replace('/dashboards/{id}/editor')`）——公开页若复用要注意这条副作用目前写死在 view 页而不是 DashboardPage。
- 支持 `?reload=` 强制 alias 重解析（`:22-23` → DashboardPage `reloadKey`）。
- toolbar 全量：state 面包屑/状态跳转 Select、timewindow、dashboards-select（TA only）、export、全屏进出、编辑入口、update-image、折叠（`components/dashboard/DashboardToolbar.tsx:1-25` 能力清单；全屏切换实现 `:247-273`，`/dashboard/{id}` ↔ `/dashboards/{id}` 互跳）。

### 4.2 states（多状态）支持

- `DashboardPage.tsx:60-65`：按 `settings.stateControllerId` 选 `default`（单层替换）或 `entity`（压栈+面包屑）两种 controller mode。
- **`?state=` 是唯一事实源**：读 `use-states-controller.ts:51-53`，写 `:55-65`（`history.replaceState` merge 回 URL），`popstate` 监听 `:114-120`——深链与刷新可恢复（头注 `:4-8` 明示）。
- codec 与 ui-ngx byte-exact：`core/dashboard/states.ts:36-54`（`objToBase64`/`base64ToObj`）；解析规则 invalid id→root、root+空参丢 URL 参数（`:1-12` 语义表）。
- entity 模式补名：新压栈的 params 缺 `entityName/entityLabel` 时用 `findEntitiesByFilter` singleEntity 查询 best-effort 补齐（`use-states-controller.ts:72-102`）。
- API：`openState`（default 替换 / entity 追加，`:136-153`）、`navigatePrev`（面包屑截断，`:155-166`）、`resetState`（`:168-170`）。

### 4.3 其余运行时面

- timewindow：dashboard 级初始值 adopt + 全局 picker（`DashboardPage.tsx:67-75`、`DashboardToolbar.tsx:204-206`）。
- 双布局：main+right 桌面并排、移动端 toolbar 切换（`DashboardPage.tsx:164-197`）。
- 全屏页 `pages/dashboard-fullscreen/index.tsx`：与 view 的差异 = `layout:false`（`config/routes.ts:705-710`）+ `singlePageMode`（fullscreen 按钮 变 exit，`DashboardToolbar.tsx:66-67,250-253`）+ 无 PageContainer 壳/无面包屑/无空板自动进编辑器。
- alias 解析触发点：dashboard 载入、`?reload`、每次 state 实体切换（`DashboardPage.tsx:83-108`）。

### 4.4 编辑器对 states 的编辑支持（M7）

- ManageStatesDialog：state 列表增删改，id 自动从 name 生成、重名/重 id 拒绝、root 互斥归一、root 不可删（`pages/dashboards/editor/dialogs/manage-states.tsx:1-20`）；shell 工具栏 States 按钮打开（`pages/dashboards/editor/shell.tsx:734-740`，`data-testid="editor-toolbar-states"`）。
- 布局（layouts）编辑另有 manage-layouts / BreakpointSwitcher（`editor/dialogs/manage-layouts.tsx`、`editor/canvas/BreakpointSwitcher.tsx`）。

### 4.5 widget 注册表四态解析链

- 链路：builtin 命中（`WIDGET_REGISTRY` 8 个 fqn，`components/widgets/registry.ts:43-76`）→ 未命中走 `GET /api/widgetType?fqn=` probe（`WidgetContainer.tsx:75-82`；transport `services/tb/widget-type.ts:45-47`）→ 四种结局：`custom`（react-1 编译成功）/`custom-broken`（编译失败可读错误）/`unsupported-angular`（descriptor 无 runtime）/`missing`（404 或 fetch 失败）——`registry.ts:79-95` 类型 + `:108-142` 解析 + `WidgetContainer.tsx:106-158` 渲染分支。
- 对 home dashboard 的含义：**非 react-1 的 widget 一律落占位卡**（`components/widgets/placeholders.tsx`），`system.api_usage` 等 fork 未实现的 fqn 同样占位（usage 页头注自认 registered omission，`pages/usage/index.tsx:5-6`）。e2e 用 `data-widget-placeholder` / 文案断言兜底（`e2e/specs/smoke/dashboards.spec.ts:24-33`）。

## 5. usage 页现状

- `pages/usage/index.tsx`（77 行）：`fetch('/static/dashboard/api_usage.json')`（前端内置资产，`public/static/dashboard/api_usage.json`，ui-ngx 原样拷贝）→ `validateAndUpdateDashboard` → `DashboardView`（embedded 只读，无导出/全屏/选择器 chrome，`components/dashboard/DashboardView.tsx:1-30`）。
- 内容规模：11 states、31 widget 条目；`system.api_usage` fqn 走 ADR 0003 占位（`:3-6` 头注）。
- **无 state 参数处理**：全文只有 asset fetch + 渲染，没有 `?state=` 读写、没有 states-controller 独立消费（states 由 DashboardPage 内部的 controller 兜着）；「下钻」在当前 usage 页不可用——api_usage 的 states 虽在 JSON 里，但没有入口导航到它们（toolbar 面包屑/状态跳转受 dashboard `settings` 控制且 embedded 不提供 dashboards-select）。
- 路由 `config/routes.ts:195-201`：菜单 `usage`，`access: 'canTenantAdmin'`（CU 无此页）。
- 与真数据的差距：资产是静态文件，与登录租户的实际 API 用量无关（无 `/api/tenant/…` 拉取）。

## 6. dashboards 列表页公开相关

- **生成公开链接**：`publicDashboardLink` = `{protocol}//{hostname}{:port}/dashboard/{dashboardId}?publicId={publicCustomerId}`（`pages/dashboards/list/index.tsx:93-103`；ui-ngx 同款 `ui-ngx/src/app/core/http/dashboard.service.ts:162`）。
- **make public**：确认弹窗（后果说明文案 `:336-360`）→ `makeDashboardPublic` mutation → 成功后 `modal.info` 展示链接，`Typography.Text copyable` **自带复制按钮**（`:181-217`，复制件在 `:202`）；toast 附提示「The anonymous public page ships later; the link is generated for reference only.」（`:203-209`）——匿名页面未交付是已登记欠账。
- **make private**：`makeDashboardPrivate` mutation + 确认（`:219-233`）。
- **行操作互斥**：more 菜单里按 `isPublicDashboard` 二选一显示 make-public/make-private（`:498-514`；判定 = 任一 assignedCustomer 带 `public` 标，`:88-91`）；Public 列只读 Checkbox（`:463-475`）。
- **publicCustomers 管理**：Manage assigned customers 打开 `ManageDashboardCustomersDialog`（`:515-529`）；该对话框把系统 public customer 从 picker 排除，防止批量更新静默剥掉公开链接（`pages/dashboards/list/index.tsx` 同目录 `ManageDashboardCustomersDialog.tsx:72-78`）。
- CU 侧只读面无这些操作（同文件 readOnly 分支 + `index.test.tsx:543` 附近断言）。

## 7. WS 订阅管理器对匿名会话的约束

- **无 token 即不能连**：`createWsManager` 先 `ensureToken()`（`core/ws/manager.ts:516`），返回 null → `abandon('no-token')`（`:520-522`），所有订阅置 `auth-error` 并发 unauthorized 事件。AUTH 是首帧带内 `{authCmd:{token}}`（`:418-419, :539`），**没有 URL query token 或匿名分支**。
- token 注入点（组合根）：`components/layout/ws-manager.ts:26-39`——`ensureToken` = `tokenStore.isTokenValid('jwt')` 直取，否则走共享单飞 refresher `createTokenRefresher()`；`installAppWsManager` / `resetWsManager` 是安装/登出重装口（`:42-52`；`app.tsx:71` 启动安装）。
- 推论：匿名公开页要渲染 WS 数据，**必须先让 tokenStore 里有 PUBLIC_USER token**（上游即 `POST /api/auth/login/public` 的产物，见 §3.3），之后 WS/HTTP 全链无需改动；`tokenStore.setTokens` 已支持（`core/auth/token-store.ts:121-142`，ui-ngx 同名 localStorage key `:31-37`）。
- 失败路径要小心：公开页上任何带失效 token 的请求 401 → 刷新失败 → `handleUnauthorized` 清 token 跳 `/user/login?redirect=`（`app.tsx:57-66`）——公开页若复用 `tbHttp` 需注意 `authExempt` 开关存在（跳过 bearer 注入与 401 处理，`core/http/client.ts:62-69`，login/token 族在用）。

## 8. 测试基建（M15 波次可照抄的范式）

已有：

- `pages/home/entry.test.tsx`——entry 组件单测范式：mock `@umijs/max` history/useModel、tokenStore 会话语义模拟（`:14-26`）、`setInitialState` 用真 updater（`:46-51`）；覆盖 oauth2 消费与角色落地。
- `pages/settings/home/index.test.tsx`——M14 保存往返测试（SettingsCard 范式页的配对测试样例）。
- `pages/dashboards/list/index.test.tsx`——含 make-public 链接生成断言（`/dashboard/dash-2?publicId=pub-cust`，`:263-293`）与 public 列、CU 只读面（`:214-226, :543`）。
- `components/dashboard/`：`DashboardPage.test.tsx`、`use-states-controller.test.tsx`、`DashboardToolbar.image.test.tsx`、`timewindow/TimewindowPicker.test.tsx`、`grid/grid-layout.test.tsx` 等——运行时行为的单测家底。
- e2e：`e2e/specs/smoke/dashboards.spec.ts`——TA/CU 双角色走查 + widget 占位兜底断言范式（`:24-33`）。

**缺口（零测试文件）**：`pages/dashboards/view/`、`pages/usage/`、`pages/dashboard-fullscreen/` 三个目录只有页面本体无任何 `*.test.*`；`pages/dashboard-fullscreen` 同样裸奔。

## 9. 缺口清单（M15 要补的能力，按问题编号归位）

1. **登录落点链**
   - `roleDefaultPath` 无 home-dashboard 分支（TA 落 `/devices` 硬编码，`pages/user/utils.ts:54-56`）；登录成功/entry/`?redirect` 三条链都不感知 home settings。
   - home dashboard 的「渲染页」不存在：无 `/home` 路由，`/` 仍指向 entry 的角色跳板（`config/routes.ts:87`）。
   - access 体系无 PUBLIC_USER 位（`src/access.ts:20-43`）；`/dashboard/:dashboardId` 有 `canTenantOrCustomer` access 门（`config/routes.ts:707`），匿名不可达。
2. **home settings**：无缺口（M14 已交付，M15 只补生效面；`pages/settings/home/index.tsx:13` 的欠账注释即验收边界）。
3. **服务层**
   - 缺 `publicLogin`：`POST /api/auth/login/public`（服务函数 + openapi 快照均无，见 §3.3）。
   - 其余（home info、getDashboard、make-public/private、getDashboardInfo）齐全。
4. **dashboard 只读运行时**：能力面基本无缺口；要处理的是 view 页内嵌的「空板自动进编辑器」副作用（`pages/dashboards/view/index.tsx:29-37`）对公开/home 场景不适用，以及运行时 consumers 均带登录假设（§4.1、§7 失败路径）。
5. **usage 下钻**：usage 页无 state 处理、无 states 导航入口、数据为静态资产非登录租户实况（`pages/usage/index.tsx` 全文）——「下钻」是否做、做成什么样是 M15 决策点。
6. **列表页公开相关**：能力齐全（链接生成+复制+make-private+public customer 保护）；缺的只是链接落地页（toast 明示匿名页面未交付，`list/index.tsx:203-209`）。
7. **WS 匿名会话**：manager 无匿名分支（`core/ws/manager.ts:516-533`）；按上游形态，缺口收敛为「public login → tokenStore」这一步（§7），公开页拉 dashboard JSON 的 HTTP 调用需走 `authExempt` 或带 public token（`core/http/client.ts:68`）。
8. **测试基建**：view / usage / dashboard-fullscreen 三个页面零测试；公开链路（publicId 换 token、匿名渲染、`?state=` 深链）无任何现成测试可依赖，需按 §8 所列范式新写。
