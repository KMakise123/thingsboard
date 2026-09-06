# M14 专家小队裁决：后端契约与正确性镜头（panel-contract）

> 由 panel-contract 产出（2026-09-06）。输入：`m14-ngx-inventory-calculated-fields.md`（缩写 CF）、`m14-ngx-inventory-vc.md`（VC）、`m14-ngx-inventory-settings.md`（ST）、`m14-backend-contract.md`（B）、`m14-implementation-notes.md`（I）五份工作文档的裁决点收拢去重，重点复验任务指定的 12 个高危坑，合并为 25 条。裁决准则沿 fork 铁律：**等价为底线、禁止删减**；前端契约以本仓 `application/`、`dao/`、`common/` Java 代码为权威。
> 复验方法：所有关键结论均回到本仓 Java/TS 源码逐行核对（锚点见各条），未采信转述与 swagger 假文档。已发现 3 处侦察结论被推翻/修正、1 处已交付页面疑似缺陷（见 #2）。缺陷按 spec §6 体例登记（见文末）。
> 状态标记：〔证成〕采纳侦察倾向并给出源码依据；〔推翻侦察〕推翻或修正侦察文档的结论；〔实测定案〕静态结论已给出，最终确认挂真机实测清单。

## 裁决总表

| # | 裁决点（一句话） | 来源 | 状态 |
|---|---|---|---|
| 1 | mail settings 保存是「缺字段回填」不是「不回填」：前端姿势 = 改则带新值、不改则**删除** password 字段；空串才是真覆盖 | B§5-11、ST§3.1 | 推翻侦察（B「POST 不回填」）+ 实测 T6 |
| 2 | ui-antd settings 三页（general/connectivity/outgoing-mail）保存 body 不带 id → 二次保存必 400 "Admin settings with such name already exists!" | 新发现（复验 #1 时挖出） | 推翻侦察（I§1 保存链范式）+ 实测 T6 |
| 3 | testMail/testSms 用请求体现场发信，不必先保存；testMail 缺 password 时服务端回填存储值 | B§1.4、ST§3.2 | 证成 |
| 4 | mail OAuth2：authorize/loginProcessingUrl 返回带引号字符串；回调 /code 匿名 + state cookie 校验；成功落 refreshToken 并 302 回 prevUri 或 /settings/outgoing-mail | B§1.4 | 证成 |
| 5 | jwtSettings 保存恒返回当前用户新 token 对，antd 必须就地换发；旧 token 是否失效仅取决于签名 key 是否变更 | ST§5.2、B§5-13 | 证成 |
| 6 | securitySettings：GET 永不 404（有默认值）；仅两个 TTL 有服务端校验；maximumLength ≤ minimumLength 时**静默失效**；force reset 开关只改登录行为；antd 类型层无缺口 | ST§5、B§5-12 | 证成 + 推翻侦察（消解「补类型」） |
| 7 | notification settings 五个预留函数与后端端点逐参数对齐；读写 SA+TA 均可（antd access 决策的事实底座） | I§3 | 证成 |
| 8 | VC settings 凭据三态：JSON 缺字段或 null = 服务端回填旧值；**空串 = 传空凭据走验证**；保存是验证式（真实 clone），凭据错误保存失败旧值不丢 | B§5-6、VC§3 | 证成 + 精化 B§8-5 |
| 9 | 保存失败的错误形态比 checkAccess 差：save 失败 500 笼统 "Failed to init repository!"，checkAccess 失败 400 带 "Unable to access repository: \<底层原因\>" → UI 引导「先 Check access 再 Save」 | B§3 | 证成 |
| 10 | VC 异步任务：POST 立即回 requestId → 前端 2s 轮询 status；成功与失败都是 `done=true` 终态；轮询须容忍 400 "Invalid task"（受理窄窗）与 404 "Task execution timed-out"（结果缓存 TTL 20 分钟）；DeferredResult 上限 180s | VC§6、B§头部 | 证成 + 增补轮询器契约 |
| 11 | fork 单机 VC 全端点可用（`vc.git.service=local` 默认激活 + jgit 在 pom）；antd 的 hasRepository 状态源 = `GET /repositorySettings/info`（configured+readOnly 一次拿全），登录链路无该字段 | B§头部、VC§9-3 | 证成 |
| 12 | VC settings 服务层缺口五函数（get/save/delete/checkAccess/exists）；`RepositorySettings` TS 类型新建时必须含 readOnly/showMergeCommits（ngx 漏 readOnly 的教训）；保存/删除后失效分支列表缓存 | I§3、VC§3 | 证成 |
| 13 | autoCommitSettings：未配置 GET 404（antd 已按 null 降级）；branch 名校验先于 ACL；无真实 clone 校验；readOnly 仓库时整表禁用 | B§5-7/5-8 | 证成 |
| 14 | Queue 读 SYS+TA、写仅 SA；TENANT 列表只查本租户记录（非 isolated 恒空）；**isolated 租户读系统队列才 403**（B§1.5 方向写反） | B§1.5/8-2、ST§2 | 推翻侦察（修正方向）+ 实测 T5 |
| 15 | Queue 更新禁改 name/topic；服务端校验矩阵含 `maxPauseBetweenRetries ≥ pauseBetweenRetries` 关系校验（ngx 表单无此跨字段校验，antd 应补防 400） | ST§2.2 | 证成 |
| 16 | Main 队列后端无删除保护（仅 device profile 外键兜底）→ 前端必须拦（ngx 等价禁删禁选）+ 登记 API 层边界 + fork 补保护另立 issue | ST§2.1 | 证成 |
| 17 | CF 服务层缺口 = 全量列表/按 id/testScript/debug 四函数；排序白名单前端硬收 `createdTime|name`（entityName 别名 500：dao 无列映射实锤） | I§3、B§5-3 | 证成 |
| 18 | `/api/calculatedFields` types 缺省 = 全类型**剔除 ALARM**；SUPPORTED_ENTITIES = 4 实体全类型 + CUSTOMER 仅 ALARM；实体详情按 id 取 type 缺省 = 含 ALARM | B§1.1 | 证成 |
| 19 | testScript 是唯一语法通道，但后端保存不强制；等价基线 = 不强制（ngx 行为），「提交前自动预检」登记为推荐增强 | B§3、B§8-1 | 证成（消解 B「必须先 testScript」） |
| 20 | 冲突与禁改报错形态：UNIQUE(entity_id,type,name) → 400 "Calculated field with such name and type already exists"（ALARM 变体另有文案）；更新仅禁改 entityId，400 "Changing the calculated field target entity after initialization is prohibited." | B§3、B§5-2 | 证成 |
| 21 | CF 服务端限额：每实体非 ALARM 条数（默认 5）+ 参数数（默认 10）+ 8 个调度/聚合限额，antd 表单必须消费 authState 8 参数 | CF§12、B§3 | 证成 |
| 22 | trendz GET 对 CUSTOMER_USER 放行且不脱敏（apiKey 裸露坐实）= 上游设计（CU 消费 Trendz 入口）；antd 不建 CU 入口即规避，后端收紧另立 issue | B§5-9/8-4 | 证成 + 实测 T10 |
| 23 | home settings 4 端点分工：M14 只做 `/api/tenant/dashboard/home/info` 读+写（存 `Tenant.additionalInfo`，**与 tenant profile 无关**）；dashboardId 传 null = 清除；GET 恒 200 | B§1.9、ST§4 | 证成 |
| 24 | ai-model 5 端点 antd 全消费；`/chat` 进 UI 的定位 = Check connectivity 探测按钮（ngx 事实），不存在对话 UI；chat 错误走 200 Failure 信封（非 HTTP 错）；删除不存在返回 false；SSRF 400 | ST§7、B§1.8 | 证成 |
| 25 | openapi 快照 spot check 三处（admin/settings、calculatedFields、ai/model/chat）与 Java 源码一致；Hidden V1 端点不进服务层 | B§7 | 证成 |

