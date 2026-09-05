# M13 验收范围与 spec §5 措辞裁决（panel-scope，工作文档）

> 由 panel-scope 镜头产出（2026-09-06）。依据四份侦察底稿（`m13-ngx-inventory-edge.md`、`m13-ngx-inventory-ota.md`、`m13-backend-contract.md`、`m13-implementation-notes.md`）+ spec `docs/spec/v2-subsystems-acceptance.md` §4（M12 段）措辞样板；关键事实已回源码抽查复核（`edge-routing.module.ts` 全部 auth 数组、`ota-update-routing.module.ts`、`menu.models.ts:1011-1017,1057,954`、edge 目录无 license/cloudEndpoint 功能代码）。
> 结论速览：**范围裁决 23 项**（进 M13 实施 12、登记不实施 3、归 M14/#12 2、实现口径不进 spec 6）；**§5 预计可勾选验收条目 38 条**（5.1×9 + 5.2×7 + 5.3×8 + 5.4×4 + 5.5×10）；**强制偏好项 0 个**（1 条小队内注记，见文末）。

---

## 0. 范围裁决总表

| # | 裁决项 | 定案 | 归属 | 关键依据 |
|---|---|---|---|---|
| 1 | Edge 子实体页形态 | 平级路由列表页（照 ngx），不做详情内嵌 tab；antd 照 customers 作用域页范式仿写 | M13（5.3） | ngx 平级路由 `edge-routing.module.ts:100-302`；antd notes §3 既定范式 |
| 2 | 子实体页全量 vs 首波子集 | 五件全上（assets/devices/entityViews/dashboards/ruleChains），可在 M13 内分波交付但验收范围全量 | M13（5.3） | 「禁止删减」：ngx 五页全有 |
| 3 | Edge 详情 tab 集合 | 钉死 7 tab（attributes/latest telemetry/alarms/events/downlinks/relations/audit logs）；**不挂 version-control tab**（撤销 antd notes 挂共享 VC 面板的建议） | M13（5.2） | ngx `edge-tabs.component.html` 无 VC tab；「ngx 没有的不凭空造」 |
| 4 | events tab 语义 | Events tab = Edge 实体自身 ERROR 事件（照 ngx 对齐）；Edge 同步事件 = Downlinks tab 独立验收，两者都进 | M13（5.2/5.4） | ngx `event.service.ts:37` vs `edge.service.ts:95-99` |
| 5 | 设备子页取数端点 | 行为等价、端点不钉死；首选 GET `/api/edge/{edgeId}/devices`（后端参数已覆盖 type/profileId/active），POST query-filter 仅在 antd 已有封装时用 | 实现口径，不进 spec | backend contract §1；scout-edge 裁决点 2 |
| 6 | 规则链模板页（edge template root / auto-assign） | **进 M13**：列表 + Set Edge template root + auto-assign 开关 + 新建/导入 EDGE 类型 + 缺失检查；EDGE 画布本身归规则链域、只验「EDGE 类型可打开可保存」入口级条目 | M13（5.3） | ngx Edge Management 菜单组就两项，砍模板页=菜单组不完整；Edge 创建强依赖 edge template root（DVE "Root edge rule chain is not available!"）。与 scout-edge 裁决点 4 倾向相反，理由见文末注记 |
| 7 | Downlinks 形态 | Edge 详情内 tab（照 ngx），仅 TENANT_ADMIN；时间分页 + 派生状态 + 按类型回查内容全量对齐 | M13（5.4） | ngx `edge-downlink-table-config.ts` |
| 8 | events 排序坑处理 | 后端 sortProperty 无效（恒 seqId ASC）→ 前端客户端倒排实现「新的在前」，不做假排序参数 | M13（5.4 措辞）+ 5.7 登记 | backend contract §3/§5-3 |
| 9 | key/secret 生成位置 | 前端本地生成（guid + 20 位随机，对齐 ngx 与后端「服务端不生成」契约）；「无重新生成入口」钉死为等价边界 | M13（5.1/5.2 措辞）；重新生成入口=5.6 登记 | ngx `edge.component.ts:138-143`；backend contract §5-8 |
| 10 | sync 反馈形态 | fire-and-forget toast 对齐（成功「同步进程已启动」、失败展示后端 error），loading 态 + 超时兜底，不做轮询假状态 | M13（5.2） | scout-edge 裁决点 8；backend sync 为 DeferredResult 阻塞语义 |
| 11 | 升级指引 | 二态按钮（Install & Connect / Upgrade Instructions）+ 三 method tab 进 M13（同一对话框组件，增量小）；真机走查中 upgrade 分支可降级为「按钮在场」，install 主路径必须驱动 | M13（5.2） | 后端三端点在 fork 均存在；本机仅一套 edge 版本，upgrade 真实触发难构造 |
| 12 | Edge bulk_import | 进 M13（等价：ngx instances 有导入）；无导出钉死 | M13（5.1） | ngx `import-export.service.ts:593-601`；exportEntity 分支无 EDGE |
| 13 | customer 作用域 Edge 列表 | 进 M13 等价范围（/customers/:id/edges + 客户详情按钮 + 列表行内入口 + 分配已有 Edge）；M13 内波次可后置 | M13（5.1） | ngx `customer-routing.module.ts:191-228` |
| 14 | customer_user 菜单恒显不一致 | fork 统一受 edgesSupportEnabled 控制（修正上游不一致），spec 写成权限契约项 + 5.7 登记「有意偏离」 | M13（5.0 措辞） | ngx `menu.models.ts` 过滤只挂三项 |
| 15 | device-profile/device 侧 OTA 选择器 | **进 M13**：两个表单的 firmwareId/softwareId 选择器 + 「变更将影响 N 台设备」确认弹窗——OTA 消费闭环的一半，ngx 有、砍掉即删减 | M13（5.5） | ngx `device-profile.component.html:96-111`、`device.component.html:124-139` |
| 16 | OTA checksum 计算位置 | 后端算（前端只选算法 + 可选填值，对齐 ngx）；前端预览哈希=5.6 登记 | M13（5.5 措辞） | `DefaultTbOtaPackageService.java:71-73`；ngx 前端从不本地算 |
| 17 | OTA 删除被引用交互 | 等价=提交后吃后端 400 明确报错（无前端预检）；预检=5.6 增强（需后端配套端点） | M13（5.5 措辞） | `BaseOtaPackageService.java:195-218` 四条外键报错 |
| 18 | OTA 编辑保真度 | 锁死等价：创建后仅 description 可改（前端锁 + 保存警示文案对齐） | M13（5.5） | `BaseOtaPackageDataValidator.java:78-121` 更新禁改 10 字段 |
| 19 | OTA 详情形态与 VC tab | 表单形态（对话框 vs 独立页）实现自定、操作面按字段对齐；OTA 详情 Version Control tab 归 M14 VC 段裁决 | M14 | scout-ota §8 明确划出 |
| 20 | OTA 菜单归属与 access | OTA 独立顶级菜单项（**不并入 Edge 组**，对齐 ngx OTA 在 Entities 组、独立于 edge_management 的事实）；access=TA-only | M13（5.0 定案） | `ota-update-routing.module.ts:41` 仅 TENANT_ADMIN |
| 21 | license / cloud endpoint / Edge 导出 / 重新生成 secret / 连接状态 UI | 全部登记不实施——ngx 无此面（已回源码证实），spec 用「无」清单钉死不凭空造 | 5.0 边界 + 5.6 登记 | edge 目录 grep 仅版权头命中；scout-edge §9 |
| 22 | e2e 自动化衔接 | 归 #12 基线扩充（沿 M11 §3.8 / M12 4.0 口径）；fork 后端 Edge REST 面完整可用（本机可端到端），smoke seed 可行但不强制，不可行时降级单测需在计划留痕 | #12 | backend contract §8；antd notes 裁决点 9 |
| 23 | M12 遗留迁移连带 | M13 交付 edge service 后回改 notifications rules 触发表单 edge 实体选择（现直用 tbHttp） | M13 收尾连带（5.6 登记） | `ui-antd/src/pages/notifications/rules/trigger-forms.tsx:65-67` |

