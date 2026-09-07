# v2 M12 真机轻走查（通知族）

> 走查日：2026-09-07。环境：本机后端（localhost:8080）+ ui-antd dev server（8002）+ browseros 真机驱动。
> 深度口径：M15 收口波 P2 A-（用户拍板「补轻走查」）——抽样驱动主链，其余诚实注记，非全量走查。
> 验收条目：`docs/spec/v2-subsystems-acceptance.md` §4（34 条）；通道口径沿 §4.0「WEB 为端到端验收基准，真实 SMS/EMAIL/SLACK 到达留人工」。

## 0. 前置与夹具

- TA = tenant@thingsboard.org 驱动五页全链；SYS = sysadmin@thingsboard.org 仅驱动 4.5 触发器候选/ENTITIES_LIMIT 抽样（API 换票整页重载）。
- browseros 隐藏标签页环境坑同 M13 走查 §0：rAF 冻结致弹层关闭动效残留（逻辑关闭以网络/列表刷新为准）、act 点击失效重试、antd Checkbox onChange 在无头驱动下不触发（勾选态与 React selection 脱节，见 §7 观察 O-2）。
- 主链夹具：接收人「M15-W4-scratch target」（平台用户/ALL_USERS，向导内联新建）；发送走查通知×5（向导×3 + API×2）；scratch 规则×2。走查后全量 DELETE（§8）。

## 1. 4.3 sent + 发送向导（主链，重点走）

| §4 条目 | 驱动与证据 | 结论 |
|---|---|---|
| 列表 | 四列 createdTime/status/deliveryMethods/templateName + 行内 redo/delete；工具栏仅 刷新/发送通知（无搜索框实证）；两轮发送后新行均登顶（createdTime DESC） | ✅ |
| 三步 stepper | 设置→编写→审核 步进条目渲染；scratch 两步前进均过校验门；审核步 preview 自动加载 | ✅（gate 见缺陷 D-1；**D-1 已修 + 修复后真机复验**，见 §7） |
| Setup | 从零开始默认（radio useTemplate=false）；接收人多选（服务端搜索候选）；「新建」内联新建接收人对话框（保存后候选即时补入）；计划稍后发送 开关 → 日期时间选择器 + 时区（Asia/Shanghai 默认）字段在场（未真定时） | ✅ |
| 投递方式开关组 | GET /api/notification/deliveryMethods 200 探测 → WEB/EMAIL/SMS/TEAMS 可用、SLACK/移动应用 禁用；WEB 恒开恒锁（「始终会投递到站内通知铃铛」）；不可用方式挂「前往配置通知渠道」跳转；「至少需要选择一种发送方式」文案在场 | ✅ |
| Compose | WEB 主题/消息输入（subject/body）；审核预览回显一致 | ✅ |
| Review preview | POST /api/notification/request/preview?recipientsPreviewSize=20 → 200；「6 个收件人」+ 按 target 计数（M15-W4-scratch target: 6）+ 接收人 chips 逐个列出 + Web 通知预览块 | ✅ |
| 提交 | POST /api/notification/request → 200 + toast「通知请求已发送。」×3 轮；三入口目击：sent 页头「发送通知」/行内「再次通知」/rules·recipients·templates 页头同款按钮 | ✅ |
| 再次发送 | 行内 redo → 「再次通知」向导以 scratch 预填重开（接收人+内容完整）→ 两步 → 发送 200；新行登顶 | ✅ |
| 删除 | 单条：确认框「无法恢复」→ DELETE /api/notification/request/{id} 200 → 行消失；批量：勾选后「删除所选」+确认+逐 id DELETE 通道在场（无头环境选择态未同步，O-2），语义由 `sent/index.test.tsx`「batch-deletes the selected rows」钉住 | ✅（批量=单测锚） |
| status 徽标 | SENT「已发送」徽标真机 | ⏸ SCHEDULED/PROCESSING/失败数 badge→失败明细对话框未驱动（不真定时+无失败通道），3V |

## 2. 4.5 通知规则（抽样 6/14 触发器 + 行内动作）

