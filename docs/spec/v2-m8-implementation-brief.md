# v2 M8 实施简报：规则链画布 + ruleChains 全域（团队共享契约）

> 依据：[v2-editors-acceptance.md](./v2-editors-acceptance.md) §4（验收载体，逐项勾选）+ [ADR 0004](../adr/0004-editor-suite.md) §1/§2/§3（画布/会话/规则链域路线，技术裁决已定稿不得重开）。
> 分支：`feature/m8-rulechain-canvas`。本简报是实施团队的作业契约；验收勾账回写 spec 本体。

## 0. 范围

- **做**：spec §4.1–§4.11 全部 checklist + §4.5 dry-run 统计脚本与报告 + §4.10 ruleChains 全域页面（列表/搜索/详情 tabs）+ P4 证据 + 新依赖登记安装。
- **不做**（防蔓延）：EDGE 类型链业务（列表恒 `type=CORE`；edge 分配/模板根/auto-assign 端点不接）；§7 登记增强不设验收义务——画布缩放平移按 ADR 默认实现（限域 0.5–2x），**边重连不实现**（RF `edgesReconnectable=false`，与 magnet 连线不冲突）、导入内存暂存不做（导入走文件直接解析，对齐 M7 `import-dashboard` 模式）、崩溃保护 sessionStorage 不做（M10）；widget 编辑器（M9）、SCADA 符号；后端零改动。

## 1. 现状盘点（三路侦察结论，agent 直接采信）

**ui-antd 底盘（M7 攒下，全部可复用）**：
- `core/editor/session.ts` `EditorSession<T>` 泛型现成：`enter/write(label,recipe,{coalesceKey})/undo/redo/checkpoint/save/subscribe`，coalesce 窗 1s，4MB patch 预算；`use-editor-session.ts` React 适配。规则链直接 `EditorSession<CanvasRuleChain>`（自建模，见 §2）。**保存 = 检查点清栈**（session 头注释已记录此不对称是设计选择）。
- `components/form-property/` 全套现成：`FormPropertyForm({properties,value,onChange,uiHints?,customComponents?,jsonFallbackEnabled})` 全受控零 antd Form 实例；`ui-hints.ts`（`UiHint{label,widget,customComponent,enumOptions,group,order,jsonSource,rows,...}`）；`registry.ts` **自定义注册表当前为空**（`registerCustomComponent/getCustomComponent`），注释点名 M8 规则链 P0 集；每字段 JSON 源码模式兜底已内置。
- `components/code-editor/` 仅 `language='json'`；头注释预留 `LANGUAGE_EXTENSIONS` map 扩 JS/TBEL，API 不变。
- `pages/dashboards/editor/` house style：右键菜单 antd Dropdown contextMenu、`useHotkeys` + `isTypingTarget` 守卫（shell.tsx:95）、DialogHost（`EditorDialogProps{open,payload,onClose}` + lazy map 单槽）、clipboard 模块级单例、`contract/`（save-with-conflict 的 409 三选项 / use-leave-guard / use-editor-entry-checkpoint / ConflictDialog）、`panels/WidgetConfigPanel` checkpoint+rollback 范式、`undo-safe-value`。
- 空白需新建：`services/tb/rule-chain.ts`、`types/tb/rule-chain.ts`（手写层）、`core/rulechain/`、`pages/rule-chains/`、routes、locale 域文件。openapi 生成层（`types/tb/openapi/index.ts`）端点/参数/schema 已全量可照抄；生成字段多 `readonly`，手写按 `types/tb/dashboard.ts` 风格（BaseData/HasVersion/EntityIdOf 组合）。
- **@xyflow/react 未装**；dompurify / react-markdown / rehype-sanitize 也未装（help/便签需要）。波 1 F 是唯一允许碰 package.json 的角色。

