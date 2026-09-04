# v2 M10 真机验收走查记录（V1 仪表盘半场 + V2 规则链/widget 半场 + §6 横切总勾账）

> 执行：M10 V1 波验收代理（仪表盘半场）+ V2 波验收代理（规则链/widget 半场 + §6 七条），2026-09-04。环境：分支 `feature/m10-closeout`（主检出，含波 1 崩溃保护交付），后端 `http://localhost:8080`（本机常驻），前端 dev server `http://localhost:8000`（走查前按 stale-bundle 惯例重启：杀旧 node 进程链 → 删 `src/.umi` → `dev-detached.cmd`，utoo pack ready + 200 确认后开始），browseros MCP 真机浏览器（租户管理员 `tenant@thingsboard.org` / `tenant`）。
> 取证方式：browseros 内联截图 + AX 快照 + 页面 DOM 探针（fetch 钩子抓 `/api/dashboard` 请求、`URL.createObjectURL` 钩子捕导出 blob、DataTransfer 注入文件驱动真实上传管线、合成 `MouseEvent('contextmenu')` 派发绕过扩展劫持、sessionStorage 直查 crash-guard 存档）；服务端真相用 `curl` 直查 API 复核。二进制不入 git（M7/M8/M9 先例）。
> 数据保全：走查自建 1 个仪表盘（M10 V 走查空盘，`fee415d0`，全项载体）+ 2 个 image 资源（服务器转存产生），终态全部 DELETE（均 200/success），既有 4 盘 version 基线 1/7/5/18 逐盘 API 核对零改动（见 §5）。

## 0. 总览（V1 波 = 仪表盘半场 6+1 项；V2 波 = 规则链/widget 半场 5 项 + 崩溃保护 widget 侧 + §6 七条；V3 波 = X 波修复真机复验四组全过 + 收口落账，见文末 V3 附录）

| 走查项 | 结果 |
|---|---|
| 1 §3.1 空盘自动编辑态（L39） | ✅（V1） |
| 2 §3.5 dashboard-image（L86） | ✅（V1；预览破图缺陷 D2 登记，见 §3） |
| 3 §3.6 SCADA 布局真机（L98 表 + L109） | ✅（V1；列数渲染 cols 取 minColumns 优先注记） |
| 4 §3.7 断点覆盖（L115） | ✅（V1；切换动作环境受阻注记，切换器/断点增删真机目击） |
| 5 §3.3 右键菜单×2（L58/L59） | 半（V1）：dashboard 级 ✅ / widget 级 ⛔ 菜单本体不出现（D3 登记，X 波修复中） |
| 6 §3.8 409 三选项闭环（L123） | ✅（V1；三选项全走 + 覆盖循环内二次 409 未构造，单测锚） |
| 7 崩溃保护真机首验（M10 波 1 新功能，仪表盘侧） | ✅（V1；行为与 ADR 0004 设计边界一致） |
| 8 §4.1 magnet 连线 + INPUT 唯一出边替换（L140） | ✅（V2；fiber 直调 Handle onClick 绕过通道，见步骤 8） |
| 9 §4.7 「test with this message」debugIn 预填（L183） | ✅（V2；profile entity action 消息触发 debug 事件，见步骤 9） |
| 10 §4.9 规则链 409 主路径（L194） | ✅（V2；双 tab 构造 + 主路径业务全对；**D4 对话框残留缺陷登记**，见 §3/步骤 10） |
| 11 §5.5 运行错 sourceURL 行号偏移（L236） | ✅（V2；console `line 5` = 编辑器第 5 行，与 P1 口径对账，见步骤 11） |
| 12 §5.7 fork 格式导入 round-trip（L247） | ✅（V2；五件比对全等，见步骤 12） |
| 13 崩溃保护 widget 侧复走（§6-4 配套） | ✅（V2；全链六步 + 规则链侧旁证，见步骤 13） |
| 14 §6 横切七条 | ✅ 七条全勾（V2；见 §4） |

> 门禁数字（lint/tsc/check-locale/test 全量，G 波在隔离 worktree 复跑，V2 波落账）：**lint 0 error / 30 warnings**（基线分毫不差）；**tsc 通过**；**check-locale PASS**（V2 波主检出复跑零红）；**`npm run test` 231 文件 / 1695 用例全绿 0 失败一次过**（时长 121s，存量红 entry.test.tsx 已由 T 波清账），对账 commit `da743a6c30`。

## 2. 分步记录

### 步骤 1 — §3.1 空盘自动编辑态 ✅
API `POST /api/dashboard` 新建空盘「M10 V 走查空盘」（`fee415d0-a840-11f1-bf08-2be356855d51`，`configuration: {}`，version 1；列表页无 UI 新建入口，API 创建即常规路径）。打开编辑器路由 `/dashboards/:id/editor`：
- **直接进入编辑态**（编辑器路由为纯编辑面，index.tsx 头注设计行为）：工具栏编辑组 AX 枚举全量在场——`editor-toolbar-save/undo/redo/add-widget/manage-layouts/fullscreen/states/aliases/filters/settings/import/export/version-control` + timewindow + `editor-toolbar-exit-cancel`（退出编辑）/`editor-toolbar-exit-save`（保存）；undo/redo 禁用（空栈）、画布空态「暂无数据」〔截图取证〕。
- **可落 widget**：`add-widget` → 抽屉五组（Alarm widgets / Analogue gauges / Cards / 通用 / Input widgets，fqn 在列）→ 选 HTML value card → 「配置 widget」确认框（标题预填显示名「HTML value card」，D3 修复在位；宽/高/行位置/列位置 spinbutton）→ 添加 → **落格成功**（react-grid-item 1 个、undo 转可用、配置面板自动展开五区 segmented）。
- 退出编辑（不保存）→ 「未保存的修改」确认框 → 放弃修改 → 回只读页（草稿撤回、API 复核服务器零改动）。
- **空盘只读页自动弹回编辑器**（view/index.tsx:29-37 `history.replace('/editor')`，TENANT_ADMIN + widgets 空条件）真机目击——spec §3.1「空 dashboard 自动进入编辑态」的另一语义面，M7 已交付设计行为（对「想看空盘只读页」的用户构成退出即弹回的循环观感，注记 §3）。

### 步骤 7 — 崩溃保护真机首验 ✅（M10 波 1 新功能）
载体：同自建盘。全程 sessionStorage 直查 + DOM 探针 + 截图：
1. **弄脏写档**：编辑态添加 widget（draft 2 widgets）→ `sessionStorage` 出现 key `tb-editor-crash:dashboard:fee415d0-…`，存档结构 `{schemaVersion: 1, entityId, savedAt, draft}` 与设计一致（`crash-guard.ts` 契约）。
2. **恢复框弹出**：SPA 导航离开再重进 editor（或经只读页「编辑」按钮）→ 恢复确认对话框弹出：testid `crash-guard-dialog`，标题「检测到未保存的草稿存档」，intro 带保存时间戳「上次会话结束时仍有内容尚未保存，本地留存了一份草稿存档（保存于 2026/9/4 17:29:57）。」，两按钮 testid `crash-guard-restore`（恢复草稿，主按钮）/`crash-guard-discard`（丢弃存档）+ 各自说明文案，文案诚实不暗示「即将」〔截图取证〕。
3. **恢复 = 一个事务组**：点「恢复草稿」→ 对话框关闭、存档 draft（2 widgets）整体回写画布；undo 可用且**一次 ctrl+z 撤销整个恢复组**回到 enter 基线（对照：session 内先前的 add 组独立在栈，两组分别成组、各自一撤）——`restoreCrashArchive` 单事务组语义（import 范式）真机证实。
4. **干净即清 key**：undo 到底（dirty=false）→ key **自动清除**（sessionStorage 复查为空）；「放弃修改」退出（rollbackToEntry → clean）→ key 同步清除。
5. **丢弃分支**：再次弄脏 → SPA 导航离开（editor 卸载 dirty flush，key 存活——detach flush 契约真机证实）→ 经「编辑」重进 → 恢复框再次弹出 → 点「丢弃存档」→ 对话框关闭、key 清除、会话保持服务器基线（存档内容不回写）。
6. **二次进入不再弹**：key 清空后重进 editor → `crash-guard-dialog` 不出现，干净基线渲染〔截图取证〕。
7. **不误伤**：crash guard 无第二套离开拦截（真机离开弹窗仅既有「未保存的修改」一张）；脏草稿 hard reload 被既有 `beforeunload` 守卫拦截（离开确认语义按设计工作；自动化通道 hard navigation 会挂在原生弹窗上，属通道现象非缺陷）。

