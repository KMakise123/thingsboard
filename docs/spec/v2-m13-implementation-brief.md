# v2 M13 实现清单（Edge + OTA）

> 状态：随 M13 开工落盘（2026-09-06）。实现者（agent 或人）动手前必读本文 + `docs/agents/m13-implementation-notes.md`；验收载体 = `docs/spec/v2-subsystems-acceptance.md` §5（已定稿）。M12 收尾后本文件可归档。

## 0. 必读材料与优先级

1. 本文（waves 切分 + 已定裁决 + wire 契约）
2. `docs/spec/v2-subsystems-acceptance.md` §5（验收条目，实现不得砍条目）
3. `docs/agents/m13-implementation-notes.md`（ui-antd 落位范式：可复用件清单、customers 作用域页样板、上传/下载先例）
4. `docs/agents/m13-panel-arch.md`（30 条架构裁决 R01–R30，含目录/路由/服务层/测试落位）
5. 域侦察按需查锚点：`m13-ngx-inventory-edge.md` / `m13-ngx-inventory-ota.md` / `m13-backend-contract.md`
6. 通用范式：`docs/agents/m12-implementation-notes.md`（服务层/列表页/表单/测试范式，M13 不重复抄）

## 1. 已定裁决（不可再议项，合议留痕在 panel 三份文档）

| 议题 | 定案 |
|---|---|
| 子实体页形态 | 平级路由列表页（照 customers 作用域页样板仿写，R01/R26），域内外壳页面私有 `pages/edges/detail/scope-shell.tsx` |
| Edge 详情 tab | details + 七通用 tab；EventsPanel **参数化共享件**（`entityId` + `eventTypes?` 入 props，devices 调用点同 PR 回归，R03/R04）；Downlinks 独立新面板（R05） |
| Downlinks 顺序 | 服务端 seqId ASC **直渲**（ngx 复核定案）；客户端倒排 = §5.6 增强 |
| 取数端点 | Edge 列表一律 `edgeInfos` 族；OTA 表单/详情一律 `/otaPackage/info/{id}`；显式 `createdTime DESC`（R23/R24） |
| key/secret | 前端本地生成（guid + 20 位随机），保存后恒只读（R08） |
| OTA 保存 | 两步链 + 失败回滚删 info；checksum 后端算；创建即定型（R16/R17/R20/R22） |
| OTA 详情形态 | 独立详情路由页（antd 无抽屉范式，双入口收敛单入口，R21）；VC tab 归 M14 |
| 规则链模板页 | **进 M13**（范围镜头定案，范围不减）；排在子实体页波；若体量超载，其「新建/导入 + 画布入口」子项可作 M13.x 快补，**列表/Set template root/auto-assign 不后移** |
| edges.enabled 开关 | 不接（有意偏离登记 §5.7；R10） |
| CU 只读面 | **随 M13 交付**（用户拍板 2026-09-06）：列表/详情/四子页只读变体 + 设备凭据可见；ruleChains 子页/模板页/Downlinks/audit-logs 对 CU 不可达 |
| bulk_import | 进 M13（R25）；CSV columnMapping 照 ngx `import-export.service.ts:599` 一带搬 |
| 服务层挂载 | `edge.ts`/`ota.ts` 都挂 `services/tb/index.ts`（沿 notification 先例，R14）；OTA 消费侧函数留 device-profile.ts 不迁（R15/R18） |
| sync | fire-and-forget toast + 按钮 loading；无轮询（R09） |
| 指引对话框 | 安装 + 升级二态都做，三 method tab，markdown 后端拼好纯渲染（R07） |

## 2. 服务层 wire 契约细节（实测 + 契约盘点结论，写码时直接照做）

- **deviceProfileId 一律对象形式**：建 OTA 包请求体 `"deviceProfileId": {"entityType":"DEVICE_PROFILE","id":"..."}`（实测裸字符串建包失败）；同理其余 EntityId 字段照 `types/tb/entity.ts` 既有对象形态。
- **无 deviceProfileId 的包传文件必 500**（后端 NPE，§5.7）：前端表单 deviceProfileId 必填即可规避，service 层不做额外防御。
- OTA 两步链（`ota.ts` 内封装为一个函数保回滚语义）：`POST /api/otaPackage`（info，剥 file/checksum）→ 成功后 multipart `POST /api/otaPackage/{id}?checksumAlgorithm=<必填>&checksum=<可选>`（FormData：`file` 字段；不手动设 Content-Type）→ 失败 `DELETE /api/otaPackage/{id}` 回滚。
- Edge 列表三 scope：`GET /api/tenant/edgeInfos`、`GET /api/customer/{customerId}/edgeInfos`（都带 `type` 可选）；**不接**裸 `/edges` 系做列表。
- Edge 子实体取数（五页）：`GET /api/edge/{edgeId}/assets|devices|entityViews|dashboards|ruleChains`（devices 用 GET，带 `type`/`deviceProfileId`/`active` 可选参数——子页过滤器走这些 query）。
- 分配/解除：照 `m13-backend-contract.md` §1 关联实体表（unassign 多为 `DELETE /api/edge/{edgeId}/asset/{assetId}` 形态，逐条 + useBatchRun 批量）。
- 指引：`GET /api/edge/instructions/install/{edgeId}/{method}`、`GET /api/edge/instructions/upgrade/{edgeVersion}/{method}`、`GET /api/edge/{id}/upgrade/available`。
- 模板页：`GET /api/ruleChain/autoAssignToEdgeRuleChains`、Set template root / auto-assign 开关端点照契约表；`GET /api/edge/missingToRelatedRuleChains/{id}`。
- sync：`POST /api/edge/sync/{id}`（DeferredResult 阻塞 ≤20s，后端有硬超时）。
- 下载：blob 走 `tbHttp.request` + `downloadBlob`（先例 `image.ts`）；URL 型包 download 端点会 400——前端按 `url` 字段分流，不调端点。

