# v2 M10 实施简报：编辑器三件套收口（团队共享契约）

> 依据：[v2-editors-acceptance.md](./v2-editors-acceptance.md) §2 里程碑表（M10 = **§6 横切七条全绿 + §3–§5 兜底清账复查**）+ [ADR 0004](../adr/0004-editor-suite.md)「崩溃保护」定案 + M7/M8/M9 简报遗留移交清单。
> 分支：`feature/m10-closeout`（自 master 创建）。本简报是实施团队的作业契约；验收勾账回写 spec 本体。

## 0. 范围

- **做**：
  1. **崩溃保护 sessionStorage**（§7 唯一移交到 M10 的代码交付；M8/M9 简报「不做（M10）」）：三编辑器统一 crash-guard——draft 序列化进 sessionStorage（**截断栈**：只存当前 draft 快照，不存撤销栈），widget 编辑器代码文本 debounce 写入；恢复交互 + 「beforeunload / 路由 blocker 不误伤正常离开确认」（ADR 0004 定案形态，见 §2）。
  2. **master 存量确定性红清账**：`entry.test.tsx`（M6 604ffeff52 给 entry.tsx 加 token-first 守卫、测试 mock 未跟上）——M7/M8/M9 三段终验均登记「唯一失败 = 非本段回归」，M10 收口终验要求 **`npm run test` 全绿 0 失败**，本项必须修。
  3. **D2 再议结案**：409 共享 ConflictDialog intro 文案——M9 X 波已中性化（commit 802fc7084b），「按域注入多 key 留 M10 一致性复查再议」。M10 复查后落结论（默认：**维持中性化**——三编辑器同形契约已达成，多 key 注入是未发生需求的提前抽象；结论落 spec 修订记录，除非走查实证三处语义不可共用）。
  4. **真机走查补勾**：§3–§5 全部「留 M10 抽查 / 留观 / 环境受阻」行（清单见 §4，共 11 项）+ **§6 横切七条勾账**。
  5. **自动化衔接**：编辑器自动化回归项登记 #12 基线扩充（gh CLI comment，带代理）。
  6. **文档**：spec §3–§5 清账勾选 + §6 七条勾账 + 修订记录；`v2-m10-browser-walkthrough.md` 走查记录；本简报 §5 证据回填。
- **不做**（防蔓延）：
  - **边重连、导入内存暂存**——M8 定案「不实现 / 不做」，维持 §7 登记不实现状态，M10 不补（「§7 登记项全开」指已交付增强全处于开启状态：缩放平移（M8）+ 512KB 软警告（M9）+ 崩溃保护（M10））。
  - **缺口登记存量**：manage-states 复制 state、dashboard-image html2canvas 抓图、widget 抽屉 scada 置顶、scada 符号边界、select-target-state——均已登记「随对应域迭代补齐」，M10 不修不改账。
  - **512KB 以上限流/阻断**；**后端零改动**；**不装新依赖**（crash-guard 用 sessionStorage 原生 API，无需新包）。

## 1. 现状盘点（门禁基线，agent 直接采信）

- 分支起点 master @ 7dfa338152（M9 已合并回，`feature/m9-widget-editor` 已删）。lint 基线 **0 error / 30 warnings**；`npm run test` **1657/1658**（唯一失败 = `entry.test.tsx` master 存量红，见 §0-2）；tsc 绿；check-locale 绿。
- 后端本机常驻 `http://localhost:8080`（run-tb-backend 技能可重启）；前端 dev server `http://localhost:8000`（走查前按 stale-bundle 惯例重启：杀旧进程链 → 删 `src/.umi` → `ui-antd/dev-detached.cmd` → ready + 200 确认）。真机租户 `tenant@thingsboard.org` / `tenant`。
- `core/editor/session.ts` `EditorSession<T>` 现成（enter/write/undo/redo/checkpoint/save/subscribe，coalesce 窗 1s）；`core/editor/contract/` 有 `use-leave-guard`（路由 blocker + dirty 确认）、`save-with-conflict` + `ConflictDialog`（M9 已中性化 intro）；widget 编辑器代码文本走 `undo-safe-value` 范式（CM 文本 ↔ session 回写）。**sessionStorage 目前全仓 ui-antd/src 零使用**（grep 证实），crash-guard 是第一个使用者。
- 三编辑器落位：仪表盘 `src/pages/dashboards/editor/`、规则链 `src/pages/rule-chains/editor/`、widget `src/pages/widgets/editor/`；共享 EditorSession 均已接线（M7/M8/M9 交付）。

## 2. 崩溃保护设计边界（ADR 0004 定案 + 本段细化，C 波实现自由度在此框内）