---

## 分条详裁

### A. mail / 安全 / 通知 settings 域

**1. mail settings 保存语义：服务端有「缺字段回填」，推翻「POST 不回填」**〔推翻侦察 + 实测 T6〕
【决议】key=mail 的整包保存**不是**裸覆盖：`AdminSettingsServiceImpl.saveAdminSettings` 对新 jsonValue 里**不存在** `password` / `refreshToken` 字段的情况从旧值回填（`dao/src/main/java/org/thingsboard/server/dao/settings/AdminSettingsServiceImpl.java:82-95`）。因此前端正确姿势 = 「用户重输密码时带新值；未重输时把 password 字段**从 payload 中 delete 掉**（不是置空串）」。空串 `""` 不会被回填（`has("password")` 为 true），会以空串落库并毁掉邮件发送——这是唯一要防的形态。ngx 的实现即如此（`ui-ngx/.../mail-server.component.ts` `mailSettingsFormValue`：`isDefinedAndNotNull(formValue.password)` 为假时 `delete formValue.password`）；ui-antd 已交付页同样是 delete 语义（`pages/settings/outgoing-mail/index.tsx:243-246` 注释 "Locked password stays server-side"）。
【依据】回填代码同上；响应侧脱敏在 `AdminController.java:133-136`（GET）与 :152-155（POST 响应），前端拿响应回填表单不会泄密。另有 OAuth2 联动：`dropTokenIfProviderInfoChanged`（AdminSettingsServiceImpl.java:138-149）——providerId/clientId/clientSecret/redirectUri/providerTenantId 任一变更 → 删 refreshToken + `tokenGenerated=false`，UI 需引导重新 Generate token。
【分歧/需复核】**推翻** B§5-11/§8-7 的「POST 保存不会回填……需前端约定必须重输密码/整包覆盖必破坏」：前端「剥字段」姿势下不改密码可安全保存，无需强制重输。空串落库形态留 T6 实测确认（静态判定为会落空串）。

**2. ui-antd settings 保存链缺 id 缺陷（新发现）**〔推翻侦察 + 实测 T6〕
【决议】`POST /api/admin/settings` 是「无 id 则创建、有 id 则更新」的语义：`DataValidator.validate`（`dao/.../dao/service/DataValidator.java:70-75`）id==null 走 validateCreate，而 `AdminSettingsDataValidator.validateCreate`（`dao/.../validator/AdminSettingsDataValidator.java:33-38`）在同 key 已存在时抛 "Admin settings with such name already exists!"（→ 400）。系统初始化就预建 general/mail/connectivity 三条（`DefaultSystemDataLoaderService.java:249-281`），且 dao 层 save 无 upsert-by-key（`JpaAbstractDao.java:71-84`，id==null 一律 insert）。**ui-antd 三处已交付保存链 body 均只回传 `{key, jsonValue}` 不带 id**（`pages/settings/general/index.tsx:83-87`、outgoing-mail `buildPayload` :234-249；connectivity 同 general），静态判定：**第二次起保存必 400**。M14 修法 = buildPayload/保存体带上快照 `id`（ngx 就是整个 GET 对象原样回传，`mail-server.component.ts` `this.adminService.saveAdminSettings(this.adminSettings)`）。M14 新增 settings 页（notification settings 等）一律照「带 id 回传」写，service 层 `saveAdminSettings` 可在 JSDoc 钉死该契约。
【依据】上列源码；`services/tb/admin.ts:31-35` 直接透传 body，无补救层。
【分歧/需复核】是否真挂 = T6 实锤（走查时若从未保存成功过则无感）。**无论实测结果如何，M14 新页面按带 id 编码不变**；已交付页的修复随 M14 回归口径落地。