| §4 条目 | 驱动与证据 | 结论 |
|---|---|---|
| 列表 | 五列 createdTime/name/templateName/triggerType/描述 + demo 规则 9 行；行内 停用/启用/复制/删除 按钮矩阵 | ✅ |
| 启停 toggle | 「停用规则」→ API 复核 enabled:false（即改即存） | ✅ |
| 复制规则 | 行内复制 → 向导以「M15-W4-scratch ALARM rule (copy)」预填（(copy) 后缀）→ 保存落库 | ✅ |
| 编辑锁触发器 | 行点击编辑 → 触发器 select disabled 实证 | ✅ |
| 候选按角色二分 | TENANT 候选恰 8 种（实体动作/告警/告警评论/告警分配/设备活动/规则引擎生命周期/边缘连接/边缘通信失败）；SYS 候选恰 6 种（新平台版本/实体数量上限/API 使用上限/速率限制/任务处理失败/资源短缺）；默认 SYS=实体数量上限、TENANT=告警 双向实证 | ✅ |
| 模板过滤 | 模板候选随 triggerType 过滤（ALARM 型仅 2 个 demo 模板；网络 `notificationTypes=ALARM` 实证） | ✅ |
| 接收面二分 | ALARM → 升级链（「首级接收人（立即通知）」0 秒固定 + 添加阶段动态行 + 「间隔需在 1 分钟到 7 天之间」文案 + 每级独立接收人）；非 ALARM → targets 多选（必填校验「请选择接收人」）；clearRule「当告警状态变为以下状态时停止升级」仅升级链 >1 级时在场 | ✅ |
| 触发器表单抽样 | 真机驱动 6 种：ALARM（类型/严重级别/通知时机）· DEVICE_ACTIVITY（设备|设备配置档 Segmented 二选一联动+离线时机）· ENTITY_ACTION（实体类型+创建/更新/删除）· ALARM_COMMENT（状态列表+仅用户评论/评论更新时通知）· RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT（规则链过滤+链事件+跟踪规则节点事件开关）· ENTITIES_LIMIT（SYS，实体类型+阈值 % 默认 80） | ✅（6/14 ≥3 达标） |
| 其余 8 种 | 候选在场 + 触发器切换后第 2 步表单随型重渲机制实证（NEW_PLATFORM_VERSION 基础步顺带目击）；字段级对照归 `m12-ngx-inventory.md` §5 + `template-fields.test.ts`/`rule-wizard.test.tsx` 单测锚 | ⏸ 3V（不逐型深驱，按作业单口径） |
| description+并入 triggerConfig | 触发器步底部描述字段在场并填写；保存 POST /api/notification/rule 200 ×2 | ✅（payload 并入由 rule-submit 契约锚） |

## 3. 4.1 收件箱（TA）

| §4 条目 | 驱动与证据 | 结论 |
|---|---|---|
| 列表 | 五列 createdTime/type/subject/text/操作；subject/text 以文本渲染（无 HTML 注入）；新通知登顶（DESC）；分页在场（209 条/10 页）；搜索/排序未逐一驱动（URL textSearch/sort 契约由 `url-state.ts` 锚） | ✅ |
| 未读/全部 toggle | 默认「未读」选中；切「全部」→ URL 写入 `?unreadOnly=false` + 已读行回列 | ✅ |
| 行点击详情 | 「通知详情」对话框全量渲染（主题/正文/相对时间「16 分钟前」）；关闭 → PUT /api/notification/{id}/read 200 + 行从未读视图消失 | ✅ |
| 已读三通道 | 行内「标记为已读」PUT read 200 / 详情关闭 PUT read 200 / 「全部标记为已读」PUT /api/notifications/read?deliveryMethod=WEB 200；末页最后一条已读自动翻页边缘未构造 | ✅（翻页边缘 3V） |
| 删除 | 单条：确认框 → DELETE /api/notification/{id} 200 → 行消失；勾选批量：inbox 页 selectedRowKeys+useBatchRun+批量进度在码（`inbox/index.tsx:131-213`），无头勾选不触发 onChange（O-2），批量语义由 sent 同构单测锚 | ✅（批量=同构锚） |

## 4. 4.2 顶栏铃铛（TA）

