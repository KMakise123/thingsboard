# v2 M10 真机验收走查记录（仪表盘半场，spec §3 + 崩溃保护首验）

> 执行：M10 V1 波验收代理（仪表盘半场），2026-09-04。环境：分支 `feature/m10-closeout`（主检出，含波 1 崩溃保护交付），后端 `http://localhost:8080`（本机常驻），前端 dev server `http://localhost:8000`（走查前按 stale-bundle 惯例重启：杀旧 node 进程链 → 删 `src/.umi` → `dev-detached.cmd`，utoo pack ready + 200 确认后开始），browseros MCP 真机浏览器（租户管理员 `tenant@thingsboard.org` / `tenant`）。
> 取证方式：browseros 内联截图 + AX 快照 + 页面 DOM 探针（fetch 钩子抓 `/api/dashboard` 请求、`URL.createObjectURL` 钩子捕导出 blob、DataTransfer 注入文件驱动真实上传管线、合成 `MouseEvent('contextmenu')` 派发绕过扩展劫持、sessionStorage 直查 crash-guard 存档）；服务端真相用 `curl` 直查 API 复核。二进制不入 git（M7/M8/M9 先例）。
> 数据保全：走查自建 1 个仪表盘（M10 V 走查空盘，`fee415d0`，全项载体）+ 2 个 image 资源（服务器转存产生），终态全部 DELETE（均 200/success），既有 4 盘 version 基线 1/7/5/18 逐盘 API 核对零改动（见 §5）。

## 0. 总览（V1 波 = 仪表盘半场 6+1 项；§4–§5 项与 §6 归 V2 波）

| 走查项 | 结果 |
|---|---|
| 1 §3.1 空盘自动编辑态（L39） | ✅ |
| 2 §3.5 dashboard-image（L86） | ✅（预览破图缺陷 D2 登记，见 §3） |
| 3 §3.6 SCADA 布局真机（L98 表 + L109） | ✅（列数渲染 cols 取 minColumns 优先注记） |
| 4 §3.7 断点覆盖（L115） | ✅（切换动作环境受阻注记，切换器/断点增删真机目击） |
| 5 §3.3 右键菜单×2（L58/L59） | 半：dashboard 级 ✅ / widget 级 ⛔ 菜单本体不出现（新缺陷候选 D3 登记，L59 维持未勾） |
| 6 §3.8 409 三选项闭环（L123） | ✅（三选项全走 + 覆盖循环内二次 409 未构造，单测锚） |
| 7 崩溃保护真机首验（M10 波 1 新功能） | ✅（行为与 ADR 0004 设计边界一致） |

> 门禁数字（lint/tsc/check-locale/test 全量）由 G 波在隔离 worktree 复跑回填本节：**（G 波回填位：lint __ error / __ warnings；tsc __；check-locale __；test __/__）**。

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

## 3. 发现的缺陷、疑点与观察项

