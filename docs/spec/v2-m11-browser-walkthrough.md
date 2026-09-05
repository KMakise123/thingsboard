# v2 M11 真机验收走查记录（资源库五件套 + SCADA 符号编辑器 + editors 两条解锁，11 项）

> 执行：M11 3V 波验收代理，2026-09-05。环境：隔离 worktree 分支 `worktree-agent-a41b2afe36cd837f3`（= `feature/m11-resources-library` 顶端，波 0/1A/1B/2C/2D/2E 全部合并后），后端 `http://localhost:8080`（本机常驻），前端 dev server `http://localhost:8000`（主检出，走查前已运行中），browseros MCP 真机浏览器（租户管理员 `tenant@thingsboard.org` / `tenant`，全程中文界面）。
> 取证方式：browseros 内联截图 + AX 快照 + 页面 DOM 探针（`performance.getEntriesByType('resource')` 抓网络请求、DataTransfer 注入文件驱动真实上传管线、CodeMirror `contenteditable` 粘贴注入驱动代码编辑、fetch 钩子抓保存 payload、hover 合成 `MouseEvent` 派发触发 antd Popover）；服务端真相用 `curl` 直查 API 复核（登录/建删 fixture/落库复核）。二进制不入 git。
> 数据保全：走查自建的全部 fixture（widget 类型 ×2、bundle ×1、图片 ×1、SCADA 符号 ×1、JS MODULE ×1、资源文件 ×2、仪表盘 ×1）终态全部 DELETE（均 200，API 复核 total=0 或 404），system 资源零写入（system 图片/system 符号/system widget 类型仅只读目击与只读导出），见 §5。

## 0. 总览（作业单 11 项）

| # | 作业单项 | 结果 |
|---|---|---|
| 1 | §3.1 widget types 列表/搜索/详情/编辑器往返 + bundle 新建→加 widget→移除→删除 | ✅（V1-1 缺陷登记：bundle 装 system 类型后端静默丢弃；V1-2 观察：bundle 图片字段过渡实现未回接） |
| 2 | §3.1 widget type 导出→改名导入→双份目击→清理 | ✅ |
| 3 | §3.2 图片上传→信息改 title→embed 公链→导出→（删） | ✅ |
| 4 | §3.2/§1 被引用删除流（引用对话框 → force 删 → 引用悬空） | ✅（「引用处空图占位」无 UI 承载目击点，如实注记） |
| 5 | §3.3 上传 SVG 符号→自动跳编辑器→hover tag 面板→四 tab 各改一项→保存落库复核 | ✅ |
| 6 | §3.3 静态预览 + 从符号创建 widget | ✅ |
| 7 | §3.3 readonly（TENANT 开 system 符号） | ✅（复验） |
| 8 | §3.4 JS MODULE 新建→下载→删除 + §3.5 资源文件批量上传→类型过滤→批量删除 | 半：JS 新建 ⛔（V8-1 缺陷，走错端点 400）/ 其余 ✅（V8-2 toast 占位符缺陷登记） |
| 9 | §3.6-1 scadaFirst 参数透传 | ✅ 参数两路目击；「类目置顶可见」受 M7 抽屉 registry-only 数据源限制，按主会话裁决口径登记 |
| 10 | §3.6-2 仪表盘内符号实例边界 | ✅（占位态渲染实测；「换符号/绑设备/绑对象」无承载，边界行按实际回写） |
| 11 | §3.7 横切（i18n / 主题 / 门禁 / 数据保全） | ✅ |

> 门禁数字（3G 波在隔离 worktree 复跑为准；本 worktree 因 node_modules junction 未挂载仅可实测 `check-locale`）：**check-locale PASS（本地实测零红）**；lint 0 error / 30 warnings、tsc 通过、vitest 1885 用例全绿——引用 3G 波结果。

## 1. 分步记录

