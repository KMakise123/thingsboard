# v2 编辑器三件套验收 spec（活文档）

> 状态：**定稿**（2026-09-03，[#15](https://github.com/KMakise123/thingsboard/issues/15) grilling 两轮 + ui-ngx 4.4.0 / 后端源码双路侦察定稿；骨架来自 [#13](https://github.com/KMakise123/thingsboard/issues/13) 事实盘点）
> 路线依据：ADR 0004（编辑器三件套实现路线）。验收原则继承 #9：**等价为底线、允许增量增强、禁止删减 TB 已有操作**。
> 分工：本 spec = 人工验收载体 + 规则节点 dry-run 统计口径；编辑器自动化回归项归 [#12](https://github.com/KMakise123/thingsboard/issues/12) 基线扩充（§6「自动化衔接」条）。

## 0. 一句话定义

v2 交付的仪表盘编辑器、widget 编辑器、规则链画布，对 ui-ngx 对应编辑器的全部已有操作逐项等价可用（等价项 + 行为契约增强勾选），76 个 CORE 可见规则节点配置表单全量可编辑（dry-run 统计达标），横切七章全绿；撤销栈等增强全面超 TB。

## 1. 验收原则与分账三档

1. **等价项一项不缺**：下列清单为账面本体；验收中发现清单外的 TB 操作，当场登记入册再验收（「TB 有 → 必须有」兜底），修订记录留痕。
2. **分账三档**：
   - **等价项**——TB 已有操作，逐项勾选验收（§3–§5 checklist）；
   - **行为契约增强**——撤销栈边界、409 三选项对话框、规则链保存检查点：#13 定下的三编辑器统一行为契约，坏一处即静默丢失用户工作或三处行为不一致，**保留勾选验收**（各章「行为契约」小节）；
   - **能力级增强**——其余增强（缩放平移、导入内存暂存、边重连、崩溃保护、512KB 软限警告等），**只登记不验收**（§7），不得与等价项和行为契约冲突。
3. **占位三态**：内置未覆盖 / `angular-unsupported`（永久）/ `missing`（类型不存在）——文案不得暗示「即将支持」。
4. **撤销边界显式验收**（行为契约 anchor）：结构性操作入全局栈；代码文本入 CodeMirror 自身栈；焦点切换时 ctrl+z 归属正确；规则链保存 = 检查点（清栈有明示）。

## 2. 里程碑（编号接 v1 M1–M6）

| 段 | 内容 | 验收范围 | 依赖 |
|---|---|---|---|
| M7 | 仪表盘编辑器 | §3 全部 | FormProperty 统一渲染器在本段交付（widget 配置面板地基） |
| M8 | 规则链画布 + ruleChains 全域 | §4 全部（含 §4.5 dry-run 统计报告） | 复用 M7 渲染器 |
| M9 | widget 编辑器 | §5 全部 | 编译管线 + React starter 模板 |
| M10 | 收口 | §6 横切七条全绿 + §3–§5 兜底清账复查 | — |

每段独立可演示（v1 同构）。顺序依据：FormProperty 渲染器是仪表盘 widget 配置面板与规则链节点配置的共同前置，先 M7 打地基；widget 编辑器依赖编译管线，放 M9。

## 3. 仪表盘编辑器操作面（对齐 dashboard-page / dashboard 全家）

### 3.1 编辑态与工具栏

- [x] 编辑态进入：只读页「编辑」→ 编辑态（widget 出现拖拽 / 缩放手柄、工具栏切换编辑组）——等价 ui-ngx Edit mode〔ui-ngx 锚点 dashboard-page.component.html:148-171〕〔V 波真机 ✅；Software 盘加载即崩 → 见 §3.1 末缺口行 D1，已修复（X 波），真机复验通过〕
- [x] 编辑态退出两路语义：保存 → baseline 前移；取消 → 草稿整体撤回进入前基线（prevDashboard 语义）——两路均回只读态〔V 波真机 ✅：保存后 save 图标禁用（baseline 前移）+ 刷新持久化；退出编辑 → 放弃修改 → 只读路由、草稿撤回〕
- [x] 工具栏齐套：保存 / 撤销 / 重做（行为契约）/ 布局切换 / 全屏 / states 管理 / 别名管理 / 过滤器管理 / 设置 / 导入 / 导出 / 版本控制入口（VC 子系统边界依 #9：编辑器内 popover 形态对齐，不跳独立页）〔V 波真机 ✅：AX 枚举全量在列，VC 为 popover 占位形态〕
- [ ] 空 dashboard 自动进入编辑态〔未勾：本地 4 盘均有内容，真机未走「新建空盘」路径；编辑器路由本身为纯编辑态、空配置渲染有单测（shell.test emptyDashboardJson），待 M10 补一次新建空盘走查〕
- [x] ~~**D1 缺口（V 波新登记）：Software 演示仪表盘（6 states / `stateControllerId=entity`）编辑器路由加载即崩**~~（应用错误边界「页面出现错误」）；其余 3 盘正常。EditorShell 以真实 configuration 隔离挂载不崩 → 崩点在路由级装配（疑似 states-controller 的 URL state 装配交互）→ **已修复（X 波，commit 01a46dd321）**：真机堆栈定位——崩点不在 states-controller 也不在路由装配本身，而是共享 `useWidgetValues` hook 对**零解析实体**的 entityCount 数据源建订阅（`countSubs[0]` undefined → `.subscribe` TypeError）；编辑器画布挂载时 alias 必然未解析（异步），崩得确定性，只读页靠 lazy chunk 加载时序侥幸避过。修复 = hook 源头守卫（空实体集跳过 entityCount 作业，别名解析后 signature 变化自动重订阅；恢复 datasources.ts「render degrades, never crashes」契约；该文件在 M7 页面集之外，报告中已显式标注）。回归测试 `entity-controller-crash.test.tsx`（真 shell/canvas/widget 链 + Software 形状夹具）；真机复验：Software 盘编辑器经「编辑」按钮打开、states 对话框 6 状态齐全、无错误边界〔截图取证〕

### 3.2 widget 生命周期

- [x] 添加 widget：右侧 widget 类型选择抽屉（分组 + 搜索）→ 类型 → 参数/布局确认对话框 → 落格；多布局时选目标布局；scada 布局下选择器 scada 类型置顶且跳过布局配置步〔V 波真机 ✅：五组抽屉 + 搜索过滤 + 确认框 + 落格 + 面板自动展开；多布局选目标布局由 select-target-layout 契约单测覆盖（单布局盘真机无此步）；scada 置顶 → 见本节末缺口行〕
- [x] 从选择器拖拽 widget 落格（dropConfig 体系，落点取网格坐标）〔P3 引擎取证（calcXY 两轴夹取）+ `rgl-edit-behavior.test.tsx`；真机抽屉 HTML5 DnD 未驱动（环境受阻），落格链经确认框路径实证〕
- [x] 删除 widget（交互对齐 ui-ngx）〔Delete 键/菜单 → 删除确认对话框有单测（shell.test「Delete opens the remove confirm」）；真机右键被浏览器扩展劫持未目击菜单本体〕
- [x] 复制 / 粘贴双档：ctrl+c 复制 / ctrl+v 粘贴（副本重生成 guid）；ctrl+r 复制引用 / ctrl+i 粘贴引用（保留 alias/filter 引用）——粘贴 = 一个事务组〔V 波真机 ✅：c/v 后 3→4 cells、一次 ctrl+z 整组抹掉；r/i 的引用粘贴被 sameTarget 守卫正确拒绝（ui-ngx canPasteWidgetReference parity，需多布局目标），引用粘贴事务由 clipboard 单测覆盖〕
- [x] 拖拽移动与 resize 手柄（编辑态）〔V 波真机 ✅ 拖拽移动（含一次 drag-stop 一个事务组）；resize 手柄已渲染、引擎+单测取证，真机未驱动手柄缩放〕
- [x] 碰撞阻挡：拖到占用格不推不叠（gridster pushItems:false / swap:false 语义）〔V 波真机 ✅：拖向 Exceptions 占用格 → 原地弹回零位移、零级联〕
- [x] 边界夹取：拖出边界坐标夹回网格范围〔P3 引擎取证（横向硬夹/纵向向下生长）+ V 波真机下边界落位观察一致〕
- [x] ~~**D2 缺口（V 波新登记）：添加 widget 默认落 `(0,0)` 叠压既有 widget，不寻找空闲位**~~（ui-ngx findPosition 预填第一个空闲位/全满时落末端）；真机 DOM 探针实证新旧两 cell 同为 `translate(10px,10px)` → **已修复（X 波，commit c162c3bef8 find-free-placement）**：`dialogs/add-widget/find-free-placement.ts` 实现 ui-ngx `widgetPossiblePosition` parity——行主序扫描目标布局占用格取第一个无碰撞槽位（列夹取网格宽度、1x1 默认几何），扫描含占用包围盒下方一行（构造上必空闲），墙对墙布局退化为 ui-ngx 末端落位（row=maxBottom, col=0）而非叠压；确认框 row/col 由默认目标布局的空闲位预填，用户显式改值优先。单测 8 例矩阵 + 流程级预填/落格测试；真机复验：Software 盘（已占用画布）添加 HTML value card → 6 cell 全部位置互异、新件落 `translate(12px,594px)` 空白带、undo 一组可整撤〔截图取证；草稿放弃，服务器零改动 API 复核〕。pasteWidgets 相对排布不受影响（clipboard 契约未动）
- [x] ~~**D3 缺口（V 波新登记，minor）：add-widget 确认框标题默认填 fqn 原文**~~（如 `system.cards.html_value_card`）而非类型显示名（ui-ngx 预填类型名）→ **已修复（X 波）**：`widgetTypeLabel(fqn)`（registry `meta.label` → fqn 兜底；widgetType 探针名一节从 add-widget 流程不可达——选择器只列 registry fqns）用于确认框标题预填与抽屉列表统一解析；单测 + 真机复验确认框标题输入框预填「HTML value card」
- [ ] **缺口登记（V 波）：widget 选择抽屉 scada 类型置顶缺**——scada 符号类型本身归资源库子系统（v2 后段交付），类型不存在前置顶机制无从验收；排序机制待类型存在后补走查

### 3.3 网格背景与右键菜单

- [x] displayGrid 三态 none / onDrag&Resize / always；move-widgets 对话框打开期间临时 always〔锚点 dashboard-layout.component.ts:117-119〕〔`editor-grid.test.tsx` 三态 + override 通道单测全绿；真机默认态（onDrag&Resize 静止隐藏）可见性一致〕
- [ ] dashboard 级右键菜单五项：设置 / 别名 / 粘贴 / 粘贴引用 / 移动所有 widget〔未勾（环境受阻）：BrowserOS 扩展劫持右键、标签页曾被导航走；菜单接线在 `shell.tsx dashboardMenu`（五项 + testid），菜单本体真机未目击、亦无专项单测——补自动化或人工右键走查后再勾〕
- [ ] widget 级右键菜单：编辑 / 引用转副本（仅引用件显示）/ 复制 / 复制引用 / 删除〔未勾（环境受阻）：同上；`widgetMenu` 接线有 builder 调用断言、Delete 键删除确认有单测，菜单本体未目击〕
- [x] move-widgets 对话框：cols/rows 偏移量整体平移所有 widget〔`move-widgets.test.tsx` 专项单测（整体平移/负向夹取/零偏移零补丁 no-op/空布局占位/一个事务组）+ displayGrid override 单测；真机入口依赖 dashboard 右键菜单（被阻）〕

### 3.4 widget 配置面板

> 勘误：骨架所写「Data / Settings / Advanced / Appearance / Action」为 3.x 旧结构；4.4 已重构为 toggle-select 五区〔锚点 widget-config.component.ts:333-372〕。

- [x] advanced 模式五区齐套（头部顺序）：**Data / Appearance / Widget card / Actions / Layout**〔V 波真机 ✅：segmented 五区 AX 枚举（数据/外观/Widget 卡片/操作/布局）〕
- [x] Data 区：timewindow 配置、alarm filter（告警类）、datasources 编辑 + datakey 配置与拖拽排序（含 latest keys）、RPC 类 targetDevice 选择、alarm source〔V 波真机 ✅：时间窗开关联动/数据源/数据键（标签/名称/单位/上下移/拖拽排序手柄/删除）/latest keys/添加键与数据源；alarm filter、RPC targetDevice 为类型条件渲染，由 WidgetConfigPanel/section-data 单测覆盖〕
- [x] Appearance 区：外观设置 + widget 高级设置（原 Settings tab 收纳于此，无独立 Settings / Advanced tab）〔section-appearance 单测 + 真机区块在列〕
- [x] Widget card 区：标题 / 卡片样式 + widgetCss 扩展面板〔section-widget-card 单测 + 真机区块在列〕
- [x] Actions 区：action 配置（actionSources 全操作源）〔section-actions 单测 + 真机区块在列〕
- [x] Layout 区：default 断点显示 resizable + preserveAspectRatio；非 default 断点显示 mobile/list 布局组（mobileHide / desktopHide / mobileOrder / mobileHeight）；scada 布局恒只显示前者〔section-layout 单测；真机 default 断点形态在列〕
- [x] basic / advanced 切换：类型带 basicMode 时头部出现切换，basic 形态由类型自带 basic 配置渲染（如 scada symbol widget 的 targetDevice + 符号选择 + 逐对象绑定）〔WidgetConfigPanel.test「registry meta.basicMode reveals the header switch and basic form」；真机标准类型（无 basicMode）不出现切换，形态正确〕
- [x] 别名闭环：面板内创建 / 编辑别名回调打开别名对话框；过滤器同理〔WidgetConfigPanel.test「inline create opens the alias dialog and applies the saved alias」等〕
- [x] settingsForm（表单配方）统一渲染器：与规则链节点配置共用（ADR 0004；M7 交付）〔`components/form-property` 全套单测；面板设置表单经它渲染〕

### 3.5 states / layouts 对话框群（勘误后完整清单）

> 勘误：原「state controller」非对话框（states-controller.service 注册的 default / entity 控制器组件）；原「select-dashboard-breakpoint」为工具栏内嵌切换组件（→ §3.7）。补漏：add-widget 确认框、widget 选择抽屉、单别名 / 别名集 / 过滤器三个对话框、dashboard-image 非编辑态入口。

- [x] manage-dashboard-states（工具栏 States）：state 列表增删改〔V 波真机 ✅：添加状态/编辑/删除 + default 根状态在列；manage-states.test 专项单测〕
- [x] dashboard-state（manage-states 内 add/edit）：name / id / root 字段〔manage-states.test 单测；真机 add/edit 表单入口在列〕
- [ ] **缺口登记（V 波）：manage-states 复制 state（duplicate）缺**——ui-ngx 状态行操作含复制；本实现仅 编辑/删除。低频操作，登记后随 states 域迭代补齐
- [x] manage-dashboard-layouts（工具栏 Layouts）：布局数量、布局类型（default | scada | divider）、断点增删入口〔V 波真机 ✅：单选 默认/分栏（左+右）/SCADA布局 + 布局设置 + 添加断点；manage-layouts.test 单测〕
- [x] add-new-breakpoint：仅从 manage-layouts「Add breakpoint」打开，选断点 + copyFrom〔add-breakpoint.test 专项单测（copyFrom 逐字复制/断点枚举）；真机入口在列〕
- [x] dashboard-settings（工具栏 Settings）：含 dashboardCss 编辑；被 manage-layouts「Layout settings」复用〔V 波真机 ✅：全字段开关 + 状态控制器 + 仪表盘 CSS 编辑器〕
- [x] dashboard-image：**非编辑态**工具栏入口 + 对话框（编辑态不显示——parity 细节）〔锚点 dashboard-page.component.html:230-235〕〔只读工具栏 update-image 入口已交付（a3b029ec7f）并有单测；本地盘均未设 image，入口按条件隐藏与 ui-ngx 一致——设置 image 后的入口/对话框真机走查留 M10 抽查〕
- [ ] **缺口登记（V 波）：dashboard-image 截图抓图（html2canvas）缺**——上传 / 预览 / 清除 / 保存已等价；「从当前仪表盘生成截图」需引入 html2canvas 新依赖（M7 禁装新依赖），留后续里程碑评估
- [x] 别名集对话框（工具栏 Aliases）+ 过滤器对话框（工具栏 Filters）+ 单别名对话框（widget 面板回调）〔V 波真机 ✅ 别名集/过滤器；单别名回调由 WidgetConfigPanel.test 覆盖〕
- [x] add-widget 参数/布局确认对话框 + widget 类型选择抽屉（操作见 §3.2）〔V 波真机 ✅〕
- [x] select-target-layout：多布局添加 / 导入 widget 时选目标布局〔host.test「select-target-layout delivers the picked layout id（frozen payload）」契约单测；真机单布局盘无触发场景〕
- [ ] select-target-state：从实体视图「添加到仪表盘」路径选目标 state（编辑器自身不直接打开——边界）〔未勾（超出 M7 走查面）：该路径属实体视图域，编辑器侧仅保证不自行打开（现无该入口，边界成立）；随实体视图域走查验收〕

### 3.6 SCADA 布局编辑模式

> 勘误：骨架「select/pan/move 模式切换」在 ui-ngx 4.4.0 无对应实现（全库检索零命中；pan/zoom 仅存在于资源库的 SCADA 符号编辑器页），本 spec 删除该虚构项。SCADA = gridSettings.layoutType 枚举值之一（default | scada | divider），与普通布局共用同一网格编辑器，非独立编辑器。

- [x] layoutType 切换：manage-layouts 对话框内选择与保存生效〔V 波真机 ✅：管理布局对话框单选 默认/分栏（左+右）/SCADA布局 在列并可切换（未保存落库）；manage-layouts.test 单测〕
- [ ] 差异表逐项验收：

| 维度 | 普通布局 | SCADA 布局（验收动作） |
|---|---|---|
| 手机断点 | 窄屏降级单列 | 恒禁用：窄屏不降级〔锚点 dashboard-layout.component.ts:85-104〕 |
| 边距 | margin 10 可配 | margin 强制 0 + outerMargin false（满铺） |
| 列数 | 10–1008 任意 | 仅 24 的倍数（24–1008 下拉），非法值向上取整〔锚点 dashboard-settings-dialog.component.ts:203-207〕 |
| 新增 widget | 保持原样 | 自动仪表化：去标题 / 去阴影 / 透明背景 / 锁定宽高比默认开 / 跳过布局配置步〔锚点 dashboard-utils.service.ts:403-424〕 |
| Layout 配置区 | 按断点条件全量 | 恒只剩 resizable + preserveAspectRatio 两开关 |
| 拖拽 / 缩放 / 碰撞 / 右键菜单 / 快捷键 / displayGrid | — | 与普通布局完全一致（无 scada 分支，回归同 §3.2 / §3.3） |

- [ ] 差异表真机备注（V 波）：真机仅验到切换入口与既有普通布局回归（拖拽/碰撞/右键阻膈同 §3.2/§3.3），未保存过一张 scada 布局；margin 强制 0、列数 24 倍数夹取、自动仪表化已由 `manage-layouts.test`/`scadaColumnClamp`/grid-math scada 分支单测取证——真机 scada 走查留 M10 抽查补勾
- [x] 否定项清单（防虚构义务，同样不得作删减依据）：无指针模式切换、无对齐 / 吸附线、无 z-index 层级操作、无多选 / 框选、无碰撞推挤〔V 波代码层核查：画布无模式切换/吸附线/层级/框选代码路径；碰撞=阻挡非推挤（真机实证）〕
- [ ] 边界：SCADA 符号编辑器页（`/resources/scada-symbols`，SVG 结构 / tag / 行为元数据编辑 + pan/zoom）归资源库子系统（v2 阶段交付，不在本 spec）；仪表盘内 symbol 实例只能换符号 / 绑设备 / 绑对象，不能改 SVG 结构〔未勾（V 波）：scada 符号类型尚不存在，实例约束无从走查——随资源库子系统交付验收〕

### 3.7 断点与 mobile

- [x] 断点覆盖编辑：工具栏断点切换组件（select-dashboard-breakpoint）+ 断点专属布局〔BreakpointSwitcher 单测（三桶切换强制 override）；真机本地盘均无 breakpoints，切换器按条件不出现——建断点后的真机走查留 M10 抽查〕
- [x] mobile 单列栈预览：default 布局 mobile 断点单列〔grid-math 单测（mobileHide 过滤/单列栈/行跨排序）；真机未投真机视口〕
- [x] autofill 行高：autoFillHeight / mobileAutoFillHeight 设置生效（edit 或 scada 下强制 false——parity 条件）〔锚点 dashboard.component.ts:672-679〕〔grid-math 单测（autofillAllowed = !scada && !edit 条件分支）〕

### 3.8 数据闭环

- [x] 离开确认：dirty 精确判定（draft 与 baseline 引用比较；改后全部撤销 = 干净不弹窗）〔V 波真机 ✅：脏草稿退出编辑 → 确认弹窗；撤销到底 → save 禁用（dirty=false）→ 干净退出；返回箭头守卫同源修复（commit 997267f847）后复验同弹窗〕
- [x] 导入：JSON 导入落编辑器；缺别名时补录对话框（v1 只读导入曾裁剪，v2 编辑器导入恢复 parity）〔锚点 dashboard-page.component.ts:1073〕；导出剥 id/tenantId 对齐 TB〔V 波真机 ✅：导出实测键集无 id/tenantId/version；导入确认框明示「一个撤销组」+ 草稿替换；缺别名补录子项未真机触发（同盘导入），契约单测覆盖〕
- [x] 409 三选项闭环（行为契约）：加载服务器版 / 用我的版本覆盖（GET 新 version 再 POST；二次 409 上限 3 次回落）/ 导出本地 JSON 后放弃〔shell.test 保存路径 + 三选项 handler 单测；真机未复现并发冲突（单人本地环境），留 M10 多开抽查〕

### 3.9 行为契约：仪表盘撤销栈

- [x] 结构性操作各为一条事务组：添加 / 删除 / 拖拽落格 / resize / 粘贴（含引用组）〔V 波真机 ✅：添加/拖拽/粘贴各入一栈、一次 ctrl+z 整组抹掉粘贴；session 单测〕
- [x] 表单连续输入合并一步（coalesceKey + 1s 时间窗）〔session coalesce 单测（时间窗合并/redo 在场不合）；面板配置路径经 P6 取证〕
- [x] 配置面板事务取消零残留（打开面板 checkpoint、取消按组回滚、预览恒吃主 draft）〔WidgetConfigPanel.test checkpoint 回滚 + undo landing 单测（P6）；真机一次「取消」后标签页崩溃（疑点 S1，未复现、无堆栈）——按单测勾选并留观〕
- [x] 撤销到底 dirty 归 false；任何新事务组入栈清空重做栈〔V 波真机 ✅：undo 后 undo 禁用/redo 可用的按钮态随动；session 单测（引用复位锚定）〕
- [x] 不入栈项：选中 / 多选、视口、面板开合、timewindow 临时调整〔V 波真机 ✅：选中/面板拉起后 undo 按钮态不变；timewindow 选择器绑运行态不入 session（shell 单测）〕

## 4. 规则链画布操作面（对齐 rulechain-page 全家）

### 4.1 画布基础交互

- [x] 节点拖入：节点库 HTML5 DnD → 画布落节点〔V 波真机 ✅：DnD→添加节点对话框（脚本族表单+Test 按钮）→确定落格+INPUT 随现；shell.test DnD-to-dialog 单测〕
- [x] 节点拖动（dragStop 一次提交一个事务组——半受控，ADR 0004）〔单测锚：interactions.test moveNodes 一组+INPUT 不可动；canvas.perf.test dragStop 事务边界；真机旁证 dragStop 事务提交〕
- [x] 框选 / ctrl 多选 / 全选 / 取消全选〔V 波真机 ✅：ctrl+a 全选（3 节点+便签）/esc 取消；框选与 ctrl 逐点多选未真机驱动——selection 单测锚〕
- [ ] magnet 连线（输出桩 → 输入桩）；INPUT 节点唯一出边约束〔真机未目击（E1 环境受阻：自动化通道无法驱动 RF handle 手势，详见走查 §1 步骤 5）；事务语义单测锚：interactions.test setInputTarget 唯一出边替换/删除 + rule-chain-draft.test——**留观：人工真实鼠标连线目检一次**〕
- [x] 多 label 边：一条边多个 label；label 编辑 / 删除小圆钮〔V 波真机 ✅：导入聚合边「False / True」渲染；~~label 编辑对话框真机未驱动且 dialogs/link-labels 无专项单测——缺口 D3 登记~~ → **单测缺口已补（X 波，commit 70d6896f82）**：link-labels.test 专项 7 例（候选渲染 / 多选一次回传一组 / 取消不回传 / edit 预选 initialLabels / 空选禁 OK / customRelations tags 自定义标签 / ruleChainNode 源 getRuleChainOutputLabels 拉远端候选）；真机驱动仍受限（连线需 RF handle 手势，同 E1 留观行）〕
- [x] 节点 / 边删除〔V 波真机 ✅：Del 删节点 4→3+ctrl+z 复原；边删除单测锚 interactions.test 三类分组删除/INPUT 边经 setInputTarget(null)〕
- [x] 节点复制 / 粘贴：粘贴为一组（guid 重生成，一个事务组）〔V 波真机 ✅：ctrl+c/v 4→5，一次 ctrl+z 整组抹掉 5→4；clipboard.test uid 重生锚〕

### 4.2 画布导航

- [x] 画布自动扩张：节点越界画布跟随扩张（adjustCanvasSize 语义）；初始 viewport (0,0) / zoom 1 无跳变〔单测锚：geometry.test canvasExtent（translateExtent 随节点生长）+ canvas-render.test 初始 viewport；真机未单独驱动越界场景〕
- [ ] （缩放平移为能力级增强 → §7）

### 4.3 便签

- [x] alt+n 添加；行内编辑（markdown 渲染 + sanitize）；拖动；复制；删除〔V 波真机 ✅：alt+n 对话框→markdown 渲染（h1/strong/code/li 无裸标记）→编辑改 blockquote 重渲染→菜单删除；拖动单测锚 interactions.test moveNote；复制单测锚 clipboard.test〕

### 4.4 嵌套规则链与右键菜单

- [x] ctrl+r 从选中节点创建嵌套规则链〔V 波真机 ✅：对话框命名→画布替换为 TbRuleChainInputNode；API 复核子链含 TbRuleChainOutputNode+connection、父链保存；校验/重接线单测锚 nested-chain.test〕
- [x] 右键菜单四类齐备：画布空白 / 节点 / 边 / 便签，菜单项对齐 ui-ngx〔V 波真机 ✅：pane 九项（含正确禁用态）/节点 详情·复制·删除（INPUT 无菜单）/便签 编辑·复制·删除；边菜单同源未单独目击——与 D3 同记。
  - ~~**D2 缺口（V 波新登记，低）：节点双击不打开详情抽屉（ui-ngx `fcEventNodeDblClick` parity 缺口）；v2 仅右键菜单→详情**~~ → **已修复（X 波，commit 674261592b）**：canvas 新增 `onNodeDoubleClick` 透传 prop，shell 复用右键菜单「详情」同一 `setDetailsUid` 路径（INPUT 只读节点与便签节点 shell 侧过滤——便签有自己的编辑对话框）；shell.test 双例锚（双击普通节点抽屉开 / 双击 INPUT 不开）；真机复验：双击 switch 节点「规则节点详情」抽屉打开、取消关闭、双击 INPUT 不开〔截图取证〕〕

### 4.5 节点配置表单与 76 节点 dry-run 统计口径

- [x] 统一 FormProperty 渲染器 + uiHints 静态映射 + 定制组件注册表（P0：脚本族 / switch / 键操作 / save timeseries-attributes / create-clear alarm）；任何字段可切 JSON 源码模式（TB 无 directive 时的兜底语义对齐）〔V 波真机 ✅：log（脚本族 ScriptEditor+Test）/ message type filter 抽屉表单；dry-run 94 用例 76 节点全渲染+JSON 兜底 1〕
- [x] dry-run 统计口径（定稿）：〔V 波复核 ✅（2026-09-04）：报告↔摘要 fixture 数字一致——76 节点（六类 12/11/9/26/14/4）、可编辑率 100% 达标、控件级 75/76=98.7% 达标（63 纯控件+12 合法空形态+1 JSON 兜底 send notification）、不可编辑 0、崩溃 0、deprecated 照扫 4、判据④ 12 类抽样全过；报告 `docs/spec/v2-m8-dry-run-report.md`，真机交叉印证节点库计数与抽屉表单〕
  - **统计对象**：CORE 画布可见内置节点 **76 个**（全仓节点类 77；`push to cloud` 为 EDGE-only 不入面——后端 @RuleNode 全量 grep + AnnotationComponentDiscoveryService 扫描锚点）
  - **分类基础**：节点库 6 大 ComponentType：ACTION 27 / EXTERNAL 14 / FILTER 12 / ENRICHMENT 11 / TRANSFORMATION 9 / FLOW 4（与 UI 分组一致；java 包 24 个粒度过细且与 UI 不一致，不作分类）
  - **判据（每节点四项）**：① 表单非空（渲染 ≥1 字段控件或 JSON 源码非空）；② 无崩溃（React 错误边界不触发）；③ 渲染三态归类——控件级 / JSON 兜底（uiHints 未覆盖且类型不可推断，源码模式可编辑）/ 不可编辑；④ round-trip（改默认值 → 保存 → 重开值保持）
  - **双指标门槛**：可编辑率（非空 ∧ 无崩溃 ∧ 三态非「不可编辑」）= **100% 硬门槛**；控件级渲染率 ≥ **85%** 为登记项——不达标节点出降级清单随 M8 验收注落账，不挡验收
  - **跑法**：组件级自动化 dry-run（枚举节点 → 逐个经 FormProperty 渲染器渲染 → 断言①②③）脚本随 M8 交付；人工抽查 = 6 类 × 2–3 个节点做④（避开 4 个 deprecated：delay / device profile (deprecated) / synchronization start / end——deprecated 照扫不抽查）
  - **证据**：统计报告（节点 × 判据矩阵 + 三态计数 + 降级清单）为 M8 验收证据；是否纳入 #12 常驻回归由 #12 扩充时另定
  - **对标语义**：ui-ngx directive 缺注册显示 `rulenode.directive-is-not-loaded` 错误——本口径「不可编辑」即对标该失败态，出现即红〔锚点 rule-node-config.component.ts:210-249〕

### 4.6 脚本编辑与测试

- [x] JS / TBEL 切换（tbelEnabled=false 强制 JS）〔V 波真机 ✅：添加节点对话框与详情抽屉 segmented 控件在场（JS 默认选中）；tbelEnabled 禁用态单测锚 ScriptEditor.test〕
- [x] Test 面板：POST /api/ruleChain/testScript；两入口（配置抽屉 Test 按钮 + 事件行「test with this message」）〔V 波真机 ✅：添加节点对话框 Test 按钮→默认 payload→运行→POST 200+输出区回显；「test with this message」入口本地无 debug 事件未复现（走查 §2），面板接线单测锚 ScriptTestPanel.test〕
- [x] TBEL 高亮 / 补全（tbel-utils 移植）；CodeMirror 统一封装（TSX / JS / CSS / JSON / TBEL 五语言）〔单测锚：S 波 ScriptEditor.test + CodeEditor 五语言；真机 CodeMirror 高亮+行号目击（log 脚本）〕

### 4.7 节点详情与事件 / 调试

- [x] 详情三 tab：details / events / help〔V 波真机 ✅：右键→详情抽屉，三 tab 在列；表单编辑实时上画布、取消零残留（疑点 S1 留观 → **X 波查证结案：设计行为，不修**——`core/editor/session.ts:21-24` 契约明示 rollback「提交一个新事务组、可与 undo/redo 组合」；M7 对照同款：`WidgetConfigPanel.test:246-248` 取消后栈内恰有一个 `rollback: panel:w1` 组、canUndo 仍真；undo 再按一次 = 撤掉回滚组即恢复被取消的编辑，语义自洽。M8 抽屉取消路径与 M7 面板同一 checkpoint 范式，行为一致）、应用持久〕
- [x] help：HTML 消毒渲染（DOMPurify）+ docUrl 外链；文案透传不翻译〔V 波真机 ✅：descriptor 英文透传 + `查看文档` 外链 thingsboard.io/docs/.../log/（_blank）；DOMPurify 管道单测锚 details.test〕
- [x] 事件表：POST filter 端点（body 多态 eventType）、过滤字段、clear、刷新〔V 波真机 ✅（自建链）：fetch 钩子实抓 POST body `{"eventType":"DEBUG_RULE_NODE"}`→选 OUT 后 `+msgDirectionType:"OUT"`；清空→`POST …/clear` 同 filter body+自动刷新；有数据表未复现（本地无 debug 流量，Root 链不可动）——表列/空态/控件目击；debug-events-table.test 锚〕
- [ ] 「test with this message」预填 debugIn〔真机未复现：需既有 debug 事件（本地无流量）；debugIn 端点接线单测锚 debug-events-table.test〕

### 4.8 节点库

- [x] 六类分组 expansion panel（FILTER / ENRICHMENT / TRANSFORMATION / ACTION / EXTERNAL / FLOW）〔V 波真机 ✅：12/11/9/26/14/4=76 与 dry-run 口径一致；搜索「log」→1 项/他组暂无数据〕
- [x] 节点库搜索与画布高亮搜索共用 state〔单测锚：shell.test searchText 通道 + canvas-render.test highlight 环；真机搜索过滤目击〕

### 4.9 保存 / 409 / 导入导出

- [x] 保存 = 链 + metadata 双段提交；新节点本地 uid 主键、提交 id 缺省护栏〔V 波真机 ✅：导入即存+改名保存均成功，API 复核后端新铸节点 id/连接/firstNodeIndex；save-rule-chain.test 双段+护栏锚〕
- [x] 检查点语义明示：保存清栈有 UI 提示（行为契约）〔V 波真机 ✅：toast「保存成功，撤销历史已清空」；保存后 ctrl+z 无反应、undo/redo 禁用；再改→撤销可用〕
- [ ] 409 三选项闭环（行为契约，同 §3.8）〔真机未复现：单机无并发冲突（M7 同款处理）；三选项契约单测锚 save-rule-chain.test（Option A 加载服务器版/Option B 用我的版本覆盖/重试上限/拒绝盲写）+ ConflictDialog——**留观：人工双开两会话构造一次版本冲突**〕
- [x] 导入：文件解析；旧格式迁移两处（ruleChainConnections → TbRuleChainInputNode、debugMode → debugSettings）——parity 勾选；内存暂存为增强（§7）〔V 波真机 ✅：导入预览契约明示（不带 id/租户/根链 + 双迁移计数）；TbRuleChainInputNode `configuration.ruleChainId` 指向目标链 API 复核；import-export.test 全管线锚〕
- [x] 导出：剥离规则对齐 TB〔V 波真机 ✅：blob 键集 `{ruleChain{name,type,firstRuleNodeId,root,debugMode,configuration,additionalInfo}, metadata}` 无 id/tenantId/version；export-draft.test 锚〕

### 4.10 ruleChains 全域页面

- [x] 列表 / 搜索 / 详情 tabs（含 events tab）〔V 波真机 ✅：搜索/排序（API sortProperty/sortOrder）/新建/编辑/导出/导入；根链行设为根链+删除禁用、非根链全项可用；「规则链详情」五 tab 属性/告警/事件/关联/审计日志。
  - ~~**D1 缺口（V 波新登记，低）：`ruleChains.list.toastCreated`/`toastImported`（及 `deleteTitle` 同款）ICU 直引号 `'{name}'` 转义占位符，toast 显示裸 `{name}`**~~ → **已修复（X 波，commit 10fba18156）**：zh 改中文角引号「」/en 改双引号（ICU 单引号是转义符，双引号无歧义），zh/en locale + defaultMessage 同步三处；list.test 补创建 toast 与删除确认框的**实际插值断言**（formatMessage 带参渲染）；真机复验：新建「X 波复验链3」toast 显示「规则链「X 波复验链3」已创建。」〔截图取证〕〕

### 4.11 行为契约：规则链撤销栈

- [x] 节点移动 / 连线 / 增删 / 粘贴各为一条事务组〔V 波真机 ✅：添加/粘贴（整组一撤）/删除/改名各一组目击；移动与连线事务单测锚 interactions.test/rule-chain-draft.test〕
- [x] 保存 = 检查点：清栈 + 明示（保存后 ctrl+z 无反应为设计行为）〔V 波真机 ✅：明示 toast + ctrl+z 无反应 + 再改可撤 全链路目击〕

## 5. widget 编辑器操作面（对齐 widget-editor 全家）

### 5.1 布局

- [x] 左代码右预览、底部 console；分屏可调（react-resizable-panels）〔V 波真机 ✅：左元数据侧栏 + 中代码 + 右预览 + 底部控制台三/四区布局目击；**分屏拖拽未驱动**（E2 环境受阻：react-resizable-panels 对合成指针事件不启动，handle DOM 在场），分屏可调以组件库行为 + DOM handle 在场为准〕
- [x] 代码区四 tab：TSX / CSS / Schema（settingsForm）/ defaultConfig + 元数据侧栏（type / size / typeParameters / actionSources）〔V 波真机 ✅：四 tab 内容逐一目击（Schema = settingsForm JSON、CSS = 模板 CSS、defaultConfig = JSON 字符串、TSX = 源码）；侧栏 fqn 只读 / 名称 / 类型下拉 / 宽高 / 类型参数 JSON / 添加操作源（actionSources）在列〕
- [x] 同页预览（弃 iframe）：编译前置同步抛错、双层样式命名空间、hook 订阅独立生命周期〔V 波真机 ✅：语法错运行 → 运行序号不递增 + 错误横幅（编译前置同步抛错）；key 递增 remount 目击（ctrl+enter 运行序号 0→3）；双层样式命名空间由 style-scope.test（P10）+ 仪表盘侧 CustomWidgetHost 挂载路径锚定〕

### 5.2 运行 / 保存 / 文件操作

- [x] 运行：ctrl+enter 重编译 + key 递增 remount〔V 波真机 ✅：▶ 运行与 ctrl+enter 同路径目击；ctrl+enter 全局接线以正确属性 KeyboardEvent 派发证实（合成按键修饰键投递进 CM 退化，E2 注记）；编译失败不 remount 目击〕
- [x] 保存：编译 → 执行 → 冒烟渲染 → commit；409 显式 diff 不静默覆盖（行为契约）〔V 波真机 ✅：保存成功 POST /api/widgetType 恰 1 次 + toast「已保存」+ URL 首存替换为 /widgets/editor/:id；**保存中止目击**——组件抛错 ctrl+s → toast「保存中止：组件冒烟渲染失败」+ fetch 钩子实抓 POST 为零；409 三选项未复现（单机无并发，M7/M8 同款处理），契约单测锚（use-widget-save.test + save-with-conflict 共享件）〕
- [x] 另存为；恢复上次保存；全屏；Tidy（prettier standalone）〔V 波真机 ✅：另存为对话框 + POST 新建 + URL 换新 id；恢复上次保存含确认对话框 + 整组回基线 + **恢复后 ctrl+z 一次找回全部编辑（一个事务组）**；全屏 AX 树验证（应用壳消失、fullscreen-exit 随动）；Tidy 真机重排（引号归一/括号折叠/空行清除）〕

### 5.3 快捷键与焦点（行为契约）

- [x] 五快捷键齐套：ctrl+s / shift+ctrl+s / ctrl+enter / shift+ctrl+f / ctrl+q〔V 波真机 ✅：帮助面板列出五键 + ctrl+z/y/?；ctrl+s（保存）、shift+ctrl+s（另存为）、ctrl+enter（运行）、shift+ctrl+f（Tidy）真机或同路径目击；**ctrl+q 热键本体未单按**（退出按钮 + 离开守卫真机目击，热键注册同源 useHotkeys ANY_FOCUS）〕
- [x] 代码内 ctrl+z 归 CodeMirror 自身栈；焦点在面板 / 表单时归 EditorSession——焦点切换归属正确〔V 波真机 ✅：CM 内 3×ctrl+z 仅回退文本（侧栏 session 不动）；侧栏表单内 ctrl+z 回退 session（defaultConfig 回退 + redo 转可用）；shell.test 焦点路由双例锚〕
- [x] 「?」快捷键帮助面板（三编辑器一致，§6.3）〔V 波真机 ✅：抽屉列 8 个快捷键 + 说明，ctrl+z 描述明示焦点路由语义；「?」按钮与热键同源（useKey + 非 typing 守卫）〕

### 5.4 预览

- [x] defaultConfig 解析订阅（function 数据源随机数据渲染）〔V 波真机 ✅：时序折线模板预览实时渲染双序列随机折线；设置表单（Line color / Show dots）由 settingsForm 生成〕
- [x] 编辑 settings 回写 defaultConfig（所见即所得）〔V 波真机 ✅：Line color #1677ff→#ff0000 → defaultConfig 即时回写 + 预览线色变红；**已知行为②注记**：紧凑 JSON 被重排为 2 空格缩进（内容正确、格式不保留，登记不修）〕

### 5.5 错误闭环

- [x] 编译错：CodeMirror 行级标注〔V 波真机 ✅：`return (()` 语法错 → 错误行 `cm-lintRange-error` 红色波浪线（sucrase 行号映射编辑器行 11）+ 预览错误横幅 + 控制台红色「编译失败 …(line 11)」〕
- [ ] 运行错：console 输出 + 行号偏移定位（每实例 ErrorBoundary + sourceURL）〔未勾（真机未触发）：运行期抛错未单独构造目击——冒烟渲染抛错 toast「保存中止：组件冒烟渲染失败: v-probe boom」已目击；sourceURL/lineOffset 映射由 compile.test.tsx（P1）单测锚定；留 M10 抽查〕
- [x] 输入即清错〔V 波真机 ✅：错误行输入一个空格 → cm-lintRange 归零 + 预览错误横幅消失（AX 诊断 list 同步移除）；修好重跑恢复〕

### 5.6 新建与派生

- [x] 新建 = 5 个 React starter 模板选择（内置前端静态资产）〔V 波真机 ✅：五桶（最新值卡片/时序折线图/RPC 控制按钮/告警状态卡/静态卡片）+ 未选禁用创建 + 原地进 shell；create 路由挂载即弹新建对话框（设计行为）〕
- [x] 从现有自定义类型派生（源码可得全量派生）〔V 波真机 ✅：派生对话框「从自定义类型」列表列出租户类型（fqn 在列）+ 文案「源码（TSX/CSS/Schema/defaultConfig）全量复制为新副本」+ 名称预填 (copy)；创建路径与另存为同链（POST + 原地进 shell 已目击）〕
- [x] 从内置类型受限派生：schema / config / 尺寸可得、源码不可得——UI 诚实标注〔V 波真机 ✅：「从内置类型」档标注原文「内置类型是 Angular widget：源码不可得。仅复用其 Schema/defaultConfig/尺寸骨架，TSX 使用 starter 骨架（不会出现 Angular 源码）」+ 内置类型列表，不暗示「即将支持」〔截图取证〕〕

### 5.7 导入导出

- [x] fork 格式（runtime react-1 + source 五件）导出 / 导入 round-trip〔V 波真机 ✅（导出半）：导出 blob 钩子捕获 3667B JSON——顶层键集无 id/tenantId/version/createdTime、descriptor 含 runtime/schemaVersion/source{tsx,css}/type/sizeX/sizeY/settingsForm/defaultConfig；**fork 导入 round-trip 真机未单独走**（import-export.test round-trip 单测锚 + Angular 导入同槽对话框真机目击）——该半项随 M10 抽查补走〕
- [x] TB Angular widget JSON 导入 → badge + 占位链路（拒绝会使引用仪表盘半残，ADR 0004）〔V 波真机 ✅：手工构造 Angular 形状 JSON 导入 → 徽标「Angular（非 react-1）」+ 诚实占位文案 + 「保存为服务器副本」不拒收 → POST 200；副本 fqn 原样落库登记观察项 O1〔截图取证〕〕
- [x] 导出物自带 runtime / schemaVersion 标记（TB 导入无害）〔V 波真机 ✅：blob 核对 `"runtime":"react-1","schemaVersion":1` 在 descriptor 头两键〕

## 6. 横切验收

> M9 V 波只记录本段在 widget 编辑器触及面内的真机/门禁事实（不勾账，勾账留 M10 收口复查）。

- [ ] **i18n**：`editor.*` 命名空间 key 双语齐全（CI check-locale 零红）；透传文案不进 key（help tab 详情、后端错误原文、uiHints 之外 descriptor 文案）
  - M9 触及面（V 波）：`editor.widget.*` 双语在 CI 绿；真机 zh/en 双向切换编辑器 chrome（工具栏/tab/侧栏/帮助面板/错误文案）无裸 key；透传文案（编译错误原文、Angular descriptor）不进 key 目击。
- [ ] **占位三态**：三态文案（§1 原则 3）+ widget 库 `angular-unsupported` badge
  - M9 触及面（V 波）：Angular 导入徽标「Angular（非 react-1）」+ 占位文案目击，不暗示「即将支持」；三态占位组件在仪表盘闭环中未误现（真渲染）。
- [ ] **三编辑器行为一致性**：撤销边界四条（§1 原则 4）三处同源（EditorSession）；409 三选项对话框同形；「?」帮助面板；右键菜单 antd Dropdown contextMenu 形态；离开确认 dirty 判定同源
  - M9 触及面（V 波，widget 侧）：撤销焦点路由（CM / session）与保存不入栈真机目击、同源 EditorSession；409 共享 ConflictDialog 同形复用——**但共享 intro 文案写死「仪表盘」（D2 登记）**；「?」帮助面板同源在列；离开确认 dirty 与返回箭头守卫同源（PageContainer back guard）真机目击。
- [ ] **增强与等价无冲突**：§7 登记项全开状态下 §3–§5 checklist 复查无回归（M10 执行）
- [ ] **主题**：编辑器 chrome 无内联色值（antd token 层）；图表走 charts.ts 管道
  - M9 触及面（V 波）：编辑器 chrome DOM 探针零内联色值（唯一命中为 recharts 库内默认 tooltip 样式）；widget 图表颜色经 settings/descriptor 数据层（recharts），非 chrome 内联。
- [ ] **性能**：ADR 0004 附录 A P1–P10 全过——P1–P8 开工前 PoC 一次；P7（memo 边界）随 M7、P4（500 节点 ≥50fps）随 M8、P9 / P10 随 M9 实现复验
  - M9（V 波）：P1/P2 = compile.test.tsx（0759c9395c）、P10 CSS 前缀 = style-scope.test.ts（a982d33b5d）、P9 + P10 resources round-trip = import-export.test.ts（f3bdb7d19d）——证据落点已回填简报 §5，V 波核实文件与标记均在主检出。
- [ ] **自动化衔接**：本 spec 为人工验收载体；编辑器自动化回归（画布交互 E2E、EditorSession 单测等）登记 #12 基线扩充；dry-run 脚本随 M8 交付，是否常驻回归由 #12 扩充时另定

## 7. 能力级增强登记表（只登记，不设验收义务）

| 增强项 | 域 | 来源 | 冲突约束 |
|---|---|---|---|
| 画布缩放平移（限域 0.5–2x，无 minimap / controls） | 规则链 | #13 / ADR 0004 | 不遮挡右键菜单与框选 |
| 边重连 | 规则链 | #13 | 与 magnet 连线、label 小圆钮不冲突 |
| 导入内存暂存（模块内存 + 路由 state） | 规则链 / 仪表盘 | #13 | 刷新丢失不得破坏导入等价流程 |
| 崩溃保护（sessionStorage 序列化 draft，代码文本 debounce） | 三编辑器 | #13（红队 F13） | beforeunload / 路由 blocker 不误伤正常离开确认 |
| 512KB descriptor 软限警告 | widget 编辑器 | ADR 0004 | 仅警告不阻断 |

## 修订记录
- 2026-09-04：**M9 D1/D2/O1 修复（X 波，收口）**。D1（commit 9d73b1d9ac）：lint 门禁红清账——locale 聚合器 format 漂移 `biome check --write` 复位（`.gitattributes` 对 ui-antd 强制 LF，盘上复位 git 视为无 diff，biome 全仓复查证实），wave-3 D 文件 11 个 warning 逐个真修（删未用变量/导入、非空断言改收窄守卫），**零 biome-ignore**；终态 lint 三合一退出码 0（error 0 / warnings **30 基线**）。D2（commit 802fc7084b）：core 共享 ConflictDialog intro 文案中性化（zh「服务器上的内容已被他人修改…」/en 同步 + defaultMessage 三处），dashboards 域 419 用例复跑无断言钉原文，ruleChain 域独立 key 未动——三编辑器同形契约保持，按域注入多 key 留 M10 一致性复查再议。O1（commit cde7dc5028，TDD 先红后绿）：Angular「保存为服务器副本」落库前剥离 fqn 作用域前缀（`system.foo`→`foo`，前缀-only 塌缩空串由后端从 name 派生），新增 2 用例。终验门禁（收口人复核）：`npm run lint` 0 error/30 warnings、tsc 绿、check-locale 绿、`npm run test` **1657/1658**（唯一失败 = master 存量 entry.test.tsx 确定性红，隔离复跑同败，非 M9 回归）。M9 合并回 master，分支删除；§5 勾账终态 19 勾/2 未勾（未勾两项均单测锚定，随 M10 抽查）。
- 2026-09-04：**M9 验收勾账（V 波）**。全量门禁（主检出 feature/m9-widget-editor @ cf4ec1321f）：tsc 绿、check-locale 绿；`npm run test` 1656 例两轮 1654 → **1655 绿**（唯一稳定红 = master 存量 entry.test.tsx；run1 的 dashboards editor shell.test 超时在 run2/隔离复跑全过——并行负载抖动判定成立，未压 testTimeout）；**`npm run lint` 红 = D1 登记**（locales zh-CN.ts/en-US.ts biome format 漂移 2 errors + M9 wave-3 D 文件新增 11 warnings，全仓 error 必须为 0 的门禁被合并破坏）。真机走查（browseros，dev server 按惯例重启后执行；自建 3 widget 类型 + 1 仪表盘及 fixture 迭代盘已全部 DELETE，服务器复原）：§5 共 **19 行勾选 / 2 行未勾**——未勾 = 运行错 sourceURL 行号偏移行（真机未触发，compile.test P1 单测锚）与 fork 导入 round-trip 行（导出半真机目击、导入半真机未走，import-export.test 锚）；行内注记：分屏拖拽（E2 环境受阻）、ctrl+q 热键本体未单按（同路径目击）、409 未复现（单机，契约单测锚）、512KB 软警告 UI 无法自然触发（单测锚）。§6 横切只做 M9 触及面记录（i18n 双向无裸 key、主题零内联色值、一致性 widget 侧同源 + D2），不越权替 M10 勾账。money demo 闭环打通：手工构造引用 `tenant.m9_v_` 的最小仪表盘经导入路径进 v2 仪表盘，自定义 widget **真渲染非占位**（编译产物自有 recharts DOM + 组件自绘空态，三态占位未误现）；数据序列为空经内置对照组证实为既有数据管道/窗口问题（与 M9 渲染链无关）。新登记：**D1 lint 门禁红（中）**、**D2 409 共享对话框 intro 写死「仪表盘」（低，代码证实）**、**O1 Angular 副本 fqn 原样落库（低/边界）**；已知行为②③④（settings 回写重排缩进 / console 窗口化 / 实例级 widgetCss 预览不挂载）复核为设计行为，注记不修。简报 §5 PoC 证据回填（P1/P2/P9/P10 commit hash 核实）。真机走查全程记录见 [v2-m9-browser-walkthrough.md](./v2-m9-browser-walkthrough.md)。
- 2026-09-04：**M8 验收勾账（V 波）**。全量门禁：lint 绿（30 warnings 基线）、tsc 绿、check-locale 绿；`npm run test` 1427 例 1426 绿（唯一失败为 master 存量 entry.test.tsx，M7 已登记，单跑复现同失败，非 M8 回归）；rule-node 域 125/125 绿（dry-run 94 用例）。dry-run 终版复核：报告↔摘要 fixture 数字一致（76 节点、可编辑率 100%、控件级 98.7% 含 12 合法空形态、不可编辑 0、判据④ 12 类全过）。真机走查（browseros，自建 4 链已清理）：§4 共 **27 行勾选 / 3 行未勾**——未勾 = magnet 连线行（E1 环境受阻：自动化通道无法驱动 RF handle 手势，事务语义单测锚定 + 留观人工目检）与「test with this message」debugIn 行（本地无 debug 流量）；409 三选项行保持未勾（单机未复现，契约单测锚定，M7 同款处理）。新登记缺口/缺陷 3 行：D1 ruleChains toast ICU 直引号转义致 {name} 不插值（低）、D2 节点双击不开详情（ui-ngx parity，低）、D3 link-labels 对话框无专项单测+真机未驱动（低）；疑点 S1 详情抽屉取消后 undo 按钮态留观。真机走查全程记录见 [v2-m8-browser-walkthrough.md](./v2-m8-browser-walkthrough.md)。
- 2026-09-04：**M8 D1/D2/D3 修复 + S1 结案（X 波）**。D1（commit 10fba18156）：ruleChains 列表 toast/删除确认 ICU 直引号转义缺失（react-intl 中 `'{name}'` 的单引号是转义符 → 显示裸 `{name}`）——zh 改中文角引号「」、en 改双引号（无 ICU 歧义），locale zh/en + defaultMessage 三处同改；list.test 补创建 toast 与删除确认框的实际插值断言。D2（commit 674261592b）：节点双击开详情抽屉（ui-ngx `fcEventNodeDblClick` parity）——canvas 新增 `onNodeDoubleClick` 透传，shell 复用右键菜单「详情」同一 `setDetailsUid` 调用路径，INPUT 只读节点与便签节点 shell 侧过滤（便签走自己的编辑对话框）；shell.test 双例锚（普通节点开 / INPUT 不开）。D3（commit 70d6896f82）：link-labels 对话框专项单测 7 例（候选渲染 / 多选一次回传一组 / 取消不回传 / edit 预选 initialLabels / 空选禁 OK / customRelations tags 自定义标签 / ruleChainNode 源 `getRuleChainOutputLabels` 拉远端候选）；真机驱动仍受限（连线需 RF handle 手势，同 E1 留观）。S1 结案不修（设计行为）：`core/editor/session.ts:21-24` 契约明示 rollback「提交一个新事务组、与 undo/redo 可组合」——取消后栈内留 rollback 组 → canUndo 真是契约的直接推论；M7 对照同款（`WidgetConfigPanel.test:246-248` 取消后恰有一个 `rollback: panel:w1` 组），undo 再按一次 = 撤掉回滚组恢复被取消编辑，语义自洽，与 M7 面板一致。门禁：rule-chains 域 95/95 绿、tsc 绿、biome 触及文件零告警、check-locale 绿。真机复验（browseros，自建 3 链已删、服务器恢复原状）：新建 toast 实际插值「规则链「X 波复验链3」已创建。」；双击节点「规则节点详情」抽屉打开、取消关闭、双击 INPUT 不开〔截图取证〕。

- 2026-08-31：#13 决议创建骨架（操作面清单 + 原则 + 横切章）；定稿由 #15 承接。
- 2026-09-03：**定稿**（#15 两轮 grilling + 双路源码侦察）。勘误三条（均有源码锚点）：① SCADA「select/pan/move 模式切换」ui-ngx 4.4.0 无对应实现，删除并重写为 layoutType 差异表 + 否定项清单；② states / layouts 对话框群勘误（state controller、select-dashboard-breakpoint 非对话框）并补漏 5 项；③ widget 配置面板 tab 集 3.x → 4.4 重构事实（Data / Appearance / Widget card / Actions / Layout 五区 + basic/advanced 切换）。口径精确化：「77 内置节点」→ 77 节点类 / CORE 可见 76 入统计面；分类基础 = 6 大 ComponentType（27/14/12/11/9/4）。结构决策：分账三档（等价项 / 行为契约增强勾选 / 能力级增强登记）；里程碑 M7–M10；dry-run 统计口径定稿（双指标 + 自动化跑 + 6 类人工抽样）。
- 2026-09-04：**M7 验收勾账（V 波）**。全量门禁：lint 绿（顺手清掉 M7 波次遗留 4 个 biome error，commit 3f60c89916）；`npm run test` 1074 例 1073 绿（唯一失败为 master 存量：M6 604ffeff52 给 entry.tsx 加 token-first 守卫、测试 mock 未跟上，非 M7 回归）；P7 memo 边界证据落地（memo-boundary.perf.test.tsx，单 widget 写 delta=1、选中零内容重渲染，简报 §5 回填）。真机走查（browseros，4 盘 3 正常 1 崩溃）：§3 共 **43 行勾选 / 13 行未勾**（未勾 = 原有等价项 6 + 新登记缺口/缺陷 6 + 差异表真机备注 1，逐行注明原因：右键菜单 2 行环境受阻；空盘自动编辑、select-target-state、scada 差异表保存、scada 符号边界等真机未及）。兜底新登记缺口 6 行：D1 Software 盘编辑器路由崩溃（高）、D2 添加 widget 落 `(0,0)` 不寻空闲位（中）、D3 add-widget 标题填 fqn 原文（低）、manage-states 复制 state 缺、抽屉 scada 类型置顶缺（待符号类型存在）、dashboard-image html2canvas 抓图缺（禁装依赖）。**PageContainer 返回箭头绕过离开守卫（D2 交付时标记）：代码确认组件自带 `dirty` 守卫而编辑器页漏传，index.tsx 一行接线修复（commit 997267f847），真机复验脏草稿点返回箭头弹确认框——已修已勾**。真机走查全程记录见 [v2-m7-browser-walkthrough.md](./v2-m7-browser-walkthrough.md)。
- 2026-09-04：**D1/D2/D3 修复（X 波）**。D1（commit 01a46dd321）：真机堆栈定位根因不在 states-controller/路由装配，而在共享 `components/widgets/hooks/use-widget-values.ts` 对零解析实体的 entityCount 数据源建订阅（`countSubs[0]` undefined → `.subscribe` TypeError；V 波「路由级装配」推测修正）——hook 源头 3 行守卫（该文件在 M7 页面集之外，修复报告显式标注），回归测试 `entity-controller-crash.test.tsx` 以真 shell/canvas/widget 链锁住不崩 + 别名解析后重订阅两契约。D2（commit c162c3bef8）：`dialogs/add-widget/find-free-placement.ts` ui-ngx `widgetPossiblePosition` parity（行主序首空闲位 + 列夹取 + 墙对墙落末端），确认框空闲位预填、显式改值优先，单测 8 例矩阵 + 流程级 1 例。D3（commit d522e9db21）：`widgetTypeLabel` registry label 解析，确认框标题预填显示名。门禁：editor+core/editor 265 测试全绿、tsc 绿、biome 触及文件零告警、check-locale 绿。真机复验（browseros）：Software 盘「编辑」进入无崩溃、states 对话框 6 状态齐；已占用画布添加 widget 落空白带、6 cell 位置互异、确认框标题「HTML value card」；草稿放弃后 API 复核服务器布局零改动。§3.1/§3.2 三行缺口已修已勾。
