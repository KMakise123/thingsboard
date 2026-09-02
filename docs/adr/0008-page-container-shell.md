---
status: accepted
date: 2026-09-01
---

# M2 页面头部形态：官方 PageContainer 薄封装（方案 A）

M1 的面包屑是唯一结构性遗留（spec 修订记录 2026-09-01），M2 又要铺约 15 张
新页（资产 / 实体视图 / 客户域 + 4 作用域页 / 用户管理），每张都需要「标题 +
面包屑 + 内容容器 + 操作区」。头部形态在 M2 开工前定案（spec 修订记录的
前置条件），两案论证见 `.m2-team/header-a.md`（方案 A）与
`header-b.md`（方案 B），用户拍板：**方案 A**（2026-09-01）。

## Considered Options

- **方案 A：官方 PageContainer 薄封装（采纳）**
  1. 应用壳 90% 已是 ProLayout（`@umijs/max` 插件接线），方案 A 是「补完」
     不是「重写」；面包屑数据源（routes `name` → `menu.*` i18n）现成，
     `check-locale` 双语门禁自动兜底。
  2. M2 容器一致性是乘法题：自研头 = 15 页 × 15 次重复决策 + 每次评审对齐；
     PageContainer = 1 次决策收进薄封装，页面只声明 `title/extra/tags/content`。
  3. 生态能力即用即得：`tags`（详情页状态 Tag）、`extra`（列表工具条）、
     `onBack`（返回标准缝）；维护成本归官方，pro-components 已在依赖树且被
     overrides 钉版，同包边际增量、不新增升级链。
  4. M1 已交过一次自研学费：返回键绕过未保存守卫是 M1 验收抓出的真实缺陷
     （修复 9f08ee3d9f）——「每页自搓页头语义」的固有风险有实锤预演。
- **方案 B：保留 M1 自建壳 + 自建 Breadcrumbs 组件（否决）**
  1. M1 壳已过验收（spec §3.2 4/5 勾），缺口只有面包屑一项，约 150 行
     自有代码可补；src 对 pro-components 的运行时依赖仅 2 个文件，方案 A
     会把 pro 的页头 / token API 面扩进每一页并新增第二条 token 派生链。
  2. M1 自建详情头带 PageContainer 给不了的业务约束（未保存守卫），
     `onBack` 只有路由语义。
  3. 否决理由：守卫语义经薄封装收口后同样保得住（作为方案 A 的硬约束吸收，
     见 Decision 2）；「省 150 行 API 面」换不回 15 页的容器样板与语义漂移，
     而 pro token 的扩散面用「单源派生 + 评审打回」封住（Decision 3）。

## Decision

采用方案 A，并吸收方案 B 的两个硬约束：

1. **薄封装单点收口**：`ui-antd/src/components/layout/page-container.tsx`
   统一 —— 标题（显式传入 > 路由 `name` → `menu.*` i18n）、面包屑规则
   （父级取菜单树、末级取页面实名；`/devices/:id` 一类动态段由页面把实体名
   作为 `breadcrumbLabel` 传入，与页头标题同源同帧，即方案 B
   `useBreadcrumbLabel` 的「末级实名」语义，页面级 prop 直传后不需要
   模块级 store 间接层）、`onBack` 未保存守卫、pro token 声明。
2. **返回键未保存守卫语义必须保留**（B 案硬约束一，M1 验收缺陷
   9f08ee3d9f 的行为红线）：守卫实现在封装内（`App.useApp().modal` 确认
   后才离开），页面只传 `dirty` 布尔；设备两页回改时逐行对齐原行为。
3. **pro token 必须从 `src/theme/brand` 单源派生**（B 案硬约束二，ADR 0007
   品牌单源的延伸）：`defaultSettings` 的 `token.pageContainer` 全部值来自
   `src/theme/brand/config.ts` 集中声明，页面内禁止散落硬编码 pro token，
   review 按 ADR 0007 打回越界值。
4. **面包屑由薄封装自行渲染**（antd `Breadcrumb`，吃 antd token，不引第二
   token 链）：pro 的 RouteContext `breadcrumbProps` 会整体覆盖页面传入的
   `breadcrumb`，且 pro 管线在 ProLayout（父）渲染期求值，拿不到页面渲染期
   才有的实体名；故 ProLayout 自带管线用 `breadcrumbRender: false` 关闭，
   面包屑规则仍只写在封装一处。

## Consequences

- 设备两页回改属「搬移非重写」：list 页外层换薄封装、工具条进 `extra`；
  detail 页手搓头 1:1 映射 `onBack/title/tags/extra/content`。业务逻辑
  零改动，两套容器形态在 M2 内清零。
- B 案指出的已知代价照单收下：pro-components 的 PageContainer API 面进入
  每一页，升级受影响面从 2 个文件扩为全部页面；以 overrides 钉版锁升级
  节奏，上游对 antd6 的适配滞后风险由 M1 的 ProTable 组合先证兜底。
- M2 新页骨架 = 薄封装 + 声明式 props；Tailwind 只做内容区布局（ADR 0007
  第 3 条不变）。间距收敛走 ghost 形态与 brand token，不新增 `global.less`
  裸 `.ant-pro-*` 类名修补（已有修补标注版本依赖，随官方类名升级失效）。
- vitest 下 pro-components 编译产物对 antd locale 的 extensionless import
  无法解析（M1 已知），渲染薄封装的页面测试需 mock
  `@ant-design/pro-components`——封装自身逻辑（守卫 / 面包屑 / 标题解析）
  有独立测试兜住。

## References

- [#9 v1 范围与验收定案](https://github.com/KMakise123/thingsboard/issues/9)
  与 spec 修订记录（2026-09-01「面包屑未实现——头部形态取舍待 M2 开工前决议」）
- `.m2-team/header-a.md` / `.m2-team/header-b.md`（两案完整论证材料）
- commit 9f08ee3d9f（详情返回箭头绕过未保存守卫的修复）
- ADR 0007（品牌单源、Tailwind 边界、antd App 上下文）
