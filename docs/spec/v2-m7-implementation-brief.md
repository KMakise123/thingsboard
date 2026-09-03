# v2 M7 实施简报：仪表盘编辑器（团队共享契约）

> 依据：[v2-editors-acceptance.md](./v2-editors-acceptance.md) §3（验收载体，逐项勾选）+ [ADR 0004](../adr/0004-editor-suite.md)（实现路线）。
> 分支：`feature/m7-dashboard-editor`。本简报是实施团队的作业契约；验收勾账回写 spec 本体。

## 0. 范围

- **做**：spec §3.1–§3.9 全部 checklist + FormProperty 统一渲染器（`src/components/form-property/`，M8 规则链复用的地基）+ PoC 证据 P3（RGL 碰撞阻挡 API）/P6（antd Form 撤销焦点）/P7（100+ widget memo 边界，§6 要求随 M7 复验）。
- **不做**（防蔓延）：§7 能力级增强（导入内存暂存、崩溃保护 sessionStorage）只登记不实现；规则链（M8）、widget 编辑器（M9）、SCADA 符号编辑器页（资源库子系统）；后端零改动。

## 1. 现状盘点（侦察结论，agent 直接采信）

- **只读基建可复用**：`src/components/dashboard/`（DashboardPage/DashboardToolbar/DashboardView）、`grid/grid-layout.tsx`（`TbGridLayout` 已用 RGL 2.2.4 新 API 面：`gridConfig`/`dragConfig{enabled:false}`/`resizeConfig`/`compactor`/`useContainerWidth`，测试须显式传 `containerWidth`——setupTests 的 ResizeObserver 是 no-op stub）、`grid-math.ts`（断点桶/移动单列栈/grid 几何）。
- **草稿形状已就绪**：`core/dashboard/model.ts` `validateAndUpdateDashboard` 产出规范化 `DashboardConfiguration`——`widgets: Record<id,Widget>`、`states: Record<id,{root,layouts:{main?,right?}}>`、`entityAliases`、`filters`、`settings`。ADR 要的草稿形状即此，无需另造。
- **保存链路**：`services/tb/dashboard.ts` `saveDashboard(dashboard)` = POST /api/dashboard upsert；`version` 字段在 `HasVersion`（types/tb/entity.ts:82）但全仓未用——编辑器保存必须回传 version，409 冲突 = `ServerErrorError.errorCode === 35`（VERSION_CONFLICT）。保存成功后 invalidate `['dashboard','full',id]` + `['dashboards','list']`。
- **widget 注册表**：`components/widgets/registry.ts` 内置 8 个 fqn → lazy 组件；miss → probe `['widgetType',fqn]` → `unsupported-angular` / `unsupported-custom` / `missing` 三态占位（placeholders.tsx）。编辑器内渲染 widget 复用 `WidgetContainer`。
- **可复用件**：`TimewindowPicker`（受控编辑器 `{value,onChange}`，直接嵌配置面板）；`parseDashboardImport`/`prepareExport`（pages/dashboards/list/import-export.ts，导入校验/导出剥离可复用；其 `importDashboardFromFile` 强制新建行，编辑器导入不用它）；`use-states-controller`（注意：全局写 `?state=` URL 参数）；SettingsCard 的 dirty/undo/save 底栏样式范式；对话框house style = 受控 `open/onClose`、mutation 归调用方、`destroyOnHidden + maskClosable={false}`、错误走 `serverErrorText`。
- **空白区（M7 新建）**：热键（react-hotkeys-hook@5 已装）、剪贴板（feature 模块内存单例，弃 localStorage——ADR §2）、右键菜单（antd Dropdown `trigger=['contextMenu']`）、全屏（自封装原生 Fullscreen API hook）、撤销栈（immer@11 已装）。
- **HTTP 铁律**（core/README.md）：只有 `core/http` 发请求；`services/tb` 纯传输；错误一律 `ServerError` 形状。
- **i18n**：域文件 `src/locales/{zh-CN,en-US}/<domain>.ts` + 聚合器手工 import；check-locale 强制 zh/en 键集一致 + 单 locale 内键不得重复定义。
- **测试已知抖动**：`pages/home/entry`、`pages/assets/detail` 各有连 localhost:3000 的 ECONNREFUSED 环境性失败（dev server 起来即消）——与本段改动无关，不算回归。

## 2. 架构落位（ADR 0004 §6 固化 + 本段细化）

```
src/core/editor/
  session.ts           EditorSession<T>（~150 行薄层，不引库）
  dashboard-draft.ts   仪表盘草稿动作集（事务配方 = 纯函数 (draft)=>void + 元数据）
src/components/code-editor/    CodeMirror 统一封装（M7 先 JSON；TSX/JS/CSS/TBEL 归 M8/M9 增语言）
src/components/form-property/  统一渲染器（M8 规则链复用）
src/pages/dashboards/editor/   编辑器自含子树
  index.tsx                    路由页：加载 → EditorSession enter → shell
  shell.tsx                    工具栏 + 画布 + 面板插槽 + DialogHost
  canvas/                      RGL 编辑态画布 + WidgetContainer 包装 + 拖放/缩放/碰撞
  panels/                      widget 配置面板（五区，panels/index.tsx 为稳定入口）
  dialogs/                     §3.5 对话框群（host.tsx 静态 lazy 映射为稳定入口）
  contract/                    离开确认 guard、409 三选项、保存流、导入适配
  clipboard.ts                 feature 模块内存剪贴板单例（副本/引用两档）
routes.ts                      /dashboards/:dashboardId/editor（hideInMenu, access canTenantAdmin, PageContainer 壳）
```

