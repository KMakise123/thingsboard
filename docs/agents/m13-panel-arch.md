# M13 专家小队裁决 · 前端架构与复用（m13-panel-arch）

> 镜头：前端架构与复用。裁决人：panel-arch（2026-09-06）。
> 输入：`docs/agents/m13-ngx-inventory-edge.md`、`docs/agents/m13-ngx-inventory-ota.md`、`docs/agents/m13-backend-contract.md`、`docs/agents/m13-implementation-notes.md`、`docs/spec/v2-subsystems-acceptance.md` §1/§2/§4。四份 m13 文档末尾「裁决点」共 31 条原始条目，去重合并为 30 条裁决（编号 R01–R30）。
> 准则（fork 铁律）：等价为底线、允许增量增强、禁止删减 TB 已有操作；照 ngx 口径；走 ui-antd 既有范式（m12 notes 为准）；不为未发生的需求提前抽象；范围外一律「登记不实施」。
> 所有锚点均为本仓源码行号，裁决人逐一复核过（含对侦察文档的四处事实修正，见 §2）。

## 0. 裁决总表

| 编号 | 议题 | 一句话决议 |
|---|---|---|
| R01 | Edge 子实体页形态 | 平级路由列表页（照 customers 作用域页样板），不做详情内嵌 tab |
| R02 | 子实体取数端点 | 五页全部走 `/api/edge/{edgeId}/xxx` 专属端点，设备页用 GET，不在 v1 服务函数上加参数 |
| R03 | Edge 详情 tab 集合 | details + ngx 七 tab（attributes/latest-telemetry/alarms/events/downlinks/relations/audit-logs），不挂 version-control |
| R04 | EventsPanel 改造 vs 复制 | 参数化共享件（entityId + 事件类型集合入 props），不复制 |
| R05 | Downlinks tab 落位与实现 | 必做等价项（不可降级），Edge 详情内新建 EdgeDownlinksPanel，状态列由 queueStartTs 派生，按服务端返回顺序直渲 |
| R06 | 规则链子页范围 | Edge 内 ruleChains 子页进 M13（Set root + 缺失检查）；规则链模板页与 EDGE 画布登记边界外 |
| R07 | 指引对话框范围 | 安装 + 升级指引都做（同一组件三态标题，upgrade/available 布尔驱动二态按钮）【推翻侦察倾向】 |
| R08 | key/secret 生成位置 | 前端生成（对齐 ngx），「无重新生成入口」登记缺口另开 issue |
| R09 | sync 反馈形态 | 成功 toast 等价 + 按钮 loading 增强，不做进度轮询 |
| R10 | edges.enabled 功能开关 | M13 不接入路由/菜单（登记不实施），后端默认 true 且 fork 部署即用 Edge【推翻侦察倾向】 |
| R11 | CUSTOMER_USER Edge 只读面 | TA 面全量为主交付；CU 只读面是否随 M13 属 spec 范围拍板项【需复核】 |
| R12 | Edge 路由/菜单落位 | `name:'edge'` 组照 notifications 形态，`/edges` + `/edges/:id` + 五条子页平铺隐藏路由 |
| R13 | OTA 路由/access | 顶级平铺 `/otaPackages` + `/otaPackages/:id`，`canTenantAdmin` |
| R14 | 服务层文件面 | 新建 `services/tb/edge.ts` + `ota.ts`（各带 endpoints.test），两者都挂 index.ts；OTA 消费侧函数留 device-profile.ts 不迁 |
| R15 | 类型文件落位 | 手写 `types/tb/edge.ts` + `types/tb/ota.ts`，openapi 快照仅参考；复用 types/tb/page.ts |
| R16 | OTA checksum 归属 | 后端算（对齐 ngx/后端），前端只传算法 + 可选 checksum |
| R17 | OTA multipart 通道 | tbHttp 直连后端 FormData（不设 Content-Type），不设前端大小上限；断 URL 测试以后端实测为准 |
| R18 | OTA 消费侧集成 | 随 M13 末波补齐：device 表单选择器 + 「变更影响 N 台设备」保存门（device-profile 半边已存在） |
| R19 | OTA 删除被引用 | 等价：提交后吃后端 400 文案 toast；预检登记增强不做 |
| R20 | OTA 编辑保真度 | 编辑态锁死只留 description（等价） |
| R21 | OTA 详情形态与 VC tab | 独立详情路由页（antd 无抽屉范式，双入口收敛为单入口）；VC tab 后置 M14 登记 |
| R22 | OTA tag 写入时机 | 只在创建表单暴露（等价，后端创建后禁改） |
| R23 | Edge 列表取数端点口径 | 一律 `edgeInfos` 系端点（规避 customerTitle 排序 500 坑），显式传 createdTime DESC |
| R24 | OTA 详情/表单端点口径 | 一律 `/otaPackage/info/{id}`，full GET 不接 |
| R25 | Edge bulk import | 纳入 M13（等价项，禁止删减），走通用 CSV 导入对话框形态 |
| R26 | EdgeScopePageShell | 页面私有仿写（`pages/edges/detail/scope-shell.tsx`），不泛型化共享 |
| R27 | locale 域文件与 menu key | `en-US/edge.ts`+`zh-CN/edge.ts`、`en-US/ota.ts`+`zh-CN/ota.ts`（`pages.edge.*`/`pages.ota.*`）+ `menu.edge.*`，过 parity 门禁 |
| R28 | 页面测试落位 | 列表/详情/子页测试照 customers 作用域页范式；Upload 真 input 注入；EventsPanel 参数化回归面同 PR 收口 |
| R29 | e2e | 真后端可 seed Edge/OTA（无外部依赖），按 m12 notes §7.2 登记 smoke；sync 真实下发留人工 |
| R30 | waves 切分 | 六波：服务层 → OTA 页族 → Edge 列表 → Edge 详情 → 子实体五页 → 消费侧闭环收尾 |

