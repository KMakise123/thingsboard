# M13 专家小队裁决：后端契约与正确性镜头（panel-contract）

> 由 panel-contract 产出（2026-09-06）。输入：`m13-ngx-inventory-edge.md` §11、`m13-ngx-inventory-ota.md` §9、`m13-backend-contract.md` §7、`m13-implementation-notes.md` §12 四份工作文档的裁决点收拢去重（31 条原始裁决点 → 25 条），逐条按后端契约与正确性镜头复验后裁决。裁决准则沿 fork 铁律：**等价为底线、允许增量增强、禁止删减 TB 已有操作**；前端契约以本仓 `application/` Java 代码为权威。
> 复验方法：所有关键结论均回到本仓 Java/TS 源码逐行核对（锚点见各条），未采信未验证的转述。已知后端缺陷按 spec §4.8 体例登记（见文末「spec §5 缺陷登记建议」）。
> 状态标记：〔证成〕采纳侦察倾向并给出源码依据；〔推翻侦察〕推翻或消解侦察文档的未定/错误倾向；〔实测定案〕静态结论已给出，最终确认挂真机实测清单。

## 裁决总表

| # | 裁决点（一句话） | 来源 | 状态 |
|---|---|---|---|
| 1 | Edge 列表取数统一走 `edgeInfos` 系端点，不用返回裸 `Edge` 的三个列表端点 | B§7-1、E§11-2 | 证成 + 〔实测 T1〕 |
| 2 | 服务层默认排序显式传 `createdTime DESC`，不依赖后端缺省 | B§5-1 | 证成 |
| 3 | Edge 设备子列表用 `GET /api/edge/{id}/devices`（内部即 DeviceInfoFilter） | E§11-2 | 证成 |
| 4 | 子实体列表排序键以各端点 swagger 白名单为准，白名单外列头不给排序 | E§11-2 引申 | 证成 |
| 5 | 详情页 events tab = `GET /api/events/EDGE/{id}/ERROR`（Edge 实体自身错误事件），与 ngx 对齐 | E§11-3、I§12-4 | 证成 |
| 6 | Downlinks = `GET /api/edge/{id}/events`，后端排序硬编码 seqId ASC 不可改，前端客户端倒排 | B§7-5 | 证成 |
| 7 | Downlinks 的 Deployed/Pending 为前端派生值（对照 `queueStartTs` 属性）；edge events 默认 TTL 一个月 | E§5、契约盘点 | 证成 |
| 8 | Edge key/secret 前端生成：工具函数层（`generateSecret` 上移共享 + `crypto.randomUUID()`）+ 表单层新增时填初值 | E§11-6、B§7-4 | 证成（位置改判） |
| 9 | 保存后 key/secret 只读呈现；「无重新生成入口」= ngx 等价，重新生成登记为增强项 | E§11-6 | 推翻侦察（B§5-8「允许用户改」不采） |
| 10 | CUSTOMER_USER 视角 secret 暴露与 OTA 读可达性：M13 无 CU 页面，降级为契约登记，不裁决 UI | B§7-3、B§7-4 | 推翻侦察（消解「需拍板」） |
| 11 | OTA 两步保存：POST info → multipart 传文件；上传失败回滚删除刚建的 info | O§9-2 | 证成 |
| 12 | checksum 由后端算：前端只选算法（默认 SHA256）+ 可选手填值；勾 auto-generate 时隐藏两输入 | O§9-1 | 证成 |
| 13 | OTA 创建即定型：编辑面只剩 `additionalInfo.description`；tag 仅创建时可写 | O§9-5、B§7-8 | 证成 + 推翻侦察（B§7-8 静态解决） |
| 14 | multipart 直连直传：`tbHttp.post` + `FormData`（不设 Content-Type）；字段集 = file + checksumAlgorithm(必填) + checksum(可选)；前端不设大小上限（与 ngx 一致），登记 | O§9-2、I§12-8 | 证成 + 推翻侦察（I§12-8 静态解决） |
| 15 | OTA 详情/编辑表单一律取 `GET /api/otaPackage/info/{id}`；`GET /api/otaPackage/{id}` 不进 antd 服务层 | B§7-2 | 证成 + 〔实测 T2〕 |
| 16 | 下载通道：blob 走 `tbHttp.request(url, { responseType: 'blob' })` + `downloadBlob`；URL 型包分流新窗口打开（后端对 URL 型 download 直接 400） | 任务指定、B§5-6 | 证成 |
| 17 | OTA 删除被引用：无预检端点、无 force 通道，等价 = 提交后吃 400 英文报错 toast；前端预检属增强 | O§9-4 | 证成 |
| 18 | OTA 消费闭环（device-profile/device 选择器 + 变更前 N 台确认）：随 M13 收口或登记为依赖项，不得静默缺位 | O§9-3 | 移交 spec 定范围 |
| 19 | Sync Edge 保持 fire-and-forget；后端有 20 秒硬超时（"Edge is not connected"），前端无需自造超时兜底 | E§11-8、B§7-7 | 推翻侦察（B§7-7 悬挂担忧） |
| 20 | 升级面：M13 只做安装指引；upgrade available 按钮二态按 `GET /api/edge/{id}/upgrade/available` 探测，不承诺升级链路 | E§11-5 | 证成 |
| 21 | Edge CSV bulk_import：不删减——纳入 M13 tenant 列表导入按钮；若 spec 明确缓做须在 §5 登记 | B§7-6 | 移交 spec 定范围 |
| 22 | customer_user 菜单可见性：前端 `edgesSupportEnabled`（GET /api/system/params）与后端 `edges.enabled` 是两个开关；fork 统一受前端开关控制（修正 ngx 不一致） | E§11-7 | 证成（权限契约项） |
| 23 | OTA 页 access = `canTenantAdmin`（后端全部写端点 TENANT only） | I§12-2 | 证成 |
| 24 | EventsPanel 走参数化：`getEvents` 服务已是多态签名且 `EventTypeId` 已含 `'ERROR'`，服务层零改动，仅面板 props 泛化 | I§12-3 | 证成 |
| 25 | e2e 可行性：真后端可建 Edge（模板根链初始化自带），smoke spec 可上 Edge 链路 | I§12-9 | 证成 + 〔实测 T3〕 |

