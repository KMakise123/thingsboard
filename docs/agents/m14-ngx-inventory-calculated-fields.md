# M14 ui-ngx 计算字段（Calculated Fields）操作面盘点（工作文档，agents 用）

> 由 scout-ngx(calculated-fields) 盘点产出（2026-09-06）。spec §6 的对照基准；随 M14 收尾可归档或删除。
> 范围：仅计算字段域（独立页 + 实体详情 tab 挂载 + 消费面登记）。VC 独立页、settings 六小件、密码策略页由其他 scout 另行盘点。
> 术语：ngx 把它叫 "Calculated field"（实体枚举 `CALCULATED_FIELD`，菜单名复用 `entity.type-calculated-fields`）。一个计算字段 = 挂在某个实体（设备/资产/设备配置/资产配置）上的一段配置：取若干「参数（arguments）」→ 按类型算出结果 → 写回属性或时序。ui-ngx 版本 4.4.0（`ui-ngx/package.json`）。

## 0. 一句话结论

ngx 4.4 的计算字段**不是**「一个表达式输入框」的功能：共 7 种类型（`CalculatedFieldType`，`calculated-field.models.ts:87-95`），其中 6 种进独立页（SIMPLE/SCRIPT/GEOFENCING/PROPAGATION/RELATED_ENTITIES_AGGREGATION/ENTITY_AGGREGATION），第 7 种 ALARM（告警规则）不在独立页，挂在实体详情的 alarm-rules tab。issue #16 说「SCRIPT/GEOFENCING 复杂编辑器留 v2」——实测 ngx 4.4 已全量存在：SCRIPT 用通用 `tb-js-func`（Ace + TBEL）而非专用编辑器；GEOFENCING **没有地图组件**，是「zone 组 popover 表格 + 引用实体 perimeter 属性 key」的纯表单（详见 §7）。

## 关键文件

- 路由/模块：`ui-ngx/src/app/modules/home/pages/calculated-fields/calculated-fields-routing.module.ts`、`calculated-field-page.module.ts`
- 详情页 tabs（仅 debug events 一个 tab）：`.../pages/calculated-fields/calculated-fields-tabs.component.ts/.html`
- 列表 config（独立页/实体 tab 双模式）：`.../components/calculated-fields/calculated-fields-table-config.ts`
- 列表表头（三维过滤入口）：`.../components/calculated-fields/table-header/calculated-fields-header.component.ts/.html`、`calculated-fields-filter-config.component.ts`
- 表单容器（详情抽屉态）：`.../components/calculated-fields/calculated-field.component.ts/.html/.scss`
- 新增/编辑 dialog（实体 tab 态与独立页新增均走它）：`.../components/calculated-fields/components/dialog/calculated-field-dialog.component.ts/.html/.scss`
- 表单逻辑共享服务：`ui-ngx/src/app/core/services/calculated-field-form.service.ts`
- SIMPLE/SCRIPT 配置器：`.../components/calculated-fields/components/simple-configuration/simple-configuration.component.ts/.html`
- 参数表 + 参数 popover 面板：`.../components/calculated-fields/components/calculated-field-arguments/`（5 组件）
- 输出配置器：`.../components/calculated-fields/components/output/calculated-field-output.component.ts/.html`
- 复杂类型配置器：`.../components/calculated-fields/components/{propagation,geofencing,related-entities-aggregation,entity-aggregation}-configuration/`、`metrics/`
- 表达式测试对话框：`.../components/calculated-fields/components/test-dialog/calculated-field-script-test-dialog.component.ts/.html`
- 共享模型：`ui-ngx/src/app/shared/models/calculated-field.models.ts`（约 1100 行，含表达式补全/高亮规则定义）
- HTTP 服务：`ui-ngx/src/app/core/http/calculated-fields.service.ts`
- 后端对照：`application/src/main/java/org/thingsboard/server/controller/CalculatedFieldController.java`
- 文案：`ui-ngx/src/assets/locale/locale.constant-en_US.json` 顶层 `calculated-fields.*` 段（129 个顶层 key）+ `alarm-rule.*` 段（ALARM 型）

## 1. 路由与权限

