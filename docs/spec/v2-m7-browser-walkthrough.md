# v2 M7 真机验收走查记录（仪表盘编辑器，spec §3）

> 执行：V 波验收代理，2026-09-03/04。环境：后端 `http://localhost:8080`（本地 dev tenant），前端 dev server `http://localhost:8002`（`ui-antd/dev-server.log`），browseros MCP 真机浏览器（租户管理员 `tenant@thingsboard.org`，凭据取自 `ui-antd/e2e/seed/seed.ts`）。
> 截图取证：browseros 工具内联截图（未入库，二进制不入 git）；导出物落盘 `C:\Users\HJH\.browseros\tool-output\download-ayaM7q\Rule Engine Statistics.json`（40,373 B）。关键状态探针通过页面 DOM 注入 `<pre id="v-probe-box">` 回读（截图左上角红字即探针输出）。
> 门店数据保全承诺：全程对 Rule Engine Statistics 仪表盘做过一次「拖动→保存→刷新验证持久化→拖回→保存」的往返，最终以 API 复核服务器布局已还原原状（`42face47 row=0 col=0` / `6a74ab56 row=0 col=12` / `5eb79712 row=7 col=0`），其余仪表盘零改动。

## 0. 总览

| 步骤 | 结果 |
|---|---|
| 1 仪表盘列表/详情视图 | ✅ |
| 2 编辑态进入 | ✅（Software 仪表盘加载即崩 → 缺陷 D1，其余 3/4 正常） |
| 3 添加/拖拽/碰撞/边界 | ✅（抽屉拖拽落格未真机驱动；resize 手柄未真机驱动——均引擎/单测取证） |
| 4 撤销/重做（按钮+键盘） | ✅ |
| 5 右键菜单（widget/仪表盘级） | ⛔ 环境受阻（BrowserOS 扩展劫持 contextmenu，曾致标签页被导航） |
| 6 配置面板五区 | ✅（取消路径一次崩溃疑云 → 疑点 S1，未复现） |
| 7 对话框群 | ✅（states/settings/aliases/filters/layouts 入口与内容；SCADA 差异表仅验到切换入口） |
| 8 复制/粘贴四档 | ✅（c/v 一组实证；r/i 引用档被 sameTarget 守卫正确拒绝——单布局盘 parity 行为） |
| 9 保存→持久化→退出取消 | ✅ |
| 10 导入/导出 | ✅ |
| 11 i18n 抽查 | ⚠️ zh-CN 全程无裸 key；应用级语言切换器自动化未生效（app 壳层功能，非 M7 范围） |

## 1. 分步记录

### 步骤 1 — 仪表盘列表 / 详情视图 ✅
`/dashboards` 列表 4 行（Thermostats/Software/Rule Engine Statistics/Firmware，列：创建时间/标题/已分配客户/公开 + 刷新/导入）。点开 Software → 只读详情页渲染：面包屑「仪表盘/Software」、PageContainer 返回箭头、只读工具栏（编辑铅笔 / 时间窗「最近 1 分钟」/ 全屏）、「Device list」实体表 widget + 4 个软件状态统计 widget 正常出数。

### 步骤 2 — 编辑态进入 ✅（附缺陷 D1）
只读页「编辑」→ `/dashboards/:id/editor`。Rule Engine Statistics / Firmware / Thermostats 三盘编辑器正常打开：工具栏齐套（save/undo/redo/＋/displayGrid/全屏/states/别名/过滤器/设置/导入/导出/版本控制 popover/时间窗/退出编辑/保存），画布 3 个 widget 出格可编辑，右侧「未选中 widget」提示。
**D1（缺陷）：Software 仪表盘编辑器路由必崩**（错误边界「页面出现错误」）。三次不同入口（工具栏编辑/直达 URL）均复现；Firmware/Thermostats/Rule Engine Statistics 均正常 → 数据相关。Software 独有：6 个 states、`settings.stateControllerId:"entity"`、10 个 builtin widget。隔离复考：以真实 Software configuration 直挂 EditorShell（vitest,happy-dom）**不崩** → 崩点在路由级装配（疑似 states-controller 与 URL state 装配交互），待定位（见走查 §3 缺口行）。

### 步骤 3 — 添加 / 拖拽 / 碰撞 / 边界 ✅
- **添加链**：＋ → widget 类型抽屉（五组：Alarm widgets / Analogue gauges / Cards / 通用 / Input widgets，名称+fqn 双列）→ 搜索「HTML」实时过滤仅剩 HTML value card → 点选 → 确认对话框「配置 widget」（标题/宽度（列）/高度（行）/行位置/列位置 + 取消/添加）→ 添加落格：undo 按钮由禁用转可用（一个事务组入栈）、配置面板自动展开。
- **缺陷 D2：落点叠压**。新 widget 默认落 `(row 0, col 0)`，与既有队列统计 widget 完全重叠（DOM 探针：两 cell 同为 `translate(10px,10px)`）。ui-ngx 预填第一个空闲位/末位（findPosition），本实现不寻位。全画布无空闲位时 ui-ngx 落末端。→ 缺口行登记。
- **拖拽移动**（合成鼠标事件，真实浏览器 RGL/react-draggable）：队列统计向下拖 640px → 成功落至 Exceptions 下方空白行（截图可见），一次 drag-stop 一个事务组。
- **碰撞阻挡**：同法拖 420px（落点为 Exceptions 占用格）→ 原地弹回、零位移（P3 `preventCollision` 语义真机复现）。
- **边界**：拖出下边界后画布向下生长落格（gridster 语义：横向硬夹、纵向无限生长）。
- resize 手柄：8 向手柄已渲染（EDITOR_RESIZE_HANDLES），真机未驱动手柄缩放；引擎层取证见 `rgl-edit-behavior.test.tsx`（P3）。

