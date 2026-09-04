# v2 M10 真机验收走查记录（仪表盘半场，spec §3 + 崩溃保护首验）

> 执行：M10 V1 波验收代理（仪表盘半场），2026-09-04。环境：分支 `feature/m10-closeout`（主检出，含波 1 崩溃保护交付），后端 `http://localhost:8080`（本机常驻），前端 dev server `http://localhost:8000`（走查前按 stale-bundle 惯例重启：杀旧 node 进程链 → 删 `src/.umi` → `dev-detached.cmd`，utoo pack ready + 200 确认后开始），browseros MCP 真机浏览器（租户管理员 `tenant@thingsboard.org` / `tenant`）。
> 取证方式：browseros 内联截图 + AX 快照 + 页面 DOM 探针（fetch 钩子抓 `/api/dashboard` 请求、DataTransfer 注入文件驱动真实上传管线、sessionStorage 直查 crash-guard 存档）；服务端真相用 `curl` 直查 API 复核。二进制不入 git（M7/M8/M9 先例）。
> 数据保全：走查自建 1 个仪表盘（M10 V 走查空盘，§3.1/§3.5/崩溃保护/409 载体）+ 1 个 scada 布局改动（§3.6）+ 1 个断点（§3.7），终态全部 DELETE 或复原，既有 4 盘零改动（见 §5 清单）。

## 0. 总览（V1 波 = 仪表盘半场 6+1 项；§4–§5 项与 §6 归 V2 波）

| 走查项 | 结果 |
|---|---|
| 1 §3.1 空盘自动编辑态（L39） | ✅ |
| 2 §3.5 dashboard-image（L86） | ✅（预览破图缺陷 D 登记见 §3） |
| 3 §3.6 SCADA 布局真机（L98 表 + L109） | 进行中 |
| 4 §3.7 断点覆盖（L115） | 进行中 |
| 5 §3.3 右键菜单×2（L58/L59） | 进行中 |
| 6 §3.8 409 三选项闭环（L123） | 进行中 |
| 7 崩溃保护真机首验（M10 波 1 新功能） | ✅ |

> 门禁数字（lint/tsc/check-locale/test 全量）由 G 波在隔离 worktree 复跑回填本节：**（G 波回填位）**。

## 2. 分步记录

### 步骤 1 — §3.1 空盘自动编辑态 ✅
API `POST /api/dashboard` 新建空盘「M10 V 走查空盘」（`fee415d0-a840-11f1-bf08-2be356855d51`，`configuration: {}`，version 1；列表页无 UI 新建入口，API 创建即常规路径）。打开编辑器路由 `/dashboards/:id/editor`：
- **直接进入编辑态**（编辑器路由为纯编辑面，index.tsx 头注设计行为）：工具栏编辑组 AX 枚举全量在场——`editor-toolbar-save/undo/redo/add-widget/manage-layouts/fullscreen/states/aliases/filters/settings/import/export/version-control` + timewindow + `editor-toolbar-exit-cancel`（退出编辑）/`editor-toolbar-exit-save`（保存）；undo/redo 禁用（空栈）、画布空态「暂无数据」〔截图取证〕。
- **可落 widget**：`add-widget` → 抽屉五组（Alarm widgets / Analogue gauges / Cards / 通用 / Input widgets，fqn 在列）→ 选 HTML value card → 「配置 widget」确认框（标题预填显示名「HTML value card」，D3 修复在位；宽/高/行位置/列位置 spinbutton）→ 添加 → **落格成功**（react-grid-item 1 个、undo 转可用、配置面板自动展开五区 segmented）。
- 退出编辑（不保存）→ 「未保存的修改」确认框 → 放弃修改 → 回只读页（草稿撤回、API 复核服务器零改动）。
- **空盘只读页自动弹回编辑器**（view/index.tsx:29-37 `history.replace('/editor')`，TENANT_ADMIN + widgets 空条件）真机目击——spec §3.1「空 dashboard 自动进入编辑态」的另一语义面，M7 已交付设计行为。
- **登记缺陷 D1（见 §3）**：「退出编辑」确认框按钮在路由离开后残留失效（详见 §3 D1，影响退出流 UX，不阻塞勾账——回滚/导航/数据语义均正确）。

