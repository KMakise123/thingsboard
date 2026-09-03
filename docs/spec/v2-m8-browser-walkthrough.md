# v2 M8 真机验收走查记录（规则链画布 + ruleChains 全域，spec §4）

> 执行：V 波验收代理，2026-09-04。环境：后端 `http://localhost:8080`（本地 dev tenant，本机常驻），前端 dev server `http://localhost:8000`（`ui-antd/dev-server-v4.log`，utoo pack），browseros MCP 真机浏览器（租户管理员 `tenant@thingsboard.org` / `tenant`）。
> 取证方式：browseros 内联截图 + AX 快照 + 页面 DOM/network 探针（fetch 钩子抓 `POST /api/ruleChain/testScript`、`POST /api/events/...`、`.../clear` 请求体）；服务端真相用 `curl` 直查 API 复核（metadata/connections/迁移产物）。二进制不入 git。
> 数据保全：走查自建 4 条链（M8 Walkthrough Chain / M8 WT Wired / M8 WT Legacy / M8 WT Nested），走查结束后已全部 DELETE（200），最终列表仅剩既有 Root Rule Chain（root）与 Thermostat，零改动。既有链未做任何编辑；事件清空仅对自建链节点执行。

## 0. 总览

| 走查项 | 结果 |
|---|---|
| 1 列表页（/ruleChains 搜索/排序/新建/行操作/根链禁删禁设根） | ✅ |
| 2 节点库（六类分组/搜索） | ✅（12/11/9/26/14/4=76） |
| 3 节点拖入→添加节点对话框（含脚本族表单） | ✅ |
| 4 脚本 Test 试算面板（POST testScript→输出） | ✅ |
| 5 magnet 连线手势（handle 拖拽连线） | ⛔ 环境受阻（E1；事务语义单测锚定） |
| 6 撤销/重做/快捷键（ctrl+z/y/a/esc/Del/alt+n/ctrl+r/ctrl+c/v） | ✅ |
| 7 右键菜单四类（pane/节点/边/便签） | ✅（边菜单未单独目击——入口代码+菜单体同源，登记 D3 注） |
| 8 便签（alt+n/markdown 渲染/编辑/删除） | ✅（拖动为单测锚） |
| 9 节点详情抽屉三 tab（details/events/help） | ✅ |
| 10 保存契约（检查点明示/ctrl+z 无效/再改可撤/离开确认/刷新持久化） | ✅ |
| 11 导入导出（契约预览/旧格式迁移两处/导出剥离） | ✅ |
| 12 嵌套链 ctrl+r（子链 Output/父链 Input 替换） | ✅ |
| 13 事件表（filter 字段/clear/刷新） | ✅（有数据表与 debugIn 预填本地无数据，未复现） |
| 14 ruleChains 实体详情对话框（五 tab） | ✅ |
| 15 409 三选项 | ☐ 未复现（单机无并发冲突，M7 同款处理） |

## 1. 分步记录

