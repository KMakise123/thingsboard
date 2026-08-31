---
status: accepted
---

# 一步切换部署：jar 通道复刻，v1 开发第一天翻转接线

ui-antd（AntD Pro 重写前端，见地图 [#1](https://github.com/KMakise123/thingsboard/issues/1)）的生产部署定为**复刻 ui-ngx 的 jar 通道**，且接线翻转发生在 v1 开发第一天而非验收日。完整决议与论证：[#10](https://github.com/KMakise123/thingsboard/issues/10)（两轮 grilling + 终审确认）；接线事实依据：[#4](https://github.com/KMakise123/thingsboard/issues/4)（research/build-deploy 清单）。

## Considered Options

- **nginx 独立静态服务（否决）**：改变部署拓扑——新增运维组件、haproxy/docker 编排重排、单体 deb/rpm 不再含 UI。对上游 docker/haproxy 的大改加重安全补丁 merge 的冲突面，与「自有版本、仅跟进上游安全补丁」的 fork 姿态相悖；单人全职下，14 项已知点位（#4 §4）的一次性小改动优于新组件的长期维护负担。
- **v1 验收日一次性翻转（否决）**：接线坑只有真实构建链跑起来才暴露；验收日叠加「验收 + 大切换」双变更会让排障归因混淆。第一天翻转使整个 v1 攻坚期的构建链即生产形态——系统未上线，半成品 jar 进 boot jar 无生产风险，本地 dev 走 proxy 不经后端静态面。

## 决策要点

1. **部署通道 = jar 双路复刻**：单体模式 ui-antd jar 作 runtime 依赖进 boot jar、Tomcat 以 `classpath:/public` 服务；MSA 模式 `msa/web-ui` 解包同一 jar。部署拓扑零变化，haproxy/packaging/msa-tb* 镜像零改动。
2. **jar 坐标** `org.thingsboard:ui-antd`，版本继承 root parent；动 3 处 pom（root `<modules>`、application runtime 依赖、msa/web-ui unpack 源）。groupId 保持 `org.thingsboard` 以最小化上游 diff。
3. **Maven 集成** = frontend-maven-plugin（install-node-and-npm → npm ci → npm run build），`npm-build` profile 默认激活（镜像 ui-ngx 的 `yarn-build` 语义）；**不挂 yarn 串行链**（npm 与 yarn 缓存隔离无竞争，靠 reactor 依赖排序）；Node 版本与 `.nvmrc`、`engines` 三处同源（按 #8 的 Node 冒烟结果钉）。
4. **产物形态全在前端侧对齐，后端 4 处路径集合（WebConfig 正则 + security 三处）零改动**：`outputPath: 'target/generated-resources/public'`（构建前自动 clean）、`hash: true` + `publicPath: '/'`、browser history、**删脚手架 `exportStatic`**（多路由 HTML 与 `forward:/index.html` 回退冗余）、**`staticPathPrefix: 'assets/'`**（默认 `'static/'` 撞后端保留前缀 `/static/**`）、`define: { __APP_VERSION__: package.json version }`（版本号节奏另票）。
5. **后端硬编码 SPA 路由前端沿用**：`/login`、`/login/createPassword`、`/login/resetPassword`、`/activationLinkExpired`、`/login?loginError=`（AuthController 303 + OAuth2 handlers）；routes.ts 登记「后端持有路径清单」为路由命名硬约束。
6. **缓存与压缩复刻现状**：不生成 `.gz`（umi 无现成方案）、不动 thingsboard.yml 的 Boot2 遗留键、security 面维持 `max-age=0` + weak ETag；缓存优化（Boot3 键修正 + hash 文件 immutable 长缓存）登记为切换后独立 backlog。
7. **ui-ngx 休眠保留**：移出 root modules 与 yarn 串行链（不构建、不进产物），目录留作 v1 对照素材；本地未改动使上游安全补丁 merge 干净通过。v1 验收后复审删除。
8. **部署模式**：单体为一等公民；MSA 换坐标后保持可用（web-ui 仅换 unpack 坐标），不投入 runtime 验证。
9. **CI/工具链**：root pom license excludes 必须加 ui-antd 条目（`license-header-format.yml` 会自动 format + commit，不排除则持续污染）；ui-antd 三 job CI（#8 已定）独立于 Maven 链；build.sh `NODE_OPTIONS=4096` 起步。
10. **切换时序** = v1 开发第一天一个翻转 commit；本地 dev = IDE 起 `ThingsboardServerApplication`（8080，HSQLDB 默认）+ ui-antd `npm start`（proxy：`/api/ws` 排在 `/api` 前），无 mock 后端。

## Consequences

- 「一步切换」的执行物 = 第一天的接线翻转 commit（modules/依赖/license/profile/config），**没有后续仪式性切换日**；v1 验收通过即全系统就绪。
- v1 开发期间 boot jar 内是半成品前端（登录页可能都缺）——「起后端看页面」的验证路径不可用，页面验证一律走 `npm start` proxy；此限制需固化为开发习惯。
- ui-ngx 目录为死代码状态：构建不碰、CI 不扫；grep 时须意识到它是对照素材而非活代码。
- MSA「保持可用」是构建级承诺（web-ui 模块可构建），非 runtime 验证承诺。
- 上游 merge 时 ui-ngx 冲突面最小化，但 root pom / application pom / msa web-ui 的 3 处坐标改动是每次安全补丁 merge 的固定小冲突点。