### 步骤 1 — widget types 列表/详情/编辑器往返 + bundle 建删 ✅
- **列表全列**：`/resources/widget-types` 渲染列 创建时间/名称/部件包/部件类型/系统/已弃用 + 行操作（导出/详情）；共 684 个、分页 10 条/页；搜索框提交后 URL 写 `?textSearch=action+button` 且列表过滤到 1 行「Action button」；segmented「全部/当前/已弃用」三态过滤开关在场；「系统」列以 badge 显示 SYS 归属〔截图〕。
- **详情页**：行点击进 `/resources/widget-types/:id`——元信息行 名称/全限定名（`system.action_button` code 徽标）/部件类型/已弃用/部件包/描述 + 「预览」区 + 右上「编辑部件」。Action button 为 Angular 类型，预览显示诚实占位「该类型为 Angular 部件，本分支预览仅支持 react-1 类型」（占位三态既有语义，不暗示「即将支持」）〔截图〕。
- **编辑器往返**：详情页「编辑部件」→ 跳 `/widgets/editor/:id`（M9 编辑器路由可达）；编辑器对 Angular 类型显示诚实占位「该类型是 Angular widget（无 react-1 运行时标记），不支持直接编辑源码。要走派生入口或派生对话框模块。」〔截图〕。往返链成立，未对 system 类型做任何写入。
- **bundle 新建**：`/resources/widgets-bundles`（28 个 system 包，列 创建时间/标题/系统）→「创建新部件包」对话框（标题/描述/图片 URL）→ 填「v3v walk bundle」保存 → toast「部件包已保存」→ 自动进入 bundle widgets 管理页（空态「该部件包还没有部件类型」+「添加部件类型」）〔截图〕。
- **bundle widgets 管理（tenant 类型成员）**：「添加部件类型」对话框按名称搜索（服务端过滤，textSearch=action button）→ 选「Action button」→ 行入列（fqn `action_button` + `latest` 徽标 + 上移/下移/移除手柄）→ 工具栏「保存」→ toast「包内部件已保存」→ API 复核（见步骤 V1-1 的对照实验）。编辑模式 → 「移除部件」→ 保存 → API `GET /api/widgetsBundle/{id}/widgetTypes` 复核 membership 为 `[]`，**移除链落库成立**。
- **bundle 删除**：API DELETE → 200，fixture 清零。
- **V1-1 缺陷（登记，Major，后端语义）**：bundle 添加 **system** widget 类型成员时，UI 链路（添加 → 行在列 → 保存成功 toast）全部正常，但落库静默失败。对照实验（curl 直发，绕开 UI）：`POST /api/widgetsBundle/{id}/widgetTypes` body `["<systemTypeId>"]` 返回 200，回读 membership `[]`；`POST .../widgetTypeFqns` body `["action_button"]` 同样 200 后丢；同 bundle 同请求发 tenant 自建类型 id 则回读成功。即后端对 tenant bundle × system 类型的成员关系**两通道均静默丢弃（不报错）**。fork 简报约定后端零改动，此为上游端点行为，登记待后端裁决/X 波跟进〔网络请求探针 + API 对照实验〕。
- **V1-2 观察（登记，Minor，接线缺口）**：bundle 新建/编辑对话框图片字段为「临时的纯 URL 输入——图片库选择器随图片库波次落地」过渡实现（`dialogs.tsx:126-128` defaultMessage 自述），图片库（2C 波）已交付 `gallery-image-input` 而未回接本对话框。属 M11 自家页面（不在 §0 v1 回改防蔓延清单），归 X 波。

### 步骤 2 — widget type 导出→改名导入 round-trip ✅
- **导出**：列表行操作「导出部件类型」→ 确认对话框「将 1 个部件类型 导出为可下载的文件吗？」+ 勾选「嵌入部件图片和资源（自包含导出）」〔截图〕→ 确认 → 下载 `Action button.json`（11KB）。JSON 结构：`fqn/name/deprecated/scada/descriptor（type/sizeX/sizeY/resources/templateHtml/templateCss/controllerScript/settingsDirective/hasBasicMode/defaultConfig）/image（tb-image; 链接）/tags/resources[]`——自包含资源随行。
- **改名导入**：JSON 改 `name=fqn=v3v walk action button copy` → 工具栏「导入部件类型」→ 对话框明示通道语义「文件中的 fqn 与现有部件类型一致时会更新该类型（updateExistingByFqn），否则创建新类型」→ DataTransfer 注入文件 → 导入 → API 复核 `v3v_walk_action_button_copy` 落库（tenant 域，id `dfcf2120-a8fa-11f1-bf08-2be356855d51`）。
- **双份目击**：`?textSearch=action button` → 两行：`Action button`（系统 badge，无删除按钮）+ `v3v walk action button copy`（tenant，行操作多 编辑/删除）〔截图〕。
- **清理**：API DELETE fixture → `textSearch=v3v` total=0。

