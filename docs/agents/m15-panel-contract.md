# M15 专家小队裁决：契约与行为镜头（panel-contract）

> 由 panel-contract 产出（2026-09-07）。输入：`m15-backend-contract.md`（B）、`m15-ngx-inventory-home.md`（H）、`m15-ngx-inventory-public-dashboard.md`（P）、`m15-antd-current-state.md`（A）四份侦察底稿 + M14 panel-contract / v2-m14-implementation-brief §2 的体例基准。所有关键结论回到本仓 Java/TS 源码逐行复核（锚点见各条），共 9 条契约 + 10 条缺陷/边界登记候选 + 10 条实测清单。已发现 2 处侦察结论修正（见 #4 勘误、#8 勘误）。
> 状态标记：〔证成〕采纳侦察并给出源码依据；〔勘误〕修正侦察底稿/任务口径的结论；〔实测定案〕静态结论已给死，最终确认挂文末实测清单。

## 裁决总表

| # | 契约点（一句话） | 来源 | 状态 |
|---|---|---|---|
| 1 | home 读链两形态：`GET /api/dashboard/home`（三角色，dashboard 本体+hideDashboardToolbar，未配置 200 **0 字节 body**，SA 恒空）vs `GET /api/tenant/dashboard/home/info`（TA only，未配置 200 `{dashboardId:null,hideDashboardToolbar:true}`）；`/dashboard/home/info`（三角色）SA 返回 JSON `null` body——三种空形态不同，前端 falsy 判定必须全覆盖 | B§1、DashboardController.java:417-487 | 证成 |
| 2 | 回退链 user→customer(CU)→tenant 每层都做 READ 校验且**吞异常静默降级**；tenant 级 info 端点**不校验**存在性 → 悬挂 id 只从 info 端点泄漏，`/api/dashboard/home` 读链天然兜底为空 | DashboardController.java:518-532、BaseController.java:972-1002 | 证成 |
| 3 | 登录落点读 `currentUser.additionalInfo.defaultDashboardId`（对象字段路径已在 `GET /api/auth/user` 响应里，读前有删键清洗）；ngx 跳转 fullscreen=`dashboard/{id}`、普通=`dashboards/{id}`，SA **无**该分支；antd 对应 `/dashboard/{id}`(layout:false) vs `/dashboards/{id}` | H§1.2、BaseController.java:940-961 | 证成 |
| 4 | `POST /api/auth/login/public`：body `{publicId}`，响应=**完整 JwtPair `{token, refreshToken}`**；一切失败（非 UUID / 查无 / 非 public / publicId 缺失）都是 **401** 而非 400；isPublic claim 的 sub=publicId | PublicLoginRequest.java、ThingsboardErrorResponseHandler.java:262-284 | 证成 + 勘误（B 遗留-1 的「400 或 401」两可） |
| 5 | 公开会话权限=纯 CU 规则：public JWT authority 就是 CUSTOMER_USER；`GET /api/dashboard/{id}` 对 public 用户经 customerDashboardPermissionChecker（必须 assigned 给 public customer）放行；强制 fullscreen/readonly 是**前端约定非后端强制** | CustomerUserPermissions.java:125-140 | 证成 |
| 6 | WS：`/api/ws/**` permitAll + 无握手认证，首条消息 `AuthCmd{token}`（否则 POLICY_VIOLATION 关闭）；token 走与 REST 同一 JwtAuthenticationProvider → public JWT 可用；antd core/ws 只要 tokenStore 里先有 public token 即零改动，但 401 失败路径会误跳登录页需隔离 | TbWebSocketHandler.java:188-214、core/ws/manager.ts:516-539 | 证成 |
| 7 | `?state=` 契约 = `objToBase64([{id,params}])`；entity 模式「单层 root 且空参 → 不带参数」，default 模式恒写；antd codec 已 byte-exact 实现（states.ts），usage 页只是没消费 | core/dashboard/states.ts:36-148 | 证成 |
| 8 | api_usage.json 结构：11 states / 31 widgets / 2 entityAliases / settings.stateControllerId='entity'；**「fork v1 渲染 3 图 vs ngx 4 图」不成立——fork 资产与 ngx 逐字节同源，default right 本来就是 4 张 hourly 图且 M5 真机验过 4 张**；第 4 图 = data-points-storage-days hourly（key `storageDataPointsCountHourly`，同一 'Api usage state' 别名） | pages/usage/index.tsx:2-6、v1-scope-and-acceptance.md:165 | 勘误 |
| 9 | 跨租户 id 判定：dao 不按租户过滤 → 跨租户 403、不存在 404；权限拒绝消息固定文案；SA 对 `GET /api/dashboard/{id}` 被 @PreAuthorize 排除 → 403 | JpaAbstractDao.java:168-172、DashboardController.java:156 | 证成 |

