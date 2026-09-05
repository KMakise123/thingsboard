# M12 通知族实现范式清单（工作文档，agents 用）

> 由 scout-antd 盘点产出（2026-09-05）。实现者动手前必读；随 M12 收尾可归档或删除。

## 0. 结论速览

- 通知服务层与页面**尚不存在**：全仓搜 `notification` 只有 `src/core/ws/protocol.ts`（WS 命令已定义）与 `manager.ts` 里已实现好的 `subscribeUnreadNotificationCount()`。REST service、types、页面、locale、路由都要新建。
- 表单栈是 **antd Form，没有 react-hook-form**（package.json 无此依赖）。
- 测试栈是 **vitest + happy-dom + @testing-library/react**；e2e 是 **Playwright（真后端）**。

## 1. 硬规矩（ui-antd/CLAUDE.md；AGENTS.md 仅一行指向 CLAUDE.md）

文件：`ui-antd/CLAUDE.md`

- **Biome only**：无 ESLint/Prettier。`npm run lint` = `biome check && node scripts/check-locale.mjs && tsc --noEmit`，提交前必须过。
- **antd 组件先查 API**：写 antd 代码前 `npx antd info <Component>`（ui-antd/.claude/skills 有 `antd` skill 可用）。
- **颜色只用 antd token**；Tailwind 只做 layout/spacing（`className="flex w-64 gap-3"` 这类用法遍布页面）。
- **locale 双语 parity 是门禁**：zh-CN 加的每个 key 必须在 en-US 存在（`npm run check-locale`）。切换 locale 只走 `src/locales/set-locale.ts`。
- **TS strict**、Node ≥ 24、`package-lock.json`。
- **目录约定**（CLAUDE.md "Page Co-location"）：每个页面目录 `index.tsx` + 可选 `service.ts`、`data.d.ts`、style；页面私有代码留在页面目录。既有范式还包含 `url-state.ts`、`index.test.tsx`。
- 测试基线 `vitest.config.ts`：coverage 只对 `src/core/**`（lines 80/branches 70）和 `src/components/widgets/**`（85）设门禁，**页面/组件层不设阈值**，但既有页面均配 `index.test.tsx`。

## 2. 服务层范式（照抄 `resource.ts`）

参考文件：
- `ui-antd/src/services/tb/resource.ts`
- `ui-antd/src/services/tb/resource.endpoints.test.ts`
- `ui-antd/src/services/tb/http.ts`
- `ui-antd/src/services/tb/index.ts`
- 分页类型：`ui-antd/src/types/tb/page.ts`

规则（`services/tb/index.ts` 头注原文）：只导出函数+类型，无 hook/组件/缓存；**每个调用都走 `tbHttp`**（core/http 唯一出口缝）；每个函数 JSDoc 钉死 endpoint。

最小骨架（可直接照抄）：

```ts
import type { PageData, PageLink } from '@/types/tb/page';
import { pageLinkToQueryParams } from '@/types/tb/page';
import { tbHttp } from './http';

/** GET /api/notifications — PageData<Notification>. */
export async function getNotifications(
  pageLink: PageLink,
): Promise<PageData<TbNotification>> {
  return tbHttp.get<PageData<TbNotification>>(
    '/api/notifications',
    pageLinkToQueryParams(pageLink),
  );
}
```

- `tbHttp` 方法面：`get<T>(url, query?)` / `post<T>(url, body)` / `put<T>` / `delete<T>(url, query?)` / `request<T>(url, { method, responseType })`（blob 走 `request`，见 resource.ts `downloadResource`）。
- 类型放 `src/types/tb/<domain>.ts`（手写权威类型；openapi 快照仅参考，`npm run openapi:gen` 产物在 `src/types/tb/openapi/`）。
- 分页 wire 契约（`page.ts` 头注）：query `?pageSize=&page=&textSearch=&sortProperty=&sortOrder=ASC|DESC`，server page **0-based**，UI 1-based 在页面层转换；响应 `{ data, totalPages, totalElements, hasNext }`。
- index.ts 导出：加一行 `export * from './notification';`。

**endpoints.test.ts 测什么**（resource.endpoints.test.ts 范式）：

