# v1 遗留限制清单（M6 成文基线）

- 状态：**成文**（2026-09-03，M6 收口）
- 性质：[v1 范围与验收定案](https://github.com/KMakise123/thingsboard/issues/9) 第 5 节 gate 第 4 条「v1 遗留限制清单成文且逐条确认无阻断」的验收载体。活文档：v2 期间随条目消化逐条销账。
- 来源：#9 spec §7 种子清单 + M1~M5 各里程碑落账注记 + BCR 登记册（`docs/bcr.md`）复审归纳。

## 0. 逐条无阻断确认（gate 第 4 条口径）

下表每条均已确认「不实现也不阻断 v1 交付页面可用」：fallback 已交付或能力按 v1 口径有意缺席。

| # | 条目 | 状态 | 确认依据 |
|---|---|---|---|
| L1 | Edge 全域（含 customers/:id/edgeInstances、设备 assign to edge） | v2 消化 | 裁定 6.2；demo 锚点页全部可达可用 |
| L2 | 通知中心全域（含 account/notificationSettings tab） | v2 消化 | 裁定 6.4 |
| L3 | OTA 独立页（deviceProfile 的 OTA 包变更无影响确认弹窗） | v2 消化 | C-14 转此登记；profile 保存走统一未保存守卫 |
| L4 | 版本控制独立页（实体内 VC tab 属 v1 已交付） | v2 消化 | spec 原则 4 |
| L5 | 资源库（widget 类型/包库、图片库、SCADA 符号、JS 库、资源文件） | v2 消化 | demo 锚点外 |
| L6 | 计算字段独立页（实体内 CF tab 属 v1 已交付） | v2 消化 | spec 原则 4 |
| L7 | mobile-center、iot-hub | v2 消化 | BCR #7 保留 |
| L8 | home dashboard 首页（v1 登录落 /devices） | v2 消化 | M3 已删临时 /home，落点三处同源 |
| L9 | settings 其余 tab（queues / notifications / home / repository / auto-commit / trendz / ai-models） | v2 消化 | v1 子集五页已交付 |
| L10 | widget 冷门类型渲染占位（demo 锚点外：gateway_widgets.*、markdown_card 等） | 占位交付 | fqn 明示 +「将在后续版本提供」 |
| L11 | 匿名公共仪表盘页（?publicId= 链接生成但匿名页缺席） | v2 消化 | M5 口径 |
| L12 | usage 页 26/31 widget 位于实体下钻 states，依赖 api_usage Angular 卡交互 | v2 消化 | M5 登记口径 |
| L13 | widget 标题 {i18n:api-usage.*} 渲染原始键（i18n 资产在 widgetType descriptor 内） | v2 消化 | M5 登记口径 |
| L14 | widget 自定义 JS 配置脚本（customPretty 等）不执行 | v2 消化 | M5 口径，安全姿态见 ADR 0004 |
| L15 | 告警表（仪表盘内）只读无 ack/clear | v1 口径 | M5 口径 |
| L16 | 地图 widget 简化实现 + 公网瓦片依赖（纯色底 = 断网非 bug） | v1 口径 | M5 口径 |
| L17 | chart 数字为近似渲染（aggregation 桶口径同 ui-ngx） | v1 口径 | M5 口径 |
| L18 | CSV 导入仅设备 / 资产（parity 即如此） | parity | spec §7 |
| L19 | profile JSON 导入缺席（导出已交付，跨环境迁移走导出→手工重建） | v2/按需 | C-16 |
| L20 | alarm-rules 导出缺席（copy / events / debug 随 v2） | v2 消化 | C-13 |
| L21 | 2FA 强制策略租户选择器降级 tags 输入 | 按需增强 | C-17 |
| L22 | oauth2 domains/clients 表格本地分页 | 按需增强 | C-18 |
| L23 | LWM2M / SNMP 传输深配置仅 JSON 往返 | v2 消化 | C-15 |
| L24 | 复杂告警条件 / 计算字段编辑器（SCRIPT、GEOFENCING 等）缺席，交付单阈值 / SIMPLE 形态 | v2 消化 | M1/M3 口径 |
| L25 | 邮件链路端到端验收挂起（SMTP 未配置：激活邮件、忘记密码、重发激活、测试邮件） | 人工验收项 | 依赖 sys outgoing-mail 配置；页面/表单/错误透传已验 |
| L26 | OAuth2 真实 IdP 授权成功全流程挂起（真实 302 到达 provider 已验、失败链已验） | 人工验收项 | 依赖 sys oauth2 + IdP 账号 |
| L27 | MFA 的 SMS / EMAIL 发码真实链路挂起 | 人工验收项 | 依赖短信网关 / SMTP；TOTP + 备份码全链已验 |
| L28 | 无双 UI 共存（一步切换；ui-ngx 休眠保留，v1 验收后复审删除） | 架构定案 | #10 Q3 |

## 1. 后端契约登记（BCR）与遗留的关系

BCR 20 条（C-1～C-20）是「缺口 + fallback 已交付 + 复审裁决」的独立机制（见 `docs/bcr.md`），不并入本清单。其中纯前端可消化的条目（C-13/C-14/C-16/C-17/C-18）已在上表登记为遗留/按需项；后端契约类条目（C-1 批量端点、C-12 传播开关、C-19/C-20 WS 语义）随 M6 边界复审维持 fallback，是否补端点属后端排期，不阻塞 v1。

## 2. M6 复审结论（2026-09-03）

- 上述 L1~L28 逐条过堂：**无一条阻断 v1 验收页面的能力可用性**。
- L25~L27 三条人工验收项依赖外部系统配置（SMTP 服务器、IdP 账号、短信网关），属于「配置后可复验」而非「功能缺失」；相应页面可达性、表单校验、错误透传在 M1/M3/M4 验收中已核。
- 删除类遗留（ui-ngx 目录去留）依 #10 Q3 留待 v1 验收后复审，不在本清单销账范围。