**ui-ngx 对照（行为等价锚点；目录 `ui-ngx/src/app/modules/home/pages/rulechain/`）**：
- 画布 = 自维护 fork ngx-flowchart（无 zoom/pan）；v2 按 ADR 换 @xyflow/react v12，语义对齐不抄实现。节点 170×50；本地 id `rule-chain-node-{n}` 与真实 `ruleNodeId` 分离；**INPUT 虚拟节点**（只读、仅右连接桩）表达 `firstNodeIndex`。
- **边聚合多对一**：画布一条边 `{source,destination,labels[],label=labels.join(' / ')}` ↔ 后端 `connections` 每 label 一条 `{fromIndex,toIndex,type}`。转换逻辑必须抽成 core 纯函数（ui-ngx 在 page/ctrl+r 两处各抄一份是反面教材）。
- 操作清单（§4.1–4.4 等价来源）：库→画布 HTML5 DnD→**弹添加对话框**（宿主完整配置表单）→落格；dragStop 提交；框选/ctrl 多选/ctrl+a 全选/esc 取消；magnet 连线（右桩→左桩）；INPUT 节点**唯一出边**（新建替换旧边）；label 编辑/删除 hover 小圆钮；ctrl+c/v 粘贴（id 重生、一组）；ctrl+r 嵌套链（子图导出：跨子图出边转 `TbRuleChainOutputNode`、入边接新建 `TbRuleChainInputNode`，校验=多选中无入边且 inEnabled 的 ≤1）；右键菜单四类（空白：复制选中/粘贴/添加便签/取消全选|建嵌套链+删除选中/全选/应用更改/放弃更改；节点：详情/复制/删除（INPUT 无菜单）；边：详情（INPUT 源除外）/删除；便签：编辑/复制/删除）；便签 alt+n（默认 200×120，markdown+自定义 CSS 命名空间化，8 向 resize）。
- 保存（`saveRuleChain()` L1651-1742）：跳过 INPUT 节点；`firstNodeIndex`=INPUT 出边目标在 nodes 的 index；layoutX/Y=`Math.round`；新节点 id 缺省（前端不生成 UUID——后端对带 id 但不在 DB 的节点**静默丢弃**）；409=version 乐观锁（`BaseRuleChainService` 仅 version 非 null 且 ≠DB 时抛 `EntityVersionMismatchException` → `VERSION_CONFLICT` code 35）。
- 导入旧格式迁移（`import-export.service.ts` L685-734）：① 节点 `debugMode:true` → 追加 `debugSettings{failuresEnabled:true,allEnabled:true}`；② `metadata.ruleChainConnections[]` → 每条追加一个 `TbRuleChainInputNode` 节点（configuration.ruleChainId=targetRuleChainId）+ 对应 connection。导出剥离 id/tenantId 等对齐 TB。
- 节点配置旧机制 = directive→Angular 组件注册表（**v2 弃用**，走 FormProperty 生成器+uiHints+定制注册表，见 §2）。表单目录 `components/rule-node/{action,external,filter,enrichment,transformation,flow}/`（selector `tb-{category}-node-{name}-config`）是 uiHints 映射的行为参照。
- 脚本：configuration 三件套 `scriptLang/jsScript/tbelScript`（log、filter script、switch、transform、generator 5 节点 + create/clear alarm 的 `alarmDetailsBuildJs/Tbel`）；TBEL 可用性 `GET /api/ruleChain/tbelEnabled`；testScript 面板默认 payload `msg={temperature:22.4,humidity:78}`、`metadata={deviceName:'Test Device',deviceType:'default',ts}`、`msgType=POST_TELEMETRY_REQUEST`；`GET /api/ruleNode/{ruleNodeId}/debugIn` 取最近输入预填。
- i18n 旧键空间 `rulechain.*`(71)/`rulenode.*`(74)（`ui-ngx/src/assets/locale/locale.constant-<lang>.json`）为文案等价参照。