### 步骤 3 — 图片上传/信息/embed/导出 ✅
- **画廊双模式 + system 开关**：`/resources/images` 空态（tenant 无图）；「列表视图/网格视图」切换 +「包含系统图片」开关 → 开启后 715 张（含缩略图预览、分辨率/大小/系统列、共 72 页）〔截图〕；行操作五件：下载图片/导出图片为 JSON/嵌入图片/编辑图片/删除图片。
- **上传**：「上传图片」→ 对话框「标题」预填文件名 `v3v-walk-image.png`（spec「title 预填文件名」）→ DataTransfer 注入 8×8 PNG（canvas 生成）→ 上传 → 列表首行 v3v-walk-image.png（8×8、106 B、系统列 `-`）〔截图〕。
- **信息编辑**：「编辑图片」对话框展示 媒体类型/分辨率/大小/链接（`/api/images/tenant/v3v-walk-image.png`）+ 标题输入 → 改「v3v walk image renamed」保存 → toast「图片已保存」→ API 复核 title 已变。
- **embed 公链**：「嵌入图片」对话框：「公开（对未授权用户可用）」开关（on）+ 公链 `/api/images/public/<publicResourceKey>` + 嵌入代码 `<img src=… alt="v3v walk image renamed" />`（可复制）〔截图〕；**curl 无 token GET 公链 → 200**（免登真实生效）。
- **导出 JSON**：行「导出图片为 JSON」→ 下载文件含 `link/title/type/subType/resourceKey/fileName/publicResourceKey/mediaType/data（base64）/public` 全字段。

### 步骤 4 — 被引用删除流 ✅
- **造引用**：API 建 widget 类型 fixture `v3v_in_use_probe`，`image` 字段 = `tb-image;/api/images/tenant/v3v-walk-image.png`（后端 images-in-use 检测的引用来源）。
- **删除拦截**：UI 删除图片 → 确认框「请注意，确认后图片将无法恢复」→ 确认后弹**「图片被其他实体使用」**对话框：「图片“v3v walk image renamed”未被删除，因为它被以下实体使用：widget 类型 → v3v in use probe（名称为链接）」+ 取消/仍然删除（红）〔截图〕。
- **force 删**：点「仍然删除」→ API 复核 images `textSearch=v3v` total=0（图片已删）；引用方 `image` 字段保留原 tb-image 链接、链接 GET → **404**（悬空引用的数据层真相）。
- **「引用处空图占位」注记（诚实）**：fork widget 类型列表/详情页不渲染类型 image 缩略图（列表列组无预览图列、详情页无 image 位），UI 层空图占位无可目击点；悬空引用由 API 404 佐证。fixture 类型随后 API 删除（200）。

