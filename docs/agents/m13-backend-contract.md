# M13 后端 Edge / OTA API 契约盘点（工作文档，agents 用）

> 由 scout-backend 盘点产出（2026-09-06）。ui-antd 新建 edge + ota 服务层的对接依据；随 M13 收尾可归档或删除。体例同 `docs/agents/m12-backend-contract.md`。

后端基类：三个控制器均 `@RequestMapping("/api")`；返回实体自带 `id`（JSON 形如 `{entityType:"EDGE", id:"uuid"}`）与 `createdTime`（long 毫秒）。
分页统一 query 参数：`pageSize`(int, required) / `page`(int, required) / `textSearch` / `sortProperty` / `sortOrder`（`ASC`|`DESC`，其他值 400：`application/src/main/java/org/thingsboard/server/controller/BaseController.java:552-570`）。

**默认排序要点**：`sortProperty` 不传时排序为 **`id ASC`**（不是 createdTime！`common/data/src/main/java/org/thingsboard/server/common/data/page/PageLink.java:30-31`）。TB 的 id 是普通 UUID 无时序性，前端列表**必须显式传 `sortProperty=createdTime&sortOrder=DESC`** 才能拿到"最新的在前"；另外用户自定义排序若不含 id，会自动追加 `id ASC` 作次级排序（`PageLink.java:77-83`）。

Edge 功能总开关：`edges.enabled` 默认 `true`（`application/src/main/resources/thingsboard.yml:1620-1622`，env `EDGES_ENABLED`）。关闭时 sync / instructions / upgrade 端点抛 "Edges support disabled"。

## 1. 端点表

### EdgeController（`/api`，`application/src/main/java/org/thingsboard/server/controller/EdgeController.java`）

| 方法 | 路径 | 权限 | 参数 | 返回 | 锚点 |
|---|---|---|---|---|---|
| GET | `/api/edges/enabled` | SYS/TENANT/CUSTOMER | 无 | `boolean` | EdgeController.java:109-115 |
| GET | `/api/edge/{edgeId}` | TENANT/CUSTOMER | path edgeId | `Edge` | :117-126 |
| GET | `/api/edge/info/{edgeId}` | TENANT/CUSTOMER | path edgeId | `EdgeInfo` | :128-137 |
| POST | `/api/edge` | TENANT | body `Edge`（**必须自带 `routingKey`+`secret`**，服务端不生成；租户须已配置 edge template root rule chain，否则 DVE "Root edge rule chain is not available!"） | `Edge` | :139-168 |
| DELETE | `/api/edge/{edgeId}` | TENANT | path edgeId | void | :170-180 |
| GET | `/api/edges`（params `pageSize,page`） | TENANT | 分页5参（sortProperty 文档值：`createdTime,name,type,label,customerTitle`，**customerTitle 实际会 500**，见 §5） | `PageData<Edge>` | :182-200 |
| POST | `/api/customer/{customerId}/edge/{edgeId}` | TENANT | path customerId, edgeId | `Edge`（assign） | :202-217 |
| DELETE | `/api/customer/edge/{edgeId}` | TENANT | path edgeId（**注意：无 customerId 段**；未分配时 400 "Edge isn't assigned to any customer!"） | `Edge` | :219-234 |
| POST | `/api/customer/public/edge/{edgeId}` | TENANT | path edgeId（设为 public customer） | `Edge` | :236-248 |
| GET | `/api/tenant/edges`（params `pageSize,page`） | TENANT | 分页5参 + `type`（可选过滤） | `PageData<Edge>` | :250-275 |
| GET | `/api/tenant/edgeInfos` | TENANT | 分页5参 + `type`（sortProperty=customerTitle 可用） | `PageData<EdgeInfo>` | :277-302 |
| GET | `/api/tenant/edges`（params `edgeName`，Hidden） | TENANT | query edgeName | `Edge` | :304-310 |
| GET | `/api/tenant/edge` | TENANT | query `edgeName`（按名字精确查） | `Edge` | :312-320 |
| POST | `/api/edge/{edgeId}/{ruleChainId}/root` | TENANT | path edgeId, ruleChainId（设 edge 根规则链，异步下发） | `Edge` | :322-339 |
| GET | `/api/customer/{customerId}/edges` | TENANT/CUSTOMER | path customerId + 分页5参 + `type` | `PageData<Edge>` | :341-374 |
| GET | `/api/customer/{customerId}/edgeInfos` | TENANT/CUSTOMER | 同上 | `PageData<EdgeInfo>` | :376-409 |
| GET | `/api/edges`（params `edgeIds`，Hidden） | TENANT/CUSTOMER | query `edgeIds`（逗号分隔，可重复） | `List<Edge>` | :411-432 |
| GET | `/api/edges/list` | TENANT/CUSTOMER | 同上（同名端点的正式版） | `List<Edge>` | :434-442 |
| POST | `/api/edges` | TENANT/CUSTOMER | body `EdgeSearchQuery`（关系查询） | `List<Edge>`（逐条 ACL 过滤） | :444-467 |
| GET | `/api/edge/types` | TENANT/CUSTOMER | 无 | `List<EntitySubtype>`（租户内去重 type 列表） | :469-479 |
| POST | `/api/edge/sync/{edgeId}` | TENANT | path edgeId（触发云→边全量同步；`DeferredResult` 阻塞直到边端应答，成功 200 / 失败 500 带 error） | `ResponseEntity` | :481-508 |
| GET | `/api/edge/missingToRelatedRuleChains/{edgeId}` | TENANT | path edgeId | `String`（rule chain id JSON 数组文本） | :510-521 |
| POST | `/api/edge/bulk_import` | TENANT | body `BulkImportRequest`（CSV 导入，需先存在 edge template root rule chain） | `BulkImportResult<Edge>` | :523-535 |
| GET | `/api/edge/instructions/install/{edgeId}/{method}` | TENANT | path method ∈ `docker\|ubuntu\|centos` | `EdgeInstructions`（{instructions: markdown}） | :537-555 |
| GET | `/api/edge/instructions/upgrade/{edgeVersion}/{method}` | TENANT | path edgeVersion, method | `EdgeInstructions` | :557-571 |
| GET | `/api/edge/{edgeId}/upgrade/available` | TENANT | path edgeId | `boolean` | :573-588 |

