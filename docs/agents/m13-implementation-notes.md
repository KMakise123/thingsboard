# M13 Edge + OTA 实现范式清单（工作文档，agents 用）

> 由 scout-antd 盘点产出（2026-09-06）。**只写 ui-antd 侧增量**：服务层/列表页/路由/表单/测试的通用范式见 `docs/agents/m12-implementation-notes.md`（先读它），本文不重复。实现者动手前两份都必读；随 M13 收尾可归档或删除。

## 0. 结论速览

- **服务层零基础**：`ui-antd/src/services/tb/` 没有 `edge.ts` / `ota.ts` 残留，Edge/OTA 的 REST service、手写类型、页面、locale、路由全部要新建。`ui-antd/src/types/tb/entity.ts:28-29` 的 `EntityType` 枚举已有 `OTA_PACKAGE` / `EDGE` 值（openapi 生成底座），可直接用。
- **Edge 详情子页不要指望参数化复用五个 v1 列表页**：devices/assets/entity-views/dashboards/rule-chains 列表页全部是「页面私有 url-state + 页内 useQuery + service 直调 + 硬编码列/动作」的单页（750-861 行），取数不可注入。仓内真正的先例是 **customers 作用域页**（`/customers/:id/devices` 等）：平铺隐藏路由 + `CustomerScopePageShell` 外壳 + 共享 `createListUrlState` 工厂 + 复用组件层。Edge 子页照这个模式每页约 300 行仿写。
- **可白嫖的共享件比预期多**：`components/entities/detail/` 八个面板（attributes/alarms/relations/audit-logs/version-control/...）props 是多态 `entityId: EntityId`，Edge 详情页直接挂；`AssignCustomerModal` 自 M2 起实体无关；`assembleDetailTabs` tab 注册表数据驱动；multipart 上传与 blob 下载均有成熟先例。
- Events 面板要小改造：`EventsPanel` 绑死 `EntityType.DEVICE`，但底层 `getEvents` service 本来就是通用 `entityId` 签名。

## 1. 服务层现状与缺口

文件：`ui-antd/src/services/tb/`（66 个文件，逐域一对 `xxx.ts` + `xxx.endpoints.test.ts`）。

- 无 `edge.ts` / `ota.ts` / `edge-*.ts`。全仓 `Edge` 命中只有：profile 上的 `defaultEdgeRuleChainId` 字段（`src/types/tb/device-profile.ts:151`、`asset-profile.ts:25`）、tenant profile 的 Edge 限流字段（`src/types/tb/tenant.ts:111-115`）与 openapi 快照注释——都不是 Edge 实体 CRUD。
- **导出面**：`ui-antd/src/services/tb/index.ts:13-27` 只 `export *` 了 13 个域（auth/asset/customer/dashboard/device/entity-view/rule-chain/user/widget-type/version-control/attributes/alarm-rules/calculated-fields/notification）。注意 `events.ts`、`image.ts`、`resource.ts`、`alarm.ts`、`audit-log.ts` 等**不在** index.ts 导出面，消费方直接 `import { getEvents } from '@/services/tb/events'`（如 `src/components/devices/detail/EventsPanel.tsx:13`）——两种消费形态并存，edge/ota 跟哪种见裁决点 6。
- **既有取数函数不支持 Edge 过滤**：`getTenantDevices(pageLink, filter: DeviceListFilter)`（`device.ts:45`，filter 只有 `type/deviceProfileId/active`，`device.ts:25-30`）、`getTenantAssets`（`asset.ts:42`）、`getTenantEntityViews`（`entity-view.ts:36`）、`getTenantDashboards`（`dashboard.ts:28`，连 filter 都没有）、`getRuleChains`（`rule-chain.ts:28`）。TB 的 Edge 子实体走**专属端点** `GET /api/edge/{edgeId}/devices` 等，不是在 tenant 端点上加 query 参数，所以不需要改这些函数的 filter，直接新增 edge.ts 里的子实体函数。
- 新增函数一律照 `resource.ts` 范式（m12 notes §2）：`tbHttp` 出口、JSDoc 钉 endpoint、`endpoints.test.ts` mock `./http` 断 URL+展平 query。**OTA 上传是 multipart**：`FormData` 直接作为 `tbHttp.post` body，先例 `image.ts:94-105`：

```ts
const form = new FormData();
form.append('file', file);
form.append('title', title);
return tbHttp.post<ImageResourceInfo>('/api/image', form);
```