### 步骤 7 — 崩溃保护真机首验 ✅（M10 波 1 新功能，spec 勾账落 §3.8 附近新增行）
载体：步骤 1 自建盘。全程 sessionStorage 直查 + DOM 探针 + 截图：
1. **弄脏写档**：编辑态添加 widget（draft 2 widgets）→ `sessionStorage` 出现 key `tb-editor-crash:dashboard:fee415d0-…`，存档结构 `{schemaVersion: 1, entityId, savedAt, draft}` 与设计一致（`crash-guard.ts` 契约）。
2. **恢复框弹出**：SPA 导航离开再重进 editor（或经只读页「编辑」按钮）→ 恢复确认对话框弹出：testid `crash-guard-dialog`，标题「检测到未保存的草稿存档」，intro 带保存时间戳「上次会话结束时仍有内容尚未保存，本地留存了一份草稿存档（保存于 2026/9/4 17:29:57）。」，两按钮 testid `crash-guard-restore`（恢复草稿，主按钮）/`crash-guard-discard`（丢弃存档）+ 各自说明文案，文案诚实不暗示「即将」〔截图取证〕。
3. **恢复 = 一个事务组**：点「恢复草稿」→ 对话框关闭、存档 draft（2 widgets）整体回写画布；undo 可用且**一次 ctrl+z 撤销整个恢复组**回到 enter 基线（对照：session 内先前的 add 组独立在栈，两组分别成组、各自一撤）——`restoreCrashArchive` 单事务组语义（import 范式）真机证实。
4. **干净即清 key**：undo 到底（dirty=false）→ key **自动清除**（sessionStorage 复查为空）；「放弃修改」退出（rollbackToEntry → clean）→ key 同步清除。
5. **丢弃分支**：再次弄脏 → SPA 导航离开（editor 卸载 dirty flush，key 存活——detach flush 契约）→ 经「编辑」重进 → 恢复框再次弹出 → 点「丢弃存档」→ 对话框关闭、key 清除、会话保持服务器基线（存档内容不回写）。
6. **二次进入不再弹**：key 清空后重进 editor → `crash-guard-dialog` 不出现，干净基线渲染〔截图取证〕。
7. **不误伤**：crash guard 无第二套离开拦截（真机离开弹窗仅既有「未保存的修改」一张）；脏草稿 hard reload 被既有 `beforeunload` 守卫拦截（离开确认语义按设计工作）。
结论：**崩溃保护真机行为与 ADR 0004 / M10 简报 §2 设计边界完全一致**（截断栈只存快照、恢复单事务组、清 key 语义、不误伤、静默降级未触发）。

### 步骤 2 — §3.5 dashboard-image ✅（预览破图缺陷 D2 登记见 §3）
载体：同自建盘。API 复核 + 真机对话框全路径：
- **入口条件**：无 image 时只读工具栏 `dashboard-toolbar-image` 即在场（条件 = `isTenantAdmin && !embedded && settings.showUpdateDashboardImage !== false`，与 image 存在与否无关——`DashboardToolbar.image.test.tsx` 单测锚 + 真机双态目击）；**编辑态工具栏无此入口**（editor-toolbar-* 全枚举无 image，parity 细节成立）。
- **设置 image**：`POST /api/dashboard` 带 dataURL image → **服务器自动转存资源库**：image 字段变为 `tb-image;/api/images/tenant/m10_v_走查空盘_dashboard`（TB 4.x image subsystem 语义；version 2→3）。
- **对话框「改」**：只读页点入口 → 对话框「更新仪表盘图片」（testid `dashboard-image-dialog`）→ **DataTransfer 注入新 PNG 驱动真实上传管线**（M9 导入先例）→ 预览切换为 dataURL 且**真渲染**（`naturalWidth: 1`）→ 保存 → `POST /api/dashboard` → API 复核 version 3→4、image 更新为新资源 link。
- **对话框「清」**：重开 → 「清除图片」（`dashboard-image-clear`）→ 预览区切换「未设置仪表盘图片」空态（`dashboard-image-empty`）→ 保存 → API 复核 version 4→5、**image=None（复原）**。
- **登记缺陷 D2（中，见 §3）**：已持久化 image（`tb-image;/api/images/...` link）在对话框预览**破图**——`<img src={image}>` 直接塞 link，`tb-image;` 前缀未剥离（全仓 grep 零处理），浏览器解析为相对路径 404（`naturalWidth: 0`，截图取证）。ui-ngx 有 tb-image link resolver，v2 缺该管道。上传的新 dataURL 不受影响（可直接渲染）；已存 image 的预览/后续编辑体验受损，X 波补 resolver。