### 步骤 4 — 撤销/重做 ✅
- 拖拽后 undo 可用/redo 禁用 → 点 undo：队列统计回原位、undo 转禁用（undo 到底 dirty 归 false 的栈态表征）、redo 转可用 → 点 redo 复原。
- 键盘：`ctrl+z`（同 undo 效果）、`ctrl+y`（同 redo 效果）均生效（AX diff 按钮态随动）。
- dirty 指示：草稿脏 → 保存图标可用 + 红色「保存」；保存/撤销到底后图标禁用。

### 步骤 5 — 右键菜单 ⛔（环境受阻）
widget/仪表盘级 contextmenu 触发在 BrowserOS 环境被扩展的全局右键接管：一次真实右键把标签页导航到扩展页（标签丢失）；合成 `MouseEvent('contextmenu')` 派发能选中 widget 并拉起配置面板（cell 的 React onContextMenu 生效），但 antd Dropdown 菜单本体未出现（DOM 探针 `.ant-dropdown` 零挂载）。代码层接线在：`shell.tsx` `widgetMenu`（编辑/引用转副本[引用件]/复制/复制引用/删除）+ `dashboardMenu`（设置/别名/粘贴/粘贴引用/移动所有 widget）+ `EditorGrid` Dropdown 包装与 `data-testid`；`editor-grid.test.tsx` 断言 builder 对每个 widget 调用、`shell.test.tsx` 断言 Delete 键走删除确认。相关行按「真机未目击」如实保留未勾。

### 步骤 6 — 配置面板五区 ✅（附疑点 S1）
点选 widget → 面板展开，头部五区 segmented：**数据 / 外观 / Widget 卡片 / 操作 / 布局**（4.4 结构，无旧 Settings/Advanced tab）。
- 数据区实测（timeseries chart）：使用仪表盘时间窗开关（关 → 即时出现 widget 级时间窗选择器「最近 5 分钟」+ 显示时间窗开关）、数据源（entity 别名 TbServiceQueues）、数据键（timeoutMsgs/tmpTimeout：标签 `{i18n:...}`、名称、单位、分页大小、拖拽排序手柄、上下移、删除）、最新键值（queueName/serviceId）、添加数据源/添加键。
- 编辑字段实时生效（开关即出即收）。
- **S1（疑点）**：一次「取消」点击后标签页崩溃消失（当时未获堆栈；第二次尝试因抽屉无法再开未完成复现）。面板取消回滚有专项单测（checkpoint 按组回滚零残留）；登记为疑似待观察，不计数。

### 步骤 7 — 对话框群 ✅
- **States**（工具栏 project 图标）：「管理仪表盘状态」添加状态 + 表格（名称/状态 ID/根状态/操作：编辑、删除），default 根状态在列。
- **Settings**：「仪表盘设置」状态控制器/显示标题/标题颜色/Logo/隐藏工具栏/工具栏常开/实体选择器/过滤器/时间窗/导出/更新图片开关 + **仪表盘 CSS** 编辑器（dashboard-settings 含 dashboardCss ✓）。
- **Aliases**：「实体别名」添加别名 + TbServiceQueues(entityType)。
- **Filters**：「过滤器」添加过滤器 + 空态文案「尚未配置过滤器。」。
- **Layouts**（appstore 图标）：「管理布局」布局类型单选 **默认 / 分栏（左+右）/ SCADA布局** + 主布局（布局设置/断点/添加断点）/ 默认布局设置。§3.6 layoutType 切换入口证实；差异表（margin 0、列数 24 倍数、自动仪表化）未在真机完成一次 scada 保存走查，以 `manage-layouts.test`/`scadaColumnClamp`/grid-math scada 分支单测取证。

### 步骤 8 — 复制/粘贴四档 ✅
- 选中 widget → `ctrl+c` → `ctrl+v`：3→4 cells；**一次 `ctrl+z` 整组抹掉（4→3）**——「粘贴=一个事务组」真机实证。
- `ctrl+r`（复制引用）→ `ctrl+i`：cells 不变——`canPasteWidgetReference` 的 sameTarget 守卫正确拒绝同布局引用粘贴（ui-ngx parity：引用粘贴要求目标 state/layout 对不同于源）；单布局盘无法真机走完，引用粘贴事务由 clipboard 单测覆盖。

