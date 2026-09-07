# M15 后端 API 契约盘点：home 首页 / 匿名公共仪表盘 / 收口相关（工作文档，agents 用）

> 由 scout-backend 盘点产出（2026-09-07，纯静态源码盘点，未启动后端实测）。ui-antd M15（home 首页 + 匿名公共仪表盘）服务层对接依据；体例同 `docs/agents/m14-backend-contract.md`。所有锚点为仓库相对路径 + 行号。

通用约定（同 M14）：错误码 → HTTP 状态映射 `PERMISSION_DENIED→403`、`ITEM_NOT_FOUND→404`、`BAD_REQUEST_PARAMS→400`（`application/src/main/java/org/thingsboard/server/exception/ThingsboardErrorResponseHandler.java:90-102`）；`handleException` 对 `ThingsboardException` 原样透传状态（`application/src/main/java/org/thingsboard/server/controller/BaseController.java:455-456`）。权限拒绝消息固定 "You don't have permission to perform this operation!"（`application/src/main/java/org/thingsboard/server/service/security/permission/DefaultAccessControlService.java:93-96`）。

---

## 1. home dashboard 契约

存储模型：home dashboard 不存 dashboard 引用表，而是把 `homeDashboardId`（字符串 UUID）+ `homeDashboardHideToolbar`（布尔）写进 **additionalInfo JSON**。租户级存 `Tenant.additionalInfo`；用户级存 `User.additionalInfo`；客户级存 `Customer.additionalInfo`。键名常量：`application/src/main/java/org/thingsboard/server/controller/DashboardController.java:108-109`；同键常量 `ControllerConstants.java:451-452`（`homeDashboardId`/`defaultDashboardId`，用于 user/customer 读清洗）。

响应结构（`common/data/src/main/java/org/thingsboard/server/common/data/`）：
- `HomeDashboardInfo` = `{dashboardId, hideDashboardToolbar}`，**只含 id 不含 dashboard 本体**（`HomeDashboardInfo.java:26-31`）。
- `HomeDashboard` = `Dashboard` 本体（含 configuration JSON）+ `hideDashboardToolbar`（`HomeDashboard.java:25-35`）。

### 1.1 DashboardController home 端点（`application/src/main/java/org/thingsboard/server/controller/DashboardController.java`）

| 方法 | 路径 | 权限 | 行为要点 | 锚点 |
|---|---|---|---|---|
| GET | `/api/dashboard/home` | SYS_ADMIN/TENANT_ADMIN/CUSTOMER_USER | 返回 `HomeDashboard`（**dashboard 本体**）；SA 直接返回空 body；CU 按 user→customer→tenant 链找 `homeDashboardId`；任何一层 id 不可读/不存在则**静默跳过**（extract 内 catch 吞异常返回 null）；未命中不写 body（200 空） | :422-450；SA 分支 :428-430；CU 回退 :434-446；extract 吞异常 :518-532 |
| GET | `/api/dashboard/home/info` | SYS_ADMIN/TENANT_ADMIN/CUSTOMER_USER | 返回 `HomeDashboardInfo`（**只 id**）；SA 返回 null body；CU 回退链在 `BaseController.getHomeDashboardInfo`；每层提取时会 `checkDashboardId(READ)`，失败静默降级到下一层/返回 null | :457-467；`BaseController.java:972-985`；提取+READ 校验+吞异常 `BaseController.java:987-1002` |
| GET | `/api/tenant/dashboard/home/info` | 仅 TENANT_ADMIN | 从**当前租户** `additionalInfo` 读 `homeDashboardId`；**未设置时返回 `dashboardId=null`、`hideDashboardToolbar=true`**（不是 404）；⚠️ 此路径不做存在性/READ 校验，dashboard 已删时仍回显悬挂 id | :472-487（null 默认 :477-478,486） |
| POST | `/api/tenant/dashboard/home/info` | 仅 TENANT_ADMIN | body `HomeDashboardInfo`；**dashboardId 非空时先 `checkDashboardId(READ)`**（TA 只能设自己可读的）；非空 → 写 `homeDashboardId`+`homeDashboardHideToolbar` 进 `Tenant.additionalInfo`；null → **移除两键**（即"取消 home"传 `{dashboardId:null}`）；最后 `saveTenant` | :492-516（READ 校验 :499-501；写 :507-509；删 :510-513；保存 :514-515） |