- 列表 `/calculatedFields`：auth=[TENANT_ADMIN]（`calculated-fields-routing.module.ts:75-90`）；详情 `/calculatedFields/:entityId`：TENANT_ADMIN + ConfirmOnExitGuard，面包屑 icon=`mdi:function-variant`（:91-107）
- 菜单：MenuId.calculated_fields（`menu.models.ts:104`），path=`/calculatedFields`、icon=`mdi:function-variant`（:695-704），挂在 **TENANT_ADMIN 段**的「Data & processing」分组，与 rule_chains 并列（:958-964）；CUSTOMER_USER 菜单段无此项
- 后端权限矩阵（`CalculatedFieldController.java`）：**9 个端点全部 `TENANT_ADMIN`**（:125,138,150,170,190,236,254,268,283），无任何 CUSTOMER_USER 能力
- 结论：前端页面 TENANT only；CUSTOMER 完全无入口（与 M13 OTA 的「后端有只读能力」不同，这里连后端都没有）
- entity-type 注册：名称/新增/空态/搜索文案（`entity-type.models.ts:488-498`）、帮助 key=calculatedField（:663-666）、详情页 URL 约定 `/calculatedFields`（:698）、枚举定义（:53）

## 2. 独立页列表页（EntitiesTable 通用表壳，pageMode）

- 双模式：`CalculatedFieldsTableConfig` 构造参数 `pageMode`——独立页=true（挂自定义 header + rowPointer 行点击开详情页 + entityType/entityName 两列），实体详情 tab=false（无 header、编辑走 dialog）（`calculated-fields-table-config.ts:110-118`）
- 新增入口三个（addActionDescriptors，:137-156）：Create（开 dialog）/ Import（JSON 导入，§9）/ **Add from IoT Hub**（fork 的 iot-hub 市场入口，§11）
- 列（pageMode，:160-170）：createdTime(150px，默认排序 createdTime DESC :158)/name(33%)/entityType(10%，实体类型译名)/entityName(33%，`EntityLinkTableColumn` 带实体详情页跳链)/type(23%，类型译名 nowrap)；实体 tab 模式列=createdTime/name(60%)/type(40%)
- 搜索：通用表默认 textSearch 启用；后端排序白名单仅 **createdTime/name**（controller :180,:204）
- **三维过滤面板**（仅独立页）：`tb-calculated-fields-filter-config`，overlay 弹出面板，过滤维度=types(多选 6 型)/entityType(4 实体型)/entities(实体多选)（`calculated-fields-filter-config.component.ts:134-138,:257-263`；header 挂载 `calculated-fields-header.component.html:18-20`），按钮文案拼已选条件（:271-286）；变更后 resetSortAndFilter 刷新（header ts:40-43）
- 行内动作（cellActionDescriptors，:172-200）：Copy（复制后开 dialog，pageMode 时清 entityId/entityName 要求重选实体，:326-340）/ Export（JSON 下载，:321-324）/ Events（pageMode=打开右侧详情切到 debug tab :241-255；tab 模式=通用 Events 弹窗 :291-319）/ Debug 配置（bug 图标，激活态换色 :192-199）
- 实体 tab 模式额外加行内 Edit（:201-208）
- 删除：单条 + 批量（通用表壳多选），确认文案四件套（:129-132）

## 3. 表单骨架与类型切换

> 形态说明：新增/编辑有两套容器——详情抽屉内嵌 `CalculatedFieldComponent`（独立页行点击）与全屏 `CalculatedFieldDialogComponent`（tab 页编辑/新增/复制/导入回填），二者共用 `CalculatedFieldFormService.buildForm()` 的同一 FormGroup 结构（`calculated-field-form.service.ts:39-47`）。

| 字段 | 控件/校验 | 联动 | 锚点 |
|---|---|---|---|
| name | 必填，≤255 | 无 | form.service :41；calculated-field.component.html:45-58 |
| debugSettings | `tb-entity-debug-settings-button`（失败调试默认开：updateForm 兜底 `failuresEnabled:true, allEnabled:true`） | 附带「看 debug 事件」附加动作 | html:59-64；component ts:92-102,123 |
| entityId | `tb-entity-select` 必填，限 4 实体型 DEVICE/ASSET/DEVICE_PROFILE/ASSET_PROFILE（`calculatedFieldsEntityTypeList`，models.ts:587） | 编辑态锁定（component ts:142-152）；dialog 无预选实体时整个 configuration 禁用直到选实体（dialog ts:103-115）；换实体时 owner 联动（设备/资产挂客户则 ownerId 换 customerId，component ts:154-168） | html:66-73 |
| type | 下拉 6 型（`calculatedFieldTypes`=全部减 ALARM，models.ts:131），每项带名称+hint | 类型切换规则：SIMPLE↔SCRIPT 互切**保留**配置，其余切换**清空** configuration（form.service:68-81）；详情态默认 SIMPLE | html:74-94 |
| configuration | 4 个配置器分支 @switch：GEOFENCING→tb-geofencing-configuration；PROPAGATION→tb-propagation-configuration；RELATED_ENTITIES_AGGREGATION→tb-related-entities-aggregation；ENTITY_AGGREGATION→tb-entity-aggregation；默认（SIMPLE/SCRIPT）→tb-simple-configuration（isScript 标志区分） | 见 §4/§7 | html:96-149 |