---

## 1. spec §5 定稿要点（起草稿，随 M13 开工落盘）

### 5.0 通用边界（Edge + OTA 共守，行为契约，非勾选条目）

- 路由族：Edge=`/edges/**`（instances 列表 + `:id` 详情 + 五子实体作用域页 + `rule-chains` 模板页；antd 命名习惯，ngx 原路径 `/edgeManagement/**` 仅语义对照），OTA=`/otaPackages`（列表 + `:id` 详情）。路由级 access 见角色矩阵，页面内用 `useAuthority` 细分。
- 角色矩阵（ngx auth 数组为权威，见 §2 定案）：TENANT_ADMIN 全量；CUSTOMER_USER 仅 Edge 只读面（无 OTA 页面）；SYS_ADMIN 无任何 Edge/OTA 页面——后端契约同口径（SYS 对 Edge/OTA 读写全 ✗，仅 `/api/edges/enabled` 探测放行），spec 措辞钉死「前后端一致无 SYS 视角」。
- 菜单归属（见 §3 定案）：TENANT_ADMIN「Edge Management」组两项（Instances / Rule chain templates）+「OTA updates」独立顶级项；CUSTOMER_USER 顶层「Edge instances」项。
- 功能总开关：菜单显隐走 `edgesSupportEnabled` 运行时开关（后端 `GET /api/edges/enabled` 或 authState 等价探测）；**fork 统一约束含 customer 项**（修正 ngx 恒显不一致，登记 5.7）。开关关闭时 Edge 菜单组整体隐藏，OTA 项不受此开关约束（ngx 同口径）。
- 「等价 + 禁止删减」Edge 域具体化（双向清单钉进 spec 正文）：
  - **ngx 有什么就必须列什么**：instances 三 scope 动作矩阵、导入（bulk_import）、详情七 tab、五子实体页、规则链模板页、Downlinks、指引对话框、OTA 全操作面、device-profile/device OTA 选择器——§5.1–5.5 逐条列全，实现不得以「简化」名义砍条目。
  - **ngx 没有什么就不凭空造**（scout 已证实的「无」清单，spec 原文钉死）：无 SYS_ADMIN 视角、无 Edge license、无 cloud endpoint、无 Edge 导出（仅 bulk import）、无重新生成 key/secret 入口、无 Edge 连接状态 UI（activate/status）、Edge 详情无 credentials tab、无 version-control tab、无「Edge 详情内嵌实体列表」（子实体为平级路由页）、OTA 列表无 type（FIRMWARE/SOFTWARE）过滤器、OTA 无 JSON 导出/导入（"export" 实为下载二进制）、无 Edge activate 确认流。以上任何一项如实现，属能力级增强，须先改 spec 再动手。