### 1.2 user/customer 级 homeDashboard 的读写链（供 CU 个性化与 TA 代设参考）

- 读清洗：`GET /api/user/{userId}` → `checkUserInfo` → `checkDashboardInfo`，对 `homeDashboardId`/`defaultDashboardId` 做 `existsById` 检查，**不存在则直接从 additionalInfo 删键**（`application/src/main/java/org/thingsboard/server/controller/UserController.java:138-148`；`BaseController.java:924-961`，删键 :957-959）。
- customer 读路径同样清洗 HOME_DASHBOARD 键：`GET /api/customer/{customerId}`（`CustomerController.java:89-99`，:97）；**customer 写路径（POST /api/customer :143-160）未见清洗**。
- 登录后自我资料读取 `GET /api/auth/user` 也走 `checkDashboardInfo`（`AuthController.java:85-92`）。
- 移动端组合端点 `GET /api/mobile` 响应里也带 `homeDashboardInfo`（SA 为 null）（`MobileAppController.java:94-107`）。

## 2. dashboard 读取权限矩阵

### 2.1 单体端点（`DashboardController.java`）

| 端点 | @PreAuthorize | 锚点 |
|---|---|---|
| `GET /api/dashboard/info/{dashboardId}`（轻量 DashboardInfo） | SA+TA+CU | :141-149 |
| `GET /api/dashboard/{dashboardId}`（Dashboard 本体，`includeResources` 可选，支持 gzip） | **仅 TA+CU（SA 无通道，403）** | :156-172（响应写 :170-171） |

读链：`checkDashboardId/checkDashboardInfoId`（`BaseController.java:762-776`）→ 通用 `checkEntityId`：按 `findDashboardById(user.tenantId, id)` 取实体、`checkNotNull`（不存在 → 404，`BaseController.java:667-677`，:672）→ `accessControlService.checkPermission`（:681）。

**关键事实：dao 层不按租户过滤** —— `JpaAbstractDao.findById(tenantId, key)` 忽略 tenantId 直接按主键查（`dao/src/main/java/org/thingsboard/server/dao/sql/JpaAbstractDao.java:168-172`；`dao/src/main/java/org/thingsboard/server/dao/dashboard/DashboardServiceImpl.java:124-142`）。所以跨租户 id **不会 404**，而是落到权限检查器返回 false → **403**。

### 2.2 检查器（`application/src/main/java/org/thingsboard/server/service/security/permission/`）

| 角色 | DASHBOARD 检查器 | 语义 | 锚点 |
|---|---|---|---|
| SYS_ADMIN | `GenericPermissionChecker(READ)` | 仅 READ（且单体本体端点被 @PreAuthorize 排除，SA 实际只能读 info） | `SysAdminPermissions.java:34` |
| TENANT_ADMIN | `tenantEntityPermissionChecker` | 全操作，但要求 `entity.tenantId == user.tenantId`，否则 false→403 | `TenantAdminPermissions.java:40`、`:67-81` |
| CUSTOMER_USER | `customerDashboardPermissionChecker` | 仅 `READ/READ_ATTRIBUTES/READ_TELEMETRY` + 同租户 + `dashboard.isAssignedToCustomer(user.customerId)`（即必须分配给本 customer，含 public customer） | `CustomerUserPermissions.java:42`、`:125-140` |

- TA 读他人（租户）dashboard：实体能查到 → **403 "You don't have permission..."**；id 不存在 → **404**（`checkNotNull` :672 + `ThingsboardErrorResponseHandler.java:94,97`）。
- CU 读取路径：必须是「本 customer 被分配」的 dashboard；public 匿名用户（见 §3）的 customerId 即 public customer id，所以命中同一检查器。

