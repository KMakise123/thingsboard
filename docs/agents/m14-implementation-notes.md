# M14 实现范式手册（计算字段独立页 + VC 独立页 + settings 增量 + 密码策略页）

> 由 scout-antd 盘点产出（2026-09-06）。**只写 ui-antd 侧增量**：服务层/列表页/表单/测试的通用范式先读 `docs/agents/m12-implementation-notes.md`，M13 补充见 `docs/agents/m13-implementation-notes.md`（先读前两份）。所有结论亲自读源码核对，锚点为 file:line（相对 `ui-antd/`，另注明者除外）。随 M14 收尾可归档或删除。

## 0. 结论速览

- **settings 已有五页**（general / outgoing-mail / two-fa / oauth2 / audit-logs），保存链范式统一为「`SettingsCard` 外壳 + useQuery 快照 + `useMutation` + toast」；新增 tab 只需在 `config/routes.ts:444-480` 的 settings 组里加一个子路由 + 双语 `menu.settings.*` key + 域 locale + 页面目录，无需新 access key（组级 `canSysAdmin` 自动覆盖子路由）。
- **M12 给 M14 留的预留函数已确认**：`services/tb/notification.ts:151-202` 有 5 个已实现、零 UI 消费方的函数（notification settings ×4 + entitiesLimitIncrease ×1）。类型也已就位（`types/tb/notification.ts:711-733`）。
- **两处服务层缺口要新建**：① 密码策略走的是 **securitySettings** 端点（`GET/POST /api/admin/securitySettings`，openapi `types/tb/openapi/index.ts:5784-5805`），service 层完全没有，`UserPasswordPolicy` 类型已挂在 `services/tb/auth.ts:22-34`；② VC 仓库设置只有读函数 `getRepositorySettingsInfo`（`version-control.ts:136-140`），**没有 save**（端点 `POST /api/admin/repositorySettings` 在 openapi `:5812`）。
- **计算字段现状是「实体详情 tab 面板」**：`CalculatedFieldsPanel`（`components/entities/detail/CalculatedFieldsPanel.tsx`，457 行）只调 entity-scoped 端点 `getCalculatedFieldsByEntityId`。独立页需要的 **tenant 全量列表端点** `GET /api/calculatedFields` 在 openapi 已有（`types/tb/openapi/index.ts:11087`，操作定义 `:34523`，带 types/entityType/entities/textSearch 过滤 + `createdTime|name` 排序），service 函数要新建。
- **数组字段先例不用现造**：`components/tenant-profiles/TenantProfileQueues.tsx:58` 是全仓唯一的 `Form.List`（嵌套对象 + 条件子字段 BATCH batchSize），two-fa 页另有「索引路径数组」第二范式（`pages/settings/two-fa/index.tsx:479`）。
- **OTA 详情页就是「只读锁死 + 单字段可改」独立详情页的最新样板**（`pages/ota/packages/detail/index.tsx`，483 行）。

## 1. settings 现状与新增 tab 挂法

`src/pages/settings/` 现有五页（全部 SA-only，v1 交付）：

| 页面 | 文件 | 形态 | 保存链 |
| --- | --- | --- | --- |
| general | `pages/settings/general/index.tsx`（346 行） | **双 `SettingsCard`**（bucket `general` + bucket `connectivity`，各存各的） | 每卡独立 useQuery + Form + mutation（`:62-152`） |
| outgoing-mail | `pages/settings/outgoing-mail/index.tsx`（1004 行） | 单 `SettingsCard`，含 provider 预设、OAuth2 token 跳转、send-test-mail | `buildPayload` 把表单合并到快照上再整包 POST（`:234-248`）；密码不加 gate 不回传（`:243-246`） |
| two-fa | `pages/settings/two-fa/index.tsx`（639 行） | 单 `SettingsCard` + 纯函数转换层抽到 `./data.ts`（有独立 `data.test.ts`） | `onFinish` 用 `form.getFieldsValue(true)` 全量读（unmount 字段也在）再走 `toTwoFaSettingsPayload` **单次变换**（`:139-145`；注释警告二次变换会清空 providers） |
| oauth2 | `pages/settings/oauth2/index.tsx`（52 行） | **页内双 tab**（domains/clients），`?tab=` 用共享 `createDetailTabUrlState` 工厂（`:16-19`）；两个 tab 各自独立文件 `domains-tab.tsx`（465 行）/`clients-tab.tsx`（853 行），Table+Dialog+行内 Switch 即存 | 无 SettingsCard（列表型设置页） |
| audit-logs | `pages/settings/audit-logs/index.tsx`（448 行） | `PageContainer` + 服务端分页 `Table` + 全套 URL 过滤（actionTypes 多选/时间窗/搜索 400ms 防抖）+ 详情 Modal | 纯只读列表 |