**后端契约（全部 `@PreAuthorize("hasAuthority('TENANT_ADMIN')")`；控制器 `application/.../controller/RuleChainController.java`）**：
- 端点：`GET /api/ruleChains`（分页 `pageSize,page,type=CORE,textSearch,sortProperty(createdTime|name|root),sortOrder`）；`GET /api/ruleChain/{id}`；`POST /api/ruleChain`（upsert，带 id 更新/不带新建，tenantId 强制覆写）；`DELETE /api/ruleChain/{id}`（根链与被引用链删除报错）；`GET /api/ruleChain/{id}/metadata`；`POST /api/ruleChain/metadata?updateRelated=`（返回保存后 metadata 含新 version）；`GET /api/ruleNode/{id}/debugIn`；`GET /api/ruleChain/tbelEnabled`；`POST /api/ruleChain/testScript?scriptLang=JS|TBEL`（body `{script,scriptType:update|generate|filter|switch|json|string,argNames[],msg,metadata,msgType}` → `{output,error}`）；事件 `POST /api/events/{entityType}/{entityId}?tenantId=&...`（body 多态 EventFilter 判别 `eventType:DEBUG_RULE_NODE`，过滤字段 `msgDirectionType/isError/errorStr/msgId/msgType/relationType/dataSearch/metadataSearch/server`）+ `POST .../clear` + `GET /api/ruleNode/{id}/debugIn`。
- 实体形状：`RuleChain{id,createdTime,tenantId,name,type:CORE|EDGE,firstRuleNodeId,root,version,additionalInfo}`；`RuleChainMetaData{ruleChainId,version,firstNodeIndex,nodes[],connections[],ruleChainConnections[],notes[]}`；`RuleNode{id,createdTime,ruleChainId,type(全类名),name,debugSettings{failuresEnabled,allEnabled,allEnabledUntil},singletonMode,queueName,configurationVersion,configuration(JsonNode),externalId,additionalInfo{layoutX,layoutY,description}}`（节点无 version，乐观锁在链级 metadata）；`RuleChainNote{id,x,y,width,height,content,backgroundColor,borderColor,borderWidth,applyDefaultMarkdownStyle,markdownCss}`（**fork 已加 notes 持久化**）。连接类型常量：`Success/Failure/ACK/True/False/Other/To Root Rule Chain`。

**节点全量（dry-run 判据基础；枚举源 = `rule-engine/rule-engine-components/src/main/java/org/thingsboard/rule/engine/**/*.java` 的 `@RuleNode` 注解 + `GET /api/components?componentTypes=...&ruleChainType=CORE`）**：
- 77 类 / **CORE 可见 76**（`TbMsgPushToCloudNode` EDGE-only 不入面）；分组 ACTION 27 / EXTERNAL 14 / FILTER 12 / ENRICHMENT 11 / TRANSFORMATION 9 / FLOW 4（与 UI 六类分组一致）。@Deprecated 3 个（device profile / synchronization start / end）+ delay 名带 deprecated（人工抽查避开这 4 个，dry-run 照扫）。
- **12 个 EmptyNodeConfiguration**（表单仅 version 字段）：copy to view、asset/device profile switch、message type switch、entity type switch、acknowledge、checkpoint、output、split array msg、calculated fields、sync start/end——默认配置 JSON 实际为 `{}` 或仅默认值，渲染零控件为**合法形态**（判据①以「configuration 可表达」为准，见 §2 dry-run）。
- 脚本族（P0 定制）：log / script(filter) / switch / transform / generator + create/clear alarm details。配置类复用组：Empty(12)、`TbGetEntityDataNodeConfiguration`(customer/tenant attributes)、`TbMqttNodeConfiguration`(azure iot hub 继承)。
- `GET /api/components` 返回 `RuleNodeComponentDescriptor{type(clazz),name,scope,configurationDescriptor{nodeDefinition{details,description,inEnabled,outEnabled,relationTypes,customRelations,defaultConfiguration,configDirective,hasQueueName},configurationVersion},...}`——defaultConfiguration 值树即表单生成器输入。

## 2. 架构落位（ADR 0004 固化 + 本段细化）

