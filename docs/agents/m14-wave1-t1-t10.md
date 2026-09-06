# M14 Wave-1 真机实测记录（T1–T10）

> 执行：wave-1 实现 agent（2026-09-06）。环境：本机后端（`local/run-backend.sh`，JDK25，`http://localhost:8080`）+ PostgreSQL 18；凭据 sysadmin@thingsboard.org / tenant@thingsboard.org / customer@thingsboard.org。DB 直查用 psql（口令同 `local/env.sh`）。
> 方法：curl 按纯 API 走完 panel-contract「真机实测清单」T1–T10 全量；写操作均有恢复步骤（各节末注明）。所有写操作只触碰租户/演示级数据，未动 system 级行（admin_settings 中 `general`/`connectivity`/`jwt`/`twoFaSettings` 未触碰）。
> 结论分三色：**命中**（与契约预期一致）/ **修正**（本机实测与契约文档不符，已给出 fork 源码依据）/ **未观测**（本机无法触发该形态）。

## 0. 一页定论

| T | 主题 | 结论 |
|---|---|---|
| T1 | CF CRUD + 排序别名 + 冲突 + ALARM 排除 | **命中**（别名 500 实锤；同名同型 400 实锤；缺省剔除 ALARM 实锤）。修正一条：实体域缺省**同样剔除 ALARM**（契约 #18 写「含 ALARM」方向反了） |
| T2 | testScript 三形态 + 禁改 entityId | **命中**（200+error / 400 禁改文案逐字一致；TBEL 在线，「disabled 400」分支未观测——T2-③ 登记） |
| T3 | VC settings 凭据三态 + 错误形态 | 命中：脱敏/回填/空串安全/分支名校验。**修正**：save 与 checkAccess 失败本机均呈 **500**（异步路径绕过源码里的同步 catch）；checkAccess 失败消息**带底层原因**、save 失败不带——「先 Check access 再 Save」的 UI 引导结论不变 |
| T4 | VC 异步任务链 | **命中**（default 分支首位；POST 立回 requestId→轮询 done=true；**失败也是 done=true+error 非空**实锤）。400 "Invalid task" 窄窗未观测到（任务完成快于 2s 首轮） |
| T5 | Queue 角色矩阵 | 命中：TA 写 403 / 重复名 400 / Main 在列（系统级）/ 改名禁改 400。**修正**：非 isolated 租户 TA 列表 = **3 条系统队列**（非「恒空」；fork `getSystemOrIsolatedTenantId` 使 TA 读系统队列），契约 #14-② 方向修正 |
| T6 | mail 覆盖语义 + antd 缺 id | **全部命中定案**：①缺 id 保存 400 "Admin settings with such name already exists!"（**缺陷实锤，wave-2 高优修复**）；②缺 password 字段回填旧值；③`password:""` 空串落库真覆盖；④testMail 缺 password 走存储值发信（失败形态 500+原因，非契约所写 400）。测后 mail 行已 psql 还原 |
| T7 | securitySettings | **命中**（默认值 min6/max72/secret64/TTL24；TTL=0 400；passwordPolicy max≤min 200 可存死锁策略）。测后已还原 |
| T8 | notification settings 三角色 | **命中**（TA 读写 200/响应=入参对象；CU settings 403、settings/user 200 全开默认；deliveryMethods 200）。副作用：TA 通知设置 map 被本次测试覆写为 `{}`（演示级，已登记） |
| T9 | ai-model SSRF/delete/chat | **命中**：delete 不存在 `false`；chat HTTP 200+FAILURE 信封。**修正**：SSRF 拦截是**配置门控**（`actors.rule.external.ssrf_protection_enabled`，默认 **false**）——本机 127.0.0.1 baseUrl 保存成功；开启后才有 400 "AI model provider URL is not allowed"。测试模型已删 |
| T10 | trendz apiKey CU 裸露 | **命中定案**：CU GET 拿到明文 apiKey（泄露坐实，维持 #22「上游有意设计」定性）；CU POST 403。测后已还原 disabled |

**T6/T10 定论（供 spec §6.7 措辞落笔）**

