# M15 验收范围与 spec §7 措辞裁决（panel-scope，工作文档）

> 由 panel-scope 镜头产出（2026-09-07）。依据四份侦察底稿（`m15-ngx-inventory-home.md`、`m15-ngx-inventory-public-dashboard.md`、`m15-backend-contract.md`、`m15-antd-current-state.md`）+ spec `docs/spec/v2-subsystems-acceptance.md` §1/§2 定案原则与 §4–§6 措辞样板 + v1 spec §2 v2 定义行与 §3.10 M5 落账原文；体例对齐 `m14-panel-scope.md`。
> **复核勘误两处**（不采信转述，均已回源实测）：
> ① 任务口径中「v1 right 列 3 图 vs ngx 4 图」的对账点**不成立**——fork `ui-antd/public/static/dashboard/api_usage.json` 与 ngx 资产逐字同源（11 states 全同：default main=1 + right=**4**、九个 feature state 各 main=1+right=3、rule_engine_statistics 仅 main=3），v1 §3.10 落账原文亦写「right（4 张 hourly 图）」。usage 资产侧无 3/4 缺口；真实缺口是 api_usage 卡占位（fqn `system.api_usage` 未实现）与下钻 states 不可达，两处 v1 已登记。
> ② 「约 50 条未勾」精确化为 **45 条**：M12 §4 未勾 **34** 条（4.1×5、4.2×4、4.3×8、4.4×5、4.5×6、4.6×6，全部为裸勾选框**无任何注记**）+ M13 未勾 **7** 条（带 3V/受阻注记）+ M11 未勾 **4** 条（带 3V 注记）。M12 无走查文档（`v2-m12-browser-walkthrough.md` 不存在；M7–M11/M13/M14 均有）。
> 结论速览：**§7 预计勾选验收条目 24 条**（7.1×8 + 7.2×8 + 7.3×2 + 7.4×6）+ 7.0 通用边界（行为契约非勾选条目）；**偏好项 3 个**（P1 兜底形态、P2 M12 补账方式、P3 登录落点语义，P1/P3 联动）；**移交 arch/contract 裁决点 6 个**。

---

## 0. 范围钉死事实（合议组输入，不可再议）

| # | 事实 | 锚点 |
|---|---|---|
| F1 | #16 定案：M15 = home 首页 + 匿名公共仪表盘 + 收口；usage 下钻 states 是全图「缓做绑触发」项，M15 只做**评估结论落账**，不实施下钻 | #16（CLOSED）+ 本镜头确认 |
| F2 | v2 定义行：「登录后首页调整为 home dashboard」；CONTEXT.md 词条同步 | v1 spec §2 v2 行、CONTEXT.md:8 |
| F3 | M14 已交付 `/settings/home` 配置页（R28=6.3-5），验收口径=保存成功即达标；**生效面归 M15** | spec §6.3-5、`pages/settings/home/index.tsx:13` 欠账注释 |
| F4 | fork 后端**无任何内置 dashboard 资产**（`json/system` 无 dashboards 目录；创建租户的 `createDefaultTenantDashboards` 因目录不存在实际不创建任何实体） | backend §5 |
| F5 | ngx 默认首页走**前端静态 JSON 兜底**（`assets/dashboard/{sys_admin,tenant_admin,customer_user}_home_page.json` 按角色），不是数据库实体；ngx 三角色登录统一落 `/home`，TA/CU 另有 `additionalInfo.defaultDashboardId` 直跳分支、isPublic 用户直跳最后公开仪表盘分支 | ngx-home §1.2/§3.2 |
| F6 | 后端 Authority 枚举**无 PUBLIC**：匿名公开用户 = `CUSTOMER_USER` + `UserPrincipal.Type.PUBLIC_ID` + JWT `isPublic` claim；公开性判定 = `assignedCustomers` 中存在 `public:true` 条目（publicId = Public customer UUID） | backend §3.3/§4 |
| F7 | 匿名链 = 两步换票：`POST /api/auth/login/public`（body `{publicId}`）→ isPublic JWT → `GET /api/dashboard/{id}` 走 CU 检查器；无免登录 dashboard GET 端点；`/api/ws/**` 持 public JWT 可订阅 | backend §3.2/§6 |
| F8 | antd 服务层缺口仅一处下游函数：`publicLogin`（`POST /api/auth/login/public`）；其余（home info GET/POST、make-public/private、getDashboard）齐全；openapi 快照亦无该端点定义 | antd §3.3 |
| F9 | antd 登录落点现状 `roleDefaultPath`（SA→`/tenants`、TA/CU→`/devices`）是 v1 §3.2 **已验收契约**；M15 落点调整属对它的有意修订，非回归 | antd §1.2、v1 §3.2 |
| F10 | ngx 公开页复用顶层无壳路由 `/dashboard/:id` + `publicId` 查询参数，无独立 public 页面目录；`singlePageMode` + 强制 forceFullscreen + readonly；antd 已有同语义 `/dashboard/:id` 路由（layout:false）但 `access: canTenantOrCustomer` 挡匿名 | ngx-public §6、antd §9-1 |
| F11 | 「home」两族端点易混：`GET /api/dashboard/home`（三角色，/home 页渲染消费，未配置=200 空 body，extract 链吞悬挂 id 异常）vs `GET|POST /api/tenant/dashboard/home/info`（TA only，M14 配置页读写，未配置=200 `{dashboardId:null, hideDashboardToolbar:true}`，**不做存在性校验**） | ngx-home §3.3、backend §1.1 |
| F12 | 用户级 `defaultDashboardId`（登录直跳用）≠ 租户级 `homeDashboardId`（/settings/home 配置、/home 页内容用）——两个 additionalInfo 键、两条生效链 | backend §1.1/§1.2、ngx-home §1.2 |