- 实体类型注册：EDGE / OTA_PACKAGE 名称、新增文案、空态、搜索占位、helpId（`edges`/`otaUpdates`）、详情 rootPath 语义对齐（锚点 ngx `entity-type.models.ts:197-207,348-358,578-580,688,691`）。
- 列表页沿 v1 既有范式：URL 承载分页/排序/搜索（`createListUrlState` 工厂）、ProTable + useQuery 喂数、批量走 `useBatchRun` + `BatchProgressModal`、默认排序显式传 `createdTime DESC`（后端缺省是 `id ASC`，backend contract §5-1）。
- 取数端点契约：Edge 列表一律用 `edgeInfos` 族端点（`/api/tenant/edgeInfos`、`/api/customer/{id}/edgeInfos`），规避 Edge 非 Info 端点的 customerTitle 排序 500 坑（5.7 登记）；OTA 详情载入用 `/otaPackage/info/{id}`，规避全量 data 回传疑云（5.7 登记）。
- 横切契约（沿 M11 §3.7 口径，随收尾勾账）：i18n `pages.edge.*`/`pages.ota.*` zh/en key 全等（check-locale 门禁）+ 菜单 key 双语；主题零内联色值；数据保全——Edge/OTA fixture 终态全 DELETE、system 资源零改动；门禁 lint 0 error / tsc / vitest 全绿 / check-locale。
- 自动化回归项归 #12 基线扩充（本 spec = 人工验收载体）。

### 5.1 Edge 列表操作面（instances 三 scope，对齐 ngx §2）

