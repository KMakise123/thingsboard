# v2 M13 真机走查（Edge + OTA）

> 走查日：2026-09-06。环境：本机后端（`local/run-backend.sh` 链路，demo 数据）+ ui-antd dev server（8100）+ browseros 真机驱动。
> 走查作业单：`docs/agents/m13-panel-scope.md` §4；验收条目：`docs/spec/v2-subsystems-acceptance.md` §5。走查人：主会话（browseros）。

## 0. 前置与夹具

- 后端就绪（tenant 登录取 token 实证）；dev server 8100；TA = tenant@thingsboard.org。
- 夹具（API 播种，走查后全量 DELETE，见 §4）：设备×2、资产×2、实体视图×1、仪表盘×1、EDGE 类型规则链×1、客户×1、CU 用户×1（激活链路设密）。
- 环境说明：browseros 驱动的页面运行在 `visibility: hidden` 标签页，rAF 冻结（1 秒 0 帧实测）——antd Modal 关闭动效无法结束，wrap 残留 display:block 为**环境假象**（逻辑状态 open=false 经 React fiber 实证）；走查中以逻辑状态 + 网络请求为准，视觉 wrap 残留手工清理。

## 1. Edge 主链走查（TA）

| §5 条目 | 驱动与证据 | 结论 |
|---|---|---|
| 5.1 菜单/列表 | 「Edge 管理」组两项（Edge 实例/规则链模板）+ OTA 包独立顶级项；六列 + 类型筛选 + 搜索 + 分页 | ✅ |
| 5.1 新增对话框 | name/type(default)/label/routingKey(guid 形)/secret(20 位) 只读展示；保存 toast「Edge 已保存。」 | ✅ |
| 5.1 自动弹指引 | 创建后自动弹「Edge 已创建，请查看安装和连接说明」，Docker/Ubuntu/CentOS-RHEL 三 tab 按 method 独立取数（网络面板逐条目击） | ✅ |
| 5.2 详情结构/表单 | `GET /api/edge/info/{id}`；六字段 + key/secret 只读带复制 | ✅ |
| 5.2 按钮区 | 安装指引/同步/复制三连/设为公开/分配客户/管理/删除/编辑 全在场 | ✅ |
| 5.2 复制 ID | toast「Edge ID 已复制到剪贴板」 | ✅ |
| 5.2 Sync（失败路径） | `POST /api/edge/sync/{id}` 阻塞 ~11s → 错误 toast「Request timed out」呈现，无悬挂；成功路径需真实在线 Edge，留人工 | ✅（真实通道留人工） |
| 5.2 指引二态 | `GET /api/edge/{id}/upgrade/available` 探测在场（详情页） | ✅ |
| 5.2 七 tab | 属性/最新遥测/告警/事件/下行/关联/审计日志 全渲染；事件 tab 请求 `GET /api/events/EDGE/{id}/ERROR`（自身事件，非同步事件） | ✅ |
| 5.4 Downlinks 管线 | 先 `queueStartTs` 属性（SERVER_SCOPE）后 `GET /api/edge/{id}/events?pageSize=10&page=0`（**无排序参数**，直渲 seqId ASC）；六列；空态正确 | ✅ |
| 5.4 Downlinks 数据行 | **受阻（后端）**：多次分配操作后 `edge_event` 表 0 行（SQL 实证），同步事件未落库（本机环境/上游数据链）；派生状态纯函数（== 判 Deployed、缺失按 0）由单测钉住 | ⏸ 留人工 |
| 5.3 devices 子页 | 外壳标题「M13 走查边缘: 设备」；type/profile/active 三过滤器；分配对话框（服务端搜索）→ dev1+dev2 入列（API 复核）；行内/批量解除同 hook（单测钉） | ✅ |
| 5.3 ruleChains 子页 | 进页 `missingToRelatedRuleChains` 请求实证；根链行「设为根」「取消分配」双禁用；分配 m13-fix-edge-rc → 行内 Set root（确认 Modal → `POST /api/edge/{id}/{rcId}/root`）→ API 复核 rootRuleChainId 已切换 | ✅ |
| 5.3 模板页 | 列表两路合并；demo 模板根链复选在场；auto-assign 复选即改即存（POST autoAssignToEdge + 列表重取，false→true→false 复原） | ✅ |
| 5.1 customer 作用域 | `/customers/{id}/edges` 面包屑「客户/m13-fix-cust」；分配已有 Edge → 行落列表 | ✅ |
| 5.1 CSV 导入 | 导入对话框 → CSV（name/type/label/routing_key/secret）→ `POST /api/edge/bulk_import` → 结果「1 新建，0 更新，0 错误」→ 新行「M13 走查边缘-导入」 | ✅ |

