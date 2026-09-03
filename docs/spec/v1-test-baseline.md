# v1 测试基线（测试形态定案）

- 状态：**定案**（2026-08-31，[测试形态定案](https://github.com/KMakise123/thingsboard/issues/12) grilling 三轮）
- 性质：v2 gate 第 3 条（[v1 范围与验收定案](https://github.com/KMakise123/thingsboard/issues/9) 第 5 节）「测试形态定案且最小回归基线落地」的验收载体
- 上游决议：#8 应用架构（构建级三件门 + CI 三 job）· #9 v1 范围与验收（checklist 人工形态）

## 0. 一句话定义

v1 测试 = **混合模式**：横切章与每域冒烟路径自动化，域内操作级细项保持 #9 spec 第 3 节的人工 checklist 勾选。

## 1. 定案原则

1. **测试是自有质量网，不受 parity 约束**：ui-ngx 测试存量为零（全仓 1 个 spec 文件、无 E2E），测试形态无对齐基准，按风险自定。
2. **单人全职约束**：自动化只投「人工测不出」（WS 时序、刷新竞态）与「回归代价最高」（widget 渲染、横切认证）的面，不追求覆盖率好看。
3. **门禁先于业务代码**（#8 模式）：M1 落测试骨架与首批门禁，此后每里程碑随域交付同步补，M6 收口清点。

## 2. 单元测试

- **必须有**：`core/` 全量——WS 订阅管理器（8 族 cmd 状态机、断线重连、零订阅关连、cmd 批量）、401 刷新单飞 + 挂队重放、`server-error.ts` 错误规范化、token-store、i18n 聚合工具、`theme/charts.ts` 色推导；`widgets/` 数据变换纯函数（datasource → 图表 props）。
- **不强求**：`services/`（薄契约封装，类型 + E2E 兜底）、页面组件层（E2E 冒烟兜底）。不强求 ≠ 禁止，不做评审要求。
- **工具**：vitest（官方脚手架 v6.0.3 预埋，弃用须同步删 tsconfig types——#8 已注）+ React Testing Library；WebSocket 以假 socket 类 mock。
- **覆盖率门禁**：仅 `core/`（lines 80% / branches 70%）与 `widgets/` 纯函数（85%）设 vitest coverage 阈值，低于即 CI 红；全局不设阈值（防组件层注水）。

## 3. E2E（Playwright）

### 3.1 运行环境

- **后端 = 本仓库后端代码直接运行**（开发者裁决，弃上游 release 镜像）：Maven 构建 + PostgreSQL 起单体（本地连本机 PG18 的 thingsboard 库 + demo 数据，CI 用 PG service 容器）。〔2026-09-03 修订：原表述「H2 demo profile」基于过时假设——上游已移除嵌入式 H2 demo 数据库，本仓全仓 pom 与 thingsboard.yml 均无 hsqldb/H2 依赖（M6 侦察实测）；PG 为唯一可行路径，不变量「陪练后端即本仓代码」不受影响。〕本地开发连 localhost 后端，CI 在 e2e job 内起进程。不变量：**陪练后端即本仓代码**——BCR 自有契约（`/api/ext/**`）落地后天然同步，无镜像切换条件。
- **种子脚本 = 交付物**（`ui-antd/e2e/seed/`）：三角色账号（SA / TA / CU）+ demo 数据（设备、告警、demo 仪表盘引用）。
- **错误注入**：Playwright `page.route` 在真实后端之上拦截（401 / 5xx）。WS 不可 mock（Playwright 能力边界），订阅类验收对真 socket 跑。
- CI e2e job 用 Maven 仓库 cache 缓解构建时长。

### 3.2 横切专项（全自动化，对应 #9 spec 3.11 人工测不出的部分）

1. 登录登出全链：正确凭据落页、错误凭据透传不白屏、`redirectUrl` 回跳、已登录访问 `/login` 重定向、登出清 localStorage 四键
2. 401 刷新单飞：并发挂队重放、失败登出
3. WS 断线重连后页面自动恢复（无需手动操作）
4. 后端错误原文透传 + 通用壳文案
5. 列表 URL 状态书签恢复（分页 / 排序 / 过滤）
6. 三角色菜单 / 路由门禁（403 形态对齐 ui-ngx）

### 3.3 冒烟矩阵（每域一条：进列表 → 搜索 → 开详情 → 切 tab → 返回）

| 域（里程碑） | TA | SA | CU |
|---|---|---|---|
| 设备（M1） | ☐ | — | ☐ |
| 资产 / 实体视图 / 网关（M2） | ☐ | — | ☐ |
| 客户域 / 用户管理（M2） | ☐ | — | — |
| 告警 + alarm-rules（M3） | ☐ | — | ☐ |
| sys admin（tenants / profiles / settings）（M3） | — | ☐ | — |
| 实体 profile 管理（M3） | ☐ | — | — |
| 账户安全域（M4） | ☐ | ☐ | ☐ |
| 仪表盘列表 + 只读（M5） | ☐ | — | ☐ |

合计约 21 条（TA 14 / SA 3 / CU 4，按域归并后如上）。按里程碑随域交付补，M6 时矩阵完整即基线完整。

### 3.4 不进自动化基线的链路（人工验收，#9 spec 3.1 / 3.9 checklist 保留勾选形态）

开发者裁决（Q8）：以下三链路**不做自动化**，前端实现 + 前后端对接连通性由人工验收保证：

- **邮件链路**（激活邮件 → createPassword、忘记密码 → resetPassword）：依赖 SMTP 外部配置，不引 Mailpit
- **MFA**（TOTP 验证、force-mfa 强制流）：依赖 sys 2FA 配置，不引 TOTP 工具库
- **OAuth2 全流程**：依赖 IdP；登录页 provider 按钮渲染进横切专项第 1 组断言

## 4. 视觉回归（窄做）

- **范围**：CE 自带全部 demo 仪表盘（#9 spec 3.10 widget 锚点的自动化形态）+ 登录页（品牌接缝三漏风点）。
- **工具**：Playwright 内置 `toHaveScreenshot`；不引 Storybook / Chromatic（单人无审查流，独立服务是负债）。
- **断言双保险**：DOM 断言（无「暂未支持」占位元素）+ 像素锚点（逐像素对比）。
- **baseline 截图进 git**；有意改版时显式 `--update-snapshots` 后提交，「故意改的」与「不小心弄坏的」由此分清。

## 5. CI 接线（#8 三 job 之上新增两个，均 required）

| job | 内容 | 备注 |
|---|---|---|
| ④ `test` | `vitest --coverage`（阈值门禁） | 快，分钟级 |
| ⑤ `e2e` | 构建并起本仓后端（PG service 容器 + demo 数据）+ 种子 + Playwright | `--retries=1`；Maven cache 减痛 |

既有三件门（biome check / tsc / build，#8）与 check-locale（#8/#9）不变。

## 6. flaky 政策

- e2e `--retries=1`：重试通过即绿，两次红才算红。
- 某测试连续两个里程碑 flaky ≥3 次 → 移出基线降为 nightly，不阻塞合并。

## 7. 落地时序

- **M1**：vitest + Playwright 骨架、后端起停与种子脚本、横切专项第 1 组（登录族）、`core/` 首批单测（订阅管理器、刷新单飞）——先于首批业务页面
- **M2-M5**：随域交付补冒烟矩阵行 + core / widgets 单测
- **M6**：本文档矩阵逐格勾选 + 全 job 绿 → gate 第 3 条证据

## 8. 最小回归基线清单（gate 第 3 条验收口径）

1. 三件门 + check-locale 全绿（既有）
2. 单测集：`core/` 全量 + `widgets/` 纯函数，覆盖率达标（第 2 节阈值）
3. E2E 横切专项 6 组全绿（第 3.2 节）
4. 冒烟矩阵三角色 × 全域全绿（第 3.3 节逐格）
5. 视觉锚点集全绿（第 4 节）

## 决策记录（三轮 grilling 摘要）

- Round 1（Q1-Q6）：混合模式 / 单测覆盖面与阈值 / 横切专项 + 冒烟矩阵规模 / 真实后端 + route 注入 / 视觉回归窄做 / 基线构成 + CI 接线 + 时序——全部接受推荐
- Round 2（Q7-Q9）：Q7 开发者裁决**推翻主席推荐**（上游镜像 → 本仓后端代码直跑，BCR 天然同步）；Q8 开发者裁决**认证三链路全人工**（弃 Mailpit / TOTP 自动化）；Q9 三项细节照单全收

## 修订记录

- 2026-08-31：初版定案（#12 三轮 grilling）。
- 2026-09-03：M6 收口修订——§3.1 运行环境 H2 → PostgreSQL（原表述基于过时假设：上游已移除嵌入式 demo 数据库，本仓无 H2/hsqldb 依赖；PG 为唯一可行路径，陪练后端=本仓代码不变量不变）；§3.2/§3.3 E2E 与种子脚本随 M6 统一补齐落地（M1~M3 均未落基建，见 #9 修订记录 M3 条）。