| §4 条目 | 驱动与证据 | 结论 |
|---|---|---|
| 铃铛+徽标 WS | 徽标 99+（≥100 显示 99+ 实证）；read-all 清零后 API 直发一条 → 徽标实时更新为「1」（WS NOTIFICATIONS 推送驱动渲染） | ✅ |
| popover | 标题「通知」；「全部标记为已读」（PUT read 200）；未读单条已读按钮（data-testid notification-mark-read，PUT read 200）；空态「暂无通知」（读全后店存清空实证）；「查看全部」→ `/notifications/inbox?unreadOnly=false` | ✅ |
| 最近 6 条 | 店存仅含本会话新推送时列 1 条；6 条上限由 notification-feed 分页锚（未凑满 6 条真机见证） | ✅（半） |
| 通知项渲染 | 按类型图标 + 标题/正文 + 相对时间（几秒前/16 分钟前）；动作按钮（LINK/DASHBOARD）/ALARM 着色/自定义图标未驱动（无带动作按钮通知），由 `notification-item.test.tsx` 钉住 | ✅（三项子句 3V） |
| 打开暂停订阅 | 实现按 §4.7 收敛为单订阅常开（不判缺陷） | ⏸ 3V（登记口径） |

## 5. 4.4 接收人（TA）

| §4 条目 | 驱动与证据 | 结论 |
|---|---|---|
| 列表 | createdTime/name/类型/描述列；行内/头部 新建+编辑+删除 在场；被引用删除走后端 400「Recipients group is being used in notification rule」原文 toast（错误路径实证），解引用后 DELETE 200 行消失 | ✅ |
| 对话框 | name 必填（「名称必填」校验实证）；类型 radio 三选 平台用户/Slack/Microsoft Teams | ✅ |
| PLATFORM_USERS 变体 | TENANT 侧恰 6 变体：所有用户/租户管理员/客户用户/用户列表/实体所有者的用户/受影响的用户；SYS 侧 SYSTEM_ADMINISTRATORS/AFFECTED_TENANT_ADMINISTRATORS 未真机枚举（代码收缩锚） | ✅（SYS 侧 3V） |
| SLACK 型 | Slack 会话类型 radio（公开频道/私有频道/私聊）+ 会话搜索补全（SLACK 未配置不真实调用，按口径「不必真连」）；MS TEAMS：使用旧版 API/新版 Workflows API 双选项（含「Office 365 连接器已停用」提示）+ Workflow URL + 频道名称 | ✅ |
| description+保存 | 描述 0/500 限长；POST /api/notification/target 200（内联新建与独立对话框同组件双证）；编辑改名落行 | ✅ |

## 6. 4.6 模板（TA）

| §4 条目 | 驱动与证据 | 结论 |
|---|---|---|
| 列表 | createdTime/notificationType/name + 行内 复制模板/删除；新建/编辑入口 | ✅ |
| Setup→Compose+锁类型 | 两步 stepper；编辑态 notificationType select disabled 实证；类型候选 TENANT 10 种（含 RULE_NODE 收缩保留、无 SYS 级）；投递方式开关组 WEB 默认开 | ✅ |
| compose 六方式 | WEB（主题 11/150、消息 17/250 计数器 + 图标）与 EMAIL（主题 0/250 + 「邮件正文为 HTML，请直接编辑 HTML 源码」textarea）真机；SMS/SLACK/MOBILE/TEAMS 块未逐一驱动（只渲已启用方式机制实证），六方式字段规格由 `template-fields.test.ts` 钉住（caps 150/250/50、250/320/150） | ✅（4 方式 3V） |
| 动作按钮配置 | enabled 开关 → 按钮文本（0/50）+ 链接；linkType 打开 URL 链接|打开仪表板 双选项；切 DASHBOARD → 搜索仪表板 + 「将通知中的实体设置到仪表板状态」勾选联动出现；link≤300 计数未单独看 | ✅ |
| 模板参数+查看文档 | 「输入字段支持模板化。」提示 + 「查看文档」按钮在场（帮助页跳转未驱动）；保存 POST /api/notification/template → 行登顶 + API 复核 | ✅ |
| EMAIL 等价说明 | HTML 源码 textarea + 明示「本 fork 暂无所见即所得编辑器」文案原样落地 | ✅ |