**SettingsCard 外壳**（`components/settings/SettingsCard.tsx:25-60`）：props `title/loading/dirty/invalid/saving/onUndo/onSave`；底部 Undo/Save 按钮自己管禁用（`!dirty || invalid || loading || saving`）。**dirty 由页面持有**（Form `onValuesChange` 置位），undo = 把服务端快照 `setFieldsValue` 回去。

**保存链范式**（新 tab 照抄）：

```text
useQuery(['settings', '<key>']) → useEffect: snapshot 时 form.setFieldsValue(snapshot.jsonValue) + setDirty(false)
→ onValuesChange: setDirty(true)；onFieldsChange: allFields.some(f => f.errors.length) → setInvalid
→ useMutation: jsonValue = { ...snapshot.jsonValue, ...values }（整包带 key 回传）
→ onSuccess: message.success + setDirty(false) + refetch/setFieldsValue(saved)
→ onError: message.error(formatMessage({ id: 'pages.settings.common.saveFailed', ... }))
```

错误 toast key 全域共用 `pages.settings.common.saveFailed`（`locales/en-US/settings/index.ts:5`）；成功 toast 每页自己的 key。

**新增 tab 的挂法**（`config/routes.ts:444-480`）：

```ts
{
  name: 'securitySettings',          // 子 name 保持相对 → menu id 为 menu.settings.securitySettings
  path: '/settings/security-settings',
  component: './settings/security-settings',
},
```

- 组级已有 `{ path: '/settings', redirect: '/settings/general' }` 兜底；头注（`:450-452`）明令**父级不能放 redirect**（会把整棵子树渲染成 EmptyRoute 白页），redirect 只能作为第一个子项。
- 子路由不写 `access`，继承组级 `canSysAdmin`；若某 tab 角色不同（如 notification settings 是否开放 TA）必须写显式 access（见裁决点 2）。
- 同步动作清单：routes.ts 子路由 + `src/locales/{en-US,zh-CN}/menu.ts` 加 `menu.settings.<child>`（key-for-key）+ `src/locales/{en-US,zh-CN}/settings/index.ts` 加页面文案 + 页面目录 `pages/settings/<child>/index.tsx` + `index.test.tsx` + e2e 断言（`e2e/specs/smoke/sys-admin.spec.ts:72-81` 已有 settings 走查，可补 tab）。

**service 层**：settings 域传输层集中在 `services/tb/admin.ts`（`getAdminSettings<T>(key)`/`saveAdminSettings<T>(body)`，`:24-35`，key 是自由字符串 bucket）。**密码策略不走这个 bucket**——TB 把它放在 `SecuritySettings` 对象里（`passwordPolicy` 只是其中一个字段，同对象还有 `maxFailedLoginAttempts`/`userLockoutNotificationEmail`/`mobileSecretKeyLength`/三个 TTL，openapi `:19677-19700`），要新加一对 `getSecuritySettings`/`saveSecuritySettings` 到 `admin.ts`（见 §3 缺口表）。

## 2. 路由与 access

- **access key 全集 6 个**（`src/access.ts:20-27`）：`canSysAdmin` / `canTenantAdmin` / `canCustomerUser` / `canSysAdminOrTenantAdmin` / `canTenantOrCustomer` / `canAuthenticated`。M14 大概率**不用加新 key**：settings 增量全在 `canSysAdmin` 组内；CF/VC 独立页按 ui-ngx 归属用 `canTenantAdmin` 或 `canSysAdminOrTenantAdmin`（裁决点 3）。
- `config/routes.ts` 可选形态全景：
  1. **域平铺**（devices/assets/otaPackages…，`:88-101`、`:318-334`）：菜单项 + 隐藏详情路由作平铺兄弟；
  2. **菜单组**（settings `:444-480`、resources `:487-540`、notifications `:546-583`、edge `:341-407`）：父带 `routes` 数组 + 首子 redirect，子 name 相对嵌套出 `menu.<group>.<child>`；组级 access 是上限，子级可收紧（notifications 组 `canAuthenticated`、子页 `canSysAdminOrTenantAdmin`，`:550-581`）；
  3. **隐藏页**（`hideInMenu: true`，如 widgets editor `:146-164`、account 组 `:587-607`）。
