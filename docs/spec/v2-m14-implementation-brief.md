# v2 M14 实现简报（计算字段 + 版本控制 + Settings 七件 + 密码策略）

> 状态：随 M14 开工落盘（2026-09-06）。实现者（agent 或人）动手前必读本文 + `docs/agents/m14-implementation-notes.md`；验收载体 = `docs/spec/v2-subsystems-acceptance.md` §6（随 M14 开工定稿落盘，定稿起草稿见 `docs/agents/m14-panel-scope.md` §1）。M14 收尾后本文件可归档。

## 0. 必读材料与优先级

1. 本文（waves 切分 + 已定裁决 + wire 契约 + 合议遗留）
2. `docs/spec/v2-subsystems-acceptance.md` §6（验收条目，实现不得砍条目；开工时按 panel-scope §1 起草稿定稿，含 §2 里程碑表「六小件→七件」勘误与修订记录补条）
3. `docs/agents/m14-implementation-notes.md`（ui-antd 落位范式：可复用件清单、服务层缺口表、测试/e2e 现状）
4. `docs/agents/m14-panel-arch.md`（37 条架构裁决 R01–R37 + 七波切分，落位以它为准）
5. 域侦察按需查锚点：`m14-ngx-inventory-calculated-fields.md` / `m14-ngx-inventory-vc.md` / `m14-ngx-inventory-settings.md` / `m14-backend-contract.md`；合议留痕 `m14-panel-scope.md` / `m14-panel-contract.md`
6. 通用范式：`docs/agents/m12-implementation-notes.md` / `m13-implementation-notes.md`（服务层/列表页/表单/测试范式，M14 不重复抄）

## 1. 已定裁决（不可再议项，合议留痕在 panel 三份文档）

