# v2 M15 实现简报（home 首页 + 匿名公共仪表盘 + 收口）

> 状态：随 M15 开工落盘（2026-09-07）。实现者（agent 或人）动手前必读本文 + `docs/agents/m15-antd-current-state.md`；验收载体 = `docs/spec/v2-subsystems-acceptance.md` §7（已定稿）。M15 收尾后本文件可归档。

## 0. 必读材料与优先级

1. 本文（waves 切分 + 已定裁决 + wire 契约）
2. `docs/spec/v2-subsystems-acceptance.md` §7（验收条目，实现不得砍条目）
3. `docs/agents/m15-antd-current-state.md`（ui-antd 落位现状：落点链/服务层/运行时/测试范式）
4. `docs/agents/m15-panel-arch.md`（R38–R50 架构裁决 + 四波切分，落位以它为准）
5. 域侦察按需查锚点：`m15-ngx-inventory-home.md` / `m15-ngx-inventory-public-dashboard.md` / `m15-backend-contract.md`；契约细目 `m15-panel-contract.md`；合议留痕 `m15-panel-scope.md`
6. 通用范式：`docs/agents/m14-implementation-notes.md`（服务层/表单/测试范式，M15 不重复抄）

## 1. 已定裁决（不可再议项，合议留痕在 panel 三份文档；用户拍板 2026-09-07：P1-B / P2-A- / P3-A）

| 类别 | 议题 | 定案 | 来源 |
|---|---|---|---|
| 范围 | M15 交付面 | home 首页（/home 页 + 登录落点改造 + 配置联动）+ 匿名公共仪表盘（公开链接落地页 + 换票链）+ usage 评估落账（不实施下钻）+ 全图收口 | #16、spec §7 |
| 范围 | 兜底形态（P1） | **antd 原生 quick-links**（角色菜单顶级节推导 + access 过滤；推导不可行降级三角色静态清单常量）；不移植 ngx 静态 JSON（实测全 Angular descriptor → 占位墙 22/24、11/13、5/5），列为能力级偏离登记 | scope P1、arch R40 |
| 范围 | 登录落点（P3/R39b） | **三角色统一 `/home`**（roleDefaultPath 三级化：?redirect > defaultDashboardId（仅 TA/CU）→ /dashboard/{id} > /home）；SA `/tenants`→`/home` 为对 v1 §3.2 的有意修订，修订记录留痕 | scope P3、arch R39 |
| 范围 | usage 下钻 | **不实施**（#16 缓做绑触发，触发 = api_usage 卡 react-1 化）；只落评估结论 + 数据契约素材；「3 图 vs 4 图」勘误落账（fork 资产与 ngx 逐字节同源） | #16、R46、契约 #8 |
| 范围 | M12 存量勾账（P2） | **收口补轻走查**（用户拍板）：真机抽样驱动 4.3 向导 + 4.5 触发表单 ≥3 种 + 4.1/4.2/4.4/4.6 快速过，产出薄版走查文档；处置后 §4 不留裸勾选框 | scope P2、7.4-1 |
| 落位 | home 页 | 新路由 `{name:'home', icon:'home', path:'/home', access:'canAuthenticated'}` 菜单首位；新薄壳 `pages/home/page` 调 DashboardPage（不搬 view 页——空板跳编辑器副作用是负资产）；`?state=` 深链免费获得 | arch R38 |
| 落位 | 公开路由 | `/dashboard/:dashboardId` **去 access 字段**改页面自治 gate（四态决策表纯函数 `public-gate.ts`）；同路由登录/公开双态，不新建公开路由；`/dashboards/:id` 壳内页不动 | arch R42 |
| 落位 | access 体系 | **零新增 key**（公开会话 currentUser 恒 null，加 key 机制上无效）；getInitialState 增 isPublic 跳过 fetchUserInfo 分支（isMfaInterim 先例） | arch R44 |
| 落位 | 服务层增量 | `dashboard.ts` 增 `getHomeDashboard()`（GET /api/dashboard/home，空 body→undefined，HomeDashboard 类型 inline 服务文件）；`auth.ts` 增 `publicLogin(publicId)`（POST /api/auth/login/public，**setTokens 副作用随函数**——auth.ts 域边界「只有登录族碰 tokenStore」是它落此处的结构性理由）；不动 getTenantHomeDashboardInfo | arch R41 |
| 落位 | 渲染面 | DashboardPage 增 `hideToolbar?: boolean` prop（OR 语义 `settings.hideToolbar \|\| hideToolbar`）；公开页以 embedded 渲染（藏 fullscreen/export/select 等价 forceFullscreen，消灭 exit 断头链）；**logo 不建**（全域既有缺口，倒挂防呆）；readonly 由 currentUser=null 结构性成立 | arch R43 |
| 落位 | WS | **零改动**（public JWT 进 tokenStore 后 ensureToken/AUTH 首帧/refresh 续期全自动）；要做的只有 401 失败路径隔离（公开页不触发 handleUnauthorized 跳登录） | arch R45、契约 #6 |
| 落位 | 列表页欠账 | make-public 成功 toast 的「匿名页面后续交付」欠账文案退役（换链接可用语义） | 契约缺陷末条 |
| 落位 | locale | `menu.home` 双语 + 新建 `en-US/zh-CN/home.ts`（pages.home.*）+ 聚合文件挂 import；公开页文案进既有 dashboards 域（dashboards.public.*） | arch R47 |
| 落位 | 测试 | 只测触碰面：roleDefaultPath 三级 + public-gate 四态 + getHomeDashboard/publicLogin endpoints（publicLogin 必断 setTokens）+ home 薄壳/quick-links 组件 + DashboardPage hideToolbar 断言 + entry.test 落点回归 + list 文案断言更新；view/usage 零改动不补测 | arch R48 |
| 落位 | e2e | 低依赖两条（登录态无壳路由可达、匿名无 publicId 跳 login）+ home 落点既有 spec 增量；**全匿名真链路留人工走查**（M14 R35 先例） | arch R49 |
| 落位 | waves | 四波：①地基（服务层+prop+app.tsx+纯函数，严格序首位）→ ②home 页+落点 ∥ ③公开链路（波 1 后可并行）→ ④收口（e2e + spec §7 勾账前置 + M12 轻走查 + 全量门禁） | arch R50 |