**无 credentials 独立端点**：老版本 3.x 的 `/api/edge/{edgeId}/credentials` 已不存在，连接凭证并入 `Edge.routingKey`（username）+ `Edge.secret`（password）字段（`common/data/src/main/java/org/thingsboard/server/common/data/edge/Edge.java:57-61`）。改凭证 = 直接 PUT/POST `/api/edge` 更新这两个字段。

### Edge 关联实体的 assign/unassign 与 find（分布在各实体控制器）

assign/unassign 全部 TENANT 专属；find 列表 TENANT/CUSTOMER。共同语义：assign 后异步同步到边端（不等边端确认即返回实体）。

| 实体 | assign | unassign | find 列表 | 权限 | 锚点 |
|---|---|---|---|---|---|
| Device | POST `/api/edge/{edgeId}/device/{deviceId}` | DELETE 同路径 | GET `/api/edge/{edgeId}/devices`（`DeviceInfo`；参数：分页5参 + `type` 或 `deviceProfileId`（二选一）+ `active` + `startTime/endTime`） | TENANT；列表 TENANT/CUSTOMER | DeviceController.java:686-731, 733-776 |
| Asset | POST `/api/edge/{edgeId}/asset/{assetId}` | DELETE 同路径 | GET `/api/edge/{edgeId}/assets`（`Asset`；分页5参 + `type` + `startTime/endTime`） | TENANT；列表 TENANT/CUSTOMER | AssetController.java:426-469, 471-510 |
| EntityView | POST `/api/edge/{edgeId}/entityView/{entityViewId}` | DELETE 同路径 | GET `/api/edge/{edgeId}/entityViews`（`EntityView`；分页5参 + `type` + `startTime/endTime`；响应条数经逐条 READ 权限过滤但 totalElements 不过滤） | TENANT；列表 TENANT/CUSTOMER | EntityViewController.java:399-468 |
| Dashboard | POST `/api/edge/{edgeId}/dashboard/{dashboardId}` | DELETE 同路径 | GET `/api/edge/{edgeId}/dashboards`（`DashboardInfo`；分页5参，sortProperty ∈ `createdTime,title`；同样逐条过滤） | TENANT；列表 TENANT/CUSTOMER | DashboardController.java:541-609 |
| RuleChain | POST `/api/edge/{edgeId}/ruleChain/{ruleChainId}` | DELETE 同路径（仅 type=EDGE 的规则链可挂） | GET `/api/edge/{edgeId}/ruleChains`（`RuleChain`；分页5参，sortProperty ∈ `createdTime,name,root`） | TENANT（edge 侧校验 WRITE）；列表 TENANT | RuleChainController.java:466-529 |