| 类别 | 议题 | 定案 | 来源 |
|---|---|---|---|
| 范围 | settings 交付面 | 七件收口（queues/notifications/home/repository/auto-commit/trendz/ai-models）+ security-settings 密码策略页；outgoing-mail 不入清单只做回归（5 链路 + 密码留空语义） | scope #1/#26 |
| 范围 | CF 交付面 | 六型全量进 M14（SIMPLE/SCRIPT/PROPAGATION/两聚合/GEOFENCING，GEOFENCING 不降级放末位）；ALARM 型不进独立页；alarm-rules tab 归告警域维持 v1 形态 | scope #2/#5、arch R18 |
| 范围 | VC 交付面 | 独立页 + 详情 tab：已挂 6 处回归 + 补挂 3 处 + 无承载 4 类登记不实施（补挂 3 处的构成见文末合议遗留-3）；Edge 详情 VC tab 钉死不做 | scope #3/#4/#11、arch R05 |
| 范围 | home settings | 配置页进 M14（双字段），验收口径=保存成功即达标；生效面（登录落点//home 渲染）归 M15 | scope #6、arch R28 |
| 范围 | 密码策略页 | 整页交付：SecuritySettings 卡 + JWT 卡同页双保存链，不拆页 | scope #7、arch R30 |
| 范围 | trendz / ai-models | 随 M14 全量交付（砍掉即删减）；trendz apiKey 对 CU 泄露不建 CU 入口规避 | scope #8、arch R27/R29 |
| 范围 | queues 角色 | SYS only 照 ngx；TENANT 只读视图登记不实施 | scope #13、arch R26 |
| 范围 | M12/M13 连带 | 三件进正式条目：向导「渠道未配置」跳转链接、notification settings 三函数消费、VC「未配仓库」补跳转；user 级通知偏好维持不实施 | scope #12/#24、arch R11/R25 |
| 范围 | 登记不实施 | pwned-password、iot-hub/mobile-center 域、CF「Add from IoT Hub」、queues TENANT 视图/统计、VC 并排文本 diff、authState 限额接线等——动手前对照 panel-arch §4 清单 | scope #9/#10、arch §4 |
| 范围 | 实测与自动化 | T1–T10 curl 实测随 wave-1 真机执行，结论回写 spec §6.7（trendz 泄露、mail 覆盖语义两项必测）；e2e 回归项归 #12 基线扩充 | scope #26、arch R35 |
| 范围 | 验收体量 | spec §6 定稿预计 51 条（6.1×18 + 6.2×10 + 6.3×12 + 6.4×3 + 6.5×8）+ 6.0 行为契约 + 6.6/6.7 登记面 | scope §1 |
| 落位 | settings 组改造 | 组级 access 放宽 `canSysAdminOrTenantAdmin`，既有五子页显式收窄 `canSysAdmin`；静态 redirect 换按角色入口组件（SA→general / TA→home）；归 wave-1 前置 | arch R01、scope #14 |
| 落位 | 新页路由 | CF=`/calculatedFields`（TA-only 平铺，无详情路由页）；VC=`/versionControl`（TA-only 平铺）；密码策略=`/settings/security-settings`（SA-only）；queues=`/settings/queues`+`:id`；home/trendz/ai-models/repository/auto-commit=TA-only 组内子路由 | arch R02/R03/R04/R23/R26/R27/R28/R29 |
| 落位 | access key | 零新增，全用 `src/access.ts:20-27` 既有 6 个；notifications tab 不写 access 继承组级 | arch R06 |
| 落位 | 服务层增量 | CF 增 5 函数 + 新建 `types/tb/calculated-fields.ts`（7 型判别联合，Geofencing 补 ngx 漏写的 entityCoordinates）；VC 增 listVersions + repositorySettings 四函数 + COMPLEX 类型，轮询基建不新建（POLL_TIMEOUT 120s→180s）；新建 queue/ai-model/trendz 三服务文件；admin.ts 增 securitySettings/jwtSettings/testSms；全部挂 `services/tb/index.ts` | arch R07–R10、contract #12/#17 |
| 落位 | CF 列表形态 | ProTable 手动喂数 + 页面私有 url-state + 排序白名单 `createdTime\|name` 钉死 + types/entityType/entities 三维过滤 + 编辑 Dialog；行内动作 Create/Import/Copy/Export/Events（EventsPanel 零改造复用）/Debug 设置/Delete | arch R12/R15、contract #17 |
| 落位 | SCRIPT 编辑器 | 零新库：`CodeEditor(language='tbel')` + `tbelCompletionSource({contextVariables:[...参数名]})`；SIMPLE=普通 Input；默认脚本照 ngx 搬 | arch R14 |
| 落位 | CF 实体 tab | 共享 `CalculatedFieldsTable` 双模式（entity/tenant），v1 `CalculatedFieldsPanel` 退役、四处详情页同 PR 换挂——与 scope 起草稿有出入，见合议遗留-2 | arch R17、scope 6.1-18 |
| 落位 | CF 限额 | 8 参数按后端默认值落 `CF_LIMITS` 常量消费（10/1000/2/100/10/60/10/300），不接 authState（登记增强）；tenant-profile 暴露面不进 M14 | arch R19、scope #23、contract #21 |
| 落位 | VC diff | 不引 monaco/ace-diff：单实体 diff=既有 DiffModal 字段表（已验收形态）；复数 ngx 本无 diff | arch R21、scope #19 |
| 落位 | repo settings 表单 | 抽共享 `RepositorySettingsForm`（props: detailsMode）三场景复用（settings 壳页 / VC gate / auto-commit gate）；wave-2 首挂 | arch R22 |
| 落位 | auto-commit 页 | 二段 gate + 动态 per-type 列表（无 syncStrategy 钉死）；v1 AutoCommitCard 退役上交拍板（默认执行，见文末偏好项） | arch R23 |
| 落位 | 凭据总范式 | 全 M14 凭据类字段统一「已存即隐藏 + Change 勾选解锁 + 提交剥除未勾选字段」，`stripUnchangedCredentials` 纯函数 + 单测 | arch R31、scope #21 |
| 落位 | locale | 新建 calculated-fields/vc/queue/ai-model 四对域文件；settings 增量进既有目录；menu 子键八个双语；退役面板旧 key 同 PR 删除 | arch R32 |
| 落位 | waves | 七波严格序；波 2/3 与波 4/5 可并行（见 §3） | arch R37 |
| 契约 | admin settings 保存 | 必须带快照 `id`（无 id=创建语义，二次保存必 400）；已交付三页疑似缺陷待修（§2-1） | contract #2、scope #26 |
| 契约 | mail 密码语义 | 留空=删字段（服务端回填旧值）；空串=真覆盖；testMail 通道独立回填 | contract #1/#3 |
| 契约 | VC 凭据三态 | null/缺字段=回填旧值；空串=传空凭据走真实验证；前端留空必须剥字段 | contract #8、scope #21 |
| 契约 | VC 轮询 | POST→requestId→2s 轮询；失败也是 done=true 终态；400 "Invalid task" 与 404 "timed-out" 是非终态要容忍；DeferredResult 上限 180s | contract #10 |
| 契约 | VC 状态源 | hasRepository=`GET /repositorySettings/info`（configured+readOnly 一次拿全）；exists 不进服务层；fork 单机 VC 全端点默认可用 | contract #11/#13 |
| 契约 | queue 矩阵 | 读 SA+TA、写仅 SA；TENANT 非 isolated 列表恒空非 bug；isolated 读系统队列才 403（backend 底稿方向写反已勘误）；更新禁改 name/topic；maxPause≥pause 跨字段校验 | contract #14/#15/#16 |
| 契约 | CF 冲突/禁改 | 同名同型 400 "already exists"；仅 entityId 禁改（400）→ 编辑态锁实体选择器；排序别名（entityName）500 → 白名单硬收 | contract #17/#20 |
| 契约 | testScript 通道 | 错误 200+`{output,error}` 非 HTTP 错；TBEL 未装配 400；后端保存链不校验语法——「是否硬门槛」见合议遗留-1 | contract #19 |
| 契约 | jwtSettings | 保存恒返回当前用户新 token 对，就地换发；旧 token 失效与否只取决于签名 key 是否变更 | contract #5 |
| 契约 | securitySettings | GET 永不 404；passwordPolicy 全字段无服务端校验（max≤min 上限静默失效）→ 前端自校验；passwordReuseFrequencyDays 类型已在 `services/tb/auth.ts:34`，落位调整照 R10 | contract #6 |
| 契约 | ai-model | delete 不存在回 `false` 非 404；chat=Check connectivity 按钮，错误走 200 Failure 信封非 HTTP 错；SSRF 400 | contract #24 |
| 契约 | home / trendz | home 存 `Tenant.additionalInfo`（dashboardId 传 null=清除，与 tenant profile 无关）；trendz GET 未配置=空对象非 404，POST 响应=入参回显 | contract #22/#23 |