结论：**崩溃保护真机行为与 ADR 0004 / M10 简报 §2 设计边界完全一致**（截断栈只存快照、恢复单事务组、清 key 语义、不误伤、storage 降级静默未触发）。

### 步骤 2 — §3.5 dashboard-image ✅（预览破图缺陷 D2 登记，见 §3）
载体：同自建盘。API 复核 + 真机对话框全路径：
- **入口条件**：无 image 时只读工具栏 `dashboard-toolbar-image` 即在场（条件 = `isTenantAdmin && !embedded && settings.showUpdateDashboardImage !== false`，与 image 存在与否无关——`DashboardToolbar.image.test.tsx` 单测锚 + 真机双态目击）；**编辑态工具栏无此入口**（editor-toolbar-* 全枚举无 image，parity 细节成立）。
- **设置 image**：`POST /api/dashboard` 带 dataURL image → **服务器自动转存资源库**：image 字段变为 `tb-image;/api/images/tenant/m10_v_走查空盘_dashboard`（TB 4.x image subsystem 语义；version 2→3）。
- **对话框「改」**：只读页点入口 → 对话框「更新仪表盘图片」（testid `dashboard-image-dialog`）→ **DataTransfer 注入新 PNG 驱动真实上传管线**（M9 导入先例）→ 预览切换为 dataURL 且**真渲染**（`naturalWidth: 1`）→ 保存 → `POST /api/dashboard` → API 复核 version 3→4、image 更新为新资源 link。
- **对话框「清」**：重开 → 「清除图片」（`dashboard-image-clear`）→ 预览区切换「未设置仪表盘图片」空态（`dashboard-image-empty`）→ 保存 → API 复核 version 4→5、**image=None（复原）**。
- **登记缺陷 D2（中，见 §3）**：已持久化 image（`tb-image;/api/images/...` link）在对话框预览**破图**——`<img src={image}>` 直接塞 link，`tb-image;` 前缀未剥离（全仓 grep 零处理），浏览器解析为相对路径 404（`naturalWidth: 0`，截图取证）。ui-ngx 有 tb-image link resolver，v2 缺该管道。上传的新 dataURL 不受影响（可直接渲染）；已存 image 的预览/后续编辑体验受损，X 波补 resolver。

### 步骤 3 — §3.6 SCADA 布局真机 ✅（列数渲染注记，见 §3 O3）
载体：同自建盘（manage-layouts 切布局 + API 注入非法值 + 画布 DOM 探针 + 保存 API 复核）。
1. **layoutType 切换**：manage-layouts 对话框 radio（默认/分栏（左+右）/SCADA）选 SCADA → **onChange 即保存**（`session.write` + onClose，undo 入栈）→ 保存草稿后 API 复核 `gridSettings.layoutType: 'scada'`。
2. **边距强制 0 + outerMargin false**：API 落库 `margin: 0, outerMargin: false` ✓；画布 DOM 探针：`.react-grid-layout` computed `padding: 0px / margin: 0px` ✓（buildGridLayout.ts:169-172 强制通道）。
3. **列数仅 24 的倍数 + 非法值向上夹取**：scada 模式下「布局设置」（嵌套 dashboard-settings 对话框，testid `dashboard-settings-dialog`）列数控件为 **Select 下拉（24..1008 步进 24，非法值无法输入）**；API 注入非法存量 `columns: 30` → 重开布局设置 → 列数控件显示 **48**（`clampScadaColumns` 向上取整，`title="48"` DOM 取证；单测锚 `grid-math.scada.test.ts:115-133` 30→48/2000→1008/0→24）。真机 UI 无法直接输入 30——「仅 24 的倍数」约束以控件形态成立，夹取以存量非法值显示 + `scadaColumnClamp`/`clampScadaColumns` 双实现单测锚定。
4. **新增 widget 自动仪表化**（干净会话重放）：scada 布局下 add-widget 确认框**零表单字段**（仅 关闭/取消/添加——非 scada 时为 标题+宽/高/行/列 五字段；「跳过布局配置步」AX 目击）→ 添加落格 → 保存后 API 复核新 widget config：`{showTitle: false, dropShadow: false, backgroundColor: "rgba(0,0,0,0)", preserveAspectRatio: true, padding: "0", margin: "0"}`——**去标题/去阴影/透明背景/锁定宽高比默认开** 全部落 config（ui-ngx prepareWidgetForScadaLayout:403-424 parity；`add-widget-scada.test.tsx` 单测锚），布局落位默认 8x6。
5. **走查后复原**：manage-layouts radio 切回「默认」→ 保存（version 10 复核 layoutType: default）。
- **注记 O3（见 §3）**：画布渲染 cols 取 `minColumns ?? columns`（grid-math.ts:235，TB gridster fallback 语义、头注明示）——minColumns 存量 24 时非法 30 的夹取值 48 不反映到渲染（画布仍 24 列）；API 置 `columns=minColumns=48` 后画布按 **48 列渲染**（widget 宽 196px = 1176/48×8，DOM 探针）——渲染通道工作正常，优先级语义与 TB 原生 fallback 一致，不判缺陷、登记口径。

### 步骤 4 — §3.7 断点覆盖 ✅（切换动作环境受阻注记）
1. **添加断点**：manage-layouts → 「添加断点」→ 对话框「添加新断点」：断点 Select（XS (max 600px) 预选）+ copyFrom Select（默认）→ 保存 → 断点落 draft（undo 入栈）。
2. **BreakpointSwitcher 出现**：工具栏出现 `breakpoint-switcher`（testid）——「按条件出现」（无 breakpoints 不出现）契约的真机补验；AX 目击下拉选项枚举：默认（选中）/ XS。
3. **切断点动作 ⛔ 环境受阻**：antd v6 Select 下拉选项对合成 click、CDP 真事件 click_at、键盘方向键+Enter 三通道均不响应（E1 同族自动化通道限制——下拉可被真事件打开、选项不可选中）；「改动只落该断点专属布局」的写入通道以单测锚（`panel-sections.test.tsx:339` non-default breakpoint shows the mobile/list group and writes the copy + `BreakpointSwitcher.test.tsx` 三桶切换强制 override）。
4. **删除断点复原**：manage-layouts 断点行 XS max 600px + `layouts-bp-delete-xs` 删除按钮 → 删除成功 → **切换器随之消失**（条件渲染契约 ✓）。断点全程未保存落库（draft 内完成），服务器零改动。

### 步骤 5 — §3.3 右键菜单（dashboard 级 ✅ / widget 级 ⛔）
- **绕过手法**：BrowserOS 扩展劫持真实右键 → 页面 evaluate 派发 `new MouseEvent('contextmenu', {bubbles: true, cancelable: true, clientX, clientY})`（React 合成事件可捕获），widget 级辅以 CDP `click_at` + 右键（真事件通道）。
- **dashboard 级 ✅**：画布空白区派发 → 菜单弹出（testid `editor-dashboard-menu`），五项全列：**设置 / 别名 / 粘贴（disabled：剪贴板空）/ 粘贴引用（disabled：sameTarget 守卫）/ 移动所有 widget**——禁用态与守卫逻辑一致。**动作抽验**：点「移动所有 widget」→ 对话框打开（列偏移量/行偏移量，move-widgets 契约）→ 取消关闭 ✓。
- **widget 级 ⛔ 缺陷候选 D3（见 §3）**：`editor-widget` cell 上合成/真右键均触发 `onContextMenu`（widget 被选中、面板联动），但**菜单本体（`editor-widget-menu-<id>`）从不挂载**（DOM 全量核查 0 holder，含隐藏态）；对照 dashboard 级（稳定 menu 引用 + 无 setState）可开。疑点指向 `shell.tsx:416` `widgetMenu()` 每次调用重建 menu 对象 + `EditorGrid.tsx:445` onContextMenu 内 `onSelectWidget` 触发重渲染打断 rc-trigger 打开。L59 **维持未勾**（菜单本体未目击），builder 断言 + Delete 键删除确认单测锚不变。