## 7. 缺陷与观察

- **D-1（缺陷·登记）发送向导从零开始死锁**：`sent/wizard.tsx:304-332` validateSetup() 在第 1 步即校验「已启用方式内容完整性」（:320），而 compose 字段在第 2 步（`hidden`，display:none）才可编辑 → 真实用户从零开始无法前进（gate error「请先补全所有已启用方式的消息内容。」真机复现）。ngx 锚点为逐步校验（setup 步只校验 setup 字段）。单测 `wizard.test.tsx`「walks scratch mode」以 fireEvent 填**隐形**字段绕过（测试注释自认 mounted-hidden），「gates Setup while incomplete」用例则把死锁固化为预期。本次走查以原生 setter 填隐形字段完成主链（属唯一可行路径，非正常用户路径）。建议：scratch 模式 composeIndex 前不校验内容完整性，或把 TemplateConfiguration 前置到 setup 步可见。
  **【已修（M15 wave-4，commit `1b2d3b38d6`）】**：validateSetup 删 compose 完整性检查（只校验本步字段 + atLeastOne）；send() 增加 ngx `allValid()` 对等的最终提交复查（失败不 POST 并跳回首个非法步）；测试删 fireEvent 掩盖写法、死锁用例反转为逐步语义 + 新增提交复查用例（vitest notifications 104 用例全绿）。**修复后真机复验（2026-09-07）**：scratch 从零 Setup（空 compose）→「下一步」直进编写步（修复前此处死锁）→ 填 WEB 主题/正文 → 审核 → 发送 → toast「通知请求已发送。」+ 新行登顶；附带反向验证提交复查（误开「计划稍后」且无时间 → 提交被拦跳回设置步报「时间为必填项」）——测试通知已删、数据回基线。
- **O-1（观察）TEAMS useOldApi 形态转译**：ngx 为开关，antd 以「使用旧版 API/使用新版 Workflows API」双选项+停用提示等价交付（语义一致，形态偏差登记）。
- **O-2（环境+测试缺口）antd Checkbox 无头失联**：隐藏标签页中原生 click() 只翻转 DOM checked，antd rowSelection onChange 不触发 → 批量删除在真机无法驱动（选择态含陈旧 id，DELETE 打旧 id 404）。sent/inbox/customer-edges 三处批量语义均靠单测锚。不判实现缺陷；建议后续在可见窗口环境复验一次。
- **O-3（观察）ruleNode 子区联动未证**：「跟踪规则节点事件」开关在场（源码 `trigger-forms.tsx:666-716` 应展开规则节点事件多选+仅失败开关），真机未见子区展开且无单测引用——4.5#5 该子句双向未证，如实注记。
- **O-4（观察）权限门跳转链接**：TA 下不可用方式（SLACK/移动应用）均挂「前往配置通知渠道」跳转（M14 settings tab 落地后的补链，§4.7 预案兑现）；「其余联系管理员」文案未在 TA 视角出现（按 4.7 登记统一，不判缺陷）。
- **O-5（观察）popover 数据源**：店存快照只含 WS 推送增量、无 REST 历史回填 → 读全后 popover 空态（ngx 行为为拉最近 6 条历史）。§4.7 已登记单订阅收敛口径，历史回填缺席未单独登记，此处补记。

## 8. 数据保全

DELETE 200 清单（API/页面双通道）：发送请求×5（向导 3 + API 2）、接收人×1（M15-W4-scratch target v2，先解规则引用再删）、规则×2（ALARM + (copy)）、模板×1（M15-W4-scratch template，页面删除）。残留核对：requests 仅剩 demo 原有 1 行、targets/rules/templates M15-W4 搜索全 0；inbox 通知记录按口径保留（批量样本 2 条带 M15-W4 标记留存）；SMTP/Slack 真实配置零触碰。

## 9. 覆盖统计

34 条：勾 32（其中 4.2#3、4.3#3、4.6#3 等带子句级 3V 注记）、维持未勾 2（4.2#4 单订阅收敛登记、4.3#2 徽标三态+失败明细）。spec §4 已无裸勾选框。
