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

## 5. PoC / 证据义务（V 波回填本节）

- （待回填：交付 commit 清单、单测数、走查终态、门禁数字、两条回写链接、数据保全清单）

## 修订记录

- 2026-09-05：创建（M11 开工：波次 0/1A/1B/2C/2D/2E/3/X 与文件所有权钉死；新依赖四件波 0 一次装；SCADA 编辑器实现边界框定）。
