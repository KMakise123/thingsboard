# M15 专家小队裁决 · 前端架构与复用（m15-panel-arch）

> 镜头：前端架构与复用。裁决人：panel-arch（2026-09-07）。
> 输入：`docs/agents/m15-antd-current-state.md`、`m15-ngx-inventory-home.md`、`m15-ngx-inventory-public-dashboard.md`、`m15-backend-contract.md`、`docs/agents/m14-panel-arch.md` §0+R01/R28/R32-R34/R37（体例与 R 编号沿用，M15 接 R38）、`docs/spec/v2-subsystems-acceptance.md` §1、`ui-antd/CLAUDE.md`、`ui-antd/config/routes.ts`、`ui-antd/src/access.ts`。
> 准则（fork 铁律）：等价为底线、允许增量增强、禁止删减 TB 已有操作；照 ngx 口径；走 ui-antd 既有范式；不为未发生的需求提前抽象；范围外一律「登记不实施」。
> 所有 ui-antd 锚点均本镜头逐一复核过源码（routes.ts / access.ts / app.tsx / entry / login / user-utils / dashboard.ts / auth.ts / token-store / ws-manager / core/ws manager / DashboardPage / DashboardToolbar / use-dashboard / use-states-controller / registry / view / fullscreen / usage / list / settings-home / http client / locale 目录 / services 出口）；对侦察底稿的失实处见 §2（含「usage 右列 3 图」勘误）。ui-ngx 与后端锚点引自四份侦察底稿，fork api_usage 资产与 ngx 逐字段对账为本镜头亲验（node 脚本）。

## 0. 裁决总表

| 编号 | 议题 | 一句话决议 |
|---|---|---|
| R38 | home 页路由/组件形态 | 新增 `/home`（三角色，菜单首位）；新薄壳 `pages/home/page` 调 DashboardPage 运行时，不搬 view 页 |
| R39 | 登录落点改造 | roleDefaultPath 改三级：defaultDashboardId → `/dashboard/{id}`（fullscreen 可选）→ 统一 `/home`；entry/login/mfa/impersonation 五消费点自动随动，404 兜底零改动 |
| R40 | 未配置兜底形态 | **不移植 ngx JSON**（fqn 全命中但全 Angular → 占位墙）；antd 原生 quick-links 兜底组件（从 routes 树 + access 推导导航卡），信息等价于 ngx 未配置回落语义 |
| R41 | 服务层/类型层增量 | dashboard.ts 补 `getHomeDashboard`（GET /api/dashboard/home，空 body→undefined）；auth.ts 增 `publicLogin`（唯一合规落位）；HomeDashboard 类型 inline 服务文件 |
| R42 | 公开仪表盘路由/gate | `/dashboard/:dashboardId` 去 access 字段改页面自治 gate（publicId→publicLogin→tokenStore→复渲染）；同路由承载登录/公开双态（ngx 同构），不新建公开路由 |
| R43 | 公开会话渲染面 | DashboardPage 增 `hideToolbar` 外部 prop（OR 语义）；公开会话以 embedded chrome 渲染（readonly+藏 fullscreen/export/select 天然等价 forceFullscreen）；logo 不建（既有全域缺口，不为公开页单开倒挂） |
| R44 | access 体系 | 不加新 key；公开路由整体脱离 access 体系（字典由 currentUser 推导而公开会话恒 null）；getInitialState 增 isPublic 跳过 fetchUserInfo 分支（isMfaInterim 先例） |
| R45 | WS 公开会话 | 零改动确认：public JWT 进 tokenStore 后 ensureToken/AUTH 首帧/refresh 续期链全自动（后端 permitAll + RefreshToken 支持 publicId） |
| R46 | usage 对账 | 「右列 3 图」失实勘误：fork 资产与 ngx 同构（31/31、default.right 同 4 fqn、全 builtin 真渲染）；真正缺口是下钻导航，登记不实施（归 usage 专项） |
| R47 | locale | `menu.home` 双语 + 新建 `en-US/zh-CN/home.ts`（pages.home.*）；公开页文案进既有 dashboards 域 |
| R48 | 测试落位 | 只测 M15 触碰面：home 薄壳/兜底/落点纯函数 + 公开 gate 纯函数/组件 + 服务层 endpoints；view/usage 零改动不补测（既有缺口照旧登记） |
| R49 | e2e/自动化边界 | 登录态公开链接可达可进 e2e（低依赖）；全匿名真链路留人工走查（真实公开 dashboard 生命周期）；spec §7 为人工验收载体 |
| R50 | waves 切分 | 四波：地基（服务层+prop+app.tsx）→ home 页+落点 → 公开链路 → 收口；波 2/3 在波 1 后可并行 |

## 1. 裁决明细

### A. home 首页

**R38 home 页路由与组件形态**