### 2.3 列表端点

| 端点 | 权限 | 要点 | 锚点 |
|---|---|---|---|
| `GET /api/tenant/{tenantId}/dashboards` | 仅 SA | 按 tenantId 查 DashboardInfo | :335-354 |
| `GET /api/tenant/dashboards` | 仅 TA | 当前租户；`mobile=true` 走 mobile 过滤 | :359-381 |
| `GET /api/customer/{customerId}/dashboards` | TA+CU | CU 需对本 customer 有 READ；`mobile` 参数同上 | :386-414 |
| `GET /api/dashboards/list?dashboardIds=`（另有隐藏 V1 `GET /api/dashboards`） | TA+CU | 逐条 hasPermission 过滤，无权限项**静默剔除**不报错 | :611-632；过滤 :644-652 |
| `GET /api/edge/{edgeId}/dashboards` | TA+CU | 同样逐条过滤 | :582-609 |

## 3. 公开/匿名链路

### 3.1 makePublic / unmakePublic

- 没有名为 `makePublic` 的路由。公开 = 分配到租户的「Public」customer：
  - `POST /api/customer/public/dashboard/{dashboardId}`（TENANT_ADMIN，`Operation.ASSIGN_TO_CUSTOMER`）→ `DashboardController.java:307-316`
  - `DELETE /api/customer/public/dashboard/{dashboardId}`（TENANT_ADMIN，`UNASSIGN_FROM_CUSTOMER`）→ `:321-330`
- 副作用：`DefaultTbDashboardService` → `customerService.findOrCreatePublicCustomer(tenantId)`，再走普通 assign/unassign（`application/src/main/java/org/thingsboard/server/service/entitiy/dashboard/DefaultTbDashboardService.java:104-129`）。
- Public customer 特性（dao 层）：标题固定 `"Public"`、`additionalInfo = {"isPublic":true}`、每租户唯一（查不到才建，唯一标题冲突时回查）（`dao/src/main/java/org/thingsboard/server/dao/customer/CustomerServiceImpl.java:69-72`、`:234-259`）。**publicId = 这个 Public customer 的 UUID**。

### 3.2 匿名访问端点形态

没有免登录的 dashboard GET 端点；标准链路是两步：
1. `POST /api/auth/login/public`，body `{"publicId": "<Public customer UUID>"}`（`PublicLoginRequest.java:21-31`；过滤器 `RestPublicLoginProcessingFilter.java:46-79`，只认 POST）→ 成功返回普通 `JwtPair`（token/refreshToken；`RestAwareAuthenticationSuccessHandler.java:59-62`）。
2. 用该 JWT 调 `GET /api/dashboard/{id}`（或 `/dashboard/info/{id}`）——按 §2 的 CU 检查器放行（dashboard 已分配给 public customer）。

认证实现链：`PUBLIC_LOGIN_ENTRY_POINT`（`application/src/main/java/org/thingsboard/server/config/ThingsboardSecurityConfiguration.java:84`，注册 :172-177、:265、:274）→ `RestAuthenticationProvider.authenticateByPublicId`（`RestAuthenticationProvider.java:105-106,142-143`）→ `AbstractAuthenticationProvider.authenticateByPublicId`（`application/src/main/java/org/thingsboard/server/service/security/auth/AbstractAuthenticationProvider.java:47-75`）：publicId 必须能解析为某 `isPublic` customer 的 UUID（否则 BadCredentials/"Public entity not found"），然后**凭空构造 `Authority.CUSTOMER_USER` 的 SecurityUser**（tenantId/customerId 取自 public customer，email=publicId，:64-74）。刷新令牌同样支持 publicId（`RefreshTokenAuthenticationProvider.java:68-69`）。

### 3.3 「PUBLIC」authority 机制——不存在