```ts
vi.mock('./http', () => ({
  tbHttp: { request: vi.fn(), get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
import { tbHttp } from './http';
const get = vi.mocked(tbHttp.get);

it('lists resources with the type/subType filters on /api/resource', async () => {
  await getResources(PAGE_LINK, { resourceType: ResourceType.JS_MODULE });
  expect(get).toHaveBeenCalledWith('/api/resource', {
    pageSize: 20, page: 0, textSearch: 'mod',
    sortProperty: 'createdTime', sortOrder: 'DESC',
    resourceType: 'JS_MODULE', resourceSubType: 'MODULE',
  });
});
```

即：mock `./http` 模块 → 断言**精确的 URL + 展平后的 query 对象**（`sortOrder` 变 `sortProperty/sortOrder`、`page` 0-based）、方法语义（POST/PUT body、multipart FormData、delete 的 `force` query）、错误分支。

## 3. 列表页范式（js-library 全家）

目录：`ui-antd/src/pages/resources/js-library/list/`
- `index.tsx`（页面，871 行）
- `url-state.ts`（URL 承载分页/排序/搜索/筛选）
- `js-content.ts`（页面私有纯函数）
- `index.test.tsx`

### 3.1 数据流：URL state → PageLink → useQuery

`url-state.ts` 提供：`parseXxxUrlState(search)` / `serializeXxxUrlState(state)` / `toPageLink(state)` / `useXxxUrlState()`（`history.replaceState` 写入 + `popstate` 重读；默认值不写入 URL）。页面用法：

```ts
const { state: urlState, patch } = useJsLibraryUrlState();
const JS_LIBRARY_QUERY_KEY = ['resources', 'js-library'] as const;

const resourcesQuery = useQuery({
  queryKey: [...JS_LIBRARY_QUERY_KEY, urlState.page, urlState.pageSize,
    urlState.sortProperty, urlState.sortDirection, urlState.textSearch, urlState.resourceSubType],
  queryFn: () => getResources(toPageLink(urlState), { resourceType: JS_MODULE }),
  placeholderData: keepPreviousData,
});
const invalidate = () => queryClient.invalidateQueries({ queryKey: JS_LIBRARY_QUERY_KEY });
```

搜索防抖 400ms（`SEARCH_DEBOUNCE_MS`）：受控 `Input.Search` + `setTimeout`，落定时 `patch({ textSearch, page: 1 })`。

### 3.2 ProTable 喂数（不用 `request` prop，用 `dataSource`）

```tsx
<ProTable<TbResourceInfo>
  rowKey={(record) => record.id.id}
  tableAlertRender={false} tableAlertOptionRender={false}
  columns={columns} dataSource={resources}
  loading={resourcesQuery.isPending} search={false} options={false}
  onChange={onTableChange}                      // 排序/翻页 → patch(urlState)
  pagination={{ current: urlState.page, pageSize: urlState.pageSize,
    total: resourcesQuery.data?.totalElements ?? 0, showSizeChanger: true,
    pageSizeOptions: [10, 20, 30, 50, 100], showTotal: ... }}
  rowSelection={{ selectedRowKeys, onChange, getCheckboxProps }}
/>
```

- 排序：列上 `sorter: true, sortOrder: sortOrderFor('createdTime')`；`SORTABLE_COLUMNS` 映射列 key→服务端属性；`onTableChange` 里 `patch({ sortProperty, sortDirection, page: 1 })`。
- 错误面：`resourcesQuery.isError` 时渲染 `<Alert type="error" ... description={serverErrorText(error)} />`（`@/components/entities/server-error-text`）。
- 外壳：`PageContainer`（`@/components/layout/page-container`，ADR 0008：title 可显式传 `formatMessage({id:'menu...'})`，面包屑由路由树重建；`extra` 放工具栏）。

### 3.3 工具栏/行操作组织