---

## 1. spec §7 验收条目草案（主产出，照 §6 体例；开工落盘时可微调措辞）

### 7.0 通用边界（home + 公开 + usage 三面共守，行为契约，非勾选条目）

- 路由族与角色矩阵（ngx auth 数组 + 后端 PreAuthorize 双权威）：`/home` 页 **三角色可达**（ngx `home-links-routing.module.ts:122-137` auth=[SYS_ADMIN, TENANT_ADMIN, CUSTOMER_USER]，组件无角色分支）；公开仪表盘走顶层无壳路由 `/dashboard/:id` + `?publicId=`，**匿名可达**（无角色，持 public JWT 以 CUSTOMER_USER 身份过校验）；usage 页 `/usage` **TENANT_ADMIN only**（`access: canTenantAdmin`，CU/SA 无菜单无入口）。
- 落点语义钉死（照 ngx，F5/F12）：登录后统一落 `/home`（ngx 无 per-role 默认路由常量）；`defaultDashboardId` 直跳分支仅 TA/CU 且**用户级** additionalInfo 存在该键时触发（`forceFullscreen` 或 `defaultDashboardFullscreen===true` 时带全屏语义）；isPublic 用户恒直跳 `dashboard/{lastPublicDashboardId}` 且锁死（非 account 路径弹回）。M15 只接**租户级 homeDashboardId 生效面**（F3）+ 落点统一；用户级 defaultDashboardId 的**写入口**后端无自助端点（backend 遗留 5），登记不实施（见「无」清单）。
- 端点分工钉死（F11，防混写）：/home 页渲染消费 `GET /api/dashboard/home`（三角色、未配置 200 空 body、悬挂 id 被后端 extract 吞掉自动回落兜底）；`/api/tenant/dashboard/home/info` 仅供 M14 配置页读写（TA only）。antd 前端不得用 info 端点做三角色落点判断（CU/SA 403）。
- 匿名换票契约钉死（F6/F7）：公开链接形态恒为 `/dashboard/{id}?publicId={publicCustomerId}`（v1 已生成展示，本段补落地页）；publicId 的消费路径 = 查询参数换 JWT，**不存在 publicId 直接透传请求头/参数**的用法；无 PUBLIC 独立角色（钉死「无」清单）；public 会话的 WS/HTTP 全链凭该 JWT 走正常鉴权。
- 验收边界沿用：「等价为底线、允许增量增强、禁止删减 TB 已有操作」；分账三档；横切（i18n zh/en key 全等 check-locale 门禁、主题零内联色值、数据保全——走查用公开/取消公开与 home 配置终态全回基线、门禁四绿）沿 §3.7/§6.0 口径随收尾勾账；自动化回归项归 #12 基线扩充（本 spec = 人工验收载体）。