---

## 分条详裁

### 1. home 读链两形态（响应 JSON 逐字段）

**契约事实**

- `GET /api/dashboard/home`：`@PreAuthorize("hasAnyAuthority('SYS_ADMIN','TENANT_ADMIN','CUSTOMER_USER')")`（`DashboardController.java:422`），方法体 :424-450。SA 分支 `if (securityUser.isSystemAdmin()) return;`（:428-430）→ **200 + 0 字节 body**（`response.setContentType` 已设但什么都不写）。TA/CU：先 `userService.findUserById` 读 user.additionalInfo（:431-433），CU 未命中再读 customer.additionalInfo（:434-439），仍未命中读 tenant.additionalInfo（:440-446）；命中则 `compressResponseWithGzipIFAccepted` 写出（:447-449，gzip helper 在 `BaseController.java:1037`）。
- 响应类 `HomeDashboard extends Dashboard` + `boolean hideDashboardToolbar`（`common/data/.../HomeDashboard.java:25-35`）。JSON 字段全清单（`Dashboard.java:36` 的 @JsonPropertyOrder + 父类字段）：
  `id`、`createdTime`、`tenantId`、`title`、`name`（derived getter，READ_ONLY，`DashboardInfo.java:190-191`）、`image`、`mobileHide`、`mobileOrder`、`assignedCustomers`、`configuration`、`resources`（未带 includeResources 时 null）、`version`、`hideDashboardToolbar`。
  其中 `id`/`tenantId`/`assignedCustomers[].customerId` 一律**对象形** `{"entityType":"...","id":"<uuid>"}`（`EntityId.java:29` @JsonSerialize(EntityIdSerializer) → `EntityIdSerializer.java:31-36`）；`ShortCustomerInfo` = `{customerId, title, public}`（`ShortCustomerInfo.java:32-51`，`public` 是显式 @JsonProperty）。
- `GET /api/dashboard/home/info`（三角色，:457-467）：SA `return null` → Spring 写出 **JSON `null`（4 字节）**，与上面 0 字节是两种形态。TA/CU 走 `BaseController.getHomeDashboardInfo`（:972-985）返回 `HomeDashboardInfo`。
- `GET /api/tenant/dashboard/home/info`（**仅 TENANT_ADMIN**，:472-487）：未配置（或键为 null）恒 200 `{"dashboardId":null,"hideDashboardToolbar":true}`（缺省值 :477-478）；**dashboardId 非对象形 null 时也是对象形序列化规则**——非空时 `{"dashboardId":{"entityType":"DASHBOARD","id":"..."},"hideDashboardToolbar":bool}`。antd 服务层类型 `TenantHomeDashboardInfo`（`services/tb/dashboard.ts:34-38`）已按对象形建对，M14 真机保存往返验过。
- SA 恒空的语义：SA 没有「租户 home」概念（无 tenant 上下文指向自己的租户），`/api/dashboard/home` 对 SA 永远空 → 前端 SA 落点**不得**消费 home dashboard，只能走静态内置首页/quick links 回落。

**前端姿势**

- `/home` 渲染读 `GET /api/dashboard/home`（antd 需新增服务函数）；判定未配置 = **响应 falsy**：axios 对 0 字节 body 的 data 是空串 `''`——封装处 `const home = data || null`，绝不 `JSON.parse`、绝不当错误抛。三种空（`''`/`null`/正常体）统一归一为 null | HomeDashboard。
- 语义区分守死：`/api/dashboard/home`（读本体，/home 页与登录落点用）≠ `/api/tenant/dashboard/home/info`（TA settings 页读写，M14 已交付）；CU/SA 调 info 的 tenant 端点 403，`/api/dashboard/home` 的 info 变体（`/api/dashboard/home/info`）antd 无消费方，不进服务层。
- 与 ngx 的差异登记：ngx 未配置时回落在**前端静态 JSON 资产**（`assets/dashboard/*_home_page.json` 按角色，H§3.2）；fork 无后端内置 dashboard（见缺陷 #D4），空态形态（静态资产回落 vs quick-links vs 空态页）归 arch/scope 裁决，本镜头只钉死：**后端未配置的判据是空 body，不是 404**。