- 工具栏在 `PageContainer extra`：搜索框 + 筛选 Select + 刷新按钮 + `<div className="flex-1" />` + 右侧 `Space`（选中计数/批量删除 + 新增按钮）。
- 行操作：`valueType: 'option'` 列，`fixed: 'right'`，直接渲染 `<Button type="text" size="small" icon={...}/>`，多动作用 `Dropdown trigger={['click']} menu={{items:[...]}}`；无权限/不可编辑项返回 `null` 后 `.filter(Boolean)`。
- 删除确认：`modal.confirm({...})`，来自 `const { message, modal } = App.useApp()`（antd v6：`Alert` 用 `title`/`message` 属性而非 `message`/`description`——注意照抄现有写法）。

### 3.4 批量接线（useBatchRun + BatchProgressModal）

- `ui-antd/src/components/shared/use-batch-run.ts`：`const batch = useBatchRun()`；`const summary = await batch.run(items, (item)=>item.title, (item)=>deleteResource(item.id, true))` → `{ ok, failed, failures }`。
- `ui-antd/src/components/shared/BatchProgressModal.tsx`：`<BatchProgressModal open={batchOpen} state={batch.state} onClose={() => { setBatchOpen(false); batch.reset(); }} />`。
- js-library 的做法：先逐个普通 delete，被引用的收集进 ResourcesInUseModal，用户确认强删后：单项直接调用、多项走 `batch.run` + BatchProgressModal + 汇总 toast。

最小批量骨架：

```ts
const batch = useBatchRun();
const [batchOpen, setBatchOpen] = useState(false);
const runBatchDelete = async (items: Array<ResourceInUseItem>) => {
  setBatchOpen(true);
  const summary = await batch.run(items, (i) => i.title, (i) => deleteResource(i.id, true));
  setSelectedRowKeys([]); void invalidate();
  void message.success(formatMessage({ id: '...batchResult',
    defaultMessage: '{ok} succeeded, {fail} failed.' }, { ok: summary.ok, fail: summary.failed }));
};
```

## 4. 路由与菜单

### 4.1 routes.ts（M11 resources 段）

文件：`ui-antd/config/routes.ts`（381-440 行）。头注规矩：`access` 必须匹配 `src/access.ts` 的 key（`canSysAdmin`/`canTenantAdmin`/`canCustomerUser`/`canSysAdminOrTenantAdmin`/`canTenantOrCustomer`/`canAuthenticated`，见 `src/access.ts:21-42`）；菜单由该树过滤生成，绝不手写；子路由 `name` 相对 → 菜单 id 为 `menu.resources.<child>`。

```ts
{
  name: 'resources',
  icon: 'folder',
  path: '/resources',
  access: 'canSysAdminOrTenantAdmin',
  routes: [
    { path: '/resources', redirect: '/resources/widget-types' },
    { name: 'jsLibrary', path: '/resources/js-library', component: './resources/js-library/list' },
    { path: '/resources/widgets-bundles/:bundleId', component: '...', hideInMenu: true }, // 详情/隐藏页模式
  ],
},
```

通知族照此：`name: 'notifications', icon: 'bell', path: '/notifications'`（access 按 spec §4 定案），隐藏详情页用 `hideInMenu: true`。

### 4.2 菜单文案

- 侧边菜单 key 在 `ui-antd/src/locales/en-US/menu.ts` 与 `src/locales/zh-CN/menu.ts`：`'menu.resources.jsLibrary': 'JavaScript library',`。
- 页面文案域文件：`src/locales/en-US/resources/js-library.ts`（key 前缀 `pages.resources.jsLibrary.*`），zh-CN 侧镜像。

### 4.3 目录化语言包 + 聚合文件约定

`CONTEXT.md:19`（仓库根）：**聚合文件约定**——语言包目录化经手写聚合文件实现（聚合文件引入各域文件后合并导出），而非构建工具目录扫描。即：

1. 新建 `src/locales/en-US/notifications.ts` + `src/locales/zh-CN/notifications.ts`，各 `export default { 'pages.notifications...': '...' }`；
2. 在两个聚合文件 `ui-antd/src/locales/en-US.ts` / `src/locales/zh-CN.ts` 里手写 `import notifications from './en-US/notifications';` 并在 default 对象里加 `...notifications,`；
3. `npm run check-locale` 验证双端 parity。

