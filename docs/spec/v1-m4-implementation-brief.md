# v1-M4 实现简报（账户安全域 + MFA 登录线 + OAuth2 登录线）

> 施工蓝图：所有 M4 实现 agent 从本文件取契约与约定。范围 = spec §3.9 全部 + §3.1 MFA 两项 + §3.1 OAuth2 一项。
> 事实来源：ui-ngx 参照（2026-09-02 摸底）+ 后端控制器源码 + 运行中后端活体验证 + ui-antd 现状摸底。

## 0. 交付面总览

| # | 面 | 路由（ui-antd） | ui-ngx 参照 |
|---|---|---|---|
| A | 登录页 MFA 分流 + OAuth2 按钮 + 回调消费 | `/user/login`、`/`（entry） | login.component + auth.service.loadUser |
| B | MFA 验证码页 | `/user/mfa`（别名 `/login/mfa`） | two-factor-auth-login.component |
| C | 强制 2FA 设置流 | `/user/force-mfa`（别名 `/login/force-mfa`） | force-two-factor-auth-login.component |
| D | account/profile | `/account/profile` | profile.component |
| E | account/security | `/account/security` | security.component + authentication-dialog/* |

**明确不做**（登记于验收修订记录，不建文件）：
- API keys 卡（§3.9 v1 口径 = 资料 + 改密码 + 2FA，未列该项；M4 落账复核：`/api/apiKey*` 五端点在后端源码与 openapi 快照均在——原判「契约缺席」不成立，属范围裁剪而非契约缺口，不登记 BCR）
- homeDashboard 选择器与 unitSystem（spec §3.9 v1 口径 = 资料编辑 + locale；homeDashboard 归 M5/v2）
- settings 侧 testMail / OAuth2 token 真实外发动作复验（依赖外部 SMTP/IdP，沿用 M3 前置挂起口径）

## 1. 后端契约（源码 + 活体已验证）

### 1.1 登录响应三态（POST /api/auth/login → JwtPair `{token, refreshToken?, scope?}`）

- 密码正确 + 已启用 2FA → `{token: <PRE_VERIFICATION_TOKEN JWT>, refreshToken: null, scope: "PRE_VERIFICATION_TOKEN"}`（30 分钟有效期）
- 密码正确 + force-mfa 命中 + 未配置 2FA → `scope: "MFA_CONFIGURATION_TOKEN"`（refreshToken 同为 null）
- 其余 → 正常 token 对，scope 缺省
- 前端分流：scope 两中间态 → **先存 token 再跳** `/user/mfa` / `/user/force-mfa`

### 1.2 登录线 2FA（TwoFactorAuthController，`/api/auth/2fa`，持中间 token 即可）

- `GET /api/auth/2fa/providers` → `TwoFaProviderInfo[] { type, default, contact, minVerificationCodeSendPeriod }`（contact 是混淆后的手机/邮箱）
- `POST /api/auth/2fa/verification/send?providerType=` → 触发发码（后端限流）
- `POST /api/auth/2fa/verification/check?providerType=&verificationCode=` → 成功返回**正式 JwtPair**；400=码错、429=限流
- （后端预留 `POST /api/auth/2fa/login`，ui-ngx 前端未用——force-mfa 配完走 logout 重登，parity 照做，**不调用**）

### 1.3 账户 2FA（TwoFactorAuthConfigController，`/api/2fa`；generate/submit/POST/GET 同时放行 MFA_CONFIGURATION_TOKEN，PUT/DELETE 仅正式用户）

- `GET /api/2fa/account/settings` → `AccountTwoFaSettings { configs: { TOTP?: {authUrl, useByDefault}, SMS?: {phoneNumber, useByDefault}, EMAIL?: {email, useByDefault}, BACKUP_CODE?: {codes?, codesLeft, useByDefault} } }`
- `GET /api/2fa/providers` → `TwoFaProviderType[]`（**类型数组**，与 1.2 的 info 列表不同端点）
- `POST /api/2fa/account/config/generate?providerType=` → 配置模板（TOTP 得 authUrl=otpauth://…；BACKUP_CODE 得 codes[]）
- `POST /api/2fa/account/config/submit`（body=TwoFaAccountConfig）→ SMS/EMAIL 提交并触发发码
- `POST /api/2fa/account/config?verificationCode=`（body=TwoFaAccountConfig）→ 验码激活，返回 AccountTwoFaSettings；已配置同 provider 报 "2FA provider is already configured"
- `PUT /api/2fa/account/config?providerType=`（body={useByDefault}）→ 切默认
- `DELETE /api/2fa/account/config?providerType=` → 停用，返回 AccountTwoFaSettings

### 1.4 OAuth2 登录线（活体验证过）

- 登录页按钮数据：`POST /api/noauth/oauth2Clients?platform=WEB`（**POST、body 空**）→ `OAuth2ClientLoginInfo[] { name, icon, url }`；失败静默按 `[]` 处理
- 按钮 href = `url`（后端给的 `/oauth2/authorization/{uuid}`），**原生 `<a>` 跳转**，可追加 `?prevUri=<redirectUrl>`（登录页 `?redirect=` 透传）
- 成功回调：后端 302 到 `/?accessToken=…&refreshToken=…`（根路径 query）
- 失败回调：302 到 `/login?loginError={urlencoded 原文}` → 别名已重定向 `/user/login`，query 保留

### 1.5 账户资料 / 改密码（已有服务层，直接复用）

- `saveUser(user, {sendActivationMail: false})` — POST `/api/user`（services/tb/user.ts:40）；`lang` 写入 `additionalInfo.lang`，**空串须 delete 键**
- 保存后 **JWT claims（firstName/lastName）变了要静默刷新 token**：POST `/api/auth/token`（refreshToken）换新对（ui-ngx refreshJwtToken(false) parity）
- `changePassword({currentPassword, newPassword})` — 已在 services/tb/auth.ts:59，成功响应即新 token 对（内部已 setTokens）
- `GET /api/noauth/userPasswordPolicy` — 已有 `usePasswordPolicy()`（pages/user/components/password-policy.tsx）
- 改密码后端错误按 detail 分派（ui-ngx parity）："Current password doesn't match!" → 旧密码字段错误；"Password must…" → 重新拉策略；"Password was already used…" → 字段错误展示原文

## 2. ui-ngx parity 细节清单（易漏抄）

**B `/user/mfa`**：
- 默认 provider = `default:true`；描述文案带 `{contact}` 插值
- 默认 provider 非 TOTP 时**自动发一次码**；TOTP 无发码/重发按钮
- 重发倒计时 = `minVerificationCodeSendPeriod || 30` 秒，**发码成功或失败都启动**；归零才显示重发
- 错误分级：400 → 字段 incorrectCode；429 → tooManyRequest 提示且 **5 秒后自动清除**；其他 → toast 服务端原文
- BACKUP_CODE 输入 8 位 `[0-9a-f]`（inputMode=text），其余 6 位纯数字，`autocomplete="one-time-code"`
- 多 provider 时 "试试其他方式" 列表切换；取消 → logout 回登录页
- 守卫：进入页面校验 JWT authority=PRE_VERIFICATION_TOKEN，不符 → logout

**C `/user/force-mfa`**：
- 状态机：SETUP（选 provider）→ 每 provider 内 INPUT → ENTER_CODE → SUCCESS
- 进入先 `GET /api/2fa/account/settings`：已有任意配置 → 保留且 allow 含 BACKUP_CODE；全新账号 → 过滤掉 BACKUP_CODE
- TOTP：generate → authUrl 渲染二维码 + 解析 secret 明文展示 + 输 6 位码 → verifyAndSave
- SMS：手机号校验 `^\+[1-9]\d{1,14}$` → submit（触发发码）→ 输码 → verifyAndSave
- EMAIL：默认填当前用户邮箱 → submit → 输码 → verifyAndSave
- BACKUP_CODE：generate 拿 codes → **直接 verifyAndSave 无需输码** → 一次性展示 codes + 下载 txt + 打印
- 第一个激活的 provider 自动 useByDefault=true，之后均 false
- 已配置 provider 在 SETUP 列表禁用；SUCCESS 页按钮 = logout（回登录页重登）
- 守卫：JWT authority=MFA_CONFIGURATION_TOKEN，不符 → logout

**D `/account/profile`**：
- 单卡片：email（必填+格式）+ firstName + lastName + phone + **language 下拉**（zh_CN/en_US/auto null）
- 保存成功链：更新 initialState.currentUser → changeLocale（若语言变了）→ 静默刷新 token
- 表单 dirty 离开页需确认（PageContainer dirty props 内建）

**E `/account/security`**：
- 卡 1 JWT token：显示 `jwt_token_expiration`（localStorage）+ 复制 `Bearer <token>`；已过期复制给 warn 提示
- 卡 2 改密码：currentPassword/newPassword/newPassword2；前端组校验（新旧不同、两次一致）+ `usePasswordPolicy` 实时策略清单；提交 `changePassword`（复用现有）；错误按 1.5 分派；Discard/提交按钮仅 dirty 时显示
- 卡 3 2FA：`GET /api/2fa/providers` 为空 → 整卡隐藏（平台未启用任何 provider）；每行 = provider 布尔开关 + 已启用时的 dataInfo 插值（EMAIL→email、SMS→phoneNumber、BACKUP_CODE→codesLeft）；BACKUP_CODE 开关在其他 provider 都未激活时禁用
- 启用流 = 对应对话框（TOTP/SMS/EMAIL/BACKUP_CODE，同 C 的每 provider 逻辑但激活后回灌 settings 不 logout）；停用 = 确认框 → DELETE；启用数 >1 显示"默认方式"切换（PUT useByDefault）
- 重新生成 backup codes：确认框（codesLeft 将作废）→ DELETE backup_code → 重走启用对话框

**A 登录页 + 回调**：
- OAuth2 按钮区在密码表单上方，带 "OR" 分隔；仅 1 个 client 时文案 "使用 {name} 登录"，>1 个显示分组标题
- `loginError` query → **不可关闭的错误对话框**展示服务端原文，确认后清 query
- 回调消费在 entry（`/`）：有 accessToken+refreshToken → setTokens → 清 query → getCurrentUser → roleDefaultPath
- 登录已有会话重定向逻辑不动（M1 验收项）

## 3. ui-antd 落点与红线

- 路由全在 `config/routes.ts`：`/user` 组加 `mfa`、`force-mfa`（layout:false，无 name 或 hideInMenu）+ 2 条别名 redirect（`/login/mfa`、`/login/force-mfa`）；`/account` 组仿 settings 相对 name 嵌套（`access: 'canAuthenticated'`，profile/security 子路由，不在侧边菜单出现）
- MFA 中间态对 getInitialState 的影响：token 的 authority 属两中间态时**不调 getCurrentUser**（会 403 触发 handleUnauthorized 死循环），currentUser 留空即可——页面都在 `/user/` 下不会触发登录重定向
- authority 判定用 `decodeTokenClaims()`（token-store.ts）读 claims（与 access.ts / useAuthority 同源机制），勿自造解析
- 服务层新增：`services/tb/two-fa-account.ts`（1.3 全端点）+ `services/tb/auth.ts` 增 1.2 三端点与 1.4 getOauth2Clients；类型进 `types/tb/two-fa.ts` / `oauth2.ts`；token 副作用只许出现在 auth.ts
- 服务层测试照 `*.endpoints.test.ts` 模板（mock tbHttp 断言精确 path+query）；页面测试照 `pages/user/login/index.test.tsx` hoisted mock 模式；纯函数变换层用 `data.test.ts`
- locale：登录线文案进**现有** `locales/*/login.ts`（已聚合，W1 专属）；account 文案新建 `locales/*/account.ts` + 两处聚合器各加一行（W2 专属）；插值一律 `{name}` 形态，禁手拼字符串
- UI 复用优先：AuthShell、usePasswordPolicy、SettingsCard、PageContainer（dirty 守卫内建）、serverErrorText、use-copy、changeLocale
- TOTP 二维码：authUrl 用二维码库本地渲染（ui-ngx 同为本地渲染；依赖选型见任务卡）
- **红线**：不动 token-store 键名、不动 client.ts 豁免表/刷新单飞、不动 dev proxy；biome + check-locale + tsc + vitest 提交前必须全绿；颜色只用 antd token；写 antd 组件前 `npx antd info <Component>`
- dev server 已在 :8000 起单实例（**不许再起/重启**，M3 双实例污染教训）；vitest 随便跑

## 4. 验收口径（W3 用，对齐 spec §3.1/§3.9 checklist）

本地可全链路验证：TOTP 启停 + 登录（agent 可自算 TOTP 码）、BACKUP_CODE 全流、改密码、资料 + locale、force-mfa 全流（TOTP 路径）、OAuth2 按钮渲染（需 SA 先配 provider，可用假 issuer 测按钮出现 + 授权失败 → loginError 对话框这条失败链）。
外部依赖挂起项（沿用 M3 口径登记）：EMAIL/SMS 发码真实链路（SMTP/短信网关）、OAuth2 真实 IdP 全流。
