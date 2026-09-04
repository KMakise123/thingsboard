# v2 M9 实施简报：widget 编辑器（团队共享契约）

> 依据：[v2-editors-acceptance.md](./v2-editors-acceptance.md) §5（验收载体，逐项勾选）+ [ADR 0004](../adr/0004-editor-suite.md) §4「代码级自定义 widget」（编译管线/门面/样式命名空间/编辑器形态，技术裁决已定稿不得重开）+ [ADR 0003](../adr/0003-widget-runtime-controlled-components.md)（registry resolver 链定案）。
> 分支：`feature/m9-widget-editor`。本简报是实施团队的作业契约；验收勾账回写 spec 本体。

## 0. 范围

- **做**：spec §5.1–§5.7 全部 checklist + P1/P2/P9/P10 证据（P1/P2 为 v2 开工前欠账，随编译管线落地）+ registry resolver 链 react-1 升级（ADR 0003 定案：miss → 拉 widgetType → `runtime==='react-1'` → 编译注册，服务「仪表盘已引用自定义 fqn」的渲染闭环）+ 512KB descriptor 软限警告（ADR 0004 既有决策，仅警告不阻断，保存路径顺手交付）+ 新依赖登记安装。
- **不做**（防蔓延）：widget 库列表页 / 资源库子系统（库列表、bundle 管理、scada 符号——add-widget 抽屉与库 badge 属该票）；dashboards add-widget 抽屉列举自定义类型（同库列表域）；§7 崩溃保护 sessionStorage（M10）；512KB 以上不再做限流/阻断；后端零改动。编辑器入口仅路由直达（`/widgets/editor`），验收走查用 URL 直达。

## 1. 现状盘点（三路侦察结论，agent 直接采信）

**ui-antd 底盘（M7/M8 攒下，全部可复用）**：
- `core/editor/session.ts` `EditorSession<T>` 现成（enter/write(label,recipe,{coalesceKey})/undo/redo/checkpoint/save/subscribe，coalesce 窗 1s）。widget 编辑器直接 `EditorSession<WidgetEditorDraft>`。**保存 = baseline 前移、栈跨保存存活**（仪表盘同侧语义，非规则链检查点——§1 原则 4 只给规则链清栈特权）。
- `core/editor/contract/` 现成：`save-with-conflict`（409 三选项 + 二次 409 上限回落）+ `ConflictDialog` + `use-leave-guard` + `use-editor-entry-checkpoint`。
- `components/code-editor/` CodeEditor 薄封装：`languages json/javascript/tbel`，`extensions` 透传挂诊断/补全（编译错行级标注的现成挂点）；头注释点名「M9 加语言是一行 entry，API 不动」。
- `components/form-property/` `FormPropertyForm({properties,value,onChange,...})` 全套——preview 的 settings 表单与 Schema tab 预览直接复用。
- `components/widgets/registry.ts`：resolver 已留 `unsupported-custom` 桩（`resolveProbedWidgetType`）——M9 升级为编译注册；`contract.ts` 是**仪表盘内置 widget** 的 `WidgetComponentProps`（fqn/widgetId/widget/layout/ctx），与自定义 widget 的 `CustomWidgetProps`（ADR 0004 窄契约）**并存不互替**；`placeholders.tsx` 三态占位（copy 在 dashboards locale 域）。
- `types/tb/widget.ts` 有 Widget/WidgetConfig（仪表盘侧）；**widget-type wire 类型、`services/tb` widget-type transport 均空白**。openapi 生成层（`types/tb/openapi/`）端点/schema 已全量可照抄；手写按 `types/tb/dashboard.ts` 风格（生成字段多 readonly）。
- house style 参考 `pages/rule-chains/editor`（M8）：DialogHost（`EditorDialogProps{open,payload,onClose}` + lazy map 单槽）、`useHotkeys` + `isTypingTarget` 守卫、contract 泛型件 re-export、`undo-safe-value`（CM 文本 ↔ session 回写的既有范式）。
- **未装依赖**：sucrase、prettier、react-resizable-panels、@codemirror/lang-css。波 1 F 是唯一允许碰 package.json 的角色。`@codemirror/lang-javascript` 已装（支持 `{typescript,jsx}` 选项，tsx 不需新包）。

