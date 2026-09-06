/**
 * zh-CN strings for the OTA packages family (M13 wave-2, spec §5.5).
 * Key-for-key identical with en-US/ota.ts (check-locale gate).
 */
export default {
  'pages.ota.search': '搜索 OTA 包',
  'pages.ota.add': '新增 OTA 包',
  'pages.ota.refresh': '刷新',
  'pages.ota.total': '共 {count} 条',
  'pages.ota.empty': '暂无 OTA 包',
  'pages.ota.loadFailed': '加载 OTA 包失败',
  'pages.ota.selectedCount': '已选 {count} 条',
  'pages.ota.batchDelete': '删除所选',
  'pages.ota.batchResult': '{ok} 条成功，{fail} 条失败。',

  // list columns
  'pages.ota.createdTime': '创建时间',
  'pages.ota.title': '标题',
  'pages.ota.version': '版本',
  'pages.ota.tag': '版本标签',
  'pages.ota.type': '包类型',
  'pages.ota.directUrl': '直链 URL',
  'pages.ota.fileName': '文件名',
  'pages.ota.dataSize': '文件大小',
  'pages.ota.checksum': '校验和',
  'pages.ota.type.firmware': '固件',
  'pages.ota.type.software': '软件',

  // row / header actions
  'pages.ota.download': '下载 OTA 包',
  'pages.ota.delete': '删除 OTA 包',
  'pages.ota.cancel': '取消',
  'pages.ota.deleteOneTitle': '确定要删除 OTA 更新“{title}”吗？',
  'pages.ota.deleteOneText': '请注意，确认后该 OTA 更新将无法恢复。',
  'pages.ota.deleteManyTitle':
    '确定要删除 {count, plural, =1 {1 个 OTA 更新} other {# 个 OTA 更新}}吗？',
  'pages.ota.deleteManyText': '请注意，确认后所有选中的 OTA 更新都将被移除。',
  'pages.ota.toastDeleted': 'OTA 包已删除。',
  'pages.ota.toastSaved': 'OTA 包已保存。',

  // add dialog
  'pages.ota.titleRequired': '标题必填。',
  'pages.ota.titleMaxLength': '标题长度不能超过 256 个字符。',
  'pages.ota.versionRequired': '版本必填。',
  'pages.ota.versionMaxLength': '版本长度不能超过 256 个字符。',
  'pages.ota.tagMaxLength': '版本标签长度不能超过 256 个字符。',
  'pages.ota.tagHint': '自定义标签应与设备上报的包版本一致。',
  'pages.ota.profile': '设备配置档',
  'pages.ota.profileRequired': '设备配置档必填。',
  'pages.ota.profilePlaceholder': '搜索并选择设备配置档',
  'pages.ota.profileHint': '上传的 OTA 包将只对使用所选配置档的设备可见。',
  'pages.ota.sourceFile': '上传二进制文件',
  'pages.ota.sourceUrl': '使用外部 URL',
  'pages.ota.packageFile': '包文件',
  'pages.ota.dropFile': '拖拽包文件到此处，或点击选择要上传的文件。',
  'pages.ota.fileRequired': '包文件必填。',
  'pages.ota.autoChecksum': '自动生成校验和',
  'pages.ota.checksumAlgorithm': '校验和算法',
  'pages.ota.checksumHint': '校验和留空时将由系统自动生成',
  'pages.ota.checksumMaxLength': '校验和长度不能超过 1021 个字符。',
  'pages.ota.urlRequired': '直链 URL 必填',
  'pages.ota.warningAfterUpload':
    'OTA 包上传后，标题、版本、设备配置档和包类型将不可再修改。',

  // detail page
  'pages.ota.detailLoadFailed': '加载 OTA 包详情失败',
  'pages.ota.tabDetails': '详情',
  'pages.ota.tabVersionControl': '版本控制',
  'pages.ota.description': '描述',
  'pages.ota.contentType': '内容类型',
  'pages.ota.url': 'URL',
  'pages.ota.save': '保存',
  'pages.ota.copyId': '复制包 Id',
  'pages.ota.copyChecksum': '复制校验和',
  'pages.ota.copyDirectUrl': '复制直链 URL',
  'pages.ota.copiedId': '包 Id 已复制到剪贴板',
  'pages.ota.copiedChecksum': '包校验和已复制到剪贴板',
  'pages.ota.copiedDirectUrl': '包直链 URL 已复制到剪贴板',
  'pages.ota.copyFailed': '复制失败，请手动选择复制',
};