ADR 0004：「autosave 不做；崩溃保护 = beforeunload/路由 blocker + sessionStorage 序列化 draft（截断栈），覆盖三编辑器含 widget 编辑器代码文本（debounce 写入，红队 F13）」。§7 冲突约束：「beforeunload / 路由 blocker 不误伤正常离开确认」。实现硬边界：

- **通用件落 `src/core/editor/crash-guard.ts`**（TDD）：输入 `{key, session, debounceMs?}`；订阅 session writes → 将**当前 draft 快照**（非撤销栈）序列化写 sessionStorage；代码文本高频路径（widget 编辑器 TSX/CSS/Schema/defaultConfig 四 tab 经 undo-safe-value 的回写）走 debounce；实体卸载且 dirty=false（保存/放弃后干净退出）→ **清除该 key**。
- **恢复语义**：编辑器 enter 时若同 key 存在存档且 ≠ 当前 baseline → 弹恢复确认（恢复 / 丢弃，文案不含「即将」暗示）；恢复 = 以**一个事务组**把存档 draft 写入 session（与导入同范式，可一次 ctrl+z 整撤）；丢弃 = 清 key。存档带 `schemaVersion`（常量 1）+ 实体 id + 时间戳，解析失败静默清 key（不崩、不 toast 轰炸）。
- **key 命名**：`tb-editor-crash:<域>:<实体id|new>`；三编辑器各自 key 空间，互不串扰。
- **不误伤约束**：不新增 beforeunload 弹窗（`use-leave-guard` 已有 dirty 确认 + PageContainer back guard，crash guard **只读 session 状态、不挂第二套离开拦截**）；干净退出后 key 必清（下次进入不得误弹恢复框）——此为单测锚点。
- **三编辑器接线**：仪表盘 / 规则链 / widget 各一行级接线 + 恢复对话框；widget 编辑器代码文本 debounce 由 undo-safe-value 回写路径天然聚流（session write 已 coalesce，guard 侧再 debounce 一次写 storage）。
- **locale**：`editor.crashGuard.*`（zh/en 对齐，check-locale 强制；新独立文件 + 聚合器一行）。

## 3. 波次与文件所有权

| 波 | Agent | 交付 | 文件所有权（硬边界） |
|---|---|---|---|
| 1 | C 崩溃保护 | `core/editor/crash-guard.ts`（TDD）+ 三编辑器接线 + 恢复对话框 + locale `editor.crashGuard.*` + crash-guard.test（恢复/清 key/debounce/不误伤） | `src/core/editor/crash-guard*`、三编辑器入口/壳的最小接线行、`src/locales/{zh-CN,en-US}/crash-guard.ts` + 聚合器一行 |
| 1 | T 存量清账 | `entry.test.tsx` mock 修复（token-first 守卫对齐 604ffeff52 语义）→ 全量 test 0 失败 | 仅该测试文件及其 mock |
| 2 | G 门禁 | 分支全量门禁复跑（lint 0 error/30 warnings、tsc、check-locale、test 全绿）+ 数字落走查记录 §1 | 无 src 改动；只跑门禁 + 报告 |
| 2 | V 验收 | 真机走查 11 项（§4）+ §6 七条核证勾账 + spec §3–§5 清账 + `v2-m10-browser-walkthrough.md` + 简报 §5 回填 + #12 登记 comment + D2 结论核证 | spec/走查记录/简报文档 + GitHub #12 comment |
| X | 按需 | 走查登记缺陷的修复（TDD 先红后绿）+ spec 登记回写 | 修复涉及文件 |

**作业纪律**（沿 M9 简报 §4 全文有效）：每逻辑单元一 commit（Conventional Commits 英文）；提交前自跑自己范围 vitest + tsc + biome；worktree 开工第一步 `git merge feature/m10-closeout --no-edit`；node_modules 用 junction 只读复用（`cmd //c "mklink /J node_modules <主检出>\\ui-antd\\node_modules"`），**禁止 npm install**；`src/.umi` 缺失跑 `npx max setup`；不装依赖；颜色只走 antd token；HTTP 铁律（只有 `core/http` 发请求）；i18n zh/en 对齐。

## 4. 真机走查清单（V 波作业单，spec 行号勾账落点）

> 取证方式沿 M9：browseros 截图 + AX 快照 + DOM 探针 + curl API 复核；自建 fixture（盘/断点/scada 布局/widget 类型/规则链）终态全 DELETE、服务器复原；记录落 `v2-m10-browser-walkthrough.md`。

