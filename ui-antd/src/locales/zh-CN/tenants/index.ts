/**
 * zh-CN 租户域 keys（tenants 列表 / 详情 / 租户管理员作用域页）。措辞对齐
 * ui-ngx locale.constant-zh_CN.json 的 tenant.* / contact.* 段。
 * Must stay key-for-key identical with en-US/tenants/index.ts (check-locale).
 */
export default {
  // ---- 表单（dialog 与详情页头共用 TenantFormFields） ----
  'pages.tenants.form.title': '标题',
  'pages.tenants.form.titleRequired': '标题为必填项。',
  'pages.tenants.form.titleMaxLength': '标题不能超过 255 个字符。',
  'pages.tenants.form.tenantProfile': '租户配置',
  'pages.tenants.form.tenantProfileRequired': '租户配置为必填项。',
  'pages.tenants.form.tenantProfilePlaceholder': '选择租户配置',
  'pages.tenants.form.country': '国家',
  'pages.tenants.form.city': '城市',
  'pages.tenants.form.state': '州/省',
  'pages.tenants.form.zip': '邮政编码',
  'pages.tenants.form.address': '地址',
  'pages.tenants.form.address2': '地址 2',
  'pages.tenants.form.phone': '电话',
  'pages.tenants.form.email': 'Email',
  'pages.tenants.form.emailInvalid': 'Email 格式无效。',
  'pages.tenants.form.description': '描述',

  // ---- 新增 / 编辑 dialog ----
  'pages.tenants.dialog.createTitle': '添加租户',
  'pages.tenants.dialog.editTitle': '编辑租户',
  'pages.tenants.dialog.actionAdd': '添加',
  'pages.tenants.dialog.actionSave': '保存',

  // ---- 列表 ----
  'pages.tenants.list.search': '搜索租户',
  'pages.tenants.list.refresh': '刷新',
  'pages.tenants.list.add': '添加租户',
  'pages.tenants.list.total': '共 {count} 个',
  'pages.tenants.list.empty': '暂无租户',
  'pages.tenants.list.loadFailed': '加载租户列表失败',
  'pages.tenants.list.createdTime': '创建时间',
  'pages.tenants.list.title': '标题',
  'pages.tenants.list.tenantProfile': '租户配置',
  'pages.tenants.list.email': 'Email',
  'pages.tenants.list.country': '国家',
  'pages.tenants.list.city': '城市',
  'pages.tenants.list.actionEdit': '编辑',
  'pages.tenants.list.actionManageAdmins': '管理租户管理员',
  'pages.tenants.list.actionDelete': '删除租户',
  'pages.tenants.list.deleteTitle': '确定要删除租户“{title}”吗？',
  'pages.tenants.list.deleteText':
    '请注意，确认后租户及所有相关数据将无法恢复。',
  'pages.tenants.list.toastDeleted': '租户已删除。',
  'pages.tenants.list.toastSaved': '租户已保存。',

  // ---- 详情页 ----
  'pages.tenants.detail.loadFailed': '加载租户详情失败',
  'pages.tenants.detail.toastSaved': '租户已保存。',
  'pages.tenants.detail.edit': '编辑',
  'pages.tenants.detail.cancelEdit': '取消编辑',
  'pages.tenants.detail.tabAttributes': '属性',
  'pages.tenants.detail.tabLatestTelemetry': '最新遥测',
  'pages.tenants.detail.tabEvents': '事件',
  'pages.tenants.detail.tabRelations': '关联',
  'pages.tenants.detail.eventCreatedTime': '创建时间',
  'pages.tenants.detail.eventType': '类型',
  'pages.tenants.detail.eventMessage': '消息',
  'pages.tenants.detail.eventEmpty': '暂无事件',
  'pages.tenants.detail.eventLoadFailed': '加载事件失败',

  // ---- 租户管理员作用域页（/tenants/:id/users） ----
  'pages.tenants.users.title': '{title}：租户管理员',
  'pages.tenants.users.search': '搜索用户',
  'pages.tenants.users.add': '添加用户',
  'pages.tenants.users.loginAs': '以租户管理员身份登录',
};
