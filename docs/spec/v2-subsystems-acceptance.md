# v2 八子系统独立页验收 spec（活文档）

> 状态：**M11 段定稿**（2026-09-05，随 M11 开工落盘；依据 [#16](https://github.com/KMakise123/thingsboard/issues/16) 范围定案 + ui-ngx 4.4.0 源码侦察）。M12–M15 段骨架占位，随各段开工补定。
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

## 4. M12 通知族（骨架，开工补定）

- 通知中心独立页：通知列表/规则/接收人/模板全操作面。

## 5. M13 Edge + OTA（骨架，开工补定）

- Edge 实体全操作面 + OTA 包管理页。

## 6. M14 计算字段独立页 + VC 独立页 + settings 六小件 + 密码策略页（骨架，开工补定）

- queues / notifications / home / repository / auto-commit / trendz / ai-models settings tab；`/security-settings/general` 密码策略页。

## 7. M15 home 首页 + 匿名公共仪表盘 + 收口（骨架，开工补定）

- 登录落点调整 home → home dashboard；匿名公共仪表盘页；usage 下钻 states 随域评估。

## 修订记录

- 2026-09-05：**M11 3V 波真机走查收账（§3.1–3.7 逐项勾账）**——✅ 26 项 / 受阻或未覆盖 6 项保持未勾并登记；新登记缺陷 V1-1（bundle 装 system 类型后端静默丢弃，Major）、V1-2（bundle 图片字段过渡实现未回接，Minor）、V8-1（JS 新建 MODULE 走错端点 400，Major）、V8-2（批量上传 toast 占位符未注入，Minor）；§3.6 两条按主会话裁决口径勾账并回写 editors spec；走查证据全文见 [v2-m11-browser-walkthrough.md](./v2-m11-browser-walkthrough.md)。
- 2026-09-05：**§3.3 预览模式勘误为静态形态 + §3.8 新登记 scada 符号 widget 运行时渲染器缺口**（波 2C 合入时事实核查：fork widget 注册表无 scada 渲染器，M7 占位三态既有事实覆盖；波 2E 同步证实抽屉数据源为 registry-only）。另：上传大小上限（authState.maxResourceSize）fork 无来源，波 1A/2C 均未做假实现，登记随 auth 波接入。
- 2026-09-05：创建。M11 段定稿（§1 通用边界 + §3.1–3.7 操作面 + §3.8 增强登记；解锁 editors spec 两条挂起验收入 §3.6）；M12–M15 骨架占位。依据 #16 范围定案与 ui-ngx 源码侦察（admin-routing / image-gallery / scada-symbol / resource 前后端全链）。
