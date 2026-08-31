# core / services 移交手册（Wave1 → Wave2）

面向 Wave2 页面工程师（auth-shell / devices 两岗）。这里只讲"怎么用"和"什么不能做";
设计依据在 ADR 0007、issue #7/#8 与 `docs/spec/v1-scope-and-acceptance.md`。

## 分层地图

```
页面/组件 (src/pages, Wave2 的地盘)
  │  react-query hooks(读写 REST)
  │  useSyncExternalStore hooks(读 WS)
  ▼
services/tb    纯传输函数(auth/device/attributes),无 hooks 无组件无缓存
  ▼
core/http      唯一发请求的出口(fetch 封装 + 401 单飞刷新 + 429 退避)
core/ws        多路复用 WS 订阅管理器(不碰 react-query cache)
core/auth      tokenStore(localStorage 四键,沿用 ui-ngx 键名)
core/query-client  QueryClient 工厂(4xx 不重试)
types/tb       手写权威 wire 类型(与 openapi 快照交叉核对)
```

## 使用禁忌(先读这个)

1. **只有 `core/http` 发请求。** 页面里禁止 `fetch`、禁止 `umi request`、禁止
   `ProTable` 的 `request` prop 直连 HTTP —— 一律走 `services/tb` 的函数。
   ProTable 用 `dataSource` + `useQuery` 的数据自己喂(分页参数见下)。
2. **WS 数据不进 react-query cache。** WS 订阅有自己的快照缓冲
   (`subscribe*` / `use*Subscription`),任何地方都不要把 WS 数据
   `setQueryData` 进缓存;反向通道只有 mutation 成功后的 invalidate。
3. **services/tb 只放传输层。** 不要往里加 hooks、组件、缓存或 UI 概念;
   页面状态归页面,react-query 归 app 层。
4. **双路径端点一律 V2**(`/api/tenant/deviceInfos` 而非 `/api/tenant/devices`);
   分页调用必须显式传 `sortOrder`(server 是 0 基页码,UI 1 基,页面层换算)。
5. **token 只经 tokenStore / services/tb auth 域。** 组件不要自己读
   localStorage 的 token 拼 header。
6. **错误统一是 `ServerError` 形状**(`ThingsboardErrorResponse` keyed,
   `titleKey` 直接当 i18n key 用)。不要在页面里再解构原始 response。

## core/http(client.ts / server-error.ts)

```ts
// 工厂(services/tb/http.ts 已建好单例 tbHttp,页面不需要自己建)
createTbHttpClient(options?: TbHttpClientOptions): TbHttpClient
createTokenRefresher(deps?): () => Promise<boolean>   // 独立单飞刷新器

interface TbHttpClient {
  request<T>(path, options?: RequestOptions): Promise<T>  // RequestOptions: method/body/query/headers/authExempt
  get<T>(path, query?: QueryParams): Promise<T>
  post<T>(path, body?, query?): Promise<T>
  put<T>(path, body?, query?): Promise<T>
  delete<T>(path, query?: QueryParams): Promise<T>
}
```

内置行为(不要在页面层重复实现):
- `Authorization: Bearer <jwt>` 自动注入;`Accept-Language` 每次 eval。
- 401 → `POST /api/auth/token` 单飞刷新 + 排队重放;`/api/auth/login`、
  `/api/auth/token`、`/api/noauth/**` 豁免(不带 bearer、不刷新、不递归)。
- 刷新失败 → 清 token + `onUnauthorized({source:'http'})` 一次(跳转登录归 app 层)。
- 429 → 全抖动退避重试(默认 3 次);10s 超时(AbortController)。
- `createTokenRefresher`:给 WS manager 的 `ensureToken` 用(ws/hooks.ts
  已接线),与 HTTP 客户端共享同一个刷新 flight;失败不做任何副作用。