## 2. OTA 主链走查（TA）

| §5 条目 | 驱动与证据 | 结论 |
|---|---|---|
| 5.5 列表 | 独立菜单项；九列；**无 type 过滤器**、无导出按钮（钉死项实证） | ✅ |
| 5.5 新增表单 | title/version/**tag 联想 "m13-fw 1.0.0" 实时**/配置档必填/类型 固件\|软件/文件-URL 双分支/自动生成校验和默认勾 | ✅ |
| 5.5 两步保存 | 请求序 `POST /api/otaPackage` → `POST /api/otaPackage/{id}?checksumAlgorithm=SHA256`（multipart）→ 列表重取；行渲染「28 bytes」+「SHA256: a597c4d7…」（后端算、算法:值 形态） | ✅ |
| 5.5 编辑锁死 | 详情页：标题/版本/标签/配置档/类型/文件名/大小/内容类型全 disabled，仅描述启用 | ✅ |
| 5.5 详情按钮组 | 文件型下载启用（`GET /api/otaPackage/{id}/download` blob）；复制包 Id/校验和在场；直链复制有值才显示（URL 包在场、文件包无） | ✅ |
| 5.5 URL 型分流 | URL 型详情**下载禁用**（`hasData && !url` 锚点口径，§5.5 勘误实证）；创建走单步 `POST /api/otaPackage`（无 multipart） | ✅ |
| 5.5 删除被引用 | 配置档固件引用 m13-fw 后删除 → 400 报错原文 toast「The otaPackage referenced by the device profile cannot be deleted!」，包未删 | ✅ |
| 5.5 校验 | URL 分支：配置档必填 + 直链 URL 必填 校验文案在场 | ✅ |
| 5.5 消费集成 | device-profile 保存门 + device 表单双选择器：单测覆盖（wave-6，349 用例）；真机驱动留 M14 设备域走查顺带 | ⏸ 单测覆盖 |

## 3. 角色矩阵走查

| 角色 | 驱动与证据 | 结论 |
|---|---|---|
| CU 菜单 | 设备/仪表盘/资产/告警/**Edge 管理**/通知；Edge 组仅「Edge 实例」（无模板页）；**无 OTA 包** | ✅ |
| CU 列表 | 强制本人客户取数：`GET /api/customer/{cuCustomerId}/edgeInfos`；仅刷新按钮，无新增/导入/删除 | ✅ |
| CU 详情 | tab 收缩为 5（属性/最新遥测/告警/事件/关联）；按钮区全空；key/secret 两行消失 | ✅ |
| CU OTA 直达 | 手打 `/otaPackages` → 拒绝页 | ✅ |
| SYS | sysadmin 登录 → 菜单 租户/租户配置/系统设置/资源/通知，**零 Edge/OTA 项** | ✅ |
| 偏好链 | 勾「不再显示」→ 关闭 → `PUT /api/user/settings` 实证；服务端存储正确 | ✅ |

## 4. 数据保全

全量 DELETE 200 清单：Edge×7（含导入与复验件，客户分配先解除）、OTA 包×2（先解配置档引用）、设备×2、资产×2、实体视图×1、仪表盘×1、EDGE 规则链×1、客户×1、CU 用户×1；配置档 firmwareId 复位 null；用户偏好复位 false。残留核对：edgeInfos totalElements=0、otaPackages totalElements=0、customers 仅剩 demo 原有 5 户、system 数据零改动。

## 5. 走查缺陷登记

- **W-1（Major，前端，已修）**：勾「不再显示」后**同一会话内**再次新建仍自动弹指引（PUT 已发、服务端已存 true；刷新后生效）。根因 = 列表页 settingsQuery（staleTime: Infinity）在弹窗写入后未能在保存回调处取到新值（陈旧缓存/闭包，ADR 0007 §5 同型）。修复 = 保存成功后 `await getUserSettings()` 现读再判定；真机复验（偏好 true → 建件不弹）通过。commit：fix 随走查回写一并入库。
- **W-2（观察，后端异步语义）**：Set root 后列表行根链列未即时翻转，API 复核已切换——后端异步生效 + 前端失效时序竞争，刷新即正确；登记不修（能力级增强候选：Set root 成功后乐观更新行）。
- **环境注记**：Downlinks 数据行与 sync 成功路径受后端事件落库/真实在线 Edge 限制，留人工（§1/§5.2 标注）；browseros 隐藏标签页 rAF 冻结致 Modal 关闭动效残留，属自动化环境假象（见 §0）。
