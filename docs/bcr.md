# BCR 登记册（Backend Contract Register）

> 机制见 CONTEXT.md「登记册（BCR）」：后端契约缺口的例外登记——一条契约一个条目，绑定消费功能、不实现时的 fallback 与权限镜像源；在阶段边界集中复审。当前所有条目均为**候选（candidate）**：M1 实现期发现，前端已按 fallback 交付，是否补后端端点 / 修上游行为由复审裁决。

## C-1 设备批量操作无专用端点

- **缺口**：批量删除 / 批量（取消）指派客户只能前端逐个扇出单实体端点（选 100 台 = 200 请求）。
- **消费功能**：设备列表多选批量操作（`use-batch-run.ts`）。
- **fallback（已交付）**：`Promise.all` 扇出 + 进度弹窗 + 失败明细；切换点已预留——后端补 `DELETE /api/devices`、`POST /api/customer/{id}/deviceInfos` 批量端点后前端原样切换。
- **权限镜像源**：单实体端点同权限（`DELETE /api/device/{id}`、assign/unassign）。
- **档位建议**：高。
- **复审**：M6 收口前；M2 资产域若复用扇出模式（大概率），提前到 M2 边界。
- **M2 边界复审（2026-09-01）**：已触发——资产 / 实体视图 / 客户作用域页的批量删除、（取消）分配全部以扇出模式交付（进度弹窗 + 失败明细，切换点注释留痕）。结论：维持 fallback，批量端点的后端排期建议随 M3 边界后端会话合议。
- **M3 边界复审（2026-09-02）**：M3 各批量面（告警批 ack / clear / 批删、租户与租户配置批删、profile 批删）继续沿用扇出模式。结论：维持 fallback，批量端点的后端排期建议随 M6 后端会话合议（含 /api/ext 自有通道方案）。

## C-2 entitiesQuery/count 忽略 deviceTypes

- **缺口**：`POST /api/entitiesQuery/count` 只读 `entityFilter`，`DeviceSearchQuery.deviceTypes` 被忽略，与 `/api/devices` find 口径可能不一致。
- **消费功能**：列表页角标计数。
- **fallback（已交付）**：M1 未消费 count（直接用分页 total），无用户可见影响。
- **权限镜像源**：同 find 端点。
- **档位建议**：中。

## C-3 BulkImportResult.errorsList 无行号结构

- **缺口**：CSV 导入结果错误仅 `Array<string>`，无行号定位。
- **消费功能**：设备 CSV 导入结果页（M2 资产导入同源）。
- **fallback（已交付）**：原文列表展示（`created/updated/errors/errorsList`）。
- **档位建议**：低（改 `Array<{line, message}>`）。

## C-4 VC 仓库设置 localOnly 被后端硬编码

- **缺口**：`AdminController.saveRepositorySettings` 硬编码 `settings.setLocalOnly(false)`（源码自注 "only to be used in tests"）——`localOnly` 分支前端不可用。
- **消费功能**：设备 version-control tab 的 auto-commit / 仓库设置。
- **fallback（已交付）**：设置表单不暴露 localOnly；恢复等其余能力不受影响。
- **权限镜像源**：SA 管理设置权限。
- **档位建议**：低（上游有意行为，大概率 wontfix）。

## C-5 VC 仓库设置缺 authMethod 时后端 NPE

- **缺口**：`ProtoUtils.toProto(RepositorySettings)` 在 `authMethod == null` 时 NPE——未完整配置仓库即保存会 500 "Failed to init repository!"。
- **消费功能**：version-control tab 首次配置流。
- **fallback（已交付）**：前端表单将 authMethod 设为必填，规避 500；错误透传仍可用。
- **档位建议**：中（后端应 400 + 明确 errorCode 而非 500）。

## C-6 VC 无变化提交静默 no-op