- **T6 定案**：T6-① 200 假设不成立——**400 实锤**。spec §6.7 按高优先缺陷定稿：「已交付三 settings 页（general/connectivity/outgoing-mail）保存 body 不带快照 id，第二次保存必 400；wave-2 修复 + 回归，M14 新 settings 页一律带 id 编码（服务层 JSDoc 已钉契约）」。mail 密码语义四点（脱敏/缺字段回填/空串真覆盖/testMail 独立回填）全部实测成立，登记措辞照 brief §2-A 不变。
- **T10 定案**：泄露坐实（CU 明文读到 apiKey=k1）。spec §6.7 登记：「上游设计：trendz settings GET 对 CU 放行且不脱敏；antd 不建 CU 入口规避；fork 后端收紧（改 TA-only 或 CU 脱敏）另立 issue」。

## 1. T1 — CF CRUD + 排序别名 + 冲突（TA token）

前置：TA 建测试设备 `m14-wave1-cf-host`（id `11c12920-a99c-11f1-bf08-2be356855d51`，测后已删）。

| # | 请求 | 响应关键值 | 判据 |
|---|---|---|---|
| ① | POST `/api/calculatedField`（SIMPLE/DEVICE，1 参数 `a`→TS_LATEST temperature，expression `a*2`） | 200；回带 id `1207f620-…`、`entityId` 对象形 | 命中 |
| ② | GET `/api/calculatedField/DEVICE/{id}?pageSize=10&page=0&sortProperty=createdTime&sortOrder=DESC` | 200；totalElements=1 | 命中 |
| ③ | GET `/api/calculatedFields?pageSize=10&page=0&sortProperty=entityName` | **500** `{"message":"Database error","errorCode":46}` | **命中（别名 500 实锤）**——排序白名单 `createdTime\|name` 硬收口坐实 |
| ④ | 同名同型重复 POST | **400** `"Calculated field with such name and type already exists"`（无尾随感叹号） | 命中（#20 文案逐字一致） |
| ⑤ | GET `/api/calculatedFields`（无 types）+ 专门建了一个 ALARM 型 CF（`m14-wave1-alarm`，MAJOR 规则）对照 | 缺省列表只回 SIMPLE×2，**ALARM 不出现**；`types=ALARM` 显式传则返回（含演示库既有 3 条 ALARM） | 命中 |
| ⑤c | GET `/api/calculatedField/DEVICE/{id}`（实体域，无 type） | **不含 ALARM**（仅 SIMPLE） | **修正契约 #18**：fork 的 dao `BaseCalculatedFieldService.findCalculatedFieldsByEntityId`（dao/cf/BaseCalculatedFieldService.java:183-194）对 `type==null` 同样 `EnumSet.allOf - ALARM`。影响：wave-5 实体 tab 双模式的「实体域含 ALARM」预期不成立，两模式缺省都不显示 ALARM，ALARM 只能显式按 type 取 |

恢复：删除测试设备（CF 级联删除）；演示库既有 CF/ALARM-CF 未动。

## 2. T2 — testScript 形态 + 禁改 entityId（TA token）

| # | 请求 | 响应关键值 | 判据 |
|---|---|---|---|
| ① | POST `/api/calculatedField/testScript`，坏表达式 `return this is not valid tbel (((;` | **200** + `{"output":"","error":"[Error: unbalanced braces …]"}` | 命中（错误在信封不在 HTTP 层） |
| ② | GET 取回 CF → 改 `entityId` 指向另一设备 → POST | **400** `"Changing the calculated field target entity after initialization is prohibited."` | 命中（#20 逐字一致）→ 编辑态锁实体选择器坐实 |
| ③ | 对照：合法表达式 `return {"double": a * 2};`，a=42 | 200 + `{"output":"{\"double\":84}","error":""}` —— **TBEL 引擎在线** | 「TBEL disabled 400」分支本机不可复现，登记未观测（R35 已预见，留人工/专项） |

## 3. T3 — VC settings 全链（凭据三态 + 错误形态，TA token）

前置：复用既有 bare 仓 `local/vc-smoke.git`（file 协议，jgit 支持）；测试前该仓已在 settings 中（备份 `entitiesVersionControl` 行）。

