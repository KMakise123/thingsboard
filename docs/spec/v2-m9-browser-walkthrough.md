# v2 M9 真机验收走查记录（widget 编辑器，spec §5）

> 执行：V 波验收代理，2026-09-04。环境：后端 `http://localhost:8080`（本地 dev tenant，本机常驻），前端 dev server `http://localhost:8000`（走查前按 stale-bundle 惯例重启：杀旧进程链 → 删 `src/.umi` → `ui-antd/dev-detached.cmd`，utoo pack ready + 200 确认后开始），browseros MCP 真机浏览器（租户管理员 `tenant@thingsboard.org` / `tenant`，会话已带登录态）。
> 取证方式：browseros 内联截图 + AX 快照 + 页面 DOM 探针（fetch 钩子抓 `/api/widgetType` 请求、`URL.createObjectURL` 钩子捕导出 blob、DataTransfer 注入文件驱动真实导入管线——仅绕过 OS 文件选择器）；服务端真相用 `curl` 直查 API 复核。二进制不入 git（M7/M8 先例）。
> 数据保全：走查自建 3 个 widget 类型 + 1 个仪表盘（导入路径反复进出共 6 个同名盘，逐个删除后核对），走查结束后已全部 DELETE（均 200），终态：widget 类型列表 M9 相关 0 个、仪表盘仅剩既有 Firmware / Rule Engine Statistics / Software / Thermostats 4 盘，既有实体零改动。走查期间经删除 API 清掉的中间态盘与最终 3 类型一并列入 §4 清单。

## 0. 总览

| 走查项 | 结果 |
|---|---|
| 1 入口页与新建链路（五桶模板 → 原地进 shell → 预览随机数据 → ctrl+s 首存 → URL 替换） | ✅ |
| 2 运行与错误闭环（语法错 → 行级标注 + console 错 → 输入即清错 → 修好恢复） | ✅ |
| 3 保存中止（抛错组件 ctrl+s → toast + 零 POST） | ✅ |
| 4 settings 回写 defaultConfig + 预览吃到新 settings | ✅ |
| 5 五快捷键 + ctrl+z 焦点路由 + ？帮助面板 | ✅（ctrl+q 热键本体未单按，注记） |
| 6 Tidy / 另存为 / 恢复上次保存 / 全屏 | ✅ |
| 7 元数据侧栏编辑 + 撤销入栈；离开确认（脏草稿） | ✅ |
| 8 派生两档（自定义全拷 / 内置诚实标注） | ✅ |
| 9 Angular widget JSON 导入（badge + 占位链路 + 不拒收） | ✅ |
| 10 导出 JSON（runtime/schemaVersion 标记 + 字段剥离） | ✅ |
| 11 仪表盘闭环（money demo：自定义 widget 真渲染非占位） | ✅（数据序列为空的环境说明见 §2 步骤 11） |
| 12 fork 格式（react-1）JSON 导入 round-trip | ☐ 真机未走（单测锚：import-export.test round-trip；Angular 导入同槽真机目击） |
| 13 运行错 sourceURL 行号偏移定位 | ☐ 真机未触发（单测锚：compile.test.tsx sourceURL/lineOffset；冒烟渲染抛错 toast 目击） |
| 14 i18n / 主题抽查（zh/en 无裸 key、无内联色值） | ✅ |
| 15 512KB 软警告 | ☐ UI 无法自然触发（单测锚 descriptor-budget.test；真机未触发，如实登记） |
| 16 分屏拖拽调宽 | ⛔ 环境受阻（react-resizable-panels 对合成指针事件不启动，E1 同族；handle DOM 在场） |

## 1. 门禁数字（全量，主检出 feature/m9-widget-editor @ cf4ec1321f，2026-09-04）

- `npm run lint`：**红（exit 非 0）——2 errors + 41 warnings**。
  - 2 errors = `src/locales/zh-CN.ts` / `src/locales/en-US.ts` 两个聚合器 biome **format 漂移**（「Formatter would have printed the following content」）。
  - 41 warnings = 30 存量基线（M7/M8 记录在案）+ **11 个新增，全部位于 M9 wave-3 D 文件**：`contract/save-as-dialog.tsx`（noUnusedVariables）、`contract/save-as-dialog.test.tsx`（noNonNullAssertion ×2）、`contract/use-restore-saved.test.tsx`（noUnusedImports ×2 + noUnusedVariables ×3）、`new-dialog/index.tsx`（noUnusedImports）、`derive-dialog/index.tsx`（noNonNullAssertion）、`import-export.test.ts`（noNonNullAssertion）。
  - 登记 **D1（中，门禁阻断）**，见 §3。