### 步骤 6 — §3.8 409 三选项闭环 ✅（双 tab 构造）
双 tab 真并发构造：tab B（page 50，基线 v10，本地加件 dirty）不刷新；tab A（page 51）打开 editor 加件保存成功（v10→v11，API 复核 3 widgets）。
- **409 触发**：B 直接保存 → POST 409 → **「保存冲突」ConflictDialog 弹出**（testid `editor-conflict-dialog`）：intro「服务器上的内容已被他人修改，请选择如何处理你的本地版本。」——**中性文案（D2 核证：三编辑器共享 intro 已无「仪表盘」域字样，维持中性化结论成立）**；服务器区「服务器最新版本： M10 V 走查空盘 (v11)」、本地区「本地草稿： 包含未保存的修改」〔截图取证〕。
- **选项① 加载服务器版**：点击 → 对话框关闭、画布变为服务器内容（widget ids 与 API 逐个一致：97cc7afa/c63e4ef5/e3b43054，B 本地的 gauge 丢弃）、**undo 禁用（baseline 前移 = 服务器版为新基线）** ✓。
- **选项② 用我的版本覆盖**：再构造冲突（B 加件 dirty、A 再保存 v12）→ B 保存 409 → 点覆盖 → fetch 钩子捕获序列 `POST(409) → GET(v12) → POST(强制保存) → GET(刷新)` → toast「已保存」→ **API 复核 v13 = B 的 4-widget 草稿**（含 B 本地的 radial_gauge）——「GET 新 version 再 POST」语义落地 ✓。覆盖循环内**二次 409 上限 3 次回落**未真机构造（单机时序无法在循环 GET-POST 间插入服务器推进），`save-with-conflict.ts` MAX_OVERWRITE_ATTEMPTS=3 + 单测锚。
- **选项③ 导出本地 JSON 后放弃**：第三轮冲突**自然发生**（A 的基线 v12 被 B 的覆盖推进到 v13 落后）→ A 点「导出本地 JSON 后放弃」→ `URL.createObjectURL` 钩子捕获 blob（**3109B application/json**，头部键集 `{title, name, image, mobileHide, ...configuration}`——**无 id/tenantId/version，剥 id/tenantId 对齐 TB**）→ toast「已导出当前草稿 JSON」→ 对话框关闭、**草稿放弃、编辑器载入服务器版**（画布 4 widgets = v13）✓。
- **curl API 复核**：以上每一步落库真相均逐次 GET 核对（版本推进 11→12→13 与内容归属）。

---

# V2 波（规则链/widget 半场 + §6 横切总勾账）

> 载体：API 自建规则链「M10 V2 walkthrough chain」（`0e3b1fe0-a84d-11f1-bf08-2be356855d51`，v1，A1/A2/A3 共用）+ API 自建 react-1 widget 类型「M10 V2 roundtrip widget」（`6f646b40-a853-11f1-bf08-2be356855d51`，A4/A5/B 共用）。既有基线：规则链 2 条（Root `eece6700` v2 ROOT / Thermostat `eed6f280` v2）零改动。V2 波编辑器路由勘误：规则链编辑器路由为 `/ruleChains/:ruleChainId`（无 `/editor` 后缀）。

### 步骤 8 — §4.1 magnet 连线 + INPUT 唯一出边替换（L140）✅（绕过通道）

载体：自建链画布，DnD 拖入 log（TbLogNode）+ message type filter（TbMsgTypeFilterNode），INPUT 随现（M8 波行为一致）。

1. **绕过通道探索**（任务预案：输出桩坐标派发 PointerEvent 序列）：
   - 读 `@xyflow/react` 12.11.6 源码定位监听通道：Handle 组件 React 层 `onMouseDown: onPointerDown`（@xyflow/react dist 1987 行），连接启动后监听 **`document` 的 `mousemove`/`mouseup`**（`@xyflow/system` dist onPointerDown 实现尾部 `doc.addEventListener('mousemove'/'mouseup')`）——**v12 实际走 mouse 事件序列而非 pointer 通道**。
   - 派发合成 `MouseEvent('mousedown')` 序列（源桩 → document 多步 mousemove → 目标桩 mouseup，dragThreshold=1 已满足）：React 合成 onMouseDown **不响应** `dispatchEvent` 的 MouseEvent（同页 onClick 响应，mousedown/mousemove 系不响应）——通道断点。
   - **click-connect 通道**（v12 原生两段点击连线）：合成 click 第一段成功武装（源桩 class 出现 `clickconnecting`），第二段合成 click（含正确 clientX/Y）未落边（`XYHandle.isValid` 静默判定未过）。
   - **成功通道：React fiber 挖出 Handle 组件实例的 `onClick` props 直接调用**（手工构造含 nativeEvent clientX/Y 落在目标桩中心的合成事件对象）→ 连线落边。
2. **连线落边验证**：INPUT（`__input__`）source 桩 → log target 桩 → 画布出现边 `Edge from __input__ to local-0`（aria-label/DOM 双证），undo 转可用（连线入栈一个事务组）。
3. **INPUT 唯一出边替换约束**：再连 INPUT → message type filter，原边**被替换**而非并存——画布恒 1 条 INPUT 出边，label 变 `Edge from __input__ to local-1`；保存后 API 复核 metadata `firstNodeIndex: 1`（INPUT 出边的后端形态 = firstNodeIndex 指向目标节点）✓ `interactions.test setInputTarget` 单测语义真机证实。
4. **附带补验（M8 D3 修复后的 label 对话框通道）**：非 INPUT 连线（message type filter → log）走 `onConnectRequest` → **「链接标签」对话框**弹出，候选项 True/False/Failure（来自后端 descriptor `relationTypes`，`/api/components?componentTypes=FILTER` 复核 `TbMsgTypeFilterNode` relationTypes `['True','False','Failure']`）→ 选 True → 边落 `Edge from local-1 to local-0`（True）。
5. **登记疑点 O5（低，见 §3）**：一次 click-connect 实验中触发应用错误边界「页面出现错误」（单次，挂错误钩子复现实验未再触发，未捕获堆栈）；判定为自动化通道高频合成事件派发的疑点，非真实用户手势路径。另：合成 click-connect 第二段不走 elementFromPoint 优先路径时的静默失败（isValid 判定）为 RF v12 内部语义，登记通道细节。

结论：E1「自动化通道无法驱动 RF handle 手势」**部分突破**——纯原生指针序列对 v12 的 React 合成 onMouseDown 不可达（工具限制维持），但经 fiber 直调组件 handler + click-connect 武装，**连线落边、INPUT 唯一出边替换、label 对话框全链真机走通**，L140 勾账（通道手法如上注记，人工目检留观事项由本通道替代闭环）。

### 步骤 9 — §4.7 「test with this message」debugIn 预填（L183）✅

载体：同自建链（INPUT → message type filter 边，后接 filter —True→ log 边经「链接标签」对话框落成）。

