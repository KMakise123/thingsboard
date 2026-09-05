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

- [ ] widget types 列表：列 createdTime/name/bundles/widgetType(system)/deprecated，搜索/分页/排序，行点击进详情（锚点 `widget-types-table-config.resolver.ts:80-91,216-221`）
- [ ] deprecated 过滤开关；system 列（SYS 且含 system 类型时显示）
- [ ] 新建 widget 类型：模板类型选择对话框（静态 widgetType 枚举，锚点 `select-widget-type-dialog.component.ts`）→ 进编辑器（M9 已交付）
- [ ] widget type 详情页：预览渲染 + 元信息 + 编辑入口（跳 `/widgets/editor/:id`）
- [ ] 导入/导出：单类型导出（含可选 includeResources）、导入走 `updateExistingByFqn` 通道、批量导出 zip（锚点 `widget-types-table-config.resolver.ts:93-115,231-246`）
- [ ] widgets bundles 列表：列/搜索/分页、新建/编辑/删除/导入/导出（锚点 `widgets-bundles-table-config.resolver.ts:68-130`）
- [ ] bundle widgets 管理页：bundle 内 widget 集合增删（add widget fqn / 移除），排序保存（锚点 `widgets-bundle-widgets.component.ts:150-204`）
- [ ] 编辑器入口一致性：列表/详情均可进 M9 编辑器；编辑器保存后列表失效刷新

### 3.2 图片库（对齐 `shared/components/image`）

- [ ] 画廊双模式 list/grid + 滚动网格，分页/搜索/排序写 URL query（锚点 `image-gallery.component.ts:216-242,306-326`）
- [ ] 上传（multipart，title 预填文件名）+ 失败处理；maxResourceSize 上限提示
- [ ] 图片信息编辑（title）+ 查看（原始尺寸/链接）+ 下载 + 导出 JSON + 导入（锚点 `image-dialog.component.ts:95`、`image.service.ts:183-208`）
- [ ] embed 公链开关：设 public 后生成免登链接与嵌入代码（锚点 `embed-image-dialog.component.ts:66,90-91`）
- [ ] include system images 开关（SYS/TENANT 语义差异：TENANT 可见 system 图、只读）
- [ ] 删除含引用流：单个/批量 → 被引用对话框 → force 删除（§1 通用边界）
- [ ] 选择模式 selectionMode（弹层复用形态，供 SCADA 预览等调用方嵌入）

### 3.3 SCADA 符号库 + 编辑器页（对齐 `pages/scada-symbol`，最重组件）

- [ ] 符号库列表：画廊 isScada 形态（文案/行为切换），上传解析 SVG metadata 预填 title，上传成功跳编辑器（锚点 `image-gallery.component.ts:657-719`、`upload-image-dialog.component.ts:99-114`）
- [ ] 编辑器路由 `/resources/scada-symbols/:type/:key`：加载失败跳回列表（resolver 语义，锚点 `admin-routing.module.ts:52-68`）
- [ ] 画布：SVG 结构编辑（tag 虚线高亮框、hover 高亮、重叠元素错位提示）、缩放平移（限域）、显示/隐藏元素切换、svg/xml 双模式（锚点 `scada-symbol-editor.component.ts`、`scada-symbol-editor.models.ts:207-262`）
- [ ] tag 管理：画布 hover 加/删 tag 面板、tag 列表、tag 级 stateRenderFunction 与 click action 编辑（锚点 `scada-symbol-tooltip.components.ts`、`metadata-tags.component.ts`）
- [ ] metadata 四 tab：general（title/description/searchTags/widgetSizeX/Y 1-24 校验）/ tags / behavior（value/action/widgetAction 三类 + 默认 settings 编辑器）/ properties（FormProperty 配置）（锚点 `scada-symbol-metadata.component.ts:102-148`、`scada-symbol.models.ts:151-173`）
- [ ] 保存链：getContent + metadata 回写 SVG → `updateImage` → title 变更追加 `updateImageInfo` → 重载（锚点 `scada-symbol.component.ts:211-249`）
- [ ] 预览模式：内嵌仪表盘渲染 `system.scada_symbol` 模拟 widget（simulated:true、尺寸取 metadata.widgetSize、对象设置面板可编辑 behavior/properties 实例值）（锚点 `scada-symbol.component.ts:255-298`）
- [ ] 从符号创建 widget：克隆 system.scada_symbol 模板 → 注入符号链接/尺寸/previewWidth → 保存 + 可选入 bundle（锚点 `scada-symbol.component.ts:406-465`）
- [ ] 替换 SVG 内容（上传）+ 下载符号（锚点 `scada-symbol.component.ts:358-404`）
- [ ] readonly 边界：TENANT 编辑 system 符号 → 只读（锚点 `scada-symbol.component.ts:486-490`）
- [ ] 行为契约：受控退出确认（dirty → 确认 Modal，沿 M10 D1 受控形态）、EditorSession 撤销（结构性操作入栈）——SCADA 画布编辑是否入撤销栈按能力级增强登记，不做硬门槛

