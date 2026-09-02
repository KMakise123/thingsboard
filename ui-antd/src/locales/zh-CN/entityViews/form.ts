/**
 * zh-CN entity-view form keys (shared by the create/edit dialog and the
 * detail-page header form). Wording follows ui-ngx locale.constant-zh_CN.json
 * (entity-view section). Must stay key-for-key identical with
 * en-US/entityViews/form.ts (check-locale).
 */
export default {
  'pages.entityViews.form.name': '名称',
  'pages.entityViews.form.nameRequired': '名称为必填项。',
  'pages.entityViews.form.nameTooLong': '名称长度不能超过 255 个字符。',
  'pages.entityViews.form.type': '实体视图类型',
  'pages.entityViews.form.typeRequired': '实体视图类型为必填项。',
  'pages.entityViews.form.typePlaceholder': '输入或选择实体视图类型',
  'pages.entityViews.form.targetEntityType': '目标实体类型',
  'pages.entityViews.form.targetEntity': '目标实体',
  'pages.entityViews.form.targetEntityRequired': '目标实体为必填项。',
  'pages.entityViews.form.targetEntityPlaceholder': '搜索并选择设备或资产',
  'pages.entityViews.form.deviceOption': '设备',
  'pages.entityViews.form.assetOption': '资产',
  'pages.entityViews.form.attributesPropagation': '属性传播',
  'pages.entityViews.form.attributesPropagationHint':
    '实体视图将在每次保存或更新此实体视图时自动从目标实体复制指定的属性。出于性能考虑，每次属性更改时不会自动将目标实体属性传播到实体视图。您可以通过在规则链中配置“copy to view”规则节点并将“Post attributes”和“Attributes Updated”消息链接到新规则节点来启用自动传播。',
  'pages.entityViews.form.timeseriesData': '时间序列数据',
  'pages.entityViews.form.timeseriesDataHint':
    '配置实体视图可访问的目标实体时间序列数据键。此时间序列数据为只读。',
  'pages.entityViews.form.clientAttributes': '客户端属性',
  'pages.entityViews.form.sharedAttributes': '共享属性',
  'pages.entityViews.form.serverAttributes': '服务端属性',
  'pages.entityViews.form.timeseries': '时间序列',
  'pages.entityViews.form.startTs': '开始时间',
  'pages.entityViews.form.endTs': '结束时间',
  'pages.entityViews.form.timeRangeConflict': '开始时间不能晚于结束时间。',
  'pages.entityViews.form.keysNoTarget': '请先选择目标实体。',
  'pages.entityViews.form.description': '描述',
};