---

## 分条详裁

### A. 列表取数与排序

**1. Edge 列表取数统一走 `edgeInfos` 系**〔证成 + 实测 T1〕
【决议】ui-antd 的 Edge instances 列表（tenant / customer 两 scope）一律取 `GET /api/tenant/edgeInfos`、`GET /api/customer/{customerId}/edgeInfos`；**禁止**使用 `GET /api/edges`、`GET /api/tenant/edges`、`GET /api/customer/{id}/edges` 这三个返回裸 `Edge` 的端点。service 层函数命名与 ngx 对齐（`getTenantEdgeInfos` / `getCustomerEdgeInfos`），并把 M12 4.7 登记的「rules 触发表单直用 tbHttp 调 `/api/tenant/edgeInfos`」消费点迁到新 edge service——这是 M13 edge service 落地时的既定收尾义务，不是可选项。
【依据】`EdgeInfoEntity.edgeInfoColumnMap` 唯一映射 `customerTitle → c.title`（`dao/src/main/java/org/thingsboard/server/dao/model/sql/EdgeInfoEntity.java:30-35`）；`JpaEdgeDao` 中 Edge（非 Info）系查询全部走 `DaoUtil.toPageable(pageLink)` **无列映射**（`dao/.../sql/edge/JpaEdgeDao.java:89-137, 200-221`），EdgeInfo 系四条查询全部带 `edgeInfoColumnMap`（同文件 :147,158,173,182）。因此裸 Edge 端点传 `sortProperty=customerTitle` 时 Hibernate 解析 `EdgeEntity.customerTitle` 属性失败 → DataAccessException → 500 "Database error"（与 M12 §4.8 filtered targets 500 同型）。`EdgeInfo` 比 `Edge` 多的恰是 `customerTitle`/`customerIsPublic`，前端列表本就需要。ngx 同口径（`ui-ngx/src/app/core/http/edge.service.ts:64,86`）。另确认 `type` 过滤参数传空安全：controller 对 null/空白走无过滤分支（`EdgeController.java:293-301`），antd 按需拼参数即可，不必学 ngx 无条件 `&type=`。
【分歧/需复核】「是否真 500」静态判定为高概率、留 T1 实测；**无论实测结果如何，规避口径不变**（edgeInfos 功能超集且排序可用），实测只影响缺陷登记的措辞（500 实锤 vs 仅风险记录）。

**2. 服务层默认排序显式传 `createdTime DESC`**〔证成〕
【决议】全部 M13 新增列表（edges、五个子实体页、otaPackages）的 url-state 默认 sortOrder 显式 `{ property: 'createdTime', direction: 'DESC' }`；service 函数不隐式补排序——排序是页面语义，由 url-state 缺省值保证。沿 M12 通知族既有先例（`ui-antd/src/pages/notifications/{inbox,recipients}/index.tsx` 的 `sortOrder: { property: 'createdTime', direction: 'DESC' }` 缺省 + 单测断言）。
【依据】`PageLink` 缺省排序是 `id ASC` 不是 createdTime（`common/data/src/main/java/org/thingsboard/server/common/data/page/PageLink.java:26-28`），TB 的 id 是普通 UUID 无时序；用户排序不含 id 时后端自动追加 `id ASC` 次级排序（同文件 `toSort(..., addDefaultSorting)` 段），行为确定无需前端处理。