### 3.4 JS 库（对齐 `js-library-*`）

- [ ] 列表：resourceType=JS_MODULE 固定 + subType 过滤（EXTENSION/MODULE），列 title/subType/system（锚点 `js-library-table-config.resolver.ts:92-99,112`）
- [ ] 新建/编辑 MODULE：content 文本编辑 → 保存自动补 `.js` 文件名（锚点 `js-resource.component.ts:106-120`、`js-library-table-config.resolver.ts:121-141`）
- [ ] 上传文件 / 下载 / 删除含引用流 / 批量删除（锚点 `js-library-table-config.resolver.ts:199-331`）

### 3.5 资源文件库（对齐 `resources-library-*`）

- [ ] 列表：resourceType 过滤（LWM2M_MODEL/PKCS_12/JKS/GENERAL），列 title/resourceType/system（锚点 `resources-table-header.component.ts:32`、`resources-library-table-config.resolve.ts:83-90`）
- [ ] 多文件批量上传（分批 100）+ 编辑信息 + 下载（锚点 `resources-library-table-config.resolve.ts:116-149`）
- [ ] 删除含引用流 / 批量删除（锚点 `resources-library-table-config.resolve.ts:207-339`）

### 3.6 解锁 v2 editors spec 两条挂起验收

- [ ] widget 选择抽屉 scada 置顶：scada 布局下抽屉请求带 `scadaFirst=true`（bundles/widgetTypes 两路 + 类目接口），scada 符号类目置顶可见（锚点 `dashboard-widget-select.component.ts:112-117,292-307`；后端参数已存在）〔验收后回写 `v2-editors-acceptance.md` §3.2 缺口行〕
- [ ] SCADA 符号编辑器页边界走查：编辑器页可进可编辑（本 spec §3.3）+ 仪表盘内符号实例只能换符号/绑设备/绑对象、无 SVG 结构编辑入口（M7 已交付行为，本段补真机走查）〔验收后回写 `v2-editors-acceptance.md` §6 边界行〕

### 3.7 横切（M11）

- [ ] i18n：`pages.resources.*` 域 zh/en key 全等（check-locale 门禁）+ 菜单 key 双语
- [ ] 主题：零内联色值，颜色全走 antd token；SCADA 画布高亮色同样走 token
- [ ] 自动化衔接：M11 回归项（列表 CRUD 主路径 + 引用删除流 + scadaFirst）登记 #12 扩充（comment 留痕）
- [ ] 数据保全：自建资源/符号/widget/bundle 终态全 DELETE，system 资源零改动
- [ ] 门禁：lint 0 error（基线 warnings 数只降不升）/ tsc / vitest 全绿 / check-locale

### 3.8 能力级增强登记（只登记不验收）

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

- 2026-09-05：创建。M11 段定稿（§1 通用边界 + §3.1–3.7 操作面 + §3.8 增强登记；解锁 editors spec 两条挂起验收入 §3.6）；M12–M15 骨架占位。依据 #16 范围定案与 ui-ngx 源码侦察（admin-routing / image-gallery / scada-symbol / resource 前后端全链）。