- [ ] instances 列表（tenant scope）：列 createdTime/name/type/label/customer/public 复选（tenant 追加后两列），类型筛选下拉（`GET /api/edge/types`，切换重置排序过滤），搜索/分页/排序，默认 createdTime DESC；取数走 `/api/tenant/edgeInfos`（锚点 `edges-table-config.resolver.ts:150-185`）
- [ ] 新增 Edge 对话框：name（必填 ≤255）/type（EDGE 子类型，默认 default）/label（可空 ≤255）/routingKey+secret（**前端本地生成、只读展示**，CU 隐藏）/description；保存成功广播刷新 + 默认自动弹安装指引（勾选「不再显示」写用户偏好 `notDisplayInstructionsAfterAddEdge`）（锚点 `edge.component.ts:71-143`、`edge-instructions-dialog.component.ts:86-93`）
- [ ] 编辑 Edge：key/secret 禁改只读；保存后表单回显含 assignedToCustomer 只读提示 + public 提示（锚点 `edge.component.html:137-146,166-189`）
- [ ] 导入 Edge（tenant）：CSV bulk_import（`POST /api/edge/bulk_import`）；**无导出**（钉死，锚点 `import-export.service.ts:593-601`）
- [ ] 删除：单条 + 勾选批量，仅 tenant（customer scope 的删除按钮实为「解除分配」语义）（锚点 `edges-table-config.resolver.ts:141-143,173-184`）
- [ ] 行内动作矩阵（tenant）：make public（未分配时）/ assign to customer（未分配时）/ unassign（已分配非 public）/ make private（public 时）/ manage assets/devices/entityViews/dashboards/rule chains 五个子页入口 / sync（锚点 `:189-245`）
- [ ] 批量：tenant 批量分配客户；customer scope 批量解除分配（锚点 `:296-315,489-515`）
- [ ] customer 作用域列表（TENANT_ADMIN）：`/customers/:id/edges`（edgesType='customer' 等价页），标题「客户名: Edge instances」；入口三处——客户详情按钮 / 客户列表行内 / 本页头部「分配已有 Edge」对话框（锚点 `customer-routing.module.ts:191-228`、`customers-table-config.resolver.ts:105-118,178-183`）
- [ ] customer_user scope：只读列表（强制以本人 customerId 取数，`edge_customer_user` 语义），删除/分配类操作不可达，详情只读（锚点 `edges-table-config.resolver.ts:105,109-121,263-289`）

### 5.2 Edge 详情页（七通用 tab + 按钮区，对齐 ngx §3/§4）

- [ ] 详情页结构与表单回显：六字段（key/secret 只读，CU 隐藏两行）+ assignedToCustomer/public 只读提示；详情路由 `?tab=` URL state，TA-only tab 手打会被拉回（沿 antd `useDetailTabUrlState` 既有契约）
- [ ] 详情按钮区（isEdit/角色收缩）：make public / assign to customer / unassign / make private / manage 五子实体入口（manage rule chains 仅 tenant）/ delete；CU 全隐藏（锚点 `edge.component.html:19-78`）
- [ ] 复制三连：Copy ID / Copy Edge key / Copy Edge secret（key/secret 对 CU 隐藏），成功均有 toast（锚点 `:79-106`、ts `:114-136`）
- [ ] Sync Edge：`POST /api/edge/sync/{id}`，fire-and-forget toast + 失败 error 展示 + loading/超时兜底；**无状态轮询**（钉死，锚点 ts `:517-533`）
- [ ] 指引二态对话框：无升级 → Install & Connect Instructions、有升级（`GET /api/edge/{id}/upgrade/available`）→ Upgrade Instructions；Docker/Ubuntu/CentOS-RHEL 三 method tab，markdown 由后端拼好前端纯渲染（`GET /api/edge/instructions/install|upgrade/...`）；「不再显示」偏好写入（锚点 `edge-instructions-dialog.component.*`）
- [ ] 七 tab 装配：Attributes（SERVER_SCOPE）/ Latest telemetry（禁 scope 选择）/ Alarms / Events（**Edge 实体自身 ERROR 事件**，`GET /api/events/EDGE/{id}/ERROR`，列=时间/server/method/error 弹窗）/ Downlinks（仅 TA，见 5.4）/ Relations / Audit logs（仅 TA）；只挂激活 tab（`destroyOnHidden` 保 WS 预算红线）（锚点 `edge-tabs.component.html:18-70`）
- [ ] customer_user 只读形态：detailsReadonly，tab 收缩为 attributes/telemetry/alarms/events/relations 五个，sync/指引/复制 key secret/删除全隐藏（锚点 `edge.component.html:94-121`）

### 5.3 Edge 子实体页五件 + 规则链模板页（对齐 ngx §6，本里程碑最重块）