- routes.ts 头注规矩（`:1-18`）：`access` 必须匹配 access.ts key；菜单由树过滤生成，绝不手写；文件保持 declarative，不 import 页面内部。
- **CF/VC 独立页的路由挂位是开放决策**（裁决点 3）：ui-ngx 参照与菜单归属由 scout-cf/scout-vc 结论定；技术上任一形态都能落——CF 若带「实体作用域过滤」更像一个平铺列表页（otaPackages 形态），VC 仓库设置若做成页面则可仿 settings 单卡或作为独立设置页挂 settings 组。

## 3. 服务层与类型层范式

`services/tb/` 现为 **27 个域文件对**（`xxx.ts` + `xxx.endpoints.test.ts`），index.ts 挂载面已扩到 16 个域（`services/tb/index.ts:13-29`：auth/asset/customer/dashboard/device/entity-view/rule-chain/user/widget-type/version-control/attributes/alarm-rules/calculated-fields/notification/edge/ota）。游离在外的仍有 events/image/resource/alarm/audit-log/admin/oauth2/two-fa/two-fa-account/tenant/tenant-profile/device-profile/asset-profile/relations/events 等——两种消费形态并存：挂载面走 `@/services/tb`，游离的直接 `import { x } from '@/services/tb/xxx'`（先例 `pages/settings/audit-logs/index.tsx:35` 直引 audit-log）。

**M12 留给 M14 的预留函数**（全部已实现、测试齐、**无 UI 消费方**，`grep` 全仓 .tsx 零命中）：

| 函数 | 位置 | 端点 | 语义 |
| --- | --- | --- | --- |
| `getNotificationSettings` | `notification.ts:174-176` | `GET /api/notification/settings` | 未配置时服务端答 `{ deliveryMethodsConfigs: {} }` |
| `saveNotificationSettings` | `notification.ts:164-171` | `POST /api/notification/settings` | SA/TA 渠道配置（Slack botToken 等） |
| `getAvailableDeliveryMethods` | `notification.ts:179-185` | `GET /api/notification/deliveryMethods` | 当前已配置渠道（发送向导已在用其数据流，但调用点也是零——见 §9） |
| `saveUserNotificationSettings` | `notification.ts:188-195` | `POST /api/notification/settings/user` | 每用户「通知类型 × 渠道」静音偏好 |
| `getUserNotificationSettings` | `notification.ts:198-202` | `GET /api/notification/settings/user` | 未设置默认全开 |
| `requestEntitiesLimitIncrease` | `notification.ts:151-157` | `POST /api/notification/entitiesLimitIncreaseRequest/{entityType}` | 租户申请提额（usage 页关联件，M14 之外） |

线型已就位：`NotificationSettings`（`types/tb/notification.ts:711-716`）、`UserNotificationSettings` + `NotificationPref`（`:718-733`，user 可静音的渠道限 WEB/EMAIL/SMS）。

**M14 需要新建的 service 函数（缺口表）**：

| 函数 | 端点（openapi 锚点） | 放哪 | 备注 |
| --- | --- | --- | --- |
| `getCalculatedFields`（tenant 全量） | `GET /api/calculatedFields`（`types/tb/openapi/index.ts:11087`，操作 `:34523`） | `calculated-fields.ts` | query：`types[]/entityType/entities[]/textSearch/sortProperty(createdTime|name)/sortOrder/name[]`，返回 `PageData<CalculatedFieldInfo>`；现文件只有 entity-scoped 的 `getCalculatedFieldsByEntityId`（`calculated-fields.ts:51`） |
| `getSecuritySettings` / `saveSecuritySettings` | `GET/POST /api/admin/securitySettings`（openapi `:5784-5805`） | `admin.ts` | `SecuritySettings` 手写权威类型可放 `types/tb/admin.ts`，字段复用 `services/tb/auth.ts:22-34` 的 `UserPasswordPolicy`（建议把该类型上移 types 层，见裁决点 6） |
| `saveRepositorySettings`（+ 可选 `checkAccess`） | `GET/POST /api/admin/repositorySettings`（openapi `:5812`；`/checkAccess` `:5846`） | `version-control.ts` | 读函数 `getRepositorySettingsInfo` 已在（`version-control.ts:136-140`）；`VersionControlPanel.tsx:13` 头注早写了「repository settings belong to the v2 settings pages」 |