### 步骤 5 — SCADA 符号上传→编辑器→四 tab→保存链 ✅
- **上传预填**：`/resources/scada-symbols`（isScada 文案形态：上传 SCADA 符号/从 JSON 导入 SCADA 符号/包含系统符号）→ 上传自建合法 SVG（`xmlns:tb` 命名空间 + `<tb:metadata>` CDATA JSON（title=v3v walk symbol，widgetSize 3×3，空 tags/behavior/properties）+ 两个 `<g tb:tag="bg"/"lamp">`）→ 对话框标题预填 **SVG metadata 内的 title「v3v walk symbol」**（非文件名，解析管线生效）→ 上传 → **自动跳编辑器** `/resources/scada-symbols/tenant/v3v-walk-symbol.svg`。
- **画布**：SVG 渲染（图形/XML 双模式切换）+ tag 虚线高亮框〔截图〕；hover `lamp` 圆 → antd Popover 面板「g lamp｜修改标签｜移除标签｜f(x) click」（DOM 探针抓到 Popover 文本）——tag 加/删/改名/click action 入口同源在场。
- **四 tab 各改一项**：
  - 标题 tab：描述填「v3v walkthrough description」；标题/搜索标签/宽度(3)/高度(3) 字段在场；
  - 标签 tab：SVG 结构 tag 候选 chip「+ bg / + lamp」+ 引导文案「暂无标签。在画布中悬停元素可添加标签。」→ 点「+ lamp」入列 → tag 卡片含 **状态渲染函数**（CodeMirror）/**点击动作函数**（CodeMirror）/**id** 预填 → CM 输入 `return 1;`〔截图〕；
  - 行为 tab：「添加行为」→ 表单 名称/类型(值 Value)/值类型(布尔)/True 标签/False 标签/状态标签/默认设置（JSON）→ 名称填 v3vLabel，其余默认；
  - 属性 tab：「添加属性」→ 表单 ID（自动生成 `property_1`）/名称/类型(text)/必填/默认值。
- **保存落库复核**：「保存」toast → `GET /api/images/tenant/v3v-walk-symbol.svg` 回读 SVG 源：metadata JSON 回写 `description: "v3v walkthrough description"`、`tags: [{tag:"lamp", stateRenderFunction:"return true;"}]`、`behavior: [{id…, name:"v3vLabel", type:"value", valueType:"BOOLEAN", defaultGetValueSettings…}]`、`properties: [{id:"property_1", type:"text"}]`，`return true;` 字面量随 `tb:metadata` CDATA 进入 content——**getContent + metadata 回写 → updateImage 保存链 API 证实**。

### 步骤 6 — 静态预览 + 从符号创建 Widget ✅
- **预览**：工具栏「预览」→ 画布切预览态：「返回编辑」按钮 + 「按属性尺寸渲染（3 × 3 格）」标签（metadata widgetSize 驱动）+ 符号静态渲染（蓝框矩形 + 黄圆完整呈现）+ 右下缩放按钮对 + 保存禁用〔截图〕。勘误口径（活体模拟降为静态预览）与实现一致。
- **从符号创建 Widget**：工具栏「从符号创建 Widget」→ 对话框「Widget 名称 + 加入 Widget 包（可选，默认不加入任何包）」→ 填「v3v walk symbol widget」→ 创建 → API 复核 `v3v_walk_symbol_widget` 落库（id `591e3ef0-a8fe-11f1-bf08-2be356855d51`，克隆模板 + 符号引用注入）。

### 步骤 7 — readonly（TENANT × system 符号）✅（复验）
- 列表层：「包含系统符号」开启后 system 行（HP Wind turbine，系统 badge）行操作仅 下载/导出 JSON/详情 三件——**无删除**；tenant 行为四件（含删除）〔AX 快照对照〕。
- 编辑器层：进 `/resources/scada-symbols/system/wind-turbine-hp.svg`（风机图形正常渲染）→ DOM 探针：**保存 disabled=true、替换 SVG disabled=true、表单输入 5 个全 disabled**（标题/描述/搜索标签/宽度/高度）〔截图〕。下载/预览/从符号创建 Widget 保留可用（只读复制类操作，合理）。

### 步骤 8 — JS 库 + 资源文件库 ⚠️（JS 新建受阻 V8-1）
- **JS 库列表**：`/resources/js-library`——搜索 + 「全部脚本类型」subType 过滤 + 列（创建时间/标题/脚本类型/系统）+ system 扩展 `gateway-management-extension.js` 在列（无 tenant 资源时空态干净）〔截图〕。
- **JS MODULE 新建**：列「新建脚本」→ 对话框（标题/脚本类型 选择器 默认扩展/上传区）→ 切「模块」→ **「代码」CodeMirror 编辑器出现** → 标题「v3v walk module」+ CM 输入 `return 1;` → 保存 → **无新行**。fetch 钩子抓到失败响应：`POST /api/resource/upload` → **400 {"message":"Resource data should be specified"}**——前端把手写 content 走了 multipart 上传专用端点且未带 data，**UI 新建 MODULE 当前不可用**。对照实验：curl `POST /api/resource`（JSON，data=base64）创建同内容成功——后端 JSON 通道在，前端走错通道。**V8-1 登记（Major，前端通道错配，归 X 波 TDD 修复）**。
- **下载/删除（以 API 建的 fixture 走 UI 链）**：行 `v3v walk module.js` 下载按钮 → 下载文件内容 `return 1;` 与创建一致 ✅；more 菜单（编辑脚本/删除）→ 删除 → 确认框「确定要删除脚本…不可恢复」→ 列表回单行（system）✅。
- **资源文件批量上传**：`/resources/library`（302 条 system LwM2M 模型）→「上传资源」→ 对话框 input `multiple` 属性在、「可一次选择多个文件」→ 注入 2 个 txt → 上传 → 列表新增 v3v-res-a/v3v-res-b（资源类型「通用」、系统 `-`，共 304）〔截图〕。**V8-2 缺陷（Minor）**：结果 toast 文案「(ok) 项成功，(fail) 项失败」——i18n 模板占位符 `{ok}/{fail}` 未注入值。
- **类型过滤**：资源类型选择器（LwM2M 模型/PKCS #12/JKS/通用）→ 选「通用」→ URL 写 `?resourceType=GENERAL`，列表只剩 2 行 fixture ✅。
- **批量删除**：全选 → 「删除所选」→ 确认框 → 列表空态「暂无资源」→ API 复核 GENERAL total=0 ✅。

### 步骤 9 — scadaFirst 参数透传（editors §3.2 缺口行回写依据）✅（按裁决口径）
- **scada 布局载体**：API 建 fixture 仪表盘「v3v walk dashboard」（列表页无 UI 新建入口——非 M11 范围既有事实）→ 编辑器 manage-layouts 对话框（布局类型 默认/分栏（左 + 右）/SCADA）→ 选 SCADA（单选 onChange 即保存并关闭，`manage-layouts.tsx` saveMode 语义）→ 仪表盘保存 → API 复核 `configuration.states.default.layouts.main.gridSettings.layoutType = "scada"`、`columns: 24`（fetch 钩子抓保存 payload 确认）。
- **两路请求取证**：scada 布局下点工具栏「添加 widget」→ `performance.getEntriesByType('resource')` 抓到：
  - `/api/widgetTypes?pageSize=100&page=0&scadaFirst=true`
  - `/api/widgetsBundles?pageSize=100&page=0&scadaFirst=true`
  两路请求均带 `scadaFirst=true` ✅。
- **类目置顶目击（受限）**：抽屉「选择 widget 类型」分组按 registry 字母序（Alarm widgets / Analogue gauges / Cards / 通用 / Input widgets…），**无 scada 类目**——M7 抽屉数据源为 registry-only（编辑器域既有事实），scada 符号类型不在 registry，「置顶可见」无可承载。**登记口径（主会话裁决照抄）**：参数透传机制已交付；「scada 类目置顶可见」受 M7 抽屉 registry-only 数据源限制，完整目击待抽屉数据源改造——editors spec 回写按此措辞。

### 步骤 10 — 仪表盘内符号实例边界（editors §6 边界行回写依据）✅（如实修订）
- **实例入盘**：抽屉搜索 tenant 自建类型无果（registry-only 不含自建类型，与步骤 9 同源限制）→ 改以 API 注入：`configuration.widgets["v3v-symbol-instance"] = {typeFullFqn: "tenant.v3v_walk_symbol_widget", config…}` + 布局占位 {row:0,col:0,sizeX:6,sizeY:6} → 保存 → 编辑器刷新后实例落格。
- **占位态渲染（§3.8 渲染器缺口实测）**：符号实例在画布渲染为诚实占位「暂不支持 — 该部件暂未支持（Angular 部件），将在后续版本提供」+ fqn 徽标 `tenant.v3v_walk_symbol_widget`（克隆自 system.scada_symbol 的 descriptor 为 Angular 形态，占位三态语义正确，不暗示「即将支持」）〔截图〕。
- **配置面板边界**：点选实例 → 配置面板五分组「数据/外观/Widget 卡片/操作/布局」全通用表单（数据源「添加数据源」、分页大小、布局 spinbutton 等），**无换符号（scada-symbol-input）入口、无绑设备/绑对象专用表单、无任何 SVG 结构编辑入口**〔截图〕。代码探针：`basic-config.tsx:8-9` 注释明示「future scada-symbol basic editor would register against, spec example: targetDevice + symbol pick + per-object binding」——**注册位已预留、专用编辑器未实现**。
- **回写口径**：「不能改 SVG 结构」成立可勾（全编辑器无 SVG 编辑路径）；「只能换符号/绑设备/绑对象」在 fork 当前**无可承载（未交付）**，editors spec §3.6 边界行按实际目击回写并登记。
- **清理**：删除仪表盘/符号 widget 类型/符号图（均 200），复核见 §5。

### 步骤 11 — 横切（§3.7）✅
- **i18n**：DOM 扫描（key 模式 `pages.*`/`resources.*`/`editor.*`/`scada.*` 正则匹配 body 文本）×3 页（widget 类型列表/资源库/SCADA 编辑器）零裸 key；全程中文文案目击（菜单族/列表列名/对话框/toast）。`check-locale` 本 worktree 实测 PASS（零红）。反例（已登记 V8-2）：批量上传结果 toast 占位符 `(ok) 项成功，(fail) 项失败` 未注入。
- **主题**：SCADA 编辑器页（含画布区）inline style 色值扫描 **零命中**；画布高亮色代码层核查 `symbol-editor-canvas.tsx:84,159-161` 全走 `theme.useToken()`（`colorBgContainer`/`colorText`/`colorBorder`）——M10 既定口径（DOM 所见内联色值若出现为 token 运行时解析值，非硬编码字面量）。
- **门禁**：check-locale 本地实测 PASS；lint/tsc/vitest 数字引用 3G 波（1885 例全绿 / lint 0 error 30 warnings / tsc 0）——本 worktree node_modules junction 未挂载，全量门禁无法本地复跑，以 3G 波实测为准。
- **自动化衔接**：见 §6 #12 登记 comment。

## 2. 缺陷与观察项登记（修复归 X 波，本波只登记）

| 编号 | 级别 | 摘要 | 复现 | 证据 | X 波核查/修复结论 |
|---|---|---|---|---|---|
| V1-1 | Major（后端语义） | TENANT bundle 添加 SYSTEM widget 类型，保存返回成功但 membership 静默丢弃 | `POST /api/widgetsBundle/{bundleId}/widgetTypes` body `["<system widgetTypeId>"]` → 200；`GET /api/widgetsBundle/{bundleId}/widgetTypes` 回 `[]`；fqn 通道 `["action_button"]` 同丢；同 bundle 发 tenant 类型 id 则成功回读。UI 侧：添加→保存 toast 成功→刷新后成员消失 | curl 对照实验 + UI 网络探针（步骤 1） | **上游语义，非 fork 回归**：`WidgetsBundleController.java:144-151` 用 `widgetTypeExistsByTenantIdAndWidgetTypeId(currentUserTenantId, id)` 过滤候选，DAO `JpaWidgetTypeDao.java:85-87` `existsByTenantIdAndId` 是严格 `tenant_id = ? AND id = ?`——system 类型（NULL tenant）对 TENANT 调用者必为 false 被静默丢弃；fqn 通道同理（`WidgetTypeServiceImpl.java:250-253` `findWidgetTypeIdsByTenantIdAndFqns` tenant 严格解析）；membership 写入链 `WidgetTypeServiceImpl.java:222-247`。fork 未改动该链（git 记录仅上游导入期提交）。前端已诚实适配：TENANT 管理页添加选择器 `tenantOnly=true` + 对话框提示「系统部件类型不能加入自有部件包」（§3.1 行已注记） |
| V1-2 | Minor（接线缺口） | bundle 新建/编辑对话框图片字段仍为过渡纯 URL 输入，未接 2C 已交付的 gallery-image-input | 打开「创建新部件包」→ 图片 URL 字段为文本输入（过渡提示文案在场） | `ui-antd/src/pages/resources/widgets-bundles/list/dialogs.tsx:126-128` + 截图 | **X 波已修**：对话框图片 Form.Item 换挂 `GalleryImageInput`（缩略图 + 图库选择 + 链接录入），值仍是图片链接字符串（图库选择带上游 `tb-image;` 前缀，旧纯 URL 读回不变）；过渡提示文案及 locale 键移除（zh/en）；页面级单测断言控件在场（`widgets-bundles/list/index.test.tsx`）。真机复验归主会话 |
| V8-1 | Major（前端通道错配） | JS 库「新建脚本（模块）」保存走 `POST /api/resource/upload`（multipart 专用）且未带 data → 400「Resource data should be specified」，UI 新建 MODULE 不可用 | JS 库 → 新建脚本 → 脚本类型=模块 → 标题+代码 `return 1;` → 保存 → 无新行；钩子抓到 400。后端 JSON 通道 `POST /api/resource`（data base64）实测可用 | fetch 钩子响应体 + curl 对照（步骤 8） | **X 波已修（机理定稿）**：antd 表单 `validateFields()` 只回传已注册 `<Form.Item name>` 字段，CodeEditor 内容镜像在无名渲染项里，`values.content` 恒 `undefined` → `new File([''])` 空 multipart part → 后端 `ResourceDataValidator.java:52-53` 400；编辑路径同根因（`values.content !== content` 恒真会用 undefined 覆盖内容）。修复：service 层新增 `jsModuleSaveRequest`（title/JS_MODULE/MODULE/`title + '.js'`/base64 data/媒体类型 descriptor），新建与编辑都走 JSON 通道 `POST /api/resource`（页面读 CodeEditor 的 content state），EXTENSION 文件通道不动；service + 页面单测钉住 JSON 通道。真机复验归主会话 |
| V8-2 | Minor（i18n） | 资源批量上传结果 toast 模板占位符未注入：「(ok) 项成功，(fail) 项失败」 | 资源库批量上传 2 文件 → 观察顶部 toast | 步骤 8 截图 | **X 波已修（机理定稿）**：locale 模板占位符为 `{fail}`，上传 toast 实参键误传 `{ ok, failed }`——react-intl 对缺失键原样输出 `{fail}`（同文件批量删除 toast 传 `fail: summary.failed` 未中招）。修复：实参键对齐 `{ ok, fail: failed }`（zh/en 模板不动），页面单测断言注入后文案「2 项成功，0 项失败。」且无裸 `{fail}`。真机复验归主会话 |

## 3. editors spec 两条解锁的回写结论（细节见 spec 本体）

1. **editors §3.2 缺口行（scada 置顶）**：参数透传已交付（两路 `scadaFirst=true` 实测）；「scada 类目置顶可见」受 M7 抽屉 registry-only 数据源限制（fork registry 无 scada 类目），完整目击待抽屉数据源改造——缺口行按此修订，不冒勾。
2. **editors §3.6 边界行（符号实例）**：「不能改 SVG 结构」真机成立（配置面板五分组零 SVG 编辑入口 + 全编辑器无 SVG 编辑路径）；「换符号/绑设备/绑对象」在 fork 当前无承载（专用 basic editor 注册位预留未实现），符号实例以占位三态渲染（§3.8 渲染器缺口实测）——边界行按实际目击回写。

## 4. §3.7 数据保全（现场清理清单）

| fixture | 终态 | 复核 |
|---|---|---|
| widget 类型 v3v walk action button copy（`dfcf2120`） | API DELETE 200 | `textSearch=v3v` total=0 |
| widget 类型 v3v probe type（对照实验用） | API DELETE 200 | 同上 total=0 |
| widget 类型 v3v in use probe（引用流 fixture） | API DELETE 200 | 同上 total=0 |
| widget 类型 v3v walk symbol widget（`591e3ef0`，步骤 6/10 载体） | API DELETE 200 | 同上 total=0 |
| bundle v3v walk bundle（`29b85540`） | API DELETE 200 | bundle 列表无 |
| 图片 v3v-walk-image.png（后改名 v3v walk image renamed） | UI 被引用流 force 删 | `textSearch=v3v` total=0 + 悬空链接 404 |
| SCADA 符号 tenant/v3v-walk-symbol.svg | API DELETE 200 | images total=0 |
| JS MODULE v3v walk module.js | UI 删除 | 列表回单行（system） |
| 资源文件 v3v-res-a/v3v-res-b | UI 批量删除 | GENERAL total=0 |
| 仪表盘 v3v walk dashboard（`9b0c2520`） | API DELETE 200 | GET → 404 |
| 本地临时文件（导出 JSON/SVG/PNG/base64/dash 快照） | 已删 | Downloads 目录无 v3v 残留 |

system 资源零改动：system widget 类型/bundle/图片/JS 扩展/LwM2M 资源仅只读目击与只读导出（导出文件为下载副本不入库）；system 符号仅在编辑器只读打开。

## 5. #12 自动化衔接登记

GitHub issue #12 追加 M11 回归项 comment（资源五列表 CRUD 主路径、引用删除流、scadaFirst 参数、SCADA 编辑器保存链），URL 见简报 §5。