## 1. 裁决明细

### A. Edge 形态与复用（主责域）

**R01 子实体页形态**
【决议】照 ngx 做平级路由列表页（`/edges/:id/devices|assets|entityViews|dashboards|ruleChains`，各 `hideInMenu: true`），每页按 customers 作用域页样板仿写（约 300 行/页），不做「Edge 详情内嵌实体 tab」。路由段名沿 ngx 驼峰（`entityViews`/`ruleChains`），react-router 按路径长度自动优先于 `/edges/:id`（先例 `config/routes.ts:233-262` 注释）。
【依据】ngx 是平级路由非内嵌（`ui-ngx/.../edge/edge-routing.module.ts:100-302`，侦察 edge §结论先行）；antd 仓内已验证范式 = `pages/customers/{users,devices,assets,dashboards}` 四页（`customers/devices/index.tsx:1-12` 头注自述「mirror ui-ngx customer-scope minus tenant-side extras」）；m13-implementation-notes §3 红线：五个 v1 列表页无注入缝，改造即重写。
【分歧】无。两份侦察同向 + 仓内先例唯一。

**R02 子实体取数端点**
【决议】五页全部走专属端点：assets/entityViews/dashboards/ruleChains 用 `GET /api/edge/{edgeId}/...`，设备页用 `GET /api/edge/{edgeId}/devices`（放弃 ngx 的 POST device-info-query 通道）。这些函数全部新增在 `edge.ts`，**不改** `getTenantDevices` 等既有函数的 filter（后端不吃，改了也没用）。
【依据】后端契约 §1 关联实体表：GET 端点齐全且支持 `type`/`deviceProfileId`/`active` 可选参数；ngx 用 POST query 是因为其取数管线必须携带 `DeviceInfoFilter`（`devices-table-config.resolver.ts:270-287`），antd 无此包袱。
【分歧/需复核（局部）】ngx edge 子页设备表头无条件挂 `tb-device-info-filter`（`device-table-header.component.html:18-20` + resolver `:140` 无 scope 条件），即 ngx 该页有 type/profile/active 过滤 UI。首波 antd 不建过滤器 UI（对齐 antd 作用域页形态），**登记为行为契约项**交验收确认；若判必须等价，第二波用 GET 端点既有 query 参数补齐，成本一周内。技术无障碍，纯范围取舍。

**R03 Edge 详情 tab 集合**
【决议】`details`（antd 惯例，承载 Edge 表单：name/type/label/只读 routingKey/secret/description）+ ngx 七 tab 原样：attributes（SERVER_SCOPE）、latest-telemetry（禁 scope 选择）、alarms、events（默认 ERROR）、downlinks（TA-only）、relations、audit-logs（TA-only）。**不挂 version-control**（ngx Edge 无此 tab，grep ngx VC 组件零 EDGE 引用）；不挂 calculated-fields/alarm-rules（同无）。tab 装配走 `assembleDetailTabs`（`components/entities/detail/detail-tabs.tsx:46-57`），TA-only 过滤白拿；闭集联合类型需在 `detail-tab-keys.ts:5-16` 增补 `'downlinks'`（纯增量，编译安全）；tab URL state 照域私有范式新建 `pages/edges/detail/url-state.ts`（各域自持 `DETAIL_TABS`/`TA_ONLY_DETAIL_TABS`，先例 `pages/devices/detail/url-state.ts:24-38`）。只挂激活 tab（`destroyOnHidden`，`detail-tabs.tsx` 头注 5-8 明令）。
【依据】ngx `pages/edge/edge-tabs.component.html:18-71`（本仓 4.4.0 逐行核过：七 tab、downlinks 与 audit-logs 挂 `TENANT_ADMIN` 条件、events 传 `defaultEventType=ERROR` 无 disabledEventTypes → 事件类型集合实为 ERROR/LC_EVENT/STATS 三种，R04 据此参数化）；m13-implementation-notes §12.4 提出「version-control 直接挂」系其对 ngx 的过度外推，**修正**。
【分歧】无（修正后无歧义）。