- [ ] 平级路由形态：`/edges/:id/{assets|devices|entityViews|dashboards|ruleChains}` 五条作用域页 + EdgeScopePageShell（标题=「Edge 名: 实体复数」、面包屑、返回详情页）；**不做详情内嵌 tab**（钉死）；CUSTOMER_USER 全部收缩为只读（`edge_customer_user` 语义）
- [ ] assets 子页：列表（`GET /api/edge/{id}/assets`）+ 头部「分配已有资产」对话框（forkJoin 逐条 POST）+ 行内 Unassign + 批量 unassign（锚点 `assets-table-config.resolver.ts:189-191,246-287,322-328`）
- [ ] devices 子页：列表（含 active/deviceProfile 过滤能力）+ 分配对话框 + 行内/批量 unassign + CU 只读**可看凭据**；**edge scope 内不能新建/导入设备、无 manage credentials**（钉死，锚点 `devices-table-config.resolver.ts:270-287,318-366,392-450`）
- [ ] entityViews 子页：同构（fetch `GET /api/edge/{id}/entityViews` + 分配/unassign/批量 + CU 只读）（锚点 `entity-views-table-config.resolver.ts:187-309`）
- [ ] dashboards 子页：列表 + 分配已有 + 行内导出 + unassign + 批量 unassign + 行内打开仪表盘（锚点 `dashboards-table-config.resolver.ts:208-390`）
- [ ] ruleChains 子页（仅 TENANT_ADMIN）：列表 + root 复选列（显示该 Edge 根链）+ 分配已有（仅 EDGE 类型链可挂）+ 行内 Set root（确认后 `POST /api/edge/{edgeId}/{ruleChainId}/root`）+ 根链禁 unassign + 批量 unassign + **进入页面前缺失检查**（`GET /api/edge/missingToRelatedRuleChains/{id}`，缺则 alert 列出）；本页禁新建/删除（锚点 `rulechains-table-config.resolver.ts:137-147,183-225,273-287,447-459`）
- [ ] 规则链模板页 `/edges/rule-chains`（仅 TENANT_ADMIN，Edge Management 组第二项）：auto-assign 链列表（`GET /api/ruleChain/autoAssignToEdgeRuleChains`）+ root 模板复选 + assignToEdge 复选 + 行内 Set Edge template root / Set(Unset) auto-assign to edge + 头部新建/导入（EDGE 类型）+ 打开 EDGE 类型画布（画布本体归规则链域，不重复验收，仅验入口链路）（锚点 `rulechains-table-config.resolver.ts:148-200,251-271,606-612`、`rule-chain.service.ts:265-296`）
- [ ] 子实体详情跳转：assets/devices/entityViews 的 `:entityId` 打开各实体详情（只读按角色）、dashboards 的 `:dashboardId` 打开仪表盘页（锚点 `edge-routing.module.ts:121-137,161-177,201-217,241-255`）

### 5.4 Downlinks tab（Edge 同步事件表，仅租户，对齐 ngx §5）

- [ ] 入口与开关：Edge 详情内 tab 仅 TENANT_ADMIN；时间分页（useTimePageLink 等价）；无搜索/新增/删除/多选/详情面板，表头为空（无时间段选择 UI）（锚点 `edge-downlink-table-config.ts:71-84`）
- [ ] 取数链：先读 Edge 的 SERVER_SCOPE 属性 `queueStartTs`，再 `GET /api/edge/{id}/events`；默认**新的在前**（后端排序参数被忽略，恒 seqId ASC——客户端倒排等价实现，不做假排序参数）（锚点 `:89-94`、backend contract §3）
- [ ] 列与派生状态：createdTime / type（20 种 EdgeEventType 译名）/ action（21 种 EdgeEventActionType 译名）/ entityId / status（**派生值**：createdTime ≤ queueStartTs → Deployed 黑，否则 Pending 灰）/ data 查看（锚点 `:105-145`、`edge.models.ts:100-164`）
- [ ] data 查看链：非 ADMIN_SETTINGS 且非 DELETED 才可点；内容按类型回查实体或直取 body → JSON 弹窗；取不到则错误 toast（锚点 `:159-194`、`entity.service.ts:1509-1550`）

### 5.5 OTA 包管理页操作面（对齐 ngx ota 盘点 §2–§7）