| # | 请求 | 响应关键值 | 判据 |
|---|---|---|---|
| ① | POST `/api/admin/repositorySettings`（凭据三字段缺省，username=vcuser） | 200；响应三凭据 null；`localOnly` 被服务端置 false | 命中 |
| ①b | GET `/api/admin/repositorySettings` | password/privateKey/privateKeyPassword 恒 null | 命中（脱敏） |
| ② | POST `…/checkAccess`（password 缺省） | 200（restore 回填路径不炸） | 命中 |
| ③a | POST 保存，URI 指向不存在目录 | **500**（本机表现为工作区清理 IOException 文案；非源码层的 `"Failed to init repository!"`——见下方修正） | 形态修正 |
| ③b | POST `…/checkAccess`，URI 不存在（`file:///…does-not-exist-14.git`） | **500** `{"message":"file:///…: not found."}` —— **消息带底层原因** | 形态修正（非契约所写 400），「带原因」结论保留 |
| ③c | checkAccess 用错误 password 打真实 file 仓 | 200 —— file 协议不消费凭据，未构成对照（凭据错误形态需真实远程仓，登记） | 未观测 |
| ④ | POST 保存 `password:""`（空串=真凭据） | **500 失败**，且 DB `json_value.password` 仍为旧值 null —— **空串没有静默覆盖，旧值完好** | 命中（#8「失败整次保存 500、旧值不丢」） |
| ⑤ | checkAccess `defaultBranch:"a b"` | **400** `"Branch name is invalid"` | 命中（校验先于一切） |

**修正细节（contract #9）**：源码里 save=RuntimeException("Failed to init repository!")、checkAccess=ThingsboardException(GENERAL=400)（`DefaultEntitiesVersionControlService.java:515-545`）都包在**同步** try/catch；而 `gitServiceQueue.initRepository/testRepository` 是异步 Future——失败沿 DeferredResult 冒泡成 500，catch 不触发。本机实测两种失败都是 500；可诊断性差异仍成立：checkAccess 的 message 携带 jgit 底层原因（"not found."/"cannot open git-receive-pack"），save 的 message 是笼统 IO 复合异常。**UI 引导「先 Check access 再 Save」照旧成立。**另登记本机环境坑：租户 git 工作区 `~/.tmp/repositories/{tenantId}/.git` 的 pack 文件会被运行中的 JVM 锁住，git 操作失败后 workspace 清理 IOException 会进一步污染后续 save 的错误文案；重启后端即恢复。

恢复：`entitiesVersionControl` 行已 psql 还原为测试前快照（username=null），后端重启清缓存后 `repositorySettings/info` 复核 configured=true 正常。

## 4. T4 — VC 异步任务链与轮询终态（TA token，依赖 T3 仓库）

| # | 请求 | 响应关键值 | 判据 |
|---|---|---|---|
| ① | GET `/api/entities/vc/branches` | `[{"name":"master","default":true}]` —— default 排首位 | 命中 |
| ② | POST `/api/entities/vc/version`（SINGLE_ENTITY/DEVICE，versionName=m14-wave1-t4） | 立即回 requestId（`fc4718b0-…`，JSON 字符串）；2s 间隔轮询 `…/status`，首轮即 `{"added":1,"modified":0,"removed":0,"version":{...},"done":true}` | 命中（异步闭环） |
| ②b | GET `/api/entities/vc/version?branch=master&sortProperty=timestamp&sortOrder=DESC` | 新版本排首位（3 条历史），M14 服务层 listVersions 端点形态实证 | 命中 |
| ③ | 失败任务（后端重启前、git 工作区被锁时段的 commit） | `{"error":"1 exception(s): …Cannot delete file…","done":true}` —— **失败也是 done=true 终态** | 命中（#10 核心） |
| ④ | 受理窄窗 400 "Invalid task" | 未观测到（本机任务完成快于首轮轮询） | 未观测（容错逻辑已由 fake-timers 单测钉住：`version-control.endpoints.test.ts`） |

注：轮询经 curl 人工以 2s 节拍执行，与 ngx timer(0,2000) 同拍；服务层轮询器三路径（done 即返/容忍 400/404 连续 3 次后失败/180s 超时）由 wave-1 单测覆盖。

## 5. T5 — Queue 角色矩阵 + Main 可见性（SA + TA token）