### 步骤 9 — 保存 / 持久化 / 退出取消 ✅
拖动队列统计至底部 → 保存图标点击 → 成功 toast（AX 残留 alert check-circle「已保存」）+ 保存图标转禁用（baseline 前移）→ **刷新页面后 widget 仍在底部（服务器持久化证实）**。随后拖回原位再保存，API 复核服务器布局与初始一致。
带脏改动点「退出编辑」→ 弹「未保存的修改：当前草稿有未保存的修改，退出编辑将放弃这些修改。取消/放弃修改」→ 放弃修改 → 回只读路由、草稿撤回。**两路退出语义闭环**。

### 步骤 10 — 导入 / 导出 ✅
- **导出**：download 图标 → `Rule Engine Statistics.json`（40,373 B）。键集 `title,name,image,mobileHide,mobileOrder,configuration,resources`——**无 id/tenantId/version**（剥离规则对齐 TB）。
- **导入**：upload 图标 → 「导入仪表盘」拖拽框 → 注入同一文件 → 确认框明示契约文案：「导入内容将替换当前草稿；**这是一个撤销组，可用撤销整体恢复**。3 个 widget」→ 确认后草稿替换。缺别名补录对话框未真机触发（同盘导入无缺别名），契约单测覆盖。

### 步骤 11 — i18n 抽查 ⚠️
zh-CN 全程走查：工具栏/对话框/面板/占位三态文案均为正常中文，**未见任何裸 `editor.*` key**（唯一 `${i18n:...}` 出现在 widget 数据键标签输入框内——那是 widget 自带数据（TB 原生插值 token 透传），非编辑器泄漏）。双语键集奇偶由 CI check-locale 门禁强制。应用级「语言」切换器（globe 图标）自动化点击未生效（语言菜单项点击后 locale 不变；app 壳层功能，非 M7 编辑器范围），en-US 编辑器形态未真机目击。

## 2. 发现的缺陷与缺口（勾账已同步登记 spec §3）

| # | 级别 | 描述 | 状态 |
|---|---|---|---|
| D1 | 高 | Software 仪表盘编辑器路由必崩（数据相关：6 states/`stateControllerId=entity`；EditorShell 隔离挂载同配置不崩 → 崩点在路由级装配，疑似 states-controller URL 装配交互） | 未修，登记 §3.1 缺口行 |
| D2 | 中 | 添加 widget 默认落 `(0,0)` 叠压既有 widget，不寻找空闲位/落末端（ui-ngx findPosition parity 缺口；本例全画布无空闲位时 ui-ngx 落末端） | 未修，登记 §3.2 缺口行 |
| D3 | 低 | add-widget 确认框标题默认填 fqn 原文（`system.cards.html_value_card`）而非类型显示名 | 未修，登记 §3.2 缺口行（minor） |
| F1 | 已修 | PageContainer 返回箭头绕过离开守卫（脏草稿静默离开）——PageContainer 自带 `dirty` 守卫（M2 9f08ee3d9f），编辑器页漏传；`index.tsx` 接线 `useEditorSession(session).dirty` 后真机复验：脏草稿点返回箭头弹出「未保存的修改」确认、不再静默离开（commit `997267f847`） | 已修已勾 |
| S1 | 疑似 | 配置面板「取消」一次点击后标签页崩溃（无堆栈；未复现）。取消回滚有专项单测；持续观察 | 疑似待观察 |
| E1 | 环境 | BrowserOS 扩展劫持右键 → 右键菜单真机不可走查；合成事件选中生效但 Dropdown 未现（菜单挂载于 content 层，事件派发层级差异亦可能） | 环境阻碍，登记未勾行原因 |

## 3. 门禁数字（全量，2026-09-03/04）

- `npm run lint`（biome + check-locale + tsc）：**绿（exit 0）**。修复了 M7 波次遗留的 4 个 biome error（import 排序/locale 格式/move-widgets.test 两处 `?.…!` 断言，commit `3f60c89916`）；余 30 warnings 为基线存量（widget-text.ts 模板串等，均非 M7 文件/不阻塞门禁）。注意：本地未跟踪的 playwright 产物（`ui-antd/e2e/.auth/*.json`、`ui-antd/test-results/.last-run.json`）会给 biome 添 5 个 format error——CI 不存在这些文件。
- `npm run test`：**1074 tests：1073 通过 / 1 失败**。唯一失败 `src/pages/home/entry.test.tsx`（`tokenStore.isTokenValid is not a function`）为 **master 存量**：M6 提交 `604ffeff52`（在 master）给 entry.tsx 加了 token-first 守卫调用，测试的 hoisted mock 未跟上；M7 分支对 `src/pages/home/` 零改动。文档旧载的 ECONNREFUSED 形态随 dev server 在场已不出现（assets/detail 本轮全过）。
- 编辑器域套件：`src/pages/dashboards/editor/**` 26 文件 203 测试全绿；新增 P7 证据测试 3/3 绿。
