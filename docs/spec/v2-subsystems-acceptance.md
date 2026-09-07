# v2 八子系统独立页验收 spec（活文档）

> 状态：**M11 / M12 / M13 / M14 / M15 段全部定稿**（M11 段 2026-09-05 随 M11 开工落盘；M12 段 2026-09-05 随 M12 开工补定；M13 段 2026-09-06 随 M13 开工补定；M14 段 2026-09-06 随 M14 开工补定；M15 段 2026-09-07 随 M15 开工补定；依据 [#16](https://github.com/KMakise123/thingsboard/issues/16) 范围定案 + ui-ngx 4.4.0 源码侦察）。
> 路线依据：CONTEXT.md「资源库（五合一）」词条；#14 定案满足 M11 进入条件。验收原则继承 #9/#15：**等价为底线、允许增量增强、禁止删减 TB 已有操作**、分账三档（等价项勾选 / 行为契约勾选 / 能力级增强只登记）。
> 分工：本 spec = 人工验收载体；自动化回归项归 [#12](https://github.com/KMakise123/thingsboard/issues/12) 基线扩充（§3.8 自动化衔接条）。

## 0. 一句话定义（M11）

资源库五合一（widget 类型库 · 图片库 · SCADA 符号库 · JS 库 · 资源文件库）+ SCADA 符号编辑器页，对 ui-ngx 对应页面全部已有操作逐项等价可用；编辑器内符号实例「只能换符号/绑设备/绑对象、不能改 SVG 结构」边界经走查证实；解锁 `v2-editors-acceptance.md` 两条挂起验收。

## 1. 通用边界（五件套共守）

- 路由族 `/resources/**`，菜单组 Resources（ui-ngx 顺序：widget types → widgets bundles → images → scada symbols → javascript library → resources library，锚点 `menu.models.ts:867-876`）；页面访问 `SYS_ADMIN + TENANT_ADMIN`（ui-ngx `admin-routing.module.ts:78` 同口径），二进制读接口 CUSTOMER_USER 可用属后端既有权限，前端不设额外拦截。
- system 资源判定 = tenantId NULL_UUID（`resource.models.ts:153-154`）；TENANT 对 system 资源只读（列表可见可下载，编辑/删除禁用）。
- 删除被引用资源统一流程：先 `force=false` 删，后端 400 带 references → 弹「被引用」对话框（列引用实体）→ 确认后 `force=true`（锚点 `image-gallery.component.ts:496-550`、`TbResourceController.java:420` 返回 TbResourceDeleteResult）。
- 列表页沿 v1 既有范式：URL 承载分页/排序/搜索（`url-state.ts` 范式）、ProTable + useQuery 喂数、批量操作走 `useBatchRun` + `BatchProgressModal`。
- 上传大小上限取 authState `maxResourceSize`（`js-resource.component.ts:48`）；批量上传分批 100（`resource.service.ts:70-110`）。
- 导出/导入对齐 `import-export.service.ts`：widget 类型导出可选 includeResources、bundle 导出 inlineImages=true、图片导出为 JSON。
- iot-hub 相关入口（widget 列表「Add from IoT Hub」等）不在 M11——iot-hub 缓做（#16/#17），登记不实施。

## 2. 里程碑（编号接编辑器 M7–M10）

| 段 | 内容 | 验收范围 | 依赖 |
|---|---|---|---|
| M11 | 资源库五件套 + SCADA 符号编辑器页 | §3 全部 + 解锁 editors spec 两条 | #14 定案（已闭票满足） |
| M12 | 通知族独立页 | §4（开工补定） | M11 |
| M13 | Edge + OTA | §5（开工补定） | M12 |
| M14 | 计算字段独立页 + VC 独立页 + settings 七件 + 密码策略页 | §6（已定稿 2026-09-06） | M13 |
| M15 | home 首页 + 匿名公共仪表盘 + 收口 | §7（已定稿 2026-09-07） | M14 |

## 3. M11 资源库五件套操作面

### 3.1 widget 类型库（对齐 `pages/widget` 全家）

- [x] widget types 列表：列 createdTime/name/bundles/widgetType(system)/deprecated，搜索/分页/排序，行点击进详情（锚点 `widget-types-table-config.resolver.ts:80-91,216-221`）〔M11 走查 ✅：全列渲染 + 共 684 个分页 + 搜索写 `?textSearch=` 过滤生效；排序以列头控件在场目击，逐列排序未逐一驱动〕
- [x] deprecated 过滤开关；system 列（SYS 且含 system 类型时显示）〔M11 走查 ✅：segmented 全部/当前/已弃用 三态在场；system badge 列目击〕
- [ ] 新建 widget 类型：模板类型选择对话框（静态 widgetType 枚举，锚点 `select-widget-type-dialog.component.ts`）→ 进编辑器（M9 已交付）〔未勾（3V）：走查作业单未覆盖新建流，本波未正面驱动；M15 复核：实现在役——`pages/widgets/editor/new-dialog/index.tsx`（`new-dialog.test.tsx`）+ widget-types `select-template-dialog.tsx` 双组件与单测在场〕
- [x] widget type 详情页：预览渲染 + 元信息 + 编辑入口（跳 `/widgets/editor/:id`）〔M11 走查 ✅：元信息行 + 全限定名徽标 + 「编辑部件」跳 M9 编辑器路由可达；预览对 Angular 类型显示诚实占位（react-1-only 语义，占位三态既有边界）〕
- [x] 导入/导出：单类型导出（含可选 includeResources）、导入走 `updateExistingByFqn` 通道、批量导出 zip（锚点 `widget-types-table-config.resolver.ts:93-115,231-246`）〔M11 走查 ✅：导出确认框含「嵌入部件图片和资源（自包含导出）」开关、导出 JSON 结构完整（fqn/descriptor/image/resources）；改名导入落库 + 列表 system/tenant 双份目击 + updateExistingByFqn 通道文案目击；**批量 zip 导出未驱动**（按钮在场）〕
- [x] widgets bundles 列表：列/搜索/分页、新建/编辑/删除/导入/导出（锚点 `widgets-bundles-table-config.resolver.ts:68-130`）〔M11 走查 ✅：28 system 包 + 新建对话框（标题/描述/图片 URL）+ 删除 API 复核；bundle 导入/导出按钮在场未驱动；图片字段仍过渡纯 URL 输入未接 gallery-image-input → 缺陷 V1-2 登记（X 波）〕〔**X 波修复后复测通过（主会话真机复验 ✅）**：bundle 新建/编辑对话框图片字段已换挂 wave-2C `GalleryImageInput`（缩略图 + 图库选择 + 链接录入），值语义不变（仍是图片链接字符串，图库选择带上游 `tb-image;` 前缀），过渡提示文案移除，页面级单测断言控件在场；真机目击新建对话框「无图片/从图片库浏览/设置链接」控件形态〕
- [x] bundle widgets 管理页：bundle 内 widget 集合增删（add widget fqn / 移除），排序保存（锚点 `widgets-bundle-widgets.component.ts:150-204`）〔M11 走查 ✅（限 tenant 类型成员）：添加对话框（服务端搜索）→ 入列（fqn/latest 徽标 + 上移/下移/移除手柄）→ 保存 toast + API 复核 membership → 移除保存 API 复核空；排序保存契约由 manage-layouts 同型单测覆盖、拖拽排序未真机驱动。**system 类型成员两通道（id/fqn）保存 200 但后端静默丢弃 → 缺陷 V1-1 登记（Major，后端语义，X 波/后端裁决）**〕〔**X 波核查结论：上游后端语义，非 fork 回归**——tenant bundle 不含 system 类型成员（源码锚点：`WidgetsBundleController.java:144-151` 候选按 `widgetTypeExistsByTenantIdAndWidgetTypeId` tenant 严格过滤 + `JpaWidgetTypeDao.java:85-87` `existsByTenantIdAndId` = `tenant_id = ? AND id = ?`，fqn 通道 `WidgetTypeServiceImpl.java:250-253` 同为 tenant 严格解析），前端已过滤适配：TENANT 添加选择器 `tenantOnly=true` + 对话框提示「系统部件类型不能加入自有部件包」（zh/en），后端不改。**主会话真机复验 ✅**：fixture 包管理页添加选择器提示在场、搜索系统类型名「action」零结果、网络面板证 `tenantOnly=true`〕
- [x] 编辑器入口一致性：列表/详情均可进 M9 编辑器；编辑器保存后列表失效刷新〔M11 走查 ✅（入口半边）：详情「编辑部件」跳 `/widgets/editor/:id` 目击；Angular 类型在 M9 编辑器为诚实占位（无 react-1 运行时标记）；「编辑器保存后列表失效刷新」未驱动〕

### 3.2 图片库（对齐 `shared/components/image`）

- [x] 画廊双模式 list/grid + 滚动网格，分页/搜索/排序写 URL query（锚点 `image-gallery.component.ts:216-242,306-326`）〔M11 走查 ✅：列表视图/网格视图切换在场、搜索框 + 分页（715 张 72 页）目击；同族资源库列表页 URL query 写入（`?resourceType=GENERAL`）实测；图片页自身搜索提交未单独驱动〕
- [x] 上传（multipart，title 预填文件名）+ 失败处理；maxResourceSize 上限提示〔M11 走查 ✅（半）：上传 title 预填文件名实测；失败处理/超限路径未构造——maxResourceSize 上限随 auth 波接入（修订记录已登记，本行不再单列）〕
- [x] 图片信息编辑（title）+ 查看（原始尺寸/链接）+ 下载 + 导出 JSON + 导入（锚点 `image-dialog.component.ts:95`、`image.service.ts:183-208`）〔M11 走查 ✅：信息对话框（媒体类型/分辨率/大小/链接）+ title 改名保存（toast + API 复核）+ 导出 JSON 全字段下载；下载按钮在场未单独驱动、从 JSON 导入未驱动〕
- [x] embed 公链开关：设 public 后生成免登链接与嵌入代码（锚点 `embed-image-dialog.component.ts:66,90-91`）〔M11 走查 ✅：「公开（对未授权用户可用）」开关 + 公链 + 可复制嵌入代码；**curl 无 token GET 公链 200**（免登实测）〕
- [x] include system images 开关（SYS/TENANT 语义差异：TENANT 可见 system 图、只读）〔M11 走查 ✅：开关开启后 715 张 system 图 + system badge；system 行无删除操作〕
- [x] 删除含引用流：单个/批量 → 被引用对话框 → force 删除（§1 通用边界）〔M11 走查 ✅：确认框 → 「图片被其他实体使用」对话框列「widget 类型 → 引用方名称（链接）」→ 仍然删除 → API 复核已删 + 引用链接 404；批量删除通道由资源库页同款组件目击（资源文件批量删除 ✅）〕
- [ ] 选择模式 selectionMode（弹层复用形态，供 SCADA 预览等调用方嵌入）〔未勾（3V）：走查作业单未覆盖弹层复用形态，本波未驱动；M15 复核：实现在役——`components/images/image-gallery.tsx`/`gallery-image-input.tsx` selectionMode prop + 双测试文件在场〕

### 3.3 SCADA 符号库 + 编辑器页（对齐 `pages/scada-symbol`，最重组件）

- [x] 符号库列表：画廊 isScada 形态（文案/行为切换），上传解析 SVG metadata 预填 title，上传成功跳编辑器（锚点 `image-gallery.component.ts:657-719`、`upload-image-dialog.component.ts:99-114`）〔M11 走查 ✅：上传 SCADA 符号/从 JSON 导入/包含系统符号 isScada 文案目击；上传对话框 title 预填 SVG metadata 内 title（非文件名）；上传成功自动跳 `/resources/scada-symbols/tenant/:key` 编辑器〕
- [x] 编辑器路由 `/resources/scada-symbols/:type/:key`：加载失败跳回列表（resolver 语义，锚点 `admin-routing.module.ts:52-68`）〔M11 走查 ✅（路由半边）：tenant/system 双路由加载渲染正常；加载失败跳回列表路径未构造〕
- [x] 画布：SVG 结构编辑（tag 虚线高亮框、hover 高亮、重叠元素错位提示）、缩放平移（限域）、显示/隐藏元素切换、svg/xml 双模式（锚点 `scada-symbol-editor.component.ts`、`scada-symbol-editor.models.ts:207-262`）〔M11 走查 ✅：SVG 渲染 + tag 虚线高亮框目击 + hover 高亮目击；图形/XML 双模式切换在场；显示/隐藏元素开关、缩放按钮对在场——重叠错位提示未构造、缩放限域数值未实测〕
- [x] tag 管理：画布 hover 加/删 tag 面板、tag 列表、tag 级 stateRenderFunction 与 click action 编辑（锚点 `scada-symbol-tooltip.components.ts`、`metadata-tags.component.ts`）〔M11 走查 ✅：hover `lamp` 元素弹 antd Popover（tag 名 + 修改标签/移除标签 + f(x) click action 入口）；标签 tab 候选 chip 加 tag + tag 卡片（状态渲染函数 CodeMirror 输入 `return 1;` 落库复核）〕
- [x] metadata 四 tab：general（title/description/searchTags/widgetSizeX/Y 1-24 校验）/ tags / behavior（value/action/widgetAction 三类 + 默认 settings 编辑器）/ properties（FormProperty 配置）（锚点 `scada-symbol-metadata.component.ts:102-148`、`scada-symbol.models.ts:151-173`）〔M11 走查 ✅：四 tab 各改一项并落库复核（描述文案/行为「值+布尔」/属性 text+自动 id/渲染函数）；widgetSize 1-24 越界校验未构造〕
- [x] 保存链：getContent + metadata 回写 SVG → `updateImage` → title 变更追加 `updateImageInfo` → 重载（锚点 `scada-symbol.component.ts:211-249`）〔M11 走查 ✅：保存 toast + curl 回读 SVG——metadata JSON（description/tags/behavior/properties）与渲染函数字面量全部回写进 CDATA〕
- [x] 预览模式（**静态形态**）：符号 SVG 按 metadata 尺寸/内边距渲染 + 缩放查看（锚点 `scada-symbol.component.ts:255-298`）。**勘误（2026-09-05）**：原写「内嵌仪表盘活体模拟」——事实核查 fork widget 注册表无 scada 符号运行时渲染器（M7 占位三态覆盖），活体预览无承载，降为静态预览；活体升级随 §3.8 渲染器缺口触发〔M11 走查 ✅：「按属性尺寸渲染（3 × 3 格）」+ 静态渲染完整 + 缩放按钮对 + 预览态保存禁用〕
- [x] 从符号创建 widget：克隆 system.scada_symbol 模板 → 注入符号链接/尺寸/previewWidth → 保存 + 可选入 bundle（锚点 `scada-symbol.component.ts:406-465`）〔M11 走查 ✅：对话框（Widget 名称 + 可选入包）→ 创建 → API 复核 `v3v_walk_symbol_widget` 落库；入 bundle 分支未走（bundle 通道见 V1-1）〕
- [ ] 替换 SVG 内容（上传）+ 下载符号（锚点 `scada-symbol.component.ts:358-404`）〔未勾（3V）：替换仅在 readonly 态目击 disabled；下载符号按钮在场未驱动；M15 复核：handlers 在役——`pages/resources/scada-symbols/editor/index.tsx:257-273` 下载（downloadBlob）+ 上传替换（registered delta）+ `data-testid="scada-download"`〕
- [x] readonly 边界：TENANT 编辑 system 符号 → 只读（锚点 `scada-symbol.component.ts:486-490`）〔M11 走查 ✅（复验）：system 行无删除操作（tenant 行有）+ 编辑器保存/替换 SVG disabled + 表单 5 输入 disabled（DOM 探针）+ 截图；下载/预览/从符号创建 Widget 保留可用〕
- [ ] 行为契约：受控退出确认（dirty → 确认 Modal，沿 M10 D1 受控形态）、EditorSession 撤销（结构性操作入栈）——SCADA 画布编辑是否入撤销栈按能力级增强登记，不做硬门槛〔未勾（3V）：走查作业单未覆盖退出确认/撤销栈驱动，单测锚在（use-leave-guard + session 契约）；M15 复核：单测锚核实在场——`dashboards/editor/contract/use-leave-guard.test.tsx` + `core/editor/session.test.ts`（undo/redo 组、undone 组不合并）+ `crash-guard.test.ts`〕

### 3.4 JS 库（对齐 `js-library-*`）

- [x] 列表：resourceType=JS_MODULE 固定 + subType 过滤（EXTENSION/MODULE），列 title/subType/system（锚点 `js-library-table-config.resolver.ts:92-99,112`）〔M11 走查 ✅：「全部脚本类型」选择器 + 扩展/模块选项目击；system 扩展行（脚本类型=扩展 + 系统 badge）〕
- [x] 新建/编辑 MODULE：content 文本编辑 → 保存自动补 `.js` 文件名（锚点 `js-resource.component.ts:106-120`、`js-library-table-config.resolver.ts:121-141`）〔**未勾（3V）：缺陷 V8-1 登记（Major，前端）**——新建对话框（切「模块」后 CodeMirror「代码」编辑器在场 ✓）保存走 `POST /api/resource/upload`（multipart 专用）且未带 data → 400「Resource data should be specified」，UI 新建 MODULE 不可用；后端 JSON 通道 `POST /api/resource`（data base64）curl 实测可用，前端走错通道，归 X 波 TDD 修复；「自动补 .js」行为因此未目击〕〔**X 波修复 + 主会话真机复验 ✅（已勾选）**：MODULE 新建/编辑改走 JSON 通道 `POST /api/resource`（`jsModuleSaveRequest`：title + `.js` 文件名 + base64 data + 媒体类型 descriptor；机理=antd 表单无名渲染项不回传 `values.content` → 空 multipart part），EXTENSION 文件通道不动；service + 页面单测钉住 JSON 通道全绿。真机链：新建 `m11-x-verify-module` 模块（代码编辑器输入 `return "m11-x-verify";`）→ 保存 toast「脚本已保存」+ 列表行「模块」+ API 复核 data 逐字一致 → fixture DELETE 200〕
- [x] 上传文件 / 下载 / 删除含引用流 / 批量删除（锚点 `js-library-table-config.resolver.ts:199-331`）〔M11 走查 ✅（下载/删除半边）：行下载 → 文件内容与创建源逐字一致；more 菜单（编辑脚本/删除）→ 删除确认框 → 列表回单行；上传文件/批量删除/引用流未在本页驱动（引用流组件 resources-in-use 由 1A 共享交付、单测锚）〕

### 3.5 资源文件库（对齐 `resources-library-*`）

- [x] 列表：resourceType 过滤（LWM2M_MODEL/PKCS_12/JKS/GENERAL），列 title/resourceType/system（锚点 `resources-table-header.component.ts:32`、`resources-library-table-config.resolve.ts:83-90`）〔M11 走查 ✅：302 条 system LwM2M 模型 + 资源类型选择器四类在列 + 选「通用」后 URL 写 `?resourceType=GENERAL` 过滤生效〕
- [x] 多文件批量上传（分批 100）+ 编辑信息 + 下载（锚点 `resources-library-table-config.resolve.ts:116-149`）〔M11 走查 ✅（上传半边）：input multiple + 一次注入 2 文件 → 两行「通用」入库（API 复核 304）；**缺陷 V8-2 登记（Minor，i18n）**：结果 toast「(ok) 项成功，(fail) 项失败」占位符未注入；编辑信息/下载按钮在场未驱动；分批 100 由 useBatchRun 契约覆盖〕〔**X 波修复后复测通过（主会话真机复验 ✅）**：机理=模板占位符 `{fail}` 与实参键 `failed` 错位（react-intl 对缺失键原样输出），实参键已对齐 `{ ok, fail: failed }`，页面单测断言注入后文案全绿；真机注入 2 文件 → toast「2 项成功，0 项失败。」+ 两行入库 → fixture DELETE 200 ×2〕
- [x] 删除含引用流 / 批量删除（锚点 `resources-library-table-config.resolve.ts:207-339`）〔M11 走查 ✅：全选 → 删除所选 → 确认框 → 列表空态 + API 复核 GENERAL total=0；引用流通道走共享 resources-in-use 组件（1A 交付）〕

### 3.6 解锁 v2 editors spec 两条挂起验收

- [x] widget 选择抽屉 scada 置顶：scada 布局下抽屉请求带 `scadaFirst=true`（bundles/widgetTypes 两路 + 类目接口），scada 符号类目置顶可见（锚点 `dashboard-widget-select.component.ts:112-117,292-307`；后端参数已存在）〔验收后回写 `v2-editors-acceptance.md` §3.2 缺口行〕〔M11 走查 ✅（参数半边，2026-09-05）：scada 布局盘（API 复核 `layoutType: scada`）开抽屉，`performance` 实测两路请求 `widgetTypes`/`widgetsBundles` 均带 `scadaFirst=true`；「scada 类目置顶可见」受 M7 抽屉 registry-only 数据源限制（抽屉分组按 registry 字母序、无 scada 类目）——**登记口径（主会话裁决）**：参数透传机制已交付；置顶可见完整目击待抽屉数据源改造，editors spec §3.2 缺口行按此修订（不冒勾）〕〔**code-review 补注（2026-09-05）**：①「类目接口」第三路无承载——registry-only 抽屉本无类目取数通道（ui-ngx 类目走 iot-hub api，iot-hub 缓做），非漏做；②探针仅覆盖默认目标布局（`layouts[0]`），多布局盘用户后选 scada 布局时不带参——随抽屉数据源改造一并解决；③两路探针结果暂不消费，属临时取证机制，抽屉数据源改造时移除〕
- [x] SCADA 符号编辑器页边界走查：编辑器页可进可编辑（本 spec §3.3）+ 仪表盘内符号实例只能换符号/绑设备/绑对象、无 SVG 结构编辑入口（M7 已交付行为，本段补真机走查）〔验收后回写 `v2-editors-acceptance.md` §6 边界行〕〔M11 走查 ✅（2026-09-05）：编辑器页可进可编辑见 §3.3 各行勾账；仪表盘内符号实例以占位三态渲染（「暂不支持（Angular 部件）」+ fqn 徽标，§3.8 渲染器缺口实测）——配置面板五分组全通用表单，**无换符号/绑设备/绑对象专用表单（专用 basic editor 注册位预留未实现，`basic-config.tsx:8-9`），无 SVG 结构编辑入口 ✅**；editors spec §3.6 边界行按实际目击回写〕

### 3.7 横切（M11）

- [x] i18n：`pages.resources.*` 域 zh/en key 全等（check-locale 门禁）+ 菜单 key 双语〔M11 走查 ✅：菜单族/六页/编辑器 chrome 全程中文无裸 key（DOM key 模式扫描 ×3 页零命中）+ check-locale 本地复跑 PASS；反例登记 **V8-2**（批量上传 toast 占位符未注入，X 波已修——实参键对齐 `{fail}`，单测断言注入文案；主会话真机复验 ✅：toast「2 项成功，0 项失败。」）〕
- [x] 主题：零内联色值，颜色全走 antd token；SCADA 画布高亮色同样走 token〔M11 走查 ✅：SCADA 编辑器页 inline style 色值扫描零命中；画布高亮色 `symbol-editor-canvas.tsx` 全走 `theme.useToken()`（colorBgContainer/colorText/colorBorder）——沿 M10 口径（token 运行时解析值非硬编码字面量）〕
- [x] 自动化衔接：M11 回归项（列表 CRUD 主路径 + 引用删除流 + scadaFirst）登记 #12 扩充（comment 留痕）〔M11 走查 ✅：#12 登记 comment 已发（URL 见 `v2-m11-implementation-brief.md` §5）——范围：资源五列表 CRUD 主路径、引用删除流、scadaFirst 参数、SCADA 编辑器保存链〕
- [x] 数据保全：自建资源/符号/widget/bundle 终态全 DELETE，system 资源零改动〔M11 走查 ✅：11 类 fixture 全 DELETE（逐项 API 复核 total=0/404，清单见 `v2-m11-browser-walkthrough.md` §4）；system 资源仅只读目击与只读导出〕
- [x] 门禁：lint 0 error（基线 warnings 数只降不升）/ tsc / vitest 全绿 / check-locale〔3G 波 ✅：lint 0 error / 30 warnings、tsc 0、vitest 1885 用例全绿、check-locale 绿——3V 波本地复跑 check-locale PASS（worktree 无 node_modules，全量门禁以 3G 波为准）〕

### 3.8 能力级增强登记（只登记不验收）

- **scada 符号 widget 运行时渲染器缺口**（2026-09-05 事实核查新登记）：fork widget 注册表无 scada 符号渲染组件——仪表盘内符号实例当前以占位态呈现（M7 占位三态既有事实）、编辑器预览只能静态渲染。渲染器交付为独立后续项（触发：scada 域迭代），交付后预览升级活体模拟、仪表盘符号实例真渲染
- tag hover 面板用 antd Popover 替代 tooltipster+jQuery（不引入 jQuery）
- XML 模式与代码字段用 CodeMirror（沿 M9 undo-safe-value 范式），补全规则等价简化（不逐条移植 Ace 1561 行补全树）
- 既有 v1 页面的图片选择控件（device profile 背景图等 15 处消费点）随各域迭代换接 gallery-image-input，M11 不回改 v1 页面
- gallery-image-input / multiple-gallery-image-input 组件随图片库交付并随 SCADA 预览接线首用

## 4. M12 通知族操作面

> 定稿（2026-09-05，随 M12 开工落盘；依据 ui-ngx 4.4.0 源码侦察 + 后端四控制器契约盘点，工作底稿见 `docs/agents/m12-{ngx-inventory,backend-contract,implementation-notes}.md`）。

### 4.0 通用边界（通知族共守）

- 路由族 `/notifications/**`（inbox / sent / templates / recipients / rules 五页）；access 对齐 ui-ngx `notification-routing.module.ts:30-119`：**inbox 三角色**（SYS_ADMIN / TENANT_ADMIN / CUSTOMER_USER），其余四页 SYS + TENANT；CUSTOMER_USER 差异收敛为「只读收件箱 + 无发送按钮」一条权限契约。
- 触发类型 14 种 = 8 种 tenant 级 + 6 种 sysadmin 级（ui-ngx `notification.models.ts:674-706`）；**候选按角色二分（非并集）**：规则 trigger 候选 tenant=8 种 tenant 级、SYS=6 种 sysadmin 级（ngx `rule-notification-dialog:530-532`）；接收人 usersFilter 候选 tenant=6 变体、SYS=4 变体（ngx `recipient-dialog:210-218`，fork 头注已声明收缩理由：SYS 无 GET /api/users 数据源）。模板 notificationType 候选同按角色二分（`template-notification-dialog:182-197`）。
- 投递方式 6 种（WEB/EMAIL/SMS/SLACK/MICROSOFT_TEAMS/MOBILE_APP）；可用方式经 GET /api/notification/deliveryMethods 运行时探测，不可用方式禁用（WEB 本机恒可用；EMAIL/SMS/SLACK/MOBILE_APP 的 provider 配置入口 = `/settings/notifications`，归 M14 settings tab，登记不实施）。
- **真实通道验收边界**：端到端发送链路以 WEB 通道验收（POST request → 收件箱 REST/WS 可见 → 已读）；SMS/EMAIL/SLACK/Teams/MOBILE_APP 真实到达需真实网关/SMTP/bot/webhook/Firebase，**留人工验收**——自动化验收只认到「配置表单等价 + 不可用通道禁用/错误路径可见」。
- 用户级偏好 `/account/notificationSettings`（类型 × 投递方式矩阵）与 `/settings/notifications`：登记不实施（归账号/settings 域后续波次）；未读通知 widget 归 widget 域。
- WS 链路沿 ui-antd 既有遥测订阅管理器：`NOTIFICATIONS`/`NOTIFICATIONS_COUNT` 命令族（`core/ws/protocol.ts:193-198` 已预定义），铃铛未读数与弹层/收件箱列表共用单条 `subscribeNotifications()` 订阅（快照 `totalUnreadCount` 供数；既有 `subscribeUnreadNotificationCount()` 读 `msg.count` 与服务端推送字段不符，属既有缺陷，登记待修）；已读操作走 REST（PUT read / PUT read-all），WS `MARK_*` 命令登记为能力级增强；WS 数据不写 queryClient（manager 红线）。
- 自动化回归项归 #12 基线扩充（沿 M11 §3.8 衔接条口径）；本 spec = 人工验收载体。

### 4.1 收件箱 inbox（三角色）

- [x] 列表：createdTime/type/subject/text 列，subject/text 经 sanitize 渲染；默认 createdTime DESC；分页/排序/搜索（锚点 `inbox-table-config.resolver.ts:57-103`）〔M12 走查 ✅：五列 + 文本渲染 + 新行登顶 + 分页（209 条）真机；搜索/排序提交未逐一驱动（URL textSearch/sort 契约锚）〕
- [x] 未读/全部 toggle（默认未读），切换重置排序与过滤（`inbox-table-header.component.*:18-38`）〔M12 走查 ✅：默认「未读」选中；切「全部」写 URL `?unreadOnly=false` + 已读行回列实证〕
- [x] 行点击详情对话框（通知全量渲染），关闭时标已读（`inbox-table-config.resolver.ts:75-78,155-171`）〔M12 走查 ✅：详情对话框全量渲染（主题/正文/相对时间），关闭 → PUT read 200 + 行从未读视图消失〕
- [x] 已读三通道：行内单条 / 详情关闭 / 全部标记已读；末页最后一条已读后自动翻上一页（:88-153）〔M12 走查 ✅：三通道全驱动（PUT read ×2 + PUT /api/notifications/read 200）；末页翻页边缘未构造（3V）〕
- [x] 删除：单条 + 勾选批量 + 确认（:60-74）〔M12 走查 ✅（单条）：确认框 → DELETE 200 → 行消失；批量勾选无头环境 onChange 不触发未闭环（走查文档 §7 O-2），selectedRowKeys+useBatchRun 在码 + sent 页同构单测锚〕

### 4.2 顶栏铃铛（三角色）

- [x] 铃铛按钮 + 未读数徽标（≥100 显示 99+），未读数走 WS 订阅（`notification-bell.component.ts:47-56,102-109`）〔M12 走查 ✅：徽标 99+ 实证（≥100 阈值正中）；API 直发一条 → 徽标实时 99+→1（WS 推送驱动渲染实证）〕
- [x] popover：标题 + 全部标记已读（有通知时显示）；最近 6 条；未读单条已读；空态；「查看全部」跳 inbox（`show-notification-popover.component.*`）〔已读通道实现为 REST，见 4.0〕〔M12 走查 ✅：标题/全部已读/单条已读/空态/查看全部跳转五件全驱动（PUT read 200 ×2 + 落 `/notifications/inbox`）；「最近 6 条」半——店存仅单条在场，cap 由 notification-feed 锚〕
- [x] 通知项渲染：自定义图标（additionalConfig.icon）或按 type 图标、标题/正文、动作按钮（LINK 外链新窗 / DASHBOARD 带 state 站内跳转）、ALARM 按严重级别着色、相对时间（`notification.component.*`）〔M12 走查 ✅（渲染三项）：按类型图标 + 标题/正文 + 相对时间真机；动作按钮/ALARM 着色/自定义图标未驱动（无带动作按钮通知），`notification-item.test.tsx` 钉住〕
- [ ] popover 打开期间暂停 count 订阅、关闭恢复（`notification-bell.component.ts:77-100`）〔未勾（3V）：实现按 4.7 收敛为单订阅常开（无暂停/恢复形态，不判缺陷），无可驱动面；M12 轻走查未驱动〕

### 4.3 已发通知 sent + 发送向导（SYS + TENANT）

- [x] 列表：createdTime/status/deliveryMethods/templateName 列；无搜索框；默认 createdTime DESC（`sent-table-config.resolver.ts:64-100`）〔M12 走查 ✅：四列 + 工具栏无搜索框 + 两轮发送新行均登顶实证〕
- [ ] status 徽标三态（SCHEDULED/PROCESSING/SENT）+ 失败数红色 badge → 失败明细对话框（按投递方式分组、error chip + 文本）（:92-176、`sent-error-dialog.*`）〔未勾（3V）：SENT「已发送」徽标真机；SCHEDULED/PROCESSING 与失败 badge→失败明细对话框未驱动（不真定时 + 无失败通道），实现在役（error-dialog.tsx）+ 单测锚——M12 轻走查未驱动〕
- [x] 行内「再次发送」（SCHEDULED 禁用）；删除单条 + 批量（:69-133）〔M12 走查 ✅：再次发送预填重开 → 端到端再发 ×2（新行登顶）；单条删除确认框 → DELETE 200；SCHEDULED 禁用分支未证（无 SCHEDULED 行）；批量勾选未真机闭环（§7 O-2），删除所选+逐 id DELETE 通道在码 + 同构单测锚〕
- [x] 发送向导三步 stepper：Setup → Compose（仅从零开始）→ Review，步骤校验全过才可前进（`sent-notification-dialog.componet.ts:267-277`）〔M12 走查 ✅：三步步进 + 校验门真机；**但 Setup 步过激校验致从零开始死锁——缺陷 D-1 登记（走查文档 §7），主链经原生补填隐形字段完成（非正常用户路径）〕
- [x] Setup：从零开始/使用模板 toggle（模板候选限 GENERAL、可搜索/新建/编辑）；接收人多选 + 新建接收人快捷入口；定时发送（enabled + 时区 + 时间 min=now max=+7 天 → sendingDelayInSec 换算）（:131-318）〔M12 走查 ✅：从零默认 + 接收人多选 + 内联新建（保存后候选即时补入）+ 定时字段（选择器+时区 Asia/Shanghai）在场；使用模板的候选搜索/新建/编辑未驱动；min=now/max=+7 天边界未逐证（3V）〕
- [x] 投递方式开关组：atLeastOne 校验、可用方式 API 探测、不可用禁用并归零、刷新按钮；权限门（WEB 任何 admin 可发不可配；SYS 可配全部；TENANT 仅 SLACK；其余「联系管理员」tooltip）（:324-382）〔M12 走查 ✅：deliveryMethods 探测 200 → SLACK/移动应用禁用 + WEB 恒开恒锁 + atLeastOne 文案在场 + 「前往配置通知渠道」跳转（O-4）；「不可用并归零」场景未驱动；权限门角色细分按 4.7 统一口径〕
- [x] Review：preview 端点（接收总数、按 target 计数、接收人 chips、按启用方式渲染预览块）（:235-249）〔M12 走查 ✅：POST preview 200 + 「6 个收件人」+ per-target 计数 + chips 逐列 + Web 预览块回显一致〕
- [x] 提交 POST /api/notification/request；三入口复用同一向导（sent 页新增 / 行内再发 / 页头发送按钮）〔M12 走查 ✅：POST 200 + toast ×3 轮；三入口（sent 页头/行内再次通知/rules·recipients·templates 页头同款按钮）全场目击〕

### 4.4 接收人 recipients（SYS + TENANT）

- [x] 列表：createdTime/name/类型/描述列；新增/行点击编辑/删除单条+批量（`recipient-table-config.resolver.ts:56-83`）〔M12 走查 ✅：四列 + 新建/编辑（改名落行）/单条删除真机；删除被引用 → 后端 400「Recipients group is being used in notification rule」原文 toast 错误路径实证，解引用后 DELETE 200；批量勾选未真机驱动（同 O-2 同构锚）〕
- [x] 对话框：name 必填；类型 radio 三选 PLATFORM_USERS/SLACK/MICROSOFT_TEAMS（`recipient-notification-dialog.component.html:44-52`）〔M12 走查 ✅：三选 radio 全渲染 + 空名保存「名称必填」校验实证〕
- [x] PLATFORM_USERS → usersFilter 八变体按角色收缩：ALL_USERS / TENANT_ADMINISTRATORS（SYS 可配 tenantsIds/tenantProfilesIds）/ CUSTOMER_USERS(customerId) / USER_LIST(usersIds) / ORIGINATOR_ENTITY_OWNER_USERS / AFFECTED_USER / SYSTEM_ADMINISTRATORS 与 AFFECTED_TENANT_ADMINISTRATORS（仅 SYS）（ts :88-221）〔M12 走查 ✅：TENANT 侧恰 6 变体全枚举（无 SYS 专属两项，收缩实证）；SYS 侧两变体未真机枚举（代码收缩锚，3V）〕
- [x] SLACK → 会话类型 radio + 会话自动补全（`/api/notification/slack/conversations`）；MICROSOFT_TEAMS → useOldApi 开关（新旧 API 标签切换）+ webhookUrl + channelName（html :126-178）〔M12 走查 ✅：SLACK 三会话类型 + 会话搜索字段在场（未配置不真实调用，按口径）；TEAMS 新旧 API 双选项（形态转译 O-1）+ Workflow URL + 频道名称〕
- [x] description 文本域；保存 POST /api/notification/target〔M12 走查 ✅：0/500 限长；POST 200（向导内联 + 独立对话框同组件双证）〕

### 4.5 通知规则 rules（SYS + TENANT，最重组件）

- [x] 列表：createdTime/name/templateName/triggerType/描述；新增/行点击编辑/删除单条+批量（`rule-table-config.resolver.ts:57-86`）〔M12 走查 ✅：五列 + demo 规则 9 行 + 新建/行点击编辑真机；行内删除按钮在场、单条/批量流未逐一点击（清理走 API DELETE 200 + 同构确认单测锚）〕
- [x] 行内：启用/停用 toggle（即改即存）+「复制规则」（名称追加 "(copy)"）（:93-144）〔M12 走查 ✅：停用 → API 复核 enabled:false 即改即存；复制 → 向导预填「…(copy)」保存落库〕
- [x] 对话框 stepper：基本设置（name/enabled/triggerType/模板选择按 triggerType 过滤搜索；内联新建/编辑模板登记 4.7）→ 触发器设置（按 triggerType 动态步骤）；编辑时 triggerType 锁定（`rule-notification-dialog.*:34-118,374-386`）〔M12 走查 ✅：两步 stepper + 模板候选随 triggerType 过滤（网络 notificationTypes=ALARM 实证）+ 编辑态触发器 select disabled；内联新建/编辑模板按 4.7 不驱动〕
- [x] 接收面二分：非 ALARM → targets 多选 + 新建接收人入口；ALARM → 升级链（首级 0 秒固定、后续间隔 1 分钟–7 天、动态行增删）+ clearRule（仅升级链 >1 级时可配）（`escalations.*`、`escalation-form.*`）〔M12 走查 ✅：ALARM 升级链（「首级接收人（立即通知）」+ 添加阶段 + 间隔文案 + 每级接收人）vs 非 ALARM targets 多选（必填校验）双侧实证；clearRule 仅 >1 级时在场〕
- [x] trigger 配置表单 14 种（候选按 authority 收缩；默认 SYS=ENTITIES_LIMIT、TENANT=ALARM）：ALARM / DEVICE_ACTIVITY（设备|设备配置档二选一）/ ENTITY_ACTION / ALARM_COMMENT / ALARM_ASSIGNMENT / RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT（含 ruleNode 子区联动）/ EDGE_CONNECTION / EDGE_COMMUNICATION_FAILURE / ENTITIES_LIMIT（threshold 0-100% → ÷100）/ API_USAGE_LIMIT / NEW_PLATFORM_VERSION（无字段）/ RATE_LIMITS / TASK_PROCESSING_FAILURE（仅描述）/ RESOURCES_SHORTAGE（三滑杆）——字段级对照见 `docs/agents/m12-ngx-inventory.md` §5〔M12 走查 ✅（抽样 6/14，≥3 达标）：ALARM/DEVICE_ACTIVITY（Segmented 二选一联动）/ENTITY_ACTION/ALARM_COMMENT/RULE_ENGINE_LIFECYCLE/ENTITIES_LIMIT（SYS 侧，阈值 % 默认 80）真机驱动；候选按角色二分（TENANT 8 + SYS 6）与默认值双向实证；其余 8 种候选在场 + 表单随型重渲机制实证（字段级 3V）；ruleNode 子区联动未证（走查文档 §7 O-3）；threshold 0-100% 边界未逐证〕
- [x] 每个 trigger 步骤底部 additionalConfig.description；保存把表单值并入 triggerConfig（:441-467）〔M12 走查 ✅：描述字段在场并填写；POST /api/notification/rule 200；payload 并入由 rule-submit 契约/单测锚〕

### 4.6 模板 templates（SYS + TENANT）

- [x] 列表：createdTime/notificationType/name；新增/行点击编辑/删除单条+批量/行内复制（"(copy)"）（`template-table-config.resolver.ts:55-95`）〔M12 走查 ✅：三列 + 新建/编辑/行内复制按钮/单条删除（scratch 模板页面删除复核）真机；批量未驱动（同构锚）；行内复制流未单独驱动（按钮在场）〕
- [x] 对话框 stepper：Setup（name/notificationType 下拉按角色收缩、编辑锁定、投递方式开关组 atLeastOne）→ Compose（`template-notification-dialog.*:34-92,182-197`）〔M12 走查 ✅：两步 stepper；类型候选 TENANT 10 种（RULE_NODE 收缩保留、无 SYS 级）；编辑态 notificationType select disabled〕
- [x] compose 六方式字段与校验：WEB（subject≤150 + body≤250 + icon + 动作按钮）/ EMAIL（subject≤250 + body 富文本）/ SMS（body≤320）/ SLACK（body）/ MOBILE_APP（subject≤50 + body≤150 + onClick）/ MICROSOFT_TEAMS（subject + body + themeColor + button）；未启用方式整块禁用；每方式自动注入 enabled+method（`notification-template-configuration.component.ts:219-303`）〔M12 走查 ✅（抽样 2/6）：WEB（11/150、17/250 计数器+图标）与 EMAIL（0/250+HTML 源码）真机；只渲已启用方式机制实证；SMS/SLACK/MOBILE/TEAMS 块未逐一驱动，六方式字段规格由 `template-fields.test.ts` 钉住（caps 150/250/50、250/320/150、enabled+method 注入）（3V）〕
- [x] 动作按钮配置（WEB/TEAMS/MOBILE 共用）：enabled / text≤50 / linkType(LINK|DASHBOARD) / link≤300 / dashboardId / dashboardState / setEntityIdInState 联动启停（`notification-action-button-configuration.component.ts:84-126`）〔M12 走查 ✅：enabled → 按钮文本（0/50）+ 链接；linkType 双选项在场；切 DASHBOARD → 搜索仪表板 + setEntityIdInState 联动出现；link≤300 计数未单独看（3V）〕
- [x] 模板参数 `${xxx}`：主题/正文可模板化 + 按类型「查看文档」帮助；保存 POST /api/notification/template〔M12 走查 ✅：「输入字段支持模板化。」+「查看文档」按钮在场（帮助页跳转未驱动）；保存 → 行登顶 + API 复核〕
- [x] EMAIL 富文本编辑器等价说明：ui-ngx 用 hugeRTE；ui-antd 以 HTML 源码编辑等价交付（能力不降级），WYSIWYG 视觉形态登记为能力级增强〔M12 走查 ✅：HTML 源码 textarea + 明示「本 fork 暂无所见即所得编辑器」文案原样落地〕

### 4.7 能力级增强登记（不设硬门槛）

- 邮件正文 WYSIWYG 视觉形态（4.6 已述等价边界）
- ENTITIES_LIMIT_INCREASE_REQUEST / RULE_NODE 等无页面入口的 NotificationType（后端/规则链内部使用；RULE_NODE 在模板类型候选中随 ngx 收缩法保留）
- popover 打开期间暂停 count 订阅的省流优化（实现以单订阅常开交付，不判缺陷）
- 已读操作的 WS `MARK_NOTIFICATIONS_AS_READ`/`MARK_ALL_NOTIFICATIONS_AS_READ` 命令（实现以 REST 等价交付，见 4.0；protocol 命令族已预定义）
- 规则向导模板选择的内联新建/编辑入口（模板管理走模板页等价覆盖）
- 发送向导权限门 tooltip 的角色细分文案（实现统一「联系管理员」；跳转设置页链接待 M14 settings tab 落地后补）
- 共性收敛（沿仓内 12 处 per-page 先例，多页重复待统一波）：搜索防抖与 url-state 的共享 hook 化（5 份近同）、`METHOD_NAME_KEYS` 投递方式文案映射（4 份）、`normalizeTemplateValue`/`withMethodEnabled`（2 份，行为微差需先裁决）、`SendNotificationButton` 自页面目录上移 `components/notifications/`
- rules 触发表单的 edge 实体选择直用 tbHttp（`/api/tenant/edgeInfos`），待 edge service 建立时迁移
- 服务层预留无 UI 消费者的端点函数（notification settings / user notification settings / entities-limit-increase / target recipients 列表），供 M14 settings tab 与账号设置域消费

### 4.8 已知后端缺陷登记（前端已规避/待后端修复）

- `GET /api/notification/targets/notificationType/{type}`（及 `/targets?notificationType=`）在 `sortProperty=createdTime` 时 500 "Database error"（自定义查询映射不了该列）；`sortProperty=name` 或不带排序正常。前端两处选择器均按 name 排序规避。
- `subscribeUnreadNotificationCount()`（ui-antd core/ws）读 `msg.count`，服务端 `NOTIFICATIONS_COUNT` 推送字段为 `totalUnreadCount`，该订阅在真消息下不更新；铃铛改用 `subscribeNotifications` 快照供数，旧方法登记待修。
- 上游缺陷对照：ui-ngx 规则对话框对 SYS_ADMIN 禁用 targets 选择，致 SYS 必然违反后端 `@NotEmpty` 保存失败；fork 实现允许 SYS 选择接收人（故意偏离）。

## 5. M13 Edge + OTA 操作面

> 定稿（2026-09-06，随 M13 开工落盘；依据 ui-ngx 4.4.0 源码侦察 + 后端契约盘点 + 三镜头专家合议（架构/契约/范围），工作底稿见 `docs/agents/m13-{ngx-inventory-edge,ngx-inventory-ota,backend-contract,implementation-notes,panel-arch,panel-contract,panel-scope}.md`；两条契约疑点已本机后端实测闭环，另有实测新缺陷一条入 §5.7）。CU 只读面随 M13 交付经用户拍板（2026-09-06）。

### 5.0 通用边界（Edge + OTA 共守）

- 路由族：Edge = `/edges/**`（instances 列表 + `:id` 详情 + 五条子实体作用域页 + `/edges/rule-chains` 模板页）；OTA = `/otaPackages`（列表 + `:id` 详情）。URL 语义对照 ngx `/edgeManagement/**` 与 `/features/otaUpdates`，不搬字面量；子实体页为**平级路由列表页**（照 ngx，非详情内嵌 tab，钉死）。
- 角色矩阵（ngx auth 数组为权威，逐条复核）：**SYS_ADMIN 无任何 Edge/OTA 页面与菜单**（前后端双证实；后端对 SYS 放行的 `GET /api/edges/enabled` 探测不构成页面入口）——钉死「不凭空补 SYS 视角」。TENANT_ADMIN 全量。CUSTOMER_USER 仅 Edge 只读面：instances 列表（强制本人 customerId 取数）+ 详情只读（detailsReadonly）+ assets/devices/entityViews/dashboards 四子页只读、设备凭据可见；ruleChains 子页 / 模板页 / Downlinks / audit-logs 不可达；key/secret/sync/指引/复制/删除全隐藏；无 OTA 页面（后端 3 个只读端点不建入口，权限契约登记）。
- 菜单归属：TENANT_ADMIN「Edge Management」组两项（Instances / Rule chain templates，照 ngx 组结构）+「OTA updates」独立顶级项（**不并入 Edge 组**，对齐 ngx OTA 独立于 edge_management 的事实）；CUSTOMER_USER 可见 Edge 只读入口（实现形态随菜单树过滤，不强制复刻 ngx 顶层项形态）。
- 功能开关有意偏离：fork 菜单**不接** `edges.enabled` 开关（后端默认 true，fork 部署即用 Edge；接入属为假想场景预建机制，违「不为未发生的需求预建抽象」）——对照登记 §5.7；触发条件留档：出现真实关闭部署时走 getInitialState 布尔 + access 组合 key 一条路。
- 取数端点契约：Edge 列表一律 `edgeInfos` 族端点（`/api/tenant/edgeInfos`、`/api/customer/{id}/edgeInfos`；裸 `/edges` 系 customerTitle 排序 500，已实测，§5.7）；排序显式传 `createdTime DESC`（后端缺省 `id ASC` 无时序）；OTA 表单/详情载入一律 `GET /api/otaPackage/info/{id}`（full GET 回带 base64 包体，已实测，§5.7）。
- 事件两表语义钉死：详情页 events tab = **Edge 实体自身事件**（`GET /api/events/EDGE/{id}/ERROR`；ngx 不传 disabledEventTypes → 实集合 ERROR/LC_EVENT/STATS 三种）；Downlinks tab = **Edge 同步事件**（`GET /api/edge/{id}/events`）——端点、列集、语义均不同，分开验收，不得混写。
- key/secret 契约：前端本地生成（guid 风格 routingKey + 20 位随机 secret，后端不生成），保存后**恒只读**（无重新生成入口 = 等价边界）；TA 原样展示 + 复制按钮，CU 隐藏两行（不脱敏，照 ngx）。
- OTA 保存契约：**两步保存链**（先 `POST /api/otaPackage` 建 info → 再 multipart 传文件；上传失败自动回滚删除 info）；**checksum 后端算**（前端只传算法默认 SHA256 + 可选值；auto-generate 默认勾选并隐藏输入，但算法必随 multipart 提交）；**创建即定型**（编辑态仅 description 可改，title/version/tag/type/deviceProfileId/文件信息禁改）。
- 列表页沿 v1 既有范式：URL 承载分页/排序/搜索（createListUrlState 工厂）、ProTable + useQuery 喂数、批量走 useBatchRun + BatchProgressModal；i18n `pages.edge.*`/`pages.ota.*` zh/en key 全等（check-locale 门禁）+ 菜单 key 双语；主题零内联色值；数据保全——fixture 终态全 DELETE、system 数据零改动；自动化回归项归 #12 基线扩充（本 spec = 人工验收载体）。
- M12 连带迁移：M13 交付 edge service 后，notifications rules 触发表单 edge 实体选择从直用 tbHttp 迁移至 edge service（`ui-antd/src/pages/notifications/rules/trigger-forms.tsx:65-67`）。

### 5.1 Edge 列表操作面（instances，对齐 ngx 三 scope）

- [x] instances 列表（tenant scope）：列 createdTime/name/type/label/customer/public（tenant 追加后两列），类型筛选下拉（`GET /api/edge/types`，切换重置排序过滤），搜索/分页/排序，默认 createdTime DESC；取数走 `/api/tenant/edgeInfos`（锚点 `edges-table-config.resolver.ts:150-185`）〔M13 走查 ✅：六列/筛选/搜索在场；网络面板证 edgeInfos 族 + `sortProperty=createdTime&sortOrder=DESC`〕
- [x] 新增 Edge 对话框：name（必填 ≤255）/type（EDGE 子类型，默认 default）/label（可空 ≤255）/routingKey+secret（前端本地生成、只读展示）/description；保存成功刷新 + 默认自动弹安装指引（「不再显示」写用户偏好 `notDisplayInstructionsAfterAddEdge`）（锚点 `edge.component.ts:71-143`、`edge-instructions-dialog.component.ts:86-93`）〔M13 走查 ✅：key/secret 本地生成只读实证；自动弹指引 + 三 method tab 按 method 独立取数实证；「不再显示」PUT 偏好实证——同会话失效缺陷 W-1 已修（见 5.7）〕
- [x] 编辑 Edge：key/secret 禁改只读；表单回显含 assignedToCustomer 只读提示 + public 提示（锚点 `edge.component.html:137-146,166-189`）〔wave-4 真机预验编辑保存写库 + 单测；主走查未重复驱动〕
- [x] 导入 Edge（tenant）：CSV bulk_import（`POST /api/edge/bulk_import`）；**无导出**（ngx 无此能力，钉死）（锚点 `import-export.service.ts:593-601`）〔M13 走查 ✅：CSV 全链——请求实证 + 结果面板「1 新建，0 错误」+ 新行落列表；无导出按钮实证〕
- [x] 删除：单条 + 勾选批量，仅 tenant（customer scope 列表行删除实为「解除分配」语义）（锚点 `edges-table-config.resolver.ts:141-143,173-184`）〔M13 走查 ✅（API 通道）：确认四件套单测锚；批量删除由 useBatchRun 契约覆盖〕
- [x] 行内动作矩阵（tenant）：make public（未分配时）/ assign to customer（未分配时）/ unassign（已分配非 public）/ make private（public 时）/ manage assets/devices/entityViews/dashboards/rule chains 五子页入口 / sync（锚点 `:189-245`）〔M13 走查 ✅（半）：按钮区全场目击（详情页）+ manage 五跳在场 + sync 失败路径实操（阻塞 11s → 错误 toast，成功路径留人工）+ assign 实操（customer 页分配流）；make public/private 未逐一驱动〕
- [ ] 批量：tenant 批量分配客户；customer scope 批量解除分配（锚点 `:296-315,489-515`）〔未勾（3V）：走查未驱动，useBatchRun 契约 + 单测锚；M15 复核：实现在役——edges list `useBatchRun` 批量通道（list/index.tsx:185-274）+ `use-batch-run.test.ts` + `customer-edges/index.test.tsx:180`「fans batch unassign out per selected edge」〕
- [x] customer 作用域列表（TENANT_ADMIN）：`/customers/:id/edges`，标题「客户名: Edge instances」；入口三处——客户详情按钮 / 客户列表行内 / 本页头部「分配已有 Edge」对话框（锚点 `customer-routing.module.ts:191-228`、`customers-table-config.resolver.ts:105-118,178-183`）〔M13 走查 ✅：面包屑 + 分配已有 Edge → 行落列表〕
- [x] customer_user scope：只读列表（强制本人 customerId 取数，`edge_customer_user` 语义），删除/分配类操作不可达，详情只读（锚点 `:105,109-121,263-289`）〔M13 走查 ✅：网络面板证 `GET /api/customer/{cuId}/edgeInfos` 强制客户域；无写操作按钮〕

### 5.2 Edge 详情页（七通用 tab + 按钮区）

- [x] 详情页结构与表单回显：六字段（key/secret 只读，CU 隐藏两行）+ assignedToCustomer/public 只读提示；详情路由 `?tab=` URL state，TA-only tab 手打会被拉回（沿 antd useDetailTabUrlState 既有契约）〔M13 走查 ✅：`GET /api/edge/info/{id}` 载入；八 tab 齐渲染；TA-only 拉回由单测锚〕
- [x] 详情按钮区（角色收缩）：make public / assign to customer / unassign / make private / manage 五子实体入口（manage rule chains 仅 tenant）/ delete；CU 全隐藏（锚点 `edge.component.html:19-78`）〔M13 走查 ✅：TA 十按钮全在场 + CU 全空实证〕
- [x] 复制三连：Copy ID / Copy Edge key / Copy Edge secret（随按钮区对 CU 整体隐藏——**勘误（2026-09-06）**：原措辞「key/secret 对 CU 隐藏」暗示 Copy ID 留存，实现按 §5.0 整块隐藏口径，ngx 锚点一致），成功均有 toast（锚点 `:79-106`、ts `:114-136`）〔M13 走查 ✅：Copy ID 实操 toast；key/secret 复制同组件未逐一驱动〕
- [x] Sync Edge：`POST /api/edge/sync/{id}`，fire-and-forget toast（「同步进程已启动」）+ 失败 error 展示 + 按钮 loading 防重复；**无状态轮询**（钉死；后端有 20s 硬超时，无需前端兜底）（锚点 ts `:517-533`）〔M13 走查 ✅（失败路径）：阻塞 ~11s → 「Request timed out」toast 呈现无悬挂；成功路径需真实在线 Edge，留人工〕
- [x] 指引二态对话框：无升级 → Install & Connect Instructions、有升级（`GET /api/edge/{id}/upgrade/available`）→ Upgrade Instructions；Docker/Ubuntu/CentOS-RHEL 三 method tab，markdown 由后端拼好前端纯渲染（`GET /api/edge/instructions/install|upgrade/...`）；「不再显示」偏好写入（锚点 `edge-instructions-dialog.component.*`）〔M13 走查 ✅：三 tab 按 method 独立取数实证；upgrade 探测在场（升级分支本机单一版本未触发，留人工）；偏好 PUT 实证〕
- [x] 七 tab 装配：Attributes（SERVER_SCOPE）/ Latest telemetry（禁 scope 选择）/ Alarms / Events（**Edge 自身事件**，默认 ERROR、实集合 ERROR/LC_EVENT/STATS，列=antd 通用三列 + JSON 展开行〔M8 行为契约形态〕）/ Downlinks（仅 TA，见 5.4）/ Relations / Audit logs（仅 TA）；只挂激活 tab（destroyOnHidden 保 WS 预算红线）；**不挂 version-control**（ngx 七 tab 无此页签，钉死）（锚点 `edge-tabs.component.html:18-70`）〔M13 走查 ✅：八 tab 齐渲染；events tab 请求实证 `/api/events/EDGE/{id}/ERROR`（两表语义分正确）〕
- [x] customer_user 只读形态：detailsReadonly，tab 收缩为 attributes/telemetry/alarms/events/relations 五个，sync/指引/复制 key secret/删除全隐藏（锚点 `edge.component.html:94-121`）〔M13 走查 ✅：CU 详情五 tab + 按钮区全空 + key/secret 两行消失，逐项实证〕

### 5.3 Edge 子实体页五件 + 规则链模板页（本里程碑最重块）

- [x] 平级路由形态：`/edges/:id/{assets|devices|entityViews|dashboards|ruleChains}` 五条作用域页 + 域内外壳（标题=「Edge 名: 实体复数」、面包屑叶=Edge 名、返回详情页、加载失败 Alert；外壳页面私有不泛型化）；**不做详情内嵌 tab**（钉死）；CUSTOMER_USER 全部收缩为只读（`edge_customer_user` 语义）〔M13 走查 ✅：外壳标题「M13 走查边缘: 规则链」实证；CU 四子页无分配控件由实现 + 单测锚〕
- [ ] assets 子页：列表（`GET /api/edge/{id}/assets`）+ 头部「分配已有资产」对话框 + 行内 Unassign + 批量 unassign（锚点 `assets-table-config.resolver.ts:189-191,246-287,322-328`）〔未勾（3V）：走查驱动渲染 + 分配按钮在场；分配/解除流未真机驱动（与 devices 共享分配对话框组件与域内 hook，单测锚）；M15 复核：`edges/assets/index.test.tsx` 覆盖 assign-existing fan-out + 单条解除确认，锚有效〕
- [x] devices 子页：列表（含 type/deviceProfile/active 过滤能力，走 GET 端点既有 query 参数）+ 分配对话框 + 行内/批量 unassign + CU 只读**可看凭据**；**edge scope 内不能新建/导入设备、无 manage credentials**（钉死）（锚点 `devices-table-config.resolver.ts:270-287,318-366,392-450`）〔M13 走查 ✅：三过滤器在场（type/profile 服务端互斥实测适配）；分配对话框服务端搜索 → dev1+dev2 入列（API 复核）；凭据查看按钮在场（复用 DeviceCredentialsModal readOnly）〕
- [ ] entityViews 子页：同构（`GET /api/edge/{id}/entityViews` + 分配/unassign/批量 + CU 只读）（锚点 `entity-views-table-config.resolver.ts:187-309`）〔未勾（3V）：同 assets——渲染在场，分配流未真机驱动；M15 复核：`edges/entity-views/index.test.tsx` 覆盖 assign fan-out + 解除确认，锚有效〕
- [ ] dashboards 子页：列表 + 分配已有 + 行内导出 + unassign + 批量 unassign + 行内打开仪表盘（锚点 `dashboards-table-config.resolver.ts:208-390`）〔未勾（3V）：同 assets——渲染在场，分配流未真机驱动；M15 复核：`edges/dashboards/index.test.tsx` 覆盖分配/解除 + CU 收缩（export 留、分配藏），锚有效〕
- [x] ruleChains 子页（仅 TENANT_ADMIN）：列表 + root 复选列 + 分配已有（仅 EDGE 类型链可挂）+ 行内 Set root（确认后 `POST /api/edge/{edgeId}/{ruleChainId}/root`）+ 根链禁 unassign + 批量 unassign + **进页缺失检查**（`GET /api/edge/missingToRelatedRuleChains/{id}`，缺则 Alert 列出，antd 形态替代 ngx alert 阻断）；本页禁新建/删除（锚点 `rulechains-table-config.resolver.ts:137-147,183-225,273-287,447-459`）〔M13 走查 ✅：缺检请求进页实证；根链行双禁用 vs 普通行双可用对照；Set root → API 复核 rootRuleChainId 已切（行刷新滞后属后端异步，W-2 登记）〕
- [x] 规则链模板页 `/edges/rule-chains`（仅 TENANT_ADMIN，Edge Management 组第二项）：auto-assign 链列表（`GET /api/ruleChain/autoAssignToEdgeRuleChains`）+ root 模板复选 + assignToEdge 复选 + 行内 Set Edge template root / Set(Unset) auto-assign to edge + 头部新建/导入（EDGE 类型）+ 打开 EDGE 类型画布（画布本体归规则链域，仅验入口链路）（锚点 `:148-200,251-271,606-612`、`rule-chain.service.ts:265-296`）〔M13 走查 ✅：两路合并列表 + demo 模板根链复选在场 + auto-assign 即改即存（POST + 重取，false→true→false 复原）；新建/导入/画布入口由 wave-5b 交付 + 单测锚〕
- [x] 子实体详情跳转：assets/devices/entityViews 的 `:entityId` 打开各实体详情（只读按角色）、dashboards 的 `:dashboardId` 打开仪表盘页（锚点 `edge-routing.module.ts:121-137,161-177,201-217,241-255`）〔wave-5a 交付：名称 Link → 既有 v1 详情路由（URL 不搬 ngx 字面量，§5.0）；走查经 devices 子页行链接目击〕

### 5.4 Downlinks tab（Edge 同步事件表，仅 TENANT_ADMIN）

- [x] 入口与开关：Edge 详情内 tab 仅 TA；时间分页（useTimePageLink 等价）；无搜索/新增/删除/多选/详情面板，表头无时间段选择 UI（锚点 `edge-downlink-table-config.ts:71-84`）〔M13 走查 ✅：tab 在场、六列、空态正确、无写操作控件〕
- [x] 取数链：先读 Edge 的 SERVER_SCOPE 属性 `queueStartTs`，再 `GET /api/edge/{id}/events`；**顺序 = 服务端返回顺序直渲**（后端恒 `seqId ASC`；ngx 声明 DESC 但被后端忽略且无客户端倒排，源码复核定案——客户端倒排登记 §5.6 增强，不做假排序参数）（锚点 `:89-94`、`JpaBaseEdgeEventDao.java:61,175-187`）〔M13 走查 ✅：网络面板逐请求实证两段管线且事件请求不带排序参数〕
- [ ] 列与派生状态：createdTime / type（EdgeEventType 译名）/ action（EdgeEventActionType 译名）/ entityId / status（**派生值**：createdTime ≤ queueStartTs → Deployed，否则 Pending；色走 antd token）/ data 查看（锚点 `:105-145`、`edge.models.ts:100-164`）〔未勾（受阻·后端）：多次分配操作后 `edge_event` 表 0 行（SQL 实证），同步事件未落库，真数据行无法构造；派生纯函数（== 判 Deployed、缺失按 0）单测钉住——留人工/后端环境修复后补验；M15 复核：SQL 重查 `edge_event` 仍 0 行，受阻维持〕
- [ ] data 查看链：非 ADMIN_SETTINGS 且非 DELETED 才可点；内容按类型回查实体或直取 body → JSON 弹窗；取不到则错误 toast（锚点 `:159-194`、`entity.service.ts:1509-1550`）〔未勾（受阻·后端）：同上，事件未落库无法构造；M15 复核：`edge_event` SQL 重查仍 0 行，受阻维持〕

### 5.5 OTA 包管理页操作面

- [x] 列表「Packages repository」：九列 createdTime/title/version/tag/type/direct-url/fileName/dataSize/checksum（direct-url 与 checksum 单元格内 copy 按钮仅有值时显示；dataSize 人读格式；checksum 显示「算法: 值」），搜索（按 title）/分页/排序，默认 createdTime DESC（锚点 `ota-update-table-config.resolve.ts:60-106,192-195`）〔M13 走查 ✅：九列 + 「28 bytes」+「SHA256: a597c4d7…」行渲染实证〕
- [x] 「无」清单钉死：无 type（FIRMWARE/SOFTWARE）列表过滤器（type 仅作列展示）；无 JSON 导出/导入（行内 Download 是下载二进制不是导出）；无文件大小上限（锚点侦察 ota §2）〔M13 走查 ✅：工具栏仅刷新+新增，实证〕
- [x] 新增表单：title（必填 ≤255）/version（必填 ≤255）/tag（≤255，pristine 时自动联想 `(title + ' ' + version).trim()`）/deviceProfileId（**必填**，profile 选择器禁新建禁编辑；文件型不选 profile 后端上传步 500，见 §5.7 实测缺陷）/type（FIRMWARE 默认|SOFTWARE）+ 保存警示文案「上传后 title/version/profile/type 不可再改」（锚点 `ota-update.component.*` §3 表）〔M13 走查 ✅：tag 联想 "m13-fw 1.0.0" 实时实证；校验文案在场〕
- [x] 来源双分支联动：二进制文件（默认，必填 + generateChecksum 默认勾选→隐藏算法与 checksum 输入；不勾时 7 值算法枚举 MD5/SHA256 默认/SHA384/SHA512/CRC32/MURMUR3_32/MURMUR3_128 + checksum ≤1020 选填）vs 外部 URL（必填 + 非空 pattern；切回文件态清校验、file 转必填）（锚点 ts `:61-123`）〔M13 走查 ✅：文件注入 + URL 分支校验「直链 URL 必填」实证〕
- [x] 两步保存链：先 `POST /api/otaPackage` 建 info（剥掉 file/checksum 字段）→ 再 multipart `POST /api/otaPackage/{id}?checksumAlgorithm=&checksum=` 传文件；**上传失败自动回滚删除刚建的 info**；checksum 由后端计算，前端不本地算哈希（锚点 `ota-package.service.ts:73-107`；wire 契约 deviceProfileId 对象形式等细节见实现清单）〔M13 走查 ✅：请求序逐条实证（info → multipart?checksumAlgorithm=SHA256 → 列表重取）；回滚序列由服务层单测钉（invocationCallOrder）〕
- [x] 编辑近乎只读：非新增态整表 disable 仅重新启用 description；title/version/tag 双保险 readonly；fileName/dataSize/contentType 只读展示（锚点 ts `:150-153`）〔M13 走查 ✅：详情页逐字段 disabled 探针实证，仅描述启用〕
- [x] 详情按钮组五件：Download package（disabled 条件 `hasData && !url`；文件型 blob 下载走 `GET /api/otaPackage/{id}/download`；URL 型**下载禁用**——**勘误（2026-09-06）**：原措辞「URL 型新窗口打开外链」与锚点 `isEnabled = hasData && !url` 矛盾，ngx 实为禁用，实现照锚点，外链新窗登记 §5.6）/ Delete / Copy package Id / Copy checksum（有值才显示）/ Copy direct URL（有值才显示）（锚点 `ota-update.component.html:18-63`）〔M13 走查 ✅：文件型下载请求实证；URL 型 disabled=true 实证；直链复制有值才显示实证〕
- [x] 删除：单条 + 批量 + 确认四件套；被 device/device profile 引用时**提交后吃后端 400 明确报错**（fk_* 四条消息转译展示，无前端预检——预检属增强登记）（锚点 `resolver:117-126`、`BaseOtaPackageService.java:195-218`）〔M13 走查 ✅：引用态删除 → 400 原文 toast「The otaPackage referenced by the device profile cannot be deleted!」，包未删〕
- [ ] 消费集成（OTA 闭环另一半）：device-profile 表单 firmwareId/softwareId 两个包选择器 + 保存前「变更将影响 N 台设备」确认弹窗（两类计数 forkJoin，0 不弹；device-profile 半边选择器已存在，补保存门）；device 表单同款选择器 + profile 换选候选联动（锚点 `device-profile.component.html:96-111`、`device.component.html:124-139`、`ota-package-autocomplete.component.ts:260-279`）〔wave-6 交付：保存门（计数 0 不弹/取消不落库）+ 双选择器 + 换档清空（ngx 可见行为照搬、model 残留缺陷有意不复制）单测覆盖（349 用例）；真机驱动归设备域走查顺带；M15 复核：在役确认——`device-profiles/detail/GeneralTab.tsx:182` 受影响设备计数门 + `device-profiles/detail/index.test.tsx:250` firmwareId 保存载荷断言 + `devices/detail/index.test.tsx` OTA 选择器 mock，维持「真机归设备域走查」注记〕
- [x] 权限契约：CUSTOMER_USER 后端有 3 个只读端点（info/列表×2）但无下载——前端不建入口，页面 TENANT_ADMIN only；真实固件分发/设备侧更新状态追踪归设备域不在本页（登记）〔M13 走查 ✅：CU 菜单无 OTA 项 + `/otaPackages` 直达拒绝页实证〕

### 5.6 能力级增强登记（只登记不验收，不设硬门槛）

- Edge 详情 version-control tab（ngx 七 tab 无 VC；`Edge.version` 字段为 VCS 预留，归 M14 VC 段评估）
- 重新生成 Edge key/secret 入口（ngx 无；若确认为产品缺口另开 issue）
- Edge 导出（ngx 仅 bulk import 无导出）
- Edge 连接状态实时 UI（EdgeConnectionEvent 目前仅被通知规则触发器消费）
- Downlinks 客户端倒排（真正「新的在前」）与时间窗倒序（等价 = 服务端 seqId ASC 直渲，见 5.4）
- OTA 上传前端哈希预览 / 文件大小上限（ngx 未设上限，resources 的 maxResourceSize 不适用）
- OTA 删除被引用的前端预检（`isOtaPackageUsed` 无 REST 端点，需后端配套）
- OTA 详情页 Version Control tab（归 M14 VC 段）
- M12 遗留迁移连带：notifications rules 触发表单 edge 实体选择迁移至 edge service（随收尾波交付）
- Edge/OTA smoke spec 登记 #12（fork 后端 Edge REST 面可用、seed 可行；不可行时降级单测覆盖，计划留痕）
- antd 全新路由无历史包袱：ngx 的 `edgeInstances → edgeManagement` 301 重定向族不实施
- sync 进度轮询（后端无查询端点；loading 态已作为允许增强随 5.2 交付）
- URL 型 OTA 包「新窗口打开外链」下载形态（§5.5 勘误降级：ngx 锚点为禁用；直链复制按钮已承担 URL 获取）

### 5.7 缺陷登记（照 §4.8 体例：前端已规避 / 待后端修复 / 有意偏离）

- **【已实测实锤 2026-09-06】**`sortProperty=customerTitle` 在 Edge 非 Info 列表端点（`/api/edges`、`/api/tenant/edges`、`/api/customer/{id}/edges`）500 "Database error"（errorCode 46；DAO 无列映射，`JpaEdgeDao.java:84-138`；本机后端实测 500，`edgeInfos` 同参 200）；前端规避 = 列表一律用 `edgeInfos` 族端点。
- edge events 端点 `sortProperty/sortOrder` 被后端忽略（`SORT_ORDERS=[seqId]` 硬编码，恒 `seqId ASC`），且事件分区表有 TTL 清理（`EdgeEventsCleanUpService.java:35`）；前端直渲规避，「新的在前」倒排登记 §5.6 增强，「翻旧页」受 TTL 限制属后端行为。
- **【实测新缺陷 2026-09-06】**OTA 包**无 deviceProfileId 时 multipart 上传步 500 空指针**（`OtaPackageInfo.getDeviceProfileId()` null 被调 `.equals`，`OtaPackageController.java:142-163` 链路；本机后端实测：无 profile 建包成功但传文件 500，带 profile 全链 200）；前端规避 = 创建表单 deviceProfileId 必填（照 ngx）；待后端修复候选。
- **【已实测实锤 2026-09-06】**`GET /api/otaPackage/{id}` 回带 base64 全量包体（`data` 字段进 JSON；本机实测 30 字节文件逐字回传）；前端规避 = 表单/详情载入一律 `/otaPackage/info/{id}`（实测无 data 字段）。
- `checksumAlgorithm` 传枚举外值后端 500（`IllegalArgumentException` 未转 400，`OtaPackageController.java:159`）；前端下拉白名单规避，不透传自由文本。
- 上游小瑕疵对照：ngx 指引对话框 direct-url 复制复用 checksum 的文案 key（`ota-update.component.ts:156-187`）；antd 侧用独立文案，不复刻。
- OTA download 对 URL 型包直接 400（`OtaPackageController.java:89-91`）：登记为后端行为契约——前端必须按 `url` 字段分流（外链新窗 vs blob 下载），不作缺陷追究。
- 上游不一致对照：ngx 的 customer 菜单项 edge_instances 不受 `edgesSupportEnabled` 过滤恒显（`menu.models.ts:1057`）；fork 连开关整体不接（§5.0 有意偏离），本条留对照痕。
- **W-1（走查缺陷 2026-09-06，Major，前端，已修）**：勾「不再显示安装指引」后同一会话内再次新建 Edge 仍自动弹指引（PUT 已发、服务端存储正确；刷新后生效）。根因 = 列表页 settingsQuery（staleTime: Infinity）在弹窗写入后，保存回调处取到陈旧缓存（ADR 0007 §5 同型）。修复 = 保存成功后 `await getUserSettings()` 现读再判定；真机复验通过。
- **W-2（走查观察 2026-09-06，后端异步语义）**：Set Edge root 后列表行根链列未即时翻转，API 复核已切换——后端异步生效 + 前端失效时序竞争，刷新即正确；登记不修（乐观更新行列为 §5.6 候选）。

## 6. M14 计算字段独立页 + VC 独立页 + settings 七件 + 密码策略页（已定稿 2026-09-06）

### 6.0 通用边界（四域共守，行为契约，非勾选条目）

- 路由族：CF=`/calculatedFields`（列表，域平铺顶级）；VC=`/version-control`（独立页，域平铺顶级）；settings 七件=「/settings/** 组内子路由」（notifications/home/repository/auto-commit/trendz/ai-models/queues + security-settings）；密码策略页=`/settings/security-settings`（语义对齐 ngx `/security-settings/general`，不搬字面量）。URL 语义对照 ngx `/calculatedFields`、`/features/vc`、`/settings/*`，不搬字面量。
- 角色矩阵（ngx auth 数组 + fork 后端 PreAuthorize 双权威）：CF/VC 全域 TENANT_ADMIN only（路由、菜单、后端三层一致，CUSTOMER 零入口、SYS 零入口——CF 连后端只读能力都没有，与 M13 OTA 不同）；queues 页 SYS only；notifications tab SYS+TENANT 双形态；home/repository/auto-commit/trendz/ai-models TENANT only；security-settings/outgoing-mail SYS only；密码策略页 TENANT 无入口（ngx TENANT security 组只有 oauth2 clients + audit-logs）。SYS_ADMIN 对 CF/VC/settings 租户件写成否定性契约——「无任何页面、菜单与后端能力（前后端双证实）」；CUSTOMER_USER 差异收敛为一条——「四域零入口，直达路由拒绝页」。
- 菜单归属：CF 与 VC 为 TENANT 顶级平铺两项；settings 组子路由按 access 树过滤。
- 「等价 + 禁止删减」四域双向清单（钉进 spec 正文）：
  - **ngx 有什么就必须列什么**：CF 六型配置器全套（SIMPLE/SCRIPT/PROPAGATION/RELATED_ENTITIES_AGGREGATION/ENTITY_AGGREGATION/GEOFENCING）+ 参数/输出/测试/debug/导入导出/三维过滤底座 + 实体 tab 存量并存；VC 独立页复数双面板 + repository/auto-commit 两 settings 表单 + 详情 tab 有承载九处（6 回归 + 3 补挂）；settings 七件全量 + outgoing-mail 回归；密码策略两卡；M12/M13 连带三件。实现不得以「简化」名义砍条目，砍不得的复杂面（GEOFENCING）不得降级。
  - **ngx 没有什么就不凭空造**（侦察「无」清单，spec 原文钉死）：CF 无 CUSTOMER_USER 任何入口（连后端都没有）、ALARM 型不进独立页、GEOFENCING 无地图组件、无批量导出/批量编辑、排序白名单仅 createdTime/name、无 CF 专用可视化表达式编辑器、无复制 ID 按钮、无草稿/两步保存、详情页无 audit/relations 附加 tab；VC 无分支管理 UI（新建/删除/重命名）、无 checkout 会话语义、无仓库级 commit diff、无「列出版本包含哪些实体」UI、无 per-entity-type 版本列表页、无 auto-commit 手动触发/进度 UI、复数版本无 diff；queues 无 topic 输入框（派生 `tb_rule_engine.{name}`）、无 ServiceType 切换（锁 TB_RULE_ENGINE）、无队列统计 UI；notifications tab 的 SMS provider 无 smtp 型（三型 AWS_SNS/TWILIO/SMPP）、EMAIL 卡不在本页（outgoing-mail 独立 tab）、testSms 仅 SYS；home 无 SYS 版、除两字段外无展示配置；trendz 无测试连接按钮；ai-models 无详情路由、无导出导入、模型候选为前端静态清单；密码策略无 pwned-password 检查、无密码历史条数维度、无强制 2FA 开关；settings 各 tab 无导出导入。以上任何一项如实现，属能力级增强，须先改 spec 再动手。
- 关键行为契约：
  - CF 后端保存链**不校验表达式语法**（错误照样入库，运行期 debug event 才报错）——等价基线不强制保存前预检（ngx 同不拦）；「SCRIPT/带表达式提交前自动调 testScript、error 非空阻断（TBEL 未装配 400 时降级放行+警示）」属已实现增强，登记 6.6。CF 更新禁改 entityId（唯一禁改字段，换实体=删了重建）；CF 列表 sortProperty 白名单 `createdTime|name`（entityName 是内存拼接字段，作排序参数 500）。
  - VC 凭据语义：GET 永不回显 password/privateKey/passphrase；提交时空凭据**删字段不传空串**（空串=覆盖为空）；repository settings 保存是「验证式保存」（真实 clone/fetch，失败 500）；autoCommitSettings 未配置 GET 404（用 exists 端点或 catch）；commit/restore 走「POST 拿 requestId → 2s 轮询 status」异步任务模型，DeferredResult 180s 超时要进 loading/重试设计。
  - VC 后端实际可版本化 16 类型（`DefaultEntitiesExportImportService.java:67-74`），swagger 注释 8 种属滞后——antd 类型清单照前端 16 种做常量，验收用真仓逐类型实测，后端不支持的实测报错走 errata 登记，不擅自裁清单。
  - mail 整包覆盖保存无密码回填（testMail 有、saveAdminSettings 无）：outgoing-mail 回归时确认「密码框留空=请求体不带 password 字段」语义不被破坏（T6 实测定论）。
  - securitySettings 的 passwordPolicy 数字字段后端无范围校验（可存出 min>max 死锁策略）：前端必须做 maximumLength ≥ minimumLength 联动校验（ngx 前端同款自校验）。
- 取数端点契约：CF 独立页走 tenant 全量 `GET /api/calculatedFields`（types 不传时后端默认剔除 ALARM——无 ALARM 聚合入口照 ngx 钉死）；`/api/queues` 固定传 `serviceType=TB-RULE-ENGINE` 且不对响应做实体解析（非该类型返回 null body）。
- 实体类型注册：CALCULATED_FIELD / QUEUE / AI_MODEL 的名称、新增文案、空态、搜索占位、helpId 语义对齐（ngx `entity-type.models.ts:488-498,367-375,501-510`；AI_MODEL 无详情 URL 注册属上游事实照抄）。
- 横切契约（沿 M11 §3.7 口径，随收尾勾账）：i18n zh/en key 全等（check-locale 门禁）+ 菜单 key 双语；主题零内联色值（颜色全走 antd token）；数据保全——fixture 终态全 DELETE、git 仓库 fixture 清理、settings 域不留脏配置（尤其 jwtSettings/securitySettings 走查后回读默认值）、system 数据零改动；门禁 lint 0 error / tsc / vitest 定向全绿 / check-locale；自动化回归项归 #12 基线扩充（本 spec = 人工验收载体）。

### 6.1 计算字段独立页操作面（对齐 ngx CF 盘点 §2–§11）

- [x] 列表页骨架：列 createdTime(默认排序 createdTime DESC)/name/entityType/entityName（实体详情页跳链）/type，搜索/分页/排序白名单 createdTime|name，行点击进详情态（锚点 `calculated-fields-table-config.ts:110-170`）
- [x] 三维过滤面板（仅独立页）：types 多选六型 / entityType 四实体型 / entities 实体多选，按钮文案拼已选条件，变更后刷新（锚点 `calculated-fields-filter-config.component.ts:134-138,257-286`）
- [x] 新增入口与类型域：Create（开编辑 dialog）+ Import 两件；类型下拉六型不含 ALARM（钉死）；「Add from IoT Hub」不做（6.6）；批量仅删除（锚点 `:137-156`、`calculated-field.models.ts:131`）
- [x] 编辑表单骨架：name（必填 ≤255）/ debugSettings（失败调试默认开）/ entityId（`tb-entity-select` 等价四实体型选择器，编辑态锁定+owner 联动）/ type 切换规则（SIMPLE↔SCRIPT 互切保配置、其余清空 configuration）（锚点 `calculated-field-form.service.ts:39-94`、component ts:142-168）
- [x] 参数套件（六型共用）：参数表格 + popover 编辑面板 + 校验（组内唯一、保留名 ctx/e/pi、attribute 型 scope 联动、Rolling 仅 SCRIPT 可选、watchKeyChange 跟随）（锚点 scout-cf §5）
- [x] 服务端限额消费：maxArgumentsPerCF / maxDataPointsPerRollingArg / maxRelationLevelPerCfArgument / maxRelatedEntitiesToReturnPerCfArgument / 各 minAllowed*Interval / intermediateAggregationInterval 八参数接进表单校验边界（锚点 scout-cf §12）
- [x] 输出套件：ATTRIBUTES/TIME_SERIES + scope（仅 ATTRIBUTES×Device 族）+ 输出策略 IMMEDIATE（参数开关组+useCustomTtl）/RULE_CHAIN（参数面板锁定）+ 载入无 strategy 补默认（锚点 scout-cf §6）
- [x] SIMPLE 配置器：参数表禁 Rolling（报错提示）+ 表达式 input（必填 ≤255 + math 函数帮助弹窗可省略）+ useLatestTs 仅 Timeseries 输出（锚点 scout-cf §4）
- [x] SCRIPT 配置器：代码编辑器（Ace 等价物）+ functionName=calculate + TBEL 语义 + 参数名补全与高亮（数据结构照抄 ngx models.ts:606-1042）+ 测试按钮（arguments 无效禁用）+ 默认脚本（锚点 scout-cf §4）
- [x] 表达式测试对话框：SCRIPT/RELATED_ENTITIES_AGGREGATION/PROPAGATION-带表达式 三入口；已存 CF 用最新 debug 事件预填；Test script 走 `POST /api/calculatedField/testScript`（错误进 error 字段非 HTTP 错误）；Save 回填表达式；提交前自动预检（error 非空阻断、TBEL 400 降级放行+警示）= 已实现增强见 6.6（后端保存链不校验语法）（锚点 scout-cf §8、backend §5-1）
- [x] debug 事件与 debug settings：行内 debug 配置按钮（策略面板等价）+ 事件查看（列表=通用事件弹窗、详情态=debug 专页）+ 「Test with this message」回填链（锚点 scout-cf §8）
- [x] PROPAGATION 配置器：relation（direction 默认 TO、relationType 写死 ['Contains','Manages'] 照抄收口成常量）+ applyExpressionToResolvedArguments 联动 + 表达式默认脚本 + output（锚点 scout-cf §7.1）
- [x] RELATED_ENTITIES_AGGREGATION 配置器：relation（FROM 默认）+ 变体参数表（defaultValue 必填、候选按 relation 过滤）+ metrics 面板 + deduplicationIntervalInSec 默认服务端 min（锚点 scout-cf §7.3）
- [x] ENTITY_AGGREGATION 配置器：周期八值 + tz + CUSTOM durationSec 下限 + offsetSec 动态 hint（可简化为静态提示，登记增强）+ allowWatermark + produceIntermediateResult 阈值联动 + metrics 共用面板（锚点 scout-cf §7.4/7.5）
- [x] GEOFENCING 配置器：entityCoordinates（经纬 key 名必填，antd 建模补 ngx TS 漏字段）+ zoneGroups 两件套（zone 面板：引用实体/CURRENT/TENANT/OWNER/RELATION_QUERY、relation levels 拖拽上限 2、perimeterKeyName、reportStrategy 三值、createRelations 联动）+ scheduledUpdateEnabled 默认开（锚点 scout-cf §7.2）
- [x] 导入导出：单条 JSON 导出（剥 entityId）+ 导入（ALARM/未知 type 拒收 toast、TENANT 引用 id 改写、类型选择禁用）（锚点 `import-export.service.ts:179-190,1247-1249`、table-config :350-396）
- [x] 复制与删除：Copy（deepClone 删 id，pageMode 清 entityId/entityName 要求重选）+ 删除单条/批量 + 确认四件套（锚点 table-config :172-200,321-348）
- [x] 实体 tab 双模式换挂：device/asset/device-profile/asset-profile 四处详情 tab 换挂共享 `CalculatedFieldsTable`（entity/tenant 双模式，照 ngx 同一 table-config 同构；v1 简版 `CalculatedFieldsPanel` 同 PR 退役），tab 模式无三维过滤、行内 Edit、编辑走 dialog；alarm-rules tab 归告警域不动（锚点 scout-cf §11、arch R17、ngx device-tabs:34-41）

### 6.2 VC 独立页与详情 tab 挂载（对齐 ngx VC 盘点 §2–§6）

- [x] 独立页二段开关：无仓库→内嵌 repository settings 表单；有仓库→Versions 表；dirty 离开确认（ConfirmOnExit 等价）；「仓库是否已配置」二段呈现为行为契约（探测机制实现定，见 6.0）（锚点 `version-control.component.html:18-34`）
- [x] repository settings 表单：repositoryUri/defaultBranch(默认 main)/readOnly/showMergeCommits/authMethod 双态动态校验（USERNAME_PASSWORD/PRIVATE_KEY）+ 凭据不回显两段式（Change password/passphrase 勾选解锁）+ Check access（留空沿用存储值）+ Delete 确认 + readOnly 全域联动 + 保存后清分支缓存；空凭据删字段契约端点单测钉住（锚点 scout-vc §3、backend §5-6）
- [x] Versions 表（复数+单实体共用形态）：分支选择器（selectionMode 只选已有/自由输入两形态）/ 搜索 400ms 防抖 / 列 timestamp(默认 DESC)/id(截断+复制全 hash)/name/author / 分页 10/20/30 / readOnly 时 Create 禁用 / 单复数空态文案（锚点 `entity-versions-table.component.*`）
- [x] 复数 create 面板：branch + versionName + syncStrategy（MERGE/OVERWRITE 必选带 hint）+ entityTypes 面板（16 类型展开面板：per-type syncStrategy/saveCredentials 仅 DEVICE/saveAttributes/saveRelations/saveCalculatedFields、allEntities 关则实体手选）（锚点 `complex-version-create.component.*`、`entity-types-version-create.component.html`）
- [x] 复数 restore 面板：entityTypes 面板（removeOtherEntities 危险开关**逐字输入确认**、findExistingEntityByName 默认 true、load 四开关含 saveCalculatedFields 文案分支）+ rollbackOnError 默认 true + 按类型结果计数 + 错误三态文案（凭据冲突/缺引用实体/运行时）（锚点 scout-vc §2）〔M14 走查 ✅：错字拒/逐字亮/门亮后取消全链；破坏性执行为登记偏离——租户 14 台真设备会被误删，安全恢复路径已实证（走查文档 §7）〕
- [x] 单实体 create/restore 弹层：versionName 默认 `{{entityName}} update`、saveCredentials 仅 DEVICE、saveCalculatedFields 按 typesWithCalculatedFields 显隐（CUSTOMER 文案换 alarm-rules）；restore 前先 getEntityDataInfo 探测显隐四开关（锚点 `entity-version-create/restore.component.*`）
- [x] 异步任务与结果流：commit/restore「POST→requestId→2s 轮询」+ 全局 loading 锁 + done 且 added+modified=0 显示 nothing-to-commit + HTTP/任务错误双通道展示 + finalize 清分支缓存（锚点 `entities-version-control.service.ts:92-159`）
- [x] 详情 tab 补挂三处：OTA 详情（M13 §5.6 兑现，守卫 TA+租户包）/ rule-chain 详情对话框加 tab / widget-type 详情 tab（路由在场 `routes.ts:165-172`，v1 头注「路由缺口」过时）（锚点 `ota-update-tabs.component.html:19-25`、`rulechain-tabs.component.html:67-74`）；dashboard 编辑器 VC 占位按钮接真登记 6.6（ngx `dashboard-page.component.html:172-184` 弹层语义）
- [x] 详情 tab 存量回归六处：customer/asset/device/entity-view/device-profile/asset-profile 的 VersionControlPanel 与独立页共用一套实现后仍可用（commit/版本表/diff/restore 冒烟）；device-profile 保持非编辑态条件（锚点 panel-scope §0-11 消费图谱）〔M14 走查 ✅：device/customer 真机抽查 + 其余四处定向测试 69+30 绿（走查文档 §8）〕
- [x] 「未配仓库」降级提示升级：面板/独立页未配仓库态补「去配置」跳转链接指向 `/settings/repository`（M13 遗留连带，锚点 `VersionControlPanel.tsx:13-14` 自留接口）

### 6.3 settings 七件操作面（对齐 ngx settings 盘点 §2–§8）

- [x] queues 列表（SYS only）：四列 name/partitions/submitStrategy/processingStrategy、锁 TB_RULE_ENGINE、Main 行无勾选框无删除（前端保护）、搜索/分页/默认 createdTime DESC、行点击详情抽屉 + Open details page（锚点 `queues-table-config.resolver.ts:44-132`）
- [x] queues 表单（嵌套策略三面板）：name 编辑态锁死 + topic 自动派生不可输入（钉死）+ submitStrategy 五值 radio（BATCH 出 batchSize 默认 1000）+ processingStrategy 六值 radio + retries/failurePercentage/pause 三数字组 + pollInterval/partitions/packProcessingTimeout/consumerPerPartition/additionalInfo 三件；删除吃后端 400 引用报错（锚点 scout-settings §2.2、backend §3）
- [x] notifications tab SYS 形态：SMS provider 卡（AWS_SNS/TWILIO/SMPP 三型子表单，无 smtp 型钉死）+ MOBILE_APP 卡（Firebase service account JSON 上传）+ Send test sms 弹窗（numberTo pattern + message ≤1600，不必先保存）（锚点 scout-settings §3.2）
- [x] notifications tab TENANT 形态与保存链：仅 Slack botToken 卡；保存走 `POST /api/notification/settings`（deepTrim + 逐投递方式清洗：空串删整个 method、否则补 method 字段）；confirmForm 双表单盯 dirty（锚点 `sms-provider.component.ts:111-148`）
- [x] home settings（TENANT only）：dashboardId 选择器（scope=tenant、不自动选第一个）+ hideDashboardToolbar（默认 true）→ `POST /api/tenant/dashboard/home/info`；**验收口径=保存成功即达标，/home 生效面归 M15**（锚点 `home-settings.component.*`、DashboardController:472-514）
- [x] repository / auto-commit 两 tab 挂载：`/settings/repository`、`/settings/auto-commit` TENANT only + dirty 离开确认；表单本体按 6.2-2 验收不重复；auto-commit tab 二段开关（无仓库先见 repository 表单）（锚点 `admin-routing.module.ts:333-356`、`auto-commit-admin-settings.component.html:18-24`）
- [x] auto-commit 设置面板：按 EntityType 粒度展开面板（选项=16 类型去重已用）+ 每项 branch 自由输入补全（空=Default）+ 四 checkbox（saveCredentials 仅 DEVICE、saveCalculatedFields 显隐）+ readOnly 全 fieldset 禁用 + hint + remove-all；**无 syncStrategy 钉死**（与手动 create 面板不要混）；非法分支名吃后端 400（锚点 scout-vc §4）
- [x] trendz settings（TENANT only）：isTrendzEnabled + trendzUrl（启用时必填 + URL pattern）+ apiKey（trim）→ `POST /api/trendz/settings` + 保存后同步全局状态位（菜单/入口按此显隐，antd 对等实现）（锚点 `trendz-settings.component.ts:45-102`）
- [x] ai-models 列表（TENANT only）：四列 createdTime/name/provider/modelId、行点击即编辑 dialog（无详情页钉死）、删除单条+批量、搜索/分页/默认 createdTime DESC、无导出导入（锚点 scout-settings §7.1）
- [x] ai-models 编辑对话框：name + provider 九值下拉 + providerConfig 按白名单启停矩阵（9 provider 字段表）+ OPENAI baseUrl 特例（非官方地址 apiKey 变选填）+ OLLAMA 认证三态 + modelId 静态清单补全（空清单自由输入）+ 采样参数白名单渲染（锚点 `ai-model-dialog.component.*`、`ai-model.models.ts:60-226`）
- [x] ai-models Check connectivity：表单未保存可测（invalid 禁用）、`POST /api/ai/model/chat` 探测、成功态/失败 errorDetails 展示（锚点 `check-connectivity-dialog.component.ts:48-82`）
- [x] outgoing-mail 回归（v1 已交付不重做）：预设覆写、OFFICE_365 派生、change-password 闸门、redirect-URI 构造、generate-token 跳转五链路冒烟；**「密码留空=不带字段」语义 + testMail 回填**回归确认（T6 定论回写 6.7）（锚点 `pages/settings/outgoing-mail/index.tsx:234-248`）

### 6.4 密码策略页操作面（SYS only，对齐 ngx security-settings §5）

- [x] General policy 组：maxFailedLoginAttempts（空=不锁定）/ userLockoutNotificationEmail（email 格式）/ userActivationTokenTtl（1-24 默认 24）/ passwordResetTokenTtl（同）/ mobileSecretKeyLength（min1）；Undo 按钮 + dirty 离开确认（锚点 `security-settings.component.ts:79-83`）
- [x] Password policy 组：minimumLength(6-50)/maximumLength（**不得小于 minimumLength 联动校验**，防 min>max 死锁策略）/ 四类最少字符 / passwordExpirationPeriodDays / passwordReuseFrequencyDays（antd 类型补全 ngx TS 漏字段）/ allowWhitespaces（默认 true）/ forceUserToResetPasswordIfNotValid（默认 false 带 hint）（锚点 ts:84-97,136-146、backend §5-12）
- [x] JWT 卡：tokenIssuer 必填 + tokenSigningKey（base64 解码 ≥64 位 + Generate key 按钮）+ tokenExpirationTime/refreshTokenExpTime（后者必须大于前者）+ **保存链**：issuer/key 被改先弹确认框 → `POST /api/admin/jwtSettings` 返回新 token 对 → 就地换发当前会话 → 回读刷新表单（锚点 ts:101-134,160-219）〔M14 走查 ✅：换发全链真机实证并复原——token 热替换 336ms/表单回读新钥/新 token GET 200/原钥复原 keyRestored=true（走查文档 §2）〕

### 6.5 M12/M13 连带交付与横切收尾

- [x] 发送向导「渠道未配置」tooltip 升级：`deliveryMethodNotConfigured` 死文案改为跳 `/settings/notifications` 链接（SA/TA 按 tab 可达性显隐；CU 保留文案）（锚点 `wizard.tsx:641-651`、M12 §4.7 登记兑现）
- [x] notification settings 预留函数消费：getNotificationSettings/saveNotificationSettings/getAvailableDeliveryMethods 三函数接入 6.3-3/4 页面（零 UI 消费方状态终结）；user 偏好两函数维持登记不实施（锚点 `services/tb/notification.ts:151-202`）
- [x] 权限快照三登录：CU 直达 `/calculatedFields`、`/version-control`、`/settings/*` TENANT 页与 security-settings 全部拒绝页；SYS 登录 `/settings` 落 general、TENANT 落 home；TA 无 queues/security-settings/outgoing-mail 入口（矩阵见 6.0）
- [x] i18n 横切：新增 `pages.calculatedFields.*`/VC 独立页/settings 增量域 zh/en key 全等（check-locale 门禁）+ 新 menu key 双语；退役的 v1 CF 面板旧 key（`pages.devices.detail.cf*` 族）同 PR 删除（锚点 scout-antd §7、arch R32）
- [x] 主题横切：零内联色值，新增页颜色全走 antd token（沿 M11 §3.7 口径）
- [x] 数据保全：CF/VC fixture（计算字段/版本/分支/queue/ai model）终态全 DELETE；git 仓库 fixture 清理；jwtSettings/securitySettings/trendz 走查后回读默认值；system 数据零改动
- [x] 门禁：lint 0 error（基线 warnings 只降不升，grep `^Found` 防截尾）/ tsc / vitest 定向全绿（波次门禁用目标目录跑法）/ check-locale
- [x] e2e 与 #12 登记：settings 走查补进 `e2e/specs/smoke/sys-admin.spec.ts`；M14 回归项（CF CRUD 主路径、VC commit/restore 异步闭环、settings 七页保存链）登记 #12 基线扩充（comment 留痕）

### 6.6 能力级增强登记（只登记不验收，不设硬门槛）

- alarm-rules tab 编辑器深化（按严重级条件树/排程/propagate/clearRule 全量编辑器，20+ 组件群）——归告警域后续工作；v1 基础操作面在场维持现状
- Edge 详情 version-control tab（维持 M13 §5.6 登记；`Edge.version` 字段为 VCS 预留）
- iot-hub 域（CF 列表「Add from IoT Hub」按钮 + 独立市场入口页）与 mobile-center 域——不在 M14，整域登记
- pwned-password（HIBP）泄露检查、密码历史条数维度、强制 2FA 开关——本版 ngx/后端双侧均无
- CF 右侧详情抽屉/独立详情页形态（现「列表+dialog」等价基线之上）；CF math 函数帮助弹窗；ENTITY_AGGREGATION offsetSec 的 moment 动态 hint（现可静态提示）
- 双栏并排 JSON diff + 差异导航/全屏（现 changed-fields 表等价基线之上）
- tenant-profile 配置页暴露 CF 八限额字段（tenant-profile 域，M14 只消费不暴露）
- 用户级通知偏好 `/account/notificationSettings`（账号域，维持 M12 登记）
- 后端 Main 队列删除保护（另立 issue，不混 M14）
- CF 提交前自动 testScript 预检阻断（含 TBEL 未装配 400 降级放行+警示）——M14 已实现，等价基线外的自设防线（6.0/6.1-10）
- dashboard 编辑器 VC 占位按钮接真（编辑器域 onBeforeCreateVersion 先存再 commit 等价）——编辑器壳非 tab 形态，后置登记
- widgets-bundle/TBResource 详情壳先建后挂 VC tab（无宿主详情壳）
- queues 的 TENANT 只读视图、ServiceType 切换、队列统计 UI（ngx 均无）
- trendz 测试连接按钮；ai-models 模型候选 API 化（现静态清单）；ai-models 对话框标题区分 add/edit（上游小瑕疵有意不复刻）
- ngx 旧路径 301 重定向族（`/vc→/features/vc`、`/settings/sms-provider→/settings/notifications`、`/settings/security-settings→/security-settings/general` 等）——antd 全新路由无历史包袱不实施
- settings 组内子路由的 e2e 覆盖深度（sys-admin.spec 最小断言之外的扩展）

### 6.7 缺陷登记（照 §4.8 体例：前端已规避 / 待后端修复 / 上游对照；随 wave-1 实测回写定论）

- CF 保存链不校验表达式语法（错误 expression 照样入库，运行期 debug event 才报错，`DefaultTbCalculatedFieldService.java:116-169`）：前端规避 = 提交前自动 testScript 预检（已实现增强，TBEL 未装配时降级放行+警示，见 6.6）。
- CF 更新禁改 entityId（`DefaultTbCalculatedFieldService.java:185-189`）：前端规避 = 编辑态锁定目标实体选择器（6.1-4）。
- CF 列表 sortProperty 别名 500 风险（dao 无列映射，`JpaCalculatedFieldDao.java:81-110`；`entityName` 是内存拼接字段）：前端规避 = 排序白名单 `createdTime|name`，与 swagger 白名单一致、无 M13 customerTitle 型陷阱。
- `/api/calculatedFields` 缺省剔除 ALARM 型（`CalculatedFieldController.java:213-216`）：上游行为非缺陷——「无 ALARM 聚合入口」照 ngx 钉死，登记为边界对照。
- `/api/queues` 角色名不副实：save/delete 仅 SYS_ADMIN；TENANT GET 返回的是系统队列（fork `getSystemOrIsolatedTenantId` 使非 isolated 租户读 system 租户队列，T5 实测 3 条；真租户队列在 tenant profile JSON 不经此端点）：前端规避 = 页面 SYS only（6.3-1）。
- `saveQueue` 对非 TB-RULE-ENGINE serviceType 返回 null 空 body（`QueueController.java:143-144`）：前端固定传 TB-RULE-ENGINE 且不解析响应体。
- VC 凭据「空串 ≠ 留空」（Jackson 空串非 null、restore 回填只认 null，backend §5-6）：前端规避 = 空凭据字段序列化时删字段（`stripBlankCredentials`），端点单测钉住。
- `GET /api/admin/autoCommitSettings` 未配置时 404（checkNotNull 非 404 语义兜底）：前端规避 = 先 exists 或 catch 404 视为空配置。
- trendz apiKey 对 CUSTOMER_USER 裸露（`TrendzController.java:70-78` 无脱敏；T10 已实锤：CU token 明文读得 apiKey）：前端规避 = 不建 CU 入口；**待后端修复候选**（收紧 TENANT-only 或 GET 脱敏）。
- mail 整包覆盖保存无密码回填（testMail 有、saveAdminSettings 无）：前端规避 = 「密码框留空=请求体不带 password 字段」既有实现维持；T6 实测定论（2026-09-06）：缺字段回填 / 空串真覆盖 / testMail 独立回填三点全部实锤，testMail 失败形态 500 非 400。
- securitySettings 的 passwordPolicy 全字段无 @Min/@Max（`UserPasswordPolicy.java:25-48`，可存出 min>max 死锁策略）：前端规避 = maximumLength ≥ minimumLength 联动校验 + 各字段范围（照 ngx 前端）；后端补约束另立 issue。
- `POST /api/admin/jwtSettings` 保存即签发新 token 对（旧 token 是否失效取决于签名 key 是否变更）：前端规避 = 保存成功就地换发会话（6.4-3 交互链整体对齐）。
- VC DeferredResult 180s 超时（大 repo 首次 clone 可能顶满，`EntitiesVersionControlController.java:88-89`）：前端 loading/重试按此设计；超时错误形态（AsyncRequestTimeoutException → 500）进错误映射占位。
- VC 裸仓首次提交前 `listVersions` 500（unborn HEAD，JGit 对空仓无 ref，wave-6 真机实测）：前端按错误 Alert 呈现不崩溃，首次 commit 后自愈——登记为后端行为契约，走查作业单需先做 create 再查版本表。
- VC swagger 注释 8 种可版本化类型滞后（实际 16 种，`DefaultEntitiesExportImportService.java:67-74`）：验收以真仓实测为准；后端实测不支持的类型走 errata 登记，不擅自裁前端清单。
- 上游 TS 模型滞后三处对照：ngx `CalculatedFieldGeofencingConfiguration` 漏 entityCoordinates、`RepositorySettings` 漏 readOnly、`UserPasswordPolicy` 漏 passwordReuseFrequencyDays——antd 建模一律补全（后端字段均实存），不照抄缺口。
- 上游小瑕疵对照：ai-model 对话框标题不随 add/edit 切换；ngx TS 模型 RELATED/ENTITY_AGGREGATION 的 output.decimalsByDefault 字段 UI 不渲染（payload 直传保留）——antd 按「模型补全、UI 照 ngx 面呈现」处理，注释留痕。
- 走查缺陷与观察登记（2026-09-06/07 真机走查）：**W-1/W-2 已修**（CF 测试对话框预填竞态、tab 模式实体缺口无提示——各带单测）；**W-3～W-9 观察项**不构成验收缺口（自动化环境错误边界不复现、beforeunload 只拦刷新/关页为既定等价口径、Windows JGit pack 句柄锁环境问题、版本 id 截断位数不一致等）——全文见 [v2-m14-browser-walkthrough.md](./v2-m14-browser-walkthrough.md) §5/§11。
- **admin settings 保存缺陷（T6-① 已实锤 2026-09-06，前端，wave-2 修复）**：v1 已交付 general/connectivity/outgoing-mail 三页保存 body 只回传 `{key, jsonValue}` 不带 `id`，后端对同 key 无 id POST 一律 400 "Admin settings with such name already exists!"（dao 层无 upsert，系统初始化预建记录）——真机二次保存 400 复现；修复 = payload 带快照 id（`AdminSettings` 类型已补 `id` 字段），M14 新 settings 页一律带 id 编码；三存量页随 wave-2 回归修复。

## 7. M15 home 首页 + 匿名公共仪表盘 + 收口（定稿 2026-09-07）

> 依据：四份侦察底稿（`docs/agents/m15-ngx-inventory-home.md` / `m15-ngx-inventory-public-dashboard.md` / `m15-backend-contract.md` / `m15-antd-current-state.md`）+ 三镜头合议（`m15-panel-scope.md` / `m15-panel-arch.md` / `m15-panel-contract.md`）。已定裁决：兜底形态 = antd 原生 quick links（P1-B，ngx 静态 JSON 移植为能力级偏离登记）；登录落点 = 三角色统一 `/home`（P3-A，SA 落点 `/tenants`→`/home` 为对 v1 §3.2 的有意修订）；usage 下钻 = 缓做触发未满足，只落评估（7.3）；M12 存量勾账 = 收口补轻走查（7.4-1，用户拍板 2026-09-07）。

### 7.0 通用边界（home + 公开 + usage 三面共守，行为契约非勾选条目）

- 路由族与角色矩阵：`/home` 三角色可达（ngx `home-links-routing.module.ts:122-137` auth 三角色、组件无角色分支）；公开仪表盘走顶层无壳路由 `/dashboard/:id` + `?publicId=` 匿名可达（无独立公开路由，钉死）；`/usage` TENANT_ADMIN only 维持。
- 「home」两族端点分工钉死（防混写）：/home 页渲染与落点判断消费 `GET /api/dashboard/home`（三角色；未配置 = 200 **0 字节 body**，SA 恒空；悬挂 id 被后端 extract 吞掉天然免疫）；`GET|POST /api/tenant/dashboard/home/info` 仅供 M14 配置页读写（TA only，未配置 = `{dashboardId:null,hideDashboardToolbar:true}`，**不校验存在性 → 悬挂 id 只从它泄漏**）。前端不得用 tenant info 端点做三角色判断（CU/SA 403）。
- 匿名换票契约钉死：公开链接恒为 `/dashboard/{id}?publicId={publicCustomerId}`（publicId = `assignedCustomers` 中 `public:true` 条目的 customerId）；publicId 消费路径 = `POST /api/auth/login/public` 换 **完整 JwtPair（含 refreshToken）**，一切失败（非 UUID/查无/非 public/缺失）= **401 非 400**（wave-1 实测：errorCode=10，文案两种——非 UUID/查无/非 public = "Invalid username or password"、缺失 publicId = "Authentication failed"）；无 PUBLIC 独立角色（公开会话 = CUSTOMER_USER + isPublic claim，权限全复用 CU 规则：dashboard 分配给 Public customer 才放行，存在但无权 403、不存在 404）；公开会话强制 fullscreen/readonly 是**前端约定非后端强制**；WS `/api/ws/**` permitAll + 首帧 AuthCmd{token}，public JWT 全通，core/ws 零改动；public 刷新链实测定案（POST /api/auth/token 新 JwtPair、sub 仍 publicId）。
- 登录落点语义钉死：判定序 = `?redirect`（安全回跳）> 用户级 `defaultDashboardId`（仅 TA/CU，`additionalInfo.defaultDashboardId`，响应已被后端清洗读到即有效；全屏语义由 `/dashboard/{id}` 无壳形态承载，收敛单形态）> 统一 `/home`。SA 无 defaultDashboard 分支。isPublic 用户恒落公开 dashboard 不进应用壳。
- 「空 home」响应形态（wave-1 实测勘误后定案）：`/api/dashboard/home` 未配置/悬挂/SA 三态均 **200+0 字节**（前端 falsy 归一）；`/api/tenant/dashboard/home/info` 未配置 = `{dashboardId:null,...}`；契约稿「/dashboard/home/info SA 返 JSON null 4 字节」实测不成立（实测同为 0 字节；antd 不消费该端点，仅登记）。服务层归一单测已钉住。
- 横切沿 §3.7/§6.0 口径随收尾勾账（i18n 双语门禁、零内联色、数据保全终态回基线、门禁四绿）；自动化回归项归 #12 基线扩充；本 spec = 人工验收载体。

### 7.1 home 首页操作面

- [x] `/home` 路由与菜单：三角色可达（access=`canAuthenticated`、菜单首位三角色在场；锚点 ngx `home-links-routing.module.ts:122-137`、`menu.models.ts:848/919/1030`）〔M15 wave-2 真机 ✅：SA/TA/CU 三角色菜单「首页」首位高亮在场〕
- [x] 登录落点链改造：登录成功、`/` entry、MFA 成功、SA 模拟登录、404 回退五处同源落点随 `roleDefaultPath` 三级化统一调整为 `/home`；`?redirect` 回跳优先级保留；OAuth2 回调落点随动（锚点 `pages/user/utils.ts:54-56`、`pages/user/login/index.tsx:144-145`、`pages/home/entry.tsx:17-33`）〔对 v1 §3.2 落点契约的有意修订（SA `/tenants`→`/home`），修订记录留痕〕〔M15 wave-2 真机 ✅：SA/TA/CU 登录均落 /home、`/nonexistent`→落 /home 目击；五消费点切 `resolveDefaultPath`、roleDefaultPath 退役 grep 零引用〕
- [x] 直跳分支：TA/CU 持用户级 `defaultDashboardId` 时落点改跳 `/dashboard/{id}`（`defaultDashboardFullscreen===true` 同路径，无壳即全屏语义）；isPublic 用户直跳公开仪表盘锁死不进壳（锚点 ngx `auth.service.ts:293-300,638-657`）〔用户级写入口后端无自助端点不交付，分支验收=单测锚 + 走查 API 直写构造场景〕〔单测锚 ✅：resolveDefaultPath 五用例（TA/CU 命中 `/dashboard/{id}`、fullscreen 收敛单形态、SA 恒 /home、非法 id 守卫、无 user）；真机未构造 defaultDashboard 场景（后端清洗键、写入口不交付，按验收口径以单测收口）〕
- [x] home dashboard 数据链：/home 页消费 `GET /api/dashboard/home`（服务层新增 `getHomeDashboard`，空 body→undefined 归一单测钉住）；未配置走 quick-links 兜底；CU 命中 user→customer→tenant 回退链；SA 恒兜底（锚点 `DashboardController.java:422-450`）〔M15 wave-1/2 ✅：真机 /home 调 GET /api/dashboard/home 恰 1 次、SA/未配置走兜底；归一单测钉三空形态（undefined/null/''），react-query undefined datum 坑波内修复（queryFn 归一 `?? null`）〕
- [x] 渲染面：`pages/home/page` 薄壳复用 DashboardPage 只读形态；`hideDashboardToolbar` 以 `hideToolbar` prop 生效（OR 语义，逐字对齐 ngx getter——**dashboard 工具栏隐藏 ≠ 应用壳顶栏隐藏**，双层分开验收，antd 不实施 ngx hideMainToolbar 登记偏离）；states 取 root:true 态不硬编码 'main'，`?state=` 深链免费获得（锚点 `dashboard-page.component.ts:199-201`、`use-states-controller.ts:51-65`）〔M15 wave-2 真机 ✅：Thermostats 真渲染（`data-dashboard-page` 在场）、hideDashboardToolbar=true 时 toolbar DOM 不存在、取消勾选保存后 toolbar 显（timewindow+折叠钮）；双层语义分核，壳顶栏保持在场（偏离已登记）〕
- [x] 未配置兜底形态：antd 原生 quick-links 网格（角色菜单顶级节推导 + access 过滤 + 图标映射，推导不可行降级静态清单三角色常量）；兜底加载失败不白屏（ngx 该分支无兜底，antd 增强为错误态登记）〔P1-B 定案；ngx 静态 JSON 移植为能力级偏离登记——全 Angular descriptor 渲染即占位墙，锚点 `m15-panel-arch.md` R40〕〔M15 wave-2 真机 ✅：SA 5 卡 / TA 19 卡 / CU 6 卡，角色 access 过滤正确；数据源 = umi clientRoutes + useAccessMarkedRoutes 推导案定型，图标直接透传 umi 预解析元素（自建映射全 miss 波内改为透传）；错误态 Alert 在场〕
- [x] 悬挂 id 容错：/settings/home 配置的 dashboard 被删后 /home 正常回落兜底不白屏（`/api/dashboard/home` 链后端已吞；前端防 404 分支兜一层）（锚点 backend 契约 #2）〔wave-1 curl ✅：悬挂链两端点双向实锤（tenant info 200+悬挂旧 id；/api/dashboard/home 同刻 200+0 字节）；前端错误 Alert 分支在场——「删盘后访问 /home」全链未真机构造（后端免疫 + 组件错误分支在场，按行为链收口）〕
- [x] 配置页联动往返：TA `/settings/home` 配置 → 登录/进 /home 渲染该 dashboard（hideToolbar 随配置）→ 取消配置（POST dashboardId:null）→ 回兜底——M14 欠账注释（`pages/settings/home/index.tsx:13`）销账〔M15 wave-2 真机 ✅：配置 Thermostats→保存→/home 真渲染→hideToolbar 随配置→清空保存→回兜底 全链；终态 API 复核回基线 `{dashboardId:null,hideDashboardToolbar:true}`〕

### 7.2 匿名公共仪表盘操作面

- [x] make-public/private 出口回归核对（v1 已交付不重做）：列表行操作互斥 + Public 列 + public customer 保护（ManageDashboardCustomersDialog 排除）；**链接 toast「匿名页面后续交付」欠账文案随落地页交付退役**（锚点 `pages/dashboards/list/index.tsx:181-217,498-529,203-209`）〔M15 wave-3 ✅：新文案「公开链接已生效，匿名用户可直接访问。」真机弹窗目击 + 测试断言新文案在/旧文案不在；行操作互斥与 public customer 保护既有测试维持绿〕
- [x] publicLogin 服务函数：`POST /api/auth/login/public`（body `{publicId}` → JwtPair 全额 setTokens，函数级单测断副作用）+ openapi 快照补录（锚点 `RestPublicLoginProcessingFilter.java:53-79`；服务层落 auth.ts 域边界）〔M15 wave-1 ✅：单测断 URL/body/**setTokens 副作用**/authExempt 豁免（401 不触发通用 refresh-unauthorized 链）+ curl 实测失败形态两种文案；openapi 快照无此端点为上游事实，JSDoc 钉后端锚点即「补录」口径〕
- [x] 公开路由 gate：`/dashboard/:dashboardId` 去 `access` 字段改页面自治 gate（四态决策表：匿名+publicId→换票渲染 / 匿名无 publicId→跳 login?redirect / 公开会话 sub===publicId→直渲染（F5 刷新免重登）/ 登录用户→忽略 publicId 以本人渲染；公开会话 sub≠publicId→重换票）；同路由承载登录/公开双态不新建路由（锚点 `m15-panel-arch.md` R42、ngx `auth.guard.ts:122-131`）〔M15 wave-3 ✅：public-gate 纯函数 9 用例 + 组件测试 9 条；真机各分支目击（匿名换票渲染 / 无 publicId 跳 login / F5 免重登换票 0 次 / TA 带 publicId 忽略之）〕
- [x] 匿名全链走查（真机）：未登录打开公开链接 → 清残留 token → publicLogin 换票 → isPublic JWT 入 tokenStore → 渲染 → WS 匿名会话出实时数据（WS 零改动确认，锚点 `TbWebSocketHandler.java:188-214`）〔M15 wave-3 真机 ✅：Playwright 隔离 context 匿名打开→POST login/public 200→GET dashboard 200→3 widget 渲染 0 占位；WS 全程无异常关闭码（demo 盘无实时订阅 widget，实时出数注记为受实体分配约束的正常语义）〕
- [x] 无壳形态清单：强制 readonly（无编辑入口）、fullscreen/export/dashboards-select 三件藏（embedded 语义等价 ngx forceFullscreen）、无用户菜单与通知铃、无登录按钮、timewindow 可见可调、logo 不建（antd 全域既有缺口，倒挂防呆登记）（锚点 `m15-panel-arch.md` R43）〔M15 wave-3 真机 ✅：无壳无用户菜单、embedded 藏三件、readonly 无编辑入口、timewindow 在场；logo 不建（R43 倒挂防呆，登记 §7.5）〕
- [x] 401 失败路径隔离：公开页会话过期/请求 401 **不触发** `handleUnauthorized` 跳登录——展示「会话过期请刷新重进」空态（public JWT 有 refresh 续期，仅 refresh 也失败才到该态）（锚点 `app.tsx:57-66`、契约 #6）〔M15 wave-3 ✅：实现 = 页内 unauthorized handler 换入/恢复（`getTbUnauthorizedHandler` 最小增量，HTTP refresh 失败与 WS AUTH 拒绝两道同汇）；组件测试钉「401 清 token+空态不跳登录」；「会话过期」空态真机未驱动（需 JWT 自然过期 ~2.5h），handler 触发路径已测〕
- [x] 失效行为两条：①make-private 后旧链接——publicLogin 仍成功但 getDashboard 403 → 专用「此仪表盘不再公开」空态**不跳登录**（403 不走 401 通道）；②publicId 无效/public customer 已删——publicLogin 401 → 抹参数 → 落 `/login`（锚点 ngx `auth.service.ts:327-331`）〔M15 wave-3 真机 ✅：①make-private 后旧链接 → publicLogin 200 + getDashboard 403 → 「此仪表盘已不再公开。」空态、URL 不变未跳登录；②无效 publicId → 抹参数跳 `/user/login?redirect=…`；恢复 make public 复测可看〕
- [x] 复用隔离：view 页「TA 空板自动进编辑器」副作用不进公开页与 /home 页（薄壳自建结构性免疫，副作用留在 view 页消费点）（锚点 `pages/dashboards/view/index.tsx:29-37`）〔M15 wave-2/3 ✅：home 薄壳与 fullscreen 页均不经 view 页组件，view 页零改动（副作用原地保留）〕

### 7.3 usage 域评估落账（不实施下钻）

- [x] 下钻缓做评估结论落账：**触发条件 = api_usage 卡（fqn `system.api_usage`）以 react-1 实现交付时**（格式沿 §3.8 scada 渲染器缺口条目）；数据契约素材随登记落档——`api_usage.json` 11 states + `apiUsageDataKeys[].state` 九条映射 + `targetDashboardState` 回默认态 + `?state=` base64 URL 契约（codec antd 已 byte-exact）+ states-controller `openState`/深链已就绪（补下钻=一个交互卡专项，锚点契约 #7）〔M15 收口 ✅：触发条件入 §7.5 登记条 + CONTEXT.md v2 行；数据契约五件全部落档 `m15-panel-contract.md` #7/#8〕
- [x] 资产对账勘误落账：fork `api_usage.json` 与 ngx 逐字节同源（11 states、default right=**4** 图，「3 vs 4」对账点不成立——三镜头独立复核一致）；usage 数据为前端静态资产非租户实况维持 v1 登记口径（锚点 v1 §3.10、契约 #8）〔M15 ✅：arch R46 node 逐字段对账 + contract #8 双重复核一致；spec §7.0/修订记录已载勘误〕

### 7.4 收口操作面（全图状态落账）

- [x] M12 §4 勾账缺口处置（用户拍板 2026-09-07：补轻走查）：34 条未勾——真机抽样驱动主链（4.3 发送向导三步 + 4.5 触发表单抽样 ≥3 种 + 4.1/4.2/4.4/4.6 快速过）产出薄版走查文档；能勾的勾、未驱动的 3V 注记、发现偏差按缺陷登记不静默注记；处置后 §4 不留裸勾选框〔M15 wave-4 ✅：走查文档 `docs/spec/v2-m12-browser-walkthrough.md`；34 条勾 32 / 维持未勾 2；缺陷 D-1（发送向导 scratch 死锁）登记于走查文档 §7〕
- [x] M11/M13 未勾项收口：M11 4 条 + M13 7 条（3V 未驱动 9、受阻·后端 2——edge events 未落库两条维持受阻不冒勾）逐条复核现状，能收口的驱动收口，不能的维持注记写明原因〔M15 wave-4 ✅：11 条全部复核并补现状注记（代码/单测/SQL 在场性）；无一条可由本波驱动收口（均为完整流驱动，归各域走查）；受阻两条 SQL 重查 `edge_event` 仍 0 行维持受阻〕
- [x] #16 执行完成回写：comment 留痕（八子系统独立页 / settings 七件 / home 首页 / 匿名公共仪表盘 / usage 评估落账的完成态 + spec 节指向 + 散落挂账三条销账指向）〔M15 收口 ✅：2026-09-07 [#16 comment](https://github.com/KMakise123/thingsboard/issues/16#issuecomment-5565029146)〕
- [x] #1 地图状态更新：v2「全功能对齐」达成登记（与 #16 回写互引；剩余登记项逐条列归属域：缓做四项 CF 复杂编辑器/usage 下钻/Mobile Center/iot-hub + 能力级增强清单）〔M15 收口 ✅：2026-09-07 [#1 comment](https://github.com/KMakise123/thingsboard/issues/1#issuecomment-5565030918)；注：缓做四项中 CF 复杂编辑器已随 M14 六型全量交付消化〕
- [x] CONTEXT.md 词条：补「home dashboard（租户级 homeDashboardId additionalInfo 键 + /api/dashboard/home 三层回退链）」「公共仪表盘（public customer 换票：publicId → login/public → isPublic JWT）」两词条 + v2 定义行补 usage 下钻缓做触发口径〔M15 收口 ✅：commit 9f789fe473〕
- [x] v1 spec 收口落账：§2 v2 定义行标注已兑现（M7–M15）+ §7 遗留清单消账（home dashboard 首页、匿名公共仪表盘两条）+ §3.2 落点契约修订注记 + 修订记录补两条〔M15 收口 ✅：commit 9f789fe473（修订记录补 1 条，四处落位全落）〕

### 7.5 能力级增强登记（只登记不验收）

- ngx `assets/dashboard/*_home_page.json` 移植（触发：Angular 卡渲染器交付，届时 home 兜底组件换接即可）
- usage 下钻导航 + api_usage 卡 react-1 化（触发条件见 7.3-1；契约素材已落档）
- usage 数据源升级为登录租户实况（与下钻同触发链）
- 公开页社交分享面板（ngx tb-social-share-panel，antd 以复制链接等价交付）
- 公开页 embedded=true / hideToolbar=true 通用查询参数（ngx 无 UI 生产者，仅移动端深链消费）
- dashboard logo 渲染（antd 全域既有缺口，触发：dashboard 域交付 logo 面时公开页随 forceFullscreen 条件接线）
- 用户级 defaultDashboardId 自助写入口（后端无自助端点，确认产品缺口另立 issue）
- quick-links 网格断点微差（2/3/4 列照 ngx 语义，微差不判缺陷）

### 7.6 缺陷/边界登记（照 §6.7 体例，前端规避姿势已定）

- tenant 级悬挂 home id（info 端点不校验存在性）：落点/渲染统一走 `/api/dashboard/home`（extract 吞异常免疫）；settings 页可选探活降级非必须；后端补清洗另立 issue
- 跨租户 403-vs-404（dao 不按租户过滤，存在性可探测）：公开页 404/403 同一兜底空态不区分文案；后端收紧另立 issue
- 「空 home」三种响应形态（0 字节 / JSON null / `{dashboardId:null}`）：服务层 falsy 归一 + 单测钉住，绝不 JSON.parse 空 body
- public JWT 调 `GET /api/auth/user` 注定失败（wave-1 实测 = **500 NPE** "user is null"，非 4xx）：getInitialState 增 isPublic 跳过 fetchUserInfo 分支（isMfaInterim 先例），由「省一次注定失败的请求」升级为硬必要
- wave-1 curl 实测已执行（2026-09-07，结论回写本节与 §7.0）：login/public 401 形态、public 刷新链、悬挂链两端点（泄漏点/免疫点双向实锤）、空 body 0 字节、GET /auth/user 500 形态——数据保全终态回基线（scratch 实体全删、home 配置回 null）
- 公开会话寿命：login/public 响应含 refreshToken，refresh 链自动续期（后端 RefreshTokenAuthenticationProvider 支持 publicId）；「链接永不过期」不成立，过期提示刷新重进
- make-public 不会连带公开设备/资产：公开页未分配实体的 widget 订阅被权限拒绝是后端语义，走查遇「公开但无数据」先查实体分配再判缺陷
- demo 模式差异：demo 数据 4 个 dashboard 实体但 home 语义零差异，测试/走查不得假设 demo dashboard 存在，e2e 用自建 dashboard
- 无内置 dashboard 资产（fork `json/` 无 dashboards 目录，`createDefaultTenantDashboards` no-op）：「从未配置」是 /home 一等公民空态
- wave-1 实测项（10 条）清单在 `m15-panel-contract.md` 文末：login/public 错误形态、public 刷新链、悬挂链两端点、空 body 字节、GET /auth/user 失败形态、make-private 403 文案、SA 403、WS 正负路径——结论回写本节
- **M12 走查缺陷 D-1（发送向导 scratch 死锁，前端，M15 wave-4 已修）**：Setup 步误校验第 2 步 compose 内容完整性 → 真实用户从零无法发通知（旧单测以 fireEvent 填隐形字段掩盖）。修复 = 逐步校验（Setup 只校本步 + atLeastOne）+ 提交前 allValid 复查跳回首个非法步（对齐 ngx stepper 语义），TDD 红→绿（notifications 104 用例）；修复后真机复验从零发送全链通（含提交复查反向验证），测试数据已清。全文见 [v2-m12-browser-walkthrough.md](./v2-m12-browser-walkthrough.md) §7

## 修订记录

- 2026-09-07（二）：**M15 走查收账 + 全图收口**：§7.1 home 8 条 / §7.2 匿名公开 8 条 / §7.3 usage 评估 2 条全勾（真机走查证据 = 三波实现 agent 报告 + 本会话 D-1 复验），§7.4 收口 6 条全勾（M12 轻走查 32/34 + M11/M13 复核 11 条无冒勾 + #16/#1 comment 留痕 + CONTEXT.md/v1 spec 消账）；**§4 M12 存量 34 条勾账收口**（32 勾 / 2 注记，走查文档 [v2-m12-browser-walkthrough.md](./v2-m12-browser-walkthrough.md)）；新发现并修复缺陷 D-1（发送向导 scratch 死锁 → 逐步校验 + 提交复查，TDD + 真机复验，见 §7.6）；wave-1 curl 实测 3 处契约勘误回写 §7.0/§7.6。全段验收：**§7 24/24 勾，零 ❌**。实现四波 + 收口工作底稿 `docs/agents/m15-*.md` 七份；实现清单见 v2-m15-implementation-brief.md。

- 2026-09-07：**M15 段定稿（§7 全量补定）**：7.0 通用边界（home 两族端点分工 + 三种空响应形态归一 + 匿名换票契约 401 定案 + 落点判定序「?redirect > defaultDashboardId > /home」钉死）+ 7.1 home 八条（落点五处同源改造、直跳分支、quick-links 兜底 = P1-B 定案、hideToolbar OR 语义、悬挂 id 容错、配置页联动销 M14 欠账）+ 7.2 匿名公开八条（publicLogin 换票、四态 gate、401 失败路径隔离、失效两分支）+ 7.3 usage 评估两条（下钻缓做触发 = api_usage 卡 react-1 化；「3 图 vs 4 图」勘误落账——三镜头独立复核一致，fork 资产与 ngx 逐字节同源）+ 7.4 收口六条（M12 轻走查 = 用户拍板 2026-09-07；M11/M13 未勾收口；#16/#1/CONTEXT.md/v1 spec 四处落账）+ 7.5 增强 8 条 + 7.6 缺陷登记 9 条。已定裁决：三角色统一落 /home（P3-A，SA /tenants→/home 有意修订）；不移植 ngx 静态 JSON（R40 实测占位墙）；usage 下钻不实施。依据四份侦察底稿 + 三镜头合议（工作底稿 `docs/agents/m15-*.md` 七份）；实现清单见 v2-m15-implementation-brief.md。
- 2026-09-07：**M14 走查勾账（§6 全量勾账）**：§6.1–6.5 **51/51 勾**（CF 18 + VC 10 + settings 12 + 密码策略 3 + 连带 8），零 ❌；走查全文 [v2-m14-browser-walkthrough.md](./v2-m14-browser-walkthrough.md)（A 段 CF/settings、B 段 VC/挂载/横切 + 全局数据保全 16 项 API 审计全回基线）；JWT 换发全链 2026-09-07 补驱动闭环并复原（6.4-3 注）；W-1/W-2 已修（带单测），W-3–W-9 观察项登记。六波实现 + 两段走查工作底稿 `docs/agents/m14-*.md`；**AutoCommitCard 退役（R23b 默认执行）已随 wave-7 交付**。
- 2026-09-06：**M14 段定稿（§6 全量补定）**：6.0 通用边界（四域 TENANT/SA/CU 三层角色矩阵钉死——CF/VC 连 SYS 后端能力都没有、queues SYS only 照 ngx、settings 组级放权子级收权；「无」清单钉死 ALARM 不进独立页/GEOFENCING 无地图/pwned-password 双侧不存在；行为契约：CF testScript 先于保存、VC 凭据空串≠留空、16 类型清单照前端常量、mail 留空=不带字段、密码策略前端自校验 min≤max）+ 6.1–6.4 四块操作面（CF 六型全量含 GEOFENCING 末波不降级；VC 复数双面板 + removeOtherEntities 逐字确认 + 详情 tab 6 回归 3 补挂；settings 七件收口勘误 + outgoing-mail 回归不重做；密码策略两卡 + JWT 换发链）+ 6.5 连带交付（M12/M13 三件：向导跳转链接、notification settings 预留函数消费、VC 面板补链）+ 6.6 增强登记 + 6.7 缺陷登记 17 条（admin settings 无 id 保存缺陷静态发现、T6/T10 随 wave-1 实测回写）。依据五份侦察底稿 + 三镜头专家合议（工作底稿 `docs/agents/m14-*.md` 八份）；实现清单见 [v2-m14-implementation-brief.md](./v2-m14-implementation-brief.md)。
- 2026-09-06：**M13 段定稿（§5 全量补定）**：5.0 通用边界（角色矩阵钉死无 SYS 视角、edgeInfos/info 端点契约、events 两表语义分开、key/secret 前端生成保存后只读、OTA 两步保存 + 后端算 checksum + 创建即定型、edges.enabled 开关不接为有意偏离）+ 5.1–5.5 五块操作面（**CU 只读面经用户拍板随 M13 交付**；子实体平级路由页钉死；Downlinks 排序经 ngx 源码复核定案 = 服务端 seqId ASC 直渲、客户端倒排登记增强）+ 5.6 增强登记 + 5.7 缺陷登记（含本机后端两条实测实锤：customerTitle 排序 500、otaPackage full GET base64 回带；实测新缺陷：OTA 无 profile 上传步 500 空指针）。依据 ui-ngx 源码侦察、后端契约盘点与三镜头专家合议（工作底稿 `docs/agents/m13-*.md` 七份）；实现清单见 [v2-m13-implementation-brief.md](./v2-m13-implementation-brief.md)。
- 2026-09-07：**M12 轻走查收账（M15 wave-4）+ M11/M13 未勾复核**：§4 34 条逐条勾账（✅ 32 / 维持未勾 2：4.2#4 单订阅收敛登记、4.3#2 徽标三态+失败明细，均带 3V 注记，§4 不留裸勾选框）；新登记缺陷 **D-1 发送向导从零开始死锁**（validateSetup 在 setup 步校验 compose 内容完整性，compose 字段第 2 步才可见——ngx 逐步校验锚偏离，单测以隐形字段填充掩盖）与观察 O-1~O-5（TEAMS 形态转译、无头批量勾选失联、ruleNode 子区未证、权限门跳转兑现、popover 无历史回填）；走查证据全文见 [v2-m12-browser-walkthrough.md](./v2-m12-browser-walkthrough.md)。同波 §3.1–3.3 与 §5 七条未勾项复核注记（代码/单测/SQL 在场性；`edge_event` 重查仍 0 行受阻维持）。
- 2026-09-06：**M13 走查收账 + 复审回写**：§5.1–5.5 逐条勾账（✅ 30 项 / 未勾 7 项：3V 未驱动 4、受阻·后端事件未落库 2、消费集成单测覆盖 1，均带注记）；§5.2 复制三连与 §5.5 URL 下载两处**勘误**（实现照 ngx 锚点，URL 外链打开降级 §5.6）；§5.7 新增 W-1（「不再显示」同会话失效，已修——保存时现读偏好）与 W-2（Set root 行刷新滞后，后端异步观察）；走查证据全文见 [v2-m13-browser-walkthrough.md](./v2-m13-browser-walkthrough.md)。走查前置双轴 code-review：标准轴 0 硬违规（5 条 smell 已修——剪贴板/authority/批量解除三处去重 + 零引用类型删除 + 9 处依赖抑制逐处复核，6 处真隐患修根因），规格轴缺失 0。
- 2026-09-05：**M12 复审回写（双轴 code-review + 真机裁决后收口）**：4.0 勘误「候选按角色二分非并集」（SYS trigger=6 种、usersFilter=4 变体，均以 ngx 源码为准）与已读/未读数通道口径（REST + `subscribeNotifications` 快照，WS MARK_* 登记 4.7）；4.5 模板内联新建/编辑降登记；新增 **4.7 六项登记**（共性收敛清单、edge service 迁移、服务层预留函数等）与 **4.8 后端缺陷登记**（filtered targets 500 on createdTime sort、`subscribeUnreadNotificationCount` 字段错读、上游 SYS targets 禁用缺陷）。实现侧同步修复：inbox 列表 useMemo 过期闭包（ADR 0007 §5）、发送向导切回过滤端点（name 排序规避）、不可用投递方式归零。
- 2026-09-05：**M12 段定稿（§4 全量补定）**：4.0 通用边界（路由/角色矩阵、14 trigger 双级收缩、投递方式运行时探测、**WEB 通道为端到端验收基准、真实 SMS/EMAIL 等到达留人工验收**、settings/account 两处登记不实施）+ 4.1–4.6 六块操作面 + 4.7 能力级增强登记。依据 ui-ngx 通知族源码侦察与后端四控制器契约盘点（工作底稿 `docs/agents/m12-*.md`）；随 M12 开工落盘。
- 2026-09-05：**M11 3V 波真机走查收账（§3.1–3.7 逐项勾账）**——✅ 26 项 / 受阻或未覆盖 6 项保持未勾并登记；新登记缺陷 V1-1（bundle 装 system 类型后端静默丢弃，Major）、V1-2（bundle 图片字段过渡实现未回接，Minor）、V8-1（JS 新建 MODULE 走错端点 400，Major）、V8-2（批量上传 toast 占位符未注入，Minor）；§3.6 两条按主会话裁决口径勾账并回写 editors spec；走查证据全文见 [v2-m11-browser-walkthrough.md](./v2-m11-browser-walkthrough.md)。
- 2026-09-05：**§3.3 预览模式勘误为静态形态 + §3.8 新登记 scada 符号 widget 运行时渲染器缺口**（波 2C 合入时事实核查：fork widget 注册表无 scada 渲染器，M7 占位三态既有事实覆盖；波 2E 同步证实抽屉数据源为 registry-only）。另：上传大小上限（authState.maxResourceSize）fork 无来源，波 1A/2C 均未做假实现，登记随 auth 波接入。
- 2026-09-05：创建。M11 段定稿（§1 通用边界 + §3.1–3.7 操作面 + §3.8 增强登记；解锁 editors spec 两条挂起验收入 §3.6）；M12–M15 骨架占位。依据 #16 范围定案与 ui-ngx 源码侦察（admin-routing / image-gallery / scada-symbol / resource 前后端全链）。