【决议】(1) 新路由 `{ name: 'home', icon: 'home', path: '/home', access: 'canAuthenticated', component: './home/page' }`，插在 `/`（entry）与 devices 之间——菜单自动生成 `menu.home` 且居首位（对齐 ngx MenuId.home 三角色菜单首项，`menu.models.ts:848/919/1030`）。access 用既有 `canAuthenticated`（三角色全放行，等价 ngx `auth:[SYS_ADMIN, TENANT_ADMIN, CUSTOMER_USER]`）。(2) 组件形态 = **新薄壳 `pages/home/page`**，不复用 `pages/dashboards/view`：view 页带 PageContainer/返回键/「TA 空板自动跳编辑器」副作用（`pages/dashboards/view/index.tsx:29-37` 亲验，写在 view 组件内而非 DashboardPage），三条对 home 页全部是负资产。薄壳只做：`useQuery` 调 `getHomeDashboard()`（R41）→ 命中 → `validateAndUpdateDashboard` + `<DashboardPage dashboard hideToolbar={resp.hideDashboardToolbar} embedded />`；空/未配置 → R40 兜底组件；错误 → Alert。（3) states：ngx home 渲染不传 currentState、`syncStateWithQueryParam` 默认 true（ngx inventory §7）——antd 侧 `?state=` 由 use-states-controller 自动读写（`use-states-controller.ts:51-65` 亲验），零额外处理，深链免费获得。（4) ngx 的 hideMainToolbar（隐藏壳顶栏，JSON 首页场景）不实施——antd 无该机制，home 页保持壳内正常渲染，登记形态差异（§4）。
【依据】ngx `/home` 三角色同组件（`home-links.component.ts:43-54`）；antd 运行时面亲验（DashboardPage props `{dashboard, embedded, singlePageMode, isTenantAdmin, reloadKey}`，无 hideToolbar/forceFullscreen）；fullscreen 页薄壳形态先例（`pages/dashboard-fullscreen/index.tsx` 61 行）；settings/entry 角色分流组件先例（`pages/settings/entry/index.tsx`）。
【分歧】无。「复用运行时组件、页面薄壳自建」与 M5 起的分层一致：DashboardPage 是渲染器，路由壳是页面私事。

**R39 登录落点改造（roleDefaultPath 三级化）**

【决议】`pages/user/utils.ts:54-56` 的 roleDefaultPath 改为三级决策（纯函数，单测钉死）：
1. TA/CU 且 `user.additionalInfo.defaultDashboardId` 非空 → `/dashboard/{id}`；`additionalInfo.defaultDashboardFullscreen === true` 时仍是该路径（无壳页即全屏语义，antd 不需要 ngx 的两形态 URL——`/dashboards/{id}` 有壳页对 default dashboard 无入口菜单，收敛单形态，登记一句）。等价 ngx defaultUrl `:293-300` 的 TA/CU 分支；SA 无此分支（对齐）。
2. 其余（含 SA、未配置 defaultDashboardId 的 TA/CU）→ **统一 `/home`**（等价 ngx defaultUrl 兜底 `:291`）。
3. `?redirect=` 安全回跳优先级不变（login/entry 两链已有，`getSafeRedirectUrl` 不动）。
消费点五处全部自动随动（本镜头逐一 grep 复核）：login 成功（`login/index.tsx:145`）、login 回流守卫（`:85`）、mfa 成功（`mfa/index.tsx:190`）、entry 挂载（`entry.tsx:32`）、SA 模拟登录落点（`tenants/users/index.tsx:65`——impersonation 的用户自动落该用户的 home/default dashboard，语义正确）。404 兜底 `{ path: '*', redirect: '/' }`（`routes.ts:713`）零改动：`/`→entry→roleDefaultPath→/home，语义随动且无循环。**行为变化登记**：SA 登录落点由 `/tenants` 变 `/home`（spec §3.2 既有语义变更，§3 上交，默认执行）；`/tenants` 菜单保持可达，零功能删减。
【依据】ngx defaultUrl 全逻辑（scout-ngx-home §1.2，SA 无 defaultDashboard 分支亲验）；User.additionalInfo 含 `defaultDashboardId`/`defaultDashboardFullscreen`（openapi `:14022-14026` 亲验；antd `User.additionalInfo?: Record<string, unknown>` 弱类型，utils 内做窄化读取纯函数）；后端 GET /api/auth/user 对 additionalInfo 键做清洗（backend §1.2，悬挂 id 已被服务端摘除，前端读到即有效）。
【分歧】无。拒绝的替代方案：保持 fork 现状「SA→/tenants、TA/CU→/devices」+ home 仅菜单可达——被否，因为 M14 settings/home 页的欠账注释（`pages/settings/home/index.tsx:13` 亲验）明写生效面含 login landing，落点不接 home dashboard 则 M15 验收面塌一半；且统一 `/home` 正是 ngx 的真实结构，不是新发明。

**R40 未配置兜底形态（推翻「移植 JSON」直觉）**