| # | spec 落点 | 走查动作 | 环境障碍与绕过预案 |
|---|---|---|---|
| 1 | §3.1 L39 | 新建空盘（空 configuration）→ 打开编辑器 → 应自动编辑态（工具栏编辑组在场、widget 可落格） | 无；新建空盘属常规路径 |
| 2 | §3.5 L86 | 某 non-edit 态盘设置 image（上传小图）→ 刷新 → 工具栏 update-image 入口出现 → 打开对话框改/清 → 保存复原 | 走查后 image 清除复原 |
| 3 | §3.6 L98-109 | manage-layouts 存一张 **scada 布局**（列数故意填非 24 倍数验证夹取）→ 落一个 widget 验证自动仪表化（去标题/透明背景/锁定宽高比/跳过布局步）→ margin DOM 探针验 0 → 走查后布局复原 | 无 |
| 4 | §3.7 L115 | manage-layouts 添加断点（copyFrom default）→ 工具栏 BreakpointSwitcher 出现 → 切断点编辑专属布局（拖一个 widget 只影响该断点）→ 走查后断点删除复原 | 无 |
| 5 | §3.3 L58-59 | dashboard/widget 级右键菜单目击（五项/五项 + testid）；**绕过**：页面 evaluate 派发 `MouseEvent('contextmenu', {bubbles:true, clientX, clientY})`（React 合成事件捕获冒泡，绕过 BrowserOS 扩展劫持）→ 菜单本体验证 + 菜单项动作抽验（粘贴置灰态等） | 绕过失败则如实登记留观（既有单测锚已在） |
| 6 | §3.8 L123 + §4.9 L194 | **双 tab 构造 409**：tab A/B 同开一盘编辑器 → A 改存 → B 直接存 → 409 ConflictDialog → 三选项各走一遍（加载服务器版 / 用我的版本覆盖-含二次 409 上限 / 导出本地 JSON 放弃）；规则链同法走一遍主路径 | 无（本地单机可双开）；API 复核落库真相 |
| 7 | §4.1 L140 | magnet 连线目检：输出桩 → 输入桩真实手势；**绕过尝试**：evaluate 派发 `PointerEvent('pointerdown'/'pointermove'/'pointerup')` 序列于 handle 坐标（d3-drag/RF 指针通道）→ 连线落边 + INPUT 唯一出边替换验证 | 绕过失败维持留观（E1 既有注记不翻案） |
| 8 | §4.7 L183 | 自建链（含 debug 节点）产生 debug 事件 → 事件表出现行 → 「test with this message」预填 debugIn 面板 → 走查后链 DELETE | 本地 Root 链不可动，自建链操作 |
| 9 | §5.5 L236 | widget 编辑器构造**运行期**抛错（如 `useEffect` 内 throw 或 setTimeout 回调 throw——非编译错）→ console 输出 + sourceURL 行号偏移定位 → 与 P1 单测口径对账 | 无 |
| 10 | §5.7 L247 | fork 格式 round-trip：自建 react-1 类型 → 导出（blob 钩子）→ 改名导入 → 编辑器内源码/Schema/尺寸逐件比对 → 走查后类型 DELETE | DataTransfer 注入驱动导入管线（M9 先例） |
| 11 | §6 七条 | i18n（check-locale + zh/en 抽查无裸 key）/ 占位三态 / 三编辑器一致性（撤销边界四条、409 同形、`?` 面板、右键形态、离开确认同源）/ **增强与等价无冲突（崩溃保护上线后 §3.8/§5.2 关键流复走）** / 主题（DOM 探针零内联色值）/ 性能 P1–P10 证据复核落点 / 自动化衔接 → 逐条勾账 | 崩溃保护复走 = 新增强与等价冲突检查的核心动作 |

**D2 核证**（落 §6-一致性行）：三编辑器 409 对话框 intro 均为中性文案（代码 grep + 真机一次目击）→ 结论「维持中性化」落 spec 修订记录。

## 5. PoC / 证据义务（V 波回填本节）

- 崩溃保护：crash-guard.test 单测锚（恢复/清 key/debounce/不误伤四契约）+ 真机一次目击（杀 tab 重开恢复草稿，或刷新后恢复框出现）→ 回填 commit hash。
- `npm run test` 全绿终态数字（1658/1658 预期）→ 回填 G 波报告。
- 11 项走查 + §6 七条勾账终态 → 回填本节与 spec 修订记录。

## 修订记录

- 2026-09-04：创建（M10 开工：范围定稿——崩溃保护 sessionStorage + 存量红清账 + D2 再议结案 + 11 项真机走查 + §6 七条勾账 + #12 登记；「§7 登记项全开」口径钉死为已交付增强全开启；边重连/导入暂存维持登记不实现）。