### 步骤 3–6 — §3.6 / §3.7 / §3.3 / §3.8
（走查进行中，本节随逻辑单元完成逐项回填。）

## 3. 发现的缺陷、疑点与观察项

| # | 级别 | 描述 | 状态 |
|---|---|---|---|
| D1 | 中（UX） | **「退出编辑」确认对话框残留失效**：dashboard 编辑器「退出编辑」（`shell.tsx` `modal.confirm`，App.useApp() 通道）在 onOk/onCancel 执行后，若发生路由离开（放弃修改 → backToView），确认框 DOM **残留屏幕且按钮失效**（点击无响应——holder 所属 React 子树随路由切换卸载、事件委托断连）。业务逻辑本身全部正确（rollbackToEntry / 导航 / 服务器数据 / crash-guard 清 key 均验证无误），纯 UI 残留：用户离开编辑器后被遮罩+对话框挡住，必须整页刷新。复现：编辑态弄脏 → 退出编辑 → 放弃修改（3+ 次复现）。M7 未发现：当时只验「弹窗出现」「干净退出不弹」，未点过框内按钮。空盘场景叠加 view 页 auto-enter 弹回（设计行为）加重观感。修法（X 波）：confirm 返回实例先 `destroy()` 再导航，或将 App context modal holder 提到路由树外，或改受控 Modal 组件 | 未修，X 波 |
| D2 | 中 | **dashboard-image 预览破图（tb-image link 未解析）**：服务器把上传 dataURL 转存资源库并写回 `tb-image;/api/images/tenant/...` link；对话框 `<img src={image}>`（`dialogs/dashboard-image.tsx:119-125`）不剥离 `tb-image;` 前缀 → 相对路径 404 → 预览破图（`naturalWidth: 0`）。全仓 grep `tb-image` 零命中（v2 无 ui-ngx 的 image link resolver 管道）。影响：已设 image 的盘再次打开对话框/后续编辑预览不可用；新上传（dataURL 直接渲染）不受影响。修法：渲染前剥 `tb-image;` 前缀取相对 URL（或经资源库子系统统一 resolver——随该子系统交付复查） | 未修，X 波 |
| O2 | 观察 | 长会话下对话框按钮集体失联假象：同一 SPA 会话经历多次导航/对话框开关后，出现过 image 对话框「清除图片/取消」点击无效、editor 退出 confirm 按钮失效（D1）等现象；**整页刷新后同类操作全部恢复正常**（干净会话复验 clear 路径 preview→empty→保存落库全通）。判定为自动化长会话环境假象（与 D1 的路由卸载失联不同源），不计产品缺陷；X 波修 D1 时可顺带用干净会话复核 | 登记 |
| — | — | 空盘只读页自动 replace 回编辑器（view/index.tsx auto-enter effect）为 spec §3.1 设计行为，非缺陷；但对「想看空盘只读页」的用户构成死循环观感（退出即弹回），随 UX 迭代再议 | 注记 |

## 5. 现场清理清单（服务器复原核对）

（终态核对，走查结束后回填。）

- 自建：仪表盘 1 个 `fee415d0-a840-11f1-bf08-2be356855d51`（M10 V 走查空盘）→ 走查结束 DELETE；其 image 转存出的租户资源（`/api/images/tenant/m10_v_走查空盘_dashboard*.png`）随盘清理核对。
- 复原：§3.6 scada 布局、§3.7 断点（若以既有盘为载体则改回 default；若自建盘则随盘删除）。
- 既有 4 盘（Firmware / Rule Engine Statistics / Software / Thermostats）version 基线 1/7/5/18，走查终态逐盘 API 核对零改动。