## 2. 服务层 wire 契约细节（契约镜头已源码逐行复核，写码直接照做；细目 `m15-panel-contract.md`）

### A. home 域

- **`GET /api/dashboard/home`**：三角色放行；SA 恒 200 **0 字节 body**；TA/CU 按 user→customer(CU only)→tenant 回退链，每层 READ 校验**吞异常静默降级**（悬挂 id 天然免疫）；命中返回 `HomeDashboard`（Dashboard 全字段 + `hideDashboardToolbar: boolean`；id/tenantId/assignedCustomers[].customerId 均对象形 `{entityType,id}`；ShortCustomerInfo={customerId,title,public}）。前端姿势：`getHomeDashboard()` 对空 body falsy 归一 → `undefined`（tbHttp 空 text 返 undefined 已亲验），**绝不 JSON.parse、绝不当错误抛**；归一行为单测钉住。
- **`GET|POST /api/tenant/dashboard/home/info`**：TA only（CU/SA 403）；未配置恒 `{dashboardId:null, hideDashboardToolbar:true}`；**不校验存在性**——dashboard 被删后悬挂 id 只从它泄漏（M14 配置页已在用，本段不动它）。
- **登录落点读 `user.additionalInfo.defaultDashboardId`**（GET /api/auth/user 响应已被后端清洗，读到即有效，**无需二次探活**）；`defaultDashboardFullscreen===true` 时 antd 仍走 `/dashboard/{id}`（无壳即全屏语义，收敛单形态，登记一句）；SA 无此分支。
- 判定序钉死：`?redirect`（getSafeRedirectUrl 不动）> defaultDashboard（TA/CU）> `/home`。五消费点：login 成功 / login 回流守卫 / mfa 成功 / entry 挂载 / SA 模拟登录（tenants/users/index.tsx:65）——roleDefaultPath 纯函数改一处全随动。