**3. testMail / testSms：请求体现场发信，不必先保存**〔证成〕
【决议】两通道都吃请求体而非落库配置：testMail（`AdminController.java:205-241`）非 OAuth2 时 body 缺 password → 服务端从存储回填（:225-228），OAuth2 时回填存储 refreshToken（无则 400 "Refresh token was not generated. Please, generate refresh token."）；失败 400 携带 "错误: 底层原因"（:233-239）。testSms（:243-260）body `TestSmsRequest{providerConfiguration, numberTo, message}`（`common/data/.../sms/config/TestSmsRequest.java`），providerConfiguration 用表单当前值即可。两者均 SYS_ADMIN only（testSms 端点仅 SA，故 TENANT notifications 页无 test 按钮，与 ngx 一致）。
【依据】上列源码；ngx `send-test-sms-dialog.component.ts:69-87` 同口径。

**4. mail OAuth2 三端点流程**〔证成〕
【决议】① `GET /api/admin/mail/oauth2/loginProcessingUrl` 返回**带双引号**的字符串 `"\"/api/admin/mail/oauth2/code\""`（`AdminController.java:411-414`），前端按 JSON 字符串解析后无需再处理引号；② `GET .../authorize` 设置 prevUri + state cookie 后返回带引号的 IdP 授权 URL（:420-442），**跳转由前端执行**（`window.location`，ui-antd `generateMailOauth2AccessToken` 注释已注明）；③ 回调 `GET .../code?code&state` 匿名可达，校验 state cookie，成功把 refreshToken 落库 + `tokenGenerated=true`，302 回 prevUri cookie 或缺省 `/settings/outgoing-mail`（:444-484）。ui-antd 已按同语义交付，M14 仅回归。
【依据】上列源码。注意 authorize 端点 cookie 先写、权限检查在后（:423-427），对前端无影响。

**5. jwtSettings 保存 = 就地换发**〔证成〕
【决议】`POST /api/admin/jwtSettings` 的响应是**当前用户的新 JwtPair**（`AdminController.java:196-203` `tokenFactory.createTokenPair(securityUser)`），与是否改了签名 key 无关；旧 token 是否继续有效只取决于 key 是否变更。antd 保存成功后必须用响应 token 对替换本地会话（等价 ngx `setUserFromJwtToken`），并把「改 issuer/key 前弹确认框」作为交互链一部分（ngx `security-settings.component.ts:160-171`）。服务端校验：key 必填合法 Base64 且解码后 ≥512 位、refresh ≥900s 且需大于 token 过期时间（`DefaultJwtSettingsValidator.java:40-66`，B 已核，本镜头抽查确认存在）。
【依据】上列源码。

**6. securitySettings 字段语义与 force reset 链路**〔证成 + 推翻侦察（消解补类型）〕
【决议】① GET 永不 404：未配置时返回默认值 min=6/max=72/mobileSecretKeyLength/两 TTL=24（`DefaultSecuritySettingsService.java:44-62`）；保存仅 ConstraintValidator 管两个 TTL（@NotNull 1-24），**passwordPolicy 全字段无服务端范围校验**——前端必须自校验（min≤max 等），否则能存出死锁策略。② `maximumLength` 的真实语义：passay 校验里 `maxLengthBound = (maximumLength != null && maximumLength > minimumLength) ? maximumLength : Integer.MAX_VALUE`（`DefaultSystemSecurityService.java:169-199`）——**max ≤ min 时上限静默失效不报错**，这是「前端强制 min≤max」的根因。③ `passwordReuseFrequencyDays` 消费点 = 改密码时比对 `userCredentials.additionalInfo` 的 USER_PASSWORD_HISTORY（:153-165），>0 才启用。④ `forceUserToResetPasswordIfNotValid` 唯一消费点在登录（`RestAuthenticationProvider.java:86-94`）：登录密码先过策略校验，违规抛 `UserPasswordNotValidException`（引导重置而非拒登录）；**保存开关无即时副作用、不批量作废存量密码**——页面文案不得暗示「保存即强制所有人改密」。⑤ 任务问的「补类型」消解：漏声明的是 **ngx** 的 TS 接口；ui-antd `services/tb/auth.ts:22-34` 已含 `passwordReuseFrequencyDays`（:34），openapi 生成类型亦有（`types/tb/openapi/index.ts:19747`）——antd 无需补，落位调整（auth.ts → types/tb/admin.ts + re-export）照 I 裁决点 5 执行即可。
【依据】上列源码。

**7. notification settings 预留函数逐参数对齐**〔证成〕
【决议】`services/tb/notification.ts:151-202` 五函数全部与后端吻合：save/get `POST|GET /api/notification/settings`（SA+TA，`NotificationController.java:493-512`，tenantId 由服务端按角色取 SYS_TENANT_ID 或本租户）；`GET /notification/deliveryMethods`（SA+TA+CU，:514-521）；`POST|GET /notification/settings/user`（SA+TA+CU，:524-535）。未配置时 GET settings 返回 `{deliveryMethodsConfigs: {}}`（`DefaultNotificationSettingsService.java:96-104`），与函数 JSDoc 一致。`requestEntitiesLimitIncrease` 的端点也存在（NotificationController.java:299）。注意两点事实：保存响应是**入参对象本身**（:500，非落库回读）；**读写都是 SA+TA**——I 裁决点 1 的「settings 组 canSysAdmin 要不要放宽 TA」由此获得后端依据（后端 TA 有完整权限，前端收窄纯属 UI 归属选择），裁决归 arch/scope 镜头。
【依据】上列源码。

### B. VC 域