组件内用法：`const { formatMessage } = useIntl(); formatMessage({ id: 'pages.notifications.x', defaultMessage: 'X' })`（每处都带 defaultMessage）。

## 5. 顶栏与 WS

### 5.1 顶栏挂载点

- 顶栏是 **ProLayout 运行时配置**，在 `ui-antd/src/app.tsx` 的 `export const layout`（131-190 行）。头部动作插槽是：

```ts
actionsRender: () => [<LangDropdown key="lang" />],   // app.tsx:144 ← 通知铃铛加在这里
avatarProps: { icon: <UserOutlined />, title: ..., render: (_, dom) => <AvatarDropdown>{dom}</AvatarDropdown> },
```

- `LangDropdown` 在 `src/components/RightContent/LangDropdown.tsx`（经 `src/components/RightContent/index.ts` 与 `src/components/index.ts` 桶导出）；下拉容器用 `../HeaderDropdown`。铃铛建议新建 `src/components/RightContent/NotificationBell.tsx` 并同样加入 `actionsRender` 数组。

### 5.2 WS manager 订阅 API

- 安装：`ui-antd/src/components/layout/ws-manager.ts`——`installAppWsManager(handler)` 由 app 层调用，把带统一 401 出口的 manager 设为默认；`resetWsManager()` 是登出路径。消费方一律取 `getDefaultWsManager()`（`src/core/ws/hooks.ts`）。
- React 绑定（`src/core/ws/hooks.ts`）：`useWsSubscription` = `useSyncExternalStore((l) => sub.subscribe(l), () => sub.getSnapshot())` + 卸载时 `sub.unsubscribe()`。
- **通知已预留**：`src/core/ws/manager.ts:347` `subscribeUnreadNotificationCount(): WsSubscription<number>`（实现见 962-974 行，cmd `{ type: WsCmdType.NOTIFICATIONS_COUNT }`）；`src/core/ws/protocol.ts` 已有 `NOTIFICATIONS`/`NOTIFICATIONS_COUNT`/`MARK_NOTIFICATIONS_AS_READ`/`MARK_ALL_NOTIFICATIONS_AS_READ`/`NOTIFICATIONS_UNSUBSCRIBE` 命令与 `UnreadSubCmd { type, limit, types? }`（193-198 行）。列表流（NOTIFICATIONS cmd）尚无 manager 方法，需要按 `subscribeAlarmData`（manager.ts:910）的样子加 `subscribeNotifications`。
- 既有消费方范式：`ui-antd/src/components/alarms/use-global-alarm-data.ts`——`manager.subscribeAlarmData({ query, seed })` 建 subscription（useMemo，输入为原始值 key），cleanup 里 unsubscribe，`subscription.subscribe(update)` 汇入本地 state（不要在 getSnapshot 里做合并，会产生新数组导致 React 循环），`seed` 用 REST 快照先渲染、首个 WS 快照整体替换。
- manager 红线（头注）：WS 数据只进订阅缓冲，**从不 `queryClient.setQueryData`**；回写缓存只能靠 mutation 后 invalidate。

## 6. 表单对话框范式（Modal + antd Form；无 react-hook-form）

两种组织方式都在 M11 里：

A. **内联 Modal+Form**（js-library/list/index.tsx:720-819）：`const [form] = Form.useForm<Values>()`；`Modal open confirmLoading={saving} onOk={() => void save()} onCancel={close}` 内嵌 `<Form form={form} layout="vertical">`；提交 `const values = await form.validateFields()`，try/catch 里 `void message.error(serverErrorText(error))`、成功 `message.success(...)` + `invalidate()`，`finally setSaving(false)`。

B. **独立对话框组件**（`pages/resources/widget-types/list/dialogs.tsx`）：props 为 `{ open, count/onImported, onClose, onExport }`；`useEffect(() => { if (open) { /* 重置本地 state */ } }, [open])`；`confirm` = `setBusy(true); try { await onExport(...); onClose(); } catch (cause) { setError(...) } finally { setBusy(false); }`；错误显示 `<Alert type="error" showIcon title={error} />`；加 `destroyOnHidden`、`data-testid`。