### EdgeEventController（`/api`，`application/src/main/java/org/thingsboard/server/controller/EdgeEventController.java`）

| 方法 | 路径 | 权限 | 参数 | 返回 | 锚点 |
|---|---|---|---|---|---|
| GET | `/api/edge/{edgeId}/events` | TENANT | path edgeId；`pageSize,page`（required）；`textSearch`（**按 edge event type 名**模糊匹配）；`sortProperty/sortOrder`（**实际被忽略**，见 §5）；`startTime/endTime`（long 毫秒，含边界） | `PageData<EdgeEvent>` | EdgeEventController.java:57-85 |

服务端固定追加条件 `seqId > 0`（controller :84 传 `seqIdStart=0, seqIdEnd=null`）。edge events 存分区表，有 TTL 清理（`application/src/main/java/org/thingsboard/server/service/ttl/EdgeEventsCleanUpService.java:35`），历史数据可能被清掉。

### OtaPackageController（`/api`，`application/src/main/java/org/thingsboard/server/controller/OtaPackageController.java`）

所有数据 tenant 维度；CUSTOMER_USER 仅有 3 个读端点（info / 列表×2），**无下载权限**。

| 方法 | 路径 | 权限 | 参数 | 返回 | 锚点 |
|---|---|---|---|---|---|
| GET | `/api/otaPackage/{otaPackageId}/download` | TENANT | path otaPackageId | 二进制文件流（`Content-Disposition: attachment` + `x-filename` 头）；**URL 型包（hasUrl 且有 url）直接 400** | OtaPackageController.java:80-100 |
| GET | `/api/otaPackage/info/{otaPackageId}` | TENANT/CUSTOMER | path otaPackageId | `OtaPackageInfo`（无 data） | :102-112 |
| GET | `/api/otaPackage/{otaPackageId}` | TENANT | path otaPackageId | `OtaPackage`（Info + data 字段；data 是否进 JSON 见 §7 裁决点） | :114-124 |
| POST | `/api/otaPackage` | TENANT | body `SaveOtaPackageInfoRequest`（`usesUrl:true`→URL 型须带 `url`；否则为"空壳"，后续再传文件） | `OtaPackageInfo` | :126-140 |
| POST | `/api/otaPackage/{otaPackageId}` | TENANT | **multipart/form-data**：`file`（RequestPart 必填）；`checksumAlgorithm`（**必填**，query 或 form 字段；枚举见 §2）；`checksum`（可选，缺省服务端按算法现算） | `OtaPackageInfo`（fileName/contentType/dataSize/checksum 回填） | :142-163 |
| GET | `/api/otaPackages` | TENANT/CUSTOMER | 分页5参（sortProperty 文档值：`createdTime,type,title,version,tag,url,fileName,dataSize,checksum`；textSearch 按 **title**） | `PageData<OtaPackageInfo>` | :165-182 |
| GET | `/api/otaPackages/{deviceProfileId}/{type}` | TENANT/CUSTOMER | path deviceProfileId + type（`FIRMWARE\|SOFTWARE`）+ 分页5参；**只返回 hasData=true 的包**（分配给 device profile 前的可选池） | `PageData<OtaPackageInfo>` | :184-208 |
| DELETE | `/api/otaPackage/{otaPackageId}` | TENANT | path otaPackageId；**被 device / device profile 引用时 400**（见 §5） | void | :210-221 |