**本版本 Authority 枚举没有 PUBLIC**，只有 `SYS_ADMIN(0)/TENANT_ADMIN(1)/CUSTOMER_USER(2)/REFRESH_TOKEN(10)/PRE_VERIFICATION_TOKEN(11)/MFA_CONFIGURATION_TOKEN(12)`（`common/data/src/main/java/org/thingsboard/server/common/data/security/Authority.java:18-26`）。匿名公开用户就是 `CUSTOMER_USER` + `UserPrincipal.Type.PUBLIC_ID`；JWT 里有 `isPublic` claim 标记（`JwtTokenFactory.java:95,145,154,173`）。权限层完全复用 CU 规则（§2.2）。

### 3.4 spring security permitAll 清单（`ThingsboardSecurityConfiguration.java`）

- 免 token 入口 `NON_TOKEN_BASED_AUTH_ENTRY_POINTS`：`/index.html`、`/assets/**`、`/static/**`、`/api/noauth/**`、`/webjars/**`、`/api/license/**`、`/api/images/public/**`、`/.well-known/**`（:86；permitAll :262）。
- 显式 permitAll：`/api/auth/login`、`/api/auth/login/public`、`/api/auth/token`、`/api/admin/mail/oauth2/code`、`/api/device-connectivity/*/certificate/download`、**`/api/ws/**`**（:263-269）。
- `/api/**` 其余一律 `authenticated()`（:270），再兜底 `anyRequest().permitAll()`（:271，覆盖静态前端资源）。
- JWT 过滤器的跳过清单与上面一致（SkipPathRequestMatcher :197-209）；token 头支持 `X-Authorization`/`Authorization`，前缀 `Bearer `/`ApiKey `（:75-80）。
- 参考：fork solutions 特性生成的公开链接形态为 `"/dashboard/{dashboardId}?publicId={publicId}"`（`application/src/main/java/org/thingsboard/server/service/solutions/DefaultSolutionService.java:671`）。

## 4. 公开性判定（前端如何知道「已公开」）

- `Dashboard`/`DashboardInfo` 响应**没有 publicCustomerId 字段**。暴露的是 `assignedCustomers: Set<ShortCustomerInfo>`（`common/data/src/main/java/org/thingsboard/server/common/data/DashboardInfo.java:44,112-119`；JSON 顺序含 `assignedCustomers`，`Dashboard.java:36`；`Dashboard` = `DashboardInfo` + `configuration` + `resources`，`Dashboard.java:37-41,70-79`）。
- `ShortCustomerInfo` = `{customerId, title, public}`，`public` 是显式 `@JsonProperty("public")`（`ShortCustomerInfo.java:32-51`）。
- **判定规则：`assignedCustomers` 中存在 `public:true` 的条目即已公开；该条目的 `customerId` 就是公开链接所需的 publicId**（来源：`Customer.toShortCustomerInfo()` 用 `isPublic()` 读 `additionalInfo.isPublic`，`common/data/src/main/java/org/thingsboard/server/common/data/Customer.java:155-166`）。
- customer 本体的 `isPublic` 也在 `GET /api/customer/{customerId}` 响应的 `additionalInfo.isPublic` 里（`Customer.java:146-158`）；short info 端点 `GET /api/customer/{customerId}/shortInfo` 只给 title+isPublic（`CustomerController.java:102-122`）。

## 5. 系统内置 dashboard（install 层）

- **没有内置 home dashboard / usage dashboard 实体**：
  - `application/src/main/data/json/system/` 下只有 `oauth2_config_templates`、`scada_symbols`、`widget_bundles`、`widget_types`，无 `dashboards` 目录；
  - `application/src/main/data/json/tenant/` 下只有 `device_profile`、`rule_chains`，**无 `dashboards` 目录**。
  - 全仓无 `usageDashboard`/`usage_dashboard` 常量或 JSON（grep 无果）。`application/src/main/data/resources/dashboards/gateways_dashboard.json` 是 `ResourceType.DASHBOARD` 的**系统资源文件**（可导入资源，非 Dashboard 实体，`InstallScripts.java:411-415`）。