```
src/core/rulechain/
  types.ts             手写 wire 类型补充（RuleChain/RuleChainMetaData/RuleNode/Note/组件描述符）
  model.ts             元数据规范化 + CanvasRuleChain ↔ RuleChainMetaData 双向转换纯函数
                       （聚合边↔connections 多对一、INPUT 虚拟节点↔firstNodeIndex、layout Math.round、
                        新节点 uid='local-{n}' 提交时剥 id）+ 旧格式迁移两处
  rule-chain-draft.ts  事务配方集（照抄 dashboard-draft.ts 范式：结构化 clone 入 immer）
  form-properties.ts   defaultConfiguration 值树 → FormProperty[] 生成器（值形状推断 + uiHints 补全）
  ui-hints.ts          76 节点 uiHints 静态映射（key = clazz + 字段路径）
src/services/tb/rule-chain.ts        全套 transport（列表/get/save/metadata/tbelEnabled/debugIn/testScript/components）
src/components/code-editor/          扩 'javascript' | 'tbel' 语言（json 已有）
src/components/script/               ScriptEditor（JS/TBEL 切换 + CodeEditor + argNames）+ ScriptTestPanel（共享组件）
src/components/rule-node/            NodeConfigForm（FormPropertyForm 包装）+ 定制组件注册表（P0 五族）
src/pages/rule-chains/
  list.tsx             列表页（/ruleChains）
  editor/              编辑器自含子树（路由 /ruleChains/:ruleChainId = 画布页，对齐 ui-ngx 无只读态）
    index.tsx          加载链+metadata → EditorSession enter → shell
    shell.tsx          工具栏（保存/撤销/重做/搜索/便签/退出）+ 画布 + 节点库抽屉 + 详情抽屉槽位 + DialogHost
    canvas/            @xyflow/react 半受控画布（nodeTypes/edgeTypes 组件外定义）
    node-library/      六类分组 + 搜索 + HTML5 DnD（搜索与画布高亮共用 state）
    details/           节点详情抽屉（details/events/help 三 tab）
    dialogs/           host + 添加节点/边 label/便签编辑/嵌套链命名 对话框群
    contract/          保存检查点 + 409 三选项 + 离开确认 + 导入导出适配
    clipboard.ts       内存剪贴板单例
  details-dialog/      规则链实体详情对话框（attributes/alarms/events/relations/audit-logs tabs）
routes.ts              /ruleChains（canTenantAdmin）+ /ruleChains/:ruleChainId（hideInMenu）
```

**核心契约**：
- **CanvasRuleChain 草稿形状**（F 波定稿后冻结）：`{nodes: Record<uid,CanvasNode>, edges: CanvasEdge[], notes: CanvasNote[], inputTargetUid: string|null, chain: RuleChain 元数据快照}`；`CanvasNode{uid,ruleNodeId?,clazz,name,x,y,configuration,debugSettings,singletonMode,queueName,description}`；`CanvasEdge{id,sourceUid,targetUid,labels[],additionalInfo}`。转换纯函数带 round-trip 单测。
- **半受控边界**（ADR §1）：拖拽/连线/框选中间态由 RF 内部持有不回写 draft；`onNodeDragStop`/`onConnect`/`onSelectionChange`（落定）一次性 `session.write` 一个事务组；undo/redo/粘贴/导入的外部变更经受控 props 回灌。`nodeTypes`/`edgeTypes` 模块级常量。
- **检查点语义**：`save()` 成功后 `session.enter(规范化(服务器返回))` 清栈，UI 明示「保存后撤销历史已清空」（toast/提示条，行为契约）。
- **409 三选项 / 离开确认**：复用 `core/editor/contract/` 泛型件（F 波上提，dashboards 编辑器改 re-export shim，测试保绿）。
- **配置表单链路**：组件描述符 `defaultConfiguration`（值树）→ `form-properties.ts` 生成 FormProperty[] → `FormPropertyForm`（uiHints 补 label/枚举/分组，registry 接管 P0 复杂控件，每字段 JSON 源码兜底）。节点级字段（name/debugSettings/singletonMode/queueName/description）在 details 抽屉头部独立编辑，不入 configuration。
- **dry-run 统计口径**（spec §4.5 定稿照抄）：76 节点逐个经 NodeConfigForm 渲染；判据①表单非空 =「控件 ≥1 或 configuration 可完整表达（12 个 Empty 节点按合法空形态计）」；②无崩溃；③三态归类（控件级/JSON 兜底/不可编辑——「不可编辑」对标 ui-ngx `directive-is-not-loaded` 失败态，出现即红）；双指标：可编辑率 100% 硬门槛、控件级 ≥85% 登记项。人工抽查 6 类×2–3 做判据④ round-trip（避开 4 个 deprecated）。