### 2. 回退链与悬挂 id

**契约事实**

- 两族端点的回退链同构（本体端点 `DashboardController.java:434-446`；info 端点 `BaseController.java:972-985`）：user →（仅 CU）customer → tenant。
- 每层提取：`extractHomeDashboardFromAdditionalInfo`（:518-532）/ `extractHomeDashboardInfoFromAdditionalInfo`（:987-1002）——读到 `homeDashboardId` 后**先 `checkDashboardId(READ)`**（:523 / :992），任何异常（不存在/无权限/UUID 非法）**catch 吞掉返回 null** → 降级下一层。注意语义：user 级 id 失效不是报 404，而是**静默落到 tenant 级**；tenant 级也失效 → 整体空。
- **悬挂 id 只从 tenant 级 info 端点泄漏**：`GET /api/tenant/dashboard/home/info`（:476-487）直接读 `Tenant.additionalInfo` 原始键，**不做存在性/READ 校验** → dashboard 已删仍回 200 + 旧 id。而 POST 端点写入时校验过 READ（:499-501），删除 dashboard 后 id 变悬挂。
- user/customer 级的 `homeDashboardId`/`defaultDashboardId` 有读路径清洗：`GET /api/auth/user`、`GET /api/user/{userId}` 走 `checkUserInfo → checkDashboardInfo`，`existsById` 不存在直接**删键**（`BaseController.java:924-961`，删键 :957-959；customer 读路径 `CustomerController.java:89-99`）——所以 user/customer 级不悬挂（读一次即自愈），tenant 级永远悬挂（无清洗）。

**前端姿势**

- `/home` 读链（`/api/dashboard/home`）对悬挂 id **天然免疫**（extract 吞掉），前端无需为该链做 404 兜底。
- 若登录落点改用 `GET /api/tenant/dashboard/home/info`（TA only）取 id 再 `getDashboard`：必须容忍 getDashboard **404**（悬挂）→ 回落 `roleDefaultPath`；CU/SA 走该链会 403 → 落点实现要么按角色分流端点，要么统一走 `/api/dashboard/home`（推荐后者，一份代码三角色通用）。
- M14 已交付的 settings/home 页会显示悬挂 UUID（GET info 回旧 id）：可选增强 = 回显前 `getDashboardInfo` 探活，404 则表单按未配置呈现 + 提示；非必须，不阻塞。

### 3. 登录落点契约（additionalInfo.defaultDashboardId）

**契约事实**

- 字段路径：`GET /api/auth/user` 响应（antd `getCurrentUser`，`services/tb/auth.ts:52-54`）的 `user.additionalInfo.defaultDashboardId`（键名常量 `ControllerConstants.java:451`；同对象里还有 `defaultDashboardFullscreen`、`homeDashboardId`/`homeDashboardHideToolbar` 镜像字段——user 级 home 键 :452）。antd `User.additionalInfo` 目前是 `Record<string, unknown>`（`types/tb/user.ts:42`）——消费点需窄化类型或加类型守卫。
- 响应里该键已被 `checkDashboardInfo` 清洗过（不存在即删键，#2），所以**读到即有效**，落点逻辑无需二次探活。
- ngx 跳转语义（`ui-ngx/.../auth.service.ts:293-300`）：TA/CU 且有 `defaultDashboardId` → `userForceFullscreen`（= isPublic 或 `defaultDashboardFullscreen===true`，:638-644）为真 → 路径 `dashboard/{id}`（全屏无壳）；否则 `dashboards/{id}`（壳内）。**SA 无此分支**（兜底恒 `/home`，:291）。antd 路由映射：全屏形态 = `/dashboard/{id}`（`config/routes.ts:705-710`，layout:false）；壳内 = `/dashboards/{id}`。
- antd 现状：`roleDefaultPath`（`pages/user/utils.ts:54-56`）纯角色查表（SA→/tenants、其余→/devices），三个消费点（登录成功 `pages/user/login/index.tsx:144-145`、`/` 跳板 `pages/home/entry.tsx:17-33`、已登录回流 :61-85）都不感知 home/defaultDashboard——M15 的落点改造就是在这条链上插 defaultDashboard/home 分支，`?redirect=` 优先级仍最高（ngx 同序，H§1.2）。

**前端姿势**