**3. Edge 设备子列表用 `GET /api/edge/{id}/devices`**〔证成〕
【决议】Edge 子实体设备页取数用 GET 端点。侦察倾向「用 GET，除非 antd 已有 query-filter 封装可白拿」——本镜头复核后**顾虑消除，直接定 GET**：该端点内部构造的就是 `DeviceInfoFilter`（`filter.edgeId`）再调 `findDeviceInfosByFilter`（`application/src/main/java/org/thingsboard/server/controller/DeviceController.java:745-775`），与 ngx POST device-info-query 是**同一数据面**，GET 不存在「老端点、字段少」的代价。参数语义：`type` 与 `deviceProfileId` 二选一（controller :768-772 else-if，同时传时 type 优先），另有 `active`、`startTime/endTime`。
【分歧/需复核】无端点分歧；`active` 过滤、profile 过滤是否首波进 Edge 子页是 UX 范围，归 arch/前端镜头。

**4. 子实体列表排序键以 swagger 白名单为准**〔证成〕
【决议】五个子实体页与 Downlinks 表的列头排序键，严格按各端点 `allowableValues` 白名单接线，白名单外的列只展示不可排序。已核：edge dashboards = `createdTime,title`（`DashboardController.java:593`）、edge ruleChains = `createdTime,name,root`（`RuleChainController.java:519`）、edge devices = `createdTime,name,deviceProfileName,label,customerTitle`（`DeviceController.java:766`）；assets/entityViews 沿 `m13-backend-contract.md` §1（+type/startTime/endTime），本镜头未逐字复跑，实现时照契约文档即可。
【分歧/需复核】edge devices 白名单里有 `customerTitle`，但该查询是否有列映射未证——antd 子页本就不放 customer 列，**不要把 customerTitle 列加进 Edge 设备子页**即可回避，无需实测。

### B. Edge 事件双表语义

**5. 详情页 events tab = `GET /api/events/EDGE/{id}/ERROR`**〔证成〕
【决议】Edge 详情页的「Events」tab 与 ngx 等价：Edge 实体自身的 ERROR 事件表，端点 `GET /api/events/EDGE/{edgeId}/ERROR`（通用类型化事件端点，`EventController.java:121-154`，需 `tenantId` query 参数）。列 = createdTime / server / method / error 详情弹窗。这不是 Edge 同步事件——同步事件是 #6 的 Downlinks。
【依据】ngx `edge-tabs.component.html:45-51` defaultEventType=ERROR；ui-antd 侧 `services/tb/events.ts:38-56` 的 `getEvents(entityId: EntityId, tenantId, eventType, pageLink)` 本就是多态签名，`EventTypeId` 联合类型已含 `'ERROR'`（events.ts:19-25）——**服务层零改动**，排序参数端点白名单 `ts/id`（EventController:138），沿 device events tab 现行用法。

**6. Downlinks 独立 tab，seqId ASC 硬编码，前端客户端倒排**〔证成〕
【决议】Downlinks tab（仅 TENANT_ADMIN）取 `GET /api/edge/{edgeId}/events`；后端排序被 `SORT_ORDERS=[seqId]` 覆盖，`ORDER BY seqId ASC, id ASC`，**传 sortProperty/sortOrder 不报错但完全无效**——「新的在前」在前端拿到整页数据后客户端倒序渲染，不在请求上做文章。时间分页语义（useTimePageLink + `startTime/endTime`）与 ngx 一致。注意两点已定死的语义：`textSearch` 匹配的是**事件 type 名**（如 "DEVICE"，`EdgeEventController.java:66-67` 官方注记 + `EdgeEventRepository.java:37`），不是实体名，antd 搜索框占位文案要写对；status 列是派生值（见 #7）。
【依据】`EdgeEventController.java:57-85`（controller 原样传用户排序进 `createTimePageLink`，但 :84 调 `findEdgeEvents(tenantId, edgeId, 0L, null, pageLink)`）；`JpaBaseEdgeEventDao.java:61` `SORT_ORDERS = singletonList(new SortOrder("seqId"))` + `:175-187` `DaoUtil.toPageable(pageLink, SORT_ORDERS)`——该重载**用传入的 sortOrders 整体替换** pageLink 的排序（`DaoUtil.java:85-98`），用户参数到不了 SQL。swagger 上的 `allowableValues = {createdTime,name,type,label,customerTitle}`（EdgeEventController:67-69）是从 Edge 端点复制的**假文档**，不构成契约。
【分歧/需复核】「客户端倒排 vs 时间窗口倒序遍历」（B§7-5）裁决为**客户端倒排**：seqId ASC 天然稳定分页，倒序展示是纯视图变换；时间窗口遍历实现复杂且受 TTL 影响，属过度设计。T5 实测兜底确认。