**EditorSession 契约**（ADR §2 全文生效）：`enter(normalize(server))` 基线一次；写唯一入口 `session.write(label, recipe, {coalesceKey?})`（immer produceWithPatches → 事务组 `{id,label,patches,inversePatches,coalesceKey?,ts}`）；表单连续输入 coalesceKey+1s 合并；undo/redo 双栈（无硬上限，累计 patches>4MB 丢最旧并降级 dirty 精度，重做栈新组入栈即清）；`checkpoint(label)` 返回回滚句柄（配置面板事务取消用——打开 checkpoint、取消按组回滚、预览恒吃主 draft）；`save()` = serialize→POST→baseline 前移+version 回填；`dirty` = O(1) 引用比较（undo 到底引用复位锚定）。不入栈：选中/视口/面板开合/timewindow 临时调整。仪表盘栈**跨保存存活**（与规则链检查点清栈不对称是设计选择）。

## 3. 波次与文件所有权

| 波 | Agent | 交付 | 文件所有权（硬边界） |
|---|---|---|---|
| 1 | F 地基 | core/editor（session+draft，TDD）+ locale `editor.common.*` | `src/core/editor/**`、`src/locales/{zh-CN,en-US}/editor.ts` |
| 1 | R 渲染器 | code-editor(JSON) + form-property 渲染器（TDD） | `src/components/code-editor/**`、`src/components/form-property/**`（零 locale key——label 由 uiHints 传入） |
| 2 | C 画布 | 路由+shell+工具栏+编辑态画布+widget 生命周期+右键菜单+热键+粘贴+对话框骨架占位+P3 证据 | `src/pages/dashboards/editor/{index,shell,canvas/**,clipboard.ts}`、`dialogs/host.tsx`（含全部对话框稳定路径的**占位组件**）、`panels/index.tsx` 占位、`contract/` 占位、routes.ts 一行、locale `editor-dashboard.ts`（`editor.dashboard.*`） |
| 3 | P 对话框 | §3.5 对话框群全量 + §3.6 SCADA + §3.7 断点/mobile | 只填 `dialogs/` 下 P 名单文件 + locale `editor-dashboard-dialogs.ts` |
| 3 | K 面板 | §3.4 五区 + basic/advanced + 别名闭环 + settingsForm 经 form-property | 只填 `panels/**` + locale `editor-dashboard-panel.ts` |
| 3 | D 契约 | §3.1 进入/退出两路 + §3.8 dirty/离开确认/导入导出/409 + §3.9 撤销契约细化 + P6 证据 | 只填 `contract/**` + locale `editor-dashboard-contract.ts` |
| 4 | V 验收 | 全门禁 + 真机验收 + spec 勾账 + P7 证据 + 简报回填 | spec/简报/修订记录，不碰 src |

稳定入口纪律：C 交付后 `dialogs/host.tsx`、`panels/index.tsx`、`contract/` 的文件路径与导出签名冻结；波 3 各自填实现，不改共享文件（聚合器 locales 各自新增独立文件 + 一行 import，冲突我合并时收口）。

## 4. 门禁与作业纪律

- 每个逻辑单元一 commit（限额中断可恢复，接续 agent 从分支状态接管）；Conventional Commits（英文）。
- 提交前自跑：`npx vitest run <自己范围的测试>` + `npm run tsc` + `npx biome check <自己文件>`；波次收尾跑全量 `npm run lint` + `npm run test`。
- **不碰 package.json**（依赖已装齐：immer 11 / react-hotkeys-hook 5 / @uiw/react-codemirror 4 / @codemirror/lang-json 6）。新依赖需求 = 停下上报，不自行安装。
- antd 组件动手前 `npx antd info <Component>`；颜色只走 antd token；`data-testid`/`data-*` 惯例对齐现有页面。
- ui-ngx 对照源码在仓内 `ui-ngx/src/app/modules/home/pages/dashboard/`（spec 锚点行号可直接查）。

## 5. PoC 证据义务（回填本节）

- **P3**（C）：RGL 2.2.4 编辑态实测——碰撞阻挡（pushItems:false/swap:false 语义 = preventCollision+compactor 组合）、边界夹取、dropConfig 外部拖入、displayGrid 条件挂载；结论 + API 形状记本节。
- **P6**（D）：antd Form 受控回填 × undo 光标竞争——revision 守卫/受控 value 方案实测结论。
- **P7**（V）：100+ widget 仪表盘 Profiler——单字段编辑仅目标 widget 重渲染（WidgetContainer memo + config 引用订阅，edit 态独立 context 通道）。

## 修订记录

- 2026-09-03：创建（M7 开工，四波作业计划 + 稳定入口纪律）。