- [ ] 列表「Packages repository」：九列 createdTime/title/version/tag/type/direct-url/fileName/dataSize/checksum（direct-url 与 checksum 单元格内 copy 按钮仅有值时显示；dataSize 人读格式；checksum 显示「算法: 值」），搜索（按 title）/分页/排序，默认 createdTime DESC（锚点 `ota-update-table-config.resolve.ts:60-106,192-195`）
- [ ] 「无」清单钉死：无 type（FIRMWARE/SOFTWARE）列表过滤器（type 仅作列展示）；无 JSON 导出/导入（行内 Download package 是下载二进制不是导出）；无文件大小上限（锚点 scout-ota §2）
- [ ] 新增表单：title（必填 ≤255）/version（必填 ≤255）/tag（≤255，**pristine 时自动联想 `(title + ' ' + version).trim()`**）/deviceProfileId（必填，profile 选择器禁新建禁编辑）/type（FIRMWARE 默认|SOFTWARE）+ 保存警示文案「上传后 title/version/profile/type 不可再改」（锚点 `ota-update.component.*` §3 表）
- [ ] 来源双分支联动：二进制文件（默认，tb-file-input 必填 + generateChecksum 默认勾选→隐藏算法与 checksum 输入；不勾时 7 值算法枚举 MD5/SHA256 默认/SHA384/SHA512/CRC32/MURMUR3_32/MURMUR3_128 + checksum ≤1020 选填）vs 外部 URL（必填 + 非空 pattern；切回文件态清校验、file 转 required）（锚点 ts `:61-123`）
- [ ] 两步保存链：先 `POST /api/otaPackage` 建 info（剥掉 file/checksum 字段）→ 再 multipart `POST /api/otaPackage/{id}?checksumAlgorithm=&checksum=` 传文件；**上传失败自动回滚删除刚建的 info**；**checksum 由后端计算，前端不本地算哈希**（锚点 `ota-package.service.ts:73-107`）
- [ ] 编辑近乎只读：非新增态整表 disable 仅重新启用 description；title/version/tag 双保险 readonly；fileName/dataSize/contentType 只读展示（锚点 ts `:150-153`）
- [ ] 详情按钮组：Download package（disabled 条件 `hasData && !url`；URL 型新窗口打开外链、文件型 blob 下载走 `GET /api/otaPackage/{id}/download` + downloadBlob）/ Delete / Copy package Id / Copy checksum（有值才显示）/ Copy direct URL（有值才显示）（锚点 `ota-update.component.html:18-63`）
- [ ] 删除：单条 + 批量 + 确认四件套；被 device/device profile 引用时**提交后吃后端 400 明确报错**（fk_* 四条消息转译展示，无前端预检——预检属增强登记）（锚点 `resolver:117-126`、`BaseOtaPackageService.java:195-218`）
- [ ] 消费集成（OTA 闭环另一半）：device-profile 表单 firmwareId/softwareId 两个包选择器（候选 `GET /api/otaPackages/{profileId}/{type}` 仅 hasData、显示 `title (version)`、按本 profile 过滤）+ 保存前「变更将影响 N 台设备」确认弹窗（两类计数 forkJoin，0 不弹）；device 表单同款选择器 + profile 换选候选联动（锚点 `device-profile.component.html:96-111`、`device.component.html:124-139`、`ota-package-autocomplete.component.ts:260-279`）
- [ ] 权限契约：CUSTOMER_USER 后端有 3 个只读端点（info/列表×2）但无下载——前端不建入口，页面 TENANT_ADMIN only；真实固件分发/设备侧更新状态追踪归设备域，不在本页（登记）

### 5.6 能力级增强登记（只登记不验收，不设硬门槛）

- Edge 详情 version-control tab（ngx 七 tab 无 VC；`Edge.version` 字段为 VCS 预留，若 M14 VC 域需要另评估，M13 不挂）
- 重新生成 Edge key/secret 入口（ngx 无；若确认为产品缺口另开 issue，不混 M13）
- Edge 导出（ngx 仅 bulk import 无导出）
- Edge 连接状态实时 UI（EdgeConnectionEvent 目前仅被通知规则触发器消费）
- OTA 上传前端哈希预览 / 文件大小上限（ngx 未设上限，resources 的 maxResourceSize 不适用）
- OTA 删除被引用的前端预检（`isOtaPackageUsed` 无 REST 端点，需后端配套）
- OTA 详情页 Version Control tab（归 M14 VC 段）
- M12 遗留迁移连带：notifications rules 触发表单 edge 实体选择从直用 tbHttp（`trigger-forms.tsx:65-67`）迁移至 edge service
- Edge/OTA smoke spec 登记 #12（fork 后端 Edge REST 面可用、seed 可行；不可行时降级单测覆盖，计划留痕）
- antd 全新路由无历史包袱：ngx 的 `edgeInstances → edgeManagement` 301 重定向族不实施
- OTA 页与 Edge service 是否挂 `services/tb/index.ts` 导出面（仓内两种形态并存，随实现波统一）

### 5.7 缺陷登记（照 §4.8 体例：前端已规避 / 待后端修复 / 有意偏离）