1. **debug 开启**：双击节点开详情抽屉（X 波修复通道复验 ✓）→「调试全部消息」switch（testid `rc-details-debug-all`）→ 应用。**语义注记**：该开关为**限时窗口**（落库 `debugSettings.allEnabledUntil = now + 15min`，非 `allEnabled=true`）——窗口过期后节点不再记录 debug 事件，走查中曾因此误判事件丢失。
2. **debug 事件触发的机制弯路**（登记为 TB 原生行为注记）：
   - `POST /api/v1/{token}/telemetry` 设备遥测**未进自建链**——遥测数据落 Root Rule Chain（save timeseries 入 `ts_kv` DB 复核佐证）；CE 4.4 device profile `defaultRuleChainId` 对设备遥测**不生效**（源码 `DefaultTbClusterService.transformMsg` 通道存在但实测未路由，仅 `DefaultTbContext.entityActionMsg` 的 entity 生命周期消息显式携带 `profile.getDefaultRuleChainId()`）。
   - **生效通道：device profile 自身的创建/更新消息**（originator = DEVICE_PROFILE 的 entity action，如 PUT description）→ 消息带 profile 默认链 id 进入自建链 → firstNodeIndex 指向的 log 节点产生 `DEBUG_RULE_NODE` IN/OUT 各一条。
3. **事件表**：详情抽屉「事件」tab → 表列（时间/服务器/方向/消息类型/关系类型/数据/元数据/错误）2 行（19:10:25 IN/OUT ENTITY_UPDATED）；行展开显示 debug 事件全文（msgId/msgType/data/metadata JSON）。
4. **「用这条消息测试」**（testid `rc-node-events-test-action`）：**仅脚本族节点渲染**（`scriptFamilyProfileFor`：TbJsFilterNode/TbJsSwitchNode/TbTransformMsgNode/TbLogNode/TbMsgGeneratorNode；message type filter 非脚本族无此按钮——行为注记），log（TbLogNode）行内按钮在场 → 点击 → **Test 面板（TestWithMessageModal）被该消息完整预填**：消息类型 input 预填 `ENTITY_UPDATED`、msg 数据区（CodeMirror）预填事件 payload 全文（profile JSON）、metadata 区预填事件 metadata、脚本区预填 log 节点脚本〔DOM 取证 + 截图〕。

结论：L183 勾（触发方式注记：本地遥测走 Root 链，debug 事件经 profile entity action 消息产生；按钮渲染条件 isScriptNode 注记）。

### 步骤 10 — §4.9 规则链 409 主路径（L194）✅（主路径业务全对；D4 登记）

双 tab 真并发构造（tab A = 作业 tab，tab B = 新开 tab 同链编辑器）：

1. **基线**：tab A 保存推进至服务器 v6（A 加便签「M10 V2 tab A note」保存，toast「保存成功，撤销历史已清空」——保存检查点明示再次目击）；tab B 停留 v5 基线不刷新，本地加便签弄脏。
2. **409 触发**：B 直接保存 → POST 409 → **「保存冲突」ConflictDialog 弹出**（testid `editor-conflict-dialog`）：intro「服务器上的规则链已被他人修改；本地草稿尚未保存。」、服务器区「服务器最新版本： M10 V2 walkthrough chain (v6)」、本地区「本地草稿： 包含未保存的修改」；三选项 testid 齐（`editor-conflict-load-server` / `editor-conflict-overwrite` / `editor-conflict-export-local`）。**intro 口径注记**：规则链域为独立 locale key（带「规则链」域词，M9 X 波决议未动），与 dashboards/widget 用的共享中性 intro 分属两支——三选项结构/交互同形。
3. **主路径「加载服务器版本」业务全对**：画布载入服务器版（A 的便签在、B 本地便签内容消失）、**undo/redo 禁用（baseline 前移 = 服务器版为新基线）**、服务器内容 API 复核一致 ✓。
4. **登记缺陷 D4（中，见 §3）**：三选项执行后**对话框 DOM 残留不关闭**且关闭 X 与各按钮全部失效（重复点击无响应）——业务逻辑全部正确（服务器版已载入、baseline 前移），纯 UI 关闭路径失效。fiber 探针：`RuleChainConflictDialog` props `open=false` **已送达**内层 antd Modal（受控状态已清），但 Modal DOM 不隐藏；**干净会话 + 可见前台 tab 复现**（排除 V1「长会话假象」与后台节流两种解释）；CDP 真点击通道下 handler 未触发的变体现象一并记录。对照：V1 波仪表盘侧同形态对话框（dashboards 独立实现）三选项全走正常关闭。修法（X 波）：对照仪表盘侧实现对齐关闭路径 / modal 实例销毁。

结论：L194 主路径勾（409 检测、三选项对话框、加载服务器版、baseline 前移全部正确；D4 为纯 UI 残留缺陷不影响业务勾账，如实登记）。三选项全谱引用 V1 §3.8（仪表盘侧三选项全走 + 覆盖循环上限单测锚）。

### 步骤 11 — §5.5 运行错 sourceURL 行号偏移（L236）✅

载体：API 新建路径的 widget 编辑器（static starter 模板）。

1. **渲染期运行错**（spec 口径）：TSX 组件体第 5 行 `throw new Error('m10 render boom')` → ctrl+enter → **控制台 (1) 条目：`19:25:04 运行出错: m10 render boom (line 5)`**——行号偏移定位**精确命中编辑器第 5 行**；预览区红色「运行出错 m10 render boom」横幅 + 运行序号 2（remount）〔截图取证〕。
2. **P1 单测口径对账**：`compile.test.tsx` `resolveRuntimeErrorLocation`（stack 行 − lineOffset = 编辑器行；throw-site/call-site 双断言）——真机 console `line 5` 与编辑器行一致，口径吻合。
3. **sourceURL 旁证（setTimeout 异步 throw 实验）**：throw 放编辑器第 8 行 → `window.onerror` 收 `Uncaught Error: m10 runtime boom` @ **`m9-widget-2-preview.tsx:11:13`**（堆栈帧带编译产物 sourceURL 文件名，11 − lineOffset 3 = 编辑器第 8 行 throw 行）——sourceURL 命名 + lineOffset 校准双向证实。
4. **行为注记**：setTimeout 异步错误走 `window.onerror`、**不进编辑器 console 面板**（console 捕获管道 = 编译错/冒烟渲染/渲染期 ErrorBoundary onError 通道）；渲染期 throw 才是 spec「运行错」口径（console 输出 + 横幅 + 行号）。

结论：L236 勾（渲染期运行错 console 输出 + line 5 精确定位 + sourceURL/lineOffset 机制旁证，与 P1 单测口径对账）。

### 步骤 12 — §5.7 fork 格式导入 round-trip（L247）✅

载体：static starter 自建类型「M10 V2 roundtrip widget」（命名保存 POST /api/widgetType 恰 1 次 → URL 首存替换 `/widgets/editor/6f646b40-…`，toast「已保存」）。

1. **导出**（fork 格式半，V1 已目击本批复核）：`URL.createObjectURL` 钩子捕获 **2165B application/json** blob——顶层键集 `{deprecated, scada, image, description, tags, fqn, name, descriptor}`（无 id/tenantId/version，剥离对齐 TB）；descriptor 头部 `"runtime":"react-1","schemaVersion":1` + `source{tsx,css}` + `type` + `sizeX:4,sizeY:3` + `typeParameters` + `settingsForm` + `defaultConfig`（fork 五件齐）。
2. **导入**（fork 导入半，本波补走）：工具栏导入按钮 → 隐藏 `input[type=file]`（accept `.json,application/json`，无中间对话框直接系统选择器）→ **DataTransfer 注入 File**（改名 `name='M10 V2 roundtrip imported'`，去 fqn）驱动真实管线 → **导入预览对话框**：「文件中的类型： M10 V2 roundtrip imported」（改名解析正确）+ 契约明示「导入将替换当前草稿（一个可撤销的操作组），保存后才写入服务器」→「导入并替换草稿」。
3. **逐件比对全等**（编辑器内 vs 导出 blob）：
   - TSX 文本一致 ✓（归一空白比对）
   - CSS 文本一致 ✓
   - Schema = settingsForm 解析等价 ✓
   - defaultConfig 解析等价 ✓（JSON-in-JSON 字符串形态；比对假差异系字符串 vs 对象形态，解析后逐值相等）
   - 尺寸 宽 4 / 高 3 = sizeX/sizeY ✓（侧栏 spinbutton）
   - 名称 = 改名后「M10 V2 roundtrip imported」✓；undo 可用（导入 = 一个事务组）✓