**R04 EventsPanel 改造 vs 复制**
【决议】参数化共享件，不复制。props 从 `{ deviceId, tenantId }` 改为 `{ entityId: EntityId; tenantId: string; eventTypes?: EventTypeId[] }`（类型集合缺省 = 现值，devices 调用点行为不变）；Edge 传 `['ERROR','LC_EVENT','STATS']`。列集维持现有 createdTime/type/summary + body 展开行（ngx ERROR 事件列 = 时间/server/method/error 弹窗，antd 的通用三列 + JSON 展开是已验收的 M8 行为契约形态，沿用）。
【依据】DEVICE 绑定只有 `EventsPanel.tsx:52-55` 一处构造 `entityId`；底层 `getEvents(entityId, tenantId, eventType, pageLink)` 本就是通用签名（`services/tb/events.ts:38-43`）；ngx 上游就是同一 `tb-event-table` 组件跨实体复用（`edge-tabs.component.html:48`），参数化才是照抄上游结构。
【分歧】无。回归面（`EventsPanel.test.tsx` + `devices/detail/index.test.tsx` 断言、`devices/detail/index.tsx:410-415` 调用点）一次 PR 内同步改完，不做兼容垫片（notes §11 红线沿用）。

**R05 Downlinks tab 落位与实现**
【决议】必做等价项，**不接受侦察文档「P1 可降级」的定位**——它是 Edge 同步事件在全前端的唯一视图，砍掉即删减 TB 已有操作。落位：`pages/edges/detail/DownlinksPanel.tsx`（域私有新面板，**不复用** EventsPanel：端点、派生状态、列集全不同）。实现要点：(1) 挂载时先读 Edge 的 SERVER_SCOPE 属性 `queueStartTs` 再取 `GET /api/edge/{id}/events`（ngx `edge-downlink-table-config.ts:89-101` 两段管线）；(2) status 为派生值：`createdTime <= queueStartTs` → Deployed（黑），否则 Pending（灰）——antd 走 token（沿 M11 零内联色值口径，不搬 ngx 硬编码色）；(3) data 查看按钮：非 ADMIN_SETTINGS 且非 DELETED 才可点，内容按类型回查实体或直接用 body（ngx `entity.service.ts:1509-1550`），JSON 弹窗渲染，回查失败 toast；(4) 无搜索/新增/删除/多选。
【依据】后端契约 §1 EdgeEventController（唯一消费方即此表）+ §5.3：`sortProperty/sortOrder` 被服务端 `SORT_ORDERS=[seqId]` 硬编码覆盖，**恒为 seqId ASC**——ngx 声明的 createdTime DESC 实际从不生效。故 antd 直渲服务端返回顺序即为等价（不许造「新的在前」假象）；「客户端倒排/时间窗倒序」登记为增强项不做。TTL 清理致历史事件可能消失，属后端事实，spec 登记一句即可。
【分歧】无技术分歧；降级倾向被推翻（§2 追踪）。

**R06 规则链子页范围**
【决议】Edge 内 ruleChains 子页进 M13（TA-only）：分配已有链、Set root（确认后 `POST /api/edge/{edgeId}/{ruleChainId}/root`，根链禁 unassign）、root 复选列、进页前 `missingToRelatedRuleChains` 缺失检查（antd 形态：进页 loading 中检查 + Alert 列缺失，替代 ngx 的 alert 阻断）。规则链模板管理页（auto-assign/template root/EDGE 类型导入）与 EDGE 画布入口**登记边界外**，归规则链里程碑（M14 段或专项）。
【依据】侦察 edge §11.4 倾向 + backend 契约 §1 RuleChain 行（sortProperty 限 `createdTime,name,root`）；EDGE 画布属规则链域（ngx 也只是换 `ruleChainType` 进既有画布，`edge-routing.module.ts:291,337,360`），antd 画布能力另行评估，不混入 M13。
【分歧】无。

**R07 指引对话框范围**
【决议】安装 + 升级指引**都做**，一条裁决收口：同一对话框组件三态标题（新建后自动弹 + 主动打开安装 + 升级），markdown 由后端拼好前端纯渲染（`GET /api/edge/instructions/install/{edgeId}/{method}` / `upgrade/{edgeVersion}/{method}`），Docker/Ubuntu/CentOS 三 tab，已加载内容按 method 缓存，「不再显示」写用户设置 `notDisplayInstructionsAfterAddEdge`。详情按钮区二态：`GET /api/edge/{id}/upgrade/available` 为 false → Install & Connect Instructions，true → Upgrade Instructions。
【依据】后端三端点全部在场且 TENANT 可用（backend 契约 §1 :537-588）；ngx 详情按钮区本就是二态（侦察 edge §4 :116-134），升级分支不是「做不了」而是侦察想砍量——砍掉即删减（有升级可用的租户少了一个 TB 已有操作）。组件三态标题已含升级态，增量成本 ≈ 一个布尔查询。
【分歧】无。**推翻**侦察 §11.5「M13 只做安装指引」倾向（§2 追踪）；「能力探测 404 隐藏」的防御不必做——端点在契约表内，404 只会出现在异常部署。