**7. Downlinks 状态派生 + TTL 事实**〔证成〕
【决议】`Deployed/Pending` 状态是前端派生：读 Edge 的 SERVER_SCOPE 属性 `queueStartTs`（`ui-antd/src/services/tb/attributes` 既有通道），`createdTime ≤ queueStartTs` → Deployed，否则 Pending；不请求后端计算。登记两条事实约束：① edge events 存分区表且默认开 TTL，`edge_events_ttl=2628000` 秒 ≈ 一个月（`application/src/main/resources/thingsboard.yml:508-511`）——Downlinks 历史最多一个月，验收与文案不得暗示永久留存；② `textSearch`/排序语义见 #6。
【依据】ngx `edge-downlink-table-config.ts:89-94,121-157`；TTL 配置本仓核验。

### C. Edge key / secret

**8. 生成位置：工具函数层 + 表单层新增时填初值**〔证成，位置改判〕
【决议】生成逻辑放**工具函数层**（可单测、可复用），表单层只负责「新增态调用并填初值」：`routingKey = crypto.randomUUID()`（ui-antd 仓内 7 处既有先例，如 `core/dashboard/model.ts:121`；等价于 ngx `guid()` 的唯一性语义），`secret = generateSecret(20)`。`generateSecret`（base-36 递归拼长，与 ngx `core/utils.ts:881-891` 逐字同算法）已存在于 `ui-antd/src/components/devices/credentials-value.ts:65-72`——M13 是第二个消费方，把它上移到共享 util（如 `components/shared/` 或 `utils/`），devices 三个消费点（credentials-value.ts 内部 + `DeviceCredentialsFields.tsx:18`）同 PR 同步 import，不算无关重构。后端对值本身零约束（任意非空字符串合法），生成算法不是正确性问题。
【依据】后端必填校验：`EdgeDataValidator.java:56-61`（"Edge secret should be specified!" / "Edge routing key should be specified!"），服务端**不生成**（B 契约盘点已证）；无独立 credentials 端点，凭证即 `Edge` 实体两字段。ngx 生成时机 = 表单构建时仅当 `!entity.id`（`ui-ngx/.../edge.component.ts:138-143`），antd 等价。

**9. 保存后只读呈现；无重新生成 = 等价**〔推翻侦察〕
【决议】key/secret 保存后**只读**（详情对话框禁用输入 + Copy ID / Copy Edge key / Copy Edge secret 三连复制），与 ngx 一致。「无重新生成入口」是 ngx 有意设计（表单字段恒 disable，`ui-ngx/.../edge.component.ts:108-112` + html :166-189），M13 等价交付；「重新生成 secret」后端契约允许（PUT/POST `/api/edge` 更新实体两字段即可，无禁改校验），登记为能力级增强，不进 M13 验收。
【分歧/需复核】**推翻** `m13-backend-contract.md` §5-8 的「并允许用户改」——那是后端能力的描述，混入了前端契约：ngx UI 不允许改，等价 = 不允许改。允许编辑属增强，须另立条目而不是写进等价基线。

**10. CUSTOMER_USER 视角的暴露与 OTA 读：降级为契约登记**〔推翻侦察（消解）〕
【决议】后端 `GET /api/edge/{id}` 对 CUSTOMER_USER 返回完整 `Edge`（含 routingKey/secret，无脱敏代码；ACL 只做 READ 检查）；OTA 侧 CU 有 info/列表三读端点。但 M13 antd 的 Edge/OTA 页面均为 TA-only（#23），**CU 面本里程碑不存在**，「secret 是否对 CU 隐藏」「CU 读 OTA 可达性」不是 M13 裁决项——降级为契约登记（本节即登记），未来若开 CU 只读面再拍板。
【分歧/需复核】消解 B§7-3、B§7-4 两个「需拍板」：前提（CU 页面）不成立，拍板无对象。

### D. OTA 保存链与编辑面