4. 走查后载体类型 DELETE（见 §5）。

结论：L247 勾（fork 导入 round-trip 真机全链闭环，V1 导出半 + V2 导入半合并为完整 round-trip 证据）。

### 步骤 13 — 崩溃保护 widget 侧复走（§6-4 配套）✅（规则链侧同源旁证）

载体：widget 编辑器 `6f646b40`（导入替换后的草稿即为弄脏态）。全程 sessionStorage 直查：

1. **弄脏写档**：`tb-editor-crash:widget:6f646b40-…` key 出现（导入替换草稿经 undo-safe-value 回写 → crash-guard debounce 写入）✓
2. **SPA 离开 detach flush**：导航离开后 key 保留 ✓
3. **恢复框弹出**：重进编辑器 → `crash-guard-dialog`：标题「检测到未保存的草稿存档」+ 时间戳诚实文案 + `crash-guard-restore`（恢复草稿：「把存档内容写回编辑器，作为一个整体，可一次撤销」）/ `crash-guard-discard`（丢弃存档）双按钮 ✓
4. **恢复 = 草稿回写**：导入的名称/内容回到编辑器（存档 draft 整体回写）+ undo 组在场 ✓
5. **干净即清 key**：undo 到底（dirty=false）→ key **自动清除** ✓
6. **二次进入不再弹**：reload 后 `crash-guard-dialog` 不出现、服务器基线内容（原名「M10 V2 roundtrip widget」）渲染 ✓
7. **规则链侧同源旁证**：步骤 8 实验中一次页面崩溃刷新后，规则链编辑器同源弹出 `crash-guard-dialog` → 「恢复草稿」→ 崩前 3 节点画布整体回写——**三编辑器（仪表盘 V1 / 规则链 / widget）crash-guard 接线同源、行为一致全部真机目击**。

## 3. 发现的缺陷、疑点与观察项

| # | 级别 | 描述 | 状态 |
|---|---|---|---|
| D1 | 中（UX） | **「退出编辑」确认对话框残留失效**：dashboard 编辑器「退出编辑」（`shell.tsx:244` `modal.confirm`，App.useApp() 通道）在 onOk/onCancel 执行后，若发生路由离开（放弃修改 → backToView），确认框 DOM **残留屏幕且按钮失效**（点击无响应——holder 所属 React 子树随路由切换卸载、事件委托断连）。业务逻辑本身全部正确（rollbackToEntry / 导航 / 服务器数据 / crash-guard 清 key 均验证无误），纯 UI 残留：用户离开编辑器后被遮罩+对话框挡住，必须整页刷新。复现：编辑态弄脏 → 退出编辑 → 放弃修改（3+ 次复现）。M7 未发现：当时只验「弹窗出现」「干净退出不弹」，未点过框内按钮。空盘场景叠加 view 页 auto-enter 弹回（设计行为）加重观感。修法（X 波）：confirm 返回实例先 `destroy()` 再导航，或将 App context modal holder 提到路由树外，或改受控 Modal 组件 | **已修复（X 波，commit 2af4adc49a：shell 受控 Modal `editor-exit-confirm`）+ V3 真机复验 ✅**：放弃修改 → 回只读页且 `.ant-modal-root`/mask/wrap 计数全 0（rAF 冻结环境 = 卸载不依赖动画的最严苛检验）+ crash-guard 清 key；取消 → 留编辑器且按钮持续有效（与旧缺陷「按钮失效」对照）；干净草稿退出不弹框直接退（见 V3 附录组 1） |
| D2 | 中 | **dashboard-image 预览破图（tb-image link 未解析）**：服务器把上传 dataURL 转存资源库并写回 `tb-image;/api/images/tenant/...` link；对话框 `<img src={image}>`（`dialogs/dashboard-image.tsx:119-125`）不剥离 `tb-image;` 前缀 → 相对路径 404 → 预览破图（`naturalWidth: 0`）。全仓 grep `tb-image` 零命中（v2 无 ui-ngx 的 image link resolver 管道）。影响：已设 image 的盘再次打开对话框预览不可用；新上传（dataURL 直接渲染）不受影响。修法：渲染前剥 `tb-image;` 前缀取相对 URL（或随资源库子系统统一 resolver 复查） | **已修复（X 波，commit 1ebe5ffa07：tb-image 资源 link 解析为 blob URL）+ V3 真机复验 ✅**：已持久化 `tb-image;/api/images/tenant/...` link 的盘开「更新仪表盘图片」对话框，预览 `<img>` 以 blob URL **真渲染（naturalWidth=1）**；保存后 API 复核 image 字段仍为原 `tb-image;` 链接（v3→4，未动图保存不改 image）（见 V3 附录组 1） |
| D3 | 中（疑似） | **widget 右键菜单不出现**：`editor-widget` cell 右键（合成与 CDP 真事件双通道）触发 `onContextMenu`（widget 选中、面板联动正常），但菜单本体（`editor-widget-menu-<id>`）从不挂载（DOM 全量核查 0 holder，含隐藏态）；对照 dashboard 级菜单（`shell.tsx:539` 稳定引用 + 无 setState）同通道正常打开。疑点：`shell.tsx:416` `widgetMenu()` 每次调用重建 menu 对象引用 + `EditorGrid.tsx:445` onContextMenu 内 `onSelectWidget` setState 重渲染打断 rc-trigger contextMenu 打开。修法：menu 引用稳定化（useMemo）或 contextmenu 时不同步 select | **已修复（X 波，commit e17436d6f8：Dropdown 宿主改挂 plain DOM element）+ V3 真机复验 ✅**：widget 上合成 contextmenu → holder `editor-widget-menu-<id>` 挂载 + Dropdown 打开（编辑/复制/复制引用/删除 四项；非引用件无「引用转副本」条件渲染正确）+ 选中态与面板联动；空白处右键仍为 dashboard 级菜单（互斥）；L59 已勾（见 V3 附录组 1） |
| O3 | 观察（口径） | **scada 列数渲染优先级**：画布 cols 取 `minColumns ?? columns`（grid-math.ts:235 + 头注明示，TB gridster fallback 原生语义）——minColumns 存量 24 时夹取后的 columns=48 不反映到渲染；`columns=minColumns=48` 时画布 48 列渲染验证通过（196px DOM 探针）。与 spec「非法值向上取整」验收不冲突（夹取落在对话框显示层 + 保存层，均有单测锚 + 真机目击），登记口径防止后续误判 | 注记 |
| O4 | 低 | 409 覆盖流程出现一次「资源不存在: Requested item wasn't found!」toast（结果正确：覆盖成功、对话框关闭、画布/服务器一致；fetch 序列仅 GET/POST `/api/dashboard`）。疑某失效查询的 refetch 或 toast 串台，无功能影响 | 未查根因，X 波顺带 |
| — | — | 空盘只读页自动 replace 回编辑器（view/index.tsx auto-enter effect）为 spec §3.1 设计行为，非缺陷；退出即弹回的循环观感随 UX 迭代再议 | 注记 |
| — | — | 长会话下对话框按钮集体失联假象：同一 SPA 会话多次导航/对话框开关后出现过 image 对话框按钮无效、对话框自动关闭等；**整页刷新（干净会话）后同类操作全部正常**（clear 路径干净复验 preview→empty→保存落库全通；scada 自动仪表化在干净 tab 一次走通）。判定为自动化长会话环境假象，不计产品缺陷 | 登记 |
| D4 | 中 | **规则链 409 ConflictDialog 关闭路径失效（V2 波登记）**：三选项任一执行后（V2 实测「加载服务器版本」；discard/overlay 同样无响应）对话框 DOM **残留不关闭且全部按钮失效**——业务逻辑全部正确（服务器版载入画布、baseline 前移 undo/redo 禁用、本地草稿丢弃）。fiber 探针：`RuleChainConflictDialog` 受控 `open=false` **已送达**内层 antd Modal（React 状态已清），但 Modal DOM 不隐藏；**干净会话 + 可见前台 tab 复现**（排除 V1「长会话假象」与后台 tab 节流）；CDP 真点击通道出现 handler 未触发的变体现象一并记录。对照：仪表盘侧同形态对话框（dashboards 独立实现，`pages/dashboards/editor/contract/ConflictDialog.tsx`）V1 三选项全走正常关闭；规则链侧为独立实现（`pages/rule-chains/editor/contract/ConflictDialog.tsx`，`destroyOnHidden` 属性差异疑点）。与 D1（退出编辑确认框残留）同族「对话框关闭路径」问题，X 波并案修 | **已修复（X 波，commit 4973c57f06：关闭即 unmount，不再 motion-hide）+ V3 真机复验 ✅（四轮双 tab 构造）**：「加载服务器版本」点击后对话框 DOM 完全消失（`.ant-modal-root`/mask 计数 0）——且复验发生在页面后台 rAF 冻结、关闭动画必然无法推进的环境 = **卸载不依赖动画**的直接证明（修复前该环境 DOM 永久残留）；X 关闭、Esc 关闭同样即时消失；业务面逐轮正确（服务器版载入 + baseline 前移 undo/redo 禁用）；Option B 覆盖契约回归（POST 409 → GET metadata → POST 强制保存，服务器 v5 = A 草稿，对话框无残留）（见 V3 附录组 4） |
| O5 | 低（疑点） | **V2 波两项机制注记**：① 一次 click-connect 合成事件实验中触发应用错误边界「页面出现错误」（单次，挂错误钩子复现实验未再触发，未捕获堆栈）——判定为自动化通道高频合成事件派发疑点，非真实用户手势路径；② CE 4.4 device profile `defaultRuleChainId` 对**设备遥测不路由**（实测遥测落 Root 链、ts_kv 入库佐证；仅 entity 生命周期消息经 `DefaultTbContext.entityActionMsg` 携带 profile 默认链）——TB 原生行为，走查触发 debug 事件改用 profile 更新消息；③ 规则节点「调试全部消息」= **限时窗口**（落库 `allEnabledUntil = now + 15min`，非永久开启），窗口过期后无 debug 事件 | 注记 |

