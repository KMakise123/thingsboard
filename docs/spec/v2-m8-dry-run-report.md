# v2 M8 波3：76 节点 dry-run 统计报告

- **生成日期**：2026-09-04（脚本 `ui-antd/scripts/rule-node-dry-run-report.mjs` 从摘要 JSON 生成，可重复执行）
- **统计对象**：CORE 画布可见内置节点 **76** 个（全仓 @RuleNode 节点类 77，`push to cloud` 为 EDGE-only 不入面）——与 spec §4.5 定稿口径一致
- **取证方式**：**API 取证**（非源码构造）。fixture 从本机运行中的 ThingsBoard 后端 `GET /api/components?componentTypes=ACTION,EXTERNAL,FILTER,ENRICHMENT,TRANSFORMATION,FLOW&ruleChainType=CORE` 全量抓取（抓取日 2026-09-04，tenant 登录），落盘 `ui-antd/src/components/rule-node/__fixtures__/rule-node-descriptors.json`；dry-run 测试离线读 fixture，不依赖后端存活
- **判定依据**：spec v2-editors-acceptance §4.5 + v2-m8-implementation-brief §2 末段（dry-run 统计口径）
- **复跑方式**：`cd ui-antd && npx vitest run src/components/rule-node/rule-node-dry-run.test.tsx && node scripts/rule-node-dry-run-report.mjs`（第一步重写摘要，第二步重写本报告）

## 1. 双指标判定

| 指标 | 口径 | 结果 | 门槛 | 判定 |
| --- | --- | --- | --- | --- |
| **可编辑率**（100% 硬门槛） | 非空 ∧ 无崩溃 ∧ 三态 ≠ 不可编辑：76/76 | 100.0% | = 100% | ✅ 达标 |
| **控件级渲染率**（登记项） | 控件级（含合法空形态 12 个，其 configuration 仅 version 占位、可完整表达）：75/76（纯控件级 75/76 = 98.7%） | 98.7% | ≥ 85% | ✅ 达标 |

**结论**：双指标全部达标。

## 2. 三态计数与判据通过情况

| 判据 / 状态 | 计数 | 占比 |
| --- | --- | --- |
| ① 表单非空（含合法空形态） | 76/76 | 100.0% |
| ② 无崩溃（React 错误边界不触发） | 76/76 | 100.0% |
| ③ 控件级 | 75 | 98.7% |
| ③ JSON 兜底（全部字段走 JSON 源码模式） | 1 | 1.3% |
| ③ 合法空形态（单独归类计数） | 0 | 0.0% |
| ③ 不可编辑（对标 ui-ngx directive-is-not-loaded） | 0 | 0.0% |

节点库六类分布：FILTER 12 / ENRICHMENT 11 / TRANSFORMATION 9 / ACTION 26 / EXTERNAL 14 / FLOW 4。

deprecated 照扫不豁免（共 4 个）：`delay (deprecated)`、`device profile (deprecated)`、`synchronization end`、`synchronization start`。

## 3. 节点 × 判据矩阵（76 行）

列：C = 控件级字段数；J = JSON 兜底字段数；① = 表单非空；② = 无崩溃。「族」为 P0 定制族（NodeConfigForm 树级组件接管）标记。