## 2. 服务层 wire 契约细节（实测 + 契约盘点结论，写码时直接照做）

### A. settings 域（admin settings / mail / 安全 / 通知）

- **admin settings 保存必须带 id**：`POST /api/admin/settings` 是「无 id 则创建、有 id 则更新」语义（`DataValidator.validate` → `AdminSettingsDataValidator.validateCreate` 同 key 已存在抛 400 "Admin settings with such name already exists!"）；系统初始化即预建 general/mail/connectivity 三条，dao 层 save 无 upsert-by-key。**已交付三页（general/connectivity/outgoing-mail）保存 body 均只回传 `{key, jsonValue}` 不带 id = 疑似缺陷，第二次起保存必 400**。修复：`AdminSettings` TS 类型补 `id` 字段（现 `types/tb/admin.ts:9-12` 无）+ 三页 payload 带快照 id；M14 新 settings 页一律带 id 编码，`saveAdminSettings` JSDoc 钉死该契约。修复落地随 wave-2 settings 回归（contract #2；wave-1 实测 **T6-①** 实锤——若实测 200 则降级重查，但新页带 id 编码不变）。
- **mail 密码留空语义**：GET 恒脱敏；保存是「缺字段回填」——payload 不存在 `password`/`refreshToken` 字段时服务端从旧值回填；**空串 `""` 会以空串落库毁掉邮件发送**。前端姿势：重输密码时带新值、未重输时把字段从 payload **delete 掉**（不是置空串）。outgoing-mail 既有 change-password 闸门（`outgoing-mail/index.tsx:243-246`）语义正确，回归确认不被破坏。OAuth2 联动：providerId/clientId/clientSecret/redirectUri/providerTenantId 任一变更服务端删 refreshToken → UI 引导重新 Generate token。testMail/testSms 用请求体现场发信不必先保存；testMail 缺 password 服务端回填存储值，失败 400 带底层原因（contract #1/#3/#4；**T6-②③④** 坐实回填/空串/回填发信）。
- **jwtSettings 保存=就地换发**：响应是**当前用户新 JwtPair**（与是否改 key 无关）→ 保存链：改 issuer/key 先弹确认框 → POST → 新 token 对写 `token-store` + 刷新 currentUser → 回读刷新表单；取消=不发请求。旧 token 是否失效只取决于签名 key 是否变更。（contract #5；无对应 T，静态源码定案）
- **securitySettings 前端自校验是唯一防线**：GET 永不 404（有默认值）；服务端仅两 TTL 有校验（1-24），passwordPolicy 全字段无范围校验——`maximumLength ≤ minimumLength` 时上限**静默失效**不报错，能存出死锁策略。前端必须做 minimumLength 6-50、maximumLength ≥ minimumLength 联动、refreshTokenExpTime > tokenExpirationTime 等（矩阵照 R30）。`passwordReuseFrequencyDays` 类型已在 `services/tb/auth.ts:22-34`（:34）与 openapi 生成类型——**无需补**，落位调整（auth.ts → `types/tb/admin.ts` + auth.ts re-export）照 R10 执行。`forceUserToResetPasswordIfNotValid` 只改登录行为，页面文案不得暗示「保存即强制所有人改密」。（contract #6；**T7** 坐实默认值/TTL @Min/裸奔三点）
- **notification settings**：五预留函数（`notification.ts:151-202`）与后端逐参数对齐，读写 SA+TA 均可；未配置 GET 返回 `{deliveryMethodsConfigs:{}}`；**保存响应是入参对象本身**（非落库回读）。保存链 deepTrim + 逐投递方式清洗（任一字段空串删整个 method、否则补 method 字段）——纯函数进 data.ts + 单测（two-fa 单次变换教训口径）。testSms 端点 SA only → TENANT 形态无 test 按钮。（contract #7；**T8** 坐实三角色矩阵与空对象语义）