**ui-ngx 对照（行为等价锚点；目录 `ui-ngx/src/app/modules/home/pages/widget/`）**：
- `widget-editor.component.ts`：四 tab（html/css/settings schema/defaultConfig——v2 改 **TSX/CSS/Schema/defaultConfig**）+ 元数据侧栏（**name/type/sizeX/sizeY/typeParameters/actionSources**，actionSources 精确键名由 F 从 ui-ngx `widget-type-tabs` + openapi 侦察核实）。分屏 v2 用 react-resizable-panels（弃 split.js）。
- `select-widget-type-dialog`：新建五桶 **latest-values / timeseries / rpc / alarm / static**——v2 五个 React starter 一一对应（`getWidgetTemplate` 拉的系统模板是 Angular widget，**不可复用**，内置前端静态资产）。
- `save-widget-type-as-dialog`：另存为（新 alias/name，v2 = 新 fqn）。
- 预览数据：function 数据源随机数据（ui-ngx widget-subscription 的 dataGenerator 语义——`funcBody` 以 `timeIndex/time/prevValue` 求值生成序列）；预览的 settings 编辑表单由 settingsForm schema 生成，编辑值**回写 defaultConfig**（WYSIWYG）。
- descriptor = 自由 JsonNode；上游键名约定：`type/sizeX/sizeY/typeParameters/actionSources/settingsForm/defaultConfig`；fork 增量 `runtime:'react-1'` + `source:{tsx,css}`（ADR 0004 §4）；`resources[]` 只消费 `isModule:false` 且导出 round-trip 保留（P10 半项）。
- i18n 旧键空间 `widget.*`/`widget-editor.*` 文案等价参照；v2 命名空间 `editor.widget.*`（ADR 0004 §6）。

**后端契约（全部 `@PreAuthorize('TENANT_ADMIN')` 级；F 从 openapi 生成层核实端点签名）**：
- `GET /api/widgetType?fqn=`（WidgetTypeDetails）；`GET /api/widgetType/{id}`；`POST /api/widgetType`（upsert，带 id 更新/不带新建，tenantId 服务端强制）；`DELETE /api/widgetType/{id}`；`GET /api/widgetTypes`（分页，派生源列表用）。
- `WidgetType{id,createdTime,tenantId,alias,name(?),descriptor(JsonNode),...}`——精确形状 F 侦察定稿；**descriptor 无形状校验，varchar 1MB 硬上限** → 编辑器 512KB 软限警告（仅警告不阻断）；fqn 更新禁改；widgetType CRUD 仅 SA/TA（与信任模型吻合）。

## 2. 架构落位（ADR 0004 §4 固化 + 本段细化）

```
src/core/widget/
  types.ts             WidgetEditorDraft + descriptor 五件类型 + CustomWidgetProps 定稿（F 转写冻结）
  compile.ts           Sucrase(transforms typescript+jsx+imports, jsxRuntime automatic+production)
                       → new Function('require','module','exports')（禁 eval）→ require 白名单 shim
                       （react/react-dom 宿主单实例 + widget-kit 受控门面；白名单外 throw 可读错误）
                       → module.exports.default 取组件 → React.lazy 包装
  widget-kit.ts        受控门面：antd / dayjs / recharts / formatValue（唯一宿主依赖入口 = 未来 iframe 化桥点）
  style-scope.ts       双层样式命名空间：type 级 source.css 前缀注入 + 实例级 config.widgetCss 前缀注入
                       （@media/@keyframes 内选择器不加前缀 = P10 半项）
  resolve-cache.ts     会话缓存 keyed `fqn@version`（编辑器预览恒不走缓存）
src/components/widgets/registry.ts    resolver 升级：miss → 拉 widgetType → react-1 → 编译注册
                                      （angular → placeholder、404 → placeholder 不变）（K）
src/pages/widgets/editor/
  index.tsx            加载 widgetType → EditorSession enter → shell（S）
  shell.tsx            分屏（react-resizable-panels：左代码右预览、底部 console）+ 四 tab
                       （TSX/CSS/Schema/defaultConfig，全部 CodeEditor）+ 元数据侧栏 + DialogHost
                       + 热键五键 + ctrl+z 焦点路由 + 「?」帮助 + Tidy + 全屏（S）
  preview/             同页预览（P）：编译前置同步抛错 / key 递增 remount（hook 订阅独立生命周期）/
                       function 数据源随机数据 / settings 回写 defaultConfig / console 捕获 /
                       每实例 ErrorBoundary + sourceURL 行号偏移 / 编译错 → CM 行级 diagnostics
  contract/            保存链（编译→执行→冒烟渲染→commit）+ 409 三选项 + 离开确认 + 另存为 +
                       恢复上次保存 + 512KB 软限警告（D）
  import-export.ts     fork 格式五件导出/导入 round-trip（runtime/schemaVersion 标记；resources 保留）+
                       TB Angular widget JSON 导入 → badge + 占位链路（P9）（D）
  new-dialog/          五 starter 模板选择（D）
  derive-dialog/       从现有自定义类型派生（源码可得全量）/ 从内置类型受限派生（schema/config/尺寸
                       可得、源码不可得，UI 诚实标注）（D）
  templates/           5 个 React starter 静态资产（D）
routes.ts              /widgets/editor + /widgets/editor/:widgetTypeId（hideInMenu, canTenantAdmin）
```