## 3. 波次与文件所有权

| 波 | Agent | 交付 | 文件所有权（硬边界） |
|---|---|---|---|
| 1 | F 地基 | 装依赖（@xyflow/react 12.x / dompurify / react-markdown / rehype-sanitize / @codemirror/lang-javascript 6，唯一可碰 package.json）+ `types/tb/rule-chain.ts` + `core/rulechain/{types,model,rule-chain-draft}.ts`（转换 round-trip TDD）+ `services/tb/rule-chain.ts` + contract 泛型件上提 `core/editor/contract/`（dashboards 改 re-export shim，既有测试全绿）+ locale `editor-rulechain.ts` 种子 | `ui-antd/package.json`+lock、`src/types/tb/{rule-chain.ts,index.ts}`、`src/core/rulechain/{types,model,rule-chain-draft}.ts`、`src/services/tb/{rule-chain.ts,index.ts}`、`src/core/editor/contract/**`、`src/pages/dashboards/editor/contract/*`（仅 shim 化）、`src/locales/{zh-CN,en-US}/editor-rulechain.ts` + 聚合器一行 |
| 1 | S 脚本基建 | CodeEditor 扩 JS/TBEL + CM TBEL 扩展（StreamLanguage 高亮 + CompletionSource，语义从 `ui-ngx/src/app/shared/models/ace/tbel/mode-tbel.js` 移植）+ `ScriptEditor`（JS/TBEL 切换、tbelEnabled 禁用态）+ `ScriptTestPanel`（payload/output/error 四区，默认 payload 按 §1；**测试执行走 `onRun(params): Promise<{output,error}>` 注入 prop**——transport 归 F，D 波接线真实 service，S 的测试 mock 注入） | `src/components/code-editor/**`、`src/components/script/**`、`src/locales/{zh-CN,en-US}/editor-script.ts` + 聚合器一行 |
| 2 | C 画布 | 路由 + shell + xyflow 半受控画布（INPUT 虚拟节点/聚合边/label 小圆钮/框选/热键/右键菜单四类/便签 markdown/复制粘贴/自动扩张/缩放 0.5–2）+ 节点库（六类分组+搜索+DnD→添加对话框）+ `clipboard.ts` + dialogs 骨架（添加节点对话框=真实现含表单槽位）+ **P4 证据** | `src/pages/rule-chains/editor/**`（details/ 与 contract/ 除外，交付**占位组件**冻结路径与 props）、`src/pages/rule-chains/index.ts`、routes.ts 规则链行、`src/locales/{zh-CN,en-US}/editor-rulechain-canvas.ts` + 聚合器一行 |
| 2 | K 表单域 | `form-properties.ts` 生成器 + `ui-hints.ts`（P0 集与脚本族先覆盖）+ `components/rule-node/` NodeConfigForm + 定制注册表 P0 五族（script→ScriptEditor / switch / 键操作 copy-delete-rename / save timeseries+attributes / create+clear alarm） | `src/core/rulechain/{form-properties,ui-hints}.ts`、`src/components/rule-node/**`、`src/locales/{zh-CN,en-US}/rule-node.ts` + 聚合器一行 |
| 3 | K2 节点详情 | ui-hints 76 节点全量补全 + 注册表补漏（dry-run 初版报告驱动）+ details 抽屉真实现（details 表单 + help DOMPurify 消毒渲染 + docUrl 外链）+ 添加节点对话框表单接线 | `src/pages/rule-chains/editor/details/**`、`src/core/rulechain/ui-hints.ts`、`src/components/rule-node/**` 增量 |
| 3 | D 契约+页面 | contract/（保存=链+metadata 双段、检查点明示、409 三选项、离开确认、导入含旧格式迁移/导出剥离）+ events 表（节点 events tab + 链级 DEBUG_RULE_CHAIN，POST filter/clear/test-with-this-message→debugIn 预填）+ testScript 两入口接线 + `list.tsx` 列表页（搜索/root/新建/删除/导入导出）+ 实体详情对话框（attributes/alarms/events/relations/audit-logs 复用既有 tab 基建）+ routes list 行 | `src/pages/rule-chains/{list.tsx,details-dialog/**,editor/contract/**,editor/events/**}`、`pages/rule-chains/editor/details/` 的 **events tab 槽位文件**、`pages/rule-chains/editor/dialogs/` 的 D 名单文件、routes.ts list 行、`src/locales/{zh-CN,en-US}/editor-rulechain-page.ts` + 聚合器一行 |
| 3 | R dry-run | dry-run 脚本（枚举 76 节点→NodeConfigForm 渲染→断言①②③+三态归类）+ 初版统计报告（节点×判据矩阵+三态计数+降级清单）落 `docs/spec/v2-m8-dry-run-report.md` | `ui-antd/src/components/rule-node/rule-node-dry-run.test.tsx`、`docs/spec/v2-m8-dry-run-report.md`（只读 src 其余部分） |
| 4 | V 验收 | 全门禁 + dry-run 终版复跑 + 真机走查（browseros）+ spec §4 勾账 + P4 回填简报 §5 | spec/简报/报告文档，不碰 src |