**最新范式样板**：`ota.ts`（146 行，M13 wave-1）——头注钉端点+线型陷阱（`ota.ts:1-23`）、`pageLinkToQueryParams` 展开分页（`:43-46`）、multipart 不设 Content-Type（`:76-88`）、create-then-upload 带回滚的组合函数（`:102-121`）、blob 下载 `tbHttp.request(url, { responseType: 'blob' })`（`:138-145`）、消费者侧变体函数放别的域文件并头注互指（`:20-22`）。endpoints 测试范式：mock `./http` 断 URL+参数（`admin.endpoints.test.ts:8-16` mock 形状、`:32-42` 断言样例）。

**类型层**：`types/tb/` 手写权威 + `index.ts` 只 re-export 16 个核心域（`types/tb/index.ts`）；**admin/notification/oauth2/two-fa 的类型不在 index 导出面**，消费方直接 `import type { AdminSettings } from '@/types/tb/admin'`（先例 `pages/settings/general/index.tsx:32-37`）。分页统一 `types/tb/page.ts` 的 `PageData/PageLink + pageLinkToQueryParams`。

## 4. 列表页范式（CF/VC 独立页的骨架）

- **ProTable 手动喂数**是现行主流（不是 `request` prop）：页面私有 url-state + `useQuery` 直调 service + `dataSource`/`loading`/`pagination` 手动接。OTA 列表是最新样板（`pages/ota/packages/list/index.tsx:724-759`：`search={false} options={false}`、`tableAlertRender={false}`、分页 total 取 `query.data?.totalElements`、`showTotal` 走 i18n 插值）。
- **url-state 三种现成做法**：
  1. **`createListUrlState` 工厂**（`pages/customers/list-url-state.ts:35-133`）：纯分页/排序/搜索，无域筛选。消费方：customers 全家、dashboards、edges 全部子页、rule-chains（`grep` 17 处）。
  2. **页面私有平铺 url-state + 排序白名单**（`pages/ota/packages/list/url-state.ts`：`OTA_SORTABLE_COLUMNS` `:24-34` 白名单映射列 key → 服务端属性，hook `:121-148`）。**CF 页要 types/entityType 过滤时照这个抄**。
  3. **多筛选 url-state**（`pages/settings/audit-logs/url-state.ts:42-151`：数组 join 逗号进 URL + 时间戳对 + `AUDIT_SORT_PROPERTIES` 白名单元组）。
- **批量**：`useBatchRun`（`components/shared/use-batch-run.ts:30-79`，前端 fan-out + 逐条计数 + 失败收集）+ `BatchProgressModal`（`components/shared/BatchProgressModal.tsx:12-34`，进度条 + ok/failed 汇总）。接线先例 `pages/ota/packages/list/index.tsx`（batch delete）与 `pages/edges/devices/index.tsx`。
- **行动作/详情跳转**：OTA 列表 title 是链接进详情（`history.push('/otaPackages/'+id)`），删除走 `modal.confirm` 四行确认文案 + `serverErrorText(error)` 回显后端 400 原文（头注 `list/index.tsx:1-15`）。
- **页面级共享纯函数**放独立小文件（不进组件）：`pages/ota/packages/package-view.ts`（list/detail 共用的单元格截断/checksum 文案/下载门控）+ 单测；剪贴板 hook `use-ota-copy.ts`。CF 页若有同样跨视图文案逻辑照此落位。

## 5. 独立详情页与 tab 装配范式