**R08 key/secret 生成位置**
【决议】前端生成对齐 ngx（guid 风格 routingKey + 20 位随机 secret），表单内禁用只读展示，customer_user 场景本波不涉及（R11）。**UI 无「重新生成入口」照 ngx 等价保留**——这是上游有意的形态还是缺口不得而知，登记为缺口 issue（后端支持改：凭证并入实体字段直接 PUT），不混入 M13。
【依据】侦察 edge §3（`edge.component.ts:138-143` 本地生成）+ backend 契约 §5.8（服务端不生成，必须前端传）。
【分歧】无。

**R09 sync 反馈形态**
【决议】fire-and-forget 等价：点击 → mutation loading（按钮转圈，防重复触发）→ 200 成功 toast「同步进程已启动」；失败走 `serverErrorText`。不做进度轮询/状态订阅（后端无查询端点）。超时兜底交给 tbHttp 全局超时，不为 sync 单开机制。
【依据】ngx `edges-table-config.resolver.ts:517-533`（成功回调发 toast，无 error 分支处理、无轮询）；backend 契约 §1（DeferredResult 阻塞至边端应答）+ §7.7（悬挂时长未验证）。loading 态属允许的增量增强，弥补 ngx 点完无反馈窗口。
【分歧】无。

**R10 edges.enabled 功能开关**
【决议】M13 **不接**功能开关进路由/菜单/access（登记不实施）。理由（第一性）：后端 `edges.enabled` 默认 true（`thingsboard.yml:1620-1622`）；fork 产品方向即重实现 Edge（MEMORY：类 PE 功能重实现），自有部署不存在「关掉 Edge」的真实场景；接入需动 `getInitialState` 引导期取 `/api/edges/enabled` + access 组合 key + 菜单过滤时序处理——为不存在的部署形态预建机制，违背「不为未发生的需求提前抽象」。触发条件已留档：出现真实关闭需求时，走 `getInitialState` 取布尔 + `access.ts` 增组合 key 一条路即可（菜单树过滤自动跟随）。
【依据】antd 现无任何 system-params/edgesSupportEnabled 管线（全仓 grep 仅 tenants/users 页一处无关命中）；access key 全集 6 个（`src/access.ts:20-27`）无功能开关维度。
【分歧】无。**推翻**侦察 §11.7「统一受开关控制」倾向（§2 追踪）；ngx 的 CU 菜单恒显不一致随 R11 一并消解。

**R11 CUSTOMER_USER Edge 只读面**
【决议】TA 面全量为主交付（M13 核心验收载体）。CU 只读面（customer-scope Edge 列表 + 只读详情 + 四个只读子实体页 + 设备凭据查看）是 ngx 真实存在的能力面，**砍掉属删减行为，必须显式拍板**：方案 (a) 随 M13 以 R01 同款作用域页形态低价补齐（同组件加 scope 变体，增量 ≈ 一个 customers/users 页）；方案 (b) spec 显式登记「CU Edge 面后置」为已知删减项。二选一归 spec 定稿，不由架构镜头独断。
【依据】ngx CU 面 = 菜单 edge_instances（`menu.models.ts:737-746`）+ `/customers/:customerId/edgeInstances`（侦察 edge §1）+ 只读详情与四子页（§8）；m13-implementation-notes §11 红线写「页面内 CU 不可达」但未声明这是登记过的删减决定；后端 CU 读路径在案（backend 契约 §4 权限矩阵）。连带裁决 R11b（吸收 backend §7.4）：**edge secret 脱敏不做**——TA 是信任面，ngx 原样展示 + 复制按钮即等价；CU 面若落地（方案 a），照 ngx 隐藏 key/secret 行（`edge.component.html:166,178`），不存在第三个选项。
【分歧/需复核】是。全文档唯一上交项，见 §3。

### B. OTA

**R13 OTA 路由/access（含 N1/N2/B3 归并）**
【决议】顶级平铺：`{ name:'otaPackages', path:'/otaPackages', access:'canTenantAdmin', component:'./ota/packages' }` + `{ name:'otaPackages.detail', path:'/otaPackages/:id', hideInMenu:true }`。不并入 Edge 组（ngx OTA 独立于 edge_management，挂 TENANT「Entities」分组，`menu.models.ts:768-777,945-955`）；不建 SA/CU 面（ngx 路由 `auth=[TENANT_ADMIN]`；CU 的后端只读能力前端不建入口，登记权限契约一条，backend §7.3 可忽略）。列表无 type（FIRMWARE/SOFTWARE）过滤器——ngx 就没有，spec 别写成已有能力（侦察 ota §2 明诫）。
【依据】侦察 ota §1、notes §12.1/12.2；backend 契约 §1 OtaPackageController 权限列。
【分歧】无。

**R16 checksum 归属**
【决议】后端算。前端只提供：算法下拉（7 枚举，默认 SHA256）+ 可选 checksum 输入 + 「Auto-generate checksum」复选框（默认勾选，勾选时隐藏算法与 checksum 输入，但**算法仍随 multipart 提交**——后端 `checksumAlgorithm` 是必填参数）。前端从不本地算哈希；「上传前预览哈希」若要做另立增强，不改后端口径。
【依据】backend 契约 §3（`DefaultTbOtaPackageService.java:71-73` 缺省现算；controller :152 必填）+ 侦察 ota §3（ngx 组件在勾选态传默认算法）。
【分歧】无。