| # | 级别 | 描述 | 状态 |
|---|---|---|---|
| D1 | 中（UX） | **「退出编辑」确认对话框残留失效**：dashboard 编辑器「退出编辑」（`shell.tsx:244` `modal.confirm`，App.useApp() 通道）在 onOk/onCancel 执行后，若发生路由离开（放弃修改 → backToView），确认框 DOM **残留屏幕且按钮失效**（点击无响应——holder 所属 React 子树随路由切换卸载、事件委托断连）。业务逻辑本身全部正确（rollbackToEntry / 导航 / 服务器数据 / crash-guard 清 key 均验证无误），纯 UI 残留：用户离开编辑器后被遮罩+对话框挡住，必须整页刷新。复现：编辑态弄脏 → 退出编辑 → 放弃修改（3+ 次复现）。M7 未发现：当时只验「弹窗出现」「干净退出不弹」，未点过框内按钮。空盘场景叠加 view 页 auto-enter 弹回（设计行为）加重观感。修法（X 波）：confirm 返回实例先 `destroy()` 再导航，或将 App context modal holder 提到路由树外，或改受控 Modal 组件 | 未修，X 波 |
| D2 | 中 | **dashboard-image 预览破图（tb-image link 未解析）**：服务器把上传 dataURL 转存资源库并写回 `tb-image;/api/images/tenant/...` link；对话框 `<img src={image}>`（`dialogs/dashboard-image.tsx:119-125`）不剥离 `tb-image;` 前缀 → 相对路径 404 → 预览破图（`naturalWidth: 0`）。全仓 grep `tb-image` 零命中（v2 无 ui-ngx 的 image link resolver 管道）。影响：已设 image 的盘再次打开对话框预览不可用；新上传（dataURL 直接渲染）不受影响。修法：渲染前剥 `tb-image;` 前缀取相对 URL（或随资源库子系统统一 resolver 复查） | 未修，X 波 |
| D3 | 中（疑似） | **widget 右键菜单不出现**：`editor-widget` cell 右键（合成与 CDP 真事件双通道）触发 `onContextMenu`（widget 选中、面板联动正常），但菜单本体（`editor-widget-menu-<id>`）从不挂载（DOM 全量核查 0 holder，含隐藏态）；对照 dashboard 级菜单（`shell.tsx:539` 稳定引用 + 无 setState）同通道正常打开。疑点：`shell.tsx:416` `widgetMenu()` 每次调用重建 menu 对象引用 + `EditorGrid.tsx:445` onContextMenu 内 `onSelectWidget` setState 重渲染打断 rc-trigger contextMenu 打开。修法：menu 引用稳定化（useMemo）或 contextmenu 时不同步 select | 未修，X 波（L59 维持未勾） |
| O3 | 观察（口径） | **scada 列数渲染优先级**：画布 cols 取 `minColumns ?? columns`（grid-math.ts:235 + 头注明示，TB gridster fallback 原生语义）——minColumns 存量 24 时夹取后的 columns=48 不反映到渲染；`columns=minColumns=48` 时画布 48 列渲染验证通过（196px DOM 探针）。与 spec「非法值向上取整」验收不冲突（夹取落在对话框显示层 + 保存层，均有单测锚 + 真机目击），登记口径防止后续误判 | 注记 |
| O4 | 低 | 409 覆盖流程出现一次「资源不存在: Requested item wasn't found!」toast（结果正确：覆盖成功、对话框关闭、画布/服务器一致；fetch 序列仅 GET/POST `/api/dashboard`）。疑某失效查询的 refetch 或 toast 串台，无功能影响 | 未查根因，X 波顺带 |
| — | — | 空盘只读页自动 replace 回编辑器（view/index.tsx auto-enter effect）为 spec §3.1 设计行为，非缺陷；退出即弹回的循环观感随 UX 迭代再议 | 注记 |
| — | — | 长会话下对话框按钮集体失联假象：同一 SPA 会话多次导航/对话框开关后出现过 image 对话框按钮无效、对话框自动关闭等；**整页刷新（干净会话）后同类操作全部正常**（clear 路径干净复验 preview→empty→保存落库全通；scada 自动仪表化在干净 tab 一次走通）。判定为自动化长会话环境假象，不计产品缺陷 | 登记 |

## 5. 现场清理清单（服务器复原核对）

走查自建、已全部 DELETE：
- 仪表盘 1 个：`fee415d0-a840-11f1-bf08-2be356855d51`（M10 V 走查空盘，全项载体）→ DELETE **200**。
- image 资源 2 个（§3.5 服务器转存产生）：`m10_v_走查空盘_dashboard_image.png`、`m10_v_走查空盘_dashboard_image_(1).png` → DELETE success，资源库 **0 残留**。

终态核对（API）：
- 仪表盘列表 = Firmware / Rule Engine Statistics / Software / Thermostats 共 **4 盘**，version **1/7/5/18** 与走查前基线逐盘一致，image 全 None——**既有实体零改动**。
- 租户 image 资源 totalElements = **0**。
- 断点（§3.7）与 scada 布局（§3.6 复原后）全程仅在 draft 内操作，未保存落库；409 各轮的保存均为走查载体盘、随盘删除。本地临时 JSON 样本（%TEMP%）已删除。