**8. VC settings 凭据三态语义**〔证成 + 精化 B§8-5〕
【决议】GET /api/admin/repositorySettings 恒脱敏三字段（password/privateKey/privateKeyPassword 置 null，`AdminController.java:266-273`）。保存与 checkAccess 都先过 `restore`（`DefaultTbRepositorySettingsService.java:37-52`）：按 authMethod 分支，`settings.getPassword() == null` / `getPrivateKey() == null` 时从存储回填——**判断只认 null**，JSON 缺字段与显式 null 等价。三种提交形态：缺字段/null = 沿用旧凭据；非空新值 = 使用新凭据；**空串 = 把空凭据交给真实 clone/fetch 验证**（B§8-5「空串=覆盖为空」需精化：验证失败则整次保存 500、旧值不丢，不会静默覆盖；只有仓库恰好接受空凭据时才落库空串）。所以前端契约是：**凭据输入框留空时序列化必须剔除字段（或置 null），不能发空串**——封 `stripBlankCredentials` 纯函数（I§3 已建议）+ 往返单测。POST 强制 `localOnly=false`（:307）、响应再次脱敏（:310-313）。
【依据】上列源码；保存链 `DefaultEntitiesVersionControlService.saveVersionControlSettings:516-526`：checkBranchName(defaultBranch) → restore → `initRepository` 真实 clone/fetch → 成功才落库。