- 落点判定顺序钉死：`?redirect`（安全校验后）> defaultDashboard（TA/CU，按 defaultDashboardFullscreen 选形态）> home dashboard 渲染页（若 M15 建 /home）> roleDefaultPath。SA 永不走 dashboard 分支。
- `defaultDashboardFullscreen` 的全屏形态直接复用既有 `/dashboard/{id}` 路由；该路由现挂 `access: 'canTenantOrCustomer'`（`routes.ts:707`），public 用户问题见 #5/#6。

### 4. 公开登录契约（POST /api/auth/login/public 逐字段）

**契约事实**

- 请求：`POST /api/auth/login/public`，body `{"publicId":"<Public customer UUID>"}`（`application/.../auth/rest/PublicLoginRequest.java:21-33`；过滤器 `RestPublicLoginProcessingFilter.java:53-79`：非 POST → 401 "Authentication method not supported"；body 解析失败 → 401；publicId 空白 → 401）。
- 响应：**完整 JwtPair `{token, refreshToken}`**，与普通登录同构（`RestAwareAuthenticationSuccessHandler.java:58-64` → `createTokenPair`，`JwtTokenFactory.java:234-239`；`JwtPair.java:30-40`）——**不是单 token，refreshToken 有**。
- 错误码**全是 401**（认证异常统一走 `ThingsboardErrorResponseHandler.java:163-164` → `handleAuthenticationException` :262-284）：
  - publicId 非 UUID → BadCredentials（`AbstractAuthenticationProvider.java:50-54`）→ 401 body `{"message":"Invalid username or password","errorCode":2,...}`；
  - 查无 customer → UsernameNotFoundException "Public entity not found"（:55-58）→ 401 同上文案；
  - customer 存在但 `isPublic=false` → BadCredentials（:60-62）→ 401 同上文案；
  - publicId 缺失/body 非法 → AuthenticationServiceException → 落 else 分支（:281-283）→ 401 "Authentication failed"。
  **勘误**：B 底稿遗留-1 写「是 400 还是 401 建议实测」——静态已可定案：不可能 400（BAD_REQUEST_PARAMS 通道只接 ThingsboardException），全 401。
- JWT 内容（`JwtTokenFactory.java`）：`sub`=publicId、`scopes:["CUSTOMER_USER"]`、`userId`=NULL_UUID（`AbstractAuthenticationProvider.java:64`）、`firstName`/`lastName`="Public"、`enabled:true`、**`isPublic:true`**（:95 置入，:143 解析；refresh token 同带 isPublic，:154/:172）、`tenantId`/`customerId`=Public customer 的租户/自身 id。isPublic 的语义 = principal 类型是 PUBLIC_ID（:145），前后端都只拿它做「匿名公开会话」判定，不产生任何独立权限。
- publicId 来源：`dashboard.assignedCustomers` 中 `public:true` 条目的 `customerId`（`Customer.isPublic()` 读 `additionalInfo.isPublic`，`Customer.java:155-166`；Public customer 标题固定 "Public"、additionalInfo `{"isPublic":true}`，`CustomerServiceImpl.java:69-72`）。
- 公开链接 URL 精确格式：`{protocol}//{hostname}[:port]/dashboard/{dashboardId}?publicId={publicCustomerId}`（backend solutions 同形态 `DefaultSolutionService.java:669-674`；antd 已有同款生成器 `pages/dashboards/list/index.tsx:94-104`，port 80/443 省略）。

**前端姿势**

- 新增服务函数（建议落 `services/tb/auth.ts`）：`publicLogin(publicId)` → POST 后照 `login()` 同款 `tokenStore.setTokens(response.token, response.refreshToken)`（`auth.ts:30-32` 范式）；注意 openapi 快照无此端点，类型手写（`{publicId:string}` / `LoginResponse`）。
- 任何 401 一律按「链接无效」处理：剥 URL `publicId` 参数 + 展示专用「链接已失效」空态（ngx 同款行为 `auth.service.ts:327-331`）；**不得**触发通用 `handleUnauthorized` 的跳 `/user/login`。
- public 会话不调 `GET /api/auth/user`（ngx 只拉 `/api/system/params`，P§2）：antd `getInitialState`（`app.tsx:117-126`）按 claims 分支——`decodeTokenClaims().isPublic === true` 时跳过 fetchUserInfo、不设 currentUser，落点走公开页专用逻辑。userId=NULL_UUID 的 User 后端也支持不了详情查询。

### 5. 公开会话权限矩阵

**契约事实**