**核心契约（F/K 波定稿后冻结）**：
- **WidgetEditorDraft**：`{widgetTypeId: TbId|null, fqn: string, name: string, source: {tsx, css}, settingsForm: FormProperty[], defaultConfig: string(/* JSON 字符串——后端 helper 依赖，保持不 parse 落库 */), meta: {type, sizeX, sizeY, typeParameters?, actionSources?}, version: number|null}`（精确形状 F 侦察后冻结；descriptor 未列出键**透传保留**，round-trip 不丢）。
- **descriptor 写入形状**：`{runtime:'react-1', schemaVersion:1, source, ...上游键名}`；`schemaVersion` 常量 1（后续 widget-kit 大版本才动）。
- **CustomWidgetProps（封顶，ADR 0004 定稿）**：`{config, settings, datasources, data, latestData, timewindow, actions, rpc?, ctx:{width,height,isEdit,isPreview,locale,toast,updateTimewindow?}}`——生命周期回调全灭（props 驱动 + 容器 ResizeObserver）；**接口封顶不加宽，新能力走 widget-kit 版本化**。
- **撤销边界（行为契约）**：四 tab 代码文本 undo 归 CodeMirror 自身栈（`undo-safe-value` 范式回写 session，coalesce）；元数据侧栏表单 undo 归 EditorSession；焦点切换 ctrl+z 归属正确（isTypingTarget 守卫扩展到分屏焦点域）；保存动作本身不入栈。
- **保存 = 编译→执行→冒烟渲染→commit**：任何一步抛错即中止并落错误闭环（不静默降级存编译不过的源码）；成功后 baseline 前移 + version 回填；409 = 三选项对话框同形复用（§6.2 行为契约；spec「显式 diff 不静默覆盖」即此——对话框呈现冲突双方 version/updatedTime）。
- **错误闭环**：编译错 → CM 行级 diagnostics（extensions 挂点）；运行错 → console 输出 + sourceURL 行号偏移定位；**输入即清错**（文本编辑立即清 stale 错误标注，重编译靠 ctrl+enter）。
- **运行**：ctrl+enter 重编译 + 预览 key 递增 remount（编译前置同步抛错；hook 订阅随 remount 独立生命周期）。

## 3. 波次与文件所有权