| 类型 | 节点 | 实现类 | C | J | 三态 | ① | ② | 族 | 备注 |
| --- | --- | --- | ---: | ---: | --- | :-: | :-: | :-: | --- |
| FILTER | alarm status filter | `TbCheckAlarmStatusNode` | 1 | 0 | 控件级 | ✅ | ✅ | — | — |
| FILTER | asset profile switch | `TbAssetTypeSwitchNode` | 1 | 0 | 控件级 | ✅ | ✅ | — | 合法空形态（仅 version 占位） |
| FILTER | check fields presence | `TbCheckMessageNode` | 3 | 0 | 控件级 | ✅ | ✅ | — | — |
| FILTER | check relation presence | `TbCheckRelationNode` | 3 | 2 | 控件级 | ✅ | ✅ | — | — |
| FILTER | device profile switch | `TbDeviceTypeSwitchNode` | 1 | 0 | 控件级 | ✅ | ✅ | — | 合法空形态（仅 version 占位） |
| FILTER | entity type filter | `TbOriginatorTypeFilterNode` | 1 | 0 | 控件级 | ✅ | ✅ | — | — |
| FILTER | entity type switch | `TbOriginatorTypeSwitchNode` | 1 | 0 | 控件级 | ✅ | ✅ | — | 合法空形态（仅 version 占位） |
| FILTER | gps geofencing filter | `TbGpsGeofencingFilterNode` | 5 | 5 | 控件级 | ✅ | ✅ | — | — |
| FILTER | message type filter | `TbMsgTypeFilterNode` | 1 | 0 | 控件级 | ✅ | ✅ | — | — |
| FILTER | message type switch | `TbMsgTypeSwitchNode` | 1 | 0 | 控件级 | ✅ | ✅ | — | 合法空形态（仅 version 占位） |
| FILTER | script | `TbJsFilterNode` | 0 | 0 | 控件级 | ✅ | ✅ | Y | — |
| FILTER | switch | `TbJsSwitchNode` | 0 | 0 | 控件级 | ✅ | ✅ | Y | — |
| ENRICHMENT | calculate delta | `CalculateDeltaNode` | 7 | 1 | 控件级 | ✅ | ✅ | — | — |
| ENRICHMENT | customer attributes | `TbGetCustomerAttributeNode` | 3 | 0 | 控件级 | ✅ | ✅ | — | — |
| ENRICHMENT | customer details | `TbGetCustomerDetailsNode` | 2 | 0 | 控件级 | ✅ | ✅ | — | — |
| ENRICHMENT | fetch device credentials | `TbFetchDeviceCredentialsNode` | 1 | 0 | 控件级 | ✅ | ✅ | — | — |
| ENRICHMENT | originator attributes | `TbGetAttributesNode` | 7 | 0 | 控件级 | ✅ | ✅ | — | — |
| ENRICHMENT | originator fields | `TbGetOriginatorFieldsNode` | 4 | 0 | 控件级 | ✅ | ✅ | — | — |
| ENRICHMENT | originator telemetry | `TbGetTelemetryNode` | 12 | 0 | 控件级 | ✅ | ✅ | — | — |
| ENRICHMENT | related device attributes | `TbGetDeviceAttrNode` | 12 | 0 | 控件级 | ✅ | ✅ | — | — |
| ENRICHMENT | related entity data | `TbGetRelatedAttributeNode` | 6 | 1 | 控件级 | ✅ | ✅ | — | — |
| ENRICHMENT | tenant attributes | `TbGetTenantAttributeNode` | 3 | 0 | 控件级 | ✅ | ✅ | — | — |
| ENRICHMENT | tenant details | `TbGetTenantDetailsNode` | 2 | 0 | 控件级 | ✅ | ✅ | — | — |
| TRANSFORMATION | change originator | `TbChangeOriginatorNode` | 4 | 3 | 控件级 | ✅ | ✅ | — | — |
| TRANSFORMATION | copy key-value pairs | `TbCopyKeysNode` | 0 | 0 | 控件级 | ✅ | ✅ | Y | — |
| TRANSFORMATION | deduplication | `TbMsgDeduplicationNode` | 4 | 1 | 控件级 | ✅ | ✅ | — | — |
| TRANSFORMATION | delete key-value pairs | `TbDeleteKeysNode` | 0 | 0 | 控件级 | ✅ | ✅ | Y | — |
| TRANSFORMATION | json path | `TbJsonPathNode` | 1 | 0 | 控件级 | ✅ | ✅ | — | — |
| TRANSFORMATION | rename keys | `TbRenameKeysNode` | 0 | 0 | 控件级 | ✅ | ✅ | Y | — |
| TRANSFORMATION | script | `TbTransformMsgNode` | 0 | 0 | 控件级 | ✅ | ✅ | Y | — |
| TRANSFORMATION | split array msg | `TbSplitArrayMsgNode` | 1 | 0 | 控件级 | ✅ | ✅ | — | 合法空形态（仅 version 占位） |
| TRANSFORMATION | to email | `TbMsgToEmailNode` | 5 | 3 | 控件级 | ✅ | ✅ | — | — |
| ACTION | assign to customer | `TbAssignToCustomerNode` | 2 | 0 | 控件级 | ✅ | ✅ | — | — |
| ACTION | calculated fields and alarm rules | `TbCalculatedFieldsNode` | 1 | 0 | 控件级 | ✅ | ✅ | — | 合法空形态（仅 version 占位） |
| ACTION | clear alarm | `TbClearAlarmNode` | 0 | 0 | 控件级 | ✅ | ✅ | Y | — |
| ACTION | copy to view | `TbCopyAttributesToEntityViewNode` | 1 | 0 | 控件级 | ✅ | ✅ | — | 合法空形态（仅 version 占位） |
| ACTION | create alarm | `TbCreateAlarmNode` | 1 | 0 | 控件级 | ✅ | ✅ | Y | — |
| ACTION | create relation | `TbCreateRelationNode` | 6 | 2 | 控件级 | ✅ | ✅ | — | — |
| ACTION | delay (deprecated) | `TbMsgDelayNode` | 3 | 1 | 控件级 | ✅ | ✅ | — | deprecated 照扫 |
| ACTION | delete attributes | `TbMsgDeleteAttributesNode` | 4 | 0 | 控件级 | ✅ | ✅ | — | — |
| ACTION | delete relation | `TbDeleteRelationNode` | 4 | 2 | 控件级 | ✅ | ✅ | — | — |
| ACTION | device profile (deprecated) | `TbDeviceProfileNode` | 2 | 0 | 控件级 | ✅ | ✅ | — | deprecated 照扫 |
| ACTION | device state | `TbDeviceStateNode` | 1 | 0 | 控件级 | ✅ | ✅ | — | — |
| ACTION | generator | `TbMsgGeneratorNode` | 3 | 1 | 控件级 | ✅ | ✅ | Y | — |
| ACTION | gps geofencing events | `TbGpsGeofencingActionNode` | 10 | 5 | 控件级 | ✅ | ✅ | — | — |
| ACTION | log | `TbLogNode` | 0 | 0 | 控件级 | ✅ | ✅ | Y | — |
| ACTION | math function | `TbMathNode` | 7 | 2 | 控件级 | ✅ | ✅ | — | — |
| ACTION | message count | `TbMsgCountNode` | 2 | 0 | 控件级 | ✅ | ✅ | — | — |
| ACTION | push to edge | `TbMsgPushToEdgeNode` | 1 | 0 | 控件级 | ✅ | ✅ | — | — |
| ACTION | rest call reply | `TbSendRestApiCallReplyNode` | 2 | 0 | 控件级 | ✅ | ✅ | — | — |
| ACTION | rpc call reply | `TbSendRPCReplyNode` | 3 | 0 | 控件级 | ✅ | ✅ | — | — |
| ACTION | rpc call request | `TbSendRPCRequestNode` | 1 | 0 | 控件级 | ✅ | ✅ | — | — |
| ACTION | save attributes | `TbMsgAttributesNode` | 4 | 0 | 控件级 | ✅ | ✅ | Y | — |
| ACTION | save time series | `TbMsgTimeseriesNode` | 2 | 0 | 控件级 | ✅ | ✅ | Y | — |
| ACTION | save to custom table | `TbSaveToCustomCassandraTableNode` | 3 | 0 | 控件级 | ✅ | ✅ | — | — |
| ACTION | synchronization end | `TbSynchronizationEndNode` | 1 | 0 | 控件级 | ✅ | ✅ | — | 合法空形态（仅 version 占位）；deprecated 照扫 |
| ACTION | synchronization start | `TbSynchronizationBeginNode` | 1 | 0 | 控件级 | ✅ | ✅ | — | 合法空形态（仅 version 占位）；deprecated 照扫 |
| ACTION | unassign from customer | `TbUnassignFromCustomerNode` | 1 | 0 | 控件级 | ✅ | ✅ | — | — |
| EXTERNAL | AI request | `TbAiNode` | 4 | 3 | 控件级 | ✅ | ✅ | — | — |
| EXTERNAL | aws lambda | `TbAwsLambdaNode` | 5 | 3 | 控件级 | ✅ | ✅ | — | — |
| EXTERNAL | aws sns | `TbSnsNode` | 2 | 2 | 控件级 | ✅ | ✅ | — | — |
| EXTERNAL | aws sqs | `TbSqsNode` | 4 | 3 | 控件级 | ✅ | ✅ | — | — |
| EXTERNAL | azure iot hub | `TbAzureIotHubNode` | 11 | 6 | 控件级 | ✅ | ✅ | — | — |
| EXTERNAL | gcp pubsub | `TbPubSubNode` | 2 | 3 | 控件级 | ✅ | ✅ | — | — |
| EXTERNAL | kafka | `TbKafkaNode` | 9 | 2 | 控件级 | ✅ | ✅ | — | — |
| EXTERNAL | mqtt | `TbMqttNode` | 10 | 2 | 控件级 | ✅ | ✅ | — | — |
| EXTERNAL | rabbitmq | `TbRabbitMqNode` | 9 | 3 | 控件级 | ✅ | ✅ | — | — |
| EXTERNAL | rest api call | `TbRestApiCallNode` | 13 | 4 | 控件级 | ✅ | ✅ | — | — |
| EXTERNAL | send email | `TbSendEmailNode` | 8 | 6 | 控件级 | ✅ | ✅ | — | — |
| EXTERNAL | send notification | `TbNotificationNode` | 0 | 2 | JSON 兜底 | ✅ | ✅ | — | — |
| EXTERNAL | send sms | `TbSendSmsNode` | 3 | 1 | 控件级 | ✅ | ✅ | — | — |
| EXTERNAL | send to slack | `TbSlackNode` | 4 | 1 | 控件级 | ✅ | ✅ | — | — |
| FLOW | acknowledge | `TbAckNode` | 1 | 0 | 控件级 | ✅ | ✅ | — | 合法空形态（仅 version 占位） |
| FLOW | checkpoint | `TbCheckpointNode` | 1 | 0 | 控件级 | ✅ | ✅ | — | 合法空形态（仅 version 占位） |
| FLOW | output | `TbRuleChainOutputNode` | 1 | 0 | 控件级 | ✅ | ✅ | — | 合法空形态（仅 version 占位） |
| FLOW | rule chain | `TbRuleChainInputNode` | 1 | 1 | 控件级 | ✅ | ✅ | — | — |