**R17 multipart 直传通道（含 N8 归并）**
【决议】ui-antd 直连后端：`FormData` 直接作 `tbHttp.post` body，不设 Content-Type（交浏览器带 boundary），无 BFF/代理中转；前端不设文件大小上限（ngx OTA 未设，resources 的 maxResourceSize 不适用，登记不实施）。`ota.endpoints.test.ts` 先按 openapi 快照 + ngx 行为断 URL 与字段，标注「checksum 必填性与 file 字段名以后端实测为准」（backend §7.8 的实测要求落在 wave 1 验证步骤，不阻塞写码）。
【依据】先例 `services/tb/image.ts:94-105`、`resource.ts:138/181`；notes §5。
【分歧】无。

**R18 OTA 消费侧集成（O3，含事实修正）**
【决议】随 M13 末波补齐闭环，缺口比侦察文档描述的小一半：device-profile 表单的 firmware/software 选择器**已存在**（`components/profiles/selects.tsx:169` OtaPackageSelect + `pages/device-profiles/detail/GeneralTab.tsx:243-263`），真正缺的是两件：(1) device 表单补两个 OtaPackageSelect（profile 换选时候选联动）；(2) 保存门——firmwareId/softwareId 变更时先 `GET /api/devices/count/{fw|sw}/{entityId}`（`countUpdateDeviceAfterChangePackage`）弹「将影响 N 台设备」确认（两类计数 forkJoin，0 不弹），再保存；device-profile 的 GeneralTab 已追踪 firmwareId/softwareId 脏状态（`GeneralTab.tsx:76-77`），门挂在其保存链上即可。
【依据】修正 notes §1「OTA REST service 全部要新建」——`getOtaPackagesByDeviceProfile` 已在 `services/tb/device-profile.ts:115-129`；ngx 消费面见侦察 ota §5/§7（`confirmDialogUpdatePackage` :117-144）。
【分歧】无（范围上采「随 M13」而非「后置登记」：OTA 包指不到设备则验收者无法闭环验证可见性语义，且实现面小）。

**R19 删除被引用**
【决议】等价：确认弹窗通用警示 → `DELETE` → 后端 400 英文文案经 `serverErrorText` 呈现，即等价达标。前端预检引用/行内禁用登记为增强项不做（`isOtaPackageUsed` 无 REST 端点，预检只能试删或按 profile 详情推断，不值当）。
【依据】backend 契约 §3（外键兜底四约束 + 明确报错文案）、§5.5（400 非 409）；侦察 ota §6 同结论。
【分歧】无。

**R20 编辑保真度**
【决议】编辑态整个表单 disable、仅重新启用 description；title/version/tag 加 readonly 双保险；文件元信息（fileName/dataSize/contentType）只读展示；「保存后不可改」警示文案仅新增态显示。
【依据】backend 契约 §3 更新禁改清单（`BaseOtaPackageDataValidator.java:78-121`，url 有值亦禁改）——照抄创建表单不锁必整表 400；侦察 ota §4。
【分歧】无。

**R21 OTA 详情形态与 VC tab**
【决议】独立详情路由页必做（antd 列表行/名称链接进详情页是既有形态，无抽屉范式；ngx 抽屉+独立页双入口收敛为单入口，「打开详情」可达性不变，行为等价）。详情按钮组五件全做：Download（disabled 条件 `hasData && !url`，URL 型走新窗口外链、文件型走 blob 下载——backend §5.6 URL 型 400 必须前端分流）、Delete、Copy package Id、Copy checksum、Copy direct URL。**Version Control tab 后置 M14**（侦察 ota §8 既定归属；VC 依赖 repository settings 配置面，M14 settings 段才交付，M13 挂上也是无配置不可用态），M13 spec 登记一条「OTA VC tab 见 M14」。
【依据】侦察 ota §4（按钮组 :18-63、VC tab 条件 `isTenantOtaUpdate() && TENANT`）；M14 骨架 §6。
【分歧】无。

**R22 tag 写入时机**
【决议】tag 只在创建表单暴露，保持 pristine 时实时联想 `tag = (title + ' ' + version).trim()`，hint 沿 ngx 文案；编辑态随表单锁死。
【依据】backend §7.8（schema 标 READ_ONLY 但创建请求实际可写，创建后禁改）+ 侦察 ota §3（`ts:77-86` 联动实现）。
【分歧】无。

### C. 服务层 · 类型 · locale · 测试（主责域）

**R14 服务层文件面（含 N6 归并）**
【决议】新建 `services/tb/edge.ts`（列表三 scope/CRUD/子实体分配与反分配/sync/missingToRelated/instructions×2/upgrade available/types/bulk_import）与 `services/tb/ota.ts`（列表/info/save 两步含失败回滚/multipart 上传/blob download/按 profile 查），各带 `*.endpoints.test.ts`（mock `./http` 断 URL + 展平 query，JSDoc 钉 endpoint）；**两者都挂进 `services/tb/index.ts`**。游离形态（events/image/audit-log 等直 import 路径）是 M8 前的历史存量，不是范式：M12 的 notification 就挂了 index（`index.ts:26`），新域沿最近的里程碑先例；存量不动（不顺手重构）。
【依据】`index.ts:13-27` 现状逐行核过；notes §12.6 的疑虑以「沿 notification 先例」收口。
【分歧】无。

