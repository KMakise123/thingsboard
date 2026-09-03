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

- [x] 编辑态进入：只读页「编辑」→ 编辑态（widget 出现拖拽 / 缩放手柄、工具栏切换编辑组）——等价 ui-ngx Edit mode〔ui-ngx 锚点 dashboard-page.component.html:148-171〕〔V 波真机 ✅；Software 盘加载即崩 → 见 §3.1 末缺口行 D1〕
- [x] 编辑态退出两路语义：保存 → baseline 前移；取消 → 草稿整体撤回进入前基线（prevDashboard 语义）——两路均回只读态〔V 波真机 ✅：保存后 save 图标禁用（baseline 前移）+ 刷新持久化；退出编辑 → 放弃修改 → 只读路由、草稿撤回〕
- [x] 工具栏齐套：保存 / 撤销 / 重做（行为契约）/ 布局切换 / 全屏 / states 管理 / 别名管理 / 过滤器管理 / 设置 / 导入 / 导出 / 版本控制入口（VC 子系统边界依 #9：编辑器内 popover 形态对齐，不跳独立页）〔V 波真机 ✅：AX 枚举全量在列，VC 为 popover 占位形态〕
- [ ] 空 dashboard 自动进入编辑态〔未勾：本地 4 盘均有内容，真机未走「新建空盘」路径；编辑器路由本身为纯编辑态、空配置渲染有单测（shell.test emptyDashboardJson），待 M10 补一次新建空盘走查〕
- [ ] **D1 缺口（V 波新登记）：Software 演示仪表盘（6 states / `stateControllerId=entity`）编辑器路由加载即崩**（应用错误边界「页面出现错误」）；其余 3 盘正常。EditorShell 以真实 configuration 隔离挂载不崩 → 崩点在路由级装配（疑似 states-controller 的 URL state 装配交互），待定位修复

### 3.2 widget 生命周期

- [x] 添加 widget：右侧 widget 类型选择抽屉（分组 + 搜索）→ 类型 → 参数/布局确认对话框 → 落格；多布局时选目标布局；scada 布局下选择器 scada 类型置顶且跳过布局配置步〔V 波真机 ✅：五组抽屉 + 搜索过滤 + 确认框 + 落格 + 面板自动展开；多布局选目标布局由 select-target-layout 契约单测覆盖（单布局盘真机无此步）；scada 置顶 → 见本节末缺口行〕
- [x] 从选择器拖拽 widget 落格（dropConfig 体系，落点取网格坐标）〔P3 引擎取证（calcXY 两轴夹取）+ `rgl-edit-behavior.test.tsx`；真机抽屉 HTML5 DnD 未驱动（环境受阻），落格链经确认框路径实证〕
- [x] 删除 widget（交互对齐 ui-ngx）〔Delete 键/菜单 → 删除确认对话框有单测（shell.test「Delete opens the remove confirm」）；真机右键被浏览器扩展劫持未目击菜单本体〕
- [x] 复制 / 粘贴双档：ctrl+c 复制 / ctrl+v 粘贴（副本重生成 guid）；ctrl+r 复制引用 / ctrl+i 粘贴引用（保留 alias/filter 引用）——粘贴 = 一个事务组〔V 波真机 ✅：c/v 后 3→4 cells、一次 ctrl+z 整组抹掉；r/i 的引用粘贴被 sameTarget 守卫正确拒绝（ui-ngx canPasteWidgetReference parity，需多布局目标），引用粘贴事务由 clipboard 单测覆盖〕
- [x] 拖拽移动与 resize 手柄（编辑态）〔V 波真机 ✅ 拖拽移动（含一次 drag-stop 一个事务组）；resize 手柄已渲染、引擎+单测取证，真机未驱动手柄缩放〕
- [x] 碰撞阻挡：拖到占用格不推不叠（gridster pushItems:false / swap:false 语义）〔V 波真机 ✅：拖向 Exceptions 占用格 → 原地弹回零位移、零级联〕
- [x] 边界夹取：拖出边界坐标夹回网格范围〔P3 引擎取证（横向硬夹/纵向向下生长）+ V 波真机下边界落位观察一致〕
- [ ] **D2 缺口（V 波新登记）：添加 widget 默认落 `(0,0)` 叠压既有 widget，不寻找空闲位**（ui-ngx findPosition 预填第一个空闲位/全满时落末端）；真机 DOM 探针实证新旧两 cell 同为 `translate(10px,10px)`
- [ ] **D3 缺口（V 波新登记，minor）：add-widget 确认框标题默认填 fqn 原文**（如 `system.cards.html_value_card`）而非类型显示名（ui-ngx 预填类型名）
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