### 7.1 home 首页操作面（对齐 ngx-home 盘点 §1–§8）

- [ ] `/home` 路由与菜单：三角色可达（路由 + access + 菜单 home 项三角色在场；锚点 ngx `home-links-routing.module.ts:122-137`、`menu.models.ts:848,919,1030`）
- [ ] 登录落点链改造：登录成功、`/` entry、404 回退**三处同源**落点调整为 `/home`（P3 裁决定形态）；`?redirect` 回跳优先级保留；OAuth2 回调落点同步（锚点 antd `pages/user/utils.ts:54-56`、`pages/user/login/index.tsx:144-145`、`pages/home/entry.tsx:17-33`；对 v1 §3.2 落点契约的有意修订，修订记录留痕）
- [ ] 直跳分支：TA/CU 持用户级 `defaultDashboardId` 时落点改跳 dashboard 详情（全屏语义随 `defaultDashboardFullscreen`）；isPublic 用户直跳最后公开仪表盘且锁死（锚点 ngx `auth.service.ts:278-310,638-657`）〔用户级写入口不交付，见 7.0；本条验收=分支逻辑在场 + 走查驱动 TA 配 defaultDashboardId 场景或单测锚〕
- [ ] home dashboard 数据链：/home 页消费 `GET /api/dashboard/home`；未配置（200 空 body）走兜底分支（P1 定形态）；CU 命中 user→customer→tenant 回退链、SA 恒兜底（锚点 backend §1.1 `DashboardController.java:422-450`、ngx-home §3）
- [ ] 渲染面：复用 DashboardPage 只读形态；`hideDashboardToolbar` 生效（dashboard 工具栏隐藏 ≠ 应用壳主工具栏隐藏，双层语义分开验收）；states 取 `states` 中 root:true 态（`getRootStateId` 等价，不硬编码 'main'）（锚点 ngx-home §4/§7）
- [ ] 未配置兜底形态（P1 裁定后落条目）：三角色各自兜底呈现 + 兜底资产加载失败不白屏（ngx 该分支路由解析失败无兜底，antd 增强为错误态，登记）〔形态选项见偏好项 P1〕
- [ ] 悬挂 id 容错：/settings/home 配置的 dashboard 被删后 /home 正常回落兜底不白屏（走 `/api/dashboard/home` 时后端 extract 已吞；前端仍防 `getDashboard` 404 分支）（锚点 backend §1.1 遗留 2）
- [ ] 配置页联动往返：TA `/settings/home` 配置 → 登录/进 /home 渲染该 dashboard（hideToolbar 随配置）→ 取消配置（POST dashboardId:null）→ 回兜底——「生效面」闭环即 M14 欠账注释的销账（锚点 `pages/settings/home/index.tsx:13`、ngx-home §5）

### 7.2 匿名公共仪表盘操作面（对齐 ngx-public 盘点 A 部分）

