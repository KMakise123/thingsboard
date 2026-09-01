/**
 * zh-CN 用户管理域 keys（users 列表页 + 用户新增/编辑 dialog + 激活链接
 * dialog）。措辞对齐 ui-ngx locale.constant-zh_CN.json 的 user.* 段。
 * Must stay key-for-key identical with en-US/users/index.ts (check-locale).
 */
export default {
  // ---- 列表：表格与工具条 ----
  'pages.users.list.title': '用户',
  'pages.users.list.search': '搜索用户',
  'pages.users.list.refresh': '刷新',
  'pages.users.list.total': '共 {count} 个',
  'pages.users.list.empty': '暂无用户',
  'pages.users.list.loadFailed': '加载用户列表失败',
  'pages.users.list.createdTime': '创建时间',
  'pages.users.list.firstName': '名',
  'pages.users.list.lastName': '姓',
  'pages.users.list.email': 'Email',
  'pages.users.list.authority': '权限',
  'pages.users.list.authorityTenantAdmin': '租户管理员',
  'pages.users.list.authorityCustomerUser': '客户用户',
  'pages.users.list.add': '添加用户',

  // ---- 行操作（六操作：编辑 / 删除 / 展示激活链接 / 重发激活 / 启停账户） ----
  'pages.users.list.actionEdit': '编辑',
  'pages.users.list.actionDelete': '删除',
  'pages.users.list.actionDisplayActivationLink': '显示激活链接',
  'pages.users.list.actionResendActivation': '重新发送激活',
  'pages.users.list.actionEnableAccount': '启用用户账户',
  'pages.users.list.actionDisableAccount': '禁用用户账户',
  'pages.users.list.actionLoadingAccountState': '正在加载账户状态…',
  'pages.users.list.moreActions': '更多操作',

  // ---- 删除确认与 toast ----
  'pages.users.list.deleteTitle': '确定要删除用户“{email}”吗？',
  'pages.users.list.deleteText': '请注意，确认后用户及所有相关数据将无法恢复。',
  'pages.users.list.resendTitle': '确定要向“{email}”重新发送激活邮件吗？',
  'pages.users.list.resendText': '激活邮件中包含用户创建密码所需的激活链接。',
  'pages.users.list.toastDeleted': '用户已删除。',
  'pages.users.list.toastCreated': '用户已创建。',
  'pages.users.list.toastSaved': '用户已保存。',
  'pages.users.list.toastActivationEmailSent': '激活 Email 已成功发送！',
  'pages.users.list.toastAccountEnabled': '用户账户已成功启用！',
  'pages.users.list.toastAccountDisabled': '用户账户已成功禁用！',

  // ---- 用户新增 / 编辑 dialog ----
  'pages.users.userDialog.createTitle': '添加用户',
  'pages.users.userDialog.editTitle': '编辑用户',
  'pages.users.userDialog.email': 'Email',
  'pages.users.userDialog.emailRequired': 'Email 为必填项。',
  'pages.users.userDialog.emailInvalid': 'Email 格式无效。',
  'pages.users.userDialog.firstName': '名',
  'pages.users.userDialog.lastName': '姓',
  'pages.users.userDialog.description': '描述',
  'pages.users.userDialog.authority': '权限',
  'pages.users.userDialog.authorityRequired': '权限为必填项。',
  'pages.users.userDialog.authorityTenantAdmin': '租户管理员',
  'pages.users.userDialog.authorityCustomerUser': '客户用户',
  'pages.users.userDialog.customer': '所属客户',
  'pages.users.userDialog.customerPlaceholder': '搜索并选择客户',
  'pages.users.userDialog.customerRequired': '客户用户必须选择所属客户。',
  'pages.users.userDialog.editScopeHint': '权限与所属客户在创建后不可更改。',
  'pages.users.userDialog.activationMethod': '激活方式',
  'pages.users.userDialog.activationDisplay': '显示激活链接',
  'pages.users.userDialog.activationSendMail': '发送激活邮件',
  'pages.users.userDialog.actionCancel': '取消',
  'pages.users.userDialog.actionAdd': '添加',
  'pages.users.userDialog.actionSave': '保存',

  // ---- 激活链接 dialog（新增后处置 + 行操作「重置密码」共用） ----
  'pages.users.activation.title': '用户激活链接',
  'pages.users.activation.hint':
    '要激活用户，请使用以下激活链接（{ttl}后过期）：',
  'pages.users.activation.copy': '复制激活链接',
  'pages.users.activation.copied': '用户激活链接已复制到剪贴板',
  'pages.users.activation.copyFailed': '复制失败，请手动选择复制',
  'pages.users.activation.loadFailed': '获取激活链接失败',
  'pages.users.activation.ok': '确定',
  'pages.users.activation.ttlDays': '{value} 天',
  'pages.users.activation.ttlHours': '{value} 小时',
  'pages.users.activation.ttlMinutes': '{value} 分钟',
  'pages.users.activation.ttlSeconds': '{value} 秒',
};
