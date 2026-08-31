---
status: accepted
date: 2026-08-31
---

# 前端规约：主题、图表、i18n 门禁与 Node 钉版（ui-antd / v1 M1）

落地 issue #8 的前端架构定案。违例即视为 bug，review 时打回。

## 决策

1. **品牌单源 `src/theme/brand/`**。seed tokens、图表色板、assets
   （appName/logo/favicon/loginBackground）只在此定义；
   `defaultSettings`、`config/config.ts` title、运行时
   `document.title`/favicon（`applyBrandAssets()`）三处漏风点全部从它读取。
   禁止 `theme.zeroRuntime`（禁运行时换肤通道，light-only v1 由
   rootContainer 的常驻 theme 对象保证——防 undefined↔对象切换导致整树重挂载）。
2. **message / Modal / notification 一律走 antd `App` 上下文**
   （`App.useApp()`；umi `antd: { appConfig: {} }` 已挂上下文）。
   antd 6 静态方法拿不到主题，禁用。
3. **Tailwind 只做布局**。默认色板已裁（`@theme { --color-*: initial; }`），
   禁止 `bg-blue-500` 一类颜色工具类；一切颜色从 antd token 层出。
4. **图表颜色**：系列色优先级 `dataKey.color` > `brand.chartPalette`
   （8 槽固定顺序，不循环生成）；图表 chrome（轴/网格/tooltip）经
   `theme.getDesignToken` 从 token 推导。**图表组件禁内联 hex**——ECharts
   画布不解析 CSS 变量，色值必须来自 `src/theme/charts.ts` 的导出。
   8 槽色板已过 dataviz 六项校验（白底：相邻 CVD ΔE 9.1、正常视觉
   ΔE 19.6，全部达标；aqua/yellow/magenta 三槽对白面对比 <3:1，
   relief 规则生效——用到的图必须带可见直标或表格视图）。
5. **biome 分层**：`src/core/**` 禁 import `@/pages/**`、`@/access`、
   `@/models`；`src/widgets/**` 禁 import `@/pages/**`（`overrides` +
   `noRestrictedImports`）。`correctness.useExhaustiveDependencies` 重开为
   error——WS 订阅 effect 的 stale closure 重灾区。不引入 ESLint 双链。
   locale 切换收敛 `src/locales/set-locale.ts` 单点。
6. **双语门禁**：zh-CN / en-US key 全等 + 跨文件重复 key 检测
   （`scripts/check-locale.mjs`，挂在 `npm run lint` 链）。首个双语
   commit（locale 收敛）与门禁同 commit 进库。
7. **Node 钉 24**：`.nvmrc` = 24、`engines` `>=24 <27`、`.npmrc`
   `engine-strict=true`。冒烟（本机 24.12.0）：`npm ci` 干净
   （1555 包）、`max build` 全绿（`NODE_OPTIONS=--max_old_space_size=4096`）。
   早前 EBADENGINE 警告根因是 **jsdom@30.0.1**（要求
   `^22.22.2 || ^24.15.0 || >=26`，本机 24.12.0 不满足）——jsdom 在
   vitest 中实际未用（环境为 happy-dom），删除该 devDependency 解决，
   而非绕着它钉版本。frontend-maven-plugin 的 `nodeVersion` 归部署票。

## Consequences

- 换品牌只改 `src/theme/brand/config.ts`（+ public/ 资源）；改色板必须
  重跑校验脚本后才可合入。
- CI 为三道必过门禁（biome 全量 check / tsc+vitest / build）+ 周度
  非阻断 audit；GitHub 只执行仓库根 `.github/workflows/`，ui-antd 内
  的 workflow 文件需上提到根才生效（文件已按 root 形态写好）。
- moment2dayjs 配置不可删（dayjs locale 同步依赖），config.ts 中有
  防删注释。
- `npm run lint` = `biome check && check-locale && tsc`，本地提交前跑。