- [ ] make-public/private 出口核对（v1 已交付不重做）：列表行操作互斥 + Public 列 + 详情动作 + ManageDashboardCustomersDialog 对 public customer 保护回归确认；**链接 toast 的「匿名页面后续交付」欠账文案随落地页交付退役**（锚点 antd `pages/dashboards/list/index.tsx:181-217,498-529`、v1 §3.10）
- [ ] publicLogin 服务函数：`POST /api/auth/login/public`（body `{publicId}` → JwtPair）+ openapi 快照补录 + 函数级单测（锚点 backend §3.2 `RestPublicLoginProcessingFilter.java:46-79`、antd §3.3）
- [ ] 公开路由：`/dashboard/:id` 匿名可达（access 门按「持有效 publicId 查询参数或 public 会话」放开；`publicId` 守卫语义——已认证 public 用户 URL publicId 与 JWT sub 不一致强制重载，锚点 ngx `auth.guard.ts:122-131`、antd `config/routes.ts:705-710`）
- [ ] 匿名全链走查（真机）：未登录打开公开链接 → 清残留 token → publicLogin 换票 → isPublic JWT 入 tokenStore → `GET /api/dashboard/{id}` 渲染 → WS 匿名会话出实时数据（锚点 ngx-public §2–§3、backend §6）
- [ ] 无壳形态清单：强制 forceFullscreen + readonly（无编辑入口/FAB）、无用户菜单与通知铃、无登录按钮、logo 显示但点击不跳转、Powered-by 页脚语义对齐（锚点 ngx-public §4）
- [ ] publicId URL 补写与一致性：public 用户每次路由到 dashboard 把 publicId 补回地址栏（刷新/分享后仍可用）；链接仅含 publicId 不含 embedded 参数（锚点 ngx-public §3 `settings.effects.ts:77-90`）
- [ ] 失效行为两条：①make-private 后旧链接访客——publicLogin 仍成功但 getDashboard 403 → 错误呈现不白屏**不误登出**（403 不走 401 通道）；②public customer 已删/publicId 无效——publicLogin 失败 → 抹参数 → 落 `/login`（锚点 ngx-public §5、antd `app.tsx:57-66`）〔①的 403 具体呈现需实测，走查项〕
- [ ] 复用隔离：view 页「空板自动进编辑器」副作用不得进公开页与 /home 页（副作用留在 view 页消费点，不上移 DashboardPage）（锚点 antd `pages/dashboards/view/index.tsx:29-37`、§9-4）

### 7.3 usage 域评估落账（不实施下钻，F1）

- [ ] 下钻缓做评估结论落账（登记进 §7.5 增强登记或独立小节）：**触发条件 = api_usage 卡以 react-1 实现交付时**（fqn `system.api_usage` 进注册表，沿 M11 §3.8 scada 渲染器缺口条目同款格式）；数据契约素材已备清单随登记落档——`api_usage.json` 11 states + apiUsageDataKeys[].state 下钻映射 + `targetDashboardState` 返回默认态 + `?state=` base64 URL 契约 + antd states-controller 已具备 `openState`/深链恢复能力（补下钻时只需消费同一份资产自实现导航，锚点 ngx-public §7–§10、antd §4.2）
- [ ] 资产对账勘误落账：fork `api_usage.json` 与 ngx 逐字同源（11 states、default right=4 图，「3 vs 4」对账点不成立，见头部勘误①）；usage 页数据为前端静态资产非登录租户实况维持 v1 口径登记（锚点 v1 §3.10 落账注、antd §5）

### 7.4 收口操作面（全图状态落账）

- [ ] M12 §4 勾账缺口处置：34 条未勾逐条分账——按 P2 裁定执行（补最小走查 or 分账注记）；处置后 §4 不留裸勾选框（每条带 ✅ 走查注记 / 3V 未驱动注记 / 受阻碍注记，沿 M11/M13 勾账体例）（锚点本档头部勘误②）
- [ ] M11/M13 未勾项收口：M11 4 条 + M13 7 条（3V 未驱动 9、受阻·后端 2——edge events 未落库两条维持受阻口径不冒勾）逐条复核现状，能收口的驱动收口，不能的维持注记并写明原因（锚点 spec §3.1/§3.2/§3.3/§5.1/§5.3/§5.4/§5.5 未勾行）
- [ ] #16 执行完成回写：M15 为 #16 定案的最后执行段，收口时 comment 留痕（v2 页面清单完成态：八子系统独立页 / settings 七件 / home 首页 / 匿名公共仪表盘 / usage 评估落账各自的落点 spec 节 + 散落挂账三条的销账指向）（锚点 #16 范围清单 1–6 项）
- [ ] #1 地图状态更新：wayfinder 地图「全功能对齐（v2）」达成状态登记（v1 §2 v2 定义行的兑现落账：编辑器三件套 + 八子系统 + settings + home dashboard 全部有 spec 节与验收载体；剩余登记项逐条列明归属域）（锚点 #1 Notes、CONTEXT.md:8）
- [ ] CONTEXT.md 词条：补「home dashboard（租户级 homeDashboardId additionalInfo 键 + /api/dashboard/home 三层回退链）」「公共仪表盘（public customer 换票机制：publicId → login/public → isPublic JWT）」两词条 + v2 定义行补「usage 下钻缓做（触发=api_usage 卡 react-1 化）」口径（锚点 CONTEXT.md「产品与范围」节）
- [ ] v1 spec 收口落账：§2 v2 定义行标注「已兑现（M7–M15）」+ §7 遗留限制清单中随 M15 消掉的条目（home dashboard 首页、匿名公共仪表盘）更新状态 + 修订记录补「M15 段定稿」与「M15 收口落账」两条（锚点 v1 §2/§7/修订记录）