**11. 两步上传 + 失败回滚**〔证成〕
【决议】antd `saveOtaPackage` 照 ngx 语义两步走：① `POST /api/otaPackage`（JSON，`SaveOtaPackageInfoRequest`，刻意剥掉 file/checksum/checksumAlgorithm）建 info 空壳；② 拿返回 id `POST /api/otaPackage/{id}`（multipart）传文件；**第②步失败自动 `DELETE /api/otaPackage/{id}` 回滚**（ngx `ota-package.service.ts:73-88` catchError→deleteOtaPackage）。回滚失败（删除也挂）时保留 info 并报错——空壳包可手动删除，不阻塞。URL 型包（isURL）单步 JSON 保存（`usesUrl:true` + `url` 必填，`BaseOtaPackageService` validator :79-81）。
【依据】本仓 `DefaultTbOtaPackageService.java:47-96`（save 与 saveOtaPackageData 是两个独立事务动作，回滚只能前端编排——这就是两步+回滚存在的根因）；`OtaPackageController.java:126-163`。

**12. checksum 后端算**〔证成〕
【决议】前端**从不本地算哈希**：创建表单提供算法下拉（7 值，默认 SHA256）+ 可选 checksum 输入；勾选「Auto-generate checksum」（默认勾选）时隐藏这两个输入，提交时 `checksumAlgorithm` 仍必传（SHA256），`checksum` 不传。后端 checksum 缺省时按算法现算落库（`DefaultTbOtaPackageService.java:71-73`）；`checksumAlgorithm` 是**必填**参数（`OtaPackageController.java:152,156`，无 required=false），枚举外值 500（:159 `valueOf` 未转 400）——前端下拉白名单天然规避。回读展示 `算法: 值` + 复制按钮，沿 ngx 列表/详情口径。
【分歧/需复核】「上传前本地预览哈希」若产品想要，属增强且不改变后端口径，登记不实施。

**13. immutable 锁死，编辑面只剩 description**〔证成 + 推翻侦察〕
【决议】编辑对话框 = 详情表单整表禁用，仅 `additionalInfo.description` 可编辑可存（PUT/POST `/api/otaPackage` 同通道更新）。title/version/tag 叠加 readonly 双保险沿 ngx。保存前警示文案（「上传后将无法修改 title、version、设备配置档与包类型」）仅新增态显示。
【依据】`BaseOtaPackageDataValidator.validateUpdate`（`dao/.../validator/BaseOtaPackageDataValidator.java:78-121`）：type/title/version/tag/deviceProfileId/fileName/contentType/checksum/checksumAlgorithm/dataSize **全部禁改**，`url` 一旦有值也禁改（:119-121）——照抄创建表单必整表 400，这是硬契约不是 UX 选择。
【分歧/需复核】B§7-8「tag 写入时机需确认」**静态解决**：`SaveOtaPackageInfoRequest` 创建路径可写 tag（validateImpl 无 tag 禁止项），创建后 `validateUpdate:91-93` 禁改——前端只在创建表单暴露 tag，编辑态锁死，无需实测。另注意 `title+version` tenant 内唯一（`ota_package_tenant_title_version_unq_key`），重复保存 400，错误文案按消息前缀转译。

**14. multipart 直连直传 + 字段集 + 大小上限**〔证成 + 推翻侦察〕
【决议】上传从 ui-antd 直连后端，不经 BFF：`FormData`（只 append `file`，浏览器自带 boundary，**不设 Content-Type**）作 `tbHttp.post` body，`checksumAlgorithm`/`checksum` 走 query 参数。字段集已静态核实：`file` 为 RequestPart 必填、`checksumAlgorithm` 必填、`checksum` 可选，**没有 title 等其余字段**（`OtaPackageController.java:146-163`）。文件大小上限：ngx OTA 未设（resources 的 maxResourceSize 不适用此处），后端亦无 OTA 专属上限——antd 与 ngx 等价**不设**，超限风险登记（multipart 总量受 servlet 容器配置约束，属部署项）。
【分歧/需复核】I§12-8「openapi 快照是否覆盖 file、checksum 是否必填需真机验证」**静态解决**（controller 源码即权威，openapi 快照本就仅参考）；`ota.endpoints.test.ts` 按「file part + checksumAlgorithm query」断言即可，不再挂实测。I§12-8 后半句原样消解。

**15. 详情取数走 info 端点**〔证成 + 实测 T2〕
【决议】antd 服务层只封装 `GET /api/otaPackage/info/{id}`（TENANT+CUS，无 data，`OtaPackageController.java:102-112`）用于表单/详情载入；`GET /api/otaPackage/{id}`（返回含 data 的 `OtaPackage`，TENANT only，:114-124）**不进服务层**——M13 无需要 data 的场景。
【依据】`OtaPackage.data` 是 `transient ByteBuffer` + Lombok `@Data`（`common/data/src/main/java/org/thingsboard/server/common/data/OtaPackage.java:34-35`）：Jackson 默认 `PROPAGATE_TRANSIENT_MARKER=false` 时 getter 驱动序列化，大文件大概率 base64 全量回传（Jackson 对 ByteBuffer 有内置 base64 serializer）——**静态判定为「会回带」，留 T2 实锤**。
【分歧/需复核】实测只影响契约文档措辞与缺陷登记；结论（用 info 端点）不受影响。