**R15 类型文件落位**
【决议】手写权威类型 `types/tb/edge.ts`（EdgeInfo/Edge/EdgeEvent/EdgeInstructions/EdgeEventType/EdgeEventActionType 枚举与译文基础量）与 `types/tb/ota.ts`（OtaPackageInfo/UpdateOtaPackageInfo/ChecksumAlgorithm/OtaPackageType），`types/tb/index.ts` 各加一行 export；分页复用 `types/tb/page.ts`；openapi 快照（edge 25 条 / otaPackage 6 条）仅参考不产权威。**OTA 消费侧类型不迁**：`OtaPackageDigest` 与 `getOtaPackagesByDeviceProfile` 留在 `types/tb/device-profile.ts` + `services/tb/device-profile.ts` 原位（消费方 device-profile 页与其测试已 import，搬迁是无谓 churn；ota.ts 与其 JSDoc 互相引用即可）。
【依据】notes §8/§10 + 本裁决对 notes §1 的事实修正（§2）；`EntityType` 枚举已含 `EDGE`/`OTA_PACKAGE`（`types/tb/entity.ts:28-29`）。
【分歧】无。

**R23 Edge 列表取数端点口径（B1 落地）**
【决议】前端列表一律用 `edgeInfos` 系端点：tenant → `GET /api/tenant/edgeInfos`，customer 系 → `GET /api/customer/{id}/edgeInfos`（返回 EdgeInfo，自带 customerTitle/customerIsPublic）。**不接**返回裸 `Edge` 的三个 `/edges`、`/tenant/edges`、`/customer/{id}/edges` 端点做列表（customerTitle 排序大概率 500，backend §5.2），排序规避随端点选择自动完成；显式传 `sortProperty=createdTime&sortOrder=DESC`（backend §5.1：缺省是 id ASC 不是时间序）。`/api/edges?edgeIds=`/`list` 与关系查询 POST `/api/edges` 本波无消费方不接（登记）。
【依据】backend 契约 §1/§3/§5.1/§5.2；ngx 三 scope 同用 edgeInfos（侦察 edge §2 :169-185）。
【分歧】无。customerTitle 是否真 500 的实测仍值得做（wave 1 顺手 curl 一次），但结论只影响登记文案，不影响前端选型。

**R24 OTA 详情/表单端点口径（B2 落地）**
【决议】表单载入与详情页一律 `GET /api/otaPackage/info/{id}`；full `GET /api/otaPackage/{id}`（可能 base64 内嵌整个包体，backend §7.2 待实测）**不接**——antd 无任何页面需要 data 字段本体（二进制获取走 download blob 端点）。
【依据】ngx 表单载入同用 info 端点（侦察 ota §5 :65-67）；backend §7.2。
【分歧】无。

**R25 Edge bulk import（B6 收口）**
【决议】纳入 M13，等价项：tenant 列表头部「导入」按钮 + 通用 CSV 导入对话框形态 → `POST /api/edge/bulk_import`。ngx 该按钮在（侦察 edge §2 :350-357，`homeDialogs.importEntities(EDGE)`），砍掉即删减。CSV columnMapping 照 ngx import-export 的 edge 定义搬（实现波核对 `ui-ngx/src/app/shared/import-export/import-export.service.ts:599` 一带的 columns 定义）；前置条件「租户须已存在 edge template root rule chain」的后端报错原样透出即可。**Edge 无导出**（ngx 无，不加）。
【依据】backend §1 bulk_import 行 + §7.6；侦察 edge §2/§9。
【分歧】无。

**R26 EdgeScopePageShell 抽象度（N5+N7 归并）**
【决议】五页全上（等价底线：ngx 五个子实体页全是 TB 已有操作，无一可砍），因此外壳抽象成立：新建**页面私有** `pages/edges/detail/scope-shell.tsx`（仿 `pages/customers/scope-page-shell.tsx:38-83`：title=子页名、面包屑叶=Edge 名、onBack 回 `/edges/:id`、加载失败 Alert），五个子页共用；标题取数仿 `useCustomerScopeTitle` 用 `GET /api/edge/info/{id}`（取 name，顺带拿 customerTitle 备用）。**不升格共享件、不做泛型 ParentScopePageShell**：CustomerScopePageShell 全仓仅 4 个 customer 页消费（grep 证实），两域各持一个 ~45 行外壳是可接受重复，泛型化（参数化取数+回跳+标签）省不了多少行还加一层间接；将来出现第三个父实体作用域域（rule of three）再上提，登记一句即可。无域筛选子页直接用 `createListUrlState`（`pages/customers/list-url-state.ts:35`，纯分页/排序/搜索够用，不扩 filter 键）。
【依据】notes §12.5/12.7 两问归并；`AssignCustomerModal` 等共享件照 notes §2 清单直接用；批量走 `useBatchRun` + `BatchProgressModal`。
【分歧】无。