- `npm run tsc`：绿（exit 0）。
- `npm run check-locale`：绿（exit 0）。
- `npm run test`：**1656 tests（229 文件）**。两轮全量：run1 = 1654 通过 / 2 失败（`src/pages/home/entry.test.tsx` master 存量 + `src/pages/dashboards/editor/shell.test.tsx:251` waitFor 超时）；run2 = **1655 通过 / 1 失败**（仅 entry.test.tsx）。**抖动判定成立**：run1 的 dashboards shell 超时在 run2（及隔离复跑）全过、失败集合轮换，与预警的「并行负载抖动」一致（走查期间另有 agent 的 vitest 与 dev server 并行负载）；未调整 testTimeout。entry.test.tsx 为 master 存量（M7 已登记，单跑复现同失败）。
- 证据文件核实（主检出）：`src/core/widget/compile.test.tsx`（0759c9395c，P1/P2）、`src/core/widget/style-scope.test.ts`（a982d33b5d，P10 CSS）、`src/pages/widgets/editor/import-export.test.ts`（f3bdb7d19d，P9/P10 round-trip）均在。

## 2. 分步记录

### 步骤 1 — 入口页与新建链路 ✅
`/widgets/editor` 入口页：info alert「widget 编辑器 —— 从仪表盘或 widget 库进入编辑器；列表入口由资源库子系统提供。」+ 两按钮（新建 widget / 从现有类型派生）。**create 路由挂载即自动弹出新建对话框**（index.tsx mount-only effect，设计行为——第一次点「从现有类型派生」时弹的是已自动打开的新建对话框遮罩，关闭后按钮可达）。
新建对话框：五桶 starter（**最新值卡片 / 时序折线图 / RPC 控制按钮 / 告警状态卡 / 静态卡片**，与 ui-ngx select-widget-type-dialog 五桶一一对应）+ 未选中时「创建」禁用。选「时序折线图」→ 创建 → **原地进入 shell（URL 仍为 /widgets/editor）**：左侧元数据侧栏、中间代码区、右侧预览（**recharts 折线图实时渲染 function 数据源随机数据**，运行序号 0）+ 设置表单（Line color / Show dots）+ 底部控制台（0，暂无输出）。
填写名称「M9 V 走查折线」→ **ctrl+s 首存**：save 按钮转 loading → toast「已保存」→ **URL 替换为 `/widgets/editor/c9cb14c0-…`**（history.replace，栈存活）→ fqn 由服务端按 name 生成（`m9_v_`，中文名被 slug 化）→ save/rollback/undo 按钮态归位（baseline 前移）。

### 步骤 2 — 运行与错误闭环 ✅
TSX 编辑器内造语法错（`return (()`）→ **▶ 运行**（与 ctrl+enter 同一代码路径，shell.tsx:467-474 全局注册无 typing 守卫）：预览区顶部红色错误横幅「Error transforming m9-widget-2-preview.tsx: Unexpected token, expected "," (11:12)」+ 空态提示「修复错误后按 ctrl+enter 重新运行」；**TSX 代码第 11 行红色波浪线**（CodeMirror `cm-lintRange-error` 行级标注，sucrase 行号映射到编辑器行）；控制台 (1) 红色条目「13:42:22 编译失败: …(line 11)」；**运行序号不递增**（编译前置同步抛错 → 不 remount，预览保持上次好图）。
**输入即清错**：在错误行尾输入一个空格 → `cm-lintRange` 立即归零、预览错误横幅消失（AX 诊断 list 同步移除）。
**修好恢复**：CM 内 3×ctrl+z 把代码回退到原始状态（同时证实**代码 tab 内 ctrl+z 归 CodeMirror 自身栈**——侧栏 session 态不受影响）→ ▶ 运行 → 折线图恢复、运行序号递增。
**ctrl+enter 接线复核**：browseros 合成按键的修饰键投递进 CM 后退化为普通 Enter（环境受限，E2），改以页面派发正确属性的 `KeyboardEvent(key='Enter', ctrlKey=true)` → **运行序号 3 递增**，证实全局热键处理器真实接线；真机正常键盘无碍。