| 波 | Agent | 交付 | 文件所有权（硬边界） |
|---|---|---|---|
| 1 | F 地基 | 装依赖（sucrase / prettier@3 / react-resizable-panels / @codemirror/lang-css，唯一可碰 package.json；版本登记进简报）+ `types/tb/widget-type.ts` + `services/tb/widget-type.ts`（transport TDD）+ `core/widget/types.ts`（WidgetEditorDraft + CustomWidgetProps 转写冻结 + descriptor 形状；上游键名侦察核实）+ locale `editor-widget.ts` 种子 | `ui-antd/package.json`+lock、`src/types/tb/{widget-type.ts,index.ts}`、`src/services/tb/{widget-type.ts,index.ts}`、`src/core/widget/types.ts`、`src/locales/{zh-CN,en-US}/editor-widget.ts` + 聚合器一行 |
| 2 | K 管线 | `core/widget/{compile,widget-kit,style-scope,resolve-cache}.ts`（TDD）+ **P1/P2 证据** + registry resolver react-1 升级（dashboards 已引用自定义 fqn 的渲染闭环；resolver 测试） | `src/core/widget/**`（types.ts 除外）、`src/components/widgets/registry.ts`、`src/locales/{zh-CN,en-US}/widget-kit.ts`（若有门面文案）+ 聚合器一行 |
| 2 | S 壳 | CodeEditor 扩 `css`/`tsx` 语言 + routes + 编辑器壳全量（分屏/四 tab/元数据侧栏/console 槽/DialogHost/热键五键/焦点路由/「?」帮助/Tidy 按钮/prettier standalone 接线/全屏）+ `preview/`、`contract/`、`new-dialog/`、`derive-dialog/` **占位组件**（冻结路径与 props） | `src/components/code-editor/**`、`src/pages/widgets/editor/{index,shell,metadata,layout}.tsx` 及占位件、routes.ts、`src/locales/{zh-CN,en-US}/editor-widget-editor.ts` + 聚合器一行 |
| 3 | P 预览 | preview/ 真实现（编译→执行→render + key remount + function 数据源随机数据 + settings 回写 defaultConfig + console 捕获 + ErrorBoundary/sourceURL + 输入即清错 + 编译错 CM diagnostics 行级标注） | `src/pages/widgets/editor/preview/**` |
| 3 | D 契约IO | contract/（保存链 + 409 + 离开确认 + 另存为 + 恢复上次保存 + 512KB 警告）+ import-export.ts（fork round-trip / Angular badge 导入 / 导出标记，**P9 证据**）+ new-dialog（五 starter）+ derive-dialog（两档派生） | `src/pages/widgets/editor/{contract/**,import-export.ts,new-dialog/**,derive-dialog/**,templates/**}` |
| 4 | V 验收 | 全门禁 + P9/P10 复验回填 + 真机走查（browseros）+ spec §5 勾账 + 简报 §5 回填；缺口/缺陷登记后 **X 波修复** | spec/简报文档；X 波才碰 src |

**稳定入口纪律**：F 交付后 WidgetEditorDraft / CustomWidgetProps / transport 签名冻结；K 交付后 `compile` API（`compileWidget(source): {component} | {error}` 形状以 K 实现为准）与 widget-kit 导出面冻结；S 交付后 preview/ 占位组件、contract/ 路径+props、console 槽、DialogHost lazy map 冻结。波 3 各自填实现不改共享文件；locale 各自独立文件 + 聚合器一行 import，合并冲突我收口。

## 4. 门禁与作业纪律

- 每个逻辑单元一 commit（限额中断可恢复，接续 agent 从分支状态接管）；Conventional Commits（英文）。
- 提交前自跑：`npx vitest run <自己范围的测试>` + `npm run tsc` + `npx biome check <自己文件>`；波次收尾跑全量 `npm run lint` + `npm run test`。
- worktree 作业：开工第一步 `git merge feature/m9-widget-editor --no-edit`（带齐已合并波次代码）；`ui-antd` 下无 node_modules 时用 junction 复用主检出的依赖：`cmd //c "mklink /J node_modules <相对路径>\\ui-antd\\node_modules"`（路径按 worktree 实际深度调整）；**junction 只读复用——在该目录跑 `npm install` 会摘链重建为真实目录，依赖一律以主检出 canonical 安装为准，agent 禁止 npm install**；只有波 1 F 允许改 package.json/lock。
- 不装额外依赖；新依赖需求 = 停下上报。antd 组件动手前 `npx antd info <Component>`；颜色只走 antd token；HTTP 铁律（core/README.md）：只有 `core/http` 发请求；i18n 键 zh/en 对齐（check-locale 强制）。
- 关键 API 面（动手前以 node_modules d.ts 复核）：**Sucrase** `transform(code, {transforms:['typescript','jsx','imports'], jsxRuntime:'automatic', production:true, filePath})`，编译错对象含行号信息（P1 取证）；**prettier v3 standalone** `import * as prettier from 'prettier/standalone'` + plugins 按需（typescript/babel+estree → tsx，postcss → css，babel → json），全部懒加载 chunk；**react-resizable-panels** `PanelGroup/Panel/PanelResizeHandle`。
- 同页预览三个工程动机（§5.1）逐条有实现落点：编译前置同步抛错（compile 同步 throw）/ 双层样式命名空间（style-scope）/ hook 订阅独立生命周期（key 递增 remount）。