删除校验、title+version 唯一、更新禁改字段等细节见 §5。

## 2. DTO 字段清单

### Edge（`common/data/src/main/java/org/thingsboard/server/common/data/edge/Edge.java`）extends BaseDataWithAdditionalInfo
`tenantId, customerId, rootRuleChainId, name`(必填, ≤255), `type`(必填), `label`, `routingKey`(必填, 即连接用户名), `secret`(必填, 即连接密码), `version`(Long, VCS 用), `additionalInfo: JsonNode`（常用 `{description}`）+ 继承 `id, createdTime`

### EdgeInfo（`EdgeInfo.java`）= Edge + `customerTitle: String`, `customerIsPublic: boolean`（由 customer 的 additionalInfo.isPublic 推导，`dao/src/main/java/org/thingsboard/server/dao/model/sql/EdgeInfoEntity.java:42-52`）
**EdgeCredentials 类已不存在**（并入 Edge 实体，见 §1）。

### EdgeEvent（`EdgeEvent.java`）extends BaseData
`seqId: long`（全局递增，事件主排序键）, `tenantId, edgeId, action: EdgeEventActionType, entityId: UUID, uid: String, type: EdgeEventType, body: JsonNode`

**EdgeEventActionType**（`EdgeEventActionType.java`）：`ADDED, UPDATED, DELETED, POST_ATTRIBUTES, ATTRIBUTES_UPDATED, ATTRIBUTES_DELETED, TIMESERIES_UPDATED, CREDENTIALS_UPDATED, ASSIGNED_TO_CUSTOMER, UNASSIGNED_FROM_CUSTOMER, RELATION_ADD_OR_UPDATE, RELATION_DELETED, RPC_CALL, ALARM_ACK, ALARM_CLEAR, ALARM_DELETE, ALARM_ASSIGNED, ALARM_UNASSIGNED, ADDED_COMMENT, UPDATED_COMMENT, DELETED_COMMENT, ASSIGNED_TO_EDGE, UNASSIGNED_FROM_EDGE, CREDENTIALS_REQUEST(废弃), ENTITY_MERGE_REQUEST(废弃)`

**EdgeEventType**（`EdgeEventType.java`，32 值）：`DASHBOARD, ASSET, DEVICE, DEVICE_PROFILE, ASSET_PROFILE, ENTITY_VIEW, ALARM, ALARM_COMMENT, RULE_CHAIN, RULE_CHAIN_METADATA, EDGE, USER, CUSTOMER, RELATION, TENANT, TENANT_PROFILE, WIDGETS_BUNDLE, WIDGET_TYPE, ADMIN_SETTINGS, OTA_PACKAGE, QUEUE, NOTIFICATION_RULE, NOTIFICATION_TARGET, NOTIFICATION_TEMPLATE, TB_RESOURCE, OAUTH2_CLIENT, DOMAIN, CALCULATED_FIELD, AI_MODEL, API_KEY`

### EdgeInstructions（`EdgeInstructions.java`）
`instructions: String`（markdown 全文，单字段）

### EdgeSearchQuery（`EdgeSearchQuery.java`，POST `/api/edges` 的 body）
`parameters: RelationsSearchParameters`（rootId/rootType/direction/maxLevel 等）, `relationType: String`（缺省 `Contains`）, `edgeTypes: List<String>`

### OtaPackageInfo（`common/data/src/main/java/org/thingsboard/server/common/data/OtaPackageInfo.java`）extends BaseDataWithAdditionalInfo
`tenantId, deviceProfileId, type: FIRMWARE|SOFTWARE, title`(必填≤255), `version`(必填≤255), `tag`, `url`, `hasData: boolean`(只读计算列：data 或 url 存在即 true), `fileName`(只读), `contentType`(只读), `checksumAlgorithm`, `checksum`(≤1020), `dataSize: Long`, `externalId`, `additionalInfo: JsonNode`（`{description}`）+ `id, createdTime`；`name` getter 即 title

### OtaPackage（`OtaPackage.java`）= OtaPackageInfo + `data: ByteBuffer`(transient)
### SaveOtaPackageInfoRequest（`SaveOtaPackageInfoRequest.java`）= OtaPackageInfo + `usesUrl: boolean`（创建/更新 `/api/otaPackage` 的请求体）