- **独立详情页样板 = `pages/ota/packages/detail/index.tsx`（483 行）**：`PageContainer`（title/breadcrumbLabel/onBack 回列表/`extra` 动作区）+ `Card` + 单 Form。**只读锁死模式**：create-and-freeze 实体全部控件 `readOnly disabled`，仅 description 可改，保存把加载的实体**原样回传**只改 `additionalInfo.description`（`:118-150` 注释明说后端逐字段比对）；头按钮 Download/Delete/三个 copy（`:219-317`）。VC 独立页的「版本不可变、只改描述/开关」场景直接照抄。
- **tab 装配三件套**：
  - 工厂 `createDetailTabUrlState`（`components/entities/detail/url-state.ts:28-71`）——`?tab=` 读写，unknown 回默认；settings oauth2 页已直接用它（`pages/settings/oauth2/index.tsx:16-19`），**M14 settings 页若要多 tab 直接复用，不用新造**。
  - 注册表 `assembleDetailTabs`（`components/entities/detail/detail-tabs.tsx:46-57`）——`DetailTabEntry[]`（key/label/taOnly/render）过滤 CU，宿主页持 `destroyOnHidden`（头注 `:5-8` WS 10-cmd 预算红线）。
  - closed union `DETAIL_TAB_KEYS`（`detail-tab-keys.ts:8-18`）——已有 `calculated-fields`/`version-control` key，**独立页若不用实体详情壳可不扩**；每域常量文件先例 `pages/edges/detail/url-state.ts`（TA-only Set + CU fallback tab）。
- Edge 详情页是「TA 全量 / CU 收缩」tab 装配的实例（`pages/edges/detail/index.tsx:430` buildTabItems 调用、`:665-761` 定义、CU 分支裁 entries 数组）。

## 6. 表单范式

- **Dialog 表单**（列表页内新建/编辑）：OTA create dialog（`ota/packages/list/index.tsx:761-830` Modal+Form）、oauth2 client dialog（`oauth2/clients-tab.tsx`，853 行大表单）、CF 面板的 create/edit Modal（`CalculatedFieldsPanel.tsx:95-180`，create 只支持 SIMPLE：一个参数 key 下拉 + 表达式）。**独立页表单**：OTA detail（§5）。M14 的 CF 独立页建议「列表页 + 编辑 Dialog」（与实体详情面板行为一致），不必做详情页。
- **嵌套数组字段先例（两套）**：
  1. **`Form.List`（推荐，唯一现役用例）**：`components/tenant-profiles/TenantProfileQueues.tsx:58` `<Form.List name={['profileData','queueConfiguration']}>` + Collapse 卡片数组；嵌套对象字段路径 `[field.name,'submitStrategy','type']`；**条件子字段**用 `Form.Item noStyle shouldUpdate` 函数子渲染（BATCH 才出 batchSize，`:186-224`）；`add()` 带整包默认值（`:402-427`）；首卡不可删（`:72-85`）。queue submit strategies 需要的一切这里都有。
  2. **索引路径数组**：two-fa providers（`pages/settings/two-fa/index.tsx:479` `namePrefix = ['providers', index]` + `providers?.find(...)` 回填，`hidden` Form.Item 固定 providerType `:499-501`）。条数固定时更简单。
- **线型⇄表单形转换层**：复杂表单把纯函数抽 `data.ts` + `data.test.ts`（先例 `pages/settings/oauth2/data.ts`：`toClientFormValue`/`toClientPayload`/预设应用；`pages/settings/two-fa/data.ts`）。**two-fa 注释的血泪教训**（`two-fa/index.tsx:83-87`）：payload 变换只在 `onFinish` 做**一次**，二次幂等不成立的变换会把服务端配置清空。
- **测试范式（settings 族不用 pro-components mock）**：`pages/settings/general/index.test.tsx` 是模板——`createIntl(zh-CN, {...域locale})` + `RawIntlProvider`（`:17-21`）+ mock `@umijs/max`（`:32-37`）+ `vi.hoisted` service mock（`:26-30`）+ QueryClientProvider/App 包裹（`:48-61`）。含 ProTable 的页面才要第三件：把 `@ant-design/pro-components` 换成 antd Table 的替身（先例 `pages/notifications/sent/index.test.tsx:53-75`，注释解释 vite-node 解析不了 pro-components 的 ext 内部 locale import）。CJK 按钮「保 存」中间有空格的断言技巧见 `general/index.test.tsx:96-99`。