### 步骤 3 — 保存中止（带抛错组件）✅
TSX 函数体首行注入 `throw new Error("v-probe boom");` → **ctrl+s**：toast「**保存中止：组件冒烟渲染失败: v-probe boom**」；**fetch 钩子实抓 `/api/widgetType` 请求为零**（探针安装后基线 0，保存中止后仍 0）——编译过、执行过、冒烟渲染抛错 → commit 不发生；save 按钮保持可用（草稿未提交）。对照：撤销 throw 后正常保存 → `POST /api/widgetType` 恰 1 次（200）。

### 步骤 4 — settings 回写 defaultConfig ✅
预览设置表单 Line color 由 `"#1677ff"` 改 `"#ff0000"`：**defaultConfig tab 文本即时回写** `"lineColor": "#ff0000"`，预览折线立即变红（无需重跑）。**已知行为②目击**：紧凑单行 JSON 被重排为 2 空格缩进格式（原始格式不保留，字段与值无损）。
**ctrl+z 焦点路由**：焦点在侧栏/设置表单输入框时 ctrl+z → **EditorSession 撤销**（defaultConfig 回退一格、redo 转可用、CM 文本不动）；与步骤 2 的 CM 内撤销形成两侧对照，均真机目击。

### 步骤 5 — Tidy / 恢复上次保存 / 全屏 / 另存为 ✅
- **Tidy（格式化）**：▶ 点击后 prettier standalone 重排当前 tab——引号归一、括号 return 折叠、多余空行清除（AX 全文 diff 核对），与 shift+ctrl+f 同路径。
- **恢复上次保存**：改 Line color 为 `#00ff00`（脏）→ rollback → 确认对话框「恢复到上次保存的版本？」→ 恢复：defaultConfig 回到基线文本、save/rollback 禁用、成功 alert。**恢复后 ctrl+z 找回编辑**：一次 ctrl+z 整组重现「#00ff00 + 缩进」的全部编辑（一个事务组），redo 可用；ctrl+y 重做回基线。
- **全屏**：点击后应用侧栏/横幅从 AX 树消失、按钮变 fullscreen-exit，编辑器占满视口；再点退出。
- **另存为**：shift+ctrl+s（派发）弹「另存为」对话框（新名称预填 + 可选 fqn 短名）→ 改名「M9 V 走查副本」→ 创建副本草稿：`POST /api/widgetType` 新建 + URL 替换为新 id（`b2e05a60-…`，fqn `m9_v_2`）。

### 步骤 6 — 元数据侧栏与离开确认 ✅
- 侧栏字段：fqn（只读）、名称、类型（下拉：时序数据/…）、宽/高（格）、类型参数（JSON，静态模板显示 `{"datasourcesOptional": true, "dataKeysOptional": true}`）、添加操作源（actionSources）——spec §5.1 侧栏清单齐。
- 名称编辑曾使 save/undo 按钮态随动（入栈）；宽 8→9（fill+Tab）→ 侧栏内 ctrl+z → 宽回 8（session 撤销真机目击）。连续撤销可见跨组历史回放（含此前 restore 的编辑组），redo 重做复原——语义与 `core/editor/session` 契约一致。
- **离开确认（脏草稿）**：宽改 9 制造脏草稿 → 退 出 → 对话框「**有未保存的更改** / 取消 / 放弃更改」→ 取消留在页面、草稿保留；返回箭头（PageContainer back guard）同源 dirty 守卫（M7 修复先例的复用）。干净草稿退出无弹窗（对照）。

### 步骤 7 — 派生两档 ✅
入口页「从现有类型派生」→「派生 widget」对话框：segmented「从自定义类型 / 从内置类型」。
- **从自定义类型**：列表列出租户自建类型（M9 V 走查副本 m9_v_2 / M9 V 走查折线 m9_v_），选中预填「xxx (copy)」，文案「**源码（TSX/CSS/Schema/defaultConfig）全量复制为新副本**」。
- **从内置类型**：诚实标注原文「**内置类型是 Angular widget：源码不可得。仅复用其 Schema/defaultConfig/尺寸骨架，TSX 使用 starter 骨架（不会出现 Angular 源码）**」+ 内置类型列表（system.time_series_chart / system.cards.entities_table / …）。文案不暗示「即将支持」（占位三态原则）。派生按钮禁用态正确。
（走查到此取消对话框，未再建副本。）