【决议】**不移植 `assets/dashboard/*_home_page.json`**。未配置（GET /api/dashboard/home 空 body，含 SA 恒空）时渲染 **antd 原生 quick-links 兜底组件**：`pages/home/components/quick-links.tsx`——导航卡网格（每卡 icon + 标题 + 跳转），数据源从 routes 树推导：取顶层可显示项（跳过 entry/redirect/组节点取首子）+ `access.ts` 字典过滤 + icon 字符串映射 antd 图标，MenuId.home 自身排除（等价 ngx `buildUserHome` 从菜单推导、排除 home 自身，`menu.models.ts:1107-1121`）。推导不可行时降级为三角色静态清单常量（实现在波内定型，两案都在波次文件清单内）。布局 antd Card/Row 响应式网格，等价 ngx HomeLinksComponent 的 2/3/4 列（`home-links.component.html:21-43` 语义）。
移植否决的理由（本镜头逐字段实测，非引用侦察）：三个 JSON 的 widget fqn 清单——SA 24 卡（`system.cards.markdown_card`×19、`home_page_widgets.documentation_links`/`getting_started`/`mobile_app_qr_code` 各 1、`time_series_chart`×2）、TA 13 卡（markdown×4 + home_page_widgets 五种各 1 + time_series×2 + `home_page_widgets.iot_hub`）、CU 5 卡（markdown×2 + 三种 home_page_widgets）——**全部 fqn 在后端 system/widget_types 存在**（`markdown_html_card.json` 内 `fqn=cards.markdown_card`、`quick_links.json` 内 `fqn=home_page_widgets.quick_links` 等逐一亲验），即 antd 四态解析链 probe 全命中，但 descriptor 全是 Angular 模板（templateHtml `<tb-…>`，无 react-1 runtime）→ **22/24、11/13、5/5 渲染为 unsupported-angular 占位卡**（`registry.ts:79-95` 四态亲验），仅 SA/TA 各 2 张 time_series_chart 真渲染。这些 Angular 卡内容本质是静态链接/文档/快速入口——占位墙的信息量趋零，而移植还要背 ~200KB 资产 ×3 + `applySystemParametersToHomeDashboard` 的 filter 注入等价件。quick-links 网格正是同一信息（平台导航入口集合）的等价原生呈现——ngx 自己在组件层的未配置回落（HomeLinksComponent）就是这个形态，JSON 首页里的 quick_links/documentation_links 卡与之内容重叠。「最简空态」也被否：ngx 未配置时用户看到的不是空态而是导航起点，空态损等价底线。
【依据】ngx resolver JSON 回落链（scout-ngx-home §3.2/§8）；antd 占位三态（`placeholders.tsx` + e2e `dashboards.spec.ts:24-33` 断言范式）；fork JSON vs ngx home JSON 逐字段对账（本镜头 node 实测，§2-4）。
【分歧】无。登记：JSON 移植列为能力级差异知情项——验收者若坚持「像素级对齐 ngx 默认首页」，需先交付 Angular 卡渲染器（归 widget 域专项），届时 home 页只需把兜底组件换成资产渲染，接口不变。

### B. 匿名公共仪表盘

**R42 公开路由与 gate（同路由双态）**

【决议】(1) `/dashboard/:dashboardId`（`routes.ts:705-710`，layout:false）**删除 `access: 'canTenantOrCustomer'`**，门禁改为页面自治（理由见 R44）：现有 `pages/dashboard-fullscreen/index.tsx` 改造为双态入口，**不新建公开路由/公开页目录**——URL 契约 `/dashboard/{id}?publicId={publicCustomerId}` 已被列表页链接生成钉死（`list/index.tsx:93-103` 亲验），且 ngx 就是同路由同组件双态（`dashboard-pages.routing.module.ts:54-71`）。(2) gate 逻辑抽 `pages/dashboard-fullscreen/public-gate.ts` 纯函数 + 组件内 `usePublicSession` 化消费，四态决策表：
- 无有效 token 且 URL 带 `publicId` → `publicLogin(publicId)`（auth.ts，R41）→ setTokens → 渲染。
- 无有效 token 且无 `publicId` → `history.replace('/user/login?redirect=' + encodeURIComponent(当前完整地址))`（等价现 access 拦截的去向，匿名不能白看）。
- 有效 token 且 claims.isPublic=true 且 `sub === publicId` → 直接渲染（F5 刷新场景免重登）。
- 有效 token 且非公开 claims（登录用户带 publicId 打开）→ **忽略 publicId 以本人身份渲染**（dashboard 可见性交后端 CU/TA 检查器：可见则看、不可见 403 Alert——等价 ngx「守卫只对 public 用户做 publicId 一致性检查」的行为面）；claims.isPublic=true 但 `sub !== publicId`（公开会话换开别的链接）→ 重新 publicLogin 换发（等价 ngx logout+reload 语义，`auth.guard.ts:122-131`）。
(3) 失效重定向形态：publicLogin 401（public entity not found）→ 抹 `publicId` 参数 + 跳 `/user/login?redirect=`（等价 ngx `auth.service.ts:327-331` 抹参数 + 跳 login）；公开会话中途过期 → refresh 链自动续（R45），仅 refresh 也失败时走既有 `handleUnauthorized` → login?redirect=——此时链接已死，跳 login 即正确终点，不另建公开版 unauthorized 出口（登记收敛）。(4) make-private 后的访客：publicLogin 仍成功（public customer 还在）但 getDashboard 403 → 现有错误 Alert 面（`serverErrorText`），不做专属「链接已失效」页（ngx 同样无，只 toast——登记形态差异）。
【依据】后端两步链（backend §3.2：POST /api/auth/login/public → GET /api/dashboard/{id} 按 CU 检查器放行）；fork 无 PUBLIC authority（backend §3.3 亲验 Authority 枚举）；gate 各分支 ngx 锚点（scout-ngx-public §2/§3/§5）；view 页无 gate 责任（gate 只在无壳路由，view 是壳内登录面）。
【分歧】无。「登录用户带 publicId」按「忽略参数以本人渲染」裁决——ngx 的 forceDefaultPlace 弹回行为依赖其 global state（lastPublicDashboardId），antd 无此 state 也不需要：效果面（用户最终看到 dashboard）等价。