### 枚举
- `ChecksumAlgorithm`（`common/data/src/main/java/org/thingsboard/server/common/data/ota/ChecksumAlgorithm.java`）：`MD5, SHA256, SHA384, SHA512, CRC32, MURMUR3_32, MURMUR3_128`
- `OtaPackageType`（`ota/OtaPackageType.java`）：`FIRMWARE("fw"), SOFTWARE("sw")`

## 3. 服务层行为差异

- **Edge 列表排序**：dao 层 `findEdgesByTenantId` 无任何默认 createdTime 处理，透传 PageLink（`dao/src/main/java/org/thingsboard/server/dao/edge/EdgeServiceImpl.java:295-300`）。真正排序在 Spring Data pageable：无 sortProperty → `id ASC`（PageLink.java:30-31）；**EdgeInfo 系列查询带 `customerTitle→c.title` 列映射**（`dao/src/main/java/org/thingsboard/server/dao/model/sql/EdgeInfoEntity.java:30-33`，JpaEdgeDao.java:141-183 传 `EdgeInfoEntity.edgeInfoColumnMap`），**Edge（非 Info）系列查询无映射**（JpaEdgeDao.java:84-138 直接 `DaoUtil.toPageable(pageLink)`）。
- **EdgeEvent 查询**：controller 传 `seqIdStart=0`；排序由 `SORT_ORDERS=[seqId]` 硬编码（`dao/src/main/java/org/thingsboard/server/dao/sql/edge/JpaBaseEdgeEventDao.java:61, 175-187` + `dao/src/main/java/org/thingsboard/server/dao/DaoUtil.java:85-98`），最终 `ORDER BY seqId ASC, id ASC`——前端的 `sortProperty/sortOrder` 完全无效。textSearch 过滤 `edgeEventType` 列（`EdgeEventRepository.java:37`）。
- **OTA 删除校验**：无引用预检查，直接删、靠 PG 外键失败后翻查约束名（`dao/src/main/java/org/thingsboard/server/dao/ota/BaseOtaPackageService.java:195-218`）：
  - `fk_firmware_device` → "The otaPackage referenced by the devices cannot be deleted!"
  - `fk_firmware_device_profile` → "...referenced by the device profile..."
  - `fk_software_device` / `fk_software_device_profile` → "The software referenced by..."
  删除时顺带清理 PG large object（`getDataOidById`/`unlinkLargeObject` :220-242，失败仅 warn 不阻断）。
- **OTA 保存校验**（`dao/src/main/java/org/thingsboard/server/dao/service/validator/BaseOtaPackageDataValidator.java`）：
  - 创建必填：`title, version, type`；`deviceProfileId` 如给必须存在（:43-76）
  - **更新禁改**：`type/title/version/tag/deviceProfileId/fileName/contentType/checksum/checksumAlgorithm/dataSize` 全部禁止修改；`url` 一旦有值也禁改（`validateUpdate` :78-121）→ **前端编辑表单只允许改 description(additionalInfo)**，其余字段创建即定型
  - 唯一性：tenant 内 `title+version`（DB 约束 `ota_package_tenant_title_version_unq_key`，`BaseOtaPackageService.java:96-99`）
  - `usesUrl=true` 时 `url` 必填（:79-81）
- **OTA 上传数据**：`checksum` 缺省时服务端按 `checksumAlgorithm` 现算（`application/src/main/java/org/thingsboard/server/service/entitiy/ota/DefaultTbOtaPackageService.java:71-73`）；`checksumAlgorithm` 是必填参数（controller :152，无 `required=false`）。
- **Edge 创建链路**：POST `/api/edge` → 服务端若无 id 且未指定 rootRuleChainId 自动挂 edge template root rule chain，并把默认规则链一并 assign（`application/src/main/java/org/thingsboard/server/service/entitiy/edge/DefaultTbEdgeService.java:45-58`）；`routingKey/secret` 服务端不生成，必须前端传（`dao/src/main/java/org/thingsboard/server/dao/service/validator/EdgeDataValidator.java:56-61`）；name 租户内唯一，撞名 → "Edge with such name already exists!"（`dao/src/main/java/org/thingsboard/server/dao/edge/EdgeServiceImpl.java:224-228`）。