| # | 请求 | 响应关键值 | 判据 |
|---|---|---|---|
| ①a | TENANT GET `/api/queues?serviceType=TB_RULE_ENGINE` | 200，**3 条系统队列**（Main/HighPriority/SequentialByOriginator，tenantId=NULL_UID） | **修正契约 #14-②**：非 isolated 租户列表不恒空；fork `BaseQueueService.findQueuesByTenantId` 用 `getSystemOrIsolatedTenantId`（:96-106）——非 isolated 租户解析为 SYSTEM id，故 TA 看到**系统队列**；isolated 租户才看自己的。影响面：wave-3 queues 页（scope 定 SA-only）不受影响，登记文档勘误 |
| ①b | TENANT POST `/api/queues` | **403** | 命中（写仅 SA） |
| ② | SYS POST name=smoke14 → 重复 POST | 200（id `ffb65dd0-…`，topic 派生 `tb_rule_engine.smoke14`）；重复 → **400** `"Queue with name: smoke14 already exists!"` | 命中 |
| ③ | SYS 列表 | Main 在列（系统级归属 NULL_UID 属实） | 命中（前端禁勾选+隐藏删除照 R26 执行） |
| ④ | TENANT GET 系统队列 by id（含 Main） | **200**（非 isolated 分支） | 命中（#14-④ 修正后方向：非 isolated 可读系统队列） |
| ④c | TENANT DELETE 系统队列 | 403 | 命中 |
| ⑤ | SYS 改名保存（smoke14→renamed） | **400** `"Queue name can't be changed!"` | 命中（#15 禁改） |
| ⑥ | SYS DELETE smoke14 | 200 | 命中（已清理） |

## 6. T6 — mail settings 覆盖语义 + antd 缺 id 实锤（SA token）

以 GET 快照（带 id `e68dd2b0-…`）为基底；先种入可辨识密码 `m14-marker-pass` 作标记。

| # | 请求 | 响应 + DB 复核（`select json_value::json->>'password' from admin_settings where key='mail'`） | 判据 |
|---|---|---|---|
| ① | POST `/api/admin/settings`，body 只 `{key:"mail", jsonValue:{…}}` **不带 id、不带 password**（模拟 antd buildPayload） | **400** `"Admin settings with such name already exists!"` | **命中实锤 → #2 缺陷定案，wave-2 高优修复** |
| （种标记） | 带 id + password="m14-marker-pass" | 200；DB=`m14-marker-pass` | — |
| ② | 带 id、**payload 删除 password 字段** | 200；DB=`m14-marker-pass`（**回填生效**） | 命中（#1 缺字段回填实锤） |
| ③ | 带 id + `password:""` | 200；DB=**空串**（`is null=false, =''=true`） | 命中（**空串真覆盖实锤**——留空必须删字段） |
| ④ | POST `/api/admin/settings/testMail`（payload 无 password） | **500** `"Unable to send mail: Connection refused: connect"` —— 试图用存储口令真实发信（本机无 SMTP，连接拒绝） | 命中「独立回填发信」；**形态修正**：失败是 500 带原因（契约 #4 写 400） |

恢复：mail 行 psql 还原为 bootstrap 原值（password=""、smtpHost=localhost 等），GET+DB 双重复核一致。

## 7. T7 — securitySettings 回环（SA token）

| # | 请求 | 响应关键值 | 判据 |
|---|---|---|---|
| ① | GET `/api/admin/securitySettings` | 默认值：min=6/max=72/mobileSecretKeyLength=64/两 TTL=24/allowWhitespaces=true | 命中（GET 永不 404 + 默认值） |
| ② | POST minimumLength=8 → GET | 200；回读=8 | 命中（持久化） |
| ③ | POST `userActivationTokenTtl=0` | **400** `"Validation error: userActivationTokenTtl …1"`（@Min 文案，控制台 GBK 显示为问号） | 命中（仅 TTL 有服务端校验） |
| ④ | POST passwordPolicy `{minimumLength:10, maximumLength:4}` | **200 且落库** | 命中（**passwordPolicy 全字段裸奔、上限静默失效坐实** → 前端自校验为唯一防线） |

恢复：原快照 POST 回（200）。

## 8. T8 — notification settings 三角色（TA + CU token）

| # | 请求 | 响应关键值 | 判据 |
|---|---|---|---|
| ① | TENANT POST `/api/notification/settings` `{"deliveryMethodsConfigs":{}}` | 200，响应体=**入参对象本身** | 命中（#7 保存响应=入参） |
| ② | TENANT GET 回读 | `{"deliveryMethodsConfigs":{}}` | 命中（空对象语义） |
| ③ | CUSTOMER GET settings | **403** | 命中 |
| ④ | CUSTOMER GET `/settings/user` | 200，全渠道全开默认（WEB/MOBILE_APP/SMS/EMAIL × GENERAL/ALARM/…） | 命中 |
| ⑤ | TENANT GET `/api/notification/deliveryMethods` | 200 `["WEB","EMAIL","MICROSOFT_TEAMS"]` | 命中 |

副作用登记：① 把租户通知设置 map 覆写为空 map（若 M12 走查时配过 Slack botToken 则已被清；演示级数据，无恢复基线）。

## 9. T9 — ai-model SSRF + delete false + chat 信封（TA token）