- **缺口**：内容无变化的重复提交返回 done + 全 0 计数 + `version: null`。
- **消费功能**：version-control tab 提交按钮。
- **fallback（已交付）**：结果按「新增 0」呈现（略含糊，已知）。
- **档位建议**：低。

## C-7 VC 同租户并发操作互卡

- **缺口**：后端按租户串行化 VC load，双发提交 / 恢复会互相阻塞（曾观测 10s 客户端超时）。
- **消费功能**：version-control tab；多 tab 同时操作同租户时触发。
- **fallback（已交付）**：ui-ngx 同样以全局阻塞 loading 规避，M1 未加防重（避免投机抽象）；触发面窄。
- **档位建议**：低～中（若做，参考 ui-ngx `ActionLoadStart` 全局拦截）。

## C-8 VC 恢复配置全空时一次性 500（未稳定复现）

- **缺口**：恢复（restore）配置四项全不勾时后端曾返回一次性 500；事后复验成功，未能稳定复现。
- **消费功能**：version-control tab 恢复流。
- **fallback（已交付）**：错误原文透传正常，无白屏；前端不挡（后端语义即允许空恢复）。
- **档位建议**：观察项（后端岗关注，复现即升档）。

## C-9 用户列表缺账户激活态字段

- **缺口**：`GET /api/users` 列表项不含激活态 / `userCredentialsEnabled`（仅 `GET /api/user/{id}` 经 `BaseController.checkUserInfo` 注入），行菜单按激活态收起操作只能逐行补查。
- **消费功能**：users 列表行操作菜单（展示激活链接 / 启用禁用凭证）。
- **fallback（已交付）**：行菜单首次展开惰性拉详情（react-query 缓存 + 加载占位）。
- **权限镜像源**：同 `GET /api/user/{id}`。
- **档位建议**：低（列表端点补字段即整体消除）。

## C-10 BulkImport 列映射 TAB 分隔符类型失配

- **缺口**：类型侧 `CsvDelimiter='TAB'`（openapi string enum）与后端实收单字符（Character）失配；设备域已带转换 hack，资产导入同源复用。
- **消费功能**：设备 / 资产 CSV 导入向导的分隔符选择。
- **fallback（已交付）**：前端转换后提交，功能可用。
- **权限镜像源**：同 bulk_import 端点。
- **档位建议**：低（修 openapi 注解或前端统一 helper，二选一）。

## C-11 用户无管理员侧「重置密码」端点

- **缺口**：后端无 resetPassword 端点；已激活用户没有管理员侧重置密码能力（ui-ngx 同缺，激活链接仅对未激活用户可出）。
- **消费功能**：users 域「重置密码」操作（M2 以「展示激活链接 + 重发激活」交付，spec 口径已微调注记）。
- **fallback（已交付）**：parity 即如此；若产品需要，需后端新端点（/api/ext 或上游贡献）。
- **权限镜像源**：TENANT_ADMIN 用户管理权限。
- **档位建议**：低（上游同缺；可归类 PE / 本土化另开图考虑）。

## C-12 /api/v2/alarms 缺 searchPropagatedAlarms 参数

- **缺口**：REST 种子端点 `GET /api/v2/alarms` 不接受 `searchPropagatedAlarms`，该开关仅存在于 WS AlarmDataQuery 契约——REST 与 WS 过滤口径不一致。
- **消费功能**：全局告警页「传播告警」开关（URL `?propagated=1`）。
- **fallback（已交付）**：开关只作用于 WS 实时通道；REST 首帧 / 翻页种子不按传播过滤，开关打开时刷新或翻页可能短暂混入非传播告警（服务端注释留痕）。
- **权限镜像源**：同 `/api/v2/alarms`（TA / CU 作用域由服务端裁定）。
- **档位建议**：中（v2 端点补 query 参数即整体消除）。

## C-13 alarm-rules 无导出