**R27 locale 域文件与 menu key**
【决议】新建 `en-US/edge.ts` + `zh-CN/edge.ts`（前缀 `pages.edge.*`，含 downlinks/type/action 译名表——ngx `edge.models.ts:100-149` 的 20 种 EdgeEventType + 21 种 EdgeEventActionType 译文照搬口径）、`en-US/ota.ts` + `zh-CN/ota.ts`（`pages.ota.*`）；域文件若超体量可升格 `edge/` 目录（先例 devices/ notifications/ 两种形态并存）。聚合文件 `en-US.ts`/`zh-CN.ts` 各加 import + spread；menu key `menu.edge.*`（组名 + instances）与 `menu.otaPackages` 双语同步；全量 `formatMessage` 带 `defaultMessage`，`npm run check-locale` 过门禁。
【依据】notes §7 + CONTEXT.md:19 目录化约定 + m12 notes §4.3。
【分歧】无。

**R28 页面测试落位**
【决议】页面测试按既有范式落位：Edge 列表 `pages/edges/list/index.test.tsx`、详情 `pages/edges/detail/index.test.tsx`、五个子页各带 `index.test.tsx`（mock 三件套：umi + service 模块 + react-intl async，先例 `pages/customers/devices/index.test.tsx`）；OTA 同构。专项：(1) OTA 上传不 mock antd Upload——真 hidden `input[type=file]` 注入 `new File([...])` 触发 beforeUpload（先例 `pages/dashboards/list/index.test.tsx:362-375`）；(2) blob 下载 mock `components/shared/download-blob` 模块；(3) **EventsPanel 参数化回归面**（`components/devices/detail/EventsPanel.test.tsx` + `devices/detail/index.test.tsx` 断言从 deviceId 改 entityId 入参）与 Edge 详情波同一 PR 收口；(4) DownlinksPanel 的派生状态列写纯函数单测（queueStartTs 边界：createdTime == queueStartTs 判 Deployed，照 ngx `isPending` 为严格大于）；(5) 两步保存失败回滚在 service 层 endpoints.test 钉调用序列（POST info → multipart → 失败 DELETE）。
【依据】notes §9 + m12 notes §7。
【分歧】无。

**R29 e2e**
【决议】真后端 seed 可行（backend §8：Edge/OTA 全 tenant 内 CRUD，无外部依赖，EdgeRootRuleChain 系统自带），按 m12 notes §7.2 登记 smoke：Edge 建删 + OTA 建传删闭环；sync 真实下发/instructions 真实内容需 Edge 实例在线，留人工验收（沿 M12「真实通道留人工」先例）。PUT/DELETE fixture 保数据终态干净（M11 §3.7 口径）。
【依据】backend 契约 §8；notes §12.9 的可行性问已由 backend 侦察正面回答。
【分歧】无。

### D. 落位与 waves（主责域）

**R12 Edge 路由/菜单落位**
【决议】`config/routes.ts` 新增组（照 notifications/resources 的 routes 数组形态，子名相对 → menu id `menu.edge.instances`）：

```ts
{
  name: 'edge',
  icon: /* antd 近似 settings_input_antenna，实现波定 */,
  path: '/edges',
  access: 'canTenantAdmin',   // Edge 是租户域：SA 无菜单，CU 本波无面（R11）
  routes: [
    { path: '/edges', redirect: '/edges/instances' },
    { name: 'instances', path: '/edges/instances', component: './edges/list' },
    { name: 'edges.detail', path: '/edges/:id', component: './edges/detail', hideInMenu: true },
    // 五条作用域子页：平铺隐藏路由，path 长度自动优先
    { name: 'edges.devices', path: '/edges/:id/devices', component: './edges/devices', hideInMenu: true },
    { name: 'edges.assets', path: '/edges/:id/assets', component: './edges/assets', hideInMenu: true },
    { name: 'edges.entityViews', path: '/edges/:id/entityViews', component: './edges/entity-views', hideInMenu: true },
    { name: 'edges.dashboards', path: '/edges/:id/dashboards', component: './edges/dashboards', hideInMenu: true },
    { name: 'edges.ruleChains', path: '/edges/:id/ruleChains', component: './edges/rule-chains', hideInMenu: true },
  ],
},
```

access 全用既有 key（`canTenantAdmin`，`src/access.ts:20-27` 不加新 key）；菜单由树过滤生成绝不手写（routes.ts 头注规矩）。ruleChains 子页的 TA-only 语义在页面内 `useAuthority` 收敛（路由级仍是 canTenantAdmin，CU 本就不可达）。
【依据】notes §6 骨架 + ngx 路由树（侦察 edge §1）；子页组件目录名用连字符（`./edges/entity-views`）沿 antd 目录习惯，路由段保 ngx 驼峰（URL 等价）。
【分歧】无。

**R30 waves 切分（每波一个可合并逻辑单元，commit 保进度）**
【决议】六波，严格序：