- [ ] 节点拖入：节点库 HTML5 DnD → 画布落节点
- [ ] 节点拖动（dragStop 一次提交一个事务组——半受控，ADR 0004）
- [ ] 框选 / ctrl 多选 / 全选 / 取消全选
- [ ] magnet 连线（输出桩 → 输入桩）；INPUT 节点唯一出边约束
- [ ] 多 label 边：一条边多个 label；label 编辑 / 删除小圆钮
- [ ] 节点 / 边删除
- [ ] 节点复制 / 粘贴：粘贴为一组（guid 重生成，一个事务组）

### 4.2 画布导航

- [ ] 画布自动扩张：节点越界画布跟随扩张（adjustCanvasSize 语义）；初始 viewport (0,0) / zoom 1 无跳变
- [ ] （缩放平移为能力级增强 → §7）

### 4.3 便签

- [ ] alt+n 添加；行内编辑（markdown 渲染 + sanitize）；拖动；复制；删除

### 4.4 嵌套规则链与右键菜单

- [ ] ctrl+r 从选中节点创建嵌套规则链
- [ ] 右键菜单四类齐备：画布空白 / 节点 / 边 / 便签，菜单项对齐 ui-ngx

### 4.5 节点配置表单与 76 节点 dry-run 统计口径

- [ ] 统一 FormProperty 渲染器 + uiHints 静态映射 + 定制组件注册表（P0：脚本族 / switch / 键操作 / save timeseries-attributes / create-clear alarm）；任何字段可切 JSON 源码模式（TB 无 directive 时的兜底语义对齐）
- [ ] dry-run 统计口径（定稿）：
  - **统计对象**：CORE 画布可见内置节点 **76 个**（全仓节点类 77；`push to cloud` 为 EDGE-only 不入面——后端 @RuleNode 全量 grep + AnnotationComponentDiscoveryService 扫描锚点）
  - **分类基础**：节点库 6 大 ComponentType：ACTION 27 / EXTERNAL 14 / FILTER 12 / ENRICHMENT 11 / TRANSFORMATION 9 / FLOW 4（与 UI 分组一致；java 包 24 个粒度过细且与 UI 不一致，不作分类）
  - **判据（每节点四项）**：① 表单非空（渲染 ≥1 字段控件或 JSON 源码非空）；② 无崩溃（React 错误边界不触发）；③ 渲染三态归类——控件级 / JSON 兜底（uiHints 未覆盖且类型不可推断，源码模式可编辑）/ 不可编辑；④ round-trip（改默认值 → 保存 → 重开值保持）
  - **双指标门槛**：可编辑率（非空 ∧ 无崩溃 ∧ 三态非「不可编辑」）= **100% 硬门槛**；控件级渲染率 ≥ **85%** 为登记项——不达标节点出降级清单随 M8 验收注落账，不挡验收
  - **跑法**：组件级自动化 dry-run（枚举节点 → 逐个经 FormProperty 渲染器渲染 → 断言①②③）脚本随 M8 交付；人工抽查 = 6 类 × 2–3 个节点做④（避开 4 个 deprecated：delay / device profile (deprecated) / synchronization start / end——deprecated 照扫不抽查）
  - **证据**：统计报告（节点 × 判据矩阵 + 三态计数 + 降级清单）为 M8 验收证据；是否纳入 #12 常驻回归由 #12 扩充时另定
  - **对标语义**：ui-ngx directive 缺注册显示 `rulenode.directive-is-not-loaded` 错误——本口径「不可编辑」即对标该失败态，出现即红〔锚点 rule-node-config.component.ts:210-249〕