- public JWT 的 authority 就是 `CUSTOMER_USER`（Authority 枚举**无 PUBLIC**，`Authority.java:18-26`）→ 所有 `@PreAuthorize('CUSTOMER_USER')` 端点它都能进到检查器层，具体放行与否由检查器决定。
- `GET /api/dashboard/{id}`（`DashboardController.java:156-172`，仅 TA+CU，SA 无通道）：`checkDashboardId(READ)` → `checkEntityId`（`BaseController.java:667-677`）：不存在 → 404（:672 + `ThingsboardErrorResponseHandler.java:97`）→ `accessControlService.checkPermission`（:679-683）→ CU 检查器 `customerDashboardPermissionChecker`（`CustomerUserPermissions.java:125-140`）：仅 READ/READ_ATTRIBUTES/READ_TELEMETRY + 同租户 + `dashboard.isAssignedToCustomer(user.customerId)`——public 用户的 customerId 就是 Public customer，所以**「分配给 Public customer」的 dashboard 放行，其余全 403**。权限拒绝消息固定 "You don't have permission to perform this operation!"（`DefaultAccessControlService.java:93-96`；handler :125-136）。
- 跨租户 id：dao 层 `findById` 忽略 tenantId 按主键查（`JpaAbstractDao.java:168-172`）→ 实体能查到 → 检查器 false → **403 而非 404**；id 压根不存在 → 404。
- **强制 fullscreen/readonly 是前端约定，后端不强制**：后端对 public 用户没有任何「只许读这个 dashboard」的额外约束，也无 fullscreen 概念；ngx 的强制全屏 = `isPublic → forceFullscreen → readonly`（`auth.service.ts:392-417,638-644` → `dashboard-page.component.ts:521-523`）。antd 必须自行在公开页消费 `tokenStore.decodeTokenClaims().isPublic` 实现同款强制。
- 附带事实：make public **不会**连带公开设备/资产（swagger 明示，`DashboardController.java:300-306`）→ 公开页里未分配实体的 widget 数据订阅会被权限拒绝。

**前端姿势**

- 公开页 = 顶层无壳路由承载（现成 `/dashboard/:id` 形态），进入时带 public token 调 `getDashboard`；404/403 都渲染兜底空态（语义不同：404=dashboard 没了，403=链接对但 dashboard 不再公开——见缺陷 #D2/#D3）。
- `access.ts` 不需要 PUBLIC_USER 位（public 会话不进 ProLayout 壳）；公开页路由不挂 access，靠自身 claims 分支。
- 公开页的 UI 收敛清单（ngx 等价口径）：无用户菜单/通知、无编辑入口（readonly 强制）、全屏按钮隐藏、dashboard 设置的 logo 可显示（forceFullscreen 分支）、toolbar 可被 dashboard settings.hideToolbar 彻底隐藏。

### 6. WS 公开会话（AuthCmd 首帧契约）

**契约事实**

- `/api/ws/**` permitAll（`ThingsboardSecurityConfiguration.java:88`，permitAll :263-269）且被 JWT 过滤器跳过；握手无认证拦截器（`WebSocketConfiguration.java:57-65`）。
- 认证发生在首条消息（`TbWebSocketHandler.java:188-214`）：未认证会话首帧必须是 `AuthCmd{token}`（或 apiKey），缺失 → `POLICY_VIOLATION` 关闭（:192-196）；token 经 `JwtAuthenticationProvider.authenticate`（`JwtAuthenticationProvider.java:46-55`，与 REST 同一解析链，能解 isPublic claim）校验，失败 → `BAD_DATA` 关闭（:205-208）；成功即建立会话并继续处理同帧剩余命令（:209-213）。
- antd 现状（复核锚点）：`core/ws/manager.ts:516-533` —— `ensureToken()` 返回 null → `abandon('no-token')`，无匿名分支；首帧 AUTH = `{cmdId:0, type:'AUTH', token}`（:418-419, :535-539）；注入点 = `components/layout/ws-manager.ts:26-39`（`tokenStore.isTokenValid('jwt')` 直取，否则共享单飞 refresher）。WS URL 默认 `ws(s)://{host}:{port}/api/ws`（`manager.ts:192-196`）。

**前端姿势**

- **兼容性结论：core/ws 零改动**。公开登录把 JwtPair 写进 tokenStore 后，既有 ensureToken → AUTH 首帧链路对 public token 全通（同一 JWT 校验器）。
- 必须隔离的是失败路径：公开页上任何带失效 token 的 401 → 共享 refresher 失败 → `handleUnauthorized`（`app.tsx:57-66`）清 token 跳 `/user/login?redirect=`——公开访客被甩到登录页是错误观感。姿势：公开页装载 WS 前 ensureToken 已有有效 public token（登录刚拿到，不会 401）；并为公开页注册独立的 unauthorized 处理（显示「会话过期，请刷新公开链接」而非跳登录）。

