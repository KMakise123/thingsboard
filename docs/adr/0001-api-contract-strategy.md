---
status: accepted
---

# API 契约策略：直接消费现有 REST/WS，BFF 否决，新契约落 /api/ext

AntD Pro 前端重写（见 wayfinder 地图 #1）与后端的关系定为**直接消费**：前端 api-client 层为唯一出口缝直打现有 `/api` REST 与单条多路复用 `/api/ws`，不引入任何中间服务进程。完整决议与论证：[#7](https://github.com/KMakise123/thingsboard/issues/7)（专家小队合议 + 红队质询 + 终审签字）；生成器验证：[#11](https://github.com/KMakise123/thingsboard/issues/11)。

## Considered Options

- **BFF 聚合层（否决）**：决定性理由是 WS——遥测实时订阅是 cmdId 关联的多路复用单 socket（含退避重连、重订阅状态机），BFF 对它要么纯增故障点零收益、要么整套重写订阅协议；同源部署（Tomcat 直接出静态资源）使 CORS 屏蔽与外部代理两大 BFF 实用理由结构性不存在；单人无双队可排，BFF 的组织学价值为零。**推翻条件**：出现第二消费方且组合逻辑复制成本实测高于一个受管进程的运维成本。
- **后端补齐优先（否决作为总路线）**：v1 最小运维切片所需接口零缺口（20 项已知缺口全是增强/遗留/文档问题），补齐应在前端证明缺口真痛之后才动后端。
- **进程内聚合端点（裁为升级通道）**：`/api/ext/**` 下经 BCR 登记的服务端聚合，零新增进程；首屏请求数放大被真实数据证明痛、或出现第二客户端时启用。

## 决策要点

1. **契约基线**：openapi.json 快照入库 + `openapi-typescript@7.13.0` types-only 生成 + service 层手写（3.1 原生支持，无需降转 3.0；spec 非权威，以手写 service 为准）。
2. **消费面裁剪**：双路径一律 V2、@Hidden 走三段式（硬禁 Deprecated → 找文档化孪生 → 登记例外放行）、分页显式传排序、错误判定 keyed on `ThingsboardErrorResponse.errorCode`、外部域不直连。
3. **缺口分诊**：五档（⓪规则消解 / ①前端绕行 / ②BCR / ③延后绑触发条件 / ④放弃），BCR 登记册一文件、条目绑定「消费功能 + fallback + 权限镜像源」。
4. **认证**：`Authorization` 头（弃 X-Authorization）、localStorage 四键（v1 现状级安全姿态）、刷新单飞 + 挂队重放、WS 首帧 AUTH；~~v2 widget 自定义 JS 落地时强制重开存储与 CSP 决策~~（**已履行**：#13/ADR 0004 裁定维持四键 + 不设限制性 CSP（TB JIT 同级姿态），widget 可读凭据登记为已知限制，缓解路径 = iframe 化四预留点；部署响应头下发移交 #10）。
5. **新契约落点**：`/api/ext/**` + 独立包 + append-only（不 inline 改上游行）；只做增量端点、禁平行 CRUD、每端点显式 @PreAuthorize 且权限镜像上游、ext 面禁 @Hidden。

## Consequences

- 登出/改密码的服务端失效语义有血统断裂限制（每次刷新换新 sessionId、旧 sid 漏网；refresh 非单次可重放 7 天；应急 kill switch = 改密码）——蓝图「已知限制」块有全文，勿凭直觉假设「登出即全失效」。
- WS 客户端（cmdId 状态机、重连、重订阅、首帧 AUTH）是 v1 一等交付物、预算单列，不是细节。
- 新前端 npm 依赖的 CVE 面成为 fork 自有职责（上游 yarn.lock 补丁自动失效）。
- cherry-pick 安全补丁触及 controller 时须按检查单核对 ext 包委托与权限镜像，并重生成 openapi 快照。
