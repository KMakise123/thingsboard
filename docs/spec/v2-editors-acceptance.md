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

- [ ] 编辑态进入：只读页「编辑」→ 编辑态（widget 出现拖拽 / 缩放手柄、工具栏切换编辑组）——等价 ui-ngx Edit mode〔ui-ngx 锚点 dashboard-page.component.html:148-171〕
- [ ] 编辑态退出两路语义：保存 → baseline 前移；取消 → 草稿整体撤回进入前基线（prevDashboard 语义）——两路均回只读态
- [ ] 工具栏齐套：保存 / 撤销 / 重做（行为契约）/ 布局切换 / 全屏 / states 管理 / 别名管理 / 过滤器管理 / 设置 / 导入 / 导出 / 版本控制入口（VC 子系统边界依 #9：编辑器内 popover 形态对齐，不跳独立页）
- [ ] 空 dashboard 自动进入编辑态

### 3.2 widget 生命周期

- [ ] 添加 widget：右侧 widget 类型选择抽屉（分组 + 搜索）→ 类型 → 参数/布局确认对话框 → 落格；多布局时选目标布局；scada 布局下选择器 scada 类型置顶且跳过布局配置步
- [ ] 从选择器拖拽 widget 落格（dropConfig 体系，落点取网格坐标）
- [ ] 删除 widget（交互对齐 ui-ngx）
- [ ] 复制 / 粘贴双档：ctrl+c 复制 / ctrl+v 粘贴（副本重生成 guid）；ctrl+r 复制引用 / ctrl+i 粘贴引用（保留 alias/filter 引用）——粘贴 = 一个事务组
- [ ] 拖拽移动与 resize 手柄（编辑态）
- [ ] 碰撞阻挡：拖到占用格不推不叠（gridster pushItems:false / swap:false 语义）
- [ ] 边界夹取：拖出边界坐标夹回网格范围

### 3.3 网格背景与右键菜单

- [ ] displayGrid 三态 none / onDrag&Resize / always；move-widgets 对话框打开期间临时 always〔锚点 dashboard-layout.component.ts:117-119〕
- [ ] dashboard 级右键菜单五项：设置 / 别名 / 粘贴 / 粘贴引用 / 移动所有 widget
- [ ] widget 级右键菜单：编辑 / 引用转副本（仅引用件显示）/ 复制 / 复制引用 / 删除
- [ ] move-widgets 对话框：cols/rows 偏移量整体平移所有 widget

### 3.4 widget 配置面板

> 勘误：骨架所写「Data / Settings / Advanced / Appearance / Action」为 3.x 旧结构；4.4 已重构为 toggle-select 五区〔锚点 widget-config.component.ts:333-372〕。

- [ ] advanced 模式五区齐套（头部顺序）：**Data / Appearance / Widget card / Actions / Layout**
- [ ] Data 区：timewindow 配置、alarm filter（告警类）、datasources 编辑 + datakey 配置与拖拽排序（含 latest keys）、RPC 类 targetDevice 选择、alarm source
- [ ] Appearance 区：外观设置 + widget 高级设置（原 Settings tab 收纳于此，无独立 Settings / Advanced tab）
- [ ] Widget card 区：标题 / 卡片样式 + widgetCss 扩展面板
- [ ] Actions 区：action 配置（actionSources 全操作源）
- [ ] Layout 区：default 断点显示 resizable + preserveAspectRatio；非 default 断点显示 mobile/list 布局组（mobileHide / desktopHide / mobileOrder / mobileHeight）；scada 布局恒只显示前者
- [ ] basic / advanced 切换：类型带 basicMode 时头部出现切换，basic 形态由类型自带 basic 配置渲染（如 scada symbol widget 的 targetDevice + 符号选择 + 逐对象绑定）
- [ ] 别名闭环：面板内创建 / 编辑别名回调打开别名对话框；过滤器同理
- [ ] settingsForm（表单配方）统一渲染器：与规则链节点配置共用（ADR 0004；M7 交付）

### 3.5 states / layouts 对话框群（勘误后完整清单）

> 勘误：原「state controller」非对话框（states-controller.service 注册的 default / entity 控制器组件）；原「select-dashboard-breakpoint」为工具栏内嵌切换组件（→ §3.7）。补漏：add-widget 确认框、widget 选择抽屉、单别名 / 别名集 / 过滤器三个对话框、dashboard-image 非编辑态入口。