## 7. i18n

- 结构：`src/locales/{en-US,zh-CN}/` 域文件 + 手写聚合（`src/locales/en-US.ts` import + spread，umi 只扫顶层）。域文件两种形态并存：目录（`notifications/` + `notifications.ts` 聚合、`settings/index.ts`、`devices/list|detail`）与单文件（`edge.ts`/`ota.ts`）。**M14 增量落位**：settings 文案一律进已有的 `settings/index.ts`（现 en 255 行 / zh 238 行）；CF 独立页文案建议新单文件 `en-US/calculated-fields.ts` + `zh-CN/calculated-fields.ts`（或并入现有 devices 域——面板现在的 key 都挂在 `pages.devices.detail.cf*` 下，见裁决点 7）；聚合文件各加一行。
- **门禁**：`scripts/check-locale.mjs`（`npm run check-locale`，挂在 `npm run lint` 里，`package.json:11`）——两条规则：zh/en key 集合一致 + **同一 locale 内 key 不得在两个文件重复定义**（新增域文件时注意别和现有 key 撞）。
- menu key：新 tab 加 `menu.settings.<child>`（`en-US/menu.ts` 现有五个 settings 子键可对照）；独立页照 `menu.otaPackages`/`menu.otaPackages.detail` 的平铺 + detail 对写法。

## 8. 横切：硬规矩、测试与门禁

- **`ui-antd/CLAUDE.md` 硬规矩摘录**（全文 `ui-antd/CLAUDE.md`）：Biome only（`npm run lint` = `biome check && node scripts/check-locale.mjs && tsc --noEmit`，提交前必过）；写 antd 代码前 `npx antd info <Component>`（或 `antd` skill）；颜色只用 antd token，Tailwind 只做 layout/spacing；TS strict；`src/.umi` 自动生成（闹脾气删了重启）；TS 类型从 `@/types/tb` 或域文件直引。
- **测试栈**：vitest + happy-dom + testing-library，setupFiles `tests/setupTests.ts`（`vitest.config.ts`）；coverage 门禁只对 `src/core/**`（lines 80/branches 70）与 `src/components/widgets/**`（85），页面层不设阈值但**惯例每页配 `index.test.tsx`**。
- **mock 三件套**：① `@umijs/max`（`useSelectedRoutes`/`useAppData`/`history`，见 general test `:32-37`）② service 模块（`vi.hoisted` + `vi.mock('@/services/tb/xxx')`）③ 仅 ProTable 页面需要 pro-components→antd Table 替身（§6）。
- **lint/tsc/vitest 门禁命令**：`npm run lint` / `npm run tsc` / `npm run check-locale` / `npm run test`。**flaky 口径**（memory 结论）：全量 `npm run test` 本机每轮随机挂 1-3 个旧编辑器用例，隔离复跑绿即判 flake；**波次验收用目标目录跑法** `npx vitest run src/pages/settings src/services/tb` 这类定向命令，别拿全量绿当门禁。Biome 输出 error 行在 warnings 行之前，验收 grep `^Found` 防截尾漏看。
- e2e（Playwright 真后端）：`e2e/specs/smoke/sys-admin.spec.ts:72-81` 已有 `/settings` redirect 与 audit-logs 走查；新 tab 补同 spec。

## 9. M13 遗留与 M14 关联点