- openapi 快照覆盖（`ui-antd/src/types/tb/openapi/index.ts`，粗查）：`/api/edge*` 共 25 条——含 `/api/edges`、`/api/edge/{edgeId}`、`/api/edge/{edgeId}/devices|assets|dashboards|entityViews|ruleChains|events`（列表+单项分配 CRUD）、`/api/edge/{edgeId}/sync`、`missingToRelatedRuleChains`、`instructions/install|upgrade`、`upgrade/available`、`/api/edge/types`、`bulk_import`；`/api/otaPackage*` 共 6 条——`/api/otaPackage`、`/api/otaPackages`、`/info/{id}`、`/{id}/download`、`/otaPackages/{deviceProfileId}/{type}`。快照仅参考，权威手写类型照 `device.ts` 范式（m12 notes §2）。

## 2. 可复用清单（直接 import 或小改）

| 组件/工具 | 位置 | Edge/OTA 复用方式 |
| --- | --- | --- |
| `AssignCustomerModal` | `ui-antd/src/components/entities/AssignCustomerModal.tsx:27-` | **直接用**。头注明说 entity-agnostic（1-8 行，M2 起 devices+assets 共用），props 只要 `open/entityCount/onConfirm`；Edge 把设备/资产分配给 customer 时照 `devices/list/index.tsx:838` 的接线 |
| 共享实体面板 ×8 | `ui-antd/src/components/entities/detail/`（AttributesPanel / LatestTelemetryPanel / AlarmsPanel / AlarmRulesPanel / RelationsPanel / AuditLogsPanel / VersionControlPanel / CalculatedFieldsPanel） | **直接用**。props 是多态 `entityId: EntityId`（`AttributesPanel.tsx:62-67` 注释原文 "Polymorphic entity reference (DEVICE / ASSET / ENTITY_VIEW / ...)"）；VersionControlPanel 另收 `entityType`（`devices/detail/index.tsx:445-450`），传 `EntityType.EDGE` |
| 详情 tab 注册表 | `ui-antd/src/components/entities/detail/detail-tabs.tsx:46-57` `assembleDetailTabs` | **直接用**。Edge 详情页声明自己的 `DetailTabEntry[]`（key/label/taOnly/render），TA-only 过滤逻辑白拿。注意 `DetailTabKey` 来自 `detail-tab-keys.ts`，Edge 若有新 tab key 要扩它（见裁决点 4） |
| CustomerScopePageShell 外壳 | `ui-antd/src/pages/customers/scope-page-shell.tsx:38-83` | **仿写 Edge 版**（它是 customer 专属：写死 `getCustomerTitle`、回 `/customers/:id`）。Edge 详情子页列表需要同样的「标题=子页名、面包屑=Edge 名、onBack 回详情页」外壳 |
| `createListUrlState` 工厂 | `ui-antd/src/pages/customers/list-url-state.ts:29-` | **直接用**。无域筛选的纯分页/排序/搜索 URL state 工厂，`rule-chains/list.tsx` 头注也声明用的它。Edge 子页列表没有 profile/active 筛选，够用 |
| `useBatchRun` + `BatchProgressModal` | `ui-antd/src/components/shared/use-batch-run.ts`、`BatchProgressModal.tsx` | **直接用**。Edge 子实体的批量 unassign/delete 照 `customers/devices/index.tsx` 的接线 |
| `downloadBlob` | `ui-antd/src/components/shared/download-blob.ts:8-16` | **直接用**。OTA 包下载（`GET /api/otaPackage/{id}/download` blob → Save as），blob 由 `tbHttp.request(url, { responseType })` 取（m12 notes §2） |
| `DeviceCredentialsModal` / `DeviceCredentialsFields` | `ui-antd/src/components/devices/DeviceCredentialsModal.tsx:40-47` | **先例，不可直接用**（绑死 device credentials 端点与 `DeviceCredentialsType`）。Edge 详情若要 credentials/密钥类 tab，此三态结构（view/edit/reset + readOnly）是模板 |
| EventsPanel | `ui-antd/src/components/devices/detail/EventsPanel.tsx:40-55` | **要改造**。props 收 `deviceId/tenantId` 且内部写死 `EntityType.DEVICE`（52-55 行）；底层 `getEvents(entityId: EntityId, tenantId, eventType, pageLink)`（`services/tb/events.ts:38-43`）本来就是通用的。最小改造：props 改收 `entityId: EntityId` 或加 `entityType` 参数，devices/detail 调用点同步（`devices/detail/index.tsx:410-415`）+ 测试 `EventsPanel.test.tsx` 跟改 |
| `UploadImageDialog` 模式 | `ui-antd/src/components/images/upload-image-dialog.tsx:151-175` | **模式复用**（不直接 import，OTA 自己写 OtaPackageDialog）。`Upload.Dragger` + `beforeUpload` 里做校验/返回 false 阻自动上传 + Modal 提交时取 File 调 service |
| `PageContainer` | `ui-antd/src/components/layout/page-container` | 直接用（ADR 0008；`dirty`/`onBack`/`breadcrumbLabel` 用法见 `devices/detail/index.tsx:220-283`） |
| `serverErrorText` / `useAuthority` | `components/entities/server-error-text.ts`、`components/shared/use-authority.ts` | 直接用 |