**R43 公开会话渲染面（forceFullscreen/logo 的 antd 等价）**

【决议】(1) DashboardPage 增 `hideToolbar?: boolean` prop：渲染条件从 `settings.hideToolbar ? null : …`（`DashboardPage.tsx:219` 亲验）改为 `settings.hideToolbar || hideToolbar`——OR 语义逐字对齐 ngx getter（`(输入值 || settings.hideToolbar) && !isEdit`，`dashboard-page.component.ts:199-201`；antd 页恒只读无 isEdit 分支）。home 页传 `HomeDashboard.hideDashboardToolbar`，公开页传 false（公开页 toolbar 由 dashboard 自身 settings 控，等价 ngx `hideToolbarSetting` 在 isPublic 时放行 dashboard 设置的口径）。(2) **forceFullscreen 不建新 prop**：antd 无壳路由（layout:false）天然全屏 + 无菜单 = ngx forceFullscreen 的「锁死」效果面；公开会话以 `embedded` 渲染——embedded 已藏 fullscreen/export/dashboards-select 三件（`DashboardToolbar.tsx:236-246` 与能力清单 `:66-68` 亲验），藏掉 fullscreen 按钮正好消灭「公开用户点 exit 跳有壳页被拦」的断头链（`DashboardToolbar.tsx:264-268` 的 `history.push('/dashboards/{id}')` 亲验）。timewindow 保持可见（公开页可看可调，ngx 同）。readonly：公开会话 currentUser=null → isTenantAdmin 恒 false，编辑入口天然不出现（view 页式 TA 判定不在此页）。(3) **logo 不建**：antd DashboardPage 从未渲染 dashboard logo（v1 全域无此能力，fullscreen 页同样没有）——若单独为公开页加 logo 会出现「公开页有 logo、登录全屏页没有」的倒挂；登记为既有能力缺口（§4），触发条件：dashboard 域交付 logo 面时公开页随 R43 的 forceFullscreen 条件自动接线。
【依据】ngx 公开页四件 UI 差异（scout-ngx-public §4：readonly/toolbar 可隐藏/logo 强制/无用户菜单）逐条对 antd 面盘点；antd embedded 语义亲验（usage/gateways 先例）；DashboardToolbar embedded 分支亲验。
【分歧】无。公开会话用户菜单/通知铃不存在于 antd 无壳路由（壳组件只在 layout 内挂载），ngx 的 `!isPublicUser()` 包裹在 antd 结构性成立，零代码。

**R44 access 体系与 getInitialState（预判复核成立）**

【决议】(1) **不加新 access key**——任务预判成立且理由加固：access 字典仅由 `initialState.currentUser.authority` 推导（`access.ts:32-43` 亲验），而公开会话**没有 currentUser**（public JWT 无真实 User 实体，GET /api/auth/user 必败 → fetchUserInfo catch 返 null，`app.tsx:107-113` 亲验）——加 key 也算不出 true。公开路由唯一出路是脱离 access 体系（R42 去 access 字段），「fork 无 PUBLIC authority」只是次要理由。语义代价登记：原 access 拦截给登录用户的「前端 403 页」变为后端 403 → 错误 Alert（SA 打开 /dashboard/{id} 的观感变化，等价信息）。(2) `getInitialState` 增 isPublic 分支：`decodeTokenClaims()?.isPublic === true` 时跳过 `fetchUserInfo`（currentUser 留 null）——照 isMfaInterim 先例（`app.tsx:119-124` 亲验），省一次注定失败的 /api/auth/user。onPageChange 不受影响（layout:false 路由不触发，`app.tsx:162-175` 只在壳内生效）。(3) `TokenClaims.isPublic` 已预留（`token-store.ts:21` 亲验）、`User.isPublic` 已预留（`types/tb/user.ts:53` 亲验）——零类型层新增。
【依据】本镜头 app.tsx/access.ts/token-store.ts 全文亲验；backend §3.3（公开用户= CUSTOMER_USER + PUBLIC_ID principal，凭空构造无 User 实体）；ngx isPublic 分支不拉 userDetails（`auth.service.ts:392-417`）。
【分歧】无。