**16. 下载通道 blob + URL 型分流**〔证成〕
【决议】文件型包下载：`tbHttp.request('/api/otaPackage/{id}/download', { responseType: 'blob' })` → `downloadBlob(blob, fileName)`（`ui-antd/src/components/shared/download-blob.ts:8-16`；范式先例 `services/tb/resource.ts:121-127`，client 层 `responseType: 'blob'` 一等支持，`core/http/client.ts:75`）。行内/详情下载按钮 enabled 条件 = `hasData && !url`；URL 型包（有 `url`）改走新窗口打开外链——**后端对 URL 型 download 直接 400**（`OtaPackageController.java:89-91` `hasUrl()` → badRequest），前端必须分流，不是可选优化。
【依据】本仓两处源码 + 契约盘点 §5-6。

### E. 删除兜底

**17. OTA 删除被引用：等价 = 提交后吃 400 报错**〔证成〕
【决议】删除确认弹窗只做通用警示（沿 ngx 四件套文案），不预检、不预禁用；被 device / device profile 引用时后端 400，前端 toast 呈现并按报错文案转译。四条约束与消息：`fk_firmware_device` → "The otaPackage referenced by the devices cannot be deleted!"、`fk_firmware_device_profile` → "...referenced by the device profile..."、software 两条同构（`BaseOtaPackageService.java:195-218`，经 `BaseController.java:459-460` DataValidationException→400 映射，本镜头复核）。**与 M11 引用删除流的等价边界**：M11 资源库有 `force=false → 400+references → force=true` 三段协议（TbResourceController 专属），OTA **没有 force 参数也没有预检端点**（`isOtaPackageUsed` 是 DAO 内部方法，`OtaPackageInfoRepository.java:58`，无 REST 暴露，本镜头复核）——M11 的「被引用对话框→force」流程在 OTA 域**不适用也不是缺口**，spec 验收行不得把 force 通道写成 OTA 等价项。前端预检（读 device profile 的 firmwareId/softwareId 反查）属增强，登记不实施。
【依据】本仓三处源码如上；删除同时清理 PG large object、失败仅 warn 不阻断（`BaseOtaPackageService.java:220-242`），对前端透明。

**18. OTA 消费闭环（选择器 + 变更确认）**〔移交 spec 定范围〕
【决议】contract 镜头给事实底座：选择器候选 `GET /api/otaPackages/{deviceProfileId}/{type}` 只返回 `hasData=true` 的包（`OtaPackageController.java:206-207`）——刚建未传文件的空壳不会出现在候选里；「变更前 N 台设备」确认走 `GET /api/devices/count/{type}/{id}`（OTA 依赖既有的 device count 端点，无新端点）。随 M13 一起动 = 消费闭环完整；后置 = 必须在 spec §5 登记为依赖项（沿 M12 4.7「settings 归 M14」口径）。**不得静默缺位**——那是删减 TB 已有操作。范围取舍归 spec/主会话。
【依据】ngx `device-profile.service.ts:126-131` 保存门前置确认；契约盘点 §5。

### F. 动作与开关

**19. Sync：fire-and-forget + 后端 20s 硬超时**〔推翻侦察〕
【决议】保持 ngx 形态：点击 → loading → toast 报结果，**不做轮询假状态**。前端**无需自造超时兜底**：后端 `scheduleSyncRequestTimeout` 固定 20 秒后回 `FromEdgeSyncResponse(false, "Edge is not connected")` → HTTP 500 带该错误（`application/src/main/java/org/thingsboard/server/service/edge/rpc/service/EdgeGrpcService.java:250-259`）；同步进行中重复点击立即返回 "Sync process is active at the moment"（:184-185）。按钮 loading 态给到 ~25s 即可覆盖服务端上限。
【分歧/需复核】**推翻** B§7-7「DeferredResult 悬挂时长未验证、需自定义超时兜底」：悬挂不存在，服务端有界。T3 实测顺带实证 20s 数值。