### B. 公开域

- **`POST /api/auth/login/public`**：body `{publicId}`（Public customer UUID）；响应 = **完整 JwtPair `{token, refreshToken}`** 照 login 全额 setTokens；**一切失败 = 401 非 400**（非 UUID/查无 "Public entity not found"/非 public/缺失，全部统一按「链接无效」处理：抹 URL publicId 参数 → 跳 `/user/login?redirect=`）。
- **publicId 来源**：`dashboard.assignedCustomers` 中 `public:true` 条目的 customerId；公开链接 `{protocol}//{hostname}[:port]/dashboard/{id}?publicId={publicCustomerId}`（生成器 v1 已有）。
- **public 会话权限 = 纯 CU 规则**：JWT authority 就是 CUSTOMER_USER（sub=publicId、isPublic claim）；dashboard 分配给 Public customer 才放行；存在但无权 403、不存在 404（跨租户探测面）；**强制 fullscreen/readonly 是前端约定**（antd 用无壳路由 + embedded 结构性达成）。make-public 不连带公开设备/资产——「公开但图表无数据」先查实体分配再判缺陷。
- **四态 gate 决策表**（public-gate.ts 纯函数）：①无 token+有 publicId → publicLogin 换票渲染；②无 token+无 publicId → `history.replace('/user/login?redirect=' + encodeURIComponent(当前完整地址))`；③isPublic 且 sub===publicId → 直渲染（F5 刷新免重登）；④登录用户 → 忽略 publicId 以本人渲染（可见性交后端检查器，403/404 兜错误空态）；附加态：isPublic 但 sub≠publicId → 重新换票。
- **失效两分支**：make-private 后 → publicLogin 仍成功（customer 不删）但 getDashboard 403 → 专用「此仪表盘不再公开」空态**不跳登录**（403 不触发 handleUnauthorized，其只绑 401）；publicId 无效 → publicLogin 401 → 抹参数跳 login。
- **401 隔离**：公开页会话过期（public JWT 有 refresh 续期，RefreshTokenAuthenticationProvider 支持 publicId）——仅 refresh 也失败才呈现「会话过期请刷新重进」空态，**绝不**让共享 refresher 失败链跳 `/user/login`。
- **getInitialState**：`decodeTokenClaims()?.isPublic === true` → 跳过 fetchUserInfo（currentUser 留 null；public JWT 调 /api/auth/user 注定失败）。
- **WS**：零改动。公开 token 进 tokenStore 后 ensureToken → AUTH 首帧 → 后端 permitAll + JwtAuthenticationProvider 解 isPublic claim 全通。

### C. usage 域（评估素材，不实施）

- 资产 `public/static/dashboard/api_usage.json` 与 ngx **逐字节同源**（11 states / 31 widgets / stateControllerId='entity'；default main=api_usage 卡+right=**4** 张 hourly 图——「补第 4 图」不存在）。下钻契约五件：states 表、`apiUsageDataKeys[].state` 九条映射、`targetDashboardState:'default'` 回默认态、`?state=`=objToBase64([{id,params}])（antd codec byte-exact 已在）、entity 模式「root+空参不带参数」写回规则（antd 已实现）。补下钻时只缺一个能读 apiUsageDataKeys 并调 `openState(state)` 的交互卡——登记为触发条件 `api_usage 卡 react-1 化`。

## 3. Waves（四波；波 1 严格序首位，波 2/3 可并行，波 4 收口）

> 合并顺序即波序。每波收口跑定向门禁并独立 commit（限额中断恢复靠逻辑单元，memory 先例）。