**R45 WS 公开会话（零改动确认）**

【决议】公开 token 进 tokenStore 后既有链路全自动，**core/ws 零改动**：`ensureToken` 直取本地有效 JWT（`components/layout/ws-manager.ts:30-36` 亲验）→ manager 有 token 即连（`core/ws/manager.ts:516` 亲验，abandon('no-token') 只在 tokenStore 空时触发）→ AUTH 首帧带内 token（`:418-419`）→ 后端 `/api/ws/**` permitAll + 首条消息 JwtAuthenticationProvider 能解 public JWT 的 isPublic claim（backend §6）；token 过期 → 共享 refresher POST /api/auth/token → 后端 RefreshTokenAuthenticationProvider 支持 publicId 续期（backend §3.2）→ 续期成功无感，失败才走 handleUnauthorized。唯一相关改动已归 R44（getInitialState），与 WS 无关。订阅可见性（public customer 需被分配设备才有遥测数据）是后端权限语义，前端零处理，spec 走查项注明。
【依据】backend §3.4/§6 亲锚点；antd 注入点三文件（ws-manager.ts / manager.ts / token-store.ts）全文亲验；scout-antd §7 推论复核成立。
【分歧】无。

### C. 服务层 · usage · 横切

**R41 服务层与类型层增量**

【决议】(1) `services/tb/dashboard.ts` 增 `getHomeDashboard(): Promise<HomeDashboard | undefined>`——GET `/api/dashboard/home`，**home 页实际消费的运行时读形，现缺，必须补**（dashboard.ts:41-148 现有函数清单复核：GET/POST `/api/tenant/dashboard/home/info`、getDashboard、make-public/private 都在，唯独无 /dashboard/home）。空 body 分支：tbHttp parseBody 对空文本返 undefined（`core/http/client.ts:331-334` 亲验）→ 未配置天然 resolve undefined，函数 JSDoc 钉「SA 恒 undefined、CU 按 user→customer→tenant 回退、三角色放行」。返回类型 `HomeDashboard`（= Dashboard + `hideDashboardToolbar: boolean`）inline 在 dashboard.ts——照同文件 TenantHomeDashboardInfo 先例与 M14 R10「VC 类型留服务文件」口径，**不建 types/tb/dashboard.ts**（openapi 快照无此端点，手写类型 + JSDoc 钉源）。(2) `services/tb/auth.ts` 增 `publicLogin(publicId: string): Promise<LoginResponse>`——POST `/api/auth/login/public` body `{publicId}`，**setTokens 副作用随函数**（同 login/changePassword/activate 先例；auth.ts 头注「nothing else in services/ touches tokenStore」亲验——这是 publicLogin 只能落 auth.ts 的结构性理由）。响应是完整 JwtPair 含 refreshToken（backend §3.2：普通 JwtPair），照 login 全额存储。失败（401 public entity not found）原样上抛，gate 层转重定向。openapi 快照无此端点（侦察零命中复核成立），手写 + JSDoc 钉后端 `RestPublicLoginProcessingFilter`。(3) 不动 `getTenantHomeDashboardInfo`（TA-only 配置面，settings/home 页专用，全仓唯一消费方事实复核成立）——home 页读形是 /dashboard/home，两族端点不可混用（CU/SA 调 info 会 403，scout-ngx-home 遗留 2 收口）。
【依据】后端 DashboardController 四端点权限矩阵（backend §1.1 亲锚点）；tbHttp 空 body 语义亲验；auth.ts 域边界头注亲验；ngx publicLogin（`auth.service.ts:139-144`）。
【分歧】无。

**R46 usage 对账处置（侦察失实勘误 + 下钻登记）**