| # | 请求 | 响应关键值 | 判据 |
|---|---|---|---|
| ① | POST `/api/ai/model`，OPENAI baseUrl=`http://127.0.0.1:8080` | **200 建模成功**（非契约预期 400） | **修正契约 #24**：SSRF 守卫是配置门控——`SsrfProtectionValidator.validateUri` 首行 `if (!ssrfProtectionEnabled) return;`，默认 `actors.rule.external.ssrf_protection_enabled:false`（thingsboard.yml:602）。开启后才有 400 `"AI model provider URL is not allowed: …"`。antd 处理：400 文案走错误信封透传即可，部署侧需显式开启守卫（另登记 fork 运维项） |
| ② | POST 合法公网 URL（api.openai.com） | 200，回带 id/tenantId（服务端强制）/version=1 | 命中 |
| ③ | DELETE 不存在 id（`…000a`） | **200，body `false`** | 命中（#24 delete-false 语义） |
| ④ | POST `/api/ai/model/chat`，不可达公网域名 + maxRetries=0/timeout=20s | **HTTP 200** + `{"errorDetails":null,"status":"FAILURE"}` | 命中（信封语义；注：errorDetails 可为 null，前端文案需兜底「无法连接」） |

恢复：两个测试模型均 DELETE（响应 true）；演示库其余数据未动。

## 10. T10 — trendz apiKey CU 裸露（TA + CU token）

| # | 请求 | 响应关键值 | 判据 |
|---|---|---|---|
| ① | TENANT POST `/api/trendz/settings` `{enabled:true, baseUrl:"https://trendz.example.com", apiKey:"k1"}` | 200，响应=入参回显 | 命中 |
| ② | **CUSTOMER** GET `/api/trendz/settings` | **200 + `{"enabled":true,"baseUrl":"…","apiKey":"k1"}` —— 明文泄露坐实** | 命中（#22 定性维持：上游有意设计） |
| ③ | CUSTOMER POST | **403** | 命中（读放行、写拦截） |

恢复：POST `{enabled:false, baseUrl:"", apiKey:""}` 还原 disabled 态。

## 11. 汇总：对 spec §6.7 / 契约文档的回写建议

1. **T6-① 定案 400**：已交付三页缺 id 缺陷从「疑似」升级「实锤」，wave-2 修复优先级高（spec §6.7 第一条措辞可去「疑似」）。
2. **T10 定案泄露坐实**：维持「上游设计 + antd 无入口规避 + 后端收紧另立 issue」。
3. **契约勘误（随本期文档修订）**：
   - #18：CF 实体域列表缺省**同样剔除 ALARM**（fork dao 层 `EnumSet.allOf - ALARM`），「实体域含 ALARM」不成立；
   - #14-②：非 isolated 租户 TENANT 列表 = 系统队列（`getSystemOrIsolatedTenantId`），非「恒空」；isolated 租户读系统队列 403 的方向维持；
   - #9：VC save/checkAccess 失败本机均呈 500（异步绕过同步 catch）；checkAccess 消息带底层原因、save 不带——UI 引导结论不变；
   - #4：testMail 失败形态为 500 带原因（非 400）；
   - #24：ai-model SSRF 拦截默认关闭，需 `SSRF_PROTECTION_ENABLED=true`（或 yml 同名项）开启。
4. **未观测项**（不构成分歧）：VC 轮询 400 "Invalid task" 窄窗（单测覆盖容错）；TBEL disabled 400；真实远程仓凭据错误形态（file:// 不消费凭据）。

## 12. 环境恢复清单（实测收口时点）

- 后端：运行中（8080），重启两次（清理被锁的 git 工作区 + 清 VC settings 缓存）。
- DB：`admin_settings` 的 `mail` / `entitiesVersionControl` 行 psql 还原为测试前字节；`securitySettings` POST 原值；`notifications` / `trendz` / `securitySettings` 三行为本次测试新增的持久化行（值为空/默认态，属正常配置面）；租户通知设置 map 覆写为 `{}`（见 §8 登记点）。
- 实体：测试设备 `m14-wave1-cf-host`、CF `m14-wave1-simple`/`m14-wave1-alarm`、queue `smoke14`、AI 模型 `m14-ssrf`/`m14-wave1-model` 全部删除；VC 版本库中留下一条 `m14-wave1-t4` 版本（git 历史，不影响功能）。
- fixture：`local/vc-smoke.git` 为既有 gitignored 本地仓，沿用未删。