```ts
// server-error.ts
interface ServerError { status: number; errorCode?: number; detail: string;
                        titleKey: string; timestamp?: number;
                        resetToken?: string }  // CREDENTIALS_EXPIRED(15)专用,跳改密流
ServerErrorError extends Error implements ServerError   // 抛出的就是这个;rawBody 挂原始 wire body
ThingsboardErrorCode                                     // 错误码常量表
titleKeyFor(status) / isCredentialsExpired(se)
```

登录返回 `errorCode 15` 时 `resetToken` 可直接用于
`resetPasswordByToken(token, newPassword)` 或跳
`resetExpiredPassword?resetToken=xxx`。

## core/auth(token-store.ts)

```ts
tokenStore.getToken() / getRefreshToken()
tokenStore.setTokens(jwt, refreshToken)
tokenStore.clear()
tokenStore.isTokenValid('jwt' | 'refresh')   // 本地 exp 校验
TOKEN_STORAGE_KEYS   // ui-ngx 兼容的 localStorage 四键
decodeJwt(token): TokenClaims | null
```

## core/query-client(query-client.ts)

```ts
createTbQueryClient({ onError?, defaultOptions? }): QueryClient
tbRetryPredicate(failureCount, error)  // 4xx 不重试,5xx/网络最多 2 次
```

`onError` 收到归一化的 `ServerError`,toast 展示归 UI 层。

## core/ws(manager.ts / hooks.ts / protocol.ts)

```ts
// manager(页面一般不直接碰,走 hooks)
createWsManager({ ensureToken, onUnauthorized?, onWsError?, ... }): WsManager
WsManager: subscribeAttributes / subscribeLatestTelemetry / subscribeEntityData
         / subscribeEntityCount / subscribeAlarmData / subscribeAlarmCount
         / subscribeAlarmStatus / subscribeUnreadNotificationCount / close

// React hooks(页面用这两个)
useAttributeSubscription({ entityId, scope?, keys?, seed? })
  : { data: AttributeData[]; status: WsStatus }
useLatestTelemetrySubscription({ entityId, keys?, timeWindowMs?, seed? })
  : { data: AttributeData[]; status: WsStatus }

getDefaultWsManager() / setDefaultWsManager(manager | null)  // 进程级单例
```