【决议】(1) **勘误**：「v1 right 列 3 图 vs ngx 4 图」不成立——fork `public/static/dashboard/api_usage.json` 与 ngx 资产逐字段同构（31/31 widgets、default.right 同为 4 个 `system.time_series_chart` 同 id 同 fqn，本镜头 node 脚本实测）；usage 页渲染面右列 4 图**全部命中 builtin registry 真渲染**（`registry.ts:43-76` 含 time_series_chart 亲验），仅 main 的 `system.api_usage` 卡走占位。usage 页现状没有「少一张图」问题，无需补图动作。(2) 真正缺口 = 下钻导航（api_usage 卡的行点击切 state、`?state=` base64 栈、go-to-default 按钮）：antd 侧 states controller 与 `?state=` 读写已就绪（use-states-controller entity 模式亲验），缺的是占位卡上的交互触发器。**M15 不做**：为单张 Angular 卡开真渲染特例破坏 ADR 0003 占位三态的全域一致性（fork 大量 Angular 卡同此边界），且下钻契约（apiUsageDataKeys[].state 映射 + targetDashboardState）的完整复刻是一个独立组件专项。登记能力级增强（§4），触发：usage 域专项或 Angular 卡渲染器交付。
【依据】本镜头对账脚本（fork/ngx 两 JSON main/right 全量输出）；usage 页全文亲验（无 state 处理、embedded 渲染）；ADR 0003 占位口径（`pages/usage/index.tsx:5-6` 头注自认 registered omission）。
【分歧】无。侦察稿 §7 的「fork 若按 ngx 对齐，right 应是 4 个」句式隐含「现状 3 个」——§2 记为事实修正。

**R47 locale 落位**

【决议】(1) `menu.home` 进 `src/locales/{en-US,zh-CN}/menu.ts` 双语（「Home / 首页」，照 ngx `home.home` 译名口径）。(2) 新建域文件 `src/locales/{en-US,zh-CN}/home.ts`（前缀 `pages.home.*`：loading/未配置兜底标题与描述/卡片无障碍文案），聚合文件 `en-US.ts`/`zh-CN.ts` 各加 import+spread（单文件形态，照 edge.ts/ota.ts 先例）。(3) 公开页增量文案（gate 跳转前的加载提示、链接失效错误）进**既有 dashboards 域**（`locales/{en-US,zh-CN}/dashboards/index.ts`，前缀 `dashboards.public.*`）——公开页组件物理上在 dashboard-fullscreen 目录，域归属跟组件走。全部 formatMessage 带 defaultMessage；`npm run check-locale` 双规则过门禁。
【依据】R32（M14）体例沿用；locale 目录结构亲验（en-US/ 下 menu.ts 与域文件并存）；dashboards 域文件在位亲验。
【分歧】无。

**R48 测试落位（只测触碰面）**

【决议】(1) **纯函数单测**：roleDefaultPath 三级决策（defaultDashboard 命中/SA/未配置三支 + 404 兜底语义），落 `pages/user/utils` 既有或新建测试文件；public-gate 四态决策表（R42 的每个分支一条用例，mock tokenStore claims）；`getHomeDashboard`/`publicLogin` 进各自 endpoints.test（mock ./http 断 URL/body/setTokens 副作用——publicLogin 的 setTokens 必断）。(2) **组件测试**：`pages/home/page.test.tsx`（命中渲染 DashboardPage+hideToolbar 传递 / 空渲染 quick-links / SA 空三分支，照 entry.test.tsx 的 mock 范式亲验在库）；quick-links 渲染（角色过滤断言）；dashboard-fullscreen gate 测试（gate 注入后的双态：登录态直渲染、匿名无 publicId 跳 login——mock history）；DashboardPage.test.tsx 增 hideToolbar prop 断言。(3) **不补的面**：`pages/dashboards/view` 与 `pages/usage` 在 M15 零改动（R38 明确不搬 view、R46 明确不动 usage）→ 不为其补测试，「三目录零测试」缺口的登记口径收窄为「零改动零触碰，既有缺口照旧」；若实现波对 view 页产生任何连带改动（预计没有），随改动补最小测试。dashboard-fullscreen 因 gate 改造被触碰 → 其测试即 (2) 的 gate 测试，不另立全页测试。
【依据】M14 R33/R34 体例（照模板 + endpoints 增量 + 纯函数钉死）；entry.test.tsx / settings/home/index.test.tsx / list/index.test.tsx 范式亲验在库（§8 侦察清单复核成立）。
【分歧】无。「为补测而补测」违反 CLAUDE.md「surgical changes」——测试跟随改动面。

**R49 e2e / 自动化边界**

【决议】(1) 可进 e2e 的低依赖断言：登录 TA 打开无壳路由 `/dashboard/{id}`（无 publicId）仍渲染（现 dashboards.spec 走查的自然延展，零新依赖）；匿名（未登录 context）访问 `/dashboard/{id}` 无 publicId → 跳 login。(2) **全匿名真链路留人工走查**（spec §7 人工验收载体）：真实公开 dashboard 生命周期（建盘→make public→匿名 context 打开链接→publicLogin→渲染→make private 后 403 观感→恢复）虽然技术上可由 Playwright 双 context 自动化，但涉及真实后端公开数据生命周期且失败观感（403 形态）本就是要人工判定的走查项，沿 M14 R35「真实通道留人工」先例；e2e 不做，人工走查清单进 spec §7（含 make-private 后访客观感、公开页 `?state=` 深链刷新、公开会话 F5 免重登三个走查点）。(3) home 页 e2e 归 sys-admin/tenant 既有 spec 增量：登录落点变化（SA 落 /home）+ /home 渲染 + 未配置兜底可见。
【依据】M14 R35 先例；e2e 目录现状亲验（smoke/ crosscutting/ visual/，dashboards.spec 已有 TA/CU 走查）；backend 遗留 1/2 的实测诉求归人工走查。
【分歧】无。