## 3. 五个 v1 列表页逐页结论（Edge 复用视角）

五页同构：目录内 `index.tsx` + `url-state.ts`（页面私有 hook）+ `index.test.tsx`；页内 `useQuery` 直调 service 函数（**页面私有取数，无注入缝**）、列定义/动作面硬编码、`SORTABLE_COLUMNS` 映射常量、400ms 搜索防抖各写一份。结论全部是「页面本体难复用」，差异在动作面复杂度：

| 页面 | 规模 | 结论 | 说明 |
| --- | --- | --- | --- |
| `pages/devices/list/index.tsx` | 861 行 | 难复用（本体）/ 组件全可借 | 顶层动作最多：wizard 新建、CSV 导入、credentials、check-connectivity、assign/unassign customer、批量删除。这些动作组件（§2 清单）才是要复用的部分 |
| `pages/assets/list/index.tsx` | 836 行 | 同上 | `AssetDialog` / `AssetImportModal` 在 `components/assets/` |
| `pages/entity-views/list/index.tsx` | 750 行 | 同上 | 注意 `use-authority.ts` 放在 `pages/entity-views/` 根（不在 list/ 下），device 的在 `devices/detail/use-authority.ts`——位置不统一，Edge 页放哪自定 |
| `pages/dashboards/list/index.tsx` | 752 行 | 难复用 | 有 batch assign/unassign customer（158、291、650 行附近），edge 子页的 dashboard 分配语义（`/api/edge/{edgeId}/dashboard/{dashboardId}`）不同，只能借形状 |
| `pages/rule-chains/list.tsx` | 平铺文件（非目录，另有 `index.ts`/`list.test.tsx`） | 难复用 | edge 的 ruleChains 子页语义特殊（edge 专属链 + set root/profiling，`/api/edge/{edgeId}/{ruleChainId}/root`），照 ui-ngx 单独实现 |

**仓内已验证的替代路线**：`pages/customers/{users,devices,assets,dashboards}/index.tsx` 是四个「父实体作用域列表页」——每页独立实现（约 300 行）但复用组件层 + `CustomerScopePageShell` + `createListUrlState`，头注明说 "the ops mirror ui-ngx's customer-scope device table minus tenant-side extras"（`customers/devices/index.tsx:1-12`）。这就是 Edge 详情子页（`/edges/:id/devices` 等）的既定范式：**不复用列表页，仿写作用域页**。若想压重复，见裁决点 7。

## 4. 实体详情页先例（Edge 详情页的模板）