- 装载入口（`application/src/main/java/org/thingsboard/server/service/install/InstallScripts.java`）：`loadDashboards` 读 `json/demo/dashboards`（:418-421），`createDefaultTenantDashboards` 读 `json/tenant/dashboards`（:423-426）；目录内容：demo 有 `firmware.json`、`rule_engine_statistics.json`、`software.json`、`thermostats.json`（仅 demo 数据初始化时装，`DefaultSystemDataLoaderService.java:428-429`）。
- **创建租户时会调 `createDefaultTenantDashboards`，但目标目录不存在 → `listDir` 捕获 `NoSuchFileException` 返回空流 → 实际不创建任何 dashboard**（`application/src/main/java/org/thingsboard/server/service/entitiy/tenant/DefaultTbTenantService.java:52-58`；`InstallScripts.java:428-445`、`:530-538`）。
- 结论：M15 home 首页必须自行处理「从未设置 home dashboard」（`/tenant/dashboard/home/info` 返回 `dashboardId=null`）与「无任何内置 dashboard」的空态。

## 6. 匿名会话对 WS 的可用性

- 安全层：`/api/ws/**` 在过滤链 permitAll（`ThingsboardSecurityConfiguration.java:88`、`:263-269`），且被 JWT 过滤器跳过（:201）。
- 端点注册无握手认证拦截器：`WebSocketConfiguration.registerWebSocketHandlers` 只 addHandler + 放开 origin（`application/src/main/java/org/thingsboard/server/config/WebSocketConfiguration.java:57-65`）。
- 认证发生在**首条消息**：未认证会话必须先发 `AuthCmd{token}`（或 apiKey），否则 `POLICY_VIOLATION` 关闭；token 经 `JwtAuthenticationProvider.authenticate` 校验（与 REST 同一 provider，能解析 public JWT 的 `isPublic` claim）后建立会话（`application/src/main/java/org/thingsboard/server/controller/plugin/TbWebSocketHandler.java:188-214`；`JwtAuthenticationProvider.java:46-55`）。
- 结论：**持有 public JWT 的匿名用户可以建立 WS 并订阅**；订阅到什么数据仍受实体权限约束（public customer 需同时被分配设备/资产，见 `assignDashboardToPublicCustomer` swagger 提示，`DashboardController.java:300-306`）。订阅内部权限执行点未深挖（见遗留问题）。

---

## 遗留问题（需真机实测或前端侦察）

1. `POST /api/auth/login/public` 失败（publicId 非 public customer）的实际 HTTP 码/body：代码层是 BadCredentials/UsernameNotFound → 401，未见 MFA 分支对 public 的处理；建议实测一次。
2. tenant 级 `GET /tenant/dashboard/home/info` 不做存在性校验：dashboard 被删后 additionalInfo 残留悬挂 id（返回 200 + 旧 id），前端再 `GET /dashboard/{id}` 得 404——需实测确认这条链路并决定前端容错形态。
3. SA 访问 `GET /api/dashboard/{id}` 被 @PreAuthorize 拒绝时的响应 body 形态（AccessDenied 处理分支）未核实。
4. 公开用户经 WS 订阅遥测的权限执行细节（TELEMETRY READ 对 public customer 的判定点）未深挖，M15 匿名页若有实时数据需实测。
5. user/customer 级 `homeDashboardId` 的**写入口**：读路径有清洗，但没找到专门的自助更新端点（saveUser 权限集与 CU 自改 additionalInfo 的可行性未核实）；若 M15 需「每个用户自选首页」，写路径要先实测。
6. `POST /api/auth/login/public` 的响应是否含 refreshToken、以及公开会话刷新 token 的可用性未实测。
7. 公开链接路由约定（`/dashboard/{id}?publicId=` 还是前端自定义公开路由）需前端侦察对齐（后端 solutions 特性用前者，`DefaultSolutionService.java:671`）。