- [ ] manage-dashboard-states（工具栏 States）：state 列表增删改
- [ ] dashboard-state（manage-states 内 add/edit）：name / id / root 字段
- [ ] manage-dashboard-layouts（工具栏 Layouts）：布局数量、布局类型（default | scada | divider）、断点增删入口
- [ ] add-new-breakpoint：仅从 manage-layouts「Add breakpoint」打开，选断点 + copyFrom
- [ ] dashboard-settings（工具栏 Settings）：含 dashboardCss 编辑；被 manage-layouts「Layout settings」复用
- [ ] dashboard-image：**非编辑态**工具栏入口 + 对话框（编辑态不显示——parity 细节）〔锚点 dashboard-page.component.html:230-235〕
- [ ] 别名集对话框（工具栏 Aliases）+ 过滤器对话框（工具栏 Filters）+ 单别名对话框（widget 面板回调）
- [ ] add-widget 参数/布局确认对话框 + widget 类型选择抽屉（操作见 §3.2）
- [ ] select-target-layout：多布局添加 / 导入 widget 时选目标布局
- [ ] select-target-state：从实体视图「添加到仪表盘」路径选目标 state（编辑器自身不直接打开——边界）

### 3.6 SCADA 布局编辑模式

> 勘误：骨架「select/pan/move 模式切换」在 ui-ngx 4.4.0 无对应实现（全库检索零命中；pan/zoom 仅存在于资源库的 SCADA 符号编辑器页），本 spec 删除该虚构项。SCADA = gridSettings.layoutType 枚举值之一（default | scada | divider），与普通布局共用同一网格编辑器，非独立编辑器。

- [ ] layoutType 切换：manage-layouts 对话框内选择与保存生效
- [ ] 差异表逐项验收：

| 维度 | 普通布局 | SCADA 布局（验收动作） |
|---|---|---|
| 手机断点 | 窄屏降级单列 | 恒禁用：窄屏不降级〔锚点 dashboard-layout.component.ts:85-104〕 |
| 边距 | margin 10 可配 | margin 强制 0 + outerMargin false（满铺） |
| 列数 | 10–1008 任意 | 仅 24 的倍数（24–1008 下拉），非法值向上取整〔锚点 dashboard-settings-dialog.component.ts:203-207〕 |
| 新增 widget | 保持原样 | 自动仪表化：去标题 / 去阴影 / 透明背景 / 锁定宽高比默认开 / 跳过布局配置步〔锚点 dashboard-utils.service.ts:403-424〕 |
| Layout 配置区 | 按断点条件全量 | 恒只剩 resizable + preserveAspectRatio 两开关 |
| 拖拽 / 缩放 / 碰撞 / 右键菜单 / 快捷键 / displayGrid | — | 与普通布局完全一致（无 scada 分支，回归同 §3.2 / §3.3） |

- [ ] 否定项清单（防虚构义务，同样不得作删减依据）：无指针模式切换、无对齐 / 吸附线、无 z-index 层级操作、无多选 / 框选、无碰撞推挤
- [ ] 边界：SCADA 符号编辑器页（`/resources/scada-symbols`，SVG 结构 / tag / 行为元数据编辑 + pan/zoom）归资源库子系统（v2 阶段交付，不在本 spec）；仪表盘内 symbol 实例只能换符号 / 绑设备 / 绑对象，不能改 SVG 结构

### 3.7 断点与 mobile

- [ ] 断点覆盖编辑：工具栏断点切换组件（select-dashboard-breakpoint）+ 断点专属布局
- [ ] mobile 单列栈预览：default 布局 mobile 断点单列
- [ ] autofill 行高：autoFillHeight / mobileAutoFillHeight 设置生效（edit 或 scada 下强制 false——parity 条件）〔锚点 dashboard.component.ts:672-679〕

### 3.8 数据闭环

- [ ] 离开确认：dirty 精确判定（draft 与 baseline 引用比较；改后全部撤销 = 干净不弹窗）
- [ ] 导入：JSON 导入落编辑器；缺别名时补录对话框（v1 只读导入曾裁剪，v2 编辑器导入恢复 parity）〔锚点 dashboard-page.component.ts:1073〕；导出剥 id/tenantId 对齐 TB
- [ ] 409 三选项闭环（行为契约）：加载服务器版 / 用我的版本覆盖（GET 新 version 再 POST；二次 409 上限 3 次回落）/ 导出本地 JSON 后放弃

### 3.9 行为契约：仪表盘撤销栈

- [ ] 结构性操作各为一条事务组：添加 / 删除 / 拖拽落格 / resize / 粘贴（含引用组）
- [ ] 表单连续输入合并一步（coalesceKey + 1s 时间窗）
- [ ] 配置面板事务取消零残留（打开面板 checkpoint、取消按组回滚、预览恒吃主 draft）
- [ ] 撤销到底 dirty 归 false；任何新事务组入栈清空重做栈
- [ ] 不入栈项：选中 / 多选、视口、面板开合、timewindow 临时调整

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