## 4. 降级清单

### 4.1 不可编辑节点（对标 ui-ngx directive-is-not-loaded，出现即红）

无。

### 4.2 整节点 JSON 兜底（全部字段无专属控件）

| 节点 | 实现类 | JSON 兜底字段 | 字段级原因 |
| --- | --- | --- | --- |
| send notification | `TbNotificationNode` | 2 | 全部字段无 uiHints 覆盖且值形状不可推断（null 值树），走每字段 JSON 源码兜底（仍可编辑） |

### 4.3 部分字段 JSON 兜底（控件级节点内仍有字段走源码模式）

以下节点整体为控件级（登记项达标口径），但存在部分字段因值形状（null / 对象数组 / 复杂嵌套）而走 JSON 源码模式——K2/V 波补 uiHints 或注册表时可逐个收编：

| 节点 | 实现类 | 控件字段 | JSON 兜底字段 |
| --- | --- | ---: | ---: |
| azure iot hub | `TbAzureIotHubNode` | 11 | 6 |
| send email | `TbSendEmailNode` | 8 | 6 |
| gps geofencing filter | `TbGpsGeofencingFilterNode` | 5 | 5 |
| gps geofencing events | `TbGpsGeofencingActionNode` | 10 | 5 |
| rest api call | `TbRestApiCallNode` | 13 | 4 |
| change originator | `TbChangeOriginatorNode` | 4 | 3 |
| to email | `TbMsgToEmailNode` | 5 | 3 |
| AI request | `TbAiNode` | 4 | 3 |
| aws lambda | `TbAwsLambdaNode` | 5 | 3 |
| aws sqs | `TbSqsNode` | 4 | 3 |
| gcp pubsub | `TbPubSubNode` | 2 | 3 |
| rabbitmq | `TbRabbitMqNode` | 9 | 3 |
| check relation presence | `TbCheckRelationNode` | 3 | 2 |
| create relation | `TbCreateRelationNode` | 6 | 2 |
| delete relation | `TbDeleteRelationNode` | 4 | 2 |
| math function | `TbMathNode` | 7 | 2 |
| aws sns | `TbSnsNode` | 2 | 2 |
| kafka | `TbKafkaNode` | 9 | 2 |
| mqtt | `TbMqttNode` | 10 | 2 |
| calculate delta | `CalculateDeltaNode` | 7 | 1 |
| related entity data | `TbGetRelatedAttributeNode` | 6 | 1 |
| deduplication | `TbMsgDeduplicationNode` | 4 | 1 |
| delay (deprecated) | `TbMsgDelayNode` | 3 | 1 |
| generator | `TbMsgGeneratorNode` | 3 | 1 |
| send sms | `TbSendSmsNode` | 3 | 1 |
| send to slack | `TbSlackNode` | 4 | 1 |
| rule chain | `TbRuleChainInputNode` | 1 | 1 |