1. **发送向导「渠道未配置」提示待接设置页跳转**：`pages/notifications/sent/wizard.tsx:641-651`——不可用渠道渲染 `pages.notifications.sent.wizard.deliveryMethodNotConfigured`（"Delivery method is not configured. Contact your system administrator."）。M14 的 notification settings tab 落地后，此处应把死文案升级为跳 `/settings/<notification-settings>` 的链接（SA）或保留文案（TA/CU 视权限）。同文件 `:206` 附近的 `getAvailableDeliveryMethods` 消费是「拿数据不落 UI」的预留证据。
2. **`saveUserNotificationSettings`/`getUserNotificationSettings`**（§3 表）在 ui-ngx 属于用户个人通知偏好（account 面）；是否随 M14 settings tab 一起做、还是挂 `/account/security` 或新 `/account/notifications`，见裁决点 4。
3. **VC 面板与设置页的闭环**：`VersionControlPanel.tsx:13-14` 明说仓库设置属于 v2 settings pages，面板在未配置仓库时降级为提示。M14 建好 VC 设置页后，面板的降级提示文案应补跳转链接（同 wizard 模式）。
4. **devices CSV 导入可否复用为通用导入对话框**：`components/devices/DeviceImportModal.tsx`（4 步向导：选文件→配置+列映射→导入中→结果）与 `csv-import.ts` 解析器是 device 强耦合的——列类型集合 `DEVICE_COLUMN_TYPES`、绑定 `importDevices` 端点、且 fork 的 bulk_import 只吃 `file+mapping`（头注 `:1-11`）。**结论：组件本体不可直接 import 复用**；可复用的是 csv-import.ts 的 `parseCsv`/`CSV_DELIMITERS`/列草稿构建思路。若 M14 后要做 edge 模板/资产批量导入，抽 `components/shared/csv-import-dialog` 再说（本里程碑不预建）。
5. **CF 面板与独立页的关系**：独立页上线后，`CalculatedFieldsPanel`（实体详情 tab）保留不动（ui-ngx 双入口并存语义）；两边共用 service 函数与 locale 前缀的差异见裁决点 7。

## 10. 落位建议目录树

```
config/routes.ts                                   # settings 组加子路由（§1 骨架）；CF/VC 独立页挂位见裁决点 3
ui-antd/src/services/tb/admin.ts                   # + getSecuritySettings/saveSecuritySettings（§3）
ui-antd/src/services/tb/version-control.ts         # + saveRepositorySettings（+checkAccess 视需要）
ui-antd/src/services/tb/calculated-fields.ts       # + getCalculatedFields（tenant 全量，openapi :34523 参数）
ui-antd/src/services/tb/*.endpoints.test.ts        # 各自补端点断言
ui-antd/src/types/tb/admin.ts                      # + SecuritySettings（passwordPolicy 复用 auth.ts 的 UserPasswordPolicy）
ui-antd/src/pages/settings/security-settings/{index.tsx,index.test.tsx}      # 密码策略页（SettingsCard 单卡范式）
ui-antd/src/pages/settings/notification-settings/{index.tsx,index.test.tsx}  # notification settings tab（消费预留函数）
ui-antd/src/pages/calculated-fields/{list.tsx 或 index.tsx,url-state.ts,index.test.tsx}  # 独立 CF 页（裁决点 3）
ui-antd/src/pages/version-control/…                # VC 独立页（形态见裁决点 3）
ui-antd/src/locales/{en-US,zh-CN}/settings/index.ts # settings 增量文案（同文件追加）
ui-antd/src/locales/{en-US,zh-CN}/calculated-fields.ts  # 若 CF 独立页新建域文件（裁决点 7）
ui-antd/src/locales/{en-US,zh-CN}/menu.ts          # 新 menu key 双语同步
```

## 11. 裁决点（需要拍板）

1. **notification settings tab 的 access**：service JSDoc 说端点 SA/TA 都可调（`notification.ts:163`），但 settings 组是 `canSysAdmin`。做成 SA-only settings tab（照 ui-ngx system settings 归属），还是组内子路由显式放宽 TA？影响向导跳转链接的显隐逻辑（§9.1）。
2. **用户通知偏好（user notification settings）放哪**：随 M14 settings 页、挂 `/account/security`、还是新 `/account/notifications` 隐藏页（account 组形态 `routes.ts:587-607`）？
3. **CF/VC 独立页的菜单归属与形态**：CF 页平铺顶级（`/calculatedFields`，otaPackages 形态）还是入某组？VC 独立页是「版本仓库列表页」还是「仓库设置页」（后者可能直接归 settings 组）？等 scout-cf/scout-vc 的 ui-ngx 结论定 routes。
4. **CF 列表排序白名单**：openapi 只允许 `sortProperty: createdTime|name`（`:34545-34546`），url-state 白名单照此收口即可，勿加列。
5. **passwordPolicy 类型落位**：留在 `services/tb/auth.ts:22-34`（现役消费者 password-policy.tsx 从这 import）还是上移 `types/tb/admin.ts` 统一？倾向上移 + auth.ts re-export，避免双份。
6. **settings 新 tab 是否入 e2e**：sys-admin.spec 补断言成本低（§8），建议随 tab 一起交。
7. **CF 独立页 locale 前缀**：面板现有 key 挂 `pages.devices.detail.cf*`（`CalculatedFieldsPanel.tsx:121-124` 等处引用）；独立页新 key 用 `pages.calculatedFields.*` 新前缀（干净但要与面板 key 去重过 check-locale），还是继续复用 devices 前缀（省事但语义错位）？