**R50 waves 切分（四波，波 2/3 可并行）**

【决议】依赖排序：服务层 + DashboardPage prop + app.tsx 分支是 home 页与公开链路的共同前置（波 1）；home 页与落点改造互为同波内序（先页后落点，否则落点指向不存在路由）；公开链路独立于 home 线。

1. **波 1 · 地基（严格序首位，纯增量无 UI 变化）**：`services/tb/dashboard.ts`（getHomeDashboard + HomeDashboard 类型 + JSDoc 钉空 body 语义）；`services/tb/auth.ts`（publicLogin + setTokens 副作用）；`components/dashboard/DashboardPage.tsx`（hideToolbar prop，OR 语义）；`app.tsx`（getInitialState isPublic 跳过分支）；`pages/user/utils.ts`（roleDefaultPath 三级化纯函数 + additionalInfo 窄化读取——纯函数先行，消费点波 2 才切）。测试：dashboard/auth endpoints 增量、DashboardPage hideToolbar 断言、roleDefaultPath 单测。门禁：lint 0 error / tsc / vitest 定向（dashboards+user+home 三目录）/ check-locale。
2. **波 2 · home 页 + 登录落点**：`config/routes.ts`（/home 路由）；`pages/home/page.tsx`（薄壳）+ `pages/home/components/quick-links.tsx`（推导或静态清单，波内定型）+ `pages/home/data.ts`（如走静态清单）；`pages/user/utils.ts` 消费点生效（roleDefaultPath 已在波 1 就位，本波核对五消费点行为）；`locales/*/home.ts` + `menu.ts` + 聚合；测试：home/page.test、quick-links 断言、entry.test 增量（落点变化回归）。门禁：波 1 口径 + 浏览器走查（SA/TA/CU 三角色登录落点 + /home 渲染 + 未配置兜底 + 404 随动）。
3. **波 3 · 公开链路（与波 2 无相互依赖，可并行）**：`config/routes.ts`（/dashboard/:id 去 access）；`pages/dashboard-fullscreen/index.tsx`（gate 注入）+ `pages/dashboard-fullscreen/public-gate.ts`（四态纯函数）；`pages/dashboards/list/index.tsx`（make-public toast 的「链接仅供参考」欠账文案换为链接可用语义——`list/index.tsx:203-209` 欠账销账）；`locales/*/dashboards/index.ts`（dashboards.public.*）；测试：public-gate 四态单测、fullscreen gate 组件测试、list 文案断言更新。门禁：波 1 口径 + 浏览器走查（真机匿名链路 —— R49 人工走查清单随本波产出）。
4. **波 4 · 收口**：e2e 低依赖断言两条（R49-1）+ 人工走查清单落 spec §7（开工补定 spec §7 全文：home/公开/收口三段验收行）+ 全量门禁（lint 0 error 基线 warnings 只降不升 / tsc / vitest 定向跑法（全量 flaky 先例，按 memory 口径目标目录跑）/ check-locale）+ M15 实现纪要。

每波收口跑定向门禁并 commit（限额中断恢复靠逻辑单元 commit，memory 先例）；合并顺序即波序。
【依据】M14 R37 体例（严格序 + 波内序 + 门禁口径 + commit 纪律）；波 2/3 并行判定：二者唯一共享文件 routes.ts 的两处改动互不相邻、唯一共享组件 DashboardPage 的 prop 在波 1 已落。
【分歧】无。

## 2. 与侦察底稿的差异（修正清单）