### 4.4 崩溃节点（判据②红 + 堆栈）

无。

## 5. 判据④ round-trip 抽样（P0 五族 + 脚本族，全量 12 类）

流程：改默认值 → `hydrateConfiguration` → 重渲染断言值保持 + 任意键不丢失；并对真实控件做一次交互式编辑（type/click）后校验浅合并门（配置键不丢失）+ 回放无崩溃。

| 节点 | 编辑键 | 编辑目标 | hydrate | 重渲染值保持 | 交互编辑 |
| --- | --- | --- | :-: | :-: | --- |
| script | `tbelScript` | script-editor | ✅ | ✅ | ✅ |
| switch | `tbelScript` | script-editor | ✅ | ✅ | ✅ |
| copy key-value pairs | `keys` | keys-list | ✅ | ✅ | skipped（族内无文本输入/开关控件，键保持与回放由 ①②③+L1/L2 覆盖） |
| delete key-value pairs | `keys` | keys-list | ✅ | ✅ | skipped（族内无文本输入/开关控件，键保持与回放由 ①②③+L1/L2 覆盖） |
| rename keys | `renameKeysMapping` | kv-map | ✅ | ✅ | ✅ |
| script | `tbelScript` | script-editor | ✅ | ✅ | ✅ |
| clear alarm | `alarmDetailsBuildTbel` | script-editor | ✅ | ✅ | ✅ |
| create alarm | `alarmType` | field | ✅ | ✅ | ✅ |
| generator | `msgCount` | field | ✅ | ✅ | ✅ |
| log | `tbelScript` | script-editor | ✅ | ✅ | ✅ |
| save attributes | `notifyDevice` | field | ✅ | ✅ | ✅ |
| save time series | `defaultTTL` | field | ✅ | ✅ | ✅ |