### 7. state 导航契约（?state= 编解码）

**契约事实**

- `?state=` = `objToBase64([{id:string, params:{...}}])`。编码：`JSON.stringify` → `encodeURIComponent` → `%XX` 字节折叠回 latin1 → base64；解码反向（`core/dashboard/states.ts:36-54`，与 ngx `core/utils.ts` byte-exact；URL 层浏览器自动再做 percent-encoding）。
- 解析规则（`parseStateObject`，states.ts:74-113）：不可解码 → root 单层；条目 id 缺失/不在 states → 剔除；清空 → root；**default 模式只留最后一层**（单层语义），entity 模式保整栈。
- 写回规则（`serializeStateObject`，states.ts:131-148）：default 模式恒写参数；**entity 模式「栈长=1 且是 root 且 params 空 → 删参数」**（即 usage 首屏 URL 无 `?state=`，下钻后才出现）。
- usage 下钻要消费的数据字段（本镜头钉死，缓做触发评估引用）：
  1. `configuration.states`（11 个，id → `{root?, name, layouts:{main,right}.widgets}`）——「点谁显示哪些 widget」的唯一依据；
  2. api_usage 卡（widget `07e3a570-...`）`config.settings.apiUsageDataKeys[].state`（9 条 feature → state id 映射：transport_messages / transport_data_points / rule_engine_executions / javascript_function_executions / tbel_function_executions / data_points_storage_days / alarms_created / emails / sms）——下钻入口；
  3. `config.settings.targetDashboardState`（"default"）——「回到主视图」目标态（headerButton 自定义动作，仅非 root 态显示）；
  4. `settings.stateControllerId:"entity"`——栈语义（openState=push、面包屑=truncate）；antd 已实现双模式（`use-states-controller.ts:45-48` openState/navigatePrev/resetState，entity 补名 :72-102）；
  5. rule_engine_statistics 二级下钻：三张图的 headerButton `openDashboardState` 动作 `targetDashboardStateId:"rule_engine_statistics"`，daily/monthly 带 `setEntityId:true`（params.entityId=QUEUE_STATS 实体，进 alias「TbServiceQueues」）——antd 侧等价物 = `openState('rule_engine_statistics', {entityId})`，params 已有 entityId 对象形契约（states.ts:22）。

**前端姿势**

- URL 契约不用写一行新代码（states.ts/use-states-controller 已交付）；usage 页要做的只是：把 api_usage 卡的占位替换为能读 `apiUsageDataKeys[].state` 并调 `openState(state)` 的交互卡 + 消费 `?state=` 深链（DashboardPage 内部 controller 已兜）。若做简化平铺（不做栈），必须保持 URL 契约不变（`?state=` 格式同款），否则破坏深链等价。

### 8. usage 资产契约（api_usage.json 结构 + 3 图 vs 4 图勘误）

**契约事实**