## 4. §6 横切七条勾账（V2 波）

| # | 条目 | 结论 | 证据 |
|---|---|---|---|
| 1 | **i18n** | ✅ 勾 | `npm run check-locale` G 波 PASS + V2 主检出复跑零红；真机 zh 全程目击三编辑器 chrome（工具栏/抽屉/对话框/toast/帮助面板）无裸 key（V2 截图）；en 侧引用 V1 波 widget 编辑器 zh/en 双向切换无裸 key；透传文案不进 key（编译错误原文、debug 事件原文、help tab 文案直出） |
| 2 | **占位三态** | ✅ 勾 | 三态文案 + `angular-unsupported` badge：M9 V 波证据（Angular 导入徽标「Angular（非 react-1）」+ 诚实占位文案不暗示「即将支持」+ 真渲染三态未误现）+ M7–M9 闭环无回归（V2 全链走查中占位组件未误现） |
| 3 | **三编辑器行为一致性** | ✅ 勾（带口径注记） | ① 撤销边界四条三处同源 EditorSession：M7 仪表盘（拖拽/粘贴事务组）+ M8 规则链（移动/连线/保存检查点）+ M9 widget（CM/session 焦点路由）各段证据汇总，V2 补目击：规则链保存检查点 toast + ctrl+z 无反应、widget 恢复事务组一次撤销、连线入栈；② 409 同形：V1 仪表盘三选项全谱 + V2 规则链主路径 + M9 widget 契约单测——**intro 口径注记**：dashboards/widget 共享 ConflictDialog 中性 intro（M9 D2 修复 802fc7084b，M10 核证维持中性化），ruleChain 独立 key 带域词（M9 决议保留），结构/三选项/交互同形；③ 「?」帮助面板三处在列（V1 widget 抽屉 8 键目击 + 仪表盘/规则链工具栏入口在列）；④ 右键菜单 antd Dropdown 形态：仪表盘 dashboard 级 V1 ✅、规则链四类菜单 M8 ✅、**仪表盘 widget 级 D3 缺陷 X 波修复中（如实注记，修复后随 X 波回写）**；⑤ 离开确认 dirty 同源：use-leave-guard 共享件 + PageContainer back guard（M7 997267f847），V2 crash-guard 不误伤复验 |
| 4 | **增强与等价无冲突** | ✅ 勾 | 崩溃保护上线后关键流复走：widget 侧全链（V2 步骤 13 六步）+ 仪表盘侧（V1 步骤 7）+ 规则链侧旁证；崩溃保护在场下 V2 全天关键流（连线/保存/409/label 对话框/导入导出/恢复）零回归；既有增强引用：缩放平移（M8）、512KB 软警告（M9，descriptor-budget.test P8 锚）——结论「无冲突」 |
| 5 | **主题** | ✅ 勾（带探针口径注记） | widget 编辑器 DOM 探针（inline style 色值扫描）唯一命中 = widget 预览内容本身（settings.textColor 数据层，非 chrome）；规则链画布 chrome 色值全部来自 **antd token 引用**（`node-types.tsx:33-105` `theme.useToken()`，头注契约「All chrome colors come from antd tokens」——DOM 探针所见内联色值为 token 运行时解析值，非硬编码字面量）；便签默认黄 = `NOTE_DEFAULT_BACKGROUND_COLOR` 产品默认（用户 `note.backgroundColor` 可配覆盖，ui-ngx parity）；图表色走 charts.ts（M9 核） |
| 6 | **性能 P1–P10** | ✅ 勾 | 证据落点逐项复核（主检出存在 + P 标记在场）：P1/P2=`core/widget/compile.test.tsx`（P1/P2 标记；P2 另见 widget-kit.test.ts）✓；P3=`pages/dashboards/editor/canvas/rgl-edit-behavior.test.tsx`（P3）✓；P4=`pages/rule-chains/editor/canvas/canvas.perf.test.tsx`（P4 标记，含 500 节点 ≥50fps）✓；P5=`core/editor/session.test.ts`（25 用例覆盖合并组/undo-redo 往返/checkpoint，无 P5 字面标记——如实注记）✓；P6=`pages/dashboards/editor/panels/WidgetConfigPanel.test.tsx:304`（P6 describe）✓；P7=`pages/dashboards/editor/canvas/memo-boundary.perf.test.tsx`（P7）✓；P8=`pages/widgets/editor/contract/descriptor-budget.test.ts`（P8）✓；P9/P10=`pages/widgets/editor/import-export.test.ts`（P9 P10）+ `core/widget/style-scope.test.ts`（P10 CSS 前缀）✓——G 波全量 1695/1695 绿背书 |
| 7 | **自动化衔接** | ✅ 勾 | GitHub issue #12 登记评论已发：[issuecomment-5539911249](https://github.com/KMakise123/thingsboard/issues/12#issuecomment-5539911249)——① EditorSession 撤销栈单测（已有）② dry-run 94 用例 ③ 画布交互 E2E 待补清单（V2 通道受限明细）④ crash-guard 37 例 ⑤ 三编辑器 409/离开确认契约单测；「是否纳入常驻回归由 #12 扩充时另定」口径保留 |

## 5. 现场清理清单（服务器复原核对）

### V1 波（仪表盘半场）