- 编辑态恢复：`prepareConfig` 给无 strategy 的 output 补默认 RULE_CHAIN、ENTITY_AGGREGATION 的 tz 规范化（form.service:83-94）
- 提交：dialog `add()` 直接 `POST /api/calculatedField`（deepTrim 后整体提交），invalid 时仅 name markAsTouched（dialog ts:130-142）；无草稿、无两步保存（对比 OTA）
- ALARM 型表单另造：`buildAlarmRuleForm`（form.service:49-66），供 alarm-rules 域使用

## 4. SIMPLE / SCRIPT 配置器（同一组件 `tb-simple-configuration`，isScript 分流）

| 区块 | SIMPLE | SCRIPT | 锚点 |
|---|---|---|---|
| 参数表 | `tb-calculated-field-arguments-table`，**不允许 Rolling 型参数**（errorText 提示） | 同表，允许 Rolling | ts:87-93 表单；ts:226-234 校验 |
| 表达式 | 普通 input：必填、≤255、pattern=oneSpaceInsideRegex，placeholder `(temperature - 32) / 1.8`，带 math 函数帮助弹窗（`tb-help-popup math/math-methods_fn`） | `tb-js-func`（Ace 编辑器）：functionName=`calculate`、语言 **TBEL**、函数参数=ctx+各参数名、自定义补全（`getCalculatedFieldArgumentsEditorCompleter`）+自定义高亮（`getCalculatedFieldArgumentsHighlights`）、helpId=`calculated-field/expression_fn`、工具栏 TBEL 徽标 + 测试按钮（arguments 无效时禁用） | html:38-60（SIMPLE）；html:61-93（SCRIPT）；补全/高亮定义 models.ts:606-1042 |
| 默认脚本 | 无 | 华氏转摄氏示例（`calculatedFieldDefaultScript`） | models.ts:1044-1048 |
| useLatestTs | 仅 output=Timeseries 时可勾 | 隐藏/禁用 | ts:203-209；html:95-104 |
| 输出 | `tb-calculate-field-output` simpleMode（有输出 key name + decimalsByDefault） | 同组件非 simpleMode（无 name/decimals） | html:95；§6 |

- 内部实现：两个表达式控件（expressionSIMPLE/expressionSCRIPT）按 isScript 互斥 enable/disable，提交时合成 `expression` 字段（ts:121-129,192-201）

## 5. 参数（arguments）交互（六类型共用一套件）

- 表格列：name/entityType/target/type/key/actions（`calculated-field-arguments-table.component.ts:106`）；客户端排序 name/entityType/type/key（:312-337）
- 上限：`maxArgumentsPerCF`（服务端 authState 下发，默认 10，§12）——表格 ts:115
- 新增/编辑=**popover 面板**（`CalculatedFieldArgumentPanelComponent`，isModal）：编辑按钮偏好左侧、新增偏好右侧弹出（ts:173-219）
- 校验（面板，ts:103-114）：
  - argumentName：必填、pattern `charsWithNumRegex`、≤255、组内唯一（`uniqueNameValidator`）、禁用保留名 **['ctx','e','pi']**（`FORBIDDEN_NAMES`，models.ts:37；panel ts:82,:216-218）
  - refEntityKey.type：默认 LatestTelemetry；**Rolling 仅 isScript 可选**（ts:179-180）；SIMPLE 选了 Rolling 由表格层报错（§4）
  - key：pattern oneSpaceInsideRegex；attribute 型时 scope 必填，默认 SERVER_SCOPE 且仅 Device（或 Current+设备族）可改 SERVER/SHARED（ts:154-158,:232-239）
  - Rolling 型专属：limit（1..`maxDataPointsPerRollingArg`，默认 max/10=100）+ timeWindow（必填，默认 15 分钟）；此时 defaultValue 禁用（ts:112-113,:232-239）
  - defaultValue：选填 pattern；配置器可要求必填（`defaultValueRequired`，aggregation 变体用）