- 资产：`ui-antd/public/static/dashboard/api_usage.json`（`pages/usage/index.tsx:19` fetch，:2-3 头注自证「verbatim copy of the ui-ngx asset」）。顶层 `{title, name, image, mobileHide, mobileOrder, configuration}`；`configuration` = `{description, entityAliases(2), filters, settings, states(11), timewindow, widgets(31)}`。`settings.stateControllerId:"entity"`、`showTitle/showDashboardsSelect/showEntitiesSelect/showDashboardTimewindow/showDashboardExport/showFilters/showDashboardLogo` 全 false、`toolbarAlwaysOpen:true`、`hideToolbar:false`；`timewindow` = realtime 24h + `aggregation:{type:"NONE", limit:50000}`。
- entityAliases 2 个：`Api usage state`（filter type `apiUsageState`，单实体，解析到当前租户的 API_USAGE_STATE）与 `TbServiceQueues`（entityType QUEUE_STATS，resolveMultiple）。
- states 全账：`default`（root，main=api_usage 卡 + right=**4** 张 hourly 图）；`rule_engine_statistics`（仅 main 3 件：queue-stats 图、processing-failures-and-timeouts 图、exceptions 时序表）；其余 9 个 feature state（main=api_usage 卡 + right=hourly/daily/monthly 3 图）。widget 类型账：1×`system.api_usage`（type latest）+ 29×`system.time_series_chart`（type timeseries）+ 1×`system.cards.timeseries_table`。widget 描述符字段是 `typeFullFqn`（4.4 形态，无 bundleAlias/typeAlias）。
- **勘误：「v1 渲染 3 图 vs ngx 4 图」不成立**。fork 资产 default right 就是 4 个 widget（`85240e8c` transport-messages / `d0a10a8f` transport-data-point / `4544080d` rule-engine / `5d0f2f57` data-points-storage-days，实测解析 JSON 确认），四张全是 builtin `system.time_series_chart`（`components/widgets/registry.ts:44` 在册），v1 M5 真机验收原话「right（4 张 hourly 图）双列布局真机核验」（`docs/spec/v1-scope-and-acceptance.md:165`）。第 4 图 = **data-points-storage-days hourly activity**（widget `5d0f2f57-499d-1324-8e1b-cfbc0b3149d2`），数据源与其余三张完全同构：datasource=`Api usage state` 别名（apiUsageState filter），dataKeys=`['storageDataPointsCountHourly']`（其余三张分别为 `transportMsgCountHourly` / `transportDataPointsCountHourly` / `ruleEngineExecutionCountHourly`）。「3 图」印象的正确来源：每个 feature 下钻 state 的 right 是 3 图（hourly/daily/monthly），非 default 态。
- v1 真正的缺口不是图的数量：31 个 widget 中 26 个位于下钻 states，入口（api_usage 卡）是 ADR 0003 占位 → 下钻不可达（L12 登记口径）；widget 标题渲染原始 `{i18n:api-usage.*}` 键（L13）。

**前端姿势**

- M15 usage 下钻的验收基准：default right 应渲染 **4** 张图（既有 v1 行为即等价，勿「修」成 3 张）；下钻后各 feature state right=3 张；rule_engine_statistics main=3 件。
- i18n 展开若做：`{i18n:<key>}` 占位的 key 表在 `locale.constant-en_US.json` 的 `api-usage.*` 段（P§10-4 契约），antd 侧需把该段搬进 `src/locales/`（zh/en parity 规矩照 CLAUDE.md）——不做则保持 L13 登记口径（渲染原始键）。

### 9. 跨租户 403-vs-404 与 SA 通道（权限矩阵补充）

**契约事实**

- 见 #5 前半。补充：SA 对 `GET /api/dashboard/{id}` 被 @PreAuthorize 直接拒（`DashboardController.java:156` 不含 SYS_ADMIN）→ AccessDeniedException → 403 固定文案（`ThingsboardErrorResponseHandler.java:125-136`）；SA 只能读 `GET /api/dashboard/info/{id}`（:141-149）。`GET /api/dashboard/home` 对 SA 是 200 空（唯一 home 通道）；`GET /api/dashboard/home/info` 对 SA 是 200 `null`。
- 列表端点 `GET /api/customer/{customerId}/dashboards` TA+CU、`GET /api/tenant/dashboards` 仅 TA（B§2.3 锚点）——公开页不消费列表端点，全部单 id 直取。

**前端姿势**

- 错误映射表钉死：404=实体不存在；403=存在但无权（跨租户/未分配/SA 走错端点）；401=token 无效过期。公开页对 403 不跳登录（403 不触发 handleUnauthorized，其只绑 401 链，`app.tsx:57-66`）。

---

## 缺陷/边界登记候选（照 M14 §6.7 体例，每条带前端规避姿势）