1. **服务层 + 类型层**：`types/tb/{edge,ota}.ts` + types index；`services/tb/{edge,ota}.ts` + 两个 endpoints.test（含两步保存回滚序列、checksum 字段断言）；`services/tb/index.ts` 挂两域。纯增量无 UI，可独立合并。顺手实测 B1/B2 两条（curl 确认，登记不改设计）。
2. **OTA 页族**：路由 R13 + 列表页 + OtaPackageDialog 三态（创建双分支/编辑锁死/详情）+ blob 下载与复制三连 + locale + 页面测试。单页域一个单元。
3. **Edge 路由组 + instances 列表**：routes.ts 组 + 列表页（tenant 动作矩阵：新增对话框 key/secret 生成、CSV 导入、分配/解除分配/public、批量分配、manage 五跳、sync、指引对话框自动弹）+ locale。指引对话框组件在本波落地（列表与详情两处消费）。
4. **Edge 详情页**：tab 壳 + url-state + `detail-tab-keys.ts` 增 `downlinks` + 共享五面板挂载 + EventsPanel 参数化（devices 回归同 PR）+ DownlinksPanel（含 queueStartTs 派生列纯函数）+ 详情按钮区动作（copy 三连/二态指引/assign 面）+ 测试。
5. **子实体五页**：scope-shell + 四个同构作用域页（devices/assets/entityViews/dashboards）+ ruleChains 特殊页（Set root/缺失检查）+ AddEntitiesToEdge 分配对话框 + 批量 unassign + locale + 测试。
6. **消费侧闭环 + 收尾**：device 表单 OTA 选择器 + device-profile 保存门 count 确认 + e2e smoke 登记 + 门禁收尾（lint 0 error/tsc/vitest/check-locale）。本波若超限可整体后移为 M13.x 独立交付，前五波价值不受损——登记不阻断。

每波收口跑全量门禁并 commit（限额中断恢复靠逻辑单元 commit 保进度，见仓库经验）；合并顺序即波序，无跨波依赖倒挂。
【依据】ngx 工作量分级（侦察 edge §10：子实体五页最重、ruleChains 次之）+ OTA 单页量级 ≈ M12 templates 一页偏上（侦察 ota §9）。
【分歧】无。

## 2. 与侦察倾向的差异（推翻与修正清单）

| 条目 | 侦察原倾向 | 本裁决 | 性质 |
|---|---|---|---|
| R05 | 侦察 edge §11.3：Downlinks tab「P1 可降级项」 | 必做等价项，不可降级（唯一同步事件视图，降级=删减） | 推翻 |
| R07 | 侦察 edge §11.5：M13 只做安装指引，upgrade 做能力探测 | 安装+升级都做，二态按钮照 ngx（端点齐全，砍=删减） | 推翻 |
| R10 | 侦察 edge §11.7：统一受 edgesSupportEnabled 开关控制 | 不接入，登记不实施（默认 true + fork 部署即用 Edge，接入=预建机制） | 推翻 |
| R15/R18 | notes §1：OTA 的 REST service「全部要新建」 | 消费侧半边已存在（`device-profile.ts:115` + `OtaPackageSelect` + GeneralTab 接线），缺口收窄为 device 表单 + 保存门 | 事实修正 |
| R03 | notes §12.4：version-control「直接挂共享面板」 | 不挂——ngx Edge 详情七 tab 无 version-control（`edge-tabs.component.html` 逐行核实，ngx VC 组件零 EDGE 引用） | 事实修正 |
| R02 | 侦察 edge §11.2 未提过滤头 | 补充披露：ngx edge 子页设备表头含 type/profile/active 过滤 UI，首波不建、登记行为契约项待验收确认 | 补充披露 |

## 3. 仍需用户拍板的偏好项

**技术性偏好项：零。** 30 条裁决全部可在「等价为底线 + 照 ngx 口径 + 仓内既有范式」三准则下唯一推出，无需用户在选项间表达口味。

唯一上交项是 **R11（CUSTOMER_USER Edge 只读面做不做进 M13）**，它不是偏好而是**范围裁决**：技术上两个方案都成立且成本已量化（方案 a ≈ 一个作用域页仿写量；方案 b = spec 显式登记删减），分歧在于 M13 spec 的边界画在哪里——这决定验收清单长什么样，属 spec 定稿人（用户）职权。若用户不表态，默认落方案 b（登记后置），因为它不阻塞前五波任何交付。

## 4. 登记不实施清单（本镜头汇总）

- Edge 功能开关（edges.enabled）接入路由/菜单（R10；触发条件留档）
- Edge 导出（ngx 无此能力，R25 附带确认）
- Edge 重新生成 key/secret 入口（R08，缺口 issue）
- OTA 前端大小上限、上传前哈希预览、删除预检、客户端事件倒排（R17/R16/R19/R05）
- OTA Version Control tab 与 Edge 规则链模板页/EDGE 画布（R21/R06，归 M14 或规则链里程碑）
- OTA full GET 端点、Edge 裸 `/edges` 系列表端点、`/api/edges?edgeIds=` 关系查询（R23/R24，无消费方不接）
- 客户侧 manageEdges 入口按钮：视 R11 拍板结果联动（方案 a 时随 customers/detail 补按钮，方案 b 时一并登记后置）