- 参数来源（argumentType，ts:83,98）：CURRENT（当前实体）/DEVICE/ASSET/CUSTOMER（选实体，带实体联想）/CURRENT_OWNER（owner 动态源）/TENANT（存当前租户 id）；RELATION_QUERY 不在参数面板（geofencing 专属）。profile 型宿主（device/asset profile）+Owner 时开「联想模式」由实体名动态解析（ts:224,:297）
- watchKeyChange（SIMPLE/SCRIPT 开启）：key 输入时 argumentName 若未动过则自动跟随（ts:326-335）
- 实体名解析：写入时批量反查实体名；查无此实体→refEntityId.id 置 NULL_UUID 触发「entity not found」行错误（table ts:273-310,:229-231）

## 6. 输出（output，六类型共用 `tb-calculate-field-output`）

- 输出类型（OutputType，models.ts:363-366）：ATTRIBUTES / TIME_SERIES（默认）
- simpleMode（仅 SIMPLE）额外有：输出 key name（必填、pattern、≤255，label 随类型切换 timeseries-key/attribute-key）+ decimalsByDefault（0..15 整数，`calculated-field-output.component.ts:97-114,:218-232`）
- scope：仅 ATTRIBUTES 且宿主为 Device/DEVICE_PROFILE 时可选 SERVER/SHARED（html:32-45）
- 输出策略（OutputStrategyType，models.ts:275-278）：IMMEDIATE（立即写库，默认）/ RULE_CHAIN（交规则链处理，下方参数面板整体锁定）——toggle-select + expansion panel（html:78-165）
- IMMEDIATE 参数（html:94-164）：Timeseries→saveTimeSeries/saveLatest/sendWsUpdate/processCfs 四开关 + useCustomTtl（勾选才出 ttl 时间输入，默认 0）；Attributes→saveAttribute/sendWsUpdate/processCfs + updateAttributesOnlyOnValueChange（默认开）+ sendAttributesUpdatedNotification（默认关）
- 默认值常量：`defaultCalculatedFieldOutput`/`defaultSimpleCalculatedFieldOutput`（models.ts:589-604）；载入时无 strategy 补 RULE_CHAIN（§3 prepareConfig）；有 ttl 即勾 useCustomTtl（output ts:166-172）
- RELATED_ENTITIES_AGGREGATION 与 ENTITY_AGGREGATION 的模型里 output 带 `decimalsByDefault?`（models.ts:173,:183）但 UI 仅 simpleMode 展示该输入——这两种类型 UI 上**没有** decimals 输入（output ts:218-232 仅 simpleMode enable）；待实测确认后端是否接受（倾向：字段直传保留）

## 7. 复杂类型四配置器

### 7.1 PROPAGATION（`propagation-configuration.component.ts`）

- 表单（:88-97）：arguments（notEmpty，参数面板为 `PropagateArgumentsTableComponent` 变体，:86 maxRelatedEntitiesToReturnPerCfArgument 限制）+ relation（direction 默认 TO「向上找父」，relationType 默认 'Contains'，选项**前端写死** ['Contains','Manages'] :174-177）+ `applyExpressionToResolvedArguments`（默认 false）+ expression（TBEL，默认脚本）+ output
- 联动：勾 applyExpression 才启用表达式（:184-190）；勾了的表达式可被测试对话框回填
- debug 可用性：`debugCfActionEnabled`=SCRIPT 或 PROPAGATION-带表达式（models.ts:550-554）——纯传播（无表达式）不产出可调事件

### 7.2 GEOFENCING（`geofencing-configuration.component.ts` + zone 组两件套）