- **多 tab 详情页范式**：`pages/devices/detail/index.tsx`（457 行）——`PageContainer`（title/tags/extra/onBack/dirty）+ `<Tabs destroyOnHidden>`（只挂激活 tab，保 WS 10-cmd 预算，头注 5-7 行）+ `?tab=` URL state（`url-state.ts` 的 `useDetailTabUrlState`，CU 手打 TA-only tab 会被拉回 details，66-69 行）。tab 集合经 `buildTabItems` 数据驱动（320-454 行），`assembleDetailTabs` 已抽成共享。
- **详情页 customer unassign 先例**：header 放 danger 按钮 + `modal.confirm` + mutation + invalidate（`devices/detail/index.tsx:153-203`），locale key 复用列表页的（头注 149-152 行明说"labels reuse the devices list keys"）。Edge 详情页的 assign/unassign 面照抄此结构。
- **credentials 先例**：`components/devices/DeviceCredentialsModal.tsx`（view/edit/reset 三态 + CU readOnly + 版本回传），纯 device 域，Edge 无同构端点，仅作形态参考。
- **events tab 先例**：`components/devices/detail/EventsPanel.tsx`（事件类型 Select 默认 ERROR + 服务端分页 + body 展开行）。绑定问题见 §2；`EVENT_TYPES` 集合（16-23 行）是 device 视角的，Edge 事件类型集合要与 scout-ngx-edge 的结论对齐。
- 其余三个详情页（`assets/detail`、`entity-views/detail`、`customers/detail`）同构，`customers/detail` 还有「详情页 + 平铺子页」的完整组合，是 Edge「列表 + 详情 + 子实体页」最完整的参照系。
- gateways 页（`pages/gateways/index.tsx`）**不是**实体详情页先例——它是嵌系统仪表盘的展示页（GET resource dashboard JSON + DashboardView），与 Edge 无关，勿类比。

## 5. 文件上传与下载先例（OTA 二进制包）

- **service 层 multipart**：`services/tb/image.ts:94-105` `uploadImage(file, title, imageSubType)`——`FormData` append 后直接 `tbHttp.post`；`services/tb/resource.ts:138/181` 另有两处 FormData（JS module/文件资源）。OTA `saveOtaPackage` 照此：`form.append('file', file)` + checksum 等字段（字段名以后端实测为准，见裁决点 8）。
- **上传对话框**：`components/images/upload-image-dialog.tsx`——`Upload.Dragger`（151-175 行）+ `beforeUpload` 里读文件校验并返回 false 阻止自动上传 + Modal `onOk` 时取 File 调 service。OTA 差异点：校验扩展名/大小、无标题回填逻辑（OTA 文件名即包名）、checksum 可选自动计算。
- **下载**：`tbHttp.request(url, { responseType: 'blob' })`（`resource.ts` `downloadResource` 先例）+ `downloadBlob(blob, fileName)`（`components/shared/download-blob.ts:8-16`，单测在旁）。

## 6. 路由与菜单落位

- `config/routes.ts` 现有两种顶级形态：域平铺（devices/assets/...，88-101 行一带）与「routes 数组」菜单组（resources 387-440、notifications 446-483）。**Edge 在 ui-ngx 是独立 `edge_management` 菜单组 → ui-antd 建议照 notifications 形态建组**：

```ts
{
  name: 'edge',
  icon: /* 从 ui-ngx 对齐 */,
  path: '/edges',
  access: 'canTenantAdmin',          // Edge 是租户域，无 SA/CU 面
  routes: [
    { path: '/edges', redirect: '/edges/instances' },
    { name: 'instances', path: '/edges/instances', component: './edges/list' },
    // OTA 是否入组见裁决点 1
  ],
},
```

- **隐藏详情页既有写法**：`{ name: 'devices.detail', path: '/devices/:id', component: './devices/detail', hideInMenu: true }`（`routes.ts:95-101`）。
- **作用域子页既有写法**：平铺隐藏路由挂在顶级域下、react-router 按路径长度自动优先（`routes.ts:233-255` customers.users/devices/assets/dashboards 的注释原文说明此点）。Edge 子页照抄为 `/edges/:id/devices`、`/edges/:id/assets`、`/edges/:id/dashboards`、`/edges/:id/entityViews`、`/edges/:id/ruleChains`（各 `hideInMenu: true`，name 形如 `edge.devices`）。
- **access key 全集**：`src/access.ts:20-27` 共 6 个（canSysAdmin/canTenantAdmin/canCustomerUser/canSysAdminOrTenantAdmin/canTenantOrCustomer/canAuthenticated），没有 Edge 专用 key，也不用加——路由级 `canTenantAdmin` + 页面内 `useAuthority` 区分即可。routes.ts 头注规矩（4-13 行）：`access` 必须匹配 access.ts key；菜单由树过滤生成，绝不手写。
- menu id 随 `name` 自动生成（`menu.edge.instances` 等），文案加进双语 `src/locales/{en-US,zh-CN}/menu.ts`（key-for-key parity，`en-US/menu.ts` 头注）。

## 7. locale