### B. VC 域

- **凭据三态与空串禁提交**：GET 恒脱敏三字段（password/privateKey/privateKeyPassword = null）；提交时 **null/缺字段=服务端回填旧值（判断只认 null）**；**空串=把空凭据交给真实 clone/fetch 验证**（失败整次保存 500、旧值不丢）。前端硬规则：凭据输入框留空时序列化必须**剥除字段**（不发 null、不发空串），封 `stripUnchangedCredentials` 纯函数 + 往返单测；checkAccess 同理。POST 的 `localOnly` 不由前端发（服务端强制 false）。保存是验证式（真实 clone/fetch 成功才落库）。（contract #8；**T3-①②④**）
- **保存 vs 检查的错误形态差**：save 失败 = 500 笼统 "Failed to init repository!"（无底层原因）；checkAccess 失败 = 400 带 "Unable to access repository: \<底层原因\>" → UI 把 Check access 作为保存前置引导，保存 500 的 toast 引导先 Check access。分支名非法（禁空格/`..`/`~`/`^`/`:`/`\`、禁 `/`、`.lock` 结尾）两者都是 400 "Branch name is invalid"。（contract #9；**T3-③⑤**）
- **异步任务轮询序列**：commit/restore = POST 立即回 requestId → **2s 间隔**轮询 status（既有 `awaitVersionCreateResult`/`awaitVersionLoadResult` 直接消费，不新建 hook）。成功与失败都是 **`done=true` 终态**（失败 error 在结果对象里，load 侧为结构化 `EntityLoadError{DEVICE_CREDENTIALS_CONFLICT|MISSING_REFERENCED_ENTITY|RUNTIME}`）。轮询器必须容忍两个**非终态**：400 "Invalid task"（POST 已受理但结果未入缓存的窄窗）与 404 "Task execution timed-out"（结果缓存 TTL 20 分钟/后端重启）——**连续 3 次内继续轮询、超限判失败**（对 ngx「HTTP 错误直接终止流」的等价内稳健性增强）。DeferredResult 硬上限 180s 作用于 POST 与 branches/diff 同步端点，超时 → 500 "Request timeout" 入错误映射；**`POLL_TIMEOUT_MS` 从 120s 提到 180s**（wave-1 一行改动 + fake-timers 测试钉住）。（contract #10；**T4**）
- **hasRepository 状态源**：`GET /api/admin/repositorySettings/info`（`{configured, readOnly}` 一次拿全，未配置 200 非 404）；`/repositorySettings/exists` 不进服务层；实现维持 per-mount `useQuery(['vc-repo-info'])`（`getRepositorySettingsInfo` 已在 `version-control.ts:136`）+ 保存/删除后 `invalidateQueries` 同 key。fork 单机 `vc.git.service=local` 默认激活，VC 全端点可用无后端补洞。（contract #11/#13；T3 前置）
- **autoCommitSettings**：未配置 GET 404 → null（既有降级保持）；branch 名校验先于 ACL；**无**真实 clone 校验（与 repositorySettings 本质差异）；readOnly 仓库时 auto-commit 后端静默跳过 → 设置页 readOnly 整表禁用 + hint。branches 列表 default 分支排首位。（contract #13；**T3-⑤**）

### C. queue 域

- **角色与取数**：列表/按 id/按名 GET = SA+TA，POST/DELETE 仅 SA（TENANT 写 403）；**非 isolated 租户 TENANT 列表恒空**（默认队列在 tenant profile JSON，非 bug）；**isolated 租户读系统队列才 403**（backend 底稿 §1.5 方向写反，contract #14 已勘误）。列表/保存固定传 `serviceType=TB_RULE_ENGINE`（现役 `device-profile.ts:106` 同款；后端 `ServiceType.of` 对 `TB-RULE-ENGINE` 写法归一等价——scope 写连字符、arch 写下划线，两者 wire 等价，执行取下划线）；非该类型保存返回 null 空 body → **不对保存响应做实体解析**。（contract #14；**T5-①②**）
- **校验与禁改**：更新禁改 name/topic（400）→ 编辑态锁 name、topic 由 name 派生 `tb_rule_engine.{name}` 只读展示（纯函数单测）；数字矩阵 pollInterval/partitions/packProcessingTimeout/batchSize ≥1、retries ≥0、failurePercentage 0-100；**`maxPauseBetweenRetries ≥ pauseBetweenRetries` 关系校验**（ngx 表单无此跨字段校验）→ 表单补联动防 400。**Main 队列**：后端无 name=Main 白名单（仅 device profile 外键 400）→ 前端 `queue.name === 'Main'` 禁勾选 + 隐藏删除（列表+详情双处）；「API 层无 Main 保护」登记边界，fork 补后端保护另立 issue 不进 M14。（contract #15/#16；**T5-②③⑤**）

### D. CF 域

- **entityId 一律对象形**：保存体 `"entityId": {"entityType":"...","id":"..."}`（照 `types/tb/entity.ts` 既有对象形态，同 M13 deviceProfileId 规则）；tenantId 服务端强制不用发。**仅 entityId 禁改**（更新改实体 400 "Changing the calculated field target entity after initialization is prohibited."）→ 编辑态锁定目标实体选择器，换实体=删了重建引导。同名同型 400 "Calculated field with such name and type already exists"（ALARM 变体另有文案）。（contract #20；**T1-④ / T2-②**）
- **取数与排序**：独立页走 tenant 全量 `GET /api/calculatedFields`（types 不传默认全类型**剔除 ALARM**；`name` 是可重复 query 参数）；排序白名单**硬收 `createdTime|name`**（dao 四条分页查询全部无列映射，`entityName` 等别名 500——swagger 与 dao 属性名一致，无假文档陷阱），白名单外列头不给排序；**所有列表显式 `createdTime DESC`**（后端缺省 id ASC）。`/api/calculatedFields/names` sortProperty 固定 name。（contract #17/#18；**T1-②③⑤**）
- **testScript 通道**：错误不抛 HTTP——200 + `{output, error}`，error 非空行内呈现**不 toast**；两个例外：TBEL 引擎未装配 → **400** "TBEL script engine is disabled!"；单次执行超时 20s → 超时进 error 字段。后端保存链**不校验表达式语法**（错误照样入库，运行期 debug event 才报错）——「提交前自动预检」的门槛档位见文末合议遗留-1，实现层两档殊途同归（SCRIPT 型/PROPAGATION 带表达式时提交前自动调 testScript，error 非空阻断）。（contract #19；**T2-①③**）
- **服务端限额**：表单消费 `CF_LIMITS` 8 常量（R19：maxArgumentsPerCF=10 / maxDataPointsPerRollingArg=1000 / maxRelationLevelPerCfArgument=2 / maxRelatedEntitiesToReturnPerCfArgument=100 / minAllowedDeduplicationIntervalInSecForCF=10 / minAllowedAggregationIntervalInSecForCF=60 / minAllowedScheduledUpdateIntervalInSecForCF=10 / intermediateAggregationIntervalInSecForCF=300），另两个易漏闸门进表单提示：**每实体非 ALARM 条数上限**（默认 5，超限 400 "Calculated fields per entity limit reached!"）与参数数上限（默认 10，400 "Calculated field arguments limit reached!"）。限额值来源 tenant profile，M14 只消费不编辑。（contract #21；无对应 T，越界 400 文案兜底）

### E. trendz / home / ai-model 域

- **trendz**：GET 未配置返回空对象（非 404）；POST 响应为入参回显；apiKey 对 CUSTOMER_USER 裸露是上游有意设计 → antd 不建 CU 入口即规避，后端收紧另立 issue 不阻塞 M14。（contract #22；**T10**）
- **home**：只做 `GET/POST /api/tenant/dashboard/home/info`；存 **`Tenant.additionalInfo`**（与 tenant profile 无关，勿混写）；GET 恒 200，未配置 = `{dashboardId:null, hideDashboardToolbar:true}`；**dashboardId 传 null = 清除配置**；POST 200 空 body。（contract #23；无对应 T，静态源码定案）
- **ai-model**：5 端点全消费；分页 sortProperty 白名单 `createdTime,name,provider,modelId` 四列安全；**delete 不存在返回 200 body `false`**（非 404，前端按 false 提示已不存在）；**chat = 编辑对话框 Check connectivity 按钮**（表单未保存可测、invalid 禁用；探测消息硬编码照 ngx 不必中文化；不存在的是对话 UI 而非该按钮）；**chat 错误走 200 + Failure 信封**（HTTP 层不报错，前端解析信封而非 catch HTTP）；SSRF：内网 baseUrl → 400 "AI model provider URL is not allowed: ..."；模型候选=前端静态清单，不发明 models API。（contract #24；**T9**）

## 3. Waves（七波严格序；每波收口跑定向门禁并独立 commit，限额中断可从任意波续做）

> 并行说明：**波 1 完成后，波 2→3（settings 线）与波 4→5（CF 线）两段可并行**（无相互依赖）；波 6 依赖波 2 的 RepositorySettingsForm，波 7 收尾。合并顺序即波序。

### Wave 1 —— 服务层 + 类型层 + settings 组改造（全 M14 地基，纯增量无 UI）
- `types/tb/calculated-fields.ts`（7 型判别联合 + `CF_LIMITS` + Geofencing 补 entityCoordinates）、`types/tb/queue.ts`、`types/tb/ai-model.ts`（9 provider + `AI_MODEL_PROVIDER_MAP` 白名单常量）；`types/tb/admin.ts` 增 SecuritySettings/JwtSettings/SMS 三型 + `AdminSettings` 补 `id` 字段；UserPasswordPolicy 从 auth.ts 上移 admin.ts + re-export（R07/R10）。
- `services/tb/`：calculated-fields 增 5 函数；version-control 增 listVersions + repositorySettings 四函数 + COMPLEX 双请求类型 + POLL_TIMEOUT 提 180s + 轮询器容忍 400/404 非终态；新建 queue.ts/ai-model.ts/trendz.ts；admin.ts 增 securitySettings/jwtSettings/testSms + saveAdminSettings JSDoc 钉 id 契约；挂 `services/tb/index.ts`（R07–R09）。
- `config/routes.ts` settings 组改造三件事：组级放宽 + 五子页显式收窄 + `/settings` 按角色入口组件（SA→general / TA→home）（R01）。
- endpoints.test 增量 + 轮询 fake-timers 三路径（R34）。
- **T1–T10 curl 实测随本波真机执行**（scope #26 全量口径；arch 点名 T1/T2/T3/T5/T7/T9/T10 为顺手最小集——T4 依赖 T3 的仓库产物，T6/T8 可与波 2/3 对应页走查合并，结论一律回写 spec §6.7）。
- 门禁全绿 → commit。

### Wave 2 —— settings 速赢 + 密码策略（settings 线之一）
- home（R28，6.3-5）+ trendz（R29，6.3-8）+ security-settings 双卡含 JWT 换发链（R30，6.4-1/2/3）+ `/settings/repository` 壳页首挂共享 RepositorySettingsForm（R22，6.3-6 前半、6.2-2 表单本体）+ locale settings 增量 + 页面测试。
- **已交付三 settings 页 id 修复随本波回归落地**（contract #2，T6 判定紧急度；outgoing-mail 五链路回归 6.3-12 一并）。速赢先行验证组改造没破 SA 既有五页。
- 门禁全绿 → commit。

### Wave 3 —— settings 重件（settings 线之二）
- notifications settings（R25，6.3-3/6.3-4 + 6.5-1 向导跳转 + 6.5-2 三函数消费）→ queues 列表+详情+表单（R26，6.3-1/6.3-2）→ ai-models 列表+编辑+Check connectivity（R27，6.3-9/10/11）→ auto-commit settings 页（R23，6.3-6 后半/6.3-7，依赖 R22 gate 表单）+ locale + 测试。本波最重，内部顺序可按人力再排。
- 门禁全绿 → commit。

### Wave 4 —— CF 底座 + 独立页（CF 线之一）
- 组件树骨架五底座（R13）+ SIMPLE/SCRIPT 配置器 + TBEL 编辑器与测试对话框（R14/R15，6.1-4..10）+ 列表页三维过滤与行内动作（R12，6.1-1/2/3/17）+ 导入导出（R16，6.1-16）+ ALARM 排除钉死（R18，6.1-3）+ locale calculated-fields.ts + 测试。
- 门禁全绿 → commit。

### Wave 5 —— CF 复杂配置器 + tab 升级（CF 线之二）
- PROPAGATION → 两聚合（metrics 面板）→ GEOFENCING（zone 两件套，末位）（6.1-12..15）+ `CalculatedFieldsTable` 双模式抽取 + **v1 面板退役 + 四处详情页换挂 + locale key 迁移删除**（R17/R32，6.1-18——按合议遗留-2 采信 arch 执行，scope 定稿时同步改写措辞）+ 测试。
- 门禁全绿 → commit。

### Wave 6 —— VC 独立页（VC 线）
- page + versions-table + complex create/restore 双面板（R20，6.2-1..7）+ BranchSelect 三形态合一（R24）+ VersionControlPanel 升级顺带（单实体弹层 saveCalculatedFields 显隐/restore 探测补齐 6.2-6 + 「未配仓库」跳转链接 6.2-10；已挂 6 处自动受益 R05）+ diff 形态保持确认（R21）+ locale vc.ts + 测试。
- 门禁全绿 → commit。

### Wave 7 —— 挂载收尾 + 门禁
- VC tab 新挂三处：rule-chains dialog / widget-type details / OTA detail 双 tab 改造（R05，6.2-8）+ AutoCommitCard 退役（R23b，按默认执行；用户可在合并前否决恢复）+ 存量六处 tab 回归（6.2-9）+ 权限快照三登录（6.5-3）+ e2e 登记（R35，6.5-8）+ 横切收尾勾账（6.5-4..7：i18n/主题/数据保全/门禁）+ 全量门禁 + spec §6 勾账前置检查。
- 门禁全绿 → commit。

提交信息风格：`feat(<domain>): ... (M14 wave-N)`，domain 按波次主线取（wave-1 `tb-services`/`routes`，wave-2/3 `settings`，wave-4/5 `calculated-fields`，wave-6/7 `version-control`）；逻辑单元即 commit。

## 4. 横切要求（每波）

- 硬规矩照 `ui-antd/CLAUDE.md`：Biome only、antd token 零内联色、locale zh/en parity（每处 formatMessage 带 defaultMessage；check-locale 双规则——zh/en 全等 + 单 locale 内 key 不重定义）、TS strict、页面测试 mock 三件套（umi/pro-components/intl；ProTable 页加 pro-components→antd Table 替身，先例 `pages/notifications/sent/index.test.tsx:53-75`）。
- 门禁命令与口径：`npm run lint`（biome + check-locale + tsc）+ `npx vitest run <本波目标目录>` 定向全绿；lint 0 error、基线 warnings 只降不升，验收必须 `grep "^Found"` 防截尾；vitest 全量 suite 本机有 flaky 口径——随机挂 1-3 个旧用例时隔离复跑绿即判 flake，波次门禁一律用目标目录跑法。
- 逻辑单元即 commit（限额中断恢复靠 git 逻辑单元保进度）；每波收口门禁全绿再 commit，不攒大提交。
- settings 新页保存链必带 id（§2-A-1）；凭据类字段一律走 R31 剥除范式；每页测试落位照 R33、服务层测试照 R34。
- 波内拿不准的裁决回到本文 §1 与 panel-arch 对应 R 条目；两者都没有的，停下问主会话，不自行发明。

## 5. 风险与已知坑速查

| # | 坑 | 硬规则 |
|---|---|---|
| 1 | 后端缺省排序 id ASC 无时序 | CF/queues/ai-models/VC versions 列表一律显式 `createdTime DESC` |
| 2 | CF 排序别名 500（dao 无列映射） | sortProperty 白名单硬收 `createdTime\|name`，白名单外列头不给排序（T1-③ 实锤） |
| 3 | admin settings 不带 id 二次保存 400 | 保存必带快照 id；三已交付页 wave-2 修复（T6-①） |
| 4 | mail 密码空串=真覆盖 | 留空=从 payload 删字段（服务端回填）；禁置空串（T6-②③） |
| 5 | VC 凭据空串≠留空 | 留空序列化剥字段（`stripUnchangedCredentials`）；GET 三字段恒 null（T3） |
| 6 | VC 保存失败 500 笼统 / checkAccess 400 带原因 | UI 引导「先 Check access 再 Save」（T3-③） |
| 7 | VC 轮询两非终态 + 180s 超时 | 400 "Invalid task"/404 "timed-out" 连续 3 次内继续轮询；POLL_TIMEOUT 提 180s（T4） |
| 8 | CF 同名同型 400 / 更新禁改 entityId | 编辑态锁实体选择器；换实体=删了重建引导（T1-④/T2-②） |
| 9 | testScript 错误在 200 信封不在 HTTP 层 | error 非空行内呈现不 toast；TBEL 未装配是 400 特例（T2） |
| 10 | queue 写 SA only / TENANT 列表恒空非 bug | serviceType 固定 `TB_RULE_ENGINE` 且空 body 不解析；表单补 maxPause≥pause 跨字段防 400（T5） |
| 11 | Main 队列后端无删除保护 | 前端禁勾选+隐藏删除（列表+详情双处）；后端保护另立 issue（T5-③） |
| 12 | jwtSettings 保存即签发新 token | 就地写 token-store 换发；旧 token 失效与否只看 key 是否变更 |
| 13 | passwordPolicy 无服务端范围校验 | 前端自校验全套；max≤min 上限静默失效是根因（T7） |
| 14 | ai-model chat 200 Failure 信封 / delete false | 解析信封而非 catch HTTP；delete 不存在按 false 提示（T9） |
| 15 | trendz apiKey 对 CU 裸露 | 不建 CU 入口即规避；后端收紧另立 issue（T10） |

## 6. 仍需用户拍板的偏好项

- **R23b：v1 AutoCommitCard（六处实体详情 VC tab 内的 auto-commit 卡）是否随 auto-commit settings 页交付退役。** 默认**执行退役**（功能被 settings 页等价覆盖、数据同源、双编辑面互踩、v1 头注自认过渡件）；保留的代价是 settings 页与六张详情卡永久双写同一 map。不表态 = 按默认退役执行（来源：panel-arch §3）。
- **alarm-rules 深化的边界归属（scope 裁决 #2 注记）**：定案为「归告警域、M14 只钉 ALARM 不进独立页」，与「禁止删减」存在表观张力——v1 alarm-rules tab 是已交付在场面非删减，深化属扩范围非补等价；若告警域里程碑迟迟不开，可按能力级增强清单随 M14 波次顺带（不改变验收范围）。
- **dashboard 编辑器 VC stub 接真的波次弹性（scope 裁决 #11 注记）**：scope 原把「占位按钮接真」列入验收并预留降级路径（按钮保留占位、6.6 增强登记）；panel-arch R05 已按「无宿主」登记不实施——若合议遗留-3 采信 arch，本项自动落在该降级路径上，无需单独拍板。

## 7. 合议遗留（三份 panel 文档出入，主会话已终审定档 2026-09-06）

> 采信框架（更新镜头、域内权威序）：契约事实以 contract 为准、落位以 arch 为准、验收范围以 scope 为准。三项已终审，实现波直接按定案执行；spec §6 已同步勘误（6.0/6.1-10/6.1-18/6.2-8/6.5-4/6.6/6.7）。

1. **CF testScript 门槛档位**：scope 6.0/6.1-10/6.7 把「保存前必须 testScript 通过」定为硬门槛；contract #19 则定性「后端不强制（ngx 也不拦），等价基线=不强制，提交前自动预检=推荐增强」。事实层无争议（后端保存链确实不校验语法）；分歧仅在 spec 登记定性。**定案 = (a)**：等价基线不强制；「提交前自动预检（error 非空阻断、TBEL 未装配 400 降级放行+警示）」作为已实现增强登记 6.6，实现波照此交付。
2. **CF 实体 tab 处置**：scope 6.1-18 写「四处 `CalculatedFieldsPanel` 保留」；arch R17/R32 定「v1 面板退役、四处换挂共享 `CalculatedFieldsTable` 双模式 + 旧 key 迁移删除」。**定案 = 采信 arch**：ngx 本就是同一 table-config 双 pageMode，共享表格双模式防双份漂移；验收意图不变（四处 tab 模式无三维过滤头、行内 Edit、alarm-rules tab 不动）。
3. **VC tab 补挂三处的构成**：scope = OTA + rule-chain + dashboard 编辑器按钮；arch = OTA + rule-chain + **widget-type 详情**。**定案 = 采信 arch**：widget-type 路由在 `routes.ts:165-172`（起草人独立复核属实）；dashboard 编辑器 VC 按钮接真落 scope 自带降级路径，登记 6.6。
4. **已核实消解（非矛盾，留痕）**：① queues `serviceType` 措辞——scope 6.0 写 `TB-RULE-ENGINE`、arch R09 写 `TB_RULE_ENGINE`，后端 `ServiceType.of` 做 `replace("-","_")+toUpperCase` 归一（`common/message/.../ServiceType.java:35-37`），两者 wire 等价，执行取下划线（与现役 `device-profile.ts:106` 一致）；② T1–T10 实测时机——scope #26 定「全量随 wave-1」、arch wave-1 点名七条为顺手最小集，按 scope 全量口径执行，T4 挂 T3 产物之后、T6/T8 可与对应波走查合并，不构成实质分歧。