- **无地图组件**：zone=「引用某实体的 perimeter 属性」而非画多边形。表单（:81-90）：entityCoordinates（latitudeKeyName/longitudeKeyName 必填，本实体经纬度时序 key）+ zoneGroups（notEmpty，popover 表格 `calculated-field-geofencing-zone-groups-table/panel`）+ scheduledUpdateEnabled（默认 true，开则 interval 默认=服务端 `minAllowedScheduledUpdateIntervalInSecForCF`）+ output
- zone 面板字段（panel ts:83-97）：name（必填+唯一+禁保留名）/ 引用实体（CURRENT/TENANT/OWNER/RELATION_QUERY/具体实体；RELATION_QUERY 时配 relation levels 路径数组，可拖拽排序，受 `maxRelationLevelPerCfArgument`=2 限制 :81,:296-327）/ perimeterKeyName（必填 pattern）/ reportStrategy（3 值：进出事件+在区状态(默认)/仅进出事件/仅在区状态，models.ts:309-313）/ createRelationsWithMatchedZones（勾选才启用 direction+relationType，:181-195）
- 注意：ngx TS 模型 `CalculatedFieldGeofencingConfiguration` **漏写** entityCoordinates 字段（models.ts:157-163），UI 表单直传；后端 `GeofencingCalculatedFieldConfiguration` 有该字段（`common/data/.../geofencing/GeofencingCalculatedFieldConfiguration.java:43-57`，EntityCoordinates=经纬 key 名）——payload 直传合法，属上游 TS 模型滞后

### 7.3 RELATED_ENTITIES_AGGREGATION（`related-entities-aggregation-component.component.ts`）

- 表单（:90-100）：relation（direction 默认 FROM，relationType 'Contains'/Manages 写死）+ arguments（notEmpty，`RelatedAggregationArgumentsTable` 变体：隐藏实体类型选择、defaultValue 必填、实体候选按 relation 路径过滤 :87-89）+ metrics（notEmpty，popover 面板）+ deduplicationIntervalInSec（默认=服务端 min）+ useLatestTs（仅 Timeseries 可用 :168-174）+ output
- 提交时硬写 `scheduledUpdateInterval=min`（:162-166）；metric/metric 面板见 §7.5

### 7.4 ENTITY_AGGREGATION（`entity-aggregation-component.component.ts`，UI 名「time-series-data-aggregation」）

- 表单（:97-113）：arguments（notEmpty，`EntityAggregationArgumentsTable` 变体：隐藏实体类型（必然本实体）、隐藏 defaultValue :62-66）+ metrics（notEmpty）+ interval（type 8 值 HOUR/DAY/WEEK/WEEK_SUN_SAT/MONTH/QUARTER/YEAR/CUSTOM，models.ts:414-423；tz 时区必填；仅 CUSTOM 可改 durationSec，下限=服务端 minAllowedAggregationIntervalInSecForCF；可开 offsetSec 偏移，上限按周期类型 :251-266）+ allowWatermark（勾选出 watermark.duration，默认 1h）+ produceIntermediateResult（仅当周期 > 服务端 intermediateAggregationIntervalInSecForCF=300s 才可勾 :276-308）+ output
- offset 有动态 hint：moment 现算「下一 N 个区间」文字预览（:310-461）

### 7.5 metrics 面板（两种聚合共用 `calculated-field-metrics-panel.component.ts`）

- 字段（:66-75）：name（必填+唯一+禁保留名）/ function（AggFunction 6 值：AVG/MIN/MAX/SUM/COUNT/COUNT_UNIQUE，models.ts:396-403）/ filter（TBEL 脚本，默认示例「只统计空闲车位」，models.ts:1090-1093）/ input（二选一：key=直接引遥测 key；function=TBEL map 脚本，默认示例华氏转摄氏，models.ts:1095-1099）/ defaultValue
- 指标表/面板=popover 模式（同 arguments 套路）

## 8. 表达式测试（test dialog）与 debug 事件

- 入口条件：SCRIPT / RELATED_ENTITIES_AGGREGATION / PROPAGATION-带表达式 才有测试对话框；其他类型返回空（table-config ts:406-411,:442-444）
- 预填：已保存的 CF 先拉 `GET /api/calculatedField/{id}/debug` 最新调试事件，用其 arguments 预填测试参数（form.service:96-119）
- 对话框（`calculated-field-script-test-dialog.component.ts`）：Split.js 双分栏（左参数/右上下），右上下=表达式（JsonContent/Ace，载入时 beautifyJs）+输出（运行后 beautify）；「Test script」POST `/api/calculatedField/testScript`，错误 toast、成功填输出；「Save」=测试通过后关闭并回传 expression，若 openCalculatedFieldEdit 则关全部弹窗回填编辑表单（:117-131,:133-158,:126-131）
- Rolling 参数在测试里给空数组兜底（table-config :412-418）
- debug 事件查看两形态：独立页=右侧详情 debug tab（`calculated-fields-tabs.component.html:18-30`，只留 DEBUG_CALCULATED_FIELD 事件）；列表/弹窗=通用 EventsDialog（table-config :291-319）；debug tab 的「Test with this message」把事件参数带进测试对话框，回写表达式进详情表单（tabs ts:45-57）
- debug settings 按钮：行内 bug 图标（激活/失败态换图标与标签）→ `entityDebugSettingsService.openDebugStrategyPanel` 策略面板，应用后「重读实体→整体 save」持久化（table-config :192-199,:217-239,:398-404）