- `sortProperty=customerTitle` 在 Edge 非 Info 列表端点（`/api/edges`、`/api/tenant/edges`、`/api/customer/{id}/edges`）疑 500（DAO 无列映射，`JpaEdgeDao.java:84-138`，待实测确认）；前端规避=列表一律用 `edgeInfos` 族端点。
- edge events 端点 `sortProperty/sortOrder` 被后端忽略（`SORT_ORDERS=[seqId]` 硬编码，恒 `seqId ASC`），且存分区表有 TTL 清理（`EdgeEventsCleanUpService.java:35`）；前端客户端倒排规避，「翻旧页」体验受 TTL 限制属后端行为。
- 上游不一致对照：ngx 的 customer 菜单项 edge_instances **不挂** `edgesSupportEnabled` 过滤恒显（`menu.models.ts:1057` 无过滤项）；fork 有意偏离=统一受控，登记为契约修正而非回归。
- `GET /api/otaPackage/{id}` 疑整包 base64 data 回传（transient ByteBuffer 经 Lombok getter 被 Jackson 序列化，待实测）；前端规避=详情载入用 `/otaPackage/info/{id}`。
- `checksumAlgorithm` 传枚举外值后端 500（`IllegalArgumentException` 未转 400，`OtaPackageController.java:159`）；前端下拉白名单规避，不透传自由文本。
- 上游小瑕疵对照：ngx 指引对话框 direct-url 复制复用 checksum 的文案 key（`ota-update.component.ts:156-187`）；antd 侧用独立文案，不复刻。
- OTA download 对 URL 型包直接 400（`OtaPackageController.java:89-91`）：登记为后端行为契约——前端必须按 `url` 字段分流（外链新窗 vs blob 下载），不作缺陷追究。

---

## 2. 角色矩阵定案（ngx auth 数组为权威）

| 能力面 | SYS_ADMIN | TENANT_ADMIN | CUSTOMER_USER |
|---|---|---|---|
| Edge 路由族（列表/详情/五子实体页/模板页） | **无任何路由**（ngx 全部 auth 数组无 SYS，已逐条复核 `edge-routing.module.ts`） | 全量 | 只读面：instances 列表 + 详情 + assets/devices/entityViews/dashboards 四子页（只读）；ruleChains 子页与模板页不可达（仅 TA） |
| Edge ruleChains 子页 / 模板页 / Downlinks tab / Audit logs tab | 无 | 仅此角色 | 不可达 |
| Edge key/secret 展示、sync、指引、删除、分配类动作 | 无 | 全量 | 全隐藏（detailsReadonly） |
| Edge 功能开关 edgesSupportEnabled | 不适用（无菜单） | 约束三项菜单 | **fork 约束**（修正上游恒显） |
| OTA 页面（列表/新增/编辑/详情/下载/删除） | 无 | 全量 | 无页面（后端 3 个只读端点不建入口，权限契约登记 5.5） |
| OTA device-profile/device 消费侧选择器 | 无 | 全量 | 随表单角色走（沿各表单既有契约） |

spec 措辞定案：SYS_ADMIN 行写成一条否定性契约——「SYS_ADMIN 无 Edge/OTA 页面与菜单入口（ngx 与后端契约双证实）；后端对 SYS 放行的 `/api/edges/enabled` 探测仅用于开关探测，不构成页面入口」。CUSTOMER_USER 差异收敛为两条：Edge 只读面（四子页只读 + 设备可看凭据）+ OTA 无入口。

## 3. 菜单归属定案（antd 对齐口径）

- TENANT_ADMIN「Edge Management」组（ngx `menu.models.ts:1011-1017`，icon `settings_input_antenna`）= 两项：Instances（`/edges`，icon 语义 router）+ Rule chain templates（`/edges/rule-chains`，icon `settings_ethernet`）。antd 照 notifications 组形态建组（`config/routes.ts` routes 数组 + `access: 'canTenantAdmin'`）。
- 「OTA updates」独立顶级项（ngx 挂 Entities 组 `:954`、icon `memory`、path `/features/otaUpdates`）：antd 对齐语义不搬字面量——域平铺顶级一项 `/otaPackages`，**不并入 Edge 组**（ngx 中 OTA 与 edge_management 平级无父子关系）。
- CUSTOMER_USER 顶层「Edge instances」项（ngx `:1057`）：antd 对齐为 CU 可见顶层项，菜单树过滤生成；path 等价 `/edges?scope=customer` 或 CU 专用路由，实现定，验收看「CU 登录可见且只读」。
- 显隐开关：tenant 侧三项受 `edgesSupportEnabled`；CU 项 fork 统一也受控（§2）。
- i18n：`menu.edge.*` + `menu.otaPackages` 双语 key-for-key parity；菜单文案对照 ngx en_US `:2881,2887,2956`（Edge instances / Edge management / Rule chain templates）+ OTA updates。