### Wave 1 —— 地基（纯增量无 UI 变化）
- `services/tb/dashboard.ts`：`getHomeDashboard()` + `HomeDashboard` inline 类型 + JSDoc 钉空 body 语义。
- `services/tb/auth.ts`：`publicLogin(publicId)`（setTokens 副作用随函数）。
- `components/dashboard/DashboardPage.tsx`：`hideToolbar` prop（OR 语义）。
- `src/app.tsx`：getInitialState isPublic 跳过 fetchUserInfo 分支。
- `pages/user/utils.ts`：roleDefaultPath 三级化纯函数 + additionalInfo 窄化读取（消费点波 2 才切，本波先落函数）。
- openapi 快照补录 login/public 端点定义（手写补，regen 不出——上游快照无此端点）。
- 测试：dashboard/auth endpoints 增量（publicLogin 必断 setTokens）、DashboardPage hideToolbar 断言、roleDefaultPath 单测。
- **T 实测（curl，随本波真机执行，结论回写 spec §7.6）**：login/public 无效/缺失 publicId 401 形态、public 刷新链、悬挂链两端点、空 body 字节、GET /auth/user 对 public JWT 失败形态。
- 门禁全绿 → commit（`feat(tb-services): ... (M15 wave-1)`）。

### Wave 2 —— home 页 + 登录落点（settings 线之邻，可与波 3 并行）
- `config/routes.ts`：/home 路由（菜单首位，access=canAuthenticated）。
- `pages/home/page.tsx` 薄壳（getHomeDashboard → DashboardPage(hideToolbar, embedded) / 空 → quick-links / 错 → Alert）+ `pages/home/components/quick-links.tsx`（菜单推导案，推导不可行降级 `pages/home/data.ts` 静态清单——波内定型）。
- `pages/user/utils.ts` 消费点生效 + 五消费点核对（entry/login/mfa/impersonation/404 随动）。
- locale：`menu.home` + `home.ts` 域文件 + 聚合挂载。
- 测试：home/page.test（命中/空/SA 三分支）、quick-links 角色过滤断言、entry.test 落点回归增量。
- 浏览器走查：SA/TA/CU 三角色登录落点 + /home 渲染 + 未配置兜底 + 404 随动。
- 门禁全绿 → commit（`feat(home): ... (M15 wave-2)`）。

### Wave 3 —— 公开链路（与波 2 无相互依赖）
- `config/routes.ts`：/dashboard/:id 去 access 字段。
- `pages/dashboard-fullscreen/public-gate.ts` 四态纯函数 + `index.tsx` gate 注入 + 401 隔离 + 失效空态（「不再公开」/「会话过期」两卡，i18n 双语 dashboards.public.*）。
- `pages/dashboards/list/index.tsx`：make-public toast 欠账文案退役。
- locale：dashboards.public.* 双语。
- 测试：public-gate 四态单测、fullscreen gate 组件测试、list 文案断言更新。
- 浏览器走查（人工验收清单产出）：匿名全链（建盘→make public→匿名打开→换票→渲染→WS 数据→make private→403 观感→恢复）、公开会话 F5 免重登、公开页 ?state= 深链。
- 门禁全绿 → commit（`feat(dashboards): ... (M15 wave-3)`）。

### Wave 4 —— 收口
- e2e 低依赖两条（登录态无壳路由可达 / 匿名无 publicId 跳 login）+ home 落点既有 spec 增量。
- spec §7 勾账前置检查 + 真机走查全量（7.1×8 + 7.2×8 + 7.3×2 + 7.4×6）+ **M12 轻走查**（4.3 向导 + 4.5 触发表单 ≥3 种 + 4.1/4.2/4.4/4.6 快过，薄版 `v2-m12-browser-walkthrough.md`）+ M11/M13 未勾复核。
- 全图落账四处：#16 comment、#1 状态、CONTEXT.md 两词条 + v2 行、v1 spec 消账。
- 全量门禁（lint 0 error 基线 warnings 只降不升 + grep "^Found" 防截尾 + tsc + vitest 目标目录跑法 + check-locale）→ commit（`feat(m15): closeout ...`）→ 合并回 master。

