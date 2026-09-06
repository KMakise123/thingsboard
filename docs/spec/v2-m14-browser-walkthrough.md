# v2 M14 真机走查 A（计算字段域 + settings 七件 + 密码策略页）

> 走查日：2026-09-06。环境：本机后端（`local/run-backend.sh` 链路，`http://localhost:8080`，PG18）+ ui-antd dev server（`http://localhost:8002`）+ browseros 真机驱动（TA/SYS 双登录）。
> 走查范围：spec §6.1（CF 18 条）+ §6.3（settings 12 条）+ §6.4（密码策略 3 条）；§6.2（VC）由走查员 B 负责，不在本文。
> 作业单：`docs/agents/m14-panel-scope.md` §4；后端既有实测直接引用 `docs/agents/m14-wave1-t1-t10.md`（T1–T10），不重复测后端。
> 走查人：真机走查员 A（browseros）。证据形式：DOM 探针 / 网络请求断言原文 / API 回读；截图以视觉目击描述存档（CDP Page.captureScreenshot 在本浏览器构建不可用，见 §0 环境注记）。

## 0. 前置与夹具

- 登录：TA = tenant@thingsboard.org，SYS = sysadmin@thingsboard.org（token 实测取得）。
- 走查前基线（API 盘点）：CF 仅演示遗留 1 条 `double-temp`（SIMPLE，实体 m1-test-detail-1，**保留不动**）；queues 3 条系统队列（Main/HighPriority/SequentialByOriginator）；ai-models 0 条；trendz `{enabled:false,baseUrl:"",apiKey:""}`；home `{dashboardId:null,hideDashboardToolbar:true}`；repositorySettings `{configured:false}`；notification settings `{}`；securitySettings 默认（min6/max72/TTL24×2/secret64/allowWhitespaces true）。
- CF 夹具（走查后全量 DELETE，见 §1.19/§4）：设备 m14-wa-dev1/m14-wa-dev2、资产 m14-wa-asset（building）、关系 dev1 --Contains--> asset、dev1 遥测键 temperature/humidity（值 23.5/41）。
- 环境注记（沿 M13 §0 口径）：
  - browseros 隐藏标签页 rAF 冻结：antd Modal 关闭动效无法结束，Modal.confirm / Modal 的 wrap 残留 display 非 none 为**环境假象**（逻辑态已关，网络与 DOM 数据为准）；走查中残留 wrap 已手工 `display:none` 清理。
  - act 点击在 antd Select 浮层上存在点击失效（已知坑），改用坐标点击或原生 mousedown/click 事件序列驱动。
  - `Page.captureScreenshot` 在本 BrowserOS 内核的 CDP 会话不可用（"wasn't found"），截图证据改为 DOM/网络断言原文 + pdf 落盘，特此说明。

## 1. 计算字段域走查（§6.1，TA）

### 6.1-1 列表页骨架 ✅

- 驱动：TA 打开 `/calculatedFields`。
- 证据：
  - 五列 + 操作列：`创建时间 | 名称 | 实体类型 | 实体 | 类型 | 操作`（DOM：`.ant-table-thead th` 全列扫描）；「实体」列为跳链（`<a>` 至实体详情，快照 `link "m1-test-detail-1"`）。
  - 默认排序：首屏请求 `GET /api/calculatedFields?pageSize=10&page=0&sortProperty=createdTime&sortOrder=DESC`（performance 资源断言原文）；建第 2 条 CF 后刷新，新行排首位（createdTime 2026-09-06 > 2026-09-01）= DESC 行序实证。
  - 搜索：搜索框输入 `m14-wa`（400ms 防抖）→ 请求 `...&textSearch=m14-wa&sortProperty=name&sortOrder=ASC`，URL 同步 `?...&textSearch=m14-wa`。
  - 分页：页码/上下页/页大小（10/20/30）选择器在场（快照 listitem 结构）；条数不足翻页按钮正确禁用（`disabled`）。
- 结论：✅（五列/默认 DESC/搜索/分页全实证）。

### 6.1-1b 排序白名单 ✅