### 步骤 1 — 列表页 ✅
`/ruleChains` 列表：列（创建时间/名称/根链）+ 行操作（打开/more）+ 顶部（搜索/刷新/导入/新建）。搜索 `root` → URL `?textSearch=root` 仅剩 Root Rule Chain；名称列排序 → API `sortProperty=name&sortOrder=ASC`，再点切 DESC，行序随动。新建对话框（名称必填/说明）→ 「M8 Walkthrough Chain」创建成功、列表刷新出现。
行 more 菜单：Root Rule Chain = 详情/**设为根链(禁用)**/编辑/导出规则链/**删除(禁用)**（根链禁删禁设根 ✅）；Thermostat = 全项可用（对照组）。
**D1（缺陷）**：创建成功 toast 显示「规则链 {name} 已创建。」——`{name}` 为字面量。根因：`editor-rulechain-page.ts` 的 `ruleChains.list.toastCreated`/`toastImported` 用 ICU 直引号 `'{name}'`（直引号是 MessageFormat 转义符，占位符变字面文本）；list.tsx 确已传 `{ name }` 值。同文件 `deleteTitle` 同款写法，同病。

### 步骤 2 — 节点库 ✅
工具栏 book 图标开「节点库」抽屉：六组 collapse（过滤 12 / 数据补充 11 / 转换 9 / 操作 26 / 外部 14 / 流程 4 = **76**，与 dry-run 口径一致）。搜索「log」→ 操作 1、其余组「暂无数据」，清除恢复。

### 步骤 3 — 节点拖入 → 添加节点对话框 ✅
HTML5 DnD（合成 dragstart/dragover/drop，mime `application/x-rule-node-clazz`）把 `log` 拖入画布 → 弹「添加规则节点」对话框：标题+描述透传英文（Log incoming messages using JS script…）、名称预填 `log`、**JavaScript/TBEL segmented + CodeMirror 高亮编辑器**（默认脚本预填）、测试按钮、取消/确定。确定 → 节点落格（uid `local-0`），**INPUT 虚拟节点**同步出现（锚定首节点左侧 240px），undo 转可用（一事务组）。
行为差异（记录，非缺陷）：空链（0 节点）画布不渲染 INPUT，拖入首个节点后 INPUT 出现并锚定其左；ui-ngx 是常驻 INPUT。流程可达（先落点再连线），语义等价。

### 步骤 4 — 脚本 Test 试算面板 ✅
「测试转为字符串函数」→ 独立测试模态：消息类型 `POST_TELEMETRY_REQUEST`、消息 `{"temperature":22.4,"humidity":78}`、元数据 `{"deviceName":"Test Device","deviceType":"default"}`（默认 payload 与简报 §1 一致）、脚本区、运行按钮。运行 → `POST /api/ruleChain/testScript` **200（51ms）**，输出区渲染 `Incoming message: {…} / Incoming metadata: {…}`（log 函数真实回显）。

### 步骤 5 — magnet 连线手势 ⛔（环境受阻，E1）
INPUT 右桩 → 节点左桩的 handle 拖拽连线无法在本自动化环境驱动：① CDP `Input.dispatchMouseEvent` 经 browseros 工具通道不可用；② `act drag` 只发无按键 move；③ 合成鼠标/指针事件可选中节点（React 委派正常）但 RF v12 连线状态机（XYHandle + handleBounds 测量）在合成事件下不启动，直接调用 Handle 处理器也无法证伪产品行为。
事务语义由单测锚定：`interactions.test.ts`（`setInputTarget` 唯一出边替换/`setInputTarget(null)` 删除 INPUT 边、INPUT 不可拖动）、`rule-chain-draft.test.ts`（setInputTarget 替换/清除/ghost 拒绝）。**留观建议**：人工 3 秒真实鼠标连线目检一次。

### 步骤 6 — 撤销/重做/快捷键 ✅
- 添加节点/粘贴/删除/详情改名各为一个 undo 组：粘贴 4→5，**一次 ctrl+z 整组抹掉** 5→4；Del 删除 4→3，ctrl+z 复原 4→3→4；详情改名 → ctrl+z 还原（redo 转可用）。
- ctrl+a 全选 4 元素（3 节点+便签），esc 全部取消。
- alt+n 弹「添加便签」。
- ctrl+r 嵌套链见步骤 12。

### 步骤 7 — 右键菜单四类 ✅
- **pane 菜单**九项：复制所选(禁)/粘贴(禁)/添加便签/取消全选(禁)/创建嵌套规则链(禁)/删除所选(禁)/全选/应用更改/放弃更改——空选与空剪贴板的禁用态正确。
- **节点菜单**：详情/复制/删除；INPUT 节点无菜单（代码层短路）。
- **便签菜单**：编辑便签/复制/删除。
- **边菜单**：入口（onEdgeContextMenu→详情/删除）与 pane/节点菜单同源（canvas/context-menu.tsx 单槽），真机未单独目击（自动化限制）。

### 步骤 8 — 便签 ✅
alt+n → 对话框（Markdown/HTML 内容 textarea + 样式项）→ 确定落格：`# 标题/加粗/code/列表` 渲染为 h1/strong/code/li 元素（react-markdown + rehype-sanitize），无裸标记。编辑 → 改为 `> quote` → blockquote 重渲染 ✓。删除 ✓。拖动/8 向 resize：真机未驱动——`interactions.test.ts`（moveNote 每便签一组）+ `note-css.test.ts` 锚定。

### 步骤 9 — 节点详情抽屉三 tab ✅
右键节点→详情：「规则节点详情」抽屉，三 tab **详情/事件/帮助**。
- 详情（log 节点）：名称、调试失败消息（开=debugSettings.failuresEnabled 迁移值 ✓）、调试全部消息、节点描述（walkthrough log node ✓）、JS/TBEL 切换 + CodeMirror（导入脚本原值）、Test 按钮、取消/应用。
- **表单编辑实时上画布**：名称改 `wt-log-LIVE`，画布节点文本即时同步（未点应用）。
- **取消零残留**：点取消 → 画布回 `wt-log`、抽屉关。疑点 S1 见 §2（取消后 undo 按钮态）。
- **应用持久**：改名 → 应用 → 画布保持、保存按钮转可用（dirty）。
- 抽查覆盖：ACTION-脚本族（log，JS/TBEL/Test 面板）+ FILTER（message type filter，消息类型多值字段回显导入值）。其余 4 类由 dry-run 94 用例（76 节点全渲染）+ 判据④ 12 类 round-trip 单测锚定。
- **帮助 tab**：descriptor 详情透传英文不翻译 ✓、`查看文档` 外链 `https://thingsboard.io/docs/.../log/`（target=_blank）✓、DOMPurify 消毒管道（单测锚）。
- **事件 tab**：方向(IN/OUT)/错误过滤 + 过滤/重置/刷新/清空事件；表列（时间/服务器/方向/消息类型/关系类型/数据/元数据/错误）；自建链节点空态「暂无事件」。`POST /api/events/RULE_NODE/{id}?tenantId=…` body `{"eventType":"DEBUG_RULE_NODE"}` → 选 OUT 后过滤 body `{"eventType":"DEBUG_RULE_NODE","msgDirectionType":"OUT"}`（fetch 钩子实抓）✓；清空事件（自建链）→ `POST …/clear` 同 filter body + 自动刷新 ✓。

### 步骤 10 — 保存契约 ✅
保存（含改名后的草稿）→ toast「**保存成功，撤销历史已清空**」（检查点明示 ✓）→ **ctrl+z 无反应**、undo/redo 均禁用（栈已清）✓ → 再改详情名 → ctrl+z 撤销成功、redo 可用 ✓ → 带脏草稿点「退出」→ 弹「有未保存的更改/取 消/放弃更改」，取消留场、放弃回列表（两路闭环）✓ → 刷新页面：节点/边/INPUT/配置全部从服务器还原（API 复核 metadata 一致）✓。硬导航（整页刷新/外链）时 beforeunload 原生确认亦触发（两次实证）。
**409 三选项未复现**：单机无并发写者，不构造版本冲突（M7 同款处理）；契约由 `save-rule-chain.test.ts`（Option A/B/重试上限/拒绝盲写）+ `save-with-conflict.test.ts` 锚定。

### 步骤 11 — 导入导出 ✅
- **导入（现代格式）**：列表「导入规则链」→ 文件解析后预览契约明示：「将按以下内容新建规则链（**不携带原 id/租户/根链标记**）：名称/节点数 4/连接数 4/便签数 0」+「已按旧格式迁移：debugMode 节点 → debugSettings（2 个）」→ 导入并打开 → 编辑器呈现 4 节点 + INPUT + 4 边（含 filter→switch 的 **「False / True」多 label 聚合边**）。API 复核：节点 id 均为后端新铸、`debugSettings{failuresEnabled:true}` 迁移落库、connections 原样、`ruleChainConnections` 无残留。
- **导入（旧格式迁移）**：构造带 `ruleChainConnections`（指向自建链 id）+ `debugMode` + 旧 id/tenantId/version 的样本 → 预览双迁移提示（debugSettings 1 个 + **跨链连接迁移为 Rule Chain Input 节点 1 条**）→ 导入后画布出现 `Rule Chain Input / TbRuleChainInputNode`；API 复核其 `configuration.ruleChainId` = 目标链 id、连接 `1→2 True` 生成、firstNodeIndex=0、旧 id/tenantId/version 全剥离。
- **导出**：行 more→导出规则链 → blob 捕获 3177B：顶层 `{ruleChain, metadata}`，ruleChain 键集 `name,type,firstRuleNodeId,root,debugMode,configuration,additionalInfo`——**无 id/tenantId/version**（剥离对齐 TB）✓。

### 步骤 12 — 嵌套链 ctrl+r ✅
选中子图节点（1 个入口）→ ctrl+r → 「创建嵌套规则链/将选中的 1 个节点导出为新规则链」对话框 → 命名确定 → **画布替换为 `M8 WT Nested / TbRuleChainInputNode`**。API 复核：新子链含 `TbJsFilterNode → TbRuleChainOutputNode`（跨子图出边转 Output ✓，connection True，firstNodeIndex=0）；父链保存后该子图位置为 TbRuleChainInputNode。校验语义（多入口拒绝/空选拒绝/inEnabled 门）由 `nested-chain.test.ts` 锚定。

### 步骤 13 — ruleChains 实体详情对话框 ✅
列表 more→详情：「规则链详情」五 tab **属性/告警/事件/关联/审计日志**（属性 tab：搜索键/实时更新 toggle/新建属性/键值表）。§4.10 含 events tab ✓。

### 步骤 14 — 收尾与数据保全
自建 4 链经 API 全部 DELETE（200）；终态列表 = Root Rule Chain(root) + Thermostat，与走查前一致。访问已删除链的编辑器 URL 正确显示加载错误告警（无崩溃）。

## 2. 发现的缺陷、缺口与疑点（勾账已同步登记 spec §4）

| # | 级别 | 描述 | 状态 |
|---|---|---|---|
| D1 | 低 | `ruleChains.list.toastCreated`/`toastImported`（及同文件 `deleteTitle` 同款）ICU 直引号 `'{name}'` 转义占位符，toast 显示裸 `{name}`（截图与代码双证）。修复：直引号改中文引号或去掉（对齐 assets 域 `“{name}”` 写法），zh/en 同改 | 未修，登记 §4.10 缺口行 |
| D2 | 低 | 节点**双击**不打开详情抽屉（ui-ngx `fcEventNodeDblClick` parity 缺口）；v2 仅右键菜单→详情 | 未修，登记 §4.4 缺口行 |
| D3 | 低 | 边 label 编辑对话框（dialogs/link-labels.tsx）无专项单测，且真机 hover 小圆钮/边右键菜单未驱动（E1 同因）——三态记「未验」，建议 X 波补测 + 人工目检 | 未修，登记 §4.1 缺口行 |
| E1 | 环境 | magnet 连线手势不可自动化：CDP Input 域工具通道不可用、act drag 无按键事件、RF v12 连线状态机对合成事件不启动（详见步骤 5）。事务语义单测全覆盖 | 环境阻碍，登记 §4.1 未勾行原因 |
| S1 | 疑似 | 详情抽屉「取消」回滚值正确，但取消后 undo 按钮仍可用（栈态未回退到抽屉进入点）——无用户可见错误，持续观察 | 疑似待观察 |
| 未复现 | — | 409 三选项（单机无并发）；有数据事件表与「test with this message」debugIn 预填（本地无 debug 流量，Root 链不可动） | 如实登记 |

## 3. 门禁数字（全量，2026-09-04）

- `npm run lint`（biome + check-locale + tsc）：**绿（exit 0）**，30 warnings 为基线存量（同 M7 口径）。
- `npm run tsc`：绿（exit 0）。
- `npm run check-locale`：绿（exit 0）。
- `npm run test`：**1427 tests：1426 通过 / 1 失败**。唯一失败 `src/pages/home/entry.test.tsx`（单跑复现同失败，`tokenStore.isTokenValid` hoisted mock 未跟上，**master 存量**，M7 走查已登记；M8 分支 `src/pages/home/` 零改动）。无 shell.test 并发抖动复现。
- `npx vitest run src/components/rule-node`：**125/125 绿**（4 文件：dry-run 94 + NodeConfigForm + registry + fields）。
- dry-run 报告 ↔ 摘要 fixture 一致性复核：`totalNodes 76`、typeCounts 12/11/9/26/14/4、editableRate 100%、controlLevelRate 75/76=98.7%（63 纯控件 + 12 合法空形态 + 1 JSON 兜底 send notification）、non-editable 0、crashed 0、deprecated 4、round-trip 12 类——报告 §1/§2/§3/§5 与 `dry-run-summary.json` 数字全部对上（「合法空形态 0」行指「纯合法空归类」口径，12 个已并入控件级 75 计，两文件自洽）。