**9. 保存失败 vs checkAccess 失败的错误形态差异**〔证成〕
【决议】保存失败 = `RuntimeException("Failed to init repository!")` → **500 无底层原因**（:522-525）；checkAccess 失败 = `ThingsboardException("Unable to access repository: <底层 cause>"，GENERAL)` → **400 带可诊断信息**（:536-545）。结论：antd 表单 UI 把「Check access」作为保存前置引导（ngx 语义保留），保存 500 时的 toast 引导用户先 Check access 看原因；branch 名非法（`VcUtils.checkBranchName`，禁空格/`..`/`~`/`^`/`:`/`\`、禁 `/`、`.lock` 结尾）在 save 与 checkAccess 都是 400 "Branch name is invalid"。
【依据】上列源码。

**10. VC 异步任务模型与轮询器契约**〔证成 + 增补〕
【决议】commit/restore 均为「POST 立即回 requestId（`saveEntitiesVersion` :118-149 先回 txId，任务异步执行）→ 前端定时轮询 status」。终态形态：成功 `VersionCreationResult{done:true, added/modified/removed, version}`；**失败也是 done=true 终态**（`new VersionCreationResult(error)` 置 done=true，`VersionCreationResult.java:45-48`；load 侧 `VersionLoadResult.error` 同，error 为结构化 `EntityLoadError{type: DEVICE_CREDENTIALS_CONFLICT|MISSING_REFERENCED_ENTITY|RUNTIME, message, source, target}`）。轮询器必须容忍两类**非 200 的中间态**：`result==null`（POST 响应已回但结果未入缓存的窄窗）→ 400 "Invalid task"；结果缓存过期（TTL 20 分钟，`thingsboard.yml:762-764` versionControlTask TTL）或后端重启 → 404 "Task execution timed-out"（`getStatus:161-176`，ITEM_NOT_FOUND）。antd 等价复刻 ngx 的 2s 间隔（`timer(0,2000)`，`entities-version-control.service.ts:98-103`），但轮询器对 400/404 **连续 N 次（建议 3 次）内继续轮询、超限判失败**——这是对 ngx（HTTP 错误直接终止流）的等价性内稳健性增强，避免受理窄窗/慢任务误报；已交付的 `awaitVersionCreateResult`/`awaitVersionLoadResult`（`version-control.ts:283-295`）按此修订。DeferredResult 硬上限 `queue.vc.request-timeout=180000`（controller :88-89）作用于 POST 本身与 branches/diff 等同步端点，超时 → 500 "Request timeout" 占位错误映射。
【依据】上列源码。

**11. fork 可用性与 hasRepository 状态源**〔证成〕
【决议】`DefaultGitRepositoryService` 挂 `@ConditionalOnProperty(prefix="vc", value="git.service", havingValue="local", matchIfMissing=true)`（:53-55），jgit/jgit.ssh.apache 在 `common/version-control/pom.xml:93-98`——单机 fork 默认装配，VC 全端点可用，无后端补洞。antd 登录链路**无** hasRepository 字段（全仓 grep 零命中），hasRepository 状态源定案 = `GET /api/admin/repositorySettings/info`（`RepositorySettingsInfo{configured, readOnly}`，未配置 200 非 404，`AdminController.java:284-299`）——一次拿 configured（二段开关）与 readOnly（全 VC 域禁用），优于 exists 端点；`GET /repositorySettings/exists` 可不进服务层。
【依据】上列源码。

**12. VC settings 服务层缺口与类型契约**〔证成〕
【决议】`services/tb/version-control.ts` 现有 14 函数（info/autoCommit 四件/branches/versions/create+poll/diff/info/load+poll/await 两件），**缺 repositorySettings 五件**：`getRepositorySettings`（GET）、`saveRepositorySettings`（POST，注意 DeferredResult 长请求语义，HTTP 客户端超时须 ≥180s）、`deleteRepositorySettings`（DELETE，同时清本地 git 目录）、`checkRepositoryAccess`（POST /checkAccess）、`getRepositorySettings` 复用即可无需 exists。`RepositorySettings` TS 类型新建时**必须含 `readOnly` 与 `showMergeCommits`**（ngx `settings.models.ts:477-487` 漏 readOnly 但表单提交带——照抄类型层会复刻该坑）；`localOnly` 不由前端发（服务端强制 false）。保存/删除成功后失效分支列表缓存（ngx `clearBranchList` 等价：antd `listBranches` 目前无缓存，若加缓存须挂失效钩子）；`GET /api/entities/vc/branches` 返回 default 分支排首位（settings.defaultBranch 优先，`EntitiesVersionControlController.java:499-520`）。
【依据】上列源码 + `services/tb/version-control.ts` 全文核对。

**13. autoCommitSettings 语义**〔证成〕
【决议】未配置 GET = 404（checkNotNull，`AdminController.java:343-347`）——antd 已按 404→null 降级（`version-control.ts:142-144`），口径保持；POST 的 branch 名校验**先于 ACL**（:362-364），非法分支 400 与权限无关；保存**无** initRepository 真实验证（与 repositorySettings 的本质差异，T3 判据据此区分）；`readOnly` 仓库时 auto-commit 实际失效（`DefaultEntitiesVersionControlService.autoCommit:548-552` 静默跳过）——设置页按 ngx 口径在 readOnly 时整表禁用 + hint。auto-commit 触发纯后端（实体保存钩子），前端无触发/进度 UI，等价即无。
【依据】上列源码。

### C. Queue 域

**14. Queue 角色/可见性矩阵（含方向修正）**〔推翻侦察 + 实测 T5〕
【决议】① 读写分权：GET 列表/按 id/按名 = SYS+TA（`QueueController.java:69-70,96-97,109-110`）；POST/DELETE = `hasAnyAuthority('SYS_ADMIN')` 仅 SA（:125-126,149-150）→ **antd queues 页写操作 SA-only，TA 无写入口**（TA 是否保留只读列表属范围裁决，契约事实：非 isolated 租户列表恒空、isolated 租户见自己的队列）。② 列表恒空的机制：`findQueuesByTenantId` 只查本租户记录（`JpaQueueDao.java:86-88` findByTenantId），非 isolated 租户无队列记录（默认队列在 tenant profile JSON）→ 空列表。③ **修正 B§1.5**：`BaseController.checkQueueId`（:837-848）对系统队列（tenantId 为 NULL_UID）抛 403 的条件是 `tenantProfile.isIsolatedTbRuleEngine()` 为真——即 **isolated 租户不能读系统队列，非 isolated 租户反而可以**，B 契约盘点写反了，登记勘误。④ serviceType 非 TB-RULE-ENGINE：列表恒空 PageData、保存返回 null（空 body 200）——前端锁死 `TB-RULE-ENGINE` 且不对保存响应做实体解析。
【依据】上列源码。

**15. Queue 校验矩阵与禁改**〔证成〕
【决议】更新禁改 name/topic（400 "Queue name can't be changed!" / "Queue topic can't be changed!"，`QueueValidator.java:53-63`）→ antd 表单编辑态锁 name、topic 由 name 派生 `tb_rule_engine.{name}` 不设输入框（ngx 等价）。创建唯一性：name/topic 同租户各 400（:41-50）。数字矩阵：pollInterval/partitions/packProcessingTimeout ≥1；BATCH batchSize ≥1；retries ≥0；failurePercentage 0-100；pauseBetweenRetries ≥0；**`maxPauseBetweenRetries ≥ pauseBetweenRetries` 关系校验**（"MAX pause between retries can't be less then pause between retries!"，:118-120）——ngx 表单只有各自 min 无跨字段校验，antd 补 maxPause ≥ pause 联动校验防 400（等价内增强，采纳）。
【依据】上列源码。

**16. Main 队列：前端必拦 + API 层无保护登记**〔证成〕
【决议】后端删除唯一保护 = device profile 外键 → 400 "The queue referenced by the device profiles cannot be deleted!"（`BaseQueueService.java:75-89`），**无 name=Main 白名单**。antd 等价 ngx：`queue.name === 'Main'` 时禁勾选、隐藏删除（列表 + 详情页双处）。登记「API 层无 Main 保护」为已知边界；是否给 fork 后端补保护另立 issue，不进 M14（沿 ST 裁决点 5）。Main 记录的系统级归属（SYS 列表可见性）挂 T5 实测确认。
【依据】上列源码；ngx `queues-table-config.resolver.ts:113-114`。

### D. 计算字段域

**17. CF 服务层缺口与排序白名单**〔证成〕
【决议】`services/tb/calculated-fields.ts` 现有 3 函数（entity-scoped 列表/save/delete），M14 独立页需新增：`getCalculatedFields`（`GET /api/calculatedFields`，query `types[]/entityType/entities[]/name[]/textSearch` + 分页；`name` 是**可重复 query 参数**）、`getCalculatedFieldById`、`testScript`（POST，保存前预检通道）、`getLatestCalculatedFieldDebugEvent`（测试对话框预填）；`getCalculatedFieldNames` 按需（排序锁 name）。排序：dao 四条分页查询全部 `DaoUtil.toPageable(pageLink)` **无列映射**（`JpaCalculatedFieldDao.java:80-110` 本镜头复跑确认）→ `CalculatedFieldInfo.entityName` 等别名 sortProperty 会 Hibernate 解析失败 500；前端排序白名单硬收 `createdTime|name`（swagger 与 dao 属性名一致，无 M13 customerTitle 型假文档陷阱），白名单外列头不给排序。
【依据】上列源码。

**18. ALARM 型的取数语义**〔证成〕
【决议】`GET /api/calculatedFields` types 缺省 = `EnumSet.allOf - ALARM`（`CalculatedFieldController.java:213-216`）——独立页做「全部计算字段」时 ALARM 型天然不在；如需展示须显式传 `types=ALARM`（或按实体 `/api/calculatedField/{entityType}/{entityId}`，其 type 缺省 = 全部含 ALARM，:149-165）。`SUPPORTED_ENTITIES`：DEVICE/ASSET/DEVICE_PROFILE/ASSET_PROFILE 全类型 + CUSTOMER 仅 ALARM（`CalculatedField.java:52-58`）——推论：聚合列表剔 ALARM 后 CUSTOMER 的 CF 恒为空，antd 三维过滤的 entityType=CUSTOMER 选项无数据可出，属上游行为照切。ALARM 域（alarm-rules 表单/条件排程组件群）维持 CF 侦察裁决点 1 的范围建议（M14 独立页 = 6 型），归 spec 定范围。
【依据】上列源码。

**19. testScript：唯一语法通道，但不强制**〔证成（消解 B「必须先 testScript」）〕
【决议】保存链只做结构校验（参数名 ctx 保留、relation query、调度限额），**表达式语法/运行错误照常入库**——这是坑，但 ngx 的保存也不拦（dialog `add()` 直接 POST，CF§3），故**等价基线 = 不强制 testScript**；B§3 末句「前端必须先 testScript 再保存」是建议而非后端契约，降级为**登记推荐增强**：antd 在 SCRIPT 型 / PROPAGATION 带表达式时于提交前自动调 testScript，`error` 非空则阻断 + 展示（防「入库后运行期才炸、用户无感知」）。testScript 契约：错误不抛 HTTP 错，200 + `{output, error}`（`DefaultTbCalculatedFieldService.java:135-168`）；两个例外要处理：TBEL 引擎未装配 → IllegalArgumentException → **400** "TBEL script engine is disabled!"（:133-135，精化 B 头部「返回 error 字段」的说法——那是运行错误形态，disabled 是 400）；单次执行超时 20s（:64,:155）→ 超时异常同样进 error 字段。
【依据】上列源码。

**20. 唯一冲突与禁改 entityId 的报错形态**〔证成〕
【决议】DB 约束 `calculated_field_unq_key UNIQUE(entity_id, type, name)`（`schema-entities.sql:940`）在 dao 层映射为 400（DataValidationException）："Calculated field with such name and type already exists"（ALARM 型："Alarm rule with such type already exists"，`BaseCalculatedFieldService.java:111-117`——源码无尾随感叹号，按原文转译）；同实体仅一条 ALARM 即由此约束产生。更新仅 `entityId` 禁改：400 "Changing the calculated field target entity after initialization is prohibited."（`DefaultTbCalculatedFieldService.java:185-190`）；type/name/configuration 均可改。antd 错误 toast 按消息前缀转译，换实体 = 删了重建的引导文案照此。
【依据】上列源码。

**21. CF 服务端限额的消费深度**〔证成〕
【决议】antd 表单必须消费 authState 下发的 8 个限额参数（maxArgumentsPerCF/maxDataPointsPerRollingArg/maxRelationLevelPerCfArgument/maxRelatedEntitiesToReturnPerCfArgument/minAllowedDeduplicationIntervalInSecForCF/minAllowedAggregationIntervalInSecForCF/minAllowedScheduledUpdateIntervalInSecForCF/intermediateAggregationIntervalInSecForCF，CF§12 表维持），另有两个常被漏掉的服务端闸门一并进表单提示：**每实体非 ALARM 条数上限**（`maxCalculatedFieldsPerEntity` 默认 5，超限 400 "Calculated fields per entity limit reached!"，`CalculatedFieldDataValidator.java:57-70`）与参数数上限（默认 10，:80-91，400 "Calculated field arguments limit reached!"）——ALARM 型不计数（validateCreate ALARM 直接 return）。限额值本身来自 tenant profile，M14 只消费 authState/tenant profile 既有下发，不做 profile 编辑。
【依据】上列源码。

### E. trendz / home / ai-model

**22. trendz apiKey 对 CU 裸露：定性为上游设计，前端不建入口即规避**〔证成 + 实测 T10〕
【决议】坐实：`GET /api/trendz/settings` `@PreAuthorize('TENANT_ADMIN','CUSTOMER_USER')` 且 `findTrendzSettings` 全量回传无脱敏（`TrendzController.java:73-78` + `DefaultTrendzSettingsService.java:55-61`）。定性：Trendz 是外部分析产品，CU 侧拿 baseUrl+apiKey 去访问 Trendz 自身是上游有意设计（key 为租户级共享凭据），**不是缺陷 bug**；但站在 fork 安全角度登记「后端收紧候选」issue（改 TENANT-only 或 CU 脱敏），由用户择机拍板，不阻塞 M14。antd 契约：trendz settings 页 TENANT_ADMIN only（与 ngx 菜单一致），CU 零入口即规避；GET 未配置返回空对象（非 404）；POST 响应为入参回显（:67）。
【依据】上列源码。

**23. home settings：4 端点分工与存储位置**〔证成〕
【决议】M14 只做配置页 = `GET/POST /api/tenant/dashboard/home/info`（TA only，`DashboardController.java:469-516`）。存储在 **`Tenant.additionalInfo`**（键 homeDashboardId / homeDashboardHideToolbar）——既不是 admin settings bucket 也**与 tenant profile 无关**（tenant profile 关联的是 CF 的 8 限额参数，勿混写）。契约细节：GET 恒 200，未配置 = `{dashboardId: null, hideDashboardToolbar: true}`；POST dashboardId 需 READ 权限校验（:500），**dashboardId 传 null = 清除配置**（remove 两键）；POST 200 空 body。`GET /api/dashboard/home` 与 `/api/dashboard/home/info`（全角色、user→customer→tenant 三级回退）是 `/home` 落地页（M15 生效面）的消费端点，不进 M14 服务层；M14 验收口径 = 「保存成功即达标」（ST 裁决点 4 维持）。
【依据】上列源码。

**24. ai-model：5 端点全消费，chat 的 UI 定位 = 连通性探测**〔证成〕
【决议】antd M14 消费全部 5 端点：save（POST，tenantId 服务端强制）、getById、分页列表（sortProperty 白名单 `createdTime,name,provider,modelId`，四列均实体属性可安全排序）、delete（**不存在返回 `false` 而非 404**，前端按 false 提示「已不存在」）、chat。「chat 不进 M14 UI」的问法被事实否定：ngx 的 **Check connectivity 按钮就是 chat 端点**（`check-connectivity-dialog.component.ts:48-82`，硬编码探测消息 + maxRetries=0 timeout=20s），antd 编辑对话框必须带同款探测动作；不存在的是「AI 对话/聊天面板」（ngx 无、后端 DeferredResult 单轮无会话语义）。chat 契约：body `TbChatRequest{systemMessage?, userMessage, chatModelConfig}`（record，`TbChatRequest.java:31-54`）；**错误走 200 + Failure 信封**（`AiModelController.java:170-172` catching 所有 Throwable → `TbChatResponse.Failure(message)`），HTTP 层不报错，前端必须解析信封而非 catch HTTP；探测不必先保存模型（config 来自请求体）。SSRF：内网 baseUrl/endpoint → 400 "AI model provider URL is not allowed: ..."（`AiModelDataValidator.java:89`）。对话框标题不区分 add/edit 属上游瑕疵不照抄；模型型号候选 = 前端静态清单（无 models API，不发明）。
【依据】上列源码。

### F. 快照与总口径

**25. openapi 快照对照复核**〔证成〕
【决议】spot check 三处与 Java 源码一致：① `/api/admin/settings` 仅 post（GET 独立为 `/settings/{key}`）；② `/api/calculatedFields` get 的 types/entities/name 均为数组（可重复参数）、sortProperty enum=[createdTime,name]；③ `/api/ai/model/chat` body=$ref TbChatRequest、200 = oneOf[Failure,Success]（信封语义如实入快照）。B§7「路径与方法完全一致、Hidden V1 端点不进前端」结论维持；`passwordReuseFrequencyDays` 在生成类型 `types/tb/openapi/index.ts:19747` 有声明（#6-⑤）。快照仍只作参考、以代码为权威的口径不变。
【依据】`ui-antd/api/tb-openapi.json` node 实测 + 上文源码。

---

## 真机实测清单

> 整合 scout-backend T1-T10 并按本镜头裁决修订（T6 重写、T5 加判据、T3/T4 加对照点）。前置：run-tb-backend 起本机后端 + SYS_ADMIN/TENANT_ADMIN（/CUSTOMER_USER）token。实测只影响登记措辞与已交付页修复优先级，**不改变已定规避口径**。

- **T1 CF CRUD + 排序别名 + 冲突**（#17/#18/#20）
  步骤：TA 依次 ① POST `/api/calculatedField`（SIMPLE/DEVICE，1 参数）；② GET `/api/calculatedField/{entityType}/{entityId}?pageSize=10&page=0&sortProperty=createdTime&sortOrder=DESC`；③ GET `/api/calculatedFields?pageSize=10&page=0&sortProperty=entityName`（别名）；④ 同名同型再 POST；⑤ GET `/api/calculatedFields`（无 types）确认结果不含 ALARM。
  判据：② 200；③ 预期 500 "Database error"（实锤别名 500，若 200 则登记降级为风险记录）；④ 400 "Calculated field with such name and type already exists"；⑤ 剔除 ALARM 成立。
- **T2 testScript 形态 + 禁改 entityId**（#19/#20）
  步骤：① POST `/api/calculatedField/testScript` 传坏表达式 → 200 且 `error` 非空；② 更新已建 CF 时改 entityId → 400 "Changing the calculated field target entity..."；③ （若本机可关 TBEL 对照则做）确认 disabled 形态 400 "TBEL script engine is disabled!"。
  判据：三种形态与 #19/#20 一致。
- **T3 VC settings 全链（凭据三态 + 错误形态）**（#8/#9/#13）
  步骤：用本机 `file:///` 路径或真实 git 仓（jgit 支持 file 协议）：① POST `/api/admin/repositorySettings`（凭据缺字段）→ 200 且 GET 响应三凭据为 null；② POST `checkAccess` 缺 password → 200（回填生效）；③ 故意改错密码后 POST 保存 → **500 "Failed to init repository!"（无底层原因）**、checkAccess → **400 "Unable to access repository: \<原因\>"**（对照 #9）；④ body 带 `password:""` 走保存 → 确认失败且 GET 旧值仍在（空串不静默覆盖）；⑤ POST `/api/admin/autoCommitSettings` branch=`a b` → 400 "Branch name is invalid"。
  判据：脱敏、回填、双错误形态、空串安全五点成立。
