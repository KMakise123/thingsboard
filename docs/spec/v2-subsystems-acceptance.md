# v2 八子系统独立页验收 spec（活文档）

> 状态：**M11 / M12 / M13 段定稿**（M11 段 2026-09-05 随 M11 开工落盘；M12 段 2026-09-05 随 M12 开工补定；M13 段 2026-09-06 随 M13 开工补定；依据 [#16](https://github.com/KMakise123/thingsboard/issues/16) 范围定案 + ui-ngx 4.4.0 源码侦察）。M14–M15 段骨架占位，随各段开工补定。
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
| M14 | 计算字段独立页 + VC 独立页 + settings 六小件 + 密码策略页 | §6（开工补定） | M13 |
| M15 | home 首页 + 匿名公共仪表盘 + 收口 | §7（开工补定） | M14 |

## 3. M11 资源库五件套操作面

### 3.1 widget 类型库（对齐 `pages/widget` 全家）

- [x] widget types 列表：列 createdTime/name/bundles/widgetType(system)/deprecated，搜索/分页/排序，行点击进详情（锚点 `widget-types-table-config.resolver.ts:80-91,216-221`）〔M11 走查 ✅：全列渲染 + 共 684 个分页 + 搜索写 `?textSearch=` 过滤生效；排序以列头控件在场目击，逐列排序未逐一驱动〕
- [x] deprecated 过滤开关；system 列（SYS 且含 system 类型时显示）〔M11 走查 ✅：segmented 全部/当前/已弃用 三态在场；system badge 列目击〕
- [ ] 新建 widget 类型：模板类型选择对话框（静态 widgetType 枚举，锚点 `select-widget-type-dialog.component.ts`）→ 进编辑器（M9 已交付）〔未勾（3V）：走查作业单未覆盖新建流，本波未正面驱动〕
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
- [ ] 选择模式 selectionMode（弹层复用形态，供 SCADA 预览等调用方嵌入）〔未勾（3V）：走查作业单未覆盖弹层复用形态，本波未驱动〕

### 3.3 SCADA 符号库 + 编辑器页（对齐 `pages/scada-symbol`，最重组件）

- [x] 符号库列表：画廊 isScada 形态（文案/行为切换），上传解析 SVG metadata 预填 title，上传成功跳编辑器（锚点 `image-gallery.component.ts:657-719`、`upload-image-dialog.component.ts:99-114`）〔M11 走查 ✅：上传 SCADA 符号/从 JSON 导入/包含系统符号 isScada 文案目击；上传对话框 title 预填 SVG metadata 内 title（非文件名）；上传成功自动跳 `/resources/scada-symbols/tenant/:key` 编辑器〕
- [x] 编辑器路由 `/resources/scada-symbols/:type/:key`：加载失败跳回列表（resolver 语义，锚点 `admin-routing.module.ts:52-68`）〔M11 走查 ✅（路由半边）：tenant/system 双路由加载渲染正常；加载失败跳回列表路径未构造〕
- [x] 画布：SVG 结构编辑（tag 虚线高亮框、hover 高亮、重叠元素错位提示）、缩放平移（限域）、显示/隐藏元素切换、svg/xml 双模式（锚点 `scada-symbol-editor.component.ts`、`scada-symbol-editor.models.ts:207-262`）〔M11 走查 ✅：SVG 渲染 + tag 虚线高亮框目击 + hover 高亮目击；图形/XML 双模式切换在场；显示/隐藏元素开关、缩放按钮对在场——重叠错位提示未构造、缩放限域数值未实测〕
- [x] tag 管理：画布 hover 加/删 tag 面板、tag 列表、tag 级 stateRenderFunction 与 click action 编辑（锚点 `scada-symbol-tooltip.components.ts`、`metadata-tags.component.ts`）〔M11 走查 ✅：hover `lamp` 元素弹 antd Popover（tag 名 + 修改标签/移除标签 + f(x) click action 入口）；标签 tab 候选 chip 加 tag + tag 卡片（状态渲染函数 CodeMirror 输入 `return 1;` 落库复核）〕
- [x] metadata 四 tab：general（title/description/searchTags/widgetSizeX/Y 1-24 校验）/ tags / behavior（value/action/widgetAction 三类 + 默认 settings 编辑器）/ properties（FormProperty 配置）（锚点 `scada-symbol-metadata.component.ts:102-148`、`scada-symbol.models.ts:151-173`）〔M11 走查 ✅：四 tab 各改一项并落库复核（描述文案/行为「值+布尔」/属性 text+自动 id/渲染函数）；widgetSize 1-24 越界校验未构造〕
- [x] 保存链：getContent + metadata 回写 SVG → `updateImage` → title 变更追加 `updateImageInfo` → 重载（锚点 `scada-symbol.component.ts:211-249`）〔M11 走查 ✅：保存 toast + curl 回读 SVG——metadata JSON（description/tags/behavior/properties）与渲染函数字面量全部回写进 CDATA〕
- [x] 预览模式（**静态形态**）：符号 SVG 按 metadata 尺寸/内边距渲染 + 缩放查看（锚点 `scada-symbol.component.ts:255-298`）。**勘误（2026-09-05）**：原写「内嵌仪表盘活体模拟」——事实核查 fork widget 注册表无 scada 符号运行时渲染器（M7 占位三态覆盖），活体预览无承载，降为静态预览；活体升级随 §3.8 渲染器缺口触发〔M11 走查 ✅：「按属性尺寸渲染（3 × 3 格）」+ 静态渲染完整 + 缩放按钮对 + 预览态保存禁用〕
- [x] 从符号创建 widget：克隆 system.scada_symbol 模板 → 注入符号链接/尺寸/previewWidth → 保存 + 可选入 bundle（锚点 `scada-symbol.component.ts:406-465`）〔M11 走查 ✅：对话框（Widget 名称 + 可选入包）→ 创建 → API 复核 `v3v_walk_symbol_widget` 落库；入 bundle 分支未走（bundle 通道见 V1-1）〕
- [ ] 替换 SVG 内容（上传）+ 下载符号（锚点 `scada-symbol.component.ts:358-404`）〔未勾（3V）：替换仅在 readonly 态目击 disabled；下载符号按钮在场未驱动〕
- [x] readonly 边界：TENANT 编辑 system 符号 → 只读（锚点 `scada-symbol.component.ts:486-490`）〔M11 走查 ✅（复验）：system 行无删除操作（tenant 行有）+ 编辑器保存/替换 SVG disabled + 表单 5 输入 disabled（DOM 探针）+ 截图；下载/预览/从符号创建 Widget 保留可用〕
- [ ] 行为契约：受控退出确认（dirty → 确认 Modal，沿 M10 D1 受控形态）、EditorSession 撤销（结构性操作入栈）——SCADA 画布编辑是否入撤销栈按能力级增强登记，不做硬门槛〔未勾（3V）：走查作业单未覆盖退出确认/撤销栈驱动，单测锚在（use-leave-guard + session 契约）〕

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

- [ ] 列表：createdTime/type/subject/text 列，subject/text 经 sanitize 渲染；默认 createdTime DESC；分页/排序/搜索（锚点 `inbox-table-config.resolver.ts:57-103`）
- [ ] 未读/全部 toggle（默认未读），切换重置排序与过滤（`inbox-table-header.component.*:18-38`）
- [ ] 行点击详情对话框（通知全量渲染），关闭时标已读（`inbox-table-config.resolver.ts:75-78,155-171`）
- [ ] 已读三通道：行内单条 / 详情关闭 / 全部标记已读；末页最后一条已读后自动翻上一页（:88-153）
- [ ] 删除：单条 + 勾选批量 + 确认（:60-74）

### 4.2 顶栏铃铛（三角色）

- [ ] 铃铛按钮 + 未读数徽标（≥100 显示 99+），未读数走 WS 订阅（`notification-bell.component.ts:47-56,102-109`）
- [ ] popover：标题 + 全部标记已读（有通知时显示）；最近 6 条；未读单条已读；空态；「查看全部」跳 inbox（`show-notification-popover.component.*`）〔已读通道实现为 REST，见 4.0〕
- [ ] 通知项渲染：自定义图标（additionalConfig.icon）或按 type 图标、标题/正文、动作按钮（LINK 外链新窗 / DASHBOARD 带 state 站内跳转）、ALARM 按严重级别着色、相对时间（`notification.component.*`）
- [ ] popover 打开期间暂停 count 订阅、关闭恢复（`notification-bell.component.ts:77-100`）

### 4.3 已发通知 sent + 发送向导（SYS + TENANT）

- [ ] 列表：createdTime/status/deliveryMethods/templateName 列；无搜索框；默认 createdTime DESC（`sent-table-config.resolver.ts:64-100`）
- [ ] status 徽标三态（SCHEDULED/PROCESSING/SENT）+ 失败数红色 badge → 失败明细对话框（按投递方式分组、error chip + 文本）（:92-176、`sent-error-dialog.*`）
- [ ] 行内「再次发送」（SCHEDULED 禁用）；删除单条 + 批量（:69-133）
- [ ] 发送向导三步 stepper：Setup → Compose（仅从零开始）→ Review，步骤校验全过才可前进（`sent-notification-dialog.componet.ts:267-277`）
- [ ] Setup：从零开始/使用模板 toggle（模板候选限 GENERAL、可搜索/新建/编辑）；接收人多选 + 新建接收人快捷入口；定时发送（enabled + 时区 + 时间 min=now max=+7 天 → sendingDelayInSec 换算）（:131-318）
- [ ] 投递方式开关组：atLeastOne 校验、可用方式 API 探测、不可用禁用并归零、刷新按钮；权限门（WEB 任何 admin 可发不可配；SYS 可配全部；TENANT 仅 SLACK；其余「联系管理员」tooltip）（:324-382）
- [ ] Review：preview 端点（接收总数、按 target 计数、接收人 chips、按启用方式渲染预览块）（:235-249）
- [ ] 提交 POST /api/notification/request；三入口复用同一向导（sent 页新增 / 行内再发 / 页头发送按钮）

### 4.4 接收人 recipients（SYS + TENANT）

- [ ] 列表：createdTime/name/类型/描述列；新增/行点击编辑/删除单条+批量（`recipient-table-config.resolver.ts:56-83`）
- [ ] 对话框：name 必填；类型 radio 三选 PLATFORM_USERS/SLACK/MICROSOFT_TEAMS（`recipient-notification-dialog.component.html:44-52`）
- [ ] PLATFORM_USERS → usersFilter 八变体按角色收缩：ALL_USERS / TENANT_ADMINISTRATORS（SYS 可配 tenantsIds/tenantProfilesIds）/ CUSTOMER_USERS(customerId) / USER_LIST(usersIds) / ORIGINATOR_ENTITY_OWNER_USERS / AFFECTED_USER / SYSTEM_ADMINISTRATORS 与 AFFECTED_TENANT_ADMINISTRATORS（仅 SYS）（ts :88-221）
- [ ] SLACK → 会话类型 radio + 会话自动补全（`/api/notification/slack/conversations`）；MICROSOFT_TEAMS → useOldApi 开关（新旧 API 标签切换）+ webhookUrl + channelName（html :126-178）
- [ ] description 文本域；保存 POST /api/notification/target

### 4.5 通知规则 rules（SYS + TENANT，最重组件）

- [ ] 列表：createdTime/name/templateName/triggerType/描述；新增/行点击编辑/删除单条+批量（`rule-table-config.resolver.ts:57-86`）
- [ ] 行内：启用/停用 toggle（即改即存）+「复制规则」（名称追加 "(copy)"）（:93-144）
- [ ] 对话框 stepper：基本设置（name/enabled/triggerType/模板选择按 triggerType 过滤搜索；内联新建/编辑模板登记 4.7）→ 触发器设置（按 triggerType 动态步骤）；编辑时 triggerType 锁定（`rule-notification-dialog.*:34-118,374-386`）
- [ ] 接收面二分：非 ALARM → targets 多选 + 新建接收人入口；ALARM → 升级链（首级 0 秒固定、后续间隔 1 分钟–7 天、动态行增删）+ clearRule（仅升级链 >1 级时可配）（`escalations.*`、`escalation-form.*`）
- [ ] trigger 配置表单 14 种（候选按 authority 收缩；默认 SYS=ENTITIES_LIMIT、TENANT=ALARM）：ALARM / DEVICE_ACTIVITY（设备|设备配置档二选一）/ ENTITY_ACTION / ALARM_COMMENT / ALARM_ASSIGNMENT / RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT（含 ruleNode 子区联动）/ EDGE_CONNECTION / EDGE_COMMUNICATION_FAILURE / ENTITIES_LIMIT（threshold 0-100% → ÷100）/ API_USAGE_LIMIT / NEW_PLATFORM_VERSION（无字段）/ RATE_LIMITS / TASK_PROCESSING_FAILURE（仅描述）/ RESOURCES_SHORTAGE（三滑杆）——字段级对照见 `docs/agents/m12-ngx-inventory.md` §5
- [ ] 每个 trigger 步骤底部 additionalConfig.description；保存把表单值并入 triggerConfig（:441-467）

### 4.6 模板 templates（SYS + TENANT）

- [ ] 列表：createdTime/notificationType/name；新增/行点击编辑/删除单条+批量/行内复制（"(copy)"）（`template-table-config.resolver.ts:55-95`）
- [ ] 对话框 stepper：Setup（name/notificationType 下拉按角色收缩、编辑锁定、投递方式开关组 atLeastOne）→ Compose（`template-notification-dialog.*:34-92,182-197`）
- [ ] compose 六方式字段与校验：WEB（subject≤150 + body≤250 + icon + 动作按钮）/ EMAIL（subject≤250 + body 富文本）/ SMS（body≤320）/ SLACK（body）/ MOBILE_APP（subject≤50 + body≤150 + onClick）/ MICROSOFT_TEAMS（subject + body + themeColor + button）；未启用方式整块禁用；每方式自动注入 enabled+method（`notification-template-configuration.component.ts:219-303`）
- [ ] 动作按钮配置（WEB/TEAMS/MOBILE 共用）：enabled / text≤50 / linkType(LINK|DASHBOARD) / link≤300 / dashboardId / dashboardState / setEntityIdInState 联动启停（`notification-action-button-configuration.component.ts:84-126`）
- [ ] 模板参数 `${xxx}`：主题/正文可模板化 + 按类型「查看文档」帮助；保存 POST /api/notification/template
- [ ] EMAIL 富文本编辑器等价说明：ui-ngx 用 hugeRTE；ui-antd 以 HTML 源码编辑等价交付（能力不降级），WYSIWYG 视觉形态登记为能力级增强

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

- [ ] instances 列表（tenant scope）：列 createdTime/name/type/label/customer/public（tenant 追加后两列），类型筛选下拉（`GET /api/edge/types`，切换重置排序过滤），搜索/分页/排序，默认 createdTime DESC；取数走 `/api/tenant/edgeInfos`（锚点 `edges-table-config.resolver.ts:150-185`）
- [ ] 新增 Edge 对话框：name（必填 ≤255）/type（EDGE 子类型，默认 default）/label（可空 ≤255）/routingKey+secret（前端本地生成、只读展示）/description；保存成功刷新 + 默认自动弹安装指引（「不再显示」写用户偏好 `notDisplayInstructionsAfterAddEdge`）（锚点 `edge.component.ts:71-143`、`edge-instructions-dialog.component.ts:86-93`）
- [ ] 编辑 Edge：key/secret 禁改只读；表单回显含 assignedToCustomer 只读提示 + public 提示（锚点 `edge.component.html:137-146,166-189`）
- [ ] 导入 Edge（tenant）：CSV bulk_import（`POST /api/edge/bulk_import`）；**无导出**（ngx 无此能力，钉死）（锚点 `import-export.service.ts:593-601`）
- [ ] 删除：单条 + 勾选批量，仅 tenant（customer scope 列表行删除实为「解除分配」语义）（锚点 `edges-table-config.resolver.ts:141-143,173-184`）
- [ ] 行内动作矩阵（tenant）：make public（未分配时）/ assign to customer（未分配时）/ unassign（已分配非 public）/ make private（public 时）/ manage assets/devices/entityViews/dashboards/rule chains 五子页入口 / sync（锚点 `:189-245`）
- [ ] 批量：tenant 批量分配客户；customer scope 批量解除分配（锚点 `:296-315,489-515`）
- [ ] customer 作用域列表（TENANT_ADMIN）：`/customers/:id/edges`，标题「客户名: Edge instances」；入口三处——客户详情按钮 / 客户列表行内 / 本页头部「分配已有 Edge」对话框（锚点 `customer-routing.module.ts:191-228`、`customers-table-config.resolver.ts:105-118,178-183`）
- [ ] customer_user scope：只读列表（强制本人 customerId 取数，`edge_customer_user` 语义），删除/分配类操作不可达，详情只读（锚点 `:105,109-121,263-289`）

### 5.2 Edge 详情页（七通用 tab + 按钮区）

- [ ] 详情页结构与表单回显：六字段（key/secret 只读，CU 隐藏两行）+ assignedToCustomer/public 只读提示；详情路由 `?tab=` URL state，TA-only tab 手打会被拉回（沿 antd useDetailTabUrlState 既有契约）
- [ ] 详情按钮区（角色收缩）：make public / assign to customer / unassign / make private / manage 五子实体入口（manage rule chains 仅 tenant）/ delete；CU 全隐藏（锚点 `edge.component.html:19-78`）
- [ ] 复制三连：Copy ID / Copy Edge key / Copy Edge secret（key/secret 对 CU 隐藏），成功均有 toast（锚点 `:79-106`、ts `:114-136`）
- [ ] Sync Edge：`POST /api/edge/sync/{id}`，fire-and-forget toast（「同步进程已启动」）+ 失败 error 展示 + 按钮 loading 防重复；**无状态轮询**（钉死；后端有 20s 硬超时，无需前端兜底）（锚点 ts `:517-533`）
- [ ] 指引二态对话框：无升级 → Install & Connect Instructions、有升级（`GET /api/edge/{id}/upgrade/available`）→ Upgrade Instructions；Docker/Ubuntu/CentOS-RHEL 三 method tab，markdown 由后端拼好前端纯渲染（`GET /api/edge/instructions/install|upgrade/...`）；「不再显示」偏好写入（锚点 `edge-instructions-dialog.component.*`）
- [ ] 七 tab 装配：Attributes（SERVER_SCOPE）/ Latest telemetry（禁 scope 选择）/ Alarms / Events（**Edge 自身事件**，默认 ERROR、实集合 ERROR/LC_EVENT/STATS，列=antd 通用三列 + JSON 展开行〔M8 行为契约形态〕）/ Downlinks（仅 TA，见 5.4）/ Relations / Audit logs（仅 TA）；只挂激活 tab（destroyOnHidden 保 WS 预算红线）；**不挂 version-control**（ngx 七 tab 无此页签，钉死）（锚点 `edge-tabs.component.html:18-70`）
- [ ] customer_user 只读形态：detailsReadonly，tab 收缩为 attributes/telemetry/alarms/events/relations 五个，sync/指引/复制 key secret/删除全隐藏（锚点 `edge.component.html:94-121`）

### 5.3 Edge 子实体页五件 + 规则链模板页（本里程碑最重块）

- [ ] 平级路由形态：`/edges/:id/{assets|devices|entityViews|dashboards|ruleChains}` 五条作用域页 + 域内外壳（标题=「Edge 名: 实体复数」、面包屑叶=Edge 名、返回详情页、加载失败 Alert；外壳页面私有不泛型化）；**不做详情内嵌 tab**（钉死）；CUSTOMER_USER 全部收缩为只读（`edge_customer_user` 语义）
- [ ] assets 子页：列表（`GET /api/edge/{id}/assets`）+ 头部「分配已有资产」对话框 + 行内 Unassign + 批量 unassign（锚点 `assets-table-config.resolver.ts:189-191,246-287,322-328`）
- [ ] devices 子页：列表（含 type/deviceProfile/active 过滤能力，走 GET 端点既有 query 参数）+ 分配对话框 + 行内/批量 unassign + CU 只读**可看凭据**；**edge scope 内不能新建/导入设备、无 manage credentials**（钉死）（锚点 `devices-table-config.resolver.ts:270-287,318-366,392-450`）
- [ ] entityViews 子页：同构（`GET /api/edge/{id}/entityViews` + 分配/unassign/批量 + CU 只读）（锚点 `entity-views-table-config.resolver.ts:187-309`）
- [ ] dashboards 子页：列表 + 分配已有 + 行内导出 + unassign + 批量 unassign + 行内打开仪表盘（锚点 `dashboards-table-config.resolver.ts:208-390`）
- [ ] ruleChains 子页（仅 TENANT_ADMIN）：列表 + root 复选列 + 分配已有（仅 EDGE 类型链可挂）+ 行内 Set root（确认后 `POST /api/edge/{edgeId}/{ruleChainId}/root`）+ 根链禁 unassign + 批量 unassign + **进页缺失检查**（`GET /api/edge/missingToRelatedRuleChains/{id}`，缺则 Alert 列出，antd 形态替代 ngx alert 阻断）；本页禁新建/删除（锚点 `rulechains-table-config.resolver.ts:137-147,183-225,273-287,447-459`）
- [ ] 规则链模板页 `/edges/rule-chains`（仅 TENANT_ADMIN，Edge Management 组第二项）：auto-assign 链列表（`GET /api/ruleChain/autoAssignToEdgeRuleChains`）+ root 模板复选 + assignToEdge 复选 + 行内 Set Edge template root / Set(Unset) auto-assign to edge + 头部新建/导入（EDGE 类型）+ 打开 EDGE 类型画布（画布本体归规则链域，仅验入口链路）（锚点 `:148-200,251-271,606-612`、`rule-chain.service.ts:265-296`）
- [ ] 子实体详情跳转：assets/devices/entityViews 的 `:entityId` 打开各实体详情（只读按角色）、dashboards 的 `:dashboardId` 打开仪表盘页（锚点 `edge-routing.module.ts:121-137,161-177,201-217,241-255`）

### 5.4 Downlinks tab（Edge 同步事件表，仅 TENANT_ADMIN）

- [ ] 入口与开关：Edge 详情内 tab 仅 TA；时间分页（useTimePageLink 等价）；无搜索/新增/删除/多选/详情面板，表头无时间段选择 UI（锚点 `edge-downlink-table-config.ts:71-84`）
- [ ] 取数链：先读 Edge 的 SERVER_SCOPE 属性 `queueStartTs`，再 `GET /api/edge/{id}/events`；**顺序 = 服务端返回顺序直渲**（后端恒 `seqId ASC`；ngx 声明 DESC 但被后端忽略且无客户端倒排，源码复核定案——客户端倒排登记 §5.6 增强，不做假排序参数）（锚点 `:89-94`、`JpaBaseEdgeEventDao.java:61,175-187`）
- [ ] 列与派生状态：createdTime / type（EdgeEventType 译名）/ action（EdgeEventActionType 译名）/ entityId / status（**派生值**：createdTime ≤ queueStartTs → Deployed，否则 Pending；色走 antd token）/ data 查看（锚点 `:105-145`、`edge.models.ts:100-164`）
- [ ] data 查看链：非 ADMIN_SETTINGS 且非 DELETED 才可点；内容按类型回查实体或直取 body → JSON 弹窗；取不到则错误 toast（锚点 `:159-194`、`entity.service.ts:1509-1550`）

### 5.5 OTA 包管理页操作面

- [ ] 列表「Packages repository」：九列 createdTime/title/version/tag/type/direct-url/fileName/dataSize/checksum（direct-url 与 checksum 单元格内 copy 按钮仅有值时显示；dataSize 人读格式；checksum 显示「算法: 值」），搜索（按 title）/分页/排序，默认 createdTime DESC（锚点 `ota-update-table-config.resolve.ts:60-106,192-195`）
- [ ] 「无」清单钉死：无 type（FIRMWARE/SOFTWARE）列表过滤器（type 仅作列展示）；无 JSON 导出/导入（行内 Download 是下载二进制不是导出）；无文件大小上限（锚点侦察 ota §2）
- [ ] 新增表单：title（必填 ≤255）/version（必填 ≤255）/tag（≤255，pristine 时自动联想 `(title + ' ' + version).trim()`）/deviceProfileId（**必填**，profile 选择器禁新建禁编辑；文件型不选 profile 后端上传步 500，见 §5.7 实测缺陷）/type（FIRMWARE 默认|SOFTWARE）+ 保存警示文案「上传后 title/version/profile/type 不可再改」（锚点 `ota-update.component.*` §3 表）
- [ ] 来源双分支联动：二进制文件（默认，必填 + generateChecksum 默认勾选→隐藏算法与 checksum 输入；不勾时 7 值算法枚举 MD5/SHA256 默认/SHA384/SHA512/CRC32/MURMUR3_32/MURMUR3_128 + checksum ≤1020 选填）vs 外部 URL（必填 + 非空 pattern；切回文件态清校验、file 转必填）（锚点 ts `:61-123`）
- [ ] 两步保存链：先 `POST /api/otaPackage` 建 info（剥掉 file/checksum 字段）→ 再 multipart `POST /api/otaPackage/{id}?checksumAlgorithm=&checksum=` 传文件；**上传失败自动回滚删除刚建的 info**；checksum 由后端计算，前端不本地算哈希（锚点 `ota-package.service.ts:73-107`；wire 契约 deviceProfileId 对象形式等细节见实现清单）
- [ ] 编辑近乎只读：非新增态整表 disable 仅重新启用 description；title/version/tag 双保险 readonly；fileName/dataSize/contentType 只读展示（锚点 ts `:150-153`）
- [ ] 详情按钮组五件：Download package（disabled 条件 `hasData && !url`；**URL 型新窗口打开外链、文件型 blob 下载走 `GET /api/otaPackage/{id}/download`**，按 url 字段分流）/ Delete / Copy package Id / Copy checksum（有值才显示）/ Copy direct URL（有值才显示）（锚点 `ota-update.component.html:18-63`）
- [ ] 删除：单条 + 批量 + 确认四件套；被 device/device profile 引用时**提交后吃后端 400 明确报错**（fk_* 四条消息转译展示，无前端预检——预检属增强登记）（锚点 `resolver:117-126`、`BaseOtaPackageService.java:195-218`）
- [ ] 消费集成（OTA 闭环另一半）：device-profile 表单 firmwareId/softwareId 两个包选择器 + 保存前「变更将影响 N 台设备」确认弹窗（两类计数 forkJoin，0 不弹；device-profile 半边选择器已存在，补保存门）；device 表单同款选择器 + profile 换选候选联动（锚点 `device-profile.component.html:96-111`、`device.component.html:124-139`、`ota-package-autocomplete.component.ts:260-279`）
- [ ] 权限契约：CUSTOMER_USER 后端有 3 个只读端点（info/列表×2）但无下载——前端不建入口，页面 TENANT_ADMIN only；真实固件分发/设备侧更新状态追踪归设备域不在本页（登记）

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

### 5.7 缺陷登记（照 §4.8 体例：前端已规避 / 待后端修复 / 有意偏离）

- **【已实测实锤 2026-09-06】**`sortProperty=customerTitle` 在 Edge 非 Info 列表端点（`/api/edges`、`/api/tenant/edges`、`/api/customer/{id}/edges`）500 "Database error"（errorCode 46；DAO 无列映射，`JpaEdgeDao.java:84-138`；本机后端实测 500，`edgeInfos` 同参 200）；前端规避 = 列表一律用 `edgeInfos` 族端点。
- edge events 端点 `sortProperty/sortOrder` 被后端忽略（`SORT_ORDERS=[seqId]` 硬编码，恒 `seqId ASC`），且事件分区表有 TTL 清理（`EdgeEventsCleanUpService.java:35`）；前端直渲规避，「新的在前」倒排登记 §5.6 增强，「翻旧页」受 TTL 限制属后端行为。
- **【实测新缺陷 2026-09-06】**OTA 包**无 deviceProfileId 时 multipart 上传步 500 空指针**（`OtaPackageInfo.getDeviceProfileId()` null 被调 `.equals`，`OtaPackageController.java:142-163` 链路；本机后端实测：无 profile 建包成功但传文件 500，带 profile 全链 200）；前端规避 = 创建表单 deviceProfileId 必填（照 ngx）；待后端修复候选。
- **【已实测实锤 2026-09-06】**`GET /api/otaPackage/{id}` 回带 base64 全量包体（`data` 字段进 JSON；本机实测 30 字节文件逐字回传）；前端规避 = 表单/详情载入一律 `/otaPackage/info/{id}`（实测无 data 字段）。
- `checksumAlgorithm` 传枚举外值后端 500（`IllegalArgumentException` 未转 400，`OtaPackageController.java:159`）；前端下拉白名单规避，不透传自由文本。
- 上游小瑕疵对照：ngx 指引对话框 direct-url 复制复用 checksum 的文案 key（`ota-update.component.ts:156-187`）；antd 侧用独立文案，不复刻。
- OTA download 对 URL 型包直接 400（`OtaPackageController.java:89-91`）：登记为后端行为契约——前端必须按 `url` 字段分流（外链新窗 vs blob 下载），不作缺陷追究。
- 上游不一致对照：ngx 的 customer 菜单项 edge_instances 不受 `edgesSupportEnabled` 过滤恒显（`menu.models.ts:1057`）；fork 连开关整体不接（§5.0 有意偏离），本条留对照痕。

## 6. M14 计算字段独立页 + VC 独立页 + settings 六小件 + 密码策略页（骨架，开工补定）

- queues / notifications / home / repository / auto-commit / trendz / ai-models settings tab；`/security-settings/general` 密码策略页。

## 7. M15 home 首页 + 匿名公共仪表盘 + 收口（骨架，开工补定）

- 登录落点调整 home → home dashboard；匿名公共仪表盘页；usage 下钻 states 随域评估。

## 修订记录

- 2026-09-06：**M13 段定稿（§5 全量补定）**：5.0 通用边界（角色矩阵钉死无 SYS 视角、edgeInfos/info 端点契约、events 两表语义分开、key/secret 前端生成保存后只读、OTA 两步保存 + 后端算 checksum + 创建即定型、edges.enabled 开关不接为有意偏离）+ 5.1–5.5 五块操作面（**CU 只读面经用户拍板随 M13 交付**；子实体平级路由页钉死；Downlinks 排序经 ngx 源码复核定案 = 服务端 seqId ASC 直渲、客户端倒排登记增强）+ 5.6 增强登记 + 5.7 缺陷登记（含本机后端两条实测实锤：customerTitle 排序 500、otaPackage full GET base64 回带；实测新缺陷：OTA 无 profile 上传步 500 空指针）。依据 ui-ngx 源码侦察、后端契约盘点与三镜头专家合议（工作底稿 `docs/agents/m13-*.md` 七份）；实现清单见 [v2-m13-implementation-brief.md](./v2-m13-implementation-brief.md)。
- 2026-09-05：**M12 复审回写（双轴 code-review + 真机裁决后收口）**：4.0 勘误「候选按角色二分非并集」（SYS trigger=6 种、usersFilter=4 变体，均以 ngx 源码为准）与已读/未读数通道口径（REST + `subscribeNotifications` 快照，WS MARK_* 登记 4.7）；4.5 模板内联新建/编辑降登记；新增 **4.7 六项登记**（共性收敛清单、edge service 迁移、服务层预留函数等）与 **4.8 后端缺陷登记**（filtered targets 500 on createdTime sort、`subscribeUnreadNotificationCount` 字段错读、上游 SYS targets 禁用缺陷）。实现侧同步修复：inbox 列表 useMemo 过期闭包（ADR 0007 §5）、发送向导切回过滤端点（name 排序规避）、不可用投递方式归零。
- 2026-09-05：**M12 段定稿（§4 全量补定）**：4.0 通用边界（路由/角色矩阵、14 trigger 双级收缩、投递方式运行时探测、**WEB 通道为端到端验收基准、真实 SMS/EMAIL 等到达留人工验收**、settings/account 两处登记不实施）+ 4.1–4.6 六块操作面 + 4.7 能力级增强登记。依据 ui-ngx 通知族源码侦察与后端四控制器契约盘点（工作底稿 `docs/agents/m12-*.md`）；随 M12 开工落盘。
- 2026-09-05：**M11 3V 波真机走查收账（§3.1–3.7 逐项勾账）**——✅ 26 项 / 受阻或未覆盖 6 项保持未勾并登记；新登记缺陷 V1-1（bundle 装 system 类型后端静默丢弃，Major）、V1-2（bundle 图片字段过渡实现未回接，Minor）、V8-1（JS 新建 MODULE 走错端点 400，Major）、V8-2（批量上传 toast 占位符未注入，Minor）；§3.6 两条按主会话裁决口径勾账并回写 editors spec；走查证据全文见 [v2-m11-browser-walkthrough.md](./v2-m11-browser-walkthrough.md)。
- 2026-09-05：**§3.3 预览模式勘误为静态形态 + §3.8 新登记 scada 符号 widget 运行时渲染器缺口**（波 2C 合入时事实核查：fork widget 注册表无 scada 渲染器，M7 占位三态既有事实覆盖；波 2E 同步证实抽屉数据源为 registry-only）。另：上传大小上限（authState.maxResourceSize）fork 无来源，波 1A/2C 均未做假实现，登记随 auth 波接入。
- 2026-09-05：创建。M11 段定稿（§1 通用边界 + §3.1–3.7 操作面 + §3.8 增强登记；解锁 editors spec 两条挂起验收入 §3.6）；M12–M15 骨架占位。依据 #16 范围定案与 ui-ngx 源码侦察（admin-routing / image-gallery / scada-symbol / resource 前后端全链）。