## 4. 权限矩阵

| 能力 | SYS_ADMIN | TENANT_ADMIN | CUSTOMER_USER |
|---|---|---|---|
| edge 是否启用探测 `/edges/enabled` | ✓ | ✓ | ✓ |
| Edge 读（`/edge/{id}`, `/edge/info/{id}`） | ✗ | ✓ | ✓（仅分配给本 customer 的） |
| Edge 增/删/改（POST/DELETE `/edge`） | ✗ | ✓ | ✗ |
| Edge 列表（tenant 维度 ×2、customer 维度 ×2、ids、types） | ✗ | ✓ | 列表部分 ✓（仅 customer 维度与 ids/types） |
| customer assign/unassign/public | ✗ | ✓ | ✗ |
| root rule chain / sync / missingToRelated / bulk_import | ✗ | ✓ | ✗ |
| install/upgrade instructions、upgrade available | ✗ | ✓ | ✗ |
| 关联实体 assign/unassign（device/asset/ev/dashboard/rulechain） | ✗ | ✓ | ✗ |
| 关联实体 find 列表 | ✗ | ✓ | ✓（device/asset/ev/dashboard；ruleChains 列表仅 TENANT） |
| edge events | ✗ | ✓ | ✗ |
| OTA info/列表/按 profile 列表（读） | ✗ | ✓ | ✓ |
| OTA 完整 get / download / save / saveData / delete | ✗ | ✓ | ✗ |

注：CUSTOMER_USER 的 Edge/OTA 读走 `checkEntityId` + ACL（BaseController.java:667-681），实体仍属 tenant；customer 视角能读到分配给其 customer 的 edge。

## 5. 已知坑（前端易踩）

1. **默认排序不是 createdTime**：所有列表端点 `sortProperty` 缺省时按 `id ASC`（PageLink.java:30-31），翻页顺序近乎随机。服务层必须显式传 `createdTime`。
2. **M12 同型 500 坑（customerTitle）**：`/api/edges`、`/api/tenant/edges`、`/api/customer/{id}/edges` 三个返回 `Edge` 的端点，swagger 允许 `sortProperty=customerTitle`，但 DAO 未配列映射（JpaEdgeDao.java:84-138），Hibernate 解析 `customerTitle` 属性失败大概率 500。**规避：列表一律用 `edgeInfos` 端点**（`/api/tenant/edgeInfos`、`/api/customer/{id}/edgeInfos`），其 `customerTitle` 有映射。是否真 500 待实测（§7-1）。
3. **edge events 的排序参数无效**：`sortProperty/sortOrder` 被 `SORT_ORDERS=[seqId]` 覆盖，恒为 `seqId ASC`；传 DESC 不会报错但也不生效。事件页若要"新的在前"只能在客户端倒排，或用 `startTime/endTime` 窗口倒序遍历。`textSearch` 匹配的是事件 type 名（如 "DEVICE"），不是实体名。
4. **OTA 创建即定型**：type/title/version/tag/deviceProfileId 等更新时全部禁改（BaseOtaPackageDataValidator.java:78-121），编辑弹窗若照抄创建表单会整表 400。且各错误是英文 DataValidationException，前端需按消息前缀转译。
5. **OTA 删除 400 而非 409**：被 device/device profile 引用时抛 DataValidationException（HTTP 状态映射 400），消息英文（§3）。删除前最好先查引用（`isOtaPackageUsed` 是 DAO 内部方法，**无独立 REST 端点**，前端只能试删或按 device profile 详情判断）。
6. **OTA download 对 URL 型包 400**：`hasUrl()` 为 true 直接 `ResponseEntity.badRequest()`（OtaPackageController.java:89-91），前端需按 `url` 字段分流（外链新开窗口 vs blob 下载）。
7. **checksumAlgorithm 大小写**：`ChecksumAlgorithm.valueOf(checksumAlgorithmStr.toUpperCase())`（:159），传小写 `sha256` 也能过；但传枚举外的值 500（IllegalArgumentException 未转 400）。
8. **Edge 创建必须自带 routingKey/secret**：后端不生成。ui-antd 表单需在"添加 Edge"时自动生成随机值（上游 UI 用 `guid` 风格随机串）并允许用户改。
9. **unassign customer 无 customerId**：`DELETE /api/customer/edge/{edgeId}` 只带 edgeId（区别于 assign 的双 id 路径）；对未分配 edge 调用得 400。
10. **assign 类操作是异步语义**：返回实体仅代表云端落库成功，边端是否收到要看 edge events（ASSIGNED_TO_EDGE）或 sync。