### 7.5 能力级增强登记（只登记不验收，不设硬门槛）

- 公开页社交分享面板（ngx `tb-social-share-panel`，antd 以复制链接等价交付）
- 公开页 embedded=true / hideToolbar=true 通用查询参数（ngx 4.4.0 无 UI 生产者，仅移动端深链消费）
- 公开链接「永不过期」语义（public JWT 默认 2.5h + refresh 续期，机制照上游）
- 用户级 defaultDashboardId / homeDashboardId 自助写入口（后端无自助端点，backend 遗留 5；如确认产品缺口另立 issue）
- usage 页数据源从静态资产升级为登录租户实况（与下钻缓做同触发链）
- quick links 网格随菜单变化的响应式形态细节（若 P1 选 quick links 兜底，2/3/4 列断点照 ngx，微差不判缺陷）

---

## 2. 「无」清单（明确不进 M15，每条带理由）

| # | 不做项 | 理由 |
|---|---|---|
| 1 | PUBLIC 独立角色 / access 字典 PUBLIC_USER 位 | 后端 Authority 枚举无 PUBLIC（F6）；匿名 = CUSTOMER_USER + isPublic claim；凭空造角色即越权设计 |
| 2 | 内置 home dashboard / usage dashboard 数据库实体导入 | fork 后端无 dashboards 资产目录（F4）；ngx 同样无——默认首页是前端静态 JSON 兜底，导入实体属凭空造 |
| 3 | 公开仪表盘独立路由/页面目录（如 /public/dashboard/...） | ngx 无此物（F10）：公开访问复用顶层 `/dashboard/:id` + publicId 查询参数；改路由形态破坏 v1 已生成的链接格式契约 |
| 4 | 免登录 dashboard GET 端点 / publicId 当请求头透传 | 后端无此端点（F7）；换票两步链是唯一通道 |
| 5 | usage 下钻 states 实施（state 导航、api_usage 卡交互化） | #16 定案「缓做绑触发」（F1）；触发条件=api_usage 卡 react-1 化，未满足；M15 只落评估结论（7.3-1） |
| 6 | 用户级 defaultDashboardId 自助写入口 | 后端无自助更新端点（backend 遗留 5），读路径清洗存在但写路径未核实；「每个用户自选首页」属新功能设计，登记增强 |
| 7 | isPublic 用户进 home 壳页面 | ngx `forceDefaultPlace` 对 isPublic 恒弹回 dashboard（F5）；公开用户与 /home 互斥是既有安全语义 |
| 8 | 公开页登录入口 / 注册引导 | ngx 公开页无登录按钮（F10/ngx-public §4）；一步切换语义下不新增 |
| 9 | make-private 主动吊销已发 public JWT | 前后端均无吊销机制（ngx-public §5）；链接有效性由后端每次鉴权决定，前端不做假吊销 UI |
| 10 | 公开仪表盘批量公开/私有 | ngx 无批量 make-public（行操作+详情各一处）；不凭空造 |
| 11 | /home 页编辑入口 | ngx /home 页 embedded+readonly 无编辑入口（ngx-home §5）；编辑路径=从 Dashboards 列表进编辑器（M10 已交付） |
| 12 | M12 整段重新实现/翻案 | M12 交付在役且经复审回写（4.0/4.7/4.8 已勘误收口）；收口只补勾账不重做（P2 裁的是验证深度，不是实现） |

---

## 3. 偏好项清单（需用户拍板）

### P1 未配置 home dashboard 时的兜底形态（与 P3 联动）