## 4. 真机走查作业单骨架（沿 M11 §3 先例：每条验收项可驱动）

- 前置 fixture（一次性）：run-tb-backend 起后端（PG18 口径）→ tenant 管理员登录 → 确认 edge template root rule chain 在场（新建 Edge 成功即证；失败则先补模板）→ 预建设备×2（一个 active）、资产×2、实体视图×1、仪表盘×1、EDGE 类型普通规则链×1、device profile×1。
- Edge 主链驱动序：新建 Edge（目击 key/secret 本地生成 + 自动弹指引 + 勾「不再显示」）→ 重开指引验证偏好生效 → 列表动作矩阵逐个（public→assign→unassign→private）→ 类型筛选/搜索/排序 → CSV 导入一批 → 详情页复制三连 + sync toast → 指引对话框三 method tab 切换 → 七 tab 逐 tab 点开（Downlinks/Audit 以 TA 身份）→ 五子实体页逐页：分配对话框 → 行内 unassign → 批量 unassign → ruleChains 子页 Set root + 根链禁 unassign + missingToRelated 缺失检查 alert → 模板页 Set Edge template root + auto-assign 开关 → 打开 EDGE 画布（入口链路目击即可）→ customer 作用域页分配已有 Edge → 切 CUSTOMER_USER 登录：菜单快照（顶层 Edge instances 在场）+ 列表/详情只读 + 四子页只读 + 设备凭据可见 + key/secret/sync/删除全隐藏 → 切 SYS_ADMIN 登录：菜单快照零 Edge/OTA 项 → tenant 收尾删除 Edge。
- OTA 主链驱动序：上传二进制包（generateChecksum 默认勾选，落库后回读 checksum 证后端计算）→ 改用不勾自动生成路径（手选 SHA256）→ 新建 URL 型包 → 列表九列 + copy 单元格 → 编辑态锁死（仅 description 可改）→ 文件型 download（blob 落盘）+ URL 型 download（外链新窗）→ 删除空引用包 → device-profile 表单挂 firmware 包 + 触发「影响 N 台设备」确认弹窗 → 尝试删除被 profile 引用的包（吃 400 报错文案）→ 解除引用后删除成功 → fixture 清零。
- Downlinks 专项：对已分配的 Edge 制造若干同步事件（改设备属性等）→ queueStartTs 前后事件分别显示 Deployed/Pending → data 查看弹窗（含 ADMIN_SETTINGS 类禁点对照）→ 取不到内容路径错误 toast（可构造时）。
- 证据形式：每条截图或 DOM 探针 + API 复核（网络面板/curl 回读）；走查全文落 `docs/spec/v2-m13-browser-walkthrough.md`（开工时建），勾账回写 spec §5。
- 数据保全：终态 DELETE 清单（edge、otaPackage、五类分配关系还原、customer 分配解除），system 数据零改动；Edge 删除前先解除 customer 分配避免悬挂。

## 5. 仍需用户拍板的偏好项

**0 个强制项。** 23 项裁决全部可在小队合议框架内定案（技术裁决下放、无用户偏好依赖），理由：ngx auth 数组/菜单结构/「无」清单均为源码可证事实，非偏好；唯一值得留痕的小队内注记：

- **规则链模板页归属（裁决 #6）**：本定案（进 M13）与 scout-ngx-edge 裁决点 4 的倾向（划给规则链里程碑）相反。定案理由有三：① ngx Edge Management 菜单组仅两项，砍模板页则 M13 交付后菜单组仍残缺，「等价 + 禁止删减」直接不满足；② Edge 创建强依赖 edge template root rule chain（后端 DVE 拒绝无模板租户建 Edge），模板页是 Edge 域内生依赖而非纯规则链域功能；③ 模板页除画布外的 8 个端点交互全是表格操作，与子实体页同构，增量成本可控。EDGE 画布本体不重复验收（归规则链域），已把增量压到最小。如 panel-arch 复核认为 M13 体量超载，可降级为「模板页列表 + Set template root + auto-assign 进 M13、导入与画布入口登记后置」，属波次切分而非范围裁剪——该降级不改变验收范围全量的口径。