- **T4 VC 异步任务链与轮询终态**（#10，依赖 T3 repo 可用）
  步骤：① GET `/api/entities/vc/branches`（default 在首位）；② POST `/api/entities/vc/version`（SINGLE_ENTITY/DEVICE）拿 requestId，2s 间隔轮询 status 至 `done=true`；③ 构造一次失败 commit（如超限）确认 `done=true 且 error 非空`；④ 观察受理窄窗是否出现 400 "Invalid task"（可选）。
  判据：异步闭环 + 失败也是 done=true 终态 → 轮询器契约定案。
- **T5 Queue 角色矩阵 + Main 可见性**（#14/#16）
  步骤：① TENANT token GET `/api/queues?serviceType=TB-RULE-ENGINE`（非 isolated 租户预期空列表）、POST `/api/queues` → 403；② SYS POST（name=smoke14）→ 200、重复 POST → 400 "Queue with name: smoke14 already exists!"；③ SYS 列表确认 Main 是否在列；④ TENANT GET 系统队列 by id（非 isolated 租户预期 **200**，isolated 场景 403——如本机租户非 isolated 仅验 200 分支）；⑤ SYS DELETE smoke14 → 200。
  判据：角色差异 + 唯一性 + checkQueueId 方向修正实证 + Main 可见性事实。