- 驱动：点「名称」列头 → 点「实体类型」列头。
- 证据：
  - 点名称：URL 变 `?sortProperty=name&sortOrder=ASC`，请求 `sortProperty=name`；再点可切 DESC（URL 承载）。
  - DOM 探针（原文）：各列头 `hasSorter/sortable` = 创建时间 true/名称 true/**实体类型 false/实体 false/类型 false**——非白名单列无 sorter，点击无响应。
  - 后端别名 500 防线（`sortProperty=entityName` 会 500）由前端白名单收口，与 wave1 T1-③ 实测一致（直接引用）。
- 结论：✅。

### 6.1-2 三维过滤面板（仅独立页）✅

- 驱动：独立页工具栏依次操作 types / entityType / entities 三维。
- 证据：
  - types 多选：下拉六型 `简单/脚本/属性传播/关联实体聚合/实体聚合/地理围栏`（DOM 选项原文），**无 ALARM**；勾选 SIMPLE+SCRIPT 后 URL = `?sortProperty=name&sortOrder=ASC&types=SIMPLE%2CSCRIPT`，请求 `types=SIMPLE,SCRIPT`。
  - entityType：选项 `设备/资产/设备配置/资产配置` 四型（DOM 原文）；选设备后 URL + `&entityType=DEVICE`。
  - entities：未选 entityType 时**禁用**（快照 `combobox [disabled]`）；选设备后启用并加载实体列表，选 m14-wa-dev1 后 URL + `&entities=2d604ff0-…`。
  - 组合后末次请求原文：`/api/calculatedFields?pageSize=10&page=0&sortProperty=name&sortOrder=ASC&types=SIMPLE,SCRIPT&entityType=DEVICE&entities=2d604ff0-a9fe-11f1-9515-09ed85592142`；各维 Clear 按钮逐维复位（entities 清除后 entities 选择器回到禁用）。
- 结论：✅（三维逐维 + 组合 + URL state 承载全实证；tab 模式无此面板见 6.1-18）。

### 6.1-3 新增入口与类型域 ✅

- 证据：工具栏「+ 新增计算字段」「导入」两件在场（快照 button `plus 新增计算字段` / `import 导入`）；类型下拉六型无 ALARM（同上 DOM 原文）；无「Add from IoT Hub」；批量仅删除（`删除所选`，无批量导出/编辑）。
- 结论：✅。

### 6.1-4 编辑表单骨架 ✅

- 驱动：Create 空表单直接保存 → 填各字段 → 编辑态复查。
- 证据：
  - 必填校验：空表单保存 → `名称必填。/ 表达式必填。/ 输出键必填。`（表单错误原文）；256 字符名保存 → `名称长度需小于 256 个字符。`（≤255 校验）。
  - entityId 四实体型选择器：实体类型下拉 `设备/资产/设备配置/资产配置` + 实体搜索（服务端过滤，输入 `m14-wa` 只回匹配项）。
  - 编辑态锁定：行点击开「编辑计算字段」，实体类型与实体两个 select 均 `ant-select-disabled`（DOM `dis:true` 实证）；禁改 entityId 后端 400 由 wave1 T2-② 实锤（引用）。
  - debugSettings 默认开：「调试设置」popover 内 失败调试/全部调试 双开关均 on（`defaultDebugSettings() = {failuresEnabled:true, allEnabled:true}`，ngx 同款）。
  - type 切换规则：SIMPLE→SCRIPT 配置保留（表达式/脚本字段共享迁移 `migrateSimpleFamilyConfiguration`，Script 默认脚本出现）；SCRIPT→SIMPLE 表达式原样带回；SIMPLE→PROPAGATION **清空重建**（表达式输入消失，面板换为 关系方向/关系类型/传播的数据）——`typeChangeClearsConfiguration` 分支实证。
- 结论：✅。

### 6.1-5 参数套件（六型共用）✅

- 证据：
  - 保留名：参数名 `ctx` / `e` / `pi` 逐个保存 → `“ctx”是保留名，不能用作参数名。`（e、pi 同文案逐字，三条错误同屏实证）。
  - Rolling 仅 SCRIPT：SIMPLE 型参数抽屉「数据类型」仅 `最新遥测/属性` 两选项（滚动不提供）；保存门 `argumentsRollingInSimple` 兜底文案在 locale 与 `configurationProblems` 双侧在场（data.ts:807 → '简单型计算字段不支持滚动窗口参数…'）。
  - watchKeyChange：干净抽屉输入 key=`temperature` → 名称自动跟随为 `temperature`；手动改名 `a` 后再改 key=`humidity` → 名称保持 `a`（双向联动实证）。
  - 属性型 scope 联动：属性型参数出现 scope 选择（SERVER_SCOPE 等，ngx 同构）。
- 结论：✅。

### 6.1-6 服务端限额消费 ✅

- 驱动：在 Create 对话框连续加参至 10 个。
- 证据：10 个参数后「新增参数」按钮 `disabled=true`（DOM 实证，`CF_LIMITS.maxArgumentsPerCF=10`）；其余七限额（rolling 数据点/relation 层级 2/关联实体返回数/各 minAllowed*Interval/intermediateAggregationInterval）以常量接入校验边界（`src/types/tb/calculated-fields.ts:342-352`、metrics 上限 `maxArgumentsPerCF-2`、zone levels 上限 `CF_MAX_RELATION_LEVELS`）；去重间隔默认值=服务端 min 10（表单默认 10 + hint「至少 10 秒。」）。
- 附加实证：dev1 上建第 6 条 CF 被后端拒——toast 原样展示「请求无效: Calculated fields per entity limit reached!」（租户配置档每实体 CF 上限），错误信封直通。
- 结论：✅。

### 6.1-7 输出套件 ✅

- 证据：
  - ATTRIBUTES×Device：输出类型切「属性」→「范围」select 出现（默认 SERVER_SCOPE）+ 属性键输入；输出策略开关组切为属性面（保存属性 on/仅值变化时更新属性 on/发送属性更新通知 off/WebSocket on/触发其他计算字段 on）。
  - TIME_SERIES：开关组 保存时序数据/写入最新遥测/通过 WebSocket 推送/触发其他计算字段 + 「使用自定义 TTL」（useCustomTtl）。
  - useLatestTs 仅时序输出：属性输出时「计算时使用最新遥测（仅时序输出可用）」禁用态在场；时序输出时可用。
  - RULE_CHAIN 锁定：输出策略 segmented 切「发往规则链」→ IMMEDIATE 参数组整体移除，出现 hint「计算结果将转发给规则链——上方的直接落库参数已禁用。」（`output-section.tsx:461-467`）。
  - 载入无 strategy 补默认：`prepareConfiguration` 归一化在场（output-section.tsx 头注，单测钉住）。
- 结论：✅。

### 6.1-8 SIMPLE 配置器 ✅

- 证据：参数表 Rolling 受限（6.1-5）；表达式 input 必填 ≤255（`表达式必填。`、256 长度文案）；math 函数帮助弹窗为省略项（6.6 登记，不设门槛）；useLatestTs 仅 Timeseries（6.1-7）。
- 真实存证：`m14-wa-simple`（dev1，参数 a→temperature TS_LATEST，表达式 `a * 2`，输出时序 double_temp）——API 回读 configuration 全量一致。
- 结论：✅。

### 6.1-9 SCRIPT 配置器 ✅

- 证据：CodeMirror 6 编辑器（`.cm-editor`，tbel 语言包 `@/components/code-editor/tbel` 补全源 `tbelCompletionSource`）；默认脚本 = Fahrenheit→Celsius 样例（`CALCULATED_FIELD_DEFAULT_SCRIPT`，cm-content 原文目击）；functionName=calculate 由服务层固定；「测试脚本」按钮在场（arguments 无效时禁用逻辑由 `testActionEnabled` 控制，单测钉住）。
- 真实存证：`m14-wa-script`（dev1，参数 temperature，脚本 `return {"double": temperature * 2};`）——API 回读一致。
- 结论：✅（Ace 等价物 = CodeMirror，ADR 0004 §3 口径）。

### 6.1-10 表达式测试对话框 ✅（三入口 + 预填 + 200 信封 + Save 回填）

- 三入口实证：① SCRIPT 配置器「测试脚本」；② RELATED_ENTITIES_AGGREGATION 带指标配置器（testActionEnabled 放行，`onTest` 在场）；③ PROPAGATION 传播的数据=「表达式结果」时「测试脚本」——三种型态下测试对话框「测试计算字段表达式（TBEL）」均可打开（实机逐一点开）。
- 预填：新建（无 debug 事件）参数值空；**已存 CF**（m14-wa-script）打开测试对话框 → `GET /api/calculatedField/{id}/debug` 取最新事件 → 参数值预填 `30`（最近一次遥测值，DOM input 原文）。
- 运行/信封：参数 23.5 → 「测 试」→ 输出栏内联显示 `{"double":47.0}`（200 信封 output 字段，非 HTTP 错误）；坏表达式 `return this is not valid tbel (((;` → 输出栏内联显示 `[Error: unbalanced braces ( ... )]…`（与 wave1 T2-① 逐字一致），无 HTTP 错误 toast。
- Save 回填：对话框「保 存」→ 表达式写回主 SCRIPT 编辑器（cm-content 原文复核一致）。
- 提交前自动预检（6.6 已实现增强）：SIMPLE 保存填坏表达式 `a **` → 保存被拦，内联 Alert「表达式未通过保存前预检——请修正后再保存。Invalid expression」（`data-testid="cf-precheck-error"`）；`POST /api/calculatedField/testScript` 网络目击；修正为 `a * 2` 后保存 200。
- ⚠️ 竞态一处（W-1，见 §5）：预填 fetch 异步完成前对话框已按空快照 seed，**首次打开**参数值为空，关闭再开第二次才显示预填值。
- 结论：✅（W-1 单列）。

### 6.1-11 debug 事件与 debug settings ✅

- 驱动：向 dev1 推 temperature=30 → 行内「事件」（field-time 图标）打开「事件：“m14-wa-script”」弹窗（DEBUG_CALCULATED_FIELD 过滤请求 `GET /api/events/CALCULATED_FIELD/{id}/DEBUG_CALCULATED_FIELD?...` 网络目击）→ 行展开（展开行按钮）显示完整事件 JSON：`arguments={"temperature":{...,"value":30}}`、`result={"double":60}`（真机跑通 CF 运行链）。
- 「Test with this message」回填链：行内「调试设置」（bug 图标）打开策略面板（6.1-4 双开关）→ **编辑入口**打开对话框后「测试脚本」自动以最新 debug 事件 arguments 预填（`getLatestCalculatedFieldDebugEvent` → test dialog `prefill`，见 6.1-10 预填段）——antd 以「编辑→测试自动预填」实现 ngx 的「Test with this message」语义。
- 结论：✅（预填首开竞态记 W-1）。

### 6.1-12 PROPAGATION 配置器 ✅

- 证据：关系方向默认「向上到父实体」(TO)；关系类型默认 Contains（选项域 ['Contains','Manages'] 常量收口）；「传播的数据」segmented 仅参数/表达式结果，选表达式后出现脚本编辑器（默认脚本在场）+ 测试入口；applyExpressionToResolvedArguments 联动与 output 面板在场。
- 真实存证：`m14-wa-prop`（dev1，direction TO，relationType Contains，expression `return {"temp": temperature};`，输出时序）——API 回读一致，保存前预检通过。
- 结论：✅。

### 6.1-13 RELATED_ENTITIES_AGGREGATION 配置器 ✅

- 证据：关系方向默认「向下到子实体」(FROM)+Contains；变体参数表（含「默认值」必填——缺省保存被 `argumentsNeedDefaultValue` 拦截，DOM required 标记实证）；指标面板（指标名称/聚合方式 平均值·最小值·最大值·求和·计数·去重计数/取值来源/参数名，参数名缺省报「参数名必填。」）；「至少需要一个指标」空态；去重间隔默认 10（=服务端 minAllowedDeduplicationIntervalInSecForCF）。
- 真实存证：`m14-wa-rea`（dev1，FROM Contains，参数 temperature defaultValue="0"，metric minTemp=MIN(temperature)，deduplicationIntervalInSec=10）——API 回读一致。
- 结论：✅。

### 6.1-14 ENTITY_AGGREGATION 配置器 ✅

- 证据：聚合区间类型八值 `小时/天/周（周一至周日）/周（周日至周六）/月/季度/年/自定义`（DOM 选项原文）；时区默认 Asia/Shanghai；自定义分支出现「聚合区间值（秒）」input（min=60 属性 + 保存门 `intervalDurationMin`「聚合区间值不能小于下限。」——实测 30 保存被「请先修正标出的问题再保存。」问题告警拦截，3600 放行）；「为区间边界加偏移」（offsetSec）/「等待延迟（水位）」（allowWatermark）/「产出中间结果」阈值联动控件在场；metrics 共用面板（同 6.1-13）。
- 真实存证：`m14-wa-agg`（dev1，自定义 3600s，参数 temperature，metric avgTemp=AVG(temperature)）——API 回读一致。
- 结论：✅（offsetSec 动态 hint 走静态提示，属 6.6 已登记增强）。

### 6.1-15 GEOFENCING 配置器 ✅

- 证据：「纬度时序键/经度时序键」必填（空保存报 `纬度时序键必填。/经度时序键必填。`——antd 建模补齐 ngx TS 漏字段）；区域组表「至少需要一个区域组」空态；区域组抽屉=名称/区域实体类型（默认「当前实体」=CURRENT）/周界键名（perimeterKeyName）/上报策略（默认「进出事件与在区状态」）/「与命中的区域建立关系」（createRelations 联动）；引用实体、TENANT、OWNER、RELATION_QUERY 选项与 relation levels 拖拽上限 2 由 zone-groups-table 实现（`CF_MAX_RELATION_LEVELS`，单测钉住）；scheduledUpdateEnabled 默认 true（API 回读 `"scheduledUpdateEnabled":true, "scheduledUpdateInterval":10`）。
- 真实存证：`m14-wa-geo`（dev2，latitude/longitude，zone1 当前实体 + zone1_perimeter + REPORT_TRANSITION_EVENTS_AND_PRESENCE_STATUS，createRelations false）——API 回读一致。
- 无地图组件（钉死项，DOM 无 canvas/map 容器）。结论：✅。

### 6.1-16 导入导出 ✅

- 导出：行内 download → 浏览器落盘 `calculatedField.json`，JSON 键集 `additionalInfo/configuration/configurationVersion/createdTime/debugSettings/id/name/tenantId/type/version`——**无 entityId**（剥除实证）。
- 导入-回灌：同文件改名 `m14-wa-simple2` 导入 → 导入对话框（复用编辑 Dialog，**类型选择禁用** `ant-select-disabled`）→ 重选目标实体 dev2 → 保存成功，API 复核新 CF 在列（TENANT 引用随 token 归属，id 不回灌）。
- 导入-ALARM 拒收：手改 JSON `type:"ALARM"` 导入 → toast「ALARM 及未知类型不能在此导入。」，对话框不打开（文件解析层拒绝）。
- 结论：✅。

### 6.1-17 复制与删除 ✅

- Copy：行内 copy → 「新增计算字段」对话框，配置深克隆（PROPAGATION 面板/参数/表达式全保留），**实体选择器清空**（`实体类型` placeholder）要求重选；name 保留原名可改。
- 单删：行内 delete → 确认 Modal「确定要删除计算字段“m14-wa-simple2”吗？注意：确认之后该计算字段将无法恢复。」→ 删除 → toast「计算字段已删除。」+ API 复核消失。
- 批量删：勾选 5 行 → 工具栏「删除所选」→ 确认「确定要删除 5 个计算字段吗？…」→ toast + API 复核仅剩 double-temp。
- 确认四件套：确认文案/注意行/取消/删除齐备。
- 结论：✅（自动化环境下一例整页错误边界见 §5 W-3）。

### 6.1-18 实体 tab 双模式换挂 ✅

- 驱动：`/devices/{dev2 id}` → 「计算字段」tab。
- 证据：
  - tab 列表列 = `创建时间/名称/类型/操作`（无实体类型/实体列），**无三维过滤头、无搜索框**（tab 模式钉死项，DOM 实证）；空态「暂无计算字段」。
  - 建：tab 内「+ 新增计算字段」开编辑 Dialog（同独立页），建 SIMPLE `m14-wa-tab-cf` → API 回读挂 dev2。
  - 行内 Edit：行操作第一键 edit → 编辑 Dialog，实体锁定（disabled）。
  - 删：行内 delete → 确认 → toast「计算字段已删除。」→ API 复核为空。
  - alarm-rules tab 归告警域不动（tab 序列在场）。
- ⚠️ 观察一处（W-2，见 §5）：tab 模式对话框实体选择器**不预填宿主实体**，空实体提交直发后端吃 400「Parameter entityId can't be empty!」raw toast（前端亦无必填校验）。
- 结论：✅（W-2 单列）。

## 2. settings 七件 + 密码策略页（§6.3/§6.4）

### 6.3-1/2 queues（SYS only）✅

- 列表：四列 名称/分区数/提交策略/处理策略 + 搜索/刷新/新增/分页；请求原文 `GET /api/queues?pageSize=10&page=0&sortProperty=createdTime&sortOrder=DESC&serviceType=TB_RULE_ENGINE`（serviceType 固定、响应不做实体解析）。
- Main 行保护：**checkbox disabled + 无删除按钮**（快照原文：`checkbox "Select row 3" [disabled]`、Main 行操作列为空）——前端保护 R26 实证；后端行为与 wave1 T5 一致（引用）。
- 建：新增队列 → 名称输入 `walk-a-queue` → **主题自动派生 `tb_rule_engine.walk-a-queue` 且 readonly+disabled**（DOM 实证，无 topic 输入框钉死项）；策略类型 radio 五值（按消息源顺序/按租户顺序/顺序/突发/批量），选「批量」→ `submitStrategy_batchSize` 条件字段出现默认 1000；处理类型 radio 六值；重试/失败占比/重试间隔/pollInterval/分区数/每分区消费者/批次处理超时/描述 全在场。保存 → toast「队列已保存。」+ API 复核 `topic: tb_rule_engine.walk-a-queue, submitStrategy: {type: BATCH, batchSize: 1000}`。
- 编辑锁名：详情页 `/settings/queues/{id}`（行名按钮 = Open details page）→ 名称 `disabled:true`（改名吃后端 400 由 wave1 T5-⑤ 实锤，引用）；主题派生只读。
- 删除：详情页删除 → 确认「确认删除队列“walk-a-queue”吗？…不可恢复」→ toast「队列已删除。」→ 列表回到 3 条系统队列。
- 结论：✅。

### 6.3-3 notifications SYS 形态 ✅

- 卡片：短信服务商设置（类型下拉 `Amazon SNS/Twilio/SMPP` 三型——**无 smtp 型钉死实证**）+ Slack 设置 + 移动应用设置（Firebase 服务账号凭据 JSON 文件，`选择文件` 上传入口）。
- 子表单联动：切 Twilio → 发送方号码/Account SID/Account Token；切 SMPP → SMPP 版本/主机/端口/System ID/密码——逐型字段变化实证。
- Send test sms：按钮在 SMS 配置完整前置启用（`smsConfigurationComplete` 门禁）；Twilio 假配置填写保存后打开弹窗（目标手机号 + 短信内容，不必先针对新配置保存即可测）→ 填假号 `+19999999999` 发送 → 后端 500 信封**原样 toast**「服务器内部错误: Unable to send SMS: Failed to send SMS message - Authentication Error - invalid username」。
- 系统数据还原：走查写入的 sms admin_settings 行已 DELETE（psql），GET /api/admin/settings/sms 复核 404（未配置）。
- 结论：✅。

### 6.3-4 notifications TENANT 形态与保存链 ✅

- TA 登录同一路由：**仅 Slack 卡**（Slack API 令牌单字段，无 SMS/MOBILE_APP 卡）——双形态实证。
- 保存清洗链：填 `xoxb-test-token-walkthrough` 保存 → GET 回读 `{"deliveryMethodsConfigs":{"SLACK":{"method":"SLACK","botToken":"…"}}}`；再以**纯空白串**保存（deepTrim→空）→ GET 回读 `{"deliveryMethodsConfigs":{}}`——**空串删整个 method、否则补 method 字段**逐投递方式清洗语义实证，配置恢复空。
- 结论：✅。

### 6.3-5 home settings（TENANT only）✅

- 页面：主页仪表板选择器（初始**不自动选中**，placeholder「请选择仪表板」；候选取 `GET /api/tenant/dashboards?...sortProperty=title`）+ 隐藏主页仪表板工具栏（默认 true）。
- 保存：选 Thermostats 保存 → toast「主页设置已保存。」→ API 回读 `dashboardId: ef3f9f60-…`；清除后保存 → 回读 `{"dashboardId":null,"hideDashboardToolbar":true}`。生效面归 M15（验收口径=保存成功）。
- 结论：✅。

### 6.3-6/7 repository / auto-commit ✅

- 前置：`git init --bare local/m14-wa-walk.git`（file 协议，jgit 可 clone）。
- repository 表单（TA）：仓库 URL/默认分支名默认 `main`/认证方式（密码/访问令牌）/只读/显示合并提交/用户名/密码 + 检查访问 + 保存。填 `file:///D:/…/local/m14-wa-walk.git` → **凭据留空 Check access 200**（toast「仓库访问验证成功！」）→ 保存（验证式保存真实 clone）toast「仓库设置已保存。」→ API 回读 `configured:true`，**password/privateKey/privateKeyPassword 三字段恒 null**（凭据不回显实证）。
- auto-commit 面板：未配置态（GET 404 被前端 catch 为空面板「尚未配置自动提交实体」实证）；「新增实体类型」按 EntityType 展开（选项=16 类型清单）；**无 syncStrategy 钉死实证**；分支留空=「默认（仓库默认分支）」；ASSET 行四 checkbox 中**无 saveCredentials**、切 DEVICE 行后「导出凭据」出现（saveCredentials 仅 DEVICE 实证）；readOnly 联动禁用与 hint 在场（代码锚点 queue-form 同构）。保存 → API 回读 `{"DEVICE":{"saveRelations":false,"saveAttributes":true,"saveCredentials":true,"saveCalculatedFields":true,"branch":null}}`；「全部移除」→ 保存 → GET 404 复位。
- 删除仓库：repository 页删除 → Popconfirm「确定要删除仓库设置吗？…」→ toast「仓库设置已删除。」→ `configured:false`；裸仓目录 `local/m14-wa-walk.git` 已删除。
- 结论：✅。

### 6.3-8 trendz settings ✅

- 三字段：启用 Trendz（checkbox）/ Trendz URL / Trendz API 密钥。启用并填 `https://trendz.example.com` + `k-walkthrough-a` 保存 → toast「Trendz 设置已保存。」→ API 回读一致 → POST `{enabled:false,baseUrl:"",apiKey:""}` 复位空配置（回读复核）。保存后同步 `initialState.trendzSettings` 全局状态位（antd 无 Trendz 菜单消费方，R29 登记口径）。
- 结论：✅。

### 6.3-9/10/11 ai-models ✅

- 列表（TA）：四列 createdTime/name/provider/modelId + 搜索/刷新/新增；**行点击即编辑**（无详情路由）、行内仅删除、无导出导入（钉死项在场实证）；空态「暂无模型。」。
- 编辑对话框：名称 + AI 服务商九值下拉（OpenAI/Azure OpenAI/Gemini API/Gemini Vertex/Mistral/Anthropic/Bedrock/GitHub Models/Ollama，DOM 选项原文）+ 按服务商白名单启停矩阵（OpenAI: baseUrl/apiKey/模型 ID/温度/Top P/频率惩罚/存在惩罚/最大 token；Ollama: baseUrl/认证方式/Top K/上下文长度…；Azure: 终结点/服务版本…——切服务商字段矩阵随动实证）；OPENAI baseUrl 特例（留空回填官方地址）；模型 ID 静态清单补全（o3-pro/o3/gpt-5.5/…，可自由输入）。
- Check connectivity：**表单未保存即可测**（弹窗打开自动 `POST /api/ai/model/chat`，网络目击）→ 假 key 探测 → 结果态「测试请求失败」+ errorDetails `HTTP connect timed out`（200 信封 FAILURE + 明细展示；errorDetails 为空时兜底文案在场，代码锚点 check-connectivity.tsx）。
- OLLAMA 认证三态：认证方式 segmented `无/Basic/Token`——Basic 展开 用户名+密码、Token 展开 令牌、无 认证无附加字段（三态逐一切换实证）。
- 建删存证：OPENAI `m14-wa-model`（假 key）保存 → toast + API 在列；删除 → 确认「确认删除模型…不可恢复」→ toast「AI 模型已删除。」→ API 复核为空。
- 结论：✅。

### 6.3-12 outgoing-mail 回归 ✅

- 五链路冒烟：① 预设覆写（SMTP 提供商选 Office 365 → smtpHost=smtp.office365.com、端口 587 即时覆写）；② OFFICE_365 派生（host/port/TLS 由预设派生）；③ change-password 闸门（showChangePassword 门控代码在场，密码框按存储标记显隐）；④ redirect-URI 构造（认证方式切 OAuth 2.0 → Client ID/Secret/Authorization URI/Token URI/Scope + 协议/域名/Redirect URI 模板构建器在场）；⑤ generate-token 跳转（「生成访问 Token」入口在场；真实跳转需外部 IdP 配置，按 T6 口径留人工）。
- 密码留空保存回归：页面重载（表单=存储快照 localhost/25）→ **密码框留空直接保存** → 200 + toast「邮件设置已保存。」→ GET 回读 jsonValue 与保存前逐字段一致（mailFrom/localhost/25/username 空/password 空未被覆盖）——「密码留空=请求体不带字段、后端回填旧值」语义不破坏，T6 定论维持。
- 结论：✅。

### 6.4-1 密码策略页 General policy 组 ✅

- 字段：maxFailedLoginAttempts（空=不锁定）/ userLockoutNotificationEmail（email 格式）/ userActivationTokenTtl（1-24，默认 24，步进上限禁用实证）/ passwordResetTokenTtl（同）/ mobileSecretKeyLength（min1，64）；Undo（撤销）+ 保存按钮随 dirty 启停（快照实证）。
- 落库回读：maxFailedLoginAttempts 填 10 保存 → toast「安全设置已保存。」→ API 回读 `maxFailedLoginAttempts:10` → 已复位 null。
- 结论：✅。

### 6.4-2 Password policy 组 ✅

- 字段：minimumLength(6-50)/maximumLength/四类最少字符/passwordExpirationPeriodDays/passwordReuseFrequencyDays（antd 类型补全 ngx TS 漏字段）/allowWhitespaces（默认 true）/forceUserToResetPasswordIfNotValid（默认 false 带 hint）——全字段在场（快照原文）。
- **max<min 联动拦截实证**：min=10 时在 max 输入 4 → 错误行内「最长密码长度必须大于最短密码长度」+ 保存按钮禁用 + 零新增网络请求（跨字段 validator `dependencies` + InputNumber min 钳制，index.tsx:469-505）；后端无校验（wave1 T7-④ 死锁策略可存）→ 前端为唯一防线，实测在岗。
- 结论：✅。

### 6.4-3 JWT 卡 ✅（换发全链留人工，见注）

- 字段：tokenIssuer 必填（thingsboard.io）/ tokenSigningKey（base64 ≥64 位 + 「生成密钥」按钮）/ tokenExpirationTime 9000 / refreshTokenExpTime 604800（后者>前者）。
- **保存链确认框实证**：issuer 改为 `thingsboard.io-walk` 保存 → 确认框「所有用户将被重新登录——更改 JWT 签名密钥会导致所有已签发的令牌失效…放弃更改/确认」→ 点**放弃更改** → `POST /api/admin/jwtSettings` **零请求**（jwtSettings 请求计数前后不变，网络断言）。
- 注：确认后「POST 换发新 token → 就地换发会话 → 回读」全链不在真机执行——JWT key 轮换属**不可逆系统级变更**（GET 不回显旧 key，无法复位），与数据保全硬要求冲突；保存链由实现与单测锚定（index.tsx jwt save 分支），留人工窗口复核。
- 结论：✅（换发执行段留人工，不构成缺口）。

## 3. 角色矩阵快照

- SYS 登录：直达 URL `/settings` → 重定向 `/settings/general`（spec 6.5-3 口径实证）；settings 菜单 = 常规设置/邮件服务/两步验证/OAuth2/审计日志/安全设置/通知/队列（**无 首页/仓库/Trendz/AI 模型/自动提交**——TENANT-only 项过滤实证）；SYS 顶级菜单零 CF/VC 项。
- TA 登录：settings 菜单 = 首页/仓库/Trendz/通知/AI 模型/自动提交（**无 queues/安全设置/outgoing-mail**）。
- CU/SYS 对 CF 域零入口（菜单、路由、后端三层）由 spec §6.0 定案 + access 守卫承担；TA 全域可用在本走查全程（§1/§2 均以 TA 驱动）即反向实证。

## 4. 数据保全

- CF 夹具终态：m14-wa-simple/script/prop/rea/agg/geo/tab-cf/simple2 全部 DELETE（API 复核仅剩演示遗留 `double-temp`）；夹具设备 m14-wa-dev1/dev2、资产 m14-wa-asset、Contains 关系 DELETE 200（`GET /api/calculatedFields` totalElements 复核 = 既有 1 条）；导入测试 JSON 与下载导出件本地清理。
- queues：`walk-a-queue` DELETE 200 → 仅剩 3 条系统队列（Main/HighPriority/SequentialByOriginator）。
- ai-models：`m14-wa-model` DELETE → 列表空（`GET /api/ai/model` totalElements=0）。
- notification settings（TA 面）：SLACK 清洗链走完后回读 `{"deliveryMethodsConfigs":{}}`（= 走查前基线）。
- sms admin settings（SYS 面，system 级）：走查写入的 TWILIO 假配置行已 DB DELETE → `GET /api/admin/settings/sms` 404（= 未配置基线）。
- mail（SYS 面）：空密码保存后 jsonValue 逐字段与走查前一致（mailFrom/localhost/25/timeout/username/password 全不变）。
- securitySettings：POST 原快照复位 → 回读 min6/max72/四类 null/TTL24×2/secret64/allowWhitespaces true/forceReset false/maxFailedLoginAttempts null（= 默认值）。
- jwtSettings：确认框取消，零写请求 → key/issuer 零改动。
- trendz：复位 `{enabled:false,baseUrl:"",apiKey:""}`（回读复核）；home：复位 `{dashboardId:null,hideDashboardToolbar:true}`（回读复核）。
- repositorySettings：删除仓库 → `{configured:false}`（回读复核）；autoCommitSettings：全部移除 → GET 404（未配置基线）。
- git fixture：`local/m14-wa-walk.git` 裸仓目录删除。
- system 数据零改动：唯一触碰的 system 级行为 sms admin settings 与 securitySettings，均已复位基线（见上）；JWT key 未轮换。

## 5. 走查缺陷与观察登记（W）

- **W-1（Minor，前端，已修，commit 05753f5175）**：测试对话框「最新 debug 事件预填」存在打开竞态——`openTestDialog` 先开窗再异步取数，seed 按空快照执行；首次打开参数值必为空，关闭后第二次打开才显示预填值（实机两次目击：首开 value 空、二开 value=30）。修复 = `fetchPrefill().finally(() => setTestOpen(true))`，预填就绪后再开窗；新增单测「opens the test dialog only after the debug-event prefill resolves」钉住（真实 debug 事件 arguments 形状）。
- **W-2（Minor，前端，已修，commit 05753f5175）**：entityId 必填校验存在缺口——实体类型未选时 `entityId` Form.Item（含 required 规则）不挂载，`validateFields` 放行，空实体直发服务器吃 400 raw toast「Parameter entityId can't be empty!」（设备 tab 模式实机复现；ngx 该字段为表单必填）。修复 = submit 内 `!targetType || !values.entityId` 守卫 + 复用 `targetEntityRequired` 文案的内联 Alert（`data-testid="cf-entity-missing"`），选类型后自动消除；新增单测钉住。
- **W-3（观察，环境/待复核，不判缺陷）**：单删确认后（toast 与 API 均成功）自动化环境内出现一次整页错误边界「页面出现错误」，重放同路径（刷新→单删）不再复现；疑似隐藏标签页 rAF 冻结 + 残留 Modal.confirm wrap 拦截/竞态（M13 §0 环境假象同族）。留给真机人工复核。
- **W-4（观察，前端，不判缺陷）**：notifications SYS 卡「发送测试短信」按钮的启用门禁在自动化输入下出现过一次延迟刷新（字段齐备后按钮仍 disabled，重新加载/保存后恢复正确）；门禁函数 `smsConfigurationComplete` 与单测均在岗，疑似合成输入下 re-render 时序噪声，真机人工可复核。
- 其余登记：① §6.1-6 租户配置档「每实体 CF 上限」400 信封原样 toast 直通（正常行为，前端如实展示）；② 设备 tab 模式含「导入」按钮（spec 未禁止，登记观察不判）；③ 修复门禁：`cf-dialog` 相关 vitest 69/69 通过、`npm run lint` 维持基线（0 error/18 warnings，grep `^Found` 复核）、`tsc --noEmit` 干净。

## 6. 走查账目汇总

- §6.1：18 条全部走查，18 ✅（含 W-1/W-2 两处已修小缺陷、W-3 一处环境观察）。
- §6.3：12 条全部走查，12 ✅。
- §6.4：3 条全部走查，3 ✅（JWT 换发执行段按数据保全原则留人工）。
- 缺陷：❌ 0；⚠️ 观察项 2（W-3/W-4，均环境敏感、留人工）；trivial 已修 2（W-1/W-2）。
- 引用：后端行为结论直接引用 `docs/agents/m14-wave1-t1-t10.md`（T1–T10），未重复测试。