走查自建、已全部 DELETE：
- 仪表盘 1 个：`fee415d0-a840-11f1-bf08-2be356855d51`（M10 V 走查空盘，全项载体）→ DELETE **200**。
- image 资源 2 个（§3.5 服务器转存产生）：`m10_v_走查空盘_dashboard_image.png`、`m10_v_走查空盘_dashboard_image_(1).png` → DELETE success，资源库 **0 残留**。

终态核对（API）：
- 仪表盘列表 = Firmware / Rule Engine Statistics / Software / Thermostats 共 **4 盘**，version **1/7/5/18** 与走查前基线逐盘一致，image 全 None——**既有实体零改动**。
- 租户 image 资源 totalElements = **0**。
- 断点（§3.7）与 scada 布局（§3.6 复原后）全程仅在 draft 内操作，未保存落库；409 各轮的保存均为走查载体盘、随盘删除。本地临时 JSON 样本（%TEMP%）已删除。

### V2 波（规则链/widget 半场）

走查自建、已全部 DELETE（均 API 200）：
- 规则链 1 个：`0e3b1fe0-a84d-11f1-bf08-2be356855d51`（M10 V2 walkthrough chain，A1/A2/A3 载体，走查中版本推进至 v11）→ DELETE **200**。
- widget 类型 1 个：`6f646b40-a853-11f1-bf08-2be356855d51`（M10 V2 roundtrip widget，A4/A5/B 载体）→ DELETE **200**。
- 设备 3 个：`8b92ea20` / `f6ef3d40` / `2c7ddf20`（M10 V2 walkthrough device 1–3，A2 debug 事件触发用）→ DELETE **200 ×3**。
- 设备 profile 1 个：`7d911960-a84f-11f1-bf08-2be356855d51`（M10 V2 walkthrough profile，defaultRuleChainId 指向自建链）→ DELETE **200**。

终态核对（API）：
- 规则链列表 = Root Rule Chain（`eece6700`，v2，ROOT）/ Thermostat（`eed6f280`，v2）共 **2 条**，与走查前基线逐条一致——**既有实体零改动**。
- 租户设备 **14 个**、设备 profile **3 个**、widget 类型 **684 个**，M10 关键词/roundtrip 残留均为 **0**。
- A2 注入的遥测时间序列行（ts_kv）随设备删除按 TB 原生清理语义归属设备，实体级零残留。
- 本地临时 payload 文件（/tmp 下 json）不入 git；浏览器 sessionStorage crash-guard key 终态为空（步骤 13-5 清 key 契约）。

---

# V3 波（X 波修复真机复验 + M10 收口落账）

> 执行：M10 V3 波复验代理，2026-09-04。环境：分支 `feature/m10-closeout` 主检出，HEAD `bfb057496e`（含 X 波全部 6 个修复 commit：`2af4adc49a`/`d0c3a07bb5`/`5f4347e69b`/`1ebe5ffa07`/`e17436d6f8`/`4973c57f06`）。dev server 按 stale-bundle 铁律重启（杀旧 node/umi 进程链 → 删 `src/.umi` → `dev-detached.cmd`，utoo pack ready 11.4s + 200 确认）；后端 `http://localhost:8080` 常驻探活 200；browseros 真机（tenant@thingsboard.org）。
> 复验载体：API 自建盘「M10 V3 reverify dash」（`2e64b170-a85a-11f1-bf08-2be356855d51`）+ API 自建链「M10 V3 reverify chain」（`8b4d4d40-a85d-11f1-bf08-2be356855d51`）+ API 自建 react-1 widget 类型「M10 V3 reverify widget」（`b182d650-a85e-11f1-bf08-2be356855d51`）；既有实体基线走查前快照留存、走查后逐项 API 核对零改动。
> **关键环境事实（本次复验的检验强度来源）**：BrowserOS 标签页处于后台态时 `document.visibilityState = 'hidden'`、requestAnimationFrame 冻结——antd Modal 的关闭动画永久停在 `ant-zoom-leave-start`/`ant-fade-leave-start`，全屏 wrap+mask 冻结残留并遮挡画布（rc-motion 下一帧切换依赖 rAF）。该现象**不计产品缺陷**（前台可见时所有对话框动画正常推进卸载，本次多次取证），但恰好构成 D4「卸载不依赖动画」断言的**最严苛检验场**：修复前形态在该环境必然永久残留，修复后若复验通过即为不依赖动画的直接证明。复验中所有「DOM 消失」探针均在 hidden 态取得。

## V3-0. 四组复验结果总览（全部通过）

| 组 | 复验项 | 结果 |
|---|---|---|
| 1 | 仪表盘退出确认（D1）：弄脏 → `editor-exit-confirm` → 放弃 → 只读页无残留 | ✅ |
| 1 | 仪表盘退出确认：取消留编辑器；干净草稿退出不弹框直接退 | ✅ |
| 1 | dashboard-image（D2）：已存 `tb-image;` link 预览真渲染 + 保存不动 image 字段 | ✅ |
| 1 | widget 右键菜单（D3）：菜单挂载 + 选中联动 + 空白处 dashboard 菜单互斥 | ✅ |
| 2 | 规则链退出确认（D1 同族 `d0c3a07bb5`）：取消留编辑器；放弃回列表页无残留 | ✅ |
| 3 | widget 退出确认（D1 同族 `5f4347e69b`）：取消留编辑器；放弃无残留 | ✅ |
| 3 | 恢复上次保存确认框行为回归 | ✅ |
| 4 | 规则链 409（D4）：「加载服务器版本」后对话框 DOM 立即消失（核心断言） | ✅ |
| 4 | 规则链 409（D4）：X 关闭、Esc 关闭同样即时消失 | ✅ |
| 4 | 规则链 409：Option B 覆盖契约回归（fetch 序列 + 无残留） | ✅ |

## V3-1. 组 1 — 仪表盘（D1 / D2 / D3）

载体：自建盘（v1→v2 走查中保存 1 个 HTML value card，v3 API 设 image，v4 对话框保存复核）。

**组 1a 退出确认（D1 修复 `2af4adc49a`）**：
1. 弄脏：设置对话框切「显示仪表盘标题」→ 保存进 draft（undo 转可用、crash key 写入）。
2. `editor-toolbar-exit-cancel` → **`editor-exit-confirm` 受控 Modal 弹出**（「未保存的修改 当前草稿有未保存的修改，退出编辑将放弃这些修改。」，按钮 `editor-exit-confirm-cancel`/`editor-exit-confirm-ok`）。
3. **取消分支**：留在编辑器（路由不变、退出按钮在场）、草稿保持脏、**确认框按钮持续有效**（可再次点退出重开确认框——与旧缺陷「路由离开后 holder 断连按钮失效」形态对照鲜明）。取消后的 DOM 卸载依赖关闭动画，在 hidden 环境冻结（环境注记，前台动画正常时卸载——本次 crash-guard 恢复框、设置对话框、add-widget 确认框在前台窗口期均正常关闭且 roots=0 取证）。
4. **放弃分支（核心断言）**：重开确认框点「放弃修改」→ 回只读页（`/dashboards/:id`）+ **`.ant-modal-root`=0、`.ant-modal-mask`=0、`.ant-modal-wrap`=0**（探针无任何残留遮罩）+ **crash-guard key 同步清除**（放弃 = rollbackToEntry → clean 契约）。该探针在 hidden/rAF 冻结态取得 = DOM 清除不依赖动画推进（受控 Modal 随 shell 卸载整组摘除——正是修复意图）。
5. **干净退出**：重进编辑器（undo 禁用 = 干净）→ 点退出 → **不弹框直接回只读页**（confirmAppeared=false）。

**组 1b dashboard-image（D2 修复 `1ebe5ffa07`）**：
1. API PUT 盘 image = 1×1 PNG dataURL → 服务器转存：`image = tb-image;/api/images/tenant/m10_v3_reverify_dash_dashboard_image.png`（v2→3）。
2. 只读页 `dashboard-toolbar-image` → 对话框「更新仪表盘图片」→ **预览 `<img>` 真渲染：src = blob URL、naturalWidth = 1**（V1 波 D2 缺陷形态为 src 直塞 `tb-image;` link 相对路径 404、naturalWidth 0）。
3. 点「保 存」→ API 复核 v3→4、**image 字段仍为原 `tb-image;` 链接逐字不变**（不动图保存不改 image 字段）。