- **缺口**：告警规则无导出能力；ui-ngx 的行级 export 为客户端 JSON 序列化（无后端端点依赖），本实现未做。
- **消费功能**：全局 alarm-rules tab 行操作。
- **fallback（已交付）**：无（能力缺席）；CRUD 与实体挂载不受影响，注释留痕「copy / export / events / debug 随 v2」。
- **权限镜像源**：同 `GET /api/alarm/rule/{id}` 读取权限。
- **档位建议**：低（纯前端补齐即可；v2 编辑器阶段顺带）。

## C-14 设备 profile OTA 变更无影响确认弹窗

- **缺口**：切换 profile 的 firmware / software OTA 包时无「影响设备范围」二次确认（ui-ngx 有确认弹窗）。
- **消费功能**：deviceProfile 详情 General tab 的 OtaPackageSelect。
- **fallback（已交付）**：保存走统一未保存守卫 + 错误透传；OTA 变更即保存即生效，无拦截。
- **权限镜像源**：同 `POST /api/deviceProfile`。
- **档位建议**：低～中（纯前端补确认弹窗即可，无需后端变更；M6 复审可转 UI 遗留清单）。

## C-15 LWM2M / SNMP 传输深配置仅 JSON 往返

- **缺口**：deviceProfile 传输配置的 LWM2M 对象/观察表与 SNMP 通信配置无结构化编辑器，仅以可编辑 JSON 往返（深层编辑器随 v2）。
- **消费功能**：deviceProfile 详情 Transport tab 的 LWM2M / SNMP 分支。
- **fallback（已交付）**：JSON 往返保数据不丢（无结构化校验，占位文案已注明 mapping 编辑器随 v2）；DEFAULT / MQTT / COAP 分支结构化表单齐全。
- **权限镜像源**：同 `POST /api/deviceProfile`。
- **档位建议**：低（编辑器随 v2 编辑器阶段；JSON 往返已保 parity 数据面）。

## C-16 device / asset profile 无 JSON 导入

- **缺口**：profile 列表无导入入口（ui-ngx 支持 profile JSON 导入）。
- **消费功能**：deviceProfiles / assetProfiles 列表工具栏。
- **fallback（已交付）**：无；导出已交付（单行 export、strip externalId），跨环境迁移可「导出 → 手工重建」过渡。
- **权限镜像源**：同 `POST /api/deviceProfile`、`POST /api/assetProfile`。
- **档位建议**：低（纯前端能力，随批量/导入需求排期）。

## C-17 2FA 强制策略租户/配置选择器降级 tags

- **缺口**：two-fa 强制策略（`enforcedUsersFilter.type=TENANT_ADMINISTRATORS`）的 `tenantsIds` / `tenantProfilesIds` 前端无实体选择器，降级为裸 tags 输入（按 UUID 串提交）。
- **消费功能**：settings 两步验证页的策略强制区。
- **fallback（已交付）**：tags 输入契约不变（服务端语义一致），非法 UUID 依赖后端错误原文透传。
- **权限镜像源**：SA 管理设置权限。
- **档位建议**：低（纯前端增强，无需后端变更）。

## C-18 oauth2 domains/clients 表格分页为本地状态

- **缺口**：oauth2 设置页域名 / 客户端表格的分页、排序未进 URL 也不走服务端（列表端点一次性拉全量，本地分页）。
- **消费功能**：settings OAuth2 页两个 tab 的表格。
- **fallback（已交付）**：本地分页形态可用；规模上来前无用户可见影响。
- **权限镜像源**：SA 管理设置权限。
- **档位建议**：低（登记防遗忘；随数据规模再评估服务端分页）。

---
登记：M1 终验收（2026-09-01）；M2 终验收（2026-09-01）增补 C-9～C-11，并触发 C-1 提前复审（结论：维持 fallback）；M3 终验收（2026-09-02）增补 C-12～C-18，C-1 M3 边界复审维持 fallback（批量端点排期随 M6 后端会话合议）。复审节点：M6 收口前集中复审。