## 5. PoC 证据义务（回填本节）

> **V 波回填（2026-09-04）**：以下证据落点与 commit hash 已在主检出（feature/m9-widget-editor @ cf4ec1321f）逐一核实——文件在、标记在、commit 在 `git log`。

- **P1**（K，ADR 附录 A）：Sucrase 编译错/运行错行号与源码行号一致（含多行 JSX 用例）；不一致则评估 sourceMap 路线。**✅ 已落地**：`src/core/widget/compile.test.tsx`（commit **0759c9395c**）——「compileWidget — transform errors (P1, compile-time)」断言多行 JSX/TSX 源的语法错精确落在编辑器行/列（`error.line` 逐例断言）；「compileWidget — runtime errors (P1, sourceURL line mapping)」以 `//# sourceURL` + 校准 `lineOffset` 断言运行帧行号回映射；compile 元数据含 `lineOffset`。真机交叉印证：语法错行级标注落在同一编辑器行（v2-m9-browser-walkthrough §2 步骤 2）。无需 sourceMap 路线。
- **P2**（K）：require shim 传宿主 React 单实例 + antd 组件在编译产物内可用（`$$typeof` 同源断言）。**✅ 已落地**：同文件（0759c9395c）——「compileWidget — P2 require shim single instances」：宿主 React 单实例传递 + `$$typeof` 同源断言 + 「renders a multi-line JSX widget using host antd through widget-kit」真渲染用例；真机交叉印证：预览与仪表盘侧编译组件均以宿主 React 渲染（walkthrough §2 步骤 1/11）。
- **P9**（D）：TB Angular widget JSON 导入 → badge + 占位链路。**✅ 已落地**：`src/pages/widgets/editor/import-export.test.ts`（commit **f3bdb7d19d**）——「P9: an Angular widget JSON is ALLOWED (badge classification, never a reject)」契约；真机交叉印证：Angular 形状 JSON 导入 → 徽标「Angular（非 react-1）」+ 诚实占位文案 + 保存为服务器副本不拒收（walkthrough §2 步骤 8，截图取证）。
- **P10**（K/D）：CSS 前缀器对 @media/@keyframes 的正确性（K style-scope 单测）；includeResources 导出 round-trip（D import-export）。**✅ 已落地**：CSS 半 = `src/core/widget/style-scope.test.ts`（commit **a982d33b5d**，「scopeWidgetCss — @media / @supports (P10 half-item)」：@media 前导保留 + 内层选择器重作用域、嵌套 @supports、@keyframes 名空间）；round-trip 半 = `src/pages/widgets/editor/import-export.test.ts`（f3bdb7d19d，「import — react-1 fork JSON round trip (P10 half-item)」：`resources[]` 与未知未来键 VERBATIM 透传保留）。真机交叉印证：导出 blob 核对（字段剥离 + runtime/schemaVersion 标记）。
- 备注：P5 撤销属性测试已有 session.test 锚；P8 descriptor 预算随 512KB 警告测试顺手取证（**✅**：`contract/descriptor-budget.test.ts` 在，512KB 软警告单测锚定；真机 UI 无法自然触发，走查如实登记）。V 波门禁注记：合并分支 lint 红（locales 聚合器 format 2 errors + wave-3 D 文件 11 warnings）已登记 spec §5 D1，X 波修复。

## 修订记录