## 12. 可复用件清单（直接 import 或照抄）

| 组件/工具 | 位置 | 复用方式 |
| --- | --- | --- |
| `SettingsCard` | `components/settings/SettingsCard.tsx:25-60` | **直接用**。所有「单桶设置」页的外壳 |
| settings 保存链范式 | `pages/settings/general/index.tsx:62-152` | **照抄**（快照回填/dirty/invalid/mutation merge/toast/refetch） |
| `createDetailTabUrlState` | `components/entities/detail/url-state.ts:28-71` | **直接用**。settings 页内 tab（oauth2 先例 `oauth2/index.tsx:16-19`） |
| `createListUrlState` 工厂 | `pages/customers/list-url-state.ts:35-133` | **直接用**（无域筛选的列表页） |
| OTA 页面私有 url-state + 排序白名单 | `pages/ota/packages/list/url-state.ts` | **仿写**（CF 页带 types/entityType 筛选时） |
| audit-logs 多筛选 url-state | `pages/settings/audit-logs/url-state.ts:42-151` | **仿写**（数组/时间戳进 URL 时） |
| `useBatchRun` + `BatchProgressModal` | `components/shared/use-batch-run.ts:30-79`、`BatchProgressModal.tsx:12-34` | **直接用**（批量删除/操作） |
| ProTable 手动喂数接线 | `pages/ota/packages/list/index.tsx:724-759` | **照抄** |
| OTA 详情页（只读锁死 + 单字段可改） | `pages/ota/packages/detail/index.tsx:118-150,337-450` | **照抄**（VC 详情类页面） |
| `assembleDetailTabs` + `DETAIL_TAB_KEYS` | `components/entities/detail/detail-tabs.tsx:46-57`、`detail-tab-keys.ts:8-18` | **直接用**（实体详情壳才需要；`calculated-fields`/`version-control` key 已在） |
| `TenantProfileQueues`（Form.List + 嵌套 + 条件子字段） | `components/tenant-profiles/TenantProfileQueues.tsx:58-226,402-427` | **范式样板**（queue submit strategies 唯一现役先例） |
| two-fa 索引路径数组 + data.ts 单次变换 | `pages/settings/two-fa/index.tsx:479-501,139-145`、`two-fa/data.ts` | **范式样板**（固定条数数组 + 线型转换层） |
| oauth2 data.ts 转换层 | `pages/settings/oauth2/data.ts`（+`data.test.ts`） | **范式样板**（wire⇄form 纯函数 + 往返测试） |
| `usePasswordPolicy`/`policyRequirements`/`PasswordPolicyPanel` | `pages/user/components/password-policy.tsx:28-97,200-263` | **直接用**（密码策略页的实时预览/校验规则可反向消费同一套 requirements） |
| `UserPasswordPolicy` 线型 | `services/tb/auth.ts:22-34` | 直接用（落位调整见裁决点 5） |
| notification settings 预留函数 ×4 + 类型 | `services/tb/notification.ts:151-202`、`types/tb/notification.ts:711-733` | **直接用**（零 UI 消费方，M14 就是它们的家） |
| `PageContainer` | `components/layout/page-container` | 直接用（`dirty`/`onBack`/`breadcrumbLabel` 用法见 OTA detail `:220-224`） |
| `serverErrorText` / `downloadBlob` / `useOtaCopy` 式剪贴板 hook | `components/entities/server-error-text.ts`、`components/shared/download-blob.ts`、`pages/ota/packages/use-ota-copy.ts` | 直接用/仿写 |
| `csv-import.ts` 解析器 | `components/devices/csv-import.ts` | **只借思路**，组件本体 device 强耦合不可复用（§9.4） |
| settings 页测试模板 | `pages/settings/general/index.test.tsx` | **照抄**（无 ProTable 两件套；ProTable 替身见 `pages/notifications/sent/index.test.tsx:53-75`） |