| 条目 | 侦察原说法 | 本镜头复核 | 性质 |
|---|---|---|---|
| R46 | m15-ngx-public §7「fork 若按 ngx 对齐，right 应是 4 个而不是 3 个」；任务简报「v1 right 列 3 图（侦察实锤）」 | **失实**——fork api_usage.json 与 ngx 逐字段同构（31/31 widgets；default.right 同 4 个 time_series_chart 同 id 同 fqn）；usage 页右列 4 图全 builtin 真渲染 | 事实修正（node 逐字段对账） |
| R44 | scout-antd §1.5「access 无 PUBLIC_USER 位」隐含「可能要加 key」 | **收口**——加 key 在机制上无效：字典由 currentUser.authority 推导，公开会话 currentUser 恒 null；出路是公开路由脱离 access 体系（R42） | 复核确认 + 理由加固 |
| R42 | scout-antd §1.4「/dashboard/:dashboardId 有 access 门（匿名不可达）」 | 补全第二层：即使去掉 access，现态公开会话仍进不去——getInitialState 必打一次注定失败的 /api/auth/user（claims 无 isPublic 分支）；R44 两件套才闭环 | 事实补全 |
| R40 | scout-ngx-home 遗留 3/5「JSON 里 widget 在 antd 能否等价渲染未验证」「体积/gzip 担忧」 | **收口**——全部 fqn 后端 probe 命中但 descriptor 全 Angular → 22-24/24 占位墙；体积问题随「不移植」裁决消解 | 侦察悬问收口（实测） |
| R38 | scout-antd §9-4「处理 view 页空板副作用对公开/home 不适用」 | 收口为「结构性免疫」：home/公开均不走 view 页组件（薄壳自建 + fullscreen 页无该 effect），副作用只在 view 页内，无需改造 view | 侦察悬问收口 |
| R39 | scout-antd §9-1「登录成功/entry/?redirect 三条链不感知 home settings」 | 修正边界——落点感知的是 **user.additionalInfo.defaultDashboardId**（用户级，/api/auth/user 现成返回），不是 tenant home settings，也不是 /api/tenant/dashboard/home/info；运行时 home 内容才由 GET /api/dashboard/home 解决 | 概念澄清 |

## 3. 仍需用户拍板的偏好项

**技术性偏好项：零。** 12 条技术裁决（R38-R49）均可在「等价为底线 + 照 ngx 口径 + 仓内既有范式」三准则下唯一推出。

上交一项**既有 spec 语义变更知情项**（非偏好，涉已定稿行为，默认执行）：

- **R39b：登录落点统一 `/home`（SA 由 `/tenants` 变为 `/home`）。** 默认执行（ngx defaultUrl 的真实结构；M14 settings/home 欠账注释明写 login landing 归 M15；/tenants 菜单保持可达零删减）。若用户坚持保留 SA→/tenants，则 roleDefaultPath 的兜底段保留 SA 特例（一行），home 页与波次不受影响——架构无分叉，仅落点表差一行。不表态 = 按统一 /home 执行。

另登记两处**形态差异知情项**（无需拍板，验收口径知情即可）：antd 的 home 页不隐藏壳顶栏（ngx hideMainToolbar 不实施，R38）；公开页 make-private 后为通用 403 Alert 而非专属失效页（R42，ngx 亦无专属页）。

## 4. 登记不实施清单（本镜头汇总）

- ngx `assets/dashboard/*_home_page.json` 移植（R40；触发：Angular 卡渲染器交付后可换接，home 页接口不变）
- usage 下钻导航（api_usage 卡行点击切 state + go-to-default 按钮）（R46；触发：usage 专项或 Angular 卡渲染器，契约已录于 m15-ngx-public §8/§10）
- dashboard logo 渲染（R43；antd v1 全域既有缺口，触发：dashboard 域 logo 面交付时公开页按 forceFullscreen 条件接线）
- ngx hideMainToolbar（隐藏壳顶栏）机制（R38；antd 无此机制，home 页保持壳内渲染）
- ngx forceDefaultPlace「锁死全屏」全局守卫（R42/R43；antd 由无壳路由 + embedded 结构性达成效果面，无全局 state 可锁）
- defaultDashboard 的有壳形态分支（R39；收敛单形态 `/dashboard/{id}`，登记一句）
- make-private 专属「链接已失效」页（R42；ngx 同无，通用错误面）
- usage「补第 4 图」动作（R46；资产同构，无图可补）
- view/usage 两页的补测（R48；零改动零触碰）

## 5. 遗留问题

1. GET /api/auth/user 对 public JWT 的实际响应码/body 未实测（推判 404/403；不影响 R44 跳过分支的方向，影响登计算错误 toast 的观感登记）——波 3 真机走查顺手 curl 确认。
2. make-private 后公开访客的 403 Alert 实际观感（backend 遗留 1/2 同源）——波 3 人工走查项。
3. GET /api/dashboard/home 的 gzip 响应对 tbHttp 的透明性（client text→JSON.parse 已兼容 gzip 由浏览器解压，理论无碍）——波 2 真机确认。
4. quick-links 数据源两案（routes 树推导 vs 三角色静态清单）在波 2 开工时定型；推导案需验证 icon 字符串映射的完备性（routes.ts icon 值域亲验为 antd 图标名）。
5. 公开会话经 WS 订阅遥测的权限执行点（backend 遗留 4）——公开 dashboard 若含实时图，订阅空数据 vs 403 的前端观感未实测，走查项。
6. impersonation（SA 模拟登录）落点随 roleDefaultPath 变化的行为（`tenants/users/index.tsx:65` 亲验在场）——模拟租户用户若配了 defaultDashboard，落点将变为其 dashboard，属预期语义但需走查确认无循环。
7. spec §7（M15 段）验收行全文在波 4 补定，本稿只供裁决依据不替代 spec。