## 9. 复制 / 导入导出（对比 OTA 的重大差异：CF 有完整 JSON 导入导出）

- 导出：行内 Export→`exportCalculatedField`：拉全量→删 entityId→`exportToPc` 存 JSON（`import-export.service.ts:179-190,:1247-1249`）
- 导入：列表「Import」→选 JSON→**类型校验**（ALARM 或未知 type 拒收 toast，table-config :350-374）→**租户引用改写**（arguments/zoneGroups 里 refEntityId.entityType=TENANT 的 id 重写为当前租户 :376-396）→开 dialog（按钮 Add、类型选择禁用 disabledSelectType、isDirty）→确认后 POST
- 复制：行内 Copy→deepClone→删 id（pageMode 另清 entityId/entityName）→开 dialog（按钮 Apply）→POST
- 编辑（tab 模式行内）：开 dialog 按钮 Apply、isDirty（无进入动画）（:257-265,:267-289）

## 10. 服务端点全表（`calculated-fields.service.ts`）与后端对照

| 前端函数 | 端点 | 后端（fork `CalculatedFieldController.java`） | 锚点 |
|---|---|---|---|
| getCalculatedFieldById | GET /api/calculatedField/{id} | 同名，TENANT_ADMIN（:138-139） | service :43-45 |
| saveCalculatedField | POST /api/calculatedField | 同名（:125-126） | service :47-49 |
| deleteCalculatedField | DELETE /api/calculatedField/{id} | 同名（:254-257） | service :51-53 |
| getCalculatedFields | GET /api/calculatedFields + query{types,entityType,entities,name[]} | 同名：types 空=全类型除 ALARM（:213-216）；排序白名单 createdTime/name（:204） | service :55-57 |
| getCalculatedFieldsByEntityId | GET /api/{entityType}/{id}/calculatedFields + type? | **V1 形态存在**（:150-165）；另有 V2 别名 `/api/calculatedField/{entityType}/{entityId}`（:170-183，前端未用） | service :59-61 |
| testScript | POST /api/calculatedField/testScript | 同名（:283-286） | service :63-65 |
| getLatestCalculatedFieldDebugEvent | GET /api/calculatedField/{id}/debug | 同名（:268-270） | service :67-69 |
| getCalculatedFieldNames | GET /api/calculatedFields/names?type= | 同名（:236-249，排序锁 name） | service :71-73 |

- **结论：fork 后端 9 端点与 ngx 前端完全对齐，无缺口**；后端 cf 运行时（actors/state/TBEL 引擎/queue）在 `application/src/main/java/org/thingsboard/server/{service,actors}/...cf/` 全量存在（含 Geofencing/Propagation/Aggregation 各 state 测试），前端只需对齐 UI
- 模型对照：后端 configuration 多态类在 `common/data/.../cf/configuration/`（Simple/Script/Propagation/Geofencing/RelatedEntitiesAggregation/EntityAggregation/Alarm 各一），字段与 ngx TS 模型一致（唯一出入=§7.2 entityCoordinates）

## 11. 实体 tab 挂载点与消费面