提交信息风格：`feat(<domain>): ... (M15 wave-N)`，domain 按波主线取（wave-1 `tb-services`，wave-2 `home`，wave-3 `dashboards`，wave-4 `m15`）。

## 4. 横切要求（每波）

- 硬规矩照 `ui-antd/CLAUDE.md`：Biome only、antd token 零内联色、locale zh/en parity（check-locale 双规则）、TS strict、页面测试 mock 三件套（umi/pro-components/intl）。
- 门禁口径：`npm run lint` + `npx vitest run <本波目标目录>` 定向全绿；验收必须 `grep "^Found"` 防截尾；全量 vitest 本机 flaky 口径——随机挂 1-3 个旧用例隔离复跑绿即判 flake。
- 逻辑单元即 commit；波内拿不准的裁决回到本文 §1 与 panel-arch 对应 R 条目；两者都没有的停下问主会话，不自行发明。
- 数据保全：走查用公开/取消公开与 home 配置终态全回基线（沿 M14 全局审计口径）。

## 5. 风险与已知坑速查

| # | 坑 | 硬规则 |
|---|---|---|
| 1 | 「空 home」三种响应形态（0 字节 / JSON null / {dashboardId:null}） | falsy 归一为 null/undefined，绝不 JSON.parse 空 body；归一单测钉住 |
| 2 | tenant info 端点悬挂 id（不校验存在性） | 落点/渲染统一走 /api/dashboard/home（extract 吞异常免疫）；不用 tenant info 做三角色判断（CU/SA 403） |
| 3 | login/public 失败全 401 非 400 | 一律按「链接无效」：抹参数跳 login；不走通用 handleUnauthorized |
| 4 | 公开页 401/403 误跳登录 | 401→「会话过期请刷新」空态；403→「不再公开」空态；两卡都不触发清 token 跳登录 |
| 5 | 公开会话 currentUser 恒 null | 不加 access key；getInitialState isPublic 跳 fetchUserInfo；readonly 由 null 结构性成立 |
| 6 | view 页空板自动进编辑器副作用 | home/公开页用薄壳不搬 view；副作用不上移 DashboardPage |
| 7 | ngx 静态 JSON 渲染占位墙 | 不移植（R40 实测定案）；兜底走 quick-links |
| 8 | 「3 图 vs 4 图」是假缺口 | usage 资产与 ngx 同源 default right=4；勿「修」成 3 张；不实施下钻 |
| 9 | make-public 不连带公开实体 | 「公开但无数据」先查实体分配再判缺陷；走查不误报 |
| 10 | defaultDashboardId 读到即有效 | 后端已清洗删键，落点逻辑不做二次探活 |

## 6. 合议遗留与终审记录

> 采信框架同 M14：契约事实以 contract 为准、落位以 arch 为准、验收范围以 scope 为准。三镜头零实质冲突；两处事实勘误（usage 资产同源、未勾数 45 精确化）三镜头独立复核一致。

1. **P1/P2/P3 偏好项已终裁**（2026-09-07 用户拍板）：P1=B quick-links、P2=A- 收口补轻走查、P3=A 三角色统一 /home。R39b（SA 落点变更）知情项默认执行。
2. **范围镜头移交裁决点 6 个**全部消化：#1 端点选型→R41（/api/dashboard/home）；#2 publicLogin 落位→R41（auth.ts）；#3 公开页 403 契约→R42+契约缺陷条；#4 空板副作用→R38（薄壳结构性免疫，view 不动）；#5 JSON 注入链→随 P1-B 作废；#6 ?state= 归属→R38（复用既有 controller，零处理）。
3. **quick-links 数据源两案**（菜单推导 vs 静态清单）波 2 开工时定型（arch R40 两案都合规，实现波按推导可行性自择，spec 验收不区分）。