- 错误文本统一出口：`ui-antd/src/components/entities/server-error-text.ts`（`ServerErrorError` → `detail || titleKey`）。
- toast 一律 `App.useApp()` 的 `message`/`modal`（antd v6 静态方法禁用；`src/components/layout/antd-app-bridge.tsx` 负责把 App 上下文接进模块级消费方）。
- 文件上传：`Upload.Dragger` + `beforeUpload={() => false}`（不自动传）+ 受控 `fileList`，提交时取 `fileList[0].originFileObj` 走 service 的 FormData。

## 7. 测试范式

### 7.1 单测（vitest + happy-dom + RTL）

配置：`ui-antd/vitest.config.ts`（`environment: 'happy-dom'`，setup `./tests/setupTests.ts`，include `src/**/*.{test,spec}.{ts,tsx}`）。

页面测试范式（`pages/resources/js-library/list/index.test.tsx`）：
- intl：`createIntl({ locale: 'zh-CN', messages: { ...zhCommon, ...zhJsLibrary } })` + `RawIntlProvider`（只引页面对应的 zh-CN 域文件）。
- 服务在模块边界 mock：`const servicesMock = vi.hoisted(() => ({ getResources: vi.fn(), ... })); vi.mock('@/services/tb/resource', () => servicesMock);`——注意被页面 `instanceof` 分支的类要在 mock 里重建 class。
- pro-components 必须替身（头注：vite-node 解析不了 antd 无扩展名内部 locale 导入）：`vi.mock('@ant-design/pro-components')` 里用 antd `Table` 伪装 `ProTable`、`PageContainer` 透传 `{ extra, children }`。
- `vi.mock('@umijs/max', () => ({ useSelectedRoutes: () => [], useAppData: () => ({ clientRoutes: [] }) }))`；CodeEditor 换成 textarea 便于 fireEvent 输入。
- 断言面：渲染后 `screen.getByRole/getByText`（文案走 zh-CN locale 值）、service 调用参数、创建/删除流后 `waitFor` + invalidate/refetch 断言。
- 纯逻辑（url-state、转换函数）单独 `xxx.test.ts`，如 `alarms/url-state.test.ts`。

### 7.2 E2E（Playwright，真后端）

- 目录：`ui-antd/e2e/`——`global-setup.ts`（幂等 seed：三角色账号），`fixtures/{api,login}.ts`，`seed/seed.ts`，`backend/{start,stop}-backend.sh`。
- specs 组织：`e2e/specs/{crosscutting,smoke,visual}/NN-<domain>.spec.ts`。通知族先例**没有**；最接近的是 `e2e/specs/crosscutting/03-ws-reconnect.spec.ts`（真 WS）与 smoke 各域。
- 规范（`playwright.config.ts`）：`testDir: './e2e/specs'`，chromium 1600x900，`storageState: 'e2e/.auth/ta.json'` 按角色（ta/ca/su 三种，见 global-setup）；断言用 role/placeholder 正则同时匹配中英文（`/告警|Alarms/i`）；seed 数据命名如 `E2E_HIGH_TEMPERATURE`。

## 8. 通知族落位建议（按既有范式推导）

```
ui-antd/src/types/tb/notification.ts                    # 手写类型
ui-antd/src/services/tb/notification.ts                 # tbHttp 出口
ui-antd/src/services/tb/notification.endpoints.test.ts  # mock ./http 断 URL+query
ui-antd/src/services/tb/index.ts                        # + export * from './notification'
ui-antd/src/core/ws/manager.ts                          # + subscribeNotifications（照 subscribeAlarmData）
ui-antd/src/pages/notifications/list/{index.tsx,url-state.ts,index.test.tsx}
ui-antd/src/components/RightContent/NotificationBell.tsx # app.tsx actionsRender 挂载
ui-antd/src/locales/{en-US,zh-CN}/notifications.ts + 两个聚合文件 + menu.ts
config/routes.ts                                        # name:'notifications' 段
```

约定红线提醒：服务层不做缓存/hook；WS 数据不写 queryClient；每个 formatMessage 带 defaultMessage；zh/en key parity；Biome 通过；页面测试 mock pro-components 与 `@umijs/max`。