- **实体详情 tab（4 处，同构）**：device（`device-tabs.component.html:34-41`）、asset（`asset-tabs.component.html:34-40`）、device-profile（`device-profile-tabs.component.html:51-55`，编辑态隐藏）、asset-profile（`asset-profile-tabs.component.html:19-23`）——均 TENANT_ADMIN only，tab 内嵌 `tb-calculated-fields-table`（非 pageMode：无三维过滤 header、行内 Edit+编辑走 dialog、点击行不开详情页）
- **alarm-rules（ALARM 型计算字段）**：同为上述 4 实体详情 tab（device-tabs.html:38-40 等）；列表 config `alarm-rules-table-config.ts:78-220`（列：createdTime/alarm-type/(pageMode entityType+entityName)/severities(建警规则图标组)/cleared(消警 90px)）；表单走 `buildAlarmRuleForm`（§3）；i18n 在 `alarm-rule.*` 域。**它是独立 ALARM_RULE 时代之后的「ALARM 型 CF」载体**（`AlarmRuleController.java` 与 CF 并存）
- **VC 消费**：版本加载勾选项 `loadCalculatedFields`（CUSTOMER 实体时文案换 load-alarm-rules）（`entity-types-version-load.component.html:75-79`）；创建/恢复同名开关在 entity-version-create/entity-version-restore（待复核细目）；后端 `DefaultEntitiesVersionControlService` 已含 CF
- **iot-hub（fork 市场入口）**：列表「Add from IoT Hub」（table-config :342-348）；iot-hub 域把 CALCULATED_FIELD 作为 item 类型（browse/install/详情卡片全套，`iot-hub-browse.component.ts:53,:429,:538` 等）；入口页 `/iot-hub` TENANT_ADMIN only（`iot-hub-routing.module.ts:28-46`），菜单在 TENANT_ADMIN 段顶部（`menu.models.ts:917-921`）。ui-ngx 4.4 自带 iot-hub 域（是否上游 CE 功能待复核），fork 沿用
- **import-export**：`exportCalculatedField`/`openCalculatedFieldImportDialog`（§9），无 edge 侧特判

## 12. 服务端下发限额（authState，表单硬依赖）

8 个参数随 auth state 下发（`core/auth/auth.models.ts:33-42`；默认值 `tenant.model.ts:180-187`；来源 tenant profile 配置，profile 配置页同名字段 `default-tenant-profile-configuration.component.html:309-393`）：

| 参数 | 默认 | 消费点 |
|---|---|---|
| maxArgumentsPerCF | 10 | 参数表行数上限（§5） |
| maxDataPointsPerRollingArg | 1000 | Rolling limit 上限（§5） |
| maxRelationLevelPerCfArgument | 2 | geofencing relation levels 层数（§7.2） |
| maxRelatedEntitiesToReturnPerCfArgument | 100 | propagation/related-agg 参数（§7.1/7.3） |
| minAllowedDeduplicationIntervalInSecForCF | 10 | related-agg 去重间隔默认（§7.3） |
| minAllowedAggregationIntervalInSecForCF | 60 | entity-agg CUSTOM 周期下限（§7.4） |
| minAllowedScheduledUpdateIntervalInSecForCF | 10 | geofencing 定时刷新默认（§7.2） |
| intermediateAggregationIntervalInSecForCF | 300 | produceIntermediateResult 解锁阈值（§7.4） |

## 13. i18n 与文案域

- `calculated-fields.*`：129 顶层 key（en），子段 type 12 / hint 57 / output-strategy 15 / metrics 22 / aggregate-period 8（`locale.constant-en_US.json`，node 脚本实测）
- 实体面：`entity.type-calculated-field`/`entity.type-calculated-fields`；菜单名复用后者；帮助 key `calculatedField`
- ALARM 型在 `alarm-rule.*` 域（不在 calculated-fields.*）
- 其余散点：`api-usage.tbel`（TBEL 徽标）、`entity.entity-type`、`action.*` 通用

## 14. 「无」清单（本版 ngx 明确没有的能力，均已 grep 证实）

1. **无 CUSTOMER_USER 任何入口/权限**：路由 auth（routing :86,:100）、菜单段（menu.models.ts:917 起）、后端 9 端点全 TENANT_ADMIN
2. **ALARM 型不进独立页**：`calculatedFieldTypes` 过滤（models.ts:131）；表单 type 下拉用它（component html:82）；导入拒收 ALARM（table-config :355）
3. **实体详情 tab 内无类型/实体过滤**：headerComponent 仅 pageMode 挂（table-config :110-111），tab 模式 fetch 不传 query（:211-215）——尽管后端 V1 支持 type 参数（controller :156）
4. **无批量导出/批量编辑**：addActionDescriptors 仅 Create/Import/IoT Hub 三项（:137-156）；批量仅通用表壳的删除
5. **排序白名单仅 createdTime/name**（controller :180,:204）；entityType/entityName/type 列无后端排序
6. **无 CF 专用可视化表达式编辑器**：SCRIPT=通用 tb-js-func（Ace+TBEL）+参数补全/高亮（§4）；无拖拽块/节点式编辑；SIMPLE=普通 input
7. **GEOFENCING 无地图组件**：zone 全靠「引用实体+perimeter 属性 key」，无画图/选区（§7.2，grep geofencing 目录无 map/leaflet）
8. **无复制 ID 按钮**：详情按钮组仅 Open details page/Export/Delete（`calculated-field.component.html:18-39`，对比 OTA 的 Copy id/checksum/url 四连）
9. **propagation/related-agg 的 relationType 选项前端写死 ['Contains','Manages']**（propagation ts:174-177；related-agg ts:157-160），不从后端拉
10. **无草稿/无两步保存**：保存即 POST 全量（对比 OTA 的两步上传+回滚）
11. **详情页 tabs 仅 debug events 一个**（tabs html:18-30），无 audit/relations 等附加 tab