- **T6 mail settings 覆盖语义 + antd 缺 id 实锤（重写原 T6）**（#1/#2）
  步骤：① SYS token POST `/api/admin/settings` key=mail（**不带 id、不带 password**，模拟 antd buildPayload）→ 预期 **400 "Admin settings with such name already exists!"**（#2 实锤；若 200 则 #2 降级重查）；② 带 id + 不带 password 保存 → 查库 `select json_value from admin_settings where key='mail'` 确认 password 仍在（#1 服务端回填实锤）；③ 带 id + `password:""` 保存 → 查库确认 password 落空串（#1 空串覆盖实锤，测完恢复）；④ testMail 不带 password → 走存储密码发信（失败也须是 400 带底层原因，证明回填已发生）。
  判据：四点分别坐实 #2 缺陷与 #1 回填/空串语义；据 ① 决定已交付页修复的紧急度。
- **T7 securitySettings 回环**（#6）
  步骤：GET（默认值）→ POST minimumLength=8 → GET 确认持久化；POST `userActivationTokenTtl=0` → 400；POST passwordPolicy `{minimumLength:10, maximumLength:4}` → 预期 **200**（无服务端校验，坐实前端自校验义务）。
  判据：默认值、TTL @Min、其余字段裸奔三点成立。
- **T8 notification settings 三角色**（#7）
  步骤：TENANT POST `/api/notification/settings` `{"deliveryMethodsConfigs":{}}` → 200；GET 回读一致；CUSTOMER GET settings → 403、GET `/api/notification/settings/user` → 200。
  判据：角色矩阵与未配置空对象语义成立。
