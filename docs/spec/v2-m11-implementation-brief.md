# v2 M11 实施简报：资源库五件套 + SCADA 符号编辑器（团队共享契约）

> 依据：[v2-subsystems-acceptance.md](./v2-subsystems-acceptance.md) §3（M11 操作面）+ [#16](https://github.com/KMakise123/thingsboard/issues/16) 范围定案 + #14 定案（进入条件已满足）。
> 分支：`feature/m11-resources-library`（自 master 创建）。本简报是实施团队的作业契约；验收勾账回写 spec 本体。

## 0. 范围

- **做**：spec §3.1–§3.7 全部——widget 类型库（types + bundles + bundle widgets 管理 + 详情页）、图片库、SCADA 符号库、SCADA 符号编辑器页（最重组件）、JS 库、资源文件库、解锁 editors spec 两条挂起验收（§3.6）。
- **不做**（防蔓延）：
  - iot-hub 入口（Add from IoT Hub 等）——iot-hub 缓做（#16/#17）。
  - v1 已交付页面的图片控件回改（15 处消费点随各域迭代）——spec §3.8 登记。
  - 后端零改动：全部端点上游已有（TbResourceController / ImageController / WidgetTypeController / WidgetsBundleController）。
  - 不引入 jQuery / tooltipster / Ace；hover 面板 antd Popover、代码字段 CodeMirror（spec §3.8）。
  - 不做编辑器画布撤销栈硬门槛（登记为能力级增强，spec §3.3 行为契约行）。

## 1. 现状盘点（门禁基线，agent 直接采信）

- 分支起点 master @ e37624739b。门禁基线以开工时 `npm run lint / test / tsc / check-locale` 实测为准（M10 收口终态：lint 0 error/30 warnings、test 1695 用例全绿、tsc/check-locale 绿）。
- 后端本机 `http://localhost:8080`；前端 dev server `http://localhost:8000`（stale-bundle 惯例：杀旧链 → 删 `src/.umi` → `ui-antd/dev-detached.cmd`）。真机租户 `tenant@thingsboard.org` / `tenant`。
- 复用资产：`core/editor/session.ts` EditorSession、`use-leave-guard` + 受控 exit-confirm Modal（M10 D1 形态）、`save-with-conflict`、`PageContainer`（ADR 0008）、FormProperty 渲染器、`useBatchRun`/`BatchProgressModal`、`url-state.ts`、devices 列表页范式（`pages/devices/list/index.tsx`）。
- 服务层现状：`services/tb/widget-type.ts` 已有（M9）；`resource.ts` / `image.ts` / bundle 侧需新建；`/api/resource`、`/api/images` 端点已在 `api/tb-openapi.json`（17 条 resource 路径）。手写域类型放 `src/types/tb/`（resource.ts / image.ts 新建）。
- 新依赖（仅此四件，波 0 在主检出安装后 worktree 经 junction 复用）：`@svgdotjs/svg.js`、`@svgdotjs/svg.panzoom.js`、`@svgdotjs/svg.filter.js`（对齐 ui-ngx 3.2.4 系）；CodeMirror 补全沿用 M9 既有包。

## 2. 波次与文件所有权（硬边界，跨边界改动回主会话裁决）

| 波 | Agent | 交付 | 文件所有权 |
|---|---|---|---|
| 0 | 地基 | 路由族 `/resources/**`（6 子路由 + scada 编辑器动态段）+ 菜单 key 双语 + `src/locales/{zh-CN,en-US}/resources/` 骨架文件 + 聚合器接线 + `access.ts` 增 `canSysAdminOrTenantAdmin` + 全部 stub 页 + 四件新依赖安装 + stub 页门禁自证 | `config/routes.ts`、`src/access.ts`、`src/locales/**`（聚合器 + resources 目录）、`src/pages/resources/**`（仅 stub）、`package.json` |
| 1A | 资源文件库 + JS 库 | `services/tb/resource.ts` + `types/tb/resource.ts` + `resource.endpoints.test.ts` + 两列表页 + JS MODULE 编辑表单 + 共享「被引用删除流」组件 `components/resources/resources-in-use.tsx`（+单测）+ 各自 locale 文件 | `src/services/tb/resource*`、`src/types/tb/resource*`、`src/pages/resources/{library,js-library}/**`、`src/components/resources/**`、`src/locales/{zh-CN,en-US}/resources/{library,js-library}.ts` |
| 1B | widget 类型库 + bundles | `services/tb/widgets-bundle.ts`（+endpoints.test）+ widget-type service 扩展（如缺）+ types + 两列表页 + 详情页 + bundle widgets 管理页 + 导入导出（includeResources / inlineImages / zip）+ 模板选择对话框 + locale 文件 | `src/services/tb/widgets-bundle*`、`src/types/tb/widgets-bundle*`、`src/pages/resources/{widget-types,widgets-bundles}/**`、`src/locales/{zh-CN,en-US}/resources/{widget-types,widgets-bundles}.ts` |
| 2C | 图片库 + SCADA 符号库页 | `services/tb/image.ts` + `types/tb/image.ts` + endpoints.test + 画廊组件（list/grid、URL 态、上传/信息/下载/导出/导入/embed 公链/include system/选择模式、isScada 形态）+ `gallery-image-input`（+multiple）+ 符号库页（isScada + 上传跳编辑器）+ locale 文件 | `src/services/tb/image*`、`src/types/tb/image*`、`src/components/images/**`、`src/pages/resources/{images,scada-symbols}/index.tsx`（库列表页）、`src/locales/{zh-CN,en-US}/resources/{images,scada-symbols}.ts` |
| 2D | SCADA 符号编辑器页 | 编辑器路由页（2C 库列表跳入）：svg.js 画布（tag 高亮/hover Popover 面板/缩放限域/显隐切换/svg-xml 双模式）+ metadata 四 tab + 保存链 + 预览模式 + createWidget + 替换/下载 + readonly + 受控退出确认 + locale | `src/pages/resources/scada-symbols/{editor,canvas,metadata,preview}/**`、`src/core/scada/**`（符号 metadata 解析纯函数 + 单测）、`src/locales/{zh-CN,en-US}/resources/scada-symbol-editor.ts` |
| 2E | scada 置顶解锁 | 仪表盘编辑器 widget 抽屉 `scadaFirst` 参数透传（scada 布局判定）+ 单测 | `src/pages/dashboards/editor/dialogs/add-widget/**`（抽屉取数一处）、相关测试 |
| 3G | 门禁 | 分支全量门禁复跑（lint 0 error / tsc / test 全绿 / check-locale）+ 数字落走查记录 §1 | 无 src 改动 |
| 3V | 验收 | 真机走查（§4）+ spec §3.1–3.7 勾账 + `v2-m11-browser-walkthrough.md` + editors spec 两条回写 + #12 登记 comment + 简报 §5 回填 | spec / 走查记录 / 简报文档 + GitHub #12 |
| X | 按需 | 走查登记缺陷修复（TDD 先红后绿） | 修复涉及文件 |

**依赖与合并序**：波 0 → {1A ∥ 1B} → 2C → {2D ∥ 2E} → 3 → X。每波合入 `feature/m11-resources-library` 后下一波 worktree 开工第一步 `git merge feature/m11-resources-library --no-edit`。

**作业纪律**（沿 M10 简报全文有效）：每逻辑单元一 commit（Conventional Commits 英文）；提交前自跑自己范围 vitest + tsc + biome；worktree 用 junction 只读复用 node_modules（**禁止 npm install**，依赖只由波 0 在主检出装）；`src/.umi` 缺失跑 `npx max setup`；颜色只走 antd token；HTTP 铁律（只有 `core/http` 发请求）；i18n zh/en 对齐、`formatMessage` 必带 defaultMessage；服务层质量靠 `<domain>.endpoints.test.ts`；UI 文件在 ui-antd/ 下工作时加载 antd 技能。

## 3. SCADA 编辑器实现边界（波 2D 自由度框）

- 纯函数先行：`src/core/scada/symbol-metadata.ts` 移植 `parseScadaSymbolMetadataFromContent` / `updateScadaSymbolMetadataInContent` / `scadaSymbolContentData` / `applyTbNamespaceToSvgContent`（TDD，对齐 `scada-symbol.models.ts:215-352` 行为：CDATA JSON、tb 命名空间、缺 metadata 按 viewBox 生成 emptyMetadata）。
- 画布：`@svgdotjs/svg.js` + panzoom（zoom 0.75–4）；tag 元素虚线高亮、hover 高亮 + antd Popover 加/删 tag 面板；序列化前恢复可见性并剥离编辑期标记（`tb:inner` 等，对齐 `getContent` 语义 `scada-symbol-editor.models.ts:130-149`）。
- 预览：内嵌仪表盘挂 `system.scada_symbol` 模板 clone（simulated:true），对象设置面板编辑 behavior/properties 实例值；AliasController 空实现等价物。
- XML 模式：CodeMirror + `parseScadaSymbolsTagsFromContent` 正则抓 tag（getTags 双模式语义对齐 `scada-symbol-editor.component.ts:177-183`）。
- 保存 = M10 同款契约：dirty 判定、受控退出确认、保存成功 baseline 前移。

## 4. 真机走查清单（V 波作业单）

> 取证：browseros 截图 + AX 快照 + DOM 探针 + curl API 复核；自建 fixture 终态全 DELETE；记录落 `v2-m11-browser-walkthrough.md`。

| # | spec 落点 | 走查动作 |
|---|---|---|
| 1 | §3.1 | widget types 列表全列/搜索/详情/进编辑器往返；bundle 新建→加 widget→移除→删除（fixture 清理） |
| 2 | §3.1 | widget type 导出（含资源）→ 改名导入 → 列表双份目击 → 清理 |
| 3 | §3.2 | 图片上传→信息改 title→embed 公链开关→导出→删除（无引用直删） |
| 4 | §3.2/§1 | 被引用删除流：图片设为某 widget 类型 image → 删 → 被引用对话框列实体 → force 删 → 引用处空图占位 |
| 5 | §3.3 | 上传 SVG 符号（metadata 预填 title）→ 自动跳编辑器 → 画布 hover 加 tag → 四 tab 各改一项 → 保存 → 刷新复核落库 |
| 6 | §3.3 | 预览模式：模拟 widget 渲染 + behavior 实例值改动生效；从符号创建 widget → 出现在 widget 类型列表 → 清理 |
| 7 | §3.3 | readonly：TENANT 打开 system 符号 → 编辑控件禁用态 |
| 8 | §3.4/3.5 | JS MODULE 新建（content 编辑→自动 .js 名）→ 下载 → 删除；资源文件批量上传 2 件 → 类型过滤 → 批量删除 |
| 9 | §3.6-1 | scada 布局盘开 widget 抽屉 → 网络面板证 `scadaFirst=true` → scada 类目置顶目击 → 回写 editors spec §3.2 |
| 10 | §3.6-2 | 仪表盘内符号实例走查：换符号/绑设备/绑对象可用、无 SVG 结构编辑入口 → 回写 editors spec §6 |
| 11 | §3.7 | i18n 抽查无裸 key、主题 DOM 探针零内联色值、门禁数字落账 |

## 5. PoC / 证据义务（V 波回填本节，2026-09-05）

### 5.1 交付 commit 清单（worktree 实测 `git log`，grouping 按 commit subject）

- **波 0 七连发**：`17ae5f6fc1`（svg.js 三依赖）→ `ed8d6a8753`（access key）→ `82d0e8fc57`（menu keys）→ `0920c5a8ac`（resources locale 骨架）→ `2ef1c31dd2`（八 stub 页）→ `48b29bbc74`（/resources 路由族）→ `00c58266ce`（stub 显式标题修复）
- **路由补丁（1B 裁决）**：`06000baa24`（widget type 详情动态路由 + M9 编辑器 SA access）
- **波 1A 八连发**：`7e434cbd5e`（bundle wire types + transport）→ `ac77573d48`（resource 域类型）→ `42f1b2951c`（resource transport 批传 + 引用删流）→ `d1ae0015bc`（resources-in-use force 删 Modal）→ `37c521c21b`（引用实体 resolver + locale）→ `df5bf2e1e0`（widget types/bundles zh/en）→ `afc7836986`（widget types 列表页）→ `2d44ce5f5d`（read 行必带 resource id）→ `39a7eca1d3`（资源文件库列表页）→ `5dce50c747`（JS 库列表页 + MODULE 编辑 + 引用删流）
- **波 1B 七连发**：`924a396b7d`（列表显式标题保留）→ `8f32685506`（bundle widgets 管理页）→ `53ba5455e5`（bundles 列表页）→ `f2df9076a0`（widget type 详情页）→ `ff3dc3428e`（biome 格式化）→ `37c521c21b`/`df5bf2e1e0` 见 1A 分组（共享 locale）
- **波 2C 五连发**：`f72cef7129`（image transport + wire types）→ `6b86c23e7d`（image gallery 组件族）→ `482e75e2f4`（images + scada symbols 库页）→ `d43a2a3a72`（gallery-image-input 控件）→ `679d74d4f0`（image wire types 钉死）
- **波 2D 九连发**：`b20ada000f`（metadata 纯函数管道）→ `269ce591f6`（canvas 编辑对象字节稳定序列化）→ `e9e070bbd2`（editor locale）→ `fb68e7886a`（画布组件 svg/xml 双模式）→ `2a94a61085`（metadata 四 tab）→ `5e0dc6efbf`（静态预览）→ `113888a687`（create-widget 对话框）→ `a9c021421d`（编辑器页保存链/readonly/退出确认/建 widget）→ `48b9aad2e0`（lint 合规）
- **波 2E 两连发**：`7b1ac25a67`（scada 布局抽屉两路 scadaFirst）→ `401ce39f05`（?template= 预选 starter）
- 另：`c2673ae46d`（spec 事实核查修订）、`65b483ec32`（M11 kickoff spec+简报）

### 5.2 走查终态（3V 波，11 项）

✅ 9 项 / 半 1 项 / 受阻 1 项，新登记缺陷 4 项（V1-1 Major 后端语义、V1-2 Minor、V8-1 Major、V8-2 Minor，修复归 X 波）；editors spec 两条解锁按裁决口径回写。逐项动作/证据/结论见 [v2-m11-browser-walkthrough.md](./v2-m11-browser-walkthrough.md)；spec 勾账见 [v2-subsystems-acceptance.md](./v2-subsystems-acceptance.md) §3.1–3.7（✅ 26 项勾选，受阻或未覆盖 6 项保持未勾并逐行登记）。

### 5.3 单测与门禁数字（3G 波为准，3V 本地复核）

- 门禁：lint **0 error / 30 warnings**（基线不变）、tsc **0 错误**、vitest **1885 用例全绿**、check-locale **绿**（3V 波 worktree 本地复跑 check-locale PASS；worktree 无 node_modules junction，全量门禁以 3G 波实测为准）。
- 单测锚（随波交付）：`core/scada/symbol-metadata.test.ts`（纯函数管道）、`resources-in-use` 组件单测、`resource/image/widgets-bundle` endpoints.test、`manage-layouts.test`、`bundle-widgets/index.test`（保存契约）、2E scadaFirst 单测。

### 5.4 两条 editors spec 回写链接

- [v2-editors-acceptance.md](./v2-editors-acceptance.md) **§3.2** scada 置顶行：参数透传勾账 + registry-only 受限口径（裁决照抄）
- [v2-editors-acceptance.md](./v2-editors-acceptance.md) **§3.6** 边界行：SVG 不可编辑成立勾账 + 换符号/绑设备/绑对象无承载如实登记

### 5.5 自动化衔接 #12 登记

comment URL：https://github.com/KMakise123/thingsboard/issues/12#issuecomment-5550579017 （范围：资源五列表 CRUD 主路径、引用删除流、scadaFirst 参数、SCADA 编辑器保存链；是否常驻回归由 #12 扩充时另定）

### 5.6 数据保全清单（3V 走查终态）

自建 fixture 11 类全部 DELETE（widget 类型 ×4、bundle ×1、图片 ×1、SCADA 符号 ×1、JS MODULE ×1、资源文件 ×2、仪表盘 ×1；逐项 API 复核 total=0 或 404）；system 资源零写入（只读目击 + 只读导出副本不入库）。逐项清单见走查文档 §4。

## 修订记录

- 2026-09-05：创建（M11 开工：波次 0/1A/1B/2C/2D/2E/3/X 与文件所有权钉死；新依赖四件波 0 一次装；SCADA 编辑器实现边界框定）。