**20. 升级指引：M13 只做安装指引，upgrade 二态能力探测**〔证成〕
【决议】安装指引对话框（docker/ubuntu/centos 三 tab，后端拼好 markdown 纯渲染）：`GET /api/edge/instructions/install/{edgeId}/{method}`；「升级指引」二态按钮按 `GET /api/edge/{edgeId}/upgrade/available` 布尔结果切换（true → Upgrade Instructions）。升级**执行链路**（edgeVersion 属性 + `/instructions/upgrade` 渲染）不承诺——按钮点击后若探测为 false 只有安装指引一态，与 ngx 无升级路径等价。两端点均 TENANT only 且在 `edges.enabled=false` 时抛 "Edges support disabled"（`EdgeController.java:537-588`，本镜头复核）——探测 404/异常时隐藏按钮即为降级路径，无需前端再探 `/api/edges/enabled`（菜单层如需，见 #22）。
【分歧/需复核】E§11-5 的「接口 404 时隐藏」精确化为「探测端点异常即回落安装指引单态」；instructions 端点 404 与功能关闭的 500(error GENERAL) 前端同路处理，不区分文案。

**21. Edge CSV bulk_import：不删减**〔移交 spec 定范围〕
【决议】ngx tenant 列表有「导入 Edge」按钮（`POST /api/edge/bulk_import`，`EdgeController.java:523-535`），按铁律**不得静默砍掉**：默认纳入 M13 tenant 列表（ui-antd devices 页已有 CSV 导入先例可仿）；若主会话裁决 M13 缓做，必须在 spec §5 显式登记「Edge 导入缓做」，沿 M11 iot-hub「登记不实施」口径。契约事实：请求体 `BulkImportRequest`（CSV + columnMapping），前置条件 = tenant 已存在 edge template root rule chain（缺则报错），与单建 Edge 同门槛。
【分歧/需复核】范围归 spec；本镜头只锁定「登记义务」。

**22. customer_user 菜单开关双轨**〔证成，权限契约项〕
【决议】fork 统一：customer 视角 Edge 入口同样受 `authState.edgesSupportEnabled`（`GET /api/system/params`）控制，修正 ngx 的 customer 菜单恒显不一致。注意与后端 `edges.enabled`（`thingsboard.yml:1620-1622`，默认 true）是**两个开关**：后端关时各端点抛 "Edges support disabled"，前端开关注 menu 可见性——antd 侧按 ngx 口径消费 `edgesSupportEnabled` 即可，不必新探 `/api/edges/enabled`（该探测端点留作能力探测增强，登记）。
【依据】ngx `menu.models.ts:832-842` 过滤 + `auth.service.ts:456-466` 来源；E§11-7。

**23. OTA 页 access = canTenantAdmin**〔证成〕
【决议】OTA 列表/详情/上传/删除路由 access 用 `canTenantAdmin`。后端矩阵：全部写端点 + download + 全量 get 均 TENANT only；CU 仅有 info/两个列表读（`OtaPackageController.java` 各 `@PreAuthorize` 逐条复核）。不做 SA 面（ngx 亦无）；CU 读端点是设备侧消费既有事实，前端不建入口，契约登记（并入 #10）。
【分歧/需复核】I§12-2「TA-only 还是 SA+TA」消解：SA 在后端就无权限，无选择空间。

**24. EventsPanel 参数化而非复制**〔证成〕
【决议】contract 镜头支持 impl-notes 的参数化倾向，并消除其主要顾虑（事件列集差异）：事件**行结构**全类型统一（`EventInfo`：createdTime/type/body JSON），差异只在 eventType 候选与 body 字段渲染——Edge tab 固定 ERROR 单型，比 device 更简单。方案：`EventsPanel` props 泛化为 `entityId: EntityId`（`getEvents` 签名本就如此，events.ts:38-43），devices/detail 调用点与两处测试同 PR 跟改；不做兼容垫片（impl-notes §11 红线）。
【分歧/需复核】列集与详情弹窗的 UX 细节归前端镜头；本镜头锁定「服务层零改动、只动面板 props」的边界。

**25. e2e 可行性**〔证成 + 实测 T3〕
【决议】真后端可建 Edge：创建前置条件 = tenant 存在 edge template root rule chain，系统初始化数据自带 EdgeRootRuleChain（契约盘点 §8，本镜头未逐行复跑初始化脚本，T3 首步即验证）。smoke spec 可含 Edge 建→删链路；需要边端真实连接的场景（sync 成功路径、升级指引 upgrade 分支）不进自动化，沿 M12「真实通道留人工验收」口径。
【依据】`DefaultTbEdgeService.java:45-58`（创建时自动挂模板根链 + assign 默认规则链——注意这是**创建副作用**，antd 新建 Edge 后列表/详情会自带 rootRuleChainId，不是前端漏传）。

