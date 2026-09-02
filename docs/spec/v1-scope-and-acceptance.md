# v1 范围与验收定案（前端 AntD Pro 重写 · 第一阶段）

- 状态：**定案**（2026-08-31，[v1 范围与验收定案](https://github.com/KMakise123/thingsboard/issues/9) grilling 三轮终审）
- 性质：活文档。实现期间随勾选与边界微调修订；结构性变更须回 #9 决议评论留痕
- 上游决议：#6 widget 运行时 · #7 API 契约 · #8 应用架构 · #11 openapi 3.1
- 关联待决：#10 部署定案（gate 第 2 条依赖其通道结论）

## 0. 一句话定义

v1 = **除编辑器三件套与八个子系统外，对齐 ui-ngx 全部页面，能力逐项等价、不做简化版**；三角色（SYS_ADMIN / TENANT_ADMIN / CUSTOMER_USER，下称 SA / TA / CU）全支持。

## 1. 定案原则

1. **Parity 基准**：凡本 spec 未单列的能力，以 ui-ngx 同名页面为基准对齐（形态可 AntD 化，能力不减）。
2. **三角色**：菜单与按钮门禁对齐后端 Authority（`access.ts` 字典）；CU 为同页面集的只读子集（四菜单项：设备 / 资产 / 告警 / 仪表盘）。
3. **编辑器跳转规则**：v1 页面中所有「打开仪表盘编辑器 / widget 编辑器 / 规则链画布」的入口一律隐藏或禁用并提示 v2 提供。
4. **子系统排除规则**：八个子系统（通知中心、Edge、OTA、版本控制独立页、资源库、计算字段独立页、mobile-center、iot-hub）的独立页面归 v2；但其 API 数据在实体 tab 中照常消费（calculated-fields tab、alarm-rules tab、version-control tab 属 v1）。
5. **验收形态**：每域操作级 checklist（勾选即通过）+ 第 3.11 节横切章；数字口径在本地开发环境测定。

## 2. 页面清单（域 × 里程碑）

| 域 | 页面 / 能力（对齐 ui-ngx 路由） | 角色 | 里程碑 |
|---|---|---|---|
| 登录·密码线 | `login`、`login/resetPasswordRequest`、`login/resetPassword`、`login/resetExpiredPassword`、`login/createPassword`、`activationLinkExpired`、`passwordResetLinkExpired` | 公开 | M1 |
| 应用壳 | 侧边菜单 / 面包屑 / 用户菜单 / 登出 / locale 切换 / 404 重定向；登录成功落 `/devices` | 三角色 | M1 |
| 设备 | `entities/devices` 列表 + 详情（10 tab 全量）+ 多步新建向导 + 凭证 dialog + 连通性检查 + CSV 导入 + 批量（删除 / 分配 / 取消分配） | TA 编辑、CU 只读 | M1 |
| 资产 | `entities/assets` 列表 + 详情（8 tab）+ 同套操作 | TA 编辑、CU 只读 | M2 |
| 实体视图 | `entities/entityViews` 列表 + 详情（6 tab）〔裁定 6.1〕 | TA | M2 |
| 网关 | `entities/gateways`（设备列表变体）〔裁定 6.1〕 | TA | M2 |
| 客户域 | `customers` 列表 / 详情（7 tab）+ 作用域页 `customers/:id/{users,devices,assets,dashboards}` + 设备 / 资产分配（单 + 批）〔`edgeInstances` → v2，裁定 6.2〕 | TA | M2 |
| 用户管理 | `users` 六操作（列表 / 新增 / 编辑 / 删除 / 重置密码 / 重发激活） | TA（SA 侧 M3 复用） | M2 |
| 告警域 | `alarms` 全局页（全量过滤）+ 实体内 tab 复用 + `alarms/alarm-rules` 列表 / 详情〔裁定 6.3〕 | TA / CU | M3 |
| sys admin | `tenants` 列表 / 详情 / CRUD + `tenants/:id/users` + `tenantProfiles` 列表 / 详情 + settings v1 子集（general / outgoing-mail / 2fa / oauth2 / auditLogs） | SA | M3 |
| 实体 profile | `profiles/deviceProfiles`、`profiles/assetProfiles` 列表 + 详情全 tab〔裁定 6.1〕 | TA | M3 |
| 账户安全域 | `account/profile`、`account/security`（改密码 + 2FA 启用）；`login/mfa`、`login/force-mfa`；OAuth2 登录流（按钮 / 跳转 / 回调）〔`notificationSettings` tab → v2，裁定 6.4〕 | 三角色 | M4 |
| 仪表盘只读 | `dashboards` 列表（含 export / import JSON、assign、make public / manage customers）+ 只读页（states / timewindow / toolbar）+ `dashboard/:id` 全屏模式 + `usage` 页〔裁定 6.5〕 | TA / CU | M5 |
| 收口 | 横切全绿 + 一步切换演练 + 测试基线 + 遗留清单 → gate | — | M6 |

**v2（不在本 spec）**：编辑器三件套（仪表盘编辑器、widget 编辑器、规则链画布 + `ruleChains` 全域）、八子系统独立页、settings 其余 tab（queues / notifications / home / repository / auto-commit / trendz / ai-models）、home dashboard 首页（登录落点届时调整为 home → home dashboard）、`account/notificationSettings`。

## 3. 每域验收标准（操作级 checklist）

### 3.1 登录族（M1 密码线 / M4 MFA + OAuth2 线）

> M1 验收（2026-09-01）：密码线 7/11 勾；4 项邮件链路待 SMTP / 密码策略配置后复验——对应页面全部可达、表单校验 / 密码策略强度提示在、假 token 的后端错误透传已验证。

密码登录：
- [x] 正确凭据登录成功 → 落设备列表（有 `redirectUrl` 则回跳）
- [x] 错误凭据 → 后端错误原文透传展示，不白屏
- [x] 品牌接缝生效：logo / 标题 / favicon / 登录背景全部来自 `theme/brand` 单源
- [x] 已登录态访问 `/login` → 重定向设备列表

忘记密码链路（验收前置：后端 SMTP 已手工配置）：
- [ ] `resetPasswordRequest` 提交邮箱 → 调发信 API，成功提示
- [ ] 邮件链接落 `resetPassword` → 两次输入一致性 + 密码策略强度提示 → 成功 → 落登录页
- [x] token 过期 → `passwordResetLinkExpired` 页

激活 / 创建密码：
- [ ] 激活邮件链接落 `createPassword` → 设置成功 → 落登录页
- [x] 激活链接过期 → `activationLinkExpired` 页
- [ ] 密码策略过期用户：登录后被引导走 `resetExpiredPassword`

登出：
- [x] 用户菜单登出 → 清 localStorage 四键 → 落登录页；WS 连接关闭

MFA（M4）：
- [x] 已启用 2FA 用户密码正确后 → `login/mfa` 验证码页 → 通过落默认页〔M4 ✅：密码正确按 `scope=PRE_VERIFICATION_TOKEN` 分流先存 token 再跳验证码页；错码字段错误「验证码不正确」、正确算码落 `/devices`（TA 默认页）；「试试其他方式」切 provider、备份码登录（8 位 hex 输入形态）、`?redirect` 透传、`/login/mfa` 别名 + 守卫（无中间态回登录页）均真机走查；TOTP 无发码 / 重发按钮（parity）；挂起：SMS / EMAIL 发码真实链路（短信网关 / SMTP 前置，沿用 M3 口径）〕
- [x] force-mfa 策略命中用户 → `login/force-mfa` 强制设置流〔M4 ✅：SA 两步验证页设强制策略（TENANT_ADMINISTRATORS + tenantsIds）→ 未配置用户密码登录自动跳 `/user/force-mfa` → SETUP（全新账号正确滤掉 BACKUP_CODE）→ TOTP 二维码 + secret → 算码激活 → SUCCESS → 登出重登走验证码；验完强制策略已解除〕

OAuth2（M4，验收前置：sys 已配置 provider，见 3.7）：
- [ ] 登录页出现 provider 按钮 → 跳转授权 → 回调建会话 → 落默认页；失败 / 拒绝态对齐 ui-ngx〔M4 失败链过：SA 配置测试 client + domain 后登录页出现「Sign in with {name}」按钮（单 client 形态 + or 分隔线，>1 client 分组标题）→ 点击真实 302 跳到 provider 授权页（实验真实到达 Google，假 clientId 被 provider 侧拒绝）；失败回调 `?loginError=` → 不可关闭对话框展示服务端原文 → OK 后 query 清除；成功回调消费以 `/?accessToken=&refreshToken=` 真实 token 对模拟核验（query 清除 + 落角色默认页 SA→`/tenants`）。挂起：真实 IdP 的授权成功全流程（同 M3 IdP 前置口径，测试用 domain + client 已删除还原）〕

### 3.2 应用壳（M1）

> M1 验收（2026-09-01）：4/5 勾。两项挂起：①「SA 登录落 /tenants」——M1 临时落 `/home` 临时首页（明确提示 sys 域 M3 交付），待 M3 sys 域页面在场后复验；②「面包屑随路由」——未实现（结构性遗留，头部形态取舍见修订记录）。

- [x] 三角色菜单集正确（SA：sys 域；TA：tenant 域全量；CU：设备 / 资产 / 告警 / 仪表盘四项）
- [x] 无权限路由手输 → 拒绝（403 形态对齐 ui-ngx）
- [x] locale 切换即生效并持久化；双语完整由 CI `check-locale` 门禁兜底
- [x] 404 → 重定向设备列表；面包屑随路由（M2 ✅：ADR 0008 PageContainer 面包屑落地，动态段实体名随路由验收）
- [x] SA 登录落 `/tenants`，TA / CU 落 `/devices`（M3 ✅：`roleDefaultPath` SA → `/tenants`，登录 / `/` entry / 404 回退三处同源；M1 临时 `/home` 页面、路由与文案已删）

### 3.3 设备域（M1）——资产 / 实体视图 / 网关按 3.4 差分引用本节

列表：
- [ ] 分页 10/20/30 + 服务端排序 + URL 参数同步（page / pageSize / sortOrder / 过滤项），可书签恢复
- [ ] 服务端文本搜索（防抖）
- [ ] profile 自动补全过滤 + active 下拉（any / active / inactive）
- [ ] URL 带 `deviceProfileId` / `active` 初始化过滤
- [ ] 多步新建向导：profile 选择 → 名称 / label → 凭证配置（三类型）→ 连通性检查结果展示 → 完成入列
- [ ] 凭证 dialog：按凭证类型查看 / 复制（token / 证书 / client id+secret）、重置（二次确认）
- [ ] 连通性检查 dialog：独立入口 + 排障输出对齐 ui-ngx
- [ ] 批量删除 / 批量分配客户 / 批量取消分配（确认弹窗 + 结果 toast）
- [ ] CSV 导入：文件选择 → 列映射 → 导入进度 / 结果（对齐 `ImportDialogCsv`）
- [ ] 行删除（二次确认）

详情 10 tab：
- [x] `details`：编辑 / 保存 / 离开未保存确认；字段校验
- [x] `attributes`：CLIENT / SERVER / SHARED scope 切换；服务端 / 共享属性新增 / 编辑 / 删除；WS 推送下表格自动更新（≤5s）
- [x] `latest telemetry`：表格 WS 实时刷新；点击 key → 历史折线图 dialog（timewindow presets + 自定义区间）
- [x] `alarms`：预填实体过滤的告警 tab（见 3.6）
- [x] `events`：事件类型过滤 + 分页（默认 ERROR）
- [x] `relations`：方向 / 实体类型过滤 + 增删
- [x] `audit-logs`：实体作用域审计，列集对齐（createdTime / actionType / actionStatus / userName）
- [x] `calculated-fields` / `alarm-rules` / `version-control`：tab 能力对齐（VC：auto-commit 设置、提交、版本对比、恢复；不跳 VC 独立页）

> M1 验收注（2026-09-01）：详情 10 tab 全勾。范围口径：calculated-fields 面板交付 SIMPLE 形态、alarm-rules 面板交付单阈值形态——SCRIPT / GEOFENCING 等复杂编辑器与表达式工程随 v2 编辑器阶段，登记于修订记录；alarm tab 订阅快照上限 100 条（历史超窗不可见）为已知限制，待告警域（M3）全局页一并权衡。

### 3.4 资产 / 实体视图 / 网关（M2）

- [x] 资产：与 3.3 同构，无 `events` tab（8 tab）；CSV 导入 + 批量分配 / 删除〔M2 ✅；实测口径：8 tab = 无 details tab、含 TA-only calculated-fields / alarm-rules / audit-logs / version-control（ui-ngx 原文为准）；行操作含 make-public / make-private（原则 1）〕
- [x] 实体视图：6 tab 且禁添加遥测；实体选择器表单（目标设备 / 资产 + keys 时间起点）parity〔M2 ✅；6 tab 同样无 details tab〕
- [ ] 网关：设备列表变体（gateway profile 过滤），行操作对齐〔裁定 2026-09-01：**推迟 M5**——ui-ngx 的 `/entities/gateways` 实为系统仪表盘页（非列表），后端亦无 gateway profile 过滤 API；随 M5 仪表盘只读按 ui-ngx 真实形态交付，#9 已留痕〕

### 3.5 客户域 + 用户管理（M2）

- [x] `customers` CRUD；详情 7 tab（attributes / latest / alarm-rules / alarms / relations / audit-logs / version-control）〔M2 ✅；7 tab 无 details tab；审计 tab 按客户作用域端点读取（ui-ngx CUSTOMER 模式）〕
- [x] 作用域页 ×4（users / devices / assets / dashboards）：进入即过滤该客户，操作集对齐〔M2 ✅；dashboards 页为最小面：列表 + 指派 / 取消指派，渲染归 M5〕
- [x] 设备 / 资产分配：单行 + 批量 + 详情页内取消分配〔M2 ✅〕
- [x] `users` 六操作；新增选 authority + 所属客户；重置密码 / 重发激活走邮件链路（前置同 3.1）〔M2 ✅；「重置密码」实为展示激活链接（后端无专属端点，ui-ngx parity，登记 BCR C-11）；loginAsUser 为 SA 专属，随 SA 域 M3〕
- [x] CU 登录：菜单四项、无 CRUD 按钮、数据只含所属客户作用域〔M2 ✅ 现存项；四项中告警（M3）/ 仪表盘（M5）随各自里程碑补齐〕

### 3.6 告警域（M3）

> M3 验收注（2026-09-02）：5/5 勾。全局页双 tab（告警 / 告警规则）真机走查通过：severity chip 过滤进 URL 并书签恢复、ack 状态翻转与新告警自动呈现均 ≤5s（WS 双通道复验）、详情 dialog 全字段 + 评论时间线、alarm-rules 挂载 DEVICE 的 CRUD 全链路。timewindow 过滤器（所有时间默认 + 11 档预设 + 自定义起止 RangePicker）随验收补齐（90a9310fae）并复验通过。遗留口径：传播开关的 REST 种子口径登记 C-12；alarm-rules 导出缺登记 C-13。

- [x] 全局告警页过滤全量：状态 chip 多选、类型多选、assignee、传播开关（searchPropagatedAlarms）、文本搜索、timewindow〔M3 ✅：全量交付且 URL 书签恢复（`tw` / `twStart` / `twEnd`，非法区间回退全时）；复验覆盖预设档过滤、UI 输入自定义起止、刷新恢复、预设与自定义两种窗口下 WS 实时呈现不受影响〕
- [x] 操作：ack / clear（单 + 批）、删除（单 + 批，确认）、详情 dialog（全字段 + 时间线）〔M3 ✅；真机复验单条 ack / 删除确认 / 详情时间线，批量多选 + 批量 mutations 代码面在场〕
- [x] 数据通道 = AlarmData WS 订阅（非 REST 轮询）；新告警呈现 ≤5s〔M3 ✅：DEVICE + ASSET 双通道合并订阅；REST `/api/v2/alarms` 仅作首帧种子（C-12）〕
- [x] 实体内告警 tab 预填实体过滤，复用同一组件〔M3 ✅：实体 tab 面板与全局页共用告警列 / 分配核心组件〕
- [x] `alarm-rules` 列表 + 详情（条件 / 调度 / 详情场景配置表单 parity）〔M3 ✅ 口径微调：条件 = 单阈值形态（同 3.3 CF/AR 口径，复杂编辑器随 v2）；后端 `/api/alarm/rule` 实体即无 schedule 字段（上游契约，非前端裁剪）；编辑弹窗口径 = 名称 + 调试模式，改条件需重建规则〕

### 3.7 sys admin（M3）

> M3 验收注（2026-09-02）：4/4 勾。SA 线七项真机走查全过（登录落点 / 菜单与 403 / 租户 CRUD 往返 / 作用域用户页六操作 + loginAs / 租户配置 set-default 与保护 / settings 五页渲染 / 审计 URL 书签恢复）。邮件与 OAuth2 登录链路的端到端验收仍前置 sys 侧 SMTP / IdP 配置（见 3.1）。已知小瑕疵：oauth2 表格分页本地状态（C-18）、2FA 强制策略租户选择器降级 tags（C-17）。

- [x] `tenants` 列表 / 新增（含 tenant profile 选择）/ 编辑 / 删除；`tenants/:id/users` 六操作〔M3 ✅；新增含 profile 自动补全，删除二次确认；loginAs 按 `GET /api/user/tokenAccessEnabled` 开关门禁，换号后整页重载落新角色默认页（access 与 WS 会话随新 token 重建，验收中发现 SPA replace 卡 403 的缺陷已修复）〕
- [x] `tenantProfiles` 列表 / 详情（配置表单 parity）〔M3 ✅；9 配置组全量渲染 + 保存往返 + export；set-default 确认插值缺陷已修复；default 行禁删禁选保护真机复验〕
- [x] settings v1 子集五页：general、outgoing-mail（连接测试）、2fa（提供方策略）、oauth2（domains / clients CRUD + 模板）、auditLogs（系统域过滤）〔M3 ✅；五页逐页渲染走查通过；testMail / generate-token 跳转等外发动作未在验收中真实触发（依赖外部 SMTP / IdP，转 M4 前置）〕
- [x] SA 侧审计日志列集与过滤对齐（timewindow / actionType / status）〔M3 ✅；`?actionTypes=…` 直接打开生效，拉取真实日志复验〕

### 3.8 实体 profile 管理（M3）

> M3 验收注（2026-09-02）：3/3 勾。deviceProfiles 7 tab / assetProfiles 5 tab 切换渲染走查通过；isDefault 保护（列表禁选、default 详情无删除入口）与 set-default 双向切换复验；set-default 确认框 `{name}` 不插值的 ICU 缺陷已修复。遗留：LWM2M/SNMP 深配置 JSON 往返（C-15）、OTA 变更无影响确认（C-14）、profile 导入未做（C-16）。

- [x] deviceProfiles / assetProfiles 列表 + 详情全 tab（general / transport / alarm rules / provisioning / dashboards / relations / audit）〔M3 ✅；tab 集按实体事实组装：device = 详情/传输/计算字段/告警规则/预配置/审计/版本控制 7 tab，asset = 详情/计算字段/告警规则/审计/版本控制 5 tab〕
- [x] profile 内 default dashboard 选择器只选不编（原则 3）〔M3 ✅；DashboardSelect 仅选择，仪表盘编辑随 M5〕
- [x] isDefault profile 保护逻辑对齐（不可删除 / 提示切换）〔M3 ✅；default 行勾选禁用 + 详情无删除/设默认入口，set-default 后保护随之迁移真机复验〕

### 3.9 账户安全域（M4）

> M4 验收注（2026-09-02）：3/3 勾。profile 资料保存链（真机保存后 API 对照持久化、语言即时切全站 + `additionalInfo.lang` 持久、静默刷 token）与 security 改密码全链路（错旧密码服务端原文落旧密码字段、策略清单实时校验前端拦截、改密成功新密码重登后已还原原密码）真机走查通过；2FA 卡 TOTP / BACKUP_CODE 启用、默认方式切换、停用确认、重生成备用码全过；用户菜单新增个人资料 / 安全两入口、侧边栏不出现 account 组。遗留口径：API keys 卡不建（经复核非后端契约缺口，见修订记录）；SMS / EMAIL 发码与真实 IdP 成功链挂起（前置同 3.1）。

- [x] `account/profile`：资料编辑 + locale〔M4 ✅：email / firstName / lastName / phone / language 单卡表单；保存链 = saveUser(sendActivationMail:false) → initialState 更新 → 语言变更即切全站 → 静默刷 token；firstName / phone 真机保存后 API 对照持久化；选 English 全站即时切换 + `additionalInfo.lang=en_US` 持久；切「跟随」删除 lang 键（不强制切回界面语言，v1 口径）；dirty 离开确认〕
- [x] `account/security`：改密码（旧密码校验）；2FA 启用 / 停用流（按 sys 配置的提供方）〔M4 ✅：改密码全链路（错旧密码 →「Current password doesn't match!」落旧密码字段；策略清单实时校验前端拦截；改密成功 → 新密码重登 → 已还原 tenant 原密码）；JWT token 卡（有效期 + 复制 Bearer）；2FA 卡 = TOTP（二维码 + secret 明文 + 算码验证）/ BACKUP_CODE（codes 一次性展示 + 下载 txt + 打印）启用、默认方式切换、停用（确认框）、重生成备用码（旧码作废提示）全过〕
- [x] MFA / OAuth2 登录链路见 3.1〔M4 ✅：MFA 两项全勾（见 3.1）；OAuth2 失败链过、真实 IdP 成功链挂起（口径随 3.1）〕

### 3.10 仪表盘只读（M5）

- [ ] 列表操作集对齐：export / import JSON、assign to customers（单 + 批）、make public / manage customers、删除
- [ ] 只读页：state 切换（default / entity 两 controller、URL base64 state 契约沿用 #6）；全局 timewindow（presets + 自动刷新）；toolbar 全量（编辑器入口按原则 3 隐藏）
- [ ] `dashboard/:id` 全屏 single-page 模式
- [ ] `usage` 页随仪表盘渲染交付
- [ ] 布局：断点覆盖 / mobile 单列（#6 RGL 完全受控模式）
- [ ] **widget 验收锚点**：CE 自带全部 demo 仪表盘渲染无「暂未支持」占位；四类先行（时序折线 / 柱状、值卡片、实体表格、gauge）→ 其余按 demo 需要补齐；锚点外冷门类型允许占位（登记于第 8 节）

### 3.11 横切验收（全页适用，M6 全绿）

- [ ] 认证：401 刷新单飞（并发挂队重放、失败登出、豁免登录 / 刷新端点）；WS 首帧 AUTH、AUTH 失败刷新 → 重连 → 重发
- [ ] WS 订阅管理器：8 族 cmd；断线重连（2s×2^n 封顶 60s，上限 10 次）后页面自动恢复，无需手动操作；零订阅 90s 关连；cmd 批量 ≤10
- [ ] 新鲜度：本地环境遥测 / 告警变更呈现 ≤5s
- [ ] 错误态：后端错误原文透传 + 通用壳文案（`server-error.ts`）；网络断开全局提示
- [ ] 空态 / 加载态：每列表与详情 tab 均有；删除类操作二次确认
- [ ] 双语：zh-CN / en-US key 全等（CI 门禁零红）；HTTP 层发 Accept-Language
- [ ] 品牌：title / logo / favicon / 登录背景单源 `theme/brand`（三处漏风点全封，#8）
- [ ] 三角色菜单 / 按钮门禁全覆盖（`access.ts` 对齐 Authority）
- [ ] 遥测数字列 tabular-nums；CJK 字体栈生效（#8）
- [ ] 列表页 URL 状态可书签恢复（分页 / 排序 / 过滤）

## 4. 里程碑（每段独立可演示）

| 段 | 内容 |
|---|---|
| M1 | 基建 + 登录密码线 + 设备域全量。#8 全部落地时序硬约束在本段完成：`theme/brand` + `theme/charts.ts` 先于首个图表组件、biome `useExhaustiveDependencies` 重开先于首批业务代码、`check-locale` 门禁与首个双语 commit 同步、Node 钉版冒烟、dev proxy（`/api/ws` 排在 `/api` 前） |
| M2 | 资产 + 实体视图 + 客户域 + 用户管理（网关推迟 M5，2026-09-01 裁定） |
| M3 | 告警域 + sys admin 全家 + 实体 profile 管理 |
| M4 | 账户安全域 + MFA 登录线 + OAuth2 登录线 |
| M5 | 仪表盘只读 + usage 页 + widget 补齐至 demo 锚点 |
| M6 | 收口：横切全绿 + 一步切换演练 + 测试基线 + 遗留清单 → gate 评审 |

## 5. v2（编辑器阶段）进入条件——四条缺一不进

1. v1 每页 checklist 全绿（含 3.11 横切章）
2. 一步切换部署演练成功一次（新 UI 产物替换 ui-ngx 后由单体服务；通道依 #10 定案）
3. 测试形态定案且最小回归基线落地（见新票「测试形态定案」）
4. v1 遗留限制清单成文（第 7 节登记的种子清单）且逐条确认无阻断

> v2 编辑器实现路线已定案（#13 → ADR 0004）；其操作级验收面见 `docs/spec/v2-editors-acceptance.md`（活文档，独立票定稿）。


## 6. 边界裁定记录（#9 决议评论同步留痕）

| # | 事项 | 裁定 | 依据 |
|---|---|---|---|
| 6.1 | 实体视图 / 网关 / 设备与资产 profile 管理 | v1 | 未在 Q9-Q17 枚举；entities / profiles 域家族完整 + parity 精神 |
| 6.2 | `customers/:id/edgeInstances` 作用域页与一切 Edge 操作（含设备 assign to edge） | v2 | 依赖 Edge 子系统 |
| 6.3 | `alarm-rules` 独立页 | v1 | 与已定的 alarm-rules tab 同实体同 API，割裂无意义 |
| 6.4 | `account/notificationSettings` tab | v2 | 属通知子系统 |
| 6.5 | `usage` 页 | v1，随 M5 交付 | 本质为仪表盘渲染 |
| 6.6 | 计数勘误 | Round 3 口头「九个子系统」经清点实为八个 + usage 页进 v1 | — |

## 7. v1 遗留限制登记（M6 成文基线的种子）

- Edge 全域、通知中心全域、OTA、版本控制独立页、资源库（widget 类型 / 包库、图片库、SCADA 符号、JS 库、资源文件）、计算字段独立页、mobile-center、iot-hub（BCR 保留，见 #7）
- home dashboard 首页（v1 登录落 `/devices`）
- settings 其余 tab（queues / notifications / home / repository / auto-commit / trendz / ai-models）
- widget 冷门类型（demo 锚点外）渲染占位
- MFA / OAuth2 / 邮件链路可用性依赖 sys 侧正确配置（outgoing-mail / 2fa / oauth2）；MFA 的 SMS / EMAIL 发码真实链路另依赖短信网关 / SMTP 真实通道
- CSV 导入仅设备 / 资产（parity 即如此）
- 无双 UI 共存（一步切换，建图已钉死）

## 修订记录

- 2026-08-31：初版定案（#9 三轮 grilling：Round 1 骨架八问、Round 2 九域「全都要」、Round 3 边界 / 里程碑 / widget 锚点收口）。
- 2026-09-01：**M1 验收落账**（终验收 488 次操作核验 + 修复轮 5 commit）。3.1 密码线 7/11（4 项邮件链路待 SMTP 前置）；3.2 应用壳 3/5（SA 落点待 M3；**面包屑未实现**——结构性遗留，头部形态取舍「自定义头 vs ProLayout PageContainer」待 M2 开工前决议）；3.3 列表 10/10 + 详情 10/10（CF=SIMPLE / AR=单阈值范围口径见 3.3 注）。验收中修复 4 个真实缺陷：alarm-data WS 通道直落详情页失联（建连竞态 + 三处后端契约不匹配）、tabular-nums 对 string 管道值失效、CU 凭证 Reset 禁用改隐藏（越权入口收口）、详情返回箭头绕过未保存守卫。WS 实时链路修复后端到端复验 ≤5s（3.11 新鲜度核心项提前达标）。后端缺口候选 8 条登记 `docs/bcr.md`，待阶段边界集中复审。

- 2026-09-01（二）：**M2 落账**（资产 / 实体视图 / 客户域 / 用户管理四域；网关经裁定推迟 M5，见 §3.4 注与 #9 留痕）。架构：头部形态定案官方 PageContainer（ADR 0008）——§3.2「面包屑随路由」随之收口；设备详情 10 tab 面板参数化为实体通用组件（`components/entities`），四域按 ui-ngx 事实组装 tab 集（details 表单上移页头区，资产 8 / 客户 7 / 实体视图 6）。验收：真机四棒 65/65 项全过（资产 19 / 实体视图 16 / 客户域 16 / 用户+横切 14），累计修复 8 处（含实体视图类型输入阻断级缺陷、用户行菜单缓存不失效、客户审计 tab 改客户作用域端点）。口径微调：「重置密码」= 展示激活链接 + 重发激活（BCR C-11）；作用域 dashboards 页最小面（渲染归 M5）；资产无 active 过滤（后端无字段）；loginAsUser 随 SA 域 M3。BCR：C-1 提前复审维持 fallback，新增 C-9～C-11。遗留观察（M6 横切）：全局与组件级错误提示双份待收敛。

- 2026-09-02：**M3 落账**（告警域 / sys admin / 实体 profile / settings 四域 + 横切收尾）。交付：全局告警页双 tab（AlarmData WS 双通道 DEVICE+ASSET 合并、过滤全量进 URL、批量 ack/clear/删除、详情 dialog 含评论时间线）+ alarm-rules 全局 CRUD（新实体 `/api/alarm/rule`）；tenants 列表/详情(4 tab)/作用域用户页（共享 UsersTable 组件化）+ loginAsUser（tokenAccessEnabled 开关门禁）+ tenantProfiles（9 配置组 + 队列编辑器 + export）；settings 五页全交付（general/connectivity 双卡片、outgoing-mail 含测试邮件与 OAuth2 token 流、2fa 四 provider 策略、oauth2 domains+clients 模板驱动、audit-logs URL 全量）；deviceProfiles 7 tab / assetProfiles 5 tab 全量。验收：门禁三绿（biome+locale+tsc / vitest 521 / build）+ 三角色 14 项真机走查逐项通过（含 CU 经激活链接建号全流程）。§3.2 SA 落点项收口：SA 登录落 `/tenants`，M1 临时 `/home` 页面删除（entry 保留）。验收修复 3 处：①loginAsUser 换号后 SPA replace 卡 403（umi layout 按 pathname 记忆匹配路由、access 重算不生效）且 WS 会话仍持旧 token——改整页重载落新角色默认页；②set-default 确认框 `{name}` 字面量（ICU `'{name}'` 引号转义大括号）——zh 改弯引号、en-US 双写引号共 29 处字符串修复；③profiles 遗留测试类型对齐（OtaPackageType enum）。口径微调：alarm-rules 编辑弹窗仅名称 + 调试模式（改条件需重建）；timewindow 过滤器（所有时间默认 + 11 档预设 + 自定义起止 RangePicker，WS 自定义区间映射 startTs + timeWindow、REST 传 startTime/endTime，URL `tw/twStart/twEnd` 书签恢复）由 alarm-dev 随验收补齐（90a9310fae），收口复验通过——预设档过滤、UI 输入自定义起止、刷新恢复、两种窗口下 WS 实时呈现均真机核验。BCR：C-1 M3 边界复审维持 fallback（批量端点排期随 M6 后端会话合议），新增 C-12～C-18。遗留登记：SMTP / IdP 前置链路（测试邮件、邮件激活、OAuth2 登录）转 M4 前置复验；Playwright 冒烟基线未建（M1/M2/M3 均未落基建，测试基线 §3.3 M3 三行随 M6 前统一补齐）。

- 2026-09-02（二）：**M4 落账**（账户安全域 + MFA 登录线 + OAuth2 登录线）。交付：account/profile 单卡表单（email / 姓名 / 电话 / 语言；保存链 = saveUser → initialState 更新 → 语言变更即切全站 → JWT claims 变更静默刷 token）；account/security 三卡（JWT token 有效期 + 复制 Bearer / 改密码含密码策略实时校验与服务端错误按 detail 分派 / 2FA 卡按平台 providers 组装 TOTP·SMS·EMAIL·BACKUP_CODE 启用对话框 + 默认方式切换 + 停用确认 + 重生成备用码）；登录线 MFA 分流（login 响应 `scope=PRE_VERIFICATION_TOKEN` / `MFA_CONFIGURATION_TOKEN` 两中间态先存 token 再跳）+ `/user/mfa` 验证码页（多 provider「试试其他方式」切换、备份码 8 位 hex、429 限流倒计时）+ `/user/force-mfa` 强制设置流（SETUP→输入→验码→SUCCESS，全新账号滤 BACKUP_CODE、首个激活 provider 自动设默认）+ `/login/mfa`、`/login/force-mfa` 别名 redirect + 双守卫（authority 不符回登录页）；OAuth2 登录线（登录页 noauth/oauth2Clients 按钮区 + or 分隔、entry 消费 `?accessToken=&refreshToken=` 回调落角色默认页、`loginError` 不可关闭对话框）；用户菜单新增个人资料 / 安全两入口。验收：门禁三绿（biome + check-locale + tsc / vitest 620——M4 新增约 90 用例 / max build 含 account·profile 与 account·security 产物）+ §3.9 三项、§3.1 MFA 两项全勾，OAuth2 走失败链口径（真实 302 到 provider 授权页——实验真实到达 Google、假 clientId 被 provider 侧拒绝 → `loginError` 对话框链完整；成功回调以真实 token 对模拟消费核验）。期间修复缺陷 5 枚（均带渲染级测试）：①M3 settings/two-fa 设置页每次 UI 保存清空 providers——根因保存路径把 payload 变换跑了两遍（c25b34d438）；②同页 enforce 关闭时保存崩溃 + 强制过滤字段丢失——validateFields 不含未注册字段，改读完整 store + builder fallback（含于 c25b34d438）；③token-store 拒收 MFA 中间态 null refreshToken 致 2FA 用户卡死登录步（ce41fdafe8）；④account/security 备用码弹窗一次性展示被 onSaved 无条件关窗（7b4a280f70）；⑤侧边栏多出 Account 菜单项——父路由补 hideInMenu（087444c75f）。伴生实现：登录页对中间态的回弹环防护、getInitialState 对 MFA 中间态跳过 getCurrentUser（防 403 死循环，9185dc9cc2）。parity 微调口径：OAuth2 按钮 icon 用通用图标不解析 mdi 图标库；security 页 API keys 卡不建——施工简报原判「openapi 快照无 `/api/user/{id}/apiKeys` 端点」经落账复核不成立（`/api/apiKey*` 五端点在后端源码与 openapi 快照均在、ui-ngx 服务层同路径消费），实为 §3.9 v1 口径（资料编辑 + 改密码 + 2FA）未列该项的范围裁剪，非契约缺口；homeDashboard 选择器 / unitSystem 不在 §3.9 v1 口径；mfa 页 BACKUP_CODE 无自动发码（无码可发，设计如此）；「跟随」语言不强制切回界面语言；侧边栏无 account 组。前置挂起（沿用 M3 口径）：SMS / EMAIL 发码真实链路（短信网关 / SMTP 配置）、OAuth2 真实 IdP 授权成功全流程。数据还原终态：tenant 密码还原、tenant 2FA 配置移除（纯密码登录）、强制策略解除、OAuth2 测试 domain + client 删除；平台 2FA providers（TOTP + BACKUP_CODE）保持启用态为有意保留。BCR：M4 边界复审无新条目（缺陷均为前端侧，API keys 复核排除契约缺口）。