## 3. Waves（严格序；每波收口跑全量门禁并独立 commit，限额中断可从任意波续做）

### Wave 1 —— 服务层 + 类型层（纯增量，无 UI）
- `types/tb/edge.ts`（EdgeInfo/Edge/EdgeEvent/EdgeInstructions/EdgeEventType 20 种/EdgeEventActionType 21 种）+ `types/tb/ota.ts`（OtaPackageInfo/UpdateOtaPackageInfo/ChecksumAlgorithm 7 值/OtaPackageType）；`types/tb/index.ts` 各加 export。
- `services/tb/edge.ts` + `services/tb/ota.ts` + 两个 `*.endpoints.test.ts`（mock `./http` 断 URL + 展平 query；两步保存回滚序列钉调用顺序；multipart 断 FormData 字段）；挂 `services/tb/index.ts`。
- 门禁：`npm run lint`（biome + check-locale + tsc）、`npx vitest run` 相关文件全绿 → commit。

### Wave 2 —— OTA 页族
- 路由 R13（`/otaPackages` + `:id` 详情，`canTenantAdmin`）；列表页（九列 + copy 单元格）+ 新增/编辑表单（双分支联动 + 两步保存 + 编辑锁死）+ 详情按钮组五件（Download 分流）+ 删除兜底 400 呈现 + locale（`pages.ota.*` 双语 + `menu.otaPackages`）+ 页面测试（Upload 真 input 注入先例 `pages/dashboards/list/index.test.tsx:362-375`）。
- 门禁全绿 → commit。

### Wave 3 —— Edge 路由组 + instances 列表
- routes.ts 组（R12：组 access `canTenantOrCustomer`，rule-chains 子项 access `canTenantAdmin`）；列表页 tenant scope（动作矩阵全量 + 新增对话框 key/secret 生成 + CSV 导入 + 批量分配 + sync + 指引对话框组件**本波落地**（列表/详情两处消费，三态标题）+ 自动弹指引与「不再显示」偏好）+ locale。
- 门禁全绿 → commit。

### Wave 4 —— Edge 详情页
- tab 壳 + url-state + `detail-tab-keys.ts` 增 `'downlinks'` + 共享五面板挂载 + **EventsPanel 参数化（devices 回归同 PR 收口）** + DownlinksPanel（queueStartTs 派生列纯函数单测，边界 `createdTime == queueStartTs` 判 Deployed）+ 按钮区动作（复制三连/二态指引/assign 面/sync）+ CU 只读形态（detailsReadonly tab 收缩 + 动作隐藏）+ 测试。
- 门禁全绿 → commit。

### Wave 5 —— 子实体五页 + customer 作用域 + 模板页
- scope-shell + 四个同构作用域页（devices 含三过滤器走 GET query）+ ruleChains 特殊页（Set root/根链禁 unassign/缺失检查 Alert）+ 分配对话框（AddEntitiesToEdge 等价）+ 批量 unassign + `/customers/:id/edges` 作用域页（三入口）+ 模板页（列表/Set template root/auto-assign 必交付；新建/导入/画布入口可 M13.x 快补）+ CU 只读变体 + 子实体详情跳转 + locale + 测试。
- 门禁全绿 → commit。

### Wave 6 —— 消费侧闭环 + 收尾
- device 表单 OTA 双选择器（profile 换选联动）+ device-profile 保存门（`GET /api/devices/count/{fw|sw}/{entityId}` forkJoin 计数，0 不弹）+ notifications rules 触发表单迁移 edge service（M12 连带）+ e2e smoke 登记 #12 + 全量门禁 + spec §5 勾账前置检查。

## 4. 横切要求（每波）

- 硬规矩照 `ui-antd/CLAUDE.md`：Biome only、antd token 零内联色、locale zh/en parity（每处 formatMessage 带 defaultMessage）、TS strict、页面测试 mock 三件套（umi/pro-components/intl）。
- 提交信息：`feat(edge|ota): ... (M13 wave-N)` 风格，逻辑单元即 commit。
- 波内拿不准的裁决回到本文 §1 与 panel-arch 对应 R 条目；两者都没有的，停下问主会话，不自行发明。

## 5. 风险与已知坑速查

- 后端缺省排序 `id ASC` 无时序 → 所有列表显式传 `createdTime DESC`。
- Edge events/Downlinks 排序参数后端不理 → 不传假排序，直渲。
- 裸 `/edges` 系 + customerTitle 排序 500 → 一律 edgeInfos。
- OTA 编辑态若不锁字段 → 保存必 400（后端禁改清单 10 字段）。
- URL 型包 download 400 → 前端分流。
- `checksumAlgorithm` 必填（auto-generate 勾选态也要随 multipart 提交默认算法）。
- 租户无 edge template root rule chain 时建 Edge 报 "Root edge rule chain is not available!"——demo 数据自带模板，走查前置检查确认。
- EventsPanel 参数化时 devices 调用点与既有测试必须同 PR 改完，不留兼容垫片。