- **T9 ai-model SSRF + delete false + chat 信封**（#24）
  步骤：① TENANT POST `/api/ai/model`（OpenAI baseUrl=`http://127.0.0.1:8080`）→ 400 "AI model provider URL is not allowed..."；② 合法公网 URL → 200；③ DELETE 不存在 id → 200 body `false`；④ POST `/api/ai/model/chat` 用不可达 config → **HTTP 200 + Failure 信封**。
  判据：SSRF、false 删除、信封错误三点成立。
- **T10 trendz apiKey CU 裸露**（#22）
  步骤：TENANT POST `{enabled:true, baseUrl:"https://trendz.example.com", apiKey:"k1"}` → CUSTOMER token GET `/api/trendz/settings`（预期 apiKey 裸露）→ CUSTOMER POST → 403。测完 CU 读后可考虑还原数据。
  判据：泄露事实坐实 → 按 #22 定性登记；若意外已脱敏（版本差异）则登记降级。

## spec §6 缺陷/契约登记建议（照 §4.8 体例）

- **【已交付页缺陷·高优】ui-antd settings 三页（general/connectivity/outgoing-mail）保存 body 不带 id**，同 key 已存在时 POST /api/admin/settings 返回 400 "Admin settings with such name already exists!"（AdminSettingsDataValidator.validateCreate；系统初始化即预建三条）。M14 按 #2 修复（payload 带快照 id）+ 回归验收；T6-① 实锤。M14 新增 settings 页一律带 id 编码。
- **【上游行为·前端契约】admin settings key=mail 的密码语义**：GET 脱敏 + 服务端对缺省 password/refreshToken 字段回填旧值；空串会真覆盖。前端必须「留空 = 删字段」。testMail 通道有独立回填（可不重输密码直接测）。
- **【上游行为·前端契约】VC repositorySettings 凭据**：GET 恒 null；null/缺字段回填旧值，空串=传空凭据走真实验证；保存失败 500 笼统、checkAccess 失败 400 带原因——UI 引导先 Check access。序列化封 `stripBlankCredentials`。
- **【上游风险·规避】CF 列表 sortProperty 白名单仅 createdTime|name**（dao 无列映射，别名 500 待 T1 实锤）；前端白名单硬收口。
- **【上游边界·登记】Queue 后端无 Main 删除保护**（仅 device profile 外键），前端等价 ngx 拦截；fork 补后端保护另立 issue。B§1.5 的 403 方向描述有误（isolated 租户才 403），随本期文档勘误。
- **【上游设计·收紧候选】trendz settings GET 对 CUSTOMER_USER 放行且不脱敏**（apiKey 裸露为上游有意设计）；antd 不建 CU 入口即规避；fork 是否收紧后端另立 issue。
- **【上游行为·前端契约】VC 轮询中间态**：status 端点 400 "Invalid task"（受理窄窗）与 404 "Task execution timed-out"（结果缓存 TTL 20 分钟）不是终态，轮询器需容忍后再判失败；DeferredResult 180s 超时 → 500 "Request timeout" 入错误映射表。
- **【上游瑕疵·不照抄】ngx TS 类型缺口教训**：RepositorySettings 漏 readOnly、UserPasswordPolicy 漏 passwordReuseFrequencyDays（antd 类型层已后者齐备）——antd 新建类型以 Java 类为权威逐字段核对。
- **【上游对照·增强登记】CF testScript 提交前自动预检**（等价基线不强制，登记为推荐增强）；queue 表单补 `maxPauseBetweenRetries ≥ pauseBetweenRetries` 跨字段校验（ngx 缺，防 400）。

## 仍需用户拍板的偏好项

**无（本镜头口径）。** 25 条均可由源码契约 + fork 铁律机械推出：唯一近似「偏好」的是 trendz apiKey 是否收紧后端（#22）与 queues 页 TENANT 是否保留只读视图（#14）——前者是安全加固节奏问题（已给「另立 issue 不阻塞 M14」的默认路径），后者是页面范围/UX 问题（契约事实已给足：TA 写被 403、非 isolated 列表恒空），两者移交 spec 与 arch/scope 镜头定范围，不构成本镜头的悬置分歧。已登记的「testScript 自动预检」「queue maxPause 跨字段校验」两处增强均有明确技术理由（防静默坏数据/防 400），沿 M13「登记为增强」口径处理，不要求用户逐项拍板。
