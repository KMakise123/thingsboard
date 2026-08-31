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

密码登录：
- [ ] 正确凭据登录成功 → 落设备列表（有 `redirectUrl` 则回跳）
- [ ] 错误凭据 → 后端错误原文透传展示，不白屏
- [ ] 品牌接缝生效：logo / 标题 / favicon / 登录背景全部来自 `theme/brand` 单源
- [ ] 已登录态访问 `/login` → 重定向设备列表

忘记密码链路（验收前置：后端 SMTP 已手工配置）：
- [ ] `resetPasswordRequest` 提交邮箱 → 调发信 API，成功提示
- [ ] 邮件链接落 `resetPassword` → 两次输入一致性 + 密码策略强度提示 → 成功 → 落登录页
- [ ] token 过期 → `passwordResetLinkExpired` 页

激活 / 创建密码：
- [ ] 激活邮件链接落 `createPassword` → 设置成功 → 落登录页
- [ ] 激活链接过期 → `activationLinkExpired` 页
- [ ] 密码策略过期用户：登录后被引导走 `resetExpiredPassword`

登出：
- [ ] 用户菜单登出 → 清 localStorage 四键 → 落登录页；WS 连接关闭

MFA（M4）：
- [ ] 已启用 2FA 用户密码正确后 → `login/mfa` 验证码页 → 通过落默认页
- [ ] force-mfa 策略命中用户 → `login/force-mfa` 强制设置流

OAuth2（M4，验收前置：sys 已配置 provider，见 3.7）：
- [ ] 登录页出现 provider 按钮 → 跳转授权 → 回调建会话 → 落默认页；失败 / 拒绝态对齐 ui-ngx

### 3.2 应用壳（M1）

- [ ] 三角色菜单集正确（SA：sys 域；TA：tenant 域全量；CU：设备 / 资产 / 告警 / 仪表盘四项）
- [ ] 无权限路由手输 → 拒绝（403 形态对齐 ui-ngx）
- [ ] locale 切换即生效并持久化；双语完整由 CI `check-locale` 门禁兜底
- [ ] 404 → 重定向设备列表；面包屑随路由
- [ ] SA 登录落 `/tenants`，TA / CU 落 `/devices`

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
- [ ] `details`：编辑 / 保存 / 离开未保存确认；字段校验
- [ ] `attributes`：CLIENT / SERVER / SHARED scope 切换；服务端 / 共享属性新增 / 编辑 / 删除；WS 推送下表格自动更新（≤5s）
- [ ] `latest telemetry`：表格 WS 实时刷新；点击 key → 历史折线图 dialog（timewindow presets + 自定义区间）
- [ ] `alarms`：预填实体过滤的告警 tab（见 3.6）
- [ ] `events`：事件类型过滤 + 分页（默认 ERROR）
- [ ] `relations`：方向 / 实体类型过滤 + 增删
- [ ] `audit-logs`：实体作用域审计，列集对齐（createdTime / actionType / actionStatus / userName）
- [ ] `calculated-fields` / `alarm-rules` / `version-control`：tab 能力对齐（VC：auto-commit 设置、提交、版本对比、恢复；不跳 VC 独立页）

### 3.4 资产 / 实体视图 / 网关（M2）

- [ ] 资产：与 3.3 同构，无 `events` tab（8 tab）；CSV 导入 + 批量分配 / 删除
- [ ] 实体视图：6 tab 且禁添加遥测；实体选择器表单（目标设备 / 资产 + keys 时间起点）parity
- [ ] 网关：设备列表变体（gateway profile 过滤），行操作对齐

### 3.5 客户域 + 用户管理（M2）

- [ ] `customers` CRUD；详情 7 tab（attributes / latest / alarm-rules / alarms / relations / audit-logs / version-control）
- [ ] 作用域页 ×4（users / devices / assets / dashboards）：进入即过滤该客户，操作集对齐
- [ ] 设备 / 资产分配：单行 + 批量 + 详情页内取消分配
- [ ] `users` 六操作；新增选 authority + 所属客户；重置密码 / 重发激活走邮件链路（前置同 3.1）
- [ ] CU 登录：菜单四项、无 CRUD 按钮、数据只含所属客户作用域

### 3.6 告警域（M3）

- [ ] 全局告警页过滤全量：状态 chip 多选、类型多选、assignee、传播开关（searchPropagatedAlarms）、文本搜索、timewindow
- [ ] 操作：ack / clear（单 + 批）、删除（单 + 批，确认）、详情 dialog（全字段 + 时间线）
- [ ] 数据通道 = AlarmData WS 订阅（非 REST 轮询）；新告警呈现 ≤5s
- [ ] 实体内告警 tab 预填实体过滤，复用同一组件
- [ ] `alarm-rules` 列表 + 详情（条件 / 调度 / 详情场景配置表单 parity）

### 3.7 sys admin（M3）

- [ ] `tenants` 列表 / 新增（含 tenant profile 选择）/ 编辑 / 删除；`tenants/:id/users` 六操作
- [ ] `tenantProfiles` 列表 / 详情（配置表单 parity）
- [ ] settings v1 子集五页：general、outgoing-mail（连接测试）、2fa（提供方策略）、oauth2（domains / clients CRUD + 模板）、auditLogs（系统域过滤）
- [ ] SA 侧审计日志列集与过滤对齐（timewindow / actionType / status）

### 3.8 实体 profile 管理（M3）

- [ ] deviceProfiles / assetProfiles 列表 + 详情全 tab（general / transport / alarm rules / provisioning / dashboards / relations / audit）
- [ ] profile 内 default dashboard 选择器只选不编（原则 3）
- [ ] isDefault profile 保护逻辑对齐（不可删除 / 提示切换）

### 3.9 账户安全域（M4）

- [ ] `account/profile`：资料编辑 + locale
- [ ] `account/security`：改密码（旧密码校验）；2FA 启用 / 停用流（按 sys 配置的提供方）
- [ ] MFA / OAuth2 登录链路见 3.1

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
| M2 | 资产 + 实体视图 + 网关 + 客户域 + 用户管理 |
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
- MFA / OAuth2 / 邮件链路可用性依赖 sys 侧正确配置（outgoing-mail / 2fa / oauth2）
- CSV 导入仅设备 / 资产（parity 即如此）
- 无双 UI 共存（一步切换，建图已钉死）

## 修订记录

- 2026-08-31：初版定案（#9 三轮 grilling：Round 1 骨架八问、Round 2 九域「全都要」、Round 3 边界 / 里程碑 / widget 锚点收口）。