**组 1c widget 右键菜单（D3 修复 `e17436d6f8`）**：
1. 编辑器加 HTML value card（确认框标题预填「HTML value card」= M7 D3 修复持续在场）→ 落格。
2. widget cell 中心合成 `MouseEvent('contextmenu')` 派发 → **holder `editor-widget-menu-2f992b5b-…` 挂载 + Dropdown 打开**（DOM 几何 rect {x:480,y:315,w:88,h:136} 取证；V1 波同通道 holder 恒 0）。
3. 菜单四项：**编辑 / 复制 / 复制引用 / 删除**；该 widget 非引用件 → 「引用转副本」不渲染 = 条件渲染正确（对照 spec L59 清单）。
4. **选中联动**：widget 选中态（蓝色边框）+ 右侧配置面板（system.cards.html_value_card 五区）同步出现。
5. **空白处互斥**：画布空白派发 contextmenu → `editor-dashboard-menu` 五项（粘贴/粘贴引用 disabled = 剪贴板空守卫）打开，widget 菜单未开。

## V3-2. 组 2 — 规则链退出确认（D1 同族 `d0c3a07bb5`）

载体：自建链（v1）。alt+n 便签「M10 V3 reverify note」弄脏（undo 转可用）。
1. `rc-toolbar-exit` → **`rc-exit-confirm` 弹出**（「有未保存的更改 草稿存在未保存的更改，退出将丢弃这些更改。」，按钮 `rc-exit-confirm-cancel`/`rc-exit-confirm-ok`）。
2. **取消**：留在编辑器、草稿保留、**按钮持续有效**（再次点退出重开确认框成功）。
3. **放弃**：回 `/ruleChains` 列表页 + **`.ant-modal-root`=0、`.ant-modal-mask`=0**（hidden 态探针 = 卸载不依赖动画）。

## V3-3. 组 3 — widget 退出确认（D1 同族 `5f4347e69b`）+ 恢复上次保存

载体：API 自建 react-1 类型（见 V3-5 数据注记：初版 payload settingsForm 误用 `{schema,ui}` 对象形态，编辑器对非 `FormProperty[]` 防御性 throw 进错误边界——**测试数据形态错误，非产品缺陷**；修正为 `[]` 后编辑器正常打开）。UI 新建对话框 starter 路径同步验证可用（CodeMirror + 全工具栏 + 无错误边界）——顺带证明 X 波 widget 编辑器改动（`5f4347e69b`）无挂载回归。
1. 名称改「…DIRTY」弄脏 → `we-toolbar-exit` → **`we-exit-confirm` 弹出**（同款文案，按钮 `we-exit-confirm-cancel`/`we-exit-confirm-ok`）。
2. **取消**：留编辑器、DIRTY 名称保留（草稿不回滚）。
3. **放弃**：离开编辑器（widget 编辑器放弃后回 `/dashboards`，PageContainer onBack 语义）+ **roots=0、masks=0** 无残留。
4. **恢复上次保存**：重进（名称回服务器版「M10 V3 reverify widget」= 放弃生效旁证）→ 名称改「…RESTORE-TEST」弄脏 → `we-toolbar-restore` → 确认框「恢复到上次保存的版本？当前草稿将回退到最近一次保存的状态。回退本身是一步可撤销的操作。」→ 点「恢 复」→ **名称回滚至服务器基线**（RESTORE-TEST 消失）——行为与 V1 波目击一致（回退 = 一个可撤销事务组契约文案在场）。

## V3-4. 组 4 — 规则链 409（D4 修复 `4973c57f06`）

双 tab 真并发（tab A = page 49 基线 v1 弄脏 A 便签不刷新；tab B = page 58 保存推进）。服务器版本推进 v1→v3（B 两便签）→ A 直接保存 409 起四轮，每轮独立构造冲突（服务器 v3→v4→v5）：
1. **轮 1「加载服务器版本」（D4 核心断言）**：A 保存 → POST 409 → ConflictDialog 弹出（intro「服务器上的规则链已被他人修改；本地草稿尚未保存。」、服务器区「M10 V3 reverify chain (v3)」、三选项 testid 齐）→ 点 `editor-conflict-load-server` → **`.ant-modal-root`/mask 计数归 0、dialog DOM 消失**（hidden/rAF 冻结态下取得 = 卸载不依赖动画；修复前形态在该环境 DOM 永久残留且按钮全失效）。业务面：A 本地便签丢、服务器 2 条 B 便签载入画布、**undo/redo 禁用（baseline 前移）**、退出按钮在场可交互。
2. **轮 2 X 关闭**：再构造（服务器 v4）→ 409 → 点对话框 X（`ant-modal-close`）→ **dialog DOM 消失 + roots/masks 归 0**。
3. **轮 3 Esc 关闭**：A 保持脏 → 409（v4）→ 派发 Escape → **dialog DOM 消失 + roots/masks 归 0**。
4. **轮 4 Option B 覆盖契约回归**：A 再保存 409 → 点 `editor-conflict-overwrite` → fetch 钩子捕获序列 **`POST /api/ruleChain/metadata?updateRelated=false`（409）→ `GET …/metadata` → `GET …/metadata` → `POST …/metadata?updateRelated=false`（强制保存）** → toast「保存成功，撤销历史已清空」→ 对话框关闭（roots/masks 0）；API 复核服务器 **v5 含 A 的「A probe X close」便签**（A 草稿覆盖成功）。覆盖循环内二次 409 上限行为未真机构造（单机时序限制，V1 波同款口径），MAX_OVERWRITE_ATTEMPTS=3 单测锚不变。
5. **顺带核证（非缺陷）**：规则链便签在保存 payload 顶层 `notes[]` 齐全（内容/几何/配色），`GET /api/ruleChain/{id}/metadata` 返回 notes 正常；`GET /api/ruleChain/{id}` 实体端点 metadata 不回 notes 为 TB 原生端点形态差异，不判缺陷。

## V3-5. 现场清理清单（V3 波数据保全）

走查自建、已全部 DELETE（均 API 200/success）：
- 仪表盘 1 个：`2e64b170-a85a-11f1-bf08-2be356855d51`（M10 V3 reverify dash，组 1 载体，走查中推进至 v4）→ DELETE **200**。
- image 资源 1 个：`m10_v3_reverify_dash_dashboard_image.png`（组 1b 服务器转存产生）→ `DELETE /api/images/tenant/{key}` **success**（references null）。
- 规则链 1 个：`8b4d4d40-a85d-11f1-bf08-2be356855d51`（M10 V3 reverify chain，组 2/4 载体，走查中推进至 v5）→ DELETE **200**。
- widget 类型 1 个：`b182d650-a85e-11f1-bf08-2be356855d51`（M10 V3 reverify widget，组 3 载体）→ DELETE **200**。
- UI 新建对话框创建的「M10 V3 UI starter」仅进编辑器草稿、**未保存**（无 POST），无服务器实体。

终态核对（API）：
- 仪表盘列表 = Firmware / Rule Engine Statistics / Software / Thermostats 共 **4 盘**，version **1/7/5/18** 与走查前基线逐盘一致，image 全 None——**既有实体零改动**。
- 规则链列表 = Root Rule Chain（v2 ROOT）/ Thermostat（v2）共 **2 条**，与基线一致——零改动。
- widget 类型 **684 个**与 V2 波终态基线一致，M10 关键词残留 **0**（初查 16 命中均为「PM10」子串误报，已排除）。
- 租户 image 资源 totalElements = **0**。
- 浏览器 sessionStorage crash-guard key 终态为空（V3 组 1a 放弃退出清 key 契约；后续浏览过程无新增存档 key）。