- **选项 A：移植 ngx 静态 JSON**（`*_home_page.json` 按角色兜底）。代价：三资产 28–124KB 需随包分发 + `applySystemParametersToHomeDashboard` 参数注入链复刻；且 JSON 内 widget 大量依赖 antd 注册表外的 fqn（mobile QR、特定 filter、markdown 函数），实际渲染成**一屏占位卡**——形式等价、内容体验负值，走查尴尬。侦察遗留 3 明示渲染等价性未验证。
- **选项 B：antd 原生 quick links 页**（按登录角色侧边菜单顶级节推导卡片网格，跳转各域列表页）。代价：实现菜单推导组件（无独立数据源，成本最低）；性质：ngx `HomeLinksComponent` 真实存在的分支形态（homeDashboard falsy 时渲染，`home-links.component.html:18-44`），非凭空造；一步切换后用户首次落地看到的是**可用的导航页**而非占位卡海洋。
- **选项 C：最简空态 + 引导**（「尚未配置首页仪表盘，去 /settings/home 配置」）。代价最低，但 SA 无该配置页，CU 也没有——三角色引导文案要分叉，且比 ngx 少一层能力（quick links 分支被删）。
- **建议 B**：它是 ngx 组件能力的真实组成部分（等价性站得住），渲染零占位卡风险，且给「配置了 home dashboard」留出清晰的能力对比。选 B 时在 spec 措辞上把 ngx 静态 JSON 兜底登记为「有意偏离」（等价底线按「未配置时 /home 有可用的角色化回落页」口径解释，修订记录留痕）。

### P2 M12 §4 勾账缺口的处置方式

- **选项 A：补一轮最小真机走查**（只驱动 34 条未勾项，产出薄版 `v2-m12-browser-walkthrough.md`）。代价：约 1 天真机作业；收益：收口后全 spec 勾账口径统一（无裸勾选框），通知族是三角色高频面，走查价值实。
- **选项 B：分账注记不补走查**（逐条补「未勾（3V）：走查未驱动，实现在役 + 单测锚」注记）。代价：半天文书；风险：34 条里 4.3（发送向导三步 stepper）与 4.5（rules 14 种触发表单）属复杂交互面，零真机证据直接注记过去，收口的可信度打折。
- **建议 A，范围收窄为「A-」**：4.3 向导三步 + 4.5 触发表单抽样 3 种（ALARM/DEVICE_ACTIVITY/ENTITIES_LIMIT）+ 4.1/4.2/4.4/4.6 快速过一遍，预计半天；其余按 3V 注记。M12 无走查文档是六段里唯一空白，收口段补上最划算。

### P3 登录落点语义（照 ngx 统一落 /home，还是保守保留角色落点）

- **选项 A：三角色统一落 `/home`**（严格对齐 ngx 与 v2 定义行「登录后首页调整为 home dashboard」）。SA 登录第一眼从 `/tenants` 变为 /home 兜底页（P1 形态），对 v1 §3.2 已验收契约是有意修订，需修订记录留痕 + v1 spec 对应行更新。
- **选项 B：保留 roleDefaultPath，仅当租户配置了 home dashboard 时才落 `/home`**。对 v1 行为零扰动；但与 v2 定义行字面相悖（未配置时首页不是 home dashboard 也不是 home 页），且 ngx 无此条件分支——属自创语义，后续每处落点代码都要带条件，长期成本高。
- **建议 A**：定义行是 #9/#16 两轮定案的原意，ngx 行为是唯一参照系；v1 落点契约的修订正是本里程碑的存在理由之一。选 A 后 7.1-2 条目直接可写，选 B 则 7.1-2 需改写为条件落点并在「无」清单加一条「无角色落点常量」的偏离登记。

---

## 4. 移交 arch / contract 镜头的裁决点