---

## 真机实测清单

> 实测环境：本机 run-tb-backend + TA 登录。每条给出步骤与判据；判据决定 spec §5 措辞与服务层终稿，**不改变已定的规避口径**（除 T1 反向结果会放宽缺陷登记）。

- **T1 customerTitle 排序在裸 Edge 端点的行为**（裁决 #1）
  步骤：TA JWT 依次请求 `GET /api/tenant/edges?pageSize=10&page=0&sortProperty=customerTitle&sortOrder=ASC`、`GET /api/customer/{id}/edges?...&sortProperty=customerTitle`、`GET /api/edges?...&sortProperty=customerTitle`；对照 `GET /api/tenant/edgeInfos?pageSize=10&page=0&sortProperty=customerTitle&sortOrder=ASC`。
  判据：前三者预期 500 "Database error"（Hibernate 属性解析失败）；edgeInfos 预期 200 且按客户标题排序。若前三者意外 200，缺陷登记降级为「风险记录」，规避口径不变。
- **T2 `GET /api/otaPackage/{id}` 是否回带 data**（裁决 #15）
  步骤：上传一个几百 KB 的文件型包 → devtools Network 对比 `GET /api/otaPackage/{id}` 与 `GET /api/otaPackage/info/{id}` 响应体大小、是否含 base64 `data` 字段。
  判据：全量回带 → 缺陷/坑登记（照 §4.8 体例）+ 服务层确认不含该端点；不回带 → 契约文档补一句实测结论即可。
- **T3 Edge 全链 smoke（兼 e2e 可行性）**（裁决 #19、#20、#25）
  步骤：run-tb-backend → TA 新建 Edge（随机 key/secret）→ 回读确认 `rootRuleChainId` 已挂 → 分配 customer →（边端不在线）点 Sync 等待 → 打开安装指引三个 method tab → `GET /api/edge/{id}/upgrade/available`。
  判据：创建 200 且 rootRuleChainId 非空；Sync 约 20s 返回 500 带 "Edge is not connected"（证实 #19）；install 指引返回三段 markdown；upgrade/available 返回 false；由此证明 smoke spec 的 Edge 链路可行。
- **T4 OTA 两步上传 + 回滚 + 删除被引用 400**（裁决 #11、#12、#17）
  步骤：① POST info → multipart 上传（`checksumAlgorithm=SHA256` 不带 checksum）→ 回读 info 核对 checksum（与本机 `sha256sum` 一致）、fileName/dataSize 回填；② 对话框内中断/断网第二次上传 → 确认刚建的 info 被 DELETE（列表无残留空壳）；③ 给某 device profile 配上该包后删除包 → 预期 400，消息命中 "referenced by the device profile"。
  判据：三项全中即服务层两步+回滚与删除兜底口径定案。
- **T5 Downlinks 排序与 textSearch 语义**（裁决 #6）
  步骤：对有事件的 Edge 请求 `GET /api/edge/{id}/events?pageSize=10&page=0&sortProperty=createdTime&sortOrder=DESC`，观察返回顺序；再带 `textSearch=DEVICE` 观察过滤维度。
  判据：返回仍按 seqId ASC（DESC 无效）→ 客户端倒排定案；textSearch 命中的是事件 type 名 → 搜索框文案与实现定案。

## spec §5 缺陷/契约登记建议（照 §4.8 体例，随 M13 段定稿落盘）

- 裸 Edge 列表端点（/api/edges、/api/tenant/edges、/api/customer/{id}/edges）swagger 允许 `sortProperty=customerTitle` 但 DAO 无列映射，排序报 500（待 T1 实锤）；前端一律走 edgeInfos 系规避。
- `GET /api/otaPackage/{id}` 疑似 base64 回带全量文件（待 T2）；前端只消费 `/otaPackage/info/{id}`。
- `GET /api/edge/{id}/events` 的 sortProperty/sortOrder 被 DAO 硬编码 `SORT_ORDERS=[seqId]` 覆盖恒为 ASC；swagger 排序白名单为复制来的假文档。前端客户端倒排。
- 上游对照：ngx Edge 表单 key/secret 恒只读、无重新生成入口——fork 同口径等价交付，重新生成登记为能力级增强（后端契约允许）。

## 仍需用户拍板的偏好项

**无。** 本镜头 25 条均可由源码契约 + fork 铁律机械推出，未产生需要用户偏好裁决的分歧项；范围类悬置项（#18 消费闭环、#21 bulk_import 纳入与否、以及子实体页密度/shell 抽象/OTA 菜单落位等形态问题）已显式移交 spec 与 arch/前端镜头，并附齐契约事实。