- 结构：`src/locales/{en-US,zh-CN}/` 目录化域文件 + **手写聚合**（`src/locales/en-US.ts` / `zh-CN.ts` import 后 spread；CONTEXT.md:19 约定）。域文件两种既有形态并存：目录（`devices/`、`resources/`、`notifications/`）与单文件（`notifications.ts` 与 `notifications/` 目录同时存在）。
- **建议**：`en-US/edge.ts` + `zh-CN/edge.ts`（key 前缀 `pages.edge.*`）、`en-US/ota.ts` + `zh-CN/ota.ts`（`pages.ota.*`）；若 Edge 域文件大可升格为 `edge/` 目录。聚合文件各加两行 import + spread，`npm run check-locale` 过 parity 门禁。
- menu key：`menu.edge.*`（+ 视裁决点的 `menu.otaPackages`）双语同步。

## 8. 类型层

- `src/types/tb/` 无 `edge.ts` / `ota.ts` 残留（全目录核对过）。`EntityType` 枚举已含 `EDGE` / `OTA_PACKAGE`（`types/tb/entity.ts:28-29`），`EntityIdOf<EntityType.RULE_CHAIN>` 等 helper 可直接用。
- openapi 快照（`types/tb/openapi/index.ts`）edge 25 条 / otaPackage 6 条（§1 末），`npm run openapi:gen` 只产快照不产权威类型——照 m12 notes §2 手写 `types/tb/edge.ts`、`types/tb/ota.ts`（EdgeInfo/Edge/OtaPackageInfo/UpdateOtaPackageInfo 等），分页复用 `types/tb/page.ts`。

## 9. 测试范式增量（在 m12 notes §7 之上）

- 页面测试 mock 三件套不变（`@umijs/max` + service 模块 + pro-components async mock，先例 `pages/notifications/sent/index.test.tsx:32-55`）；scope 页测试先例 `pages/customers/devices/index.test.tsx`。
- **Upload 不必 mock antd**：`Upload.Dragger` 渲染真实 hidden `input[type=file]`，测试直接 `new File([...])` 塞进去触发 beforeUpload（先例 `pages/dashboards/list/index.test.tsx:362-375`，注释原文 "push a file into it"）。OTA 上传对话框测试照此，不整 jsdom 掐 Upload 的活。
- **blob 下载**：mock `components/shared/download-blob` 模块或 `URL.createObjectURL`；`download-blob.test.ts` 已有纯函数单测先例。
- **CodeEditor 替身**（m12 notes §7.1 已写 textarea 方案）：Edge 页面大概率用不到 CodeEditor；若 edge 详情出现 config/JSON 编辑再照 `pages/resources/js-library/list/index.test.tsx` 的做法。
- **EventsPanel 改造的连带**：参数化后 `components/devices/detail/EventsPanel.test.tsx` 与 `devices/detail/index.test.tsx` 的断言（deviceId → entityId 入参）必须同步，这是改共享件的回归面。
- e2e：`e2e/specs/smoke/` 现有 10 个 spec 无 edge/ota；真后端 seed 需要 Edge 实例（Edge PE 后端在本仓 fork 是否可用见裁决点 9）。

## 10. 落位建议目录树

```
ui-antd/src/types/tb/edge.ts                          # EdgeInfo/Edge/EdgeEventInfo…（手写权威）
ui-antd/src/types/tb/ota.ts                           # OtaPackageInfo/UpdateOtaPackageInfo…
ui-antd/src/types/tb/index.ts                         # + export * from './edge'; './ota'
ui-antd/src/services/tb/edge.ts                       # 列表/CRUD/子实体分配/sync/missingToRelated
ui-antd/src/services/tb/edge.endpoints.test.ts
ui-antd/src/services/tb/ota.ts                        # 列表/CRUD(multipart)/download(blob)/按 profile 查
ui-antd/src/services/tb/ota.endpoints.test.ts
ui-antd/src/services/tb/index.ts                      # 挂不挂见裁决点 6
ui-antd/src/pages/edges/list/{index.tsx,url-state.ts,index.test.tsx}
ui-antd/src/pages/edges/detail/{index.tsx,url-state.ts,index.test.tsx}   # Tab 壳 + buildTabItems
ui-antd/src/pages/edges/detail/scope-shell.tsx        # EdgeScopePageShell（仿 customers/scope-page-shell.tsx）
ui-antd/src/pages/edges/detail/{devices,assets,dashboards,entity-views,rule-chains}-tab.tsx  # 子实体作用域列表
ui-antd/src/pages/ota/packages/{index.tsx,url-state.ts,index.test.tsx}   # 视裁决点 1 也可 pages/edges/ota-packages/
ui-antd/src/components/edges/ota-package-dialog.tsx   # 上传/编辑对话框（仿 upload-image-dialog）
ui-antd/src/components/entities/detail/EventsPanel.tsx  # 小改造：entityId 参数化（或见裁决点 3）
ui-antd/src/locales/{en-US,zh-CN}/edge.ts + ota.ts    # + 两聚合文件 + menu.ts
config/routes.ts                                      # name:'edge' 组（§6 骨架）
```