- **【上游边界·前端兜底】tenant 级悬挂 home id**：`GET /api/tenant/dashboard/home/info` 不做存在性校验（DashboardController.java:476-487），dashboard 已删仍 200+旧 id；settings/home 页会显示死 UUID，落点链若消费该端点会 getDashboard 404。规避：落点统一走 `/api/dashboard/home`（extract 吞异常天然免疫）；settings 页可选探活降级（见 #2）。后端补清洗另立 issue 不进 M15。
- **【上游设计·信息泄露边界】跨租户 403-vs-404**：dao 不按租户过滤（JpaAbstractDao.java:168-172），存在但无权=403、不存在=404——匿名访客可据此探测 id 存在性。前端规避：公开页 404/403 同一兜底空态呈现，不区分文案；fork 收紧后端另立 issue。
- **【走查项·观感】make-private 后公开链接的失败观感**：publicId（=Public customer UUID）在 make-private 后仍有效（customer 不删，DefaultTbDashboardService.java:121-128 只解除分配）→ publicLogin 仍成功 → getDashboard 403 → ngx 无 resolver 级 catch → 全局 toast + 空白。antd 规避：公开页 403/404 渲染专用「此仪表盘不再公开」空态 + 不跳登录（M15 新页按此编码，顺带覆盖 ngx 的粗糙行为）。
- **【fork 数据事实·空态必做】无内置 dashboard 资产**：`application/src/main/data/json/` 无 dashboards 目录（system/tenant 皆无），`createDefaultTenantDashboards` 目标目录不存在 → no-op（B§5 锚点）；装 demo 数据也只有 firmware/rule_engine_statistics/software/thermostats 四个 demo dashboard，且**没有任何安装路径写 homeDashboardId**。规避：/home 与落点必须把「从未配置」当一等公民空态；ngx 式静态 JSON 首页资产是前端资产非后端数据，是否照搬归 arch。
- **【契约事实·会话寿命】JWT public 会话的刷新语义**：login/public 响应含 refreshToken（#4），public 刷新可用（RefreshTokenAuthenticationProvider.java:57-58,68-70 走 PUBLIC_ID principal，新对仍 sub=publicId）；TTL 跟 jwtSettings（access 默认 2.5h 量级）→ 「公开链接永不过期」不成立，访客会话会过期。规避：公开页过期 → 「刷新页面重进」提示（链接还在就能重登），**绝不**让共享 refresher 失败链跳 `/user/login`（#6）。
- **【环境事实·口径】demo 模式与生产的差异**：demo 数据多 4 个 dashboard 实体但 home 语义零差异（同样未配置 home）；demo dashboard 可被 TA 设为 home，生产空租户则无 dashboard 可设。规避：测试/走查脚本不得假设 demo dashboard 存在；e2e 用自建 dashboard。
- **【勘误登记】invalid publicId 错误码定案 401**（非 400，见 #4）；前端按 401=链接无效统一处理。
- **【实现陷阱】三种「空 home」响应形态**：`/api/dashboard/home` 200+0 字节、`/api/dashboard/home/info` 200+`null` 字面量、`/api/tenant/dashboard/home/info` 200+`{dashboardId:null,...}`——antd 现有 tbHttp 对空 body 的行为需在服务函数里归一（falsy→null），并把该归一写成单测钉住。
- **【上游缺口·不进 M15】user 级 homeDashboardId 无自助写入口**：读路径有清洗但未找到 CU 自改 additionalInfo 的专用端点（B 遗留-5）。「每个用户自选首页」若进需求须先实测写路径，M15 不做承诺。
- **【已登记欠账·本期待收】列表页 make-public 链接 toast**「The anonymous public page ships later; the link is generated for reference only.」（`pages/dashboards/list/index.tsx:203-209`）：匿名页交付后该提示应删除/改写——M15 收口清单项，勿漏。

---

## 需实测确认项（归实现波 curl/真机，静态结论已在正文钉死）

1. `POST /api/auth/login/public`：无效 publicId（合法 UUID 但非 public customer）→ 预期 401 body `Invalid username or password`；缺失 publicId → 401 `Authentication failed`。
2. public 刷新链：用 login/public 的 refreshToken 调 `POST /api/auth/token` → 预期新 JwtPair 且 sub 仍为 publicId。
3. tenant 悬挂 id 链：设 home → 删该 dashboard → `GET /api/tenant/dashboard/home/info`（预期 200+旧 id）→ `GET /api/dashboard/home`（预期 200 空 body）。
4. `GET /api/dashboard/home` 未配置响应的实际字节数（预期 0）与 axios `data` 形态（`''`）——服务层归一单测的判据。
5. public JWT 调 `GET /api/auth/user` 的实际失败形态（预期 4xx/500）——getInitialState isPublic 分支的兜底依据。
6. make-private 后持旧链接访问：publicLogin 200 → `GET /api/dashboard/{id}` 403 的 body 文案；浏览器观感走查（M15 兜底空态验收判据）。
7. SA `GET /api/dashboard/{id}` → 403 body（AccessDenied 分支）确认（正文静态判定，走查顺手）。
8. public 会话 WS：public token 建连 + 订阅已分配实体的遥测（正路径）；订阅未分配实体时的错误帧形态（负路径，决定公开页 widget 错误呈现）。
9. `/api/dashboard/home` 的 gzip：带 `Accept-Encoding: gzip` 的实际 `Content-Encoding`（浏览器透明，仅登记）。
10. 跨租户 CU/匿名读他租 dashboard id → 403 文案与 body 形态（#9 错误映射判据）。
