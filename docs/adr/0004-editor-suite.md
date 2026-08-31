---
status: accepted
---

# v2 编辑器三件套实现路线：React Flow + RGL 2.x、统一编辑会话与撤销、同源编译自定义 widget

v2 编辑器三件套（仪表盘编辑器、widget 编辑器、规则链画布）的实现路线定案。四路专家裁决 + 红队对立质证 + 终审确认（[#13](https://github.com/KMakise123/thingsboard/issues/13)），用户三项偏好锁定：自定义 widget 代码级 + 同源执行（Q1=A）、等价为底线允许增量增强（Q2=A）、三件套统一撤销栈全面超 TB（Q3=A）。事实基础：ui-ngx 三编辑器源码逐行盘点 + React 生态 registry 级核实（含 RGL/react-draggable dist 产物 grep、ngx-flowchart/xyflow/rule-engine 后端源码读码），全部一手。

## 决策

### 1. 画布

- **规则链画布 = @xyflow/react（React Flow v12，major 钉 12.x）**。边型 bezier（ngx-flowchart 为垂直切线三次贝塞尔，已核实）；snapToGrid 不开（拖拽连续坐标，保存边界 `Math.round` 对齐 TB）；缩放平移默认开、限域 0.5–2 倍，MiniMap/Controls 不渲染（界面等价 TB）；初始 viewport (0,0)/zoom 1；**画布自动扩张**对齐 TB `adjustCanvasSize` 语义（节点越界时一次性扩展 translateExtent/dimension，不做固定硬边界）。
- **规则链画布接线 = 半受控**：拖拽/连线期间中间态由 RF 内部 store 持有**不回写 draft**，`onNodeDragStop`/`onConnect` 一次性提交一个事务组；受控同步仅用于外部来源变更（undo/redo/粘贴/导入）。红队质证（xyflow#2353 + 官方性能指南）：受控模式帧级回写外层 store 是实锤性能反模式。`nodeTypes`/`edgeTypes` 对象必须在组件外定义。
- **仪表盘编辑器画布 = react-grid-layout 2.x 主入口（硬下限 2.2.1）**，禁 1.x（dist 打包旧 react-draggable 含 10 处 findDOMNode，React 19 不可用）、禁 `/legacy` 混用。语义目标 = gridster `pushItems:false/swap:false` 的**碰撞阻挡**（被挡不推不叠），通过 compactor 系新 API + preventCollision 语义达成——**精确 API 形状以 PoC 实测 v2 d.ts 为准，本文档不预设伪精确签名**（红队 F7）。编辑态切换 = `dragConfig`/`resizeConfig` 的 `enabled` 开关（替代 #6 原「v1 全 static」措辞）；`displayGrid` 用 extras 网格背景条件挂载（进行态翻转走组件本地 state 不进 reducer）；外部拖入走 dropConfig 体系（2.2.1 修复链）。仪表盘画布维持**完全受控**（widget 数量级 + 碰撞阻挡需实时）：RGL 内部管理拖拽浮层与 placeholder，`onDragStop`/`onResizeStop`/`onLayoutChange` 是提交边界，**禁止把 onDrag 帧级坐标写回 layout**。
- **交互基建**：react-hotkeys-hook（major 5）+ 自建 `?` 快捷键表面板；右键菜单 antd `Dropdown trigger=['contextMenu']`；全屏自封装 useFullscreen（原生 Fullscreen API）；widget 编辑器分屏 react-resizable-panels（弃已停更的 split.js）。patch 级版本号以 PoC 时 npm 实测为准，major 档 + 关键行为为硬约束。

### 2. 编辑会话与撤销（统一 EditorSession）

三编辑器共用 `EditorSession<T>`（自写 ~150 行薄层，**不引库**——事实组核实无现成库同时满足栈深上限+事务分组+patches 语义；zundo 绑 Zustand、use-undo 是快照式、immerhin 无栈深语义）：

```
enter:  baseline = normalize(serverEntity)      // 进会话规范化一次
write:  draft 唯一写者 = session reducer（immer produceWithPatches）
history: undo/redo 双栈，元素 = 事务组 {id, label, patches, inversePatches, coalesceKey?, ts}
save:   serialize(draft) → 整对象 POST + version → baseline 前移、version 回填
dirty:  draft !== baseline（O(1) 引用比较；undo 到底时引用复位锚定）
```

- **草稿形状**：仪表盘 = 整棵规范化 `DashboardConfiguration`（widgets 数组→map，对齐 TB dashboard-utils 现有规范化）；规则链 = **派生画布规范模型**（`Map<uid,Node>` + edges + notes，本地 uid 主键）——否决直接编辑 metadata 形状（index 耦合）；widget 编辑器 = `WidgetInfo`。**否决 TB 的 editingWidget 二级深拷贝草稿**，改面板事务（打开面板 checkpoint、取消按组回滚、预览始终吃主 draft，WYSIWYG 不打折）。
- **规则链 id 护栏（后端契约）**：`BaseRuleChainService` 对 metadata 里带 id 的节点只在命中已有 DB 节点时更新，**客户端预生成 id 的新节点会被静默丢弃**——新节点 draft 用本地 uid 主键、提交时 id 缺省（对齐 ngx 模式）。撤销栈跨保存保留需 id 重映射翻译 patches（成本>收益），故**规则链保存 = 检查点（清栈）**，与仪表盘（栈跨保存点存活）唯一不对称；此为设计选择而非后端硬约束（红队 F5 勘误）。
- **撤销覆盖 = 档位 A（全面超 TB；TB 三编辑器均无撤销栈，已核实）**：一切 draft 写入产生事务组；表单连续输入按 coalesceKey + 1s 时间窗合并（Figma/ProseMirror 惯例，antd Form blur 钩子不可靠）；栈无硬上限、累计 patches 超 4MB 丢最旧并降级 dirty 精度；重做栈任何新组入栈即清空。**不入栈**：选中/多选、视口平移缩放、transient 拖拽坐标、timewindow 临时调整（对齐 TB 仅保存时写回）、面板开合、**widget 编辑器代码文本（CodeMirror 自身 undo，焦点路由决定 ctrl+z 归属）**、保存动作本身。
- **保存与 409**：整对象 POST + version 乐观锁（沿用后端契约）；409 = **显式三选项对话框**（加载服务器版 / 用我的版本覆盖（GET 新 version 再 POST，二次 409 上限 3 次回落）/ 导出本地 JSON 后放弃）——否决 TB 静默重载丢用户工作。不做字段级三方合并。
- **autosave 不做**；崩溃保护 = `beforeunload`/路由 blocker + sessionStorage 序列化 draft（截断栈），**覆盖三编辑器含 widget 编辑器代码文本**（debounce 写入，红队 F13）。
- **剪贴板 = feature 模块内存单例**（弃 localStorage：脏生命周期 + 一步切换后无跨 UI 互贴意义）；BroadcastChannel 为跨 tab 升级预留；粘贴 = 一个事务组（含引用 alias/filters 拷贝 + guid 重生成），引用/副本两档保留。
- **性能实现约束（要求回写 ADR 0003）**：渲染树按 widget 拆 memo 边界（`WidgetContainer` memo + config 引用订阅）；edit-mode/选中态走独立 context 通道，widget 主体不订阅——否则撤销时 100+ widget 全树重渲染。

### 3. 规则链条线（域语义）

- **节点配置表单 = 统一 FormProperty 渲染器 + uiHints + 定制注册表**。事实前提（读码证实）：后端 `configurationDescriptor` **不是 JSON Schema 且无生成机制**（`@RuleNode` 注解扫描 → NodeDefinition 仅含 defaultConfiguration 默认值对象 + configDirective 名），77 个内置节点全带 directive（~66 去重）。路线：defaultConfiguration 值树**自动生成** FormProperty[] → 前端 uiHints 静态映射补 UI 元数据（label/枚举/控件/pattern 提示）→ 高频复杂节点定制 React 组件注册表（形状对齐 widget 注册表；P0：脚本族/switch/键操作/save timeseries-attributes/create-clear alarm）；任何字段可切 JSON 源码模式（TB 自身无 directive 时的兜底语义）。**否决改造后端输出 schema**（descriptor 启动期生成并持久化进 DB，改形状违反「后端不动」）。
- **脚本编辑器 = CodeMirror 6**（否决 Monaco：6.7MB TS worker 在几十行独立函数场景零收益）；TBEL 高亮/补全从 ui-ngx tbel-utils 移植，按「重写两个 CM 扩展（StreamLanguage + CompletionSource）」计工作量（红队 F18）；统一封装 `src/components/code-editor/`（TSX/JS/CSS/JSON/ TBEL 五语言，透传 extensions 挂诊断/补全）。
- **事件/调试表 = ProTable + React Query**：POST filter 端点（body 多态判别 `eventType`，tenantId 走 query param）+ keepPreviousData；`ScriptTestPanel` 共享组件（配置抽屉 Test 按钮与事件行「test with this message」两入口，POST /api/ruleChain/testScript）。
- **help tab = DOMPurify 消毒 + dangerouslySetInnerHTML，文案透传不翻译**（后端系统内容，对齐 #8 后端文案透传先例；不继承 TB 裸信任姿势）。便签 markdown 走 react-markdown + rehype-sanitize。
- **导入/导出**：导出剥离规则对齐 TB；导入暂存 = 模块内存 + 路由 state（弃 localStorage，消状态泄漏）；旧格式迁移保留（ruleChainConnections→TbRuleChainInputNode、debugMode→debugSettings）；configurationVersion 升级由服务端保存时自动执行（前端不实现）。
- **节点库**：单一聚合 query（GET /api/components?componentTypes=...&ruleChainType=CORE）staleTime Infinity，单 clazz 缺失补拉；不复制 ui-ngx 拼 URL 的 `&` bug。
- **ruleChains 全域页面（列表/导入导出/详情 tabs）确认在本路线范围内**（简单 CRUD 附件）。

### 4. 代码级自定义 widget（Q1=A：同源执行，无 JS 隔离）

- **零后端改动**：`WidgetType.descriptor` 是自由 JsonNode（读码证实无形状校验，varchar 1MB 硬上限 → 编辑器 512KB 软限警告）；fqn 更新禁改；widgetType CRUD 仅 SA/TA（与信任模型吻合）。
- **源码五件**：TSX 单文件组件 + CSS（可选）+ `settingsForm`（**直接复用上游键名与 FormProperty[] 格式**，红队 F2 修正——弃自造格式，导入导出与 TB 双向零转换）+ defaultConfig（保持 JSON 字符串，后端 helper 依赖）+ 元数据（type/sizeX/sizeY/typeParameters/actionSources）。descriptor 增量字段 `runtime: 'react-1'` + `source: {tsx, css}`；runtime 缺省 = 老 Angular widget。
- **注册表 resolver 链（回写 ADR 0003）**：builtIn 命中 → 仓库 lazy 组件；miss → 拉 widgetType，`runtime==='react-1'` → 编译注册为 custom；否则 placeholder('angular-unsupported')；404 → placeholder('missing')。占位三态文案收敛在注册表层，渲染容器无感知。
- **窄数据契约定稿 `CustomWidgetProps`**：config/settings/datasources/data/latestData/timewindow/actions/rpc?/ctx{width,height,isEdit,isPreview,locale,toast,updateTimewindow?}——生命周期回调全灭（props 驱动 + 容器 ResizeObserver）；接口按「可句柄化」RPC-able 形状设计并**封顶**（新能力一律走 widget-kit 版本化，不加宽 props）。
- **编译管线**：Sucrase（gz 47KB，比 @babel/standalone 小 14 倍、esbuild-wasm 小 80 倍；transforms typescript+jsx+imports、jsxRuntime automatic+production:true）→ `new Function('require','module','exports')`（禁 eval）→ require 白名单 shim：react/react-dom **宿主单实例**（防 Invalid hook call）+ `widget-kit` 受控门面（antd/dayjs/recharts/formatValue，唯一宿主依赖入口 = 未来 iframe 化天然桥点）→ `module.exports.default` 取组件 → lazy 包装与内置组件同一注册面。会话缓存 keyed `fqn@version`；编辑器预览不走缓存。错误闭环：编译错 → CM 行级 diagnostics；运行错 → 每实例 ErrorBoundary + sourceURL 行号偏移修正。resources[] 只消费 `isModule:false`。
- **widget 编辑器**：左代码（TSX/CSS/Schema/defaultConfig tabs + 元数据侧栏）右预览底部 console（react-resizable-panels）；**同页直接渲染弃 iframe**（TB 同源 iframe 本就不隔离主线程；三个工程动机各有更优解：编译前置同步抛错 / 双层样式命名空间 / hook 订阅独立生命周期）；运行 = 重编译 + key 递增 remount；保存 = 编译→执行→冒烟渲染→commit（409 显式 diff，不学 TB 静默覆盖）；Tidy = prettier standalone；类型提示 = CM 补全数据 + d.ts 文档面板；**新建模板 = 5 个 React starter 内置前端静态资产**（`getWidgetTemplate` 拉的系统模板是 Angular widget，不可复用）；内置 widget 派生 = 受限派生（schema/config/尺寸可得、源码不可得，UI 诚实标注）。
- **导入语义**：Angular widget 允许导入 + badge + 占位（拒绝会让引用它的仪表盘半残）；导出物自带 runtime/schemaVersion 标记（TB 导入亦无害）。
- **iframe 沙箱升级路 4 预留点**（只列不设计）：props 封顶不加宽 / registry kind 允许 remote / 样式前缀注入独立于渲染端 / require shim 唯一宿主入口。

### 5. 存储与 CSP 重开（履行 ADR 0001 决策要点 4 的强制条款）

Q1=A 信任模型 + 自部署单租户下裁定：**维持 localStorage 四键；不设限制性 CSP**（TB JIT 本就要求 unsafe-eval，同级姿态；widget 可读凭据登记为已知限制，缓解路径 = iframe 化四预留点）。部署产物 CSP/安全响应头的实际下发移交 #10。

### 6. 横切

- **目录落位（#8 结构树增补）**：`src/pages/dashboards/editor/`（仪表盘编辑器自含子树：canvas/widgets/states/layouts/panels）、`src/pages/rule-chains/`（列表+详情+editor/ 画布子树）、`src/pages/widgets/editor/`（widget 编辑器；`pages/widgets/` 根预留给资源库票的库列表）、`src/components/code-editor/`、`src/components/form-property/`（统一渲染器，双域引用满足 ≥2 规则）、**`src/core/editor/`（EditorSession 归 core——满足 core「禁 import pages」的依赖方向约束，#8 补一行语义说明）**。
- **i18n 命名空间**：`editor.common` / `editor.dashboard.*` / `editor.ruleChain.*` / `editor.widget.*` / `editor.errors.*`；透传不进 key：help tab 详情、后端错误原文、uiHints 之外的 descriptor 文案。
- **ADR 重编号**：原两份 0001 并存勘误——api-contract-strategy 保持 0001；0002 为并行会话定案的一步切换部署（#10）；widget-runtime-controlled-components 重编号 0003（仓库内无路径引用，仅 GitHub 票面留勘误评论）；本 ADR 为 0004。
- **文档结构**：本 ADR（路线级不可逆决策）+ `docs/spec/v2-editors-acceptance.md`（活文档：TB 操作面对照 checklist）+ 一次性回写（0003 三处、0001 要点 4、#8 增补、#9 spec 一行指针）。

## Considered Options（主要否决项）

- **Rete.js v2**：图执行引擎（rete-engine）对「渲染+交互+坐标序列化、执行全在后端」的 TB 需求是纯负担；核心 14 个月零更新。
- **自研极简 SVG 画布**：重写 ngx-flowchart ~2k 行成熟交互逻辑，省不掉设计只省掉依赖。
- **React Flow 完全受控 + 帧级回写 draft**（专家 B 修订稿）：重新踩 xyflow#2353 实锤性能坑；半受控后消解。
- **iframe 沙箱 / Worker**：Q1=A 已排除；同源 iframe 不隔离主线程，真隔离的桥接基建单人团队不成立。
- **@babel/standalone / esbuild-wasm**：661KB gz / 13MB wasm，本场景零能力增益。
- **JSON Schema 子集做 settings 格式**：上游自己已从 JSON Schema 迁走到 FormProperty[]（迁移器存在即证据）；戴着镣铐复刻。
- **TB 的 settingsDirective 对应物**：复杂配置面板的出路是写内置 React widget，不给自定义 widget 配 directive。
- **直接编辑 RuleChainMetaData 形状**：firstNodeIndex/index 耦合，插删节点全量重排。
- **TB editingWidget 二级深拷贝草稿**：撤销历史断层 + 预览吃副本。
- **改造后端 descriptor 输出 JSON Schema**：启动期生成 + DB 持久化 + 行迁移，违反「后端不动」且仍无 UI 元数据。
- **localStorage 剪贴板 / 与老 UI 键名互贴**：一步切换后无意义；BroadcastChannel 是更干净的跨 tab 升级路。
- **撤销现成库（zundo/use-undo/immerhin）**：语义三缺一；自写 150 行可控可测。

## Consequences

- 三编辑器交互面全面超出 TB（撤销栈、409 对话框、缩放平移、导入内存暂存）；「等价底线」的操作面对照清单落 `docs/spec/v2-editors-acceptance.md`（新票定稿）。
- 规则链保存点清栈是用户可感知行为（保存后 ctrl+z 无反应），UI 明示检查点语义。
- 同页预览下 widget 代码可操作 window 全局（含导航离开编辑器）——已知限制，接受（TA 信任模型），iframe 化即解。
- widget-kit/antd 大版本升级会破坏已存自定义 widget（源码不可重编译规避）→ descriptor 记 toolkitVersion，跨大版本升级按其回归。
- 新依赖登记（#8 惯例）：@xyflow/react、react-grid-layout 2.x、react-hotkeys-hook、react-resizable-panels、sucrase、prettier standalone、@uiw/react-codemirror 系、dompurify、react-markdown 系——全部懒加载 chunk 化，编辑器路由独占。
- 验证台账三层归置（红队 F14）：选型级 PoC → 本 ADR 附录 A（v2 开工前 research/ 分支）；长期回归 → #12；操作级验收 → v2 编辑器验收 spec。

## 附录 A：PoC 判据表（v2 开工前，research/ 分支）

| # | 判据 |
|---|---|
| P1 | Sucrase 编译错/运行错行号与源码行号一致（含多行 JSX）；不一致则评估 sourceMap 路线 |
| P2 | require shim 传宿主 React 单实例 + antd 6 组件在编译产物内可用（`$$typeof` 同源断言） |
| P3 | RGL 2.x compactor/preventCollision 精确 API 形状（v2 d.ts）+ 碰撞阻挡行为 vs gridster 逐项对齐；dropConfig 修复链确认 |
| P4 | React Flow 半受控 + dragStop 事务提交 + undo 后受控回灌端到端；500 节点拖拽 ≥50fps |
| P5 | 撤销合并组逆序 + undo/redo 往返一致性属性测试 |
| P6 | antd 6 Form 回填与输入焦点竞争（undo 光标处置 + revision 守卫 + trailing 节流） |
| P7 | 100+ widget 真实仪表盘 React Profiler 验证 memo 边界（单字段编辑仅目标 widget 重渲染） |
| P8 | descriptor 实际预算测量（TSX+CSS+schema vs 1MB） |
| P9 | TB Angular widget JSON 导入 → badge + 占位链路 |
| P10 | CSS 前缀器对 @media/@keyframes 的正确性；includeResources 导出 round-trip |

## References

- 决策票据：KMakise123/thingsboard#13（wayfinder 地图 #1「前端 AntD Pro 重写蓝图」）
- 过程：四路专家裁决（画布交互/编辑数据模型/规则链域/widget 扩展机制）+ 红队全审（19 项发现全部归置）
- 上游修订：ADR 0003（widget 运行时，RGL 措辞/memo 边界/注册表 resolver 链/窄契约定稿）、ADR 0001 决策要点 4（存储与 CSP 重开已履行）
- 事实基础：ui-ngx 三编辑器源码盘点（dashboard-page/rulechain-page/widget-editor 全行号清单）、BaseRuleChainService.java:210-263、WidgetTypeDataValidator、AnnotationComponentDiscoveryService、npm registry 2026-08-31 快照