**稳定入口纪律**：F 交付后 `CanvasRuleChain` 形状与 draft 配方签名冻结；C 交付后 `details/` 占位组件与 `dialogs/host.tsx` 路径+props 冻结；K 交付后 NodeConfigForm props 与 registry id 常量冻结。波 3 各自填实现不改共享文件；locale 各自独立文件 + 聚合器一行 import，合并冲突我收口。

## 4. 门禁与作业纪律

- 每个逻辑单元一 commit（限额中断可恢复，接续 agent 从分支状态接管）；Conventional Commits（英文）。
- 提交前自跑：`npx vitest run <自己范围的测试>` + `npm run tsc` + `npx biome check <自己文件>`；波次收尾跑全量 `npm run lint` + `npm run test`。
- worktree 作业：开工第一步 `git merge master --no-edit`（origin/master 落后于本地是预期，必须带齐 M7 代码）；`ui-antd` 下无 node_modules 时用 junction 复用主检出的依赖：`cmd //c "mklink /J node_modules ..\\..\\..\\ui-antd\\node_modules"`（路径按 worktree 实际深度调整）；只有 F 允许改 package.json/lock。
- 不装额外依赖；新依赖需求 = 停下上报。antd 组件动手前 `npx antd info <Component>`；颜色只走 antd token；HTTP 铁律（core/README.md）：只有 `core/http` 发请求；i18n 键 zh/en 对齐（check-locale 强制）。
- @xyflow/react v12 关键 API 面（C 采信，动手前以 node_modules d.ts 复核）：`<ReactFlow nodes edges onNodesChange={null 保持半受控} nodeTypes edgeTypes fitView={false} defaultViewport={{x:0,y:0,zoom:1}} minZoom={0.5} maxZoom={2} translateExtent>`；框选 `panOnDrag={[1,2]}` + `selectionOnDrag` 或 shift 框选；连线 `onConnect` + `isValidConnection`（右→左、INPUT 唯一出边）。

## 5. PoC 证据义务（回填本节）

- **P4**（C，ADR 附录 A）：React Flow 半受控 + dragStop 事务提交 + undo 后受控回灌端到端；500 节点场景按诚实证据原则交重渲染拓扑（参照 P7 先例：happy-dom 无 fps 管线，交 memo/dragStop 粒度证据 + 引擎层断言），回归测试留存。

## 修订记录

- 2026-09-04：创建（M8 开工，三路侦察定稿现状盘点，四波作业计划 + 稳定入口纪律）。