## 15. 工作量分级 + 裁决点

**工作量**：整体 **重**（对照 M13 口径：edge/ota 各为中~重）。构成拆解：
- 列表页（双模式+三维过滤+删除/复制/导入导出/debug 配置）：**中**（模式是 M12/M13 已趟过的 EntitiesTable 套路，三维过滤面板是新件）
- 表单骨架+类型切换+参数套件+输出套件+测试对话框（五件共用）：**重**——这是域的「公共底座」，popover 面板/参数校验/服务端限额联动/Ace 补全高亮都在这里
- 四个复杂类型配置器：PROPAGATION **轻**（底座+小表单）、两个聚合 **中**（metrics 面板+周期/水位联动）、GEOFENCING **中偏重**（zone 两件套+relation levels 拖拽+无地图但状态最多）
- 建议交付顺序：底座（骨架+参数+输出+SIMPLE）→ SCRIPT+测试对话框 → PROPAGATION → 两聚合 → GEOFENCING → 实体 tab 挂载+导入导出收尾

**裁决点（需拍板）**：

1. **M14 范围是否含 ALARM 型（alarm-rules 域）**：ngx 独立页明确排除 ALARM（§14-2）。倾向：M14「计算字段独立页」只做 6 型 + 4 实体 tab 挂载；alarm-rules 域（ALARM 型 CF 的表单/条件/排程组件群，本身就是 20+ 文件）单列后置或砍给后续里程碑，spec 登记边界。
2. **SCRIPT/TBEL 编辑器选型**（issue #16「复杂编辑器」的正解）：ngx 无专用编辑器，只是 Ace+TBEL+动态补全。倾向：ui-antd 用现有代码编辑器资产（M11 SCADA/规则链已有）包一层「参数名补全 + TBEL 高亮 + 测试按钮」，不造可视化编辑器；补全/高亮规则可直接抄 models.ts:606-1042 的数据结构。
3. **GEOFENCING 是否进 M14 首波**：实测无地图组件（§7.2），纯表单但状态最多（zone 面板 10+ 字段+relation levels 拖拽）。倾向：按上面交付顺序放末波；若 M14 工期紧，可像上游一样先交 5 型、geofencing 单独一票（需 spec 明确写「M14 不含 geofencing」而非默认全量）。
4. **服务端 8 限额参数的消费深度**：antd 表单必须接（不然校验边界错）。倾向：M14 只消费 authState；tenant-profile 配置页暴露这 8 字段属 tenant-profile 域，不进 M14（登记依赖）。
5. **debug 体系复用**：CF 的 debug settings 按钮/策略面板/debug 事件表是通用件（entity-debug-settings + event-table）。ui-antd 若 M12 通知/M13 已有等价物则复用；若没有，这是新增共享件，工作量按独立件计提——需在开工时先盘 ui-antd 现状。
6. **iot-hub「Add from IoT Hub」入口**：入口挂在 CF 列表addActionDescriptors 里（§11），但依赖整个 iot-hub 域。倾向：M14 不做此按钮（antd 列表少一个入口不影响其余功能），登记为 iot-hub 域依赖项。
7. **导入导出保留度**：ngx 有完整 JSON 导入导出+租户 id 改写（§9）。倾向：保留（对齐 fork「类 PE 功能重实现」方向）；导出格式与上游互通，改写逻辑照抄。
8. **详情页形态**：ngx=抽屉+独立详情页双入口（pageMode rowPointer）。倾向：对齐 M13 OTA 已定形态（独立页+抽屉/弹窗），不新增交互模式。
9. **上游小瑕疵处理**：ngx TS 模型漏 entityCoordinates（§7.2）、related-agg 硬写 scheduledUpdateInterval（§7.3）、relationType 写死（§14-9）。倾向：antd 侧修掉（模型补全、常量收口成配置），不改后端契约。
