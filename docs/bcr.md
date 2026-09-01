# BCR 登记册（Backend Contract Register）

> 机制见 CONTEXT.md「登记册（BCR）」：后端契约缺口的例外登记——一条契约一个条目，绑定消费功能、不实现时的 fallback 与权限镜像源；在阶段边界集中复审。当前所有条目均为**候选（candidate）**：M1 实现期发现，前端已按 fallback 交付，是否补后端端点 / 修上游行为由复审裁决。

## C-1 设备批量操作无专用端点

- **缺口**：批量删除 / 批量（取消）指派客户只能前端逐个扇出单实体端点（选 100 台 = 200 请求）。
- **消费功能**：设备列表多选批量操作（`use-batch-run.ts`）。
- **fallback（已交付）**：`Promise.all` 扇出 + 进度弹窗 + 失败明细；切换点已预留——后端补 `DELETE /api/devices`、`POST /api/customer/{id}/deviceInfos` 批量端点后前端原样切换。
- **权限镜像源**：单实体端点同权限（`DELETE /api/device/{id}`、assign/unassign）。
- **档位建议**：高。
- **复审**：M6 收口前；M2 资产域若复用扇出模式（大概率），提前到 M2 边界。

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

---
登记：M1 终验收（2026-09-01）。复审节点：M6 收口前集中复审；C-1 视 M2 资产域复用情况可提前。