### 步骤 8 — Angular widget JSON 导入 ✅
本地手工构造 Angular 形状 JSON（descriptor：type/sizeX/sizeY/resources/templateHtml/templateCss/controllerScript/settingsForm/defaultConfig，无 runtime 标记）→ 工具栏导入（隐藏 file input 以 DataTransfer 驱动真实 change 事件）→ 导入预览对话框：
「导入 widget 类型 / 文件中的类型: M9 V Angular Probe (system.angular_probe_card)」+ **橙色徽标「Angular（非 react-1）」** + 诚实占位文案「该文件是 Angular widget（无 react-1 运行时标记），源码无法在本编辑器打开，引用它的仪表盘按占位渲染。可以将其原样保存为服务器副本（描述符不做任何改写）」+ 按钮「保存为服务器副本」——**不拒收**。点击保存 → `POST /api/widgetType` 200（服务器核对 fqn 原样落库，见 §3 O1）。

### 步骤 9 — 导出 JSON ✅
工具栏导出（download）→ `URL.createObjectURL` 钩子捕获 blob（3667B，application/json）。键集核对：
- 顶层 `deprecated/scada/image/description/tags/fqn/name/descriptor`——**无 id/tenantId/version/createdTime**（剥离对齐 TB）。
- descriptor：`runtime:"react-1"`、`schemaVersion:1`、`source{tsx,css}`（fork 五件）+ `type/sizeX/sizeY/settingsForm/defaultConfig`——**导出物自带 runtime/schemaVersion 标记**（TB 导入无害）。resources 透传由 import-export.test 锚定（本类型无 resources，真机未及）。
- 下载落盘：browseros download 工具未捕获 blob 导出（超时），改用页面钩子取证——导出行为本身真实发生（blob 创建 + 锚点下载）。

### 步骤 10 — 元数据/四 tab 补充目击 ✅
新建「静态卡片」循环（**不保存零残留**）：TSX/CSS/Schema/defaultConfig 四 tab 内容逐一目击——Schema tab 为 settingsForm JSON（`[{"id":"text","name":"Text","type":"text","default":"Hello ThingsBoard"},…]`，CodeEditor 渲染）；CSS tab 为模板 CSS（`.static-card{…}`）。元数据侧栏 typeParameters、类型下拉、宽高、操作源按钮同步骤 6。干净草稿退出无弹窗。

### 步骤 11 — 仪表盘闭环（money demo）✅（附环境说明）
构造最小仪表盘 JSON（`configuration.widgets.w1.typeFullFqn = "tenant.m9_v_"`）→ **仪表盘列表「导入仪表盘」路径**（文件必须含 title 与 configuration；布局键必须为 `main`——首版 fixture 误用 `default` 键导致空盘，API 复核后修正重导，属 fixture 问题非产品问题）→ 导入 toast「仪表盘"M9 V 走查仪表盘"已导入。」（ICU 插值正常）→ 打开只读页：
- **自定义 widget 真渲染（非占位）实证**：画布中的卡片渲染的是编译产物的自有 DOM——recharts 图表面板（网格线 `strokeDasharray="3 3" opacity=0.24` 与模板源码逐字对应）+ 组件自有的「Waiting for data…」空态分支；三态占位组件（内置未覆盖 / angular-unsupported / missing）均未出现。registry resolver 链（miss → probe `GET /api/widgetType?fqn=tenant.m9_v_` → react-1 → 编译注册）真机闭环。
- **数据序列为空的环境说明**：widget 数据为空时序（空数组键）。**内置对照组**：同一别名/数据源换 `system.time_series_chart`（对照盘）同样显示「该窗口内暂无遥测数据」——空数据为 M5/M7 仪表盘侧数据管道/时间窗问题（本地 T1 设备仅有一条 1.2 天前的点，默认窗口 1 小时；工具栏切「最近 7 天」后 WS 管道仍回空序列），**与自定义 widget 渲染链无关**（内置对照同等为空）。真渲染取证不依赖数据点；带数据的同组件渲染已由编辑器预览（function 随机数据）目击。

### 步骤 12 — i18n / 主题抽查 ✅
- 语言切 English：入口页（New widget / Derive from existing）、shell chrome（Save as / ▶ Run / Tidy / Metadata / Exit / Identifier (fqn) / Name / Type / Width (cells) / Height (cells) / Type parameters (JSON) / Add action source / Clear / No data）、帮助面板、错误文案全部翻译，**无裸 key**；切回中文同验（双向）。
- 主题：`main` 内 DOM 探针扫描内联色值——**编辑器 chrome 零内联色值**；唯一命中为 `recharts-default-tooltip`（recharts 库内默认样式，非本仓代码）。颜色均走 antd token / 模板 settings。

## 3. 发现的缺陷、缺口与观察项（spec 勾账已同步）