### 4.6 脚本编辑与测试

- [ ] JS / TBEL 切换（tbelEnabled=false 强制 JS）
- [ ] Test 面板：POST /api/ruleChain/testScript；两入口（配置抽屉 Test 按钮 + 事件行「test with this message」）
- [ ] TBEL 高亮 / 补全（tbel-utils 移植）；CodeMirror 统一封装（TSX / JS / CSS / JSON / TBEL 五语言）

### 4.7 节点详情与事件 / 调试

- [ ] 详情三 tab：details / events / help
- [ ] help：HTML 消毒渲染（DOMPurify）+ docUrl 外链；文案透传不翻译
- [ ] 事件表：POST filter 端点（body 多态 eventType）、过滤字段、clear、刷新
- [ ] 「test with this message」预填 debugIn

### 4.8 节点库

- [ ] 六类分组 expansion panel（FILTER / ENRICHMENT / TRANSFORMATION / ACTION / EXTERNAL / FLOW）
- [ ] 节点库搜索与画布高亮搜索共用 state

### 4.9 保存 / 409 / 导入导出

- [ ] 保存 = 链 + metadata 双段提交；新节点本地 uid 主键、提交 id 缺省护栏
- [ ] 检查点语义明示：保存清栈有 UI 提示（行为契约）
- [ ] 409 三选项闭环（行为契约，同 §3.8）
- [ ] 导入：文件解析；旧格式迁移两处（ruleChainConnections → TbRuleChainInputNode、debugMode → debugSettings）——parity 勾选；内存暂存为增强（§7）
- [ ] 导出：剥离规则对齐 TB

### 4.10 ruleChains 全域页面

- [ ] 列表 / 搜索 / 详情 tabs（含 events tab）

### 4.11 行为契约：规则链撤销栈

- [ ] 节点移动 / 连线 / 增删 / 粘贴各为一条事务组
- [ ] 保存 = 检查点：清栈 + 明示（保存后 ctrl+z 无反应为设计行为）

## 5. widget 编辑器操作面（对齐 widget-editor 全家）

### 5.1 布局

- [ ] 左代码右预览、底部 console；分屏可调（react-resizable-panels）
- [ ] 代码区四 tab：TSX / CSS / Schema（settingsForm）/ defaultConfig + 元数据侧栏（type / size / typeParameters / actionSources）
- [ ] 同页预览（弃 iframe）：编译前置同步抛错、双层样式命名空间、hook 订阅独立生命周期

### 5.2 运行 / 保存 / 文件操作

- [ ] 运行：ctrl+enter 重编译 + key 递增 remount
- [ ] 保存：编译 → 执行 → 冒烟渲染 → commit；409 显式 diff 不静默覆盖（行为契约）
- [ ] 另存为；恢复上次保存；全屏；Tidy（prettier standalone）

### 5.3 快捷键与焦点（行为契约）

- [ ] 五快捷键齐套：ctrl+s / shift+ctrl+s / ctrl+enter / shift+ctrl+f / ctrl+q
- [ ] 代码内 ctrl+z 归 CodeMirror 自身栈；焦点在面板 / 表单时归 EditorSession——焦点切换归属正确
- [ ] 「?」快捷键帮助面板（三编辑器一致，§6.3）

### 5.4 预览

- [ ] defaultConfig 解析订阅（function 数据源随机数据渲染）
- [ ] 编辑 settings 回写 defaultConfig（所见即所得）

### 5.5 错误闭环

- [ ] 编译错：CodeMirror 行级标注
- [ ] 运行错：console 输出 + 行号偏移定位（每实例 ErrorBoundary + sourceURL）
- [ ] 输入即清错

### 5.6 新建与派生

- [ ] 新建 = 5 个 React starter 模板选择（内置前端静态资产）
- [ ] 从现有自定义类型派生（源码可得全量派生）
- [ ] 从内置类型受限派生：schema / config / 尺寸可得、源码不可得——UI 诚实标注

### 5.7 导入导出