| # | 裁决点 | 移交对象 | 本镜头立场 |
|---|---|---|---|
| 1 | /home 页渲染端点选型：`GET /api/dashboard/home`（三角色+空 body 兜底+悬挂 id 自动吞）vs `/api/tenant/dashboard/home/info`（TA only） | contract（落 wire 契约） | 钉死前者；后者仅 M14 配置页消费（F11）。空 body → null 的 HTTP 语义要在服务层显式处理（antd http client 对空 body 的反序列化行为需实测） |
| 2 | publicLogin 在 antd 的落点：服务函数放 `services/tb/auth.ts` 还是 `dashboard.ts`、HTTP 走 `authExempt` 通道、换票后 tokenStore/WS 组合根注入顺序 | arch（实现形态） | 函数归 auth 域（登录族语义）；换票成功即 `setTokens` + `setInitialState` 复用现有会话建立链，ws-manager 沿 tokenStore 直取无需新分支（antd §7 推论） |
| 3 | 公开页 403 呈现契约（make-private 后）：错误态组件形态 + 确认 403 不触发 `handleUnauthorized` 清 token 跳登录 | contract + arch | 403 与 401 通道隔离是既有事实（app.tsx 只接 401）；公开页兜一层「链接已失效」错误卡，文案 i18n 双语 |
| 4 | 「空板自动进编辑器」副作用的隔离边界：留在 view 页消费点 vs 下沉为 DashboardPage 开关参数 | arch | 倾向留在 view 页（消费点一处、DashboardPage 保持纯渲染）；若下沉，开关默认关、view 页显式开 |
| 5 | /home 兜底 JSON 若选移植（P1-A）：`applySystemParametersToHomeDashboard` 参数注入链（persistDeviceStateToTelemetry/mobileQrEnabled 改写特定 filter/widget）是否复刻 | contract | 若 P1 定 B/C 则本点作废；定 A 时建议只搬数据不复刻注入链（fork 无 mobile 场景，注入目标 filter 在 antd 渲染为占位，注入无消费方） |
| 6 | `?state=` 深链在 /home embedded 场景的 URL 归属：state 写进 `/home?state=` 还是维护独立 state 查询面 | arch | ngx 用 `syncStateWithQueryParam=true` + `setStateDashboardId=false`（ngx-home 遗留 4 未实测）；antd `use-states-controller` 已有完整 `?state=` 契约，建议直接复用、以单测钉「root 态不写参数」语义（与 entity controller 特例一致） |

---

## 5. 遗留问题

1. **公开链路三处后端行为未实测**（走查前置实测项）：①`POST /api/auth/login/public` 失败的确切 HTTP 码/body（代码层 BadCredentials→401）；②login/public 响应是否含 refreshToken（决定公开会话 2.5h 后的续期形态）；③make-private 后 403 的响应体形态与公开页实际观感（7.2-7① 走查项）。三者随 wave-1 真机定论回写 7.2 条目注记。
2. **公开会话 WS 订阅的权限执行细节**：订阅到什么数据仍受实体权限约束（public customer 需同时被分配设备/资产）；内部执行点未深挖（backend 遗留 4）——若走查发现「仪表盘公开但图表无数据」，先查实体分配再判缺陷。
3. **P1 若选 A 的渲染等价性未验证**：三份静态 JSON 的 widget 依赖（mobile QR、'Active Devices'/'Inactive Devices' filter id、markdown 函数）在 antd 注册表下的实际渲染形态需原型实测——这是 P1 建议选 B 的直接依据，若用户拍板 A 需先跑 proto 分支验证。
4. **defaultDashboardId 直跳分支（7.1-3）的验收深度**：用户级写入口后端缺自助端点，走查只能靠 API 直写 additionalInfo 构造场景——该条最终以单测锚收口还是真机驱动，随开工定。
5. **`/api/dashboard/home` 空 body 在 antd http client 的反序列化行为**：`response.json()` 对空 body 抛错还是返回 null 未实测（contract 裁决点 1 的伴随实测），决定服务层是否需要 `text` 降级处理。
6. **M12 34 条中有无「实现与 ngx 有偏差但当时未发现」的暗雷**：分账注记时逐条对照 `m12-ngx-inventory.md` 锚点，发现偏差按缺陷登记不静默注记（P2 执行时的纪律条款）。
7. **#1 地图更新的颗粒度**（7.4-4）：comment 留痕的详略（全清单 vs 指向 spec 索引）未定，随收口执行时对齐 #16 回写的口径，两票互引。