## 6. fork 本土化改动检查

- `git log --follow` 三个控制器（EdgeController / EdgeEventController / OtaPackageController）：全部提交来自上游 ThingsBoard 作者（dashevchenko、Viacheslav Klimov、Andrii Landiak 等），最新为上游 4.3/4.4 线同步（d6b73d5f8f "Port API improvements from 4.4 to 4.3"、b1051c09dc "unified api method names"）。**fork 作者（俊壕 何/HJH）对这三个控制器及 `dao/ota`、`dao/edge` 无任何本土化提交**（`git log --author` 检查为空）。
- `BaseOtaPackageService` 的 large object 清理（getDataOidById/unlinkLargeObject）是**上游官方修复**（97d68dda90 "Ota package unlink data object"，2026-01-28），非 fork 补丁。
- 结论：**无本土化补丁需登记**；但注意本 fork 基于 4.x 线，与网上 3.x 文档有代差——最大代差即 credentials 并入 Edge 实体、独立 credentials 端点已删。

## 7. 裁决点

1. **customerTitle 排序在 Edge（非 Info）端点是否 500**：静态分析判定 Hibernate 属性解析失败 → 500；需实测 `/api/tenant/edges?sortProperty=customerTitle` 确认。规避方案已给（用 edgeInfos）。
2. **GET `/api/otaPackage/{id}` 响应是否内嵌 base64 data**：`data` 是 `transient ByteBuffer` + Lombok `@Data` getter，Jackson 默认（PROPAGATE_TRANSIENT_MARKER=false）会序列化 getter → 大文件 base64 全量回传；需实测确认，影响详情页是否敢用该端点（用 `/otaPackage/info/{id}` 更稳）。
3. **CUSTOMER_USER 读 OTA 的实际可达性**：注解放行了，但 `checkEntityId`→ACL 对 `OTA_PACKAGE` 资源的 customer READ 规则未逐一验证；若 M13 OTA 页只做 tenant admin 视图可忽略。
4. **edge secret 对 CUSTOMER_USER 的暴露**：`/api/edge/{id}` 对 customer 用户原样返回 `routingKey/secret`（无脱敏代码）。是否前端隐藏/产品要求脱敏，需拍板。
5. **edge events 分页交互**：固定 seqId ASC + TTL 清理 → "倒序 + 翻到旧页"体验需前端设计裁决（客户端倒排 vs 时间窗口查询）。
6. **bulk_import 是否纳入 M13**：端点存在（POST `/api/edge/bulk_import`），CSV `columnMapping` 结构未盘点；M13 若不做导入则维持。
7. **sync 端点的超时语义**：DeferredResult 无显式 timeout 参数，边端离线时悬挂时长未验证；前端需要 loading + 自定义超时兜底。
8. **OTA tag 的写入时机**：schema 标 READ_ONLY 但创建请求实际可写（创建后禁改）；前端只在创建表单暴露 tag，需确认。

---
## 8. 本机可验证性（只读结论）

- Edge/OTA 全部为 tenant 内 CRUD + 文件上传下载，**无外部依赖**，本机 run-tb-backend 即可端到端验证；唯一前置：tenant 需存在 edge template root rule chain（系统初始化数据自带 EdgeRootRuleChain）。
- edge sync / instructions 的真实下发需 edge 实例连接，本机可验证 instructions 文案与 upgrade/available 的 false 路径。
- OTA 上传走 multipart，可直接 curl/前端构造 FormData 验证；download 与 checksum 回读可闭环。