- [ ] fork 格式（runtime react-1 + source 五件）导出 / 导入 round-trip
- [ ] TB Angular widget JSON 导入 → badge + 占位链路（拒绝会使引用仪表盘半残，ADR 0004）
- [ ] 导出物自带 runtime / schemaVersion 标记（TB 导入无害）

## 6. 横切验收

- [ ] **i18n**：`editor.*` 命名空间 key 双语齐全（CI check-locale 零红）；透传文案不进 key（help tab 详情、后端错误原文、uiHints 之外 descriptor 文案）
- [ ] **占位三态**：三态文案（§1 原则 3）+ widget 库 `angular-unsupported` badge
- [ ] **三编辑器行为一致性**：撤销边界四条（§1 原则 4）三处同源（EditorSession）；409 三选项对话框同形；「?」帮助面板；右键菜单 antd Dropdown contextMenu 形态；离开确认 dirty 判定同源
- [ ] **增强与等价无冲突**：§7 登记项全开状态下 §3–§5 checklist 复查无回归（M10 执行）
- [ ] **主题**：编辑器 chrome 无内联色值（antd token 层）；图表走 charts.ts 管道
- [ ] **性能**：ADR 0004 附录 A P1–P10 全过——P1–P8 开工前 PoC 一次；P7（memo 边界）随 M7、P4（500 节点 ≥50fps）随 M8、P9 / P10 随 M9 实现复验
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

- 2026-08-31：#13 决议创建骨架（操作面清单 + 原则 + 横切章）；定稿由 #15 承接。
- 2026-09-03：**定稿**（#15 两轮 grilling + 双路源码侦察）。勘误三条（均有源码锚点）：① SCADA「select/pan/move 模式切换」ui-ngx 4.4.0 无对应实现，删除并重写为 layoutType 差异表 + 否定项清单；② states / layouts 对话框群勘误（state controller、select-dashboard-breakpoint 非对话框）并补漏 5 项；③ widget 配置面板 tab 集 3.x → 4.4 重构事实（Data / Appearance / Widget card / Actions / Layout 五区 + basic/advanced 切换）。口径精确化：「77 内置节点」→ 77 节点类 / CORE 可见 76 入统计面；分类基础 = 6 大 ComponentType（27/14/12/11/9/4）。结构决策：分账三档（等价项 / 行为契约增强勾选 / 能力级增强登记）；里程碑 M7–M10；dry-run 统计口径定稿（双指标 + 自动化跑 + 6 类人工抽样）。
- 2026-09-04：**M7 验收勾账（V 波）**。全量门禁：lint 绿（顺手清掉 M7 波次遗留 4 个 biome error，commit 3f60c89916）；`npm run test` 1074 例 1073 绿（唯一失败为 master 存量：M6 604ffeff52 给 entry.tsx 加 token-first 守卫、测试 mock 未跟上，非 M7 回归）；P7 memo 边界证据落地（memo-boundary.perf.test.tsx，单 widget 写 delta=1、选中零内容重渲染，简报 §5 回填）。真机走查（browseros，4 盘 3 正常 1 崩溃）：§3 共 **43 行勾选 / 13 行未勾**（未勾 = 原有等价项 6 + 新登记缺口/缺陷 6 + 差异表真机备注 1，逐行注明原因：右键菜单 2 行环境受阻；空盘自动编辑、select-target-state、scada 差异表保存、scada 符号边界等真机未及）。兜底新登记缺口 6 行：D1 Software 盘编辑器路由崩溃（高）、D2 添加 widget 落 `(0,0)` 不寻空闲位（中）、D3 add-widget 标题填 fqn 原文（低）、manage-states 复制 state 缺、抽屉 scada 类型置顶缺（待符号类型存在）、dashboard-image html2canvas 抓图缺（禁装依赖）。**PageContainer 返回箭头绕过离开守卫（D2 交付时标记）：代码确认组件自带 `dirty` 守卫而编辑器页漏传，index.tsx 一行接线修复（commit 997267f847），真机复验脏草稿点返回箭头弹确认框——已修已勾**。真机走查全程记录见 [v2-m7-browser-walkthrough.md](./v2-m7-browser-walkthrough.md)。