## 11. 红线提醒（M13 特有，通用红线见 m12 notes 末节）

- **不改造五个 v1 列表页来“支持 Edge”**——它们没有注入缝，改造即重写；Edge 子实体走 `/api/edge/{edgeId}/...` 专属端点新页面。也别顺手把 `getTenantDevices` 等加 `edgeId` 参数（后端不吃）。
- **Edge 详情 tab 只挂激活面板**（`destroyOnHidden`），保 WS manager 10-cmd 预算（`detail-tabs.tsx` 头注 5-8 行明令 "never revert to pre-mounting"）。
- **改 `EventsPanel` 是动共享件**：devices 详情页与两组测试是回归面，一次 PR 内同步改完，不做兼容垫片。
- Edge 是 `canTenantAdmin` 域：路由别误用 `canTenantOrCustomer`；页面内 CU 不可达（无 read-only 面，与 devices 不同）。
- OTA 包文件是二进制：service 层 FormData 不要设 `Content-Type`（交给浏览器带 boundary）；download 走 blob 不走 `tbHttp.get` 的 JSON 解析。
- locale 双语 parity（`npm run check-locale`）、每个 `formatMessage` 带 `defaultMessage`、Biome/tsc 门禁照旧。

## 12. 裁决点（需要拍板）

1. **OTA 页挂哪**：独立顶级菜单（`/otaPackages`，贴近 ui-ngx 的 OTA 独立于 edge_management）还是并入 Edge 组（`/edges/ota-packages`）？取决于 M13 spec 对菜单组的定案与 scout-ngx-ota 的路由结论。
2. **OTA access**：TA-only（`canTenantAdmin`）还是 SA+TA？openapi/后端语义要对齐 scout-backend 结论后再定 routes 的 `access`。
3. **EventsPanel 改造 vs 复制**：参数化（加 `entityId`/`entityType` props，动共享件 + 两处测试）还是复制一份 Edge 专用面板（违反 Simplicity First 的单用复制嫌疑）？倾向参数化，但需确认 Edge 事件列集与 device 事件列集差异有多大。
4. **Edge 详情 tab 集合**：attributes/alarms/relations/audit-logs/version-control 直接挂共享面板；events 待定（裁决点 3）；ui-ngx edge-tabs 是否还有 edge events / sync status / credentials 专属 tab——以 scout-ngx-edge 的 tab 清单为准定 `buildTabItems` 内容与 `detail-tab-keys.ts` 是否扩 key。
5. **子实体页密度**：五个子实体 tab 全上（devices/assets/dashboards/entityViews/ruleChains）还是首波只做 spec 点名的子集？影响 `scope-shell` 抽象是否值得（≤2 个 tab 时内联 PageContainer 更省）。
6. **service index.ts 挂不挂**：`edge.ts`/`ota.ts` 是否加入 `services/tb/index.ts` 导出面？现状 events/image 等 5+ 个域文件游离在外（§1），Edge 新域建议挂（消费方统一走 `@/services/tb`），但要与仓内两种形态并存的现状达成一致。
7. **EdgeScopePageShell 抽象 vs 内联**：5 个子页共用外壳值得抽一个 `pages/edges/detail/scope-shell.tsx`；若首波子页少则每页内联 `PageContainer`。与裁决点 5 联动。
8. **OTA multipart 端点实测**：openapi 快照里 `POST /api/otaPackage` 的 requestBody 是否覆盖 file 字段、checksum 是否必填需真后端验证（快照仅 6 条较粗），`ota.endpoints.test.ts` 的断言以后端实测为准。
9. **e2e 可行性**：smoke spec 需要真后端能建 Edge 实例（PE 特性，fork 后端是否实现了 Edge REST 面）——seed 不可行时 Edge e2e 降级为单测覆盖，需在 M13 计划里明确。
