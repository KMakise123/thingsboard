# v2 编辑器三件套验收 spec（活文档）

> 状态：**骨架**——操作面清单来自 #13 事实盘点，逐项验收标准由新票「v2 编辑器验收 spec 定稿」细化勾稽。
> 路线依据：ADR 0004（编辑器三件套实现路线）。验收原则继承 #9：**等价为底线、允许增量增强、禁止删减 TB 已有操作**；操作级 checklist 勾选 + 横切章。

## 0. 一句话定义

v2 交付的仪表盘编辑器、widget 编辑器、规则链画布，对 ui-ngx 对应编辑器的全部已有操作逐项等价可用，且统一获得撤销栈（超 TB 增强）。

## 1. 验收原则

1. TB 已有操作一项不缺（下述清单为账面本体，遗漏项以「TB 有 → 必须有」兜底）。
2. 增强项（撤销栈、409 对话框、缩放平移、导入内存暂存）不设验收义务，但不得与等价项冲突。
3. 占位三态：内置未覆盖 / `angular-unsupported`（永久）/ `missing`（类型不存在）——文案不得暗示「即将支持」。
4. 撤销边界显式验收：结构性操作入全局栈；代码文本入 CodeMirror 自身栈；焦点切换时 ctrl+z 归属正确；规则链保存 = 检查点（清栈有明示）。

## 2. 仪表盘编辑器操作面（对齐 dashboard-page/dashboard 全家）

- [ ] 编辑态切换（进入/退出/取消恢复 prevDashboard 语义 = 撤到 baseline）
- [ ] toolbar：保存 / 撤销 / 重做（增强）/ 布局切换 / 全屏 / states 管理 / 别名与过滤器管理 / 设置 / 导入导出 / 版本控制入口（VC 子系统边界依 #9）
- [ ] widget 添加（库选择面板 → 落格，多布局选目标）、删除、复制/粘贴/复制引用/粘贴引用（ctrl+c/r/v/i）、拖拽、resize、碰撞阻挡（拖到占用格不推不叠）、边界夹取
- [ ] displayGrid 三态（none / onDrag&Resize / always——移动 widgets 对话框时 always）
- [ ] 右键菜单两组：dashboard 级（设置/别名/粘贴/粘贴引用/移动所有 widget）、widget 级（编辑/引用转副本/复制/复制引用/删除）
- [ ] **widget 配置面板全套**（红队 F1 补裁）：Data tab（datasource 编辑、datakey 配置与拖拽排序、latest keys）、Settings tab（FormProperty 渲染器）、Advanced、Appearance、Action 配置、alias 编辑器对话框、targetDevice 选择
- [ ] **states/layouts 管理对话框群**（红队 F3 补裁）：manage-dashboard-states、dashboard-state、state controller、manage-dashboard-layouts、dashboard-settings、dashboard-image、select-target-state/layout、add-new-breakpoint、select-dashboard-breakpoint、move-widgets
- [ ] **SCADA 布局编辑模式**（红队 F3 补裁）：select/pan/move 模式切换、无 mobile 断点——交互差异表待定稿票补
- [ ] 断点覆盖编辑、mobile 单列栈预览、autofill 行高
- [ ] 空 dashboard 自动进入编辑态；离开确认（dirty 精确判定）；409 三选项闭环
- [ ] 撤销/重做：拖拽=一条、面板事务取消零残留、撤销到底 dirty 归 false、表单连续输入合并一步

## 3. 规则链画布操作面（对齐 rulechain-page 全家）

- [ ] 画布：节点拖入（节点库 HTML5 DnD）、拖动、框选、ctrl 多选、全选/取消、magnet 连线、INPUT 唯一出边、多 label 边（含 label 编辑/删除小圆钮）、边重连（增强）、删除
- [ ] 画布导航：缩放（0.5–2x）/平移/**画布自动扩张**（节点越界画布跟随长）；初始 (0,0)/zoom 1 无跳变
- [ ] 便签：alt+n 添加、行内编辑、拖动、复制、删除
- [ ] 嵌套规则链创建（ctrl+r）；右键菜单四类（链/节点/边/便签）
- [ ] **节点配置**：值驱动 FormProperty 表单 + uiHints + JSON 源码模式切换；P0 定制组件（脚本族/switch/键操作/save ts-attr/create-clear alarm）——**77 内置节点全量可编辑**（验收=抽样 N 个/类 + dry-run 统计良好渲染比例）
- [ ] 脚本编辑：JS/TBEL 切换（tbelEnabled=false 强制 JS）、Test 面板（testScript 端点）、TBEL 高亮/补全
- [ ] 节点详情三 tab（details/events/help）；help HTML 消毒渲染、docUrl 外链
- [ ] 事件/调试：事件表（POST filter 端点、过滤字段、clear、刷新）、「test with this message」、debugIn 预填
- [ ] 节点库：分组/搜索/画布高亮搜索共用 state
- [ ] 保存（链 + metadata 双段）、检查点语义明示、409 三选项、导入（内存暂存 + 旧格式迁移两处）、导出（剥离规则对齐）
- [ ] ruleChains 全域页面：列表/搜索/详情 tabs（含 events tab）
- [ ] 撤销：节点移动/连线/增删/粘贴各为一条事务组；保存后清栈明示

## 4. widget 编辑器操作面（对齐 widget-editor 全家）

- [ ] 布局：左代码（TSX/CSS/Schema/defaultConfig tabs + 元数据侧栏）右预览底部 console，分屏可调
- [ ] 运行（ctrl+enter 重编译 remount）、保存（编译→执行→冒烟→commit）、另存为、恢复上次保存（ctrl+q）、全屏、Tidy（prettier）
- [ ] 快捷键：ctrl+s / shift+ctrl+s / ctrl+enter / shift+ctrl+f / ctrl+q；代码内 ctrl+z 归 CodeMirror
- [ ] 预览：defaultConfig 解析订阅（function 随机数据）、编辑 settings 回写 defaultConfig
- [ ] 错误闭环：编译错行级标注、运行错 console + 行号偏移定位、输入即清错
- [ ] 新建 = 5 个 React starter 模板选择；从现有自定义类型派生；从内置类型受限派生（诚实标注）
- [ ] 导入导出：fork 格式 round-trip；TB Angular JSON 导入 → badge + 占位链路
- [ ] 512KB 软限警告；崩溃保护（sessionStorage，代码文本 debounce 写入）

## 5. 横切验收

- [ ] i18n：`editor.*` 命名空间 key 双语齐全（CI 门禁零红）；透传文案不进 key
- [ ] 三态占位文案与 widget 库 badge
- [ ] 撤销/409/导入等增强项与等价项无冲突回归
- [ ] 主题：编辑器 chrome 无内联色值（antd token 层）；图表走 charts.ts 管道
- [ ] 性能：PoC 附录 A 判据全过（P1–P10）

## 修订记录

- 2026-08-31：#13 决议创建骨架（操作面清单 + 原则 + 横切章）；定稿由后续票承接。