- 2026-09-04：**V 波验收交付**。§5 PoC 证据回填：P1/P2 = `compile.test.tsx`（0759c9395c）、P10 CSS = `style-scope.test.ts`（a982d33b5d）、P9/P10 round-trip = `import-export.test.ts`（f3bdb7d19d），文件/标记/commit 均在主检出核实；P8 = `contract/descriptor-budget.test.ts`。spec §5 勾账 19/21（2 行未勾均有单测锚 + 原因），§6 M9 触及面记录，新登记 D1（lint 门禁红，中）/D2（409 共享 intro 写死「仪表盘」，低）/O1（Angular 副本 fqn 原样落库，低/边界），已知行为②③④复核为设计行为；走查记录 `v2-m9-browser-walkthrough.md`（自建 3 类型 + 1 盘及 fixture 迭代盘全删，服务器复原）。门禁：tsc 绿、check-locale 绿、test 1656 例两轮 1654→1655（抖动判定成立）；lint 红 = D1 待 X 波。
- 2026-09-04：创建（M9 开工，三路侦察定稿现状盘点，四波作业计划 + 稳定入口纪律）。
- 2026-09-04：**波 1 F（地基）交付**。依赖版本实测登记：sucrase ^3.35.1、prettier ^3.9.6（v3 线）、react-resizable-panels ^4.12.3、@codemirror/lang-css ^6.3.1（lockfile 仅新增四包 + 传递依赖，无既有包变动）。侦察勘误两条（波 2/3 直接采信）：① **§1「GET /api/widgetType?fqn= 返回 WidgetTypeDetails」不实**——controller `WidgetTypeController.java:380` 与 openapi 生成层均证实返回基座 `WidgetType`（descriptor 在、image/description/tags/resources 不在）；details 只来自 `GET /api/widgetType/{id}`（`?includeResources=` 挂 resources）。② **fqn 双形态**——wire 实体的 `fqn` 是短名（无 scope 前缀），而 `GET /api/widgetType?fqn=` 要求全限定名（`tenant.xxx`/`system.xxx`，否则 BAD_REQUEST_PARAMS）；创建时 fqn 可省（后端从 name 生成并去重，`WidgetTypeDataValidator:55-69`），更新禁改。descriptor 精确键名定稿（ui-ngx `WidgetTypeDescriptor` + `WidgetControllerDescriptor`）：type/sizeX/sizeY/resources/templateHtml/templateCss/controllerScript/settingsForm/dataKeySettingsForm/latestDataKeySettingsForm/settingsDirective/dataKeySettingsDirective/latestDataKeySettingsDirective/hasBasicMode/basicModeDirective/defaultConfig/typeParameters/actionSources + fork 增量 runtime/schemaVersion/source；**actionSources 现存唯一键 `headerButton`**（`{name,value,multiple,hasShowCondition?}`，值对象开放）。transport 五函数：`getWidgetTypeByFullFqn`（改名避开 `services/tb/dashboard.ts:153` 既有 v1 探针 `getWidgetTypeByFqn`，resolver 升级时 K 波可考虑收编）/ `getWidgetTypeById` / `saveWidgetType` / `deleteWidgetType` / `getWidgetTypes`（endpoints 测试 5/5 锚定）。冻结契约 `core/widget/types.ts`：`WidgetEditorDraft`（widgetTypeId:Uuid|null、fqn 短名、name、source{tsx,css 空 string=无}、settingsForm:FormProperty[]、defaultConfig 恒 JSON 字符串、meta{type,sizeX,sizeY,typeParameters?,actionSources?}、version:number|null）+ `ReactWidgetDescriptor`（runtime/schemaVersion/source 三增量必填）+ `WIDGET_DESCRIPTOR_SCHEMA_VERSION=1` + `CustomWidgetProps` 封顶（data/latestData 复用 `types/tb/telemetry` 的 `SubscriptionData`；rpc 形状定为 `sendOneWay/sendTwoWay`；ctx.toast 带四档 severity，updateTimewindow 接收完整 Timewindow）。波 2/3 注意：`types/tb` 不 import UI 层，故 wire descriptor 的 settingsForm 是自由 `Array<Record<string,unknown>>`，core 层 draft 才收窄为 `FormProperty[]`（wire→draft 转换处断言一次）；biome 配置 ignore `**/src/services`，services 域门禁 = vitest + tsc。门禁：lint 绿（30 warnings 存量基线，我的文件零告警）、tsc 绿、check-locale 绿、全量 test 1440/1441（唯一失败 = master 存量 entry.test.tsx，M8 已登记，非本波回归）。commits：9fb26d8db1 / 5e72d4c3ae / 37b3585fb8 / 3f4daa4dd9 / 61ffb96a7d / e0ed5db1ce。