| # | 级别 | 描述 | 状态 |
|---|---|---|---|
| D1 | 中（门禁阻断） | 合并分支 `npm run lint` 红：`src/locales/zh-CN.ts` / `en-US.ts` biome **format 漂移 2 errors** + M9 wave-3 D 文件新增 **11 warnings**（save-as-dialog.tsx / save-as-dialog.test.tsx / use-restore-saved.test.tsx / new-dialog/index.tsx / derive-dialog/index.tsx / import-export.test.ts 的 noUnusedVariables / noUnusedImports / noNonNullAssertion）。根因：cf4ec1321f 合并未跑全量 lint（波次收尾纪律缺位）。修法：X 波对聚合器 `npx biome check --write` + 清理未用变量/导入 | 未修，X 波 |
| D2 | 低 | 409 三选项对话框共享件（`core/editor/contract/ConflictDialog.tsx`，M8 wave F hoisted）intro 文案写死 `editor.dashboard.contract.conflict.intro`「服务器上的**仪表盘**已被其他来源修改…」——widget 编辑器（`use-widget-save.tsx:279` 复用）触发 409 时将显示仪表盘字样。单机无法自然复现 409，代码层证实。修法：共享文案中性化（「实体」/域注入），动 core locale，随 M10 三编辑器一致性复查 | 未修，X 波/M10 |
| O1 | 低（边界） | Angular JSON「保存为服务器副本」把原 fqn **原样落库**：`system.angular_probe_card` 成为租户域类型的短 fqn（外域 scope 前缀被租户实体占用）。修法建议：副本创建时 fqn 留空由服务端从 name 生成，或校验拒绝带 scope 前缀的输入 | 未修，登记 |
| 已知行为② | 设计行为（记录） | settings 回写将 defaultConfig 重排为 2 空格缩进（原始紧凑格式不保留）——回写内容正确、字段无损；ADR 0004 只承诺 defaultConfig 为 JSON 字符串，未承诺保格式 | 不修，注记 |
| 已知行为③ | 设计行为（记录） | console 捕获只覆盖 RUN 窗口（mount + ctrl+enter 同步段）与 transform/execute 失败，不收 widget passive useEffect 异步日志——`preview/console-capture.ts` 头注释声明的窗口化契约；真机与声明一致 | 不修 |
| 已知行为④ | 设计行为（记录） | 实例级 `config.widgetCss` 在预览不挂载（预览无 widgetId 上下文）；实例层样式挂载由仪表盘侧 `CustomWidgetHost`（custom-widget-host.tsx）按 widgetId 键控 | 不修 |
| E2 | 环境 | ①合成 ctrl+enter 在 CodeMirror 焦点内退化为普通 Enter（修饰键投递丢失），改以页面派发正确属性 KeyboardEvent 证实接线；②react-resizable-panels 分屏拖拽对合成指针事件不启动（handle DOM 在场、宽度无变化）——均 E1（M8 RF 手势）同族的自动化通道限制 | 环境受阻 |
| 未复现 | — | 409 三选项（单机无并发，M7/M8 同款处理）；512KB 软警告 UI 无法自然触发（descriptor-budget.test 锚）；运行错 sourceURL 行号偏移真机未触发（compile.test.tsx 锚）；fork 格式导入 round-trip 真机未单独走（import-export.test 锚） | 如实登记 |

## 4. 现场清理清单（服务器复原核对）

走查自建、已全部 DELETE（均 200）：

- widget 类型 3 个：`c9cb14c0-a822-11f1-bf08-2be356855d51`（m9_v_ / M9 V 走查折线）、`b2e05a60-a825-11f1-bf08-2be356855d51`（m9_v_2 / M9 V 走查副本）、`4f85abe0-a826-11f1-bf08-2be356855d51`（system.angular_probe_card / M9 V Angular Probe，Angular 导入副本）。
- 仪表盘 6 个（money demo fixture 迭代 + 对照盘，最终留存 1 个后删除）：`70898e50` / `e1275c00` / `9c509140` / `e6d1bfa0` / `213b83b0` / `e5553c50`（M9 V 走查仪表盘 ×5 迭代、82368560 M9 V 对照盘）。fixture 中间态盘在迭代时即时删除（均 200）。
- 终态核对（API）：widgetTypes `textSearch=M9` totalElements = **0**；仪表盘列表 = Firmware / Rule Engine Statistics / Software / Thermostats（与走查前一致）。既有实体（设备/盘/链）零编辑。本地临时构造的 JSON 样本（%TEMP%）已删除。