## 6. 观察项（回传 K2/V 波，本报告不修 src）

- **version 占位字段**：12 个 EmptyNodeConfiguration 节点的 defaultConfiguration 仅含 `version`，生成器目前为其渲染一个可编辑数字控件（故三态归控件级而非合法空）。ui-ngx 对这些节点表单为空；K2 可在 ui-hints 层把 version 字段隐藏（jsonSource/占位规则）以对齐上游观感。
- **整节点 JSON 兜底**：`send notification` 的默认配置为 null 值树（生成器按设计降级为 JSON 源码模式，仍可编辑）——K2 补 uiHints（如 targets 选择器）可升级为控件级。
- **注册表/uiHints 缺口**：P0 五族（脚本族、键操作、save timeseries/attributes、create/clear alarm）之外的 64 类全部依赖值形状推断 + 每字段 JSON 兜底，无定向控件；不影响双指标达标，收编优先级以 §4.3 的 JSON 兜底字段数排序。
- round-trip 抽样中 2 个键操作节点的交互编辑为 skipped（族内仅 Select 类控件，无文本输入/开关）；其 L1/L2 断言（hydrate + 重渲染值保持 + 键不丢失）完整通过。

## 7. 证据链与一致性

- fixture：`ui-antd/src/components/rule-node/__fixtures__/rule-node-descriptors.json`（API 取证，76 描述符全量，含抓取元数据）
- 摘要：`ui-antd/src/components/rule-node/__fixtures__/dry-run-summary.json`（测试内生成；本报告的数据源，两者由同一命令序列再生）
- 测试：`ui-antd/src/components/rule-node/rule-node-dry-run.test.tsx`（94 用例：fixture 完整性 4 + 逐节点 76 + 判据④ 12 + 摘要门 2）
- 本报告由脚本生成，与摘要 JSON 同源；手工编辑本文件会在下次再生时被覆盖。