语义(决议 #7/#8):单 socket 多路复用;首帧 AUTH;重连 2s×2^n 封顶 60s、
上限 10 次、有生产消息即重置;零订阅 90s 关连接;出站每帧 ≤10 条 cmd;
AUTH 连败两次 → `onUnauthorized({source:'ws'})` 并废弃 manager。
`seed` 是 REST 快照种子,首个 WS 快照整体替换。

## services/tb(index.ts 汇出全部)

统一 `import { login, getTenantDevices, ... } from '@/services/tb'`。
`setTbLanguage(() => locale)` 在语言引导时重定向 Accept-Language;
`setTbUnauthorizedHandler((e) => { tokenStore.clear(); history.push(loginPath); })`
在组合根注册 HTTP 401 刷新失败的出口(每次失败的刷新 flight 恰好触发一次)。

### auth.ts

```ts
login(request: LoginRequest): Promise<LoginResponse>            // POST /api/auth/login(存 token)
logout(): Promise<void>                                          // POST /api/auth/logout(必清 token)
refreshToken(refreshToken: string): Promise<LoginResponse>       // POST /api/auth/token(手动用)
getCurrentUser(): Promise<User>                                  // GET  /api/auth/user
changePassword(currentPassword, newPassword): Promise<LoginResponse>  // 存新 token
requestPasswordReset(email)                                      // POST /api/noauth/resetPasswordByEmail
resetPasswordByToken(resetToken, password)                       // POST /api/noauth/resetPassword
activate(activateToken, password, sendActivationMail?): Promise<LoginResponse>  // POST /api/noauth/activate
getUserPasswordPolicy(): Promise<UserPasswordPolicy>             // GET  /api/noauth/userPasswordPolicy
```

### device.ts

```ts
getTenantDevices(pageLink, filter?): Promise<PageData<DeviceInfo>>       // GET /api/tenant/deviceInfos
getCustomerDevices(customerId, pageLink, filter?): Promise<PageData<DeviceInfo>>
getDeviceById(deviceId): Promise<Device>                                  // GET /api/device/{id}
getDeviceInfoById(deviceId): Promise<DeviceInfo>                          // GET /api/device/info/{id}
saveDevice(device, { accessToken? }): Promise<Device>                     // POST /api/device
saveDeviceWithCredentials(device, credentials): Promise<Device>          // POST /api/device-with-credentials
deleteDevice(deviceId) / deleteDevices(deviceIds[])                      // DELETE /api/device/{id}(批量=扇出)
findDevicesByQuery(query: DeviceSearchQuery): Promise<Device[]>          // POST /api/devices
findDeviceCountByQuery(query: DeviceSearchQuery): Promise<number>        // POST /api/entitiesQuery/count
getDeviceCredentials(deviceId): Promise<DeviceCredentials>               // GET /api/device/{id}/credentials
saveDeviceCredentials(credentials): Promise<DeviceCredentials>           // POST /api/device/credentials
assignDeviceToCustomer(customerId, deviceId): Promise<Device>            // POST /api/customer/{cid}/device/{id}
unassignDeviceFromCustomer(deviceId)                                     // DELETE /api/customer/device/{id}
assignDevicesToCustomer(customerId, ids[]) / unassignDevicesFromCustomer(ids[])  // 扇出
getDeviceTypes(): Promise<EntitySubtype[]>                               // GET /api/device/types
getDeviceProfiles(pageLink): Promise<PageData<DeviceProfileInfo>>        // GET /api/deviceProfileInfos
importDevices(request: BulkImportRequest): Promise<BulkImportResult>     // POST /api/device/bulk_import(JSON,file=CSV 文本)
getDeviceConnectivity(deviceId)                                          // GET /api/device-connectivity/{id}
```

`filter: { type?, deviceProfileId?, active? }`;`pageLink: { pageSize, page, textSearch?, sortOrder? }`。

### attributes.ts

```ts
getAttributes(entityId, scope?, keys?): Promise<AttributeData[]>   // GET .../values/attributes[/{scope}]
saveEntityAttributes(entityId, scope, attributes[])                 // POST .../{scope}(null 值自动拆成 DELETE)
deleteEntityAttributes(entityId, scope, keys[])                     // DELETE .../{scope}
getLatestTelemetry(entityId, keys?): Promise<TimeseriesData>        // GET .../values/timeseries(无区间)
getTimeseries(entityId, query: TimeseriesQuery): Promise<TimeseriesData>  // 同路径 + startTs/endTs
```

key 过滤统一用逗号分隔的 `keys` 查询参数(后端 `toKeysList` 只 split 这个,
别用可重复的 `key` 参数)。`TimeseriesQuery: { keys, startTs, endTs, limit?,
agg?, interval?, orderBy?, useStrictDataTypes? }`(limit 默认 100、agg 默认
NONE、orderBy 默认 DESC)。

### customer.ts(Wave2 增补)

```ts
getCustomers(pageLink): Promise<PageData<Customer>>   // GET /api/customers(指派选择器数据源)
```

## Wave2 接线待办(Wave1 未做、别等)

- `src/app.tsx` 里仍是脚手架的 `umiRequest` + `TEMP(auth wave)` 内联取
  current user —— 换成 `getCurrentUser()`(services/tb),登录态与
  `tokenStore` 对齐。
- composition root(app 入口)统一注册 `setTbUnauthorizedHandler`(跳登录)
  与 `setTbLanguage`;WS 的 `onUnauthorized` 与 HTTP 汇到同一个出口。
- react-query 的 `QueryClientProvider` 挂 `createTbQueryClient()` 的实例。

## 已知缺口(BCR 候选,别在前端绕)

- 设备批量删除/批量指派后端无专用端点,前端只能扇出(大列表会放大请求数)。
- `POST /api/entitiesQuery/count` 只认 `entityFilter`,`deviceTypes` 被忽略
  (count 与 find 用同一 query 对象时口径可能不一致)。
- CSV 导入 `BulkImportResult.errorsList` 只有字符串,没有行号定位。
