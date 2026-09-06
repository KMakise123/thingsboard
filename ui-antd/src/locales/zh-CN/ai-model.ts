/**
 * AI-models domain copy (pages.aiModels.*) — M14 wave-3 (R27)，与 en-US
 * key 全等。
 */
export default {
  'pages.aiModels.addModel': '新增模型',
  'pages.aiModels.editModel': '编辑 AI 模型',
  'pages.aiModels.createdTime': '创建时间',
  'pages.aiModels.search': '搜索模型',
  'pages.aiModels.refresh': '刷新',
  'pages.aiModels.delete': '删除',
  'pages.aiModels.deleteSelected': '删除所选',
  'pages.aiModels.selectedCount': '已选 {count} 项',
  'pages.aiModels.deleteOneTitle': '确认删除模型“{name}”吗？',
  'pages.aiModels.deleteOneText':
    '注意：确认后模型及其所有相关数据将不可恢复。',
  'pages.aiModels.deleteManyTitle':
    '确认删除 {count, plural, =1 {1 个模型} other {# 个模型}} 吗？',
  'pages.aiModels.deleteManyText':
    '注意：确认后所有选中的模型都将被移除，相关数据不可恢复。',
  'pages.aiModels.toastSaved': 'AI 模型已保存。',
  'pages.aiModels.toastDeleted': 'AI 模型已删除。',
  'pages.aiModels.toastAlreadyDeleted': '该模型已不存在。',
  'pages.aiModels.batchResult': '{ok} 个成功，{fail} 个失败。',
  'pages.aiModels.total': '共 {count} 条',
  'pages.aiModels.empty': '暂无模型。',
  'pages.aiModels.loadFailed': '加载模型失败',

  'pages.aiModels.providers.openai': 'OpenAI',
  'pages.aiModels.providers.azureOpenai': 'Azure OpenAI',
  'pages.aiModels.providers.googleAiGemini': 'Google Gemini（Gemini API）',
  'pages.aiModels.providers.googleVertexAiGemini':
    'Google Gemini（Agent Platform - Vertex AI）',
  'pages.aiModels.providers.mistralAi': 'Mistral AI',
  'pages.aiModels.providers.anthropic': 'Anthropic',
  'pages.aiModels.providers.amazonBedrock': 'Amazon Bedrock',
  'pages.aiModels.providers.githubModels': 'GitHub Models',
  'pages.aiModels.providers.ollama': 'Ollama',

  'pages.aiModels.authentication': '认证方式',
  'pages.aiModels.authType.none': '无',
  'pages.aiModels.authType.basic': 'Basic',
  'pages.aiModels.authType.token': 'Token',

  'pages.aiModels.fields.name': '名称',
  'pages.aiModels.fields.nameRequired': '名称为必填项。',
  'pages.aiModels.fields.aiProvider': 'AI 服务商',
  'pages.aiModels.fields.aiProviderRequired': 'AI 服务商为必填项。',
  'pages.aiModels.fields.providerColumn': '服务商',
  'pages.aiModels.fields.modelId': '模型 ID',
  'pages.aiModels.fields.modelIdColumn': '模型 ID',
  'pages.aiModels.fields.modelIdRequired': '模型 ID 为必填项。',
  'pages.aiModels.fields.modelIdFreeInput':
    '该服务商没有静态候选清单——请直接输入模型 ID。',
  'pages.aiModels.fields.apiKey': 'API 密钥',
  'pages.aiModels.fields.apiKeyRequired': 'API 密钥为必填项。',
  'pages.aiModels.fields.apiKeyOptionalHint':
    '使用非官方 Base URL 时 API 密钥可选。',
  'pages.aiModels.fields.baseUrl': 'Base URL',
  'pages.aiModels.fields.baseUrlRequired': 'Base URL 为必填项。',
  'pages.aiModels.fields.personalAccessToken': '个人访问令牌',
  'pages.aiModels.fields.personalAccessTokenRequired': '个人访问令牌为必填项。',
  'pages.aiModels.fields.projectId': '项目 ID',
  'pages.aiModels.fields.projectIdRequired': '项目 ID 为必填项。',
  'pages.aiModels.fields.location': '位置',
  'pages.aiModels.fields.locationRequired': '位置为必填项。',
  'pages.aiModels.fields.serviceAccountKey': '服务账号密钥文件',
  'pages.aiModels.fields.serviceAccountKeyRequired':
    '服务账号密钥文件为必填项。',
  'pages.aiModels.fields.fileName': '文件名',
  'pages.aiModels.fields.fileNameRequired': '文件名为必填项。',
  'pages.aiModels.fields.endpoint': '终结点',
  'pages.aiModels.fields.endpointRequired': '终结点为必填项。',
  'pages.aiModels.fields.serviceVersion': '服务版本',
  'pages.aiModels.fields.region': '区域',
  'pages.aiModels.fields.regionRequired': '区域为必填项。',
  'pages.aiModels.fields.accessKeyId': 'Access Key ID',
  'pages.aiModels.fields.accessKeyIdRequired': 'Access Key ID 为必填项。',
  'pages.aiModels.fields.secretAccessKey': 'Secret Access Key',
  'pages.aiModels.fields.secretAccessKeyRequired':
    'Secret Access Key 为必填项。',
  'pages.aiModels.fields.username': '用户名',
  'pages.aiModels.fields.usernameRequired': '用户名为必填项。',
  'pages.aiModels.fields.password': '密码',
  'pages.aiModels.fields.passwordRequired': '密码为必填项。',
  'pages.aiModels.fields.token': '令牌',
  'pages.aiModels.fields.tokenRequired': '令牌为必填项。',

  'pages.aiModels.fields.temperature': '温度（Temperature）',
  'pages.aiModels.hints.temperature':
    '调节模型输出的随机程度。值越高越随机，值越低越确定。',
  'pages.aiModels.fields.topP': 'Top P',
  'pages.aiModels.hints.topP':
    '为模型构建最可能 token 的候选池。值越高池子越大越多样，值越低池子越小。',
  'pages.aiModels.fields.topK': 'Top K',
  'pages.aiModels.hints.topK': '将模型的选择限制在最可能的“K”个 token 之内。',
  'pages.aiModels.fields.frequencyPenalty': '频率惩罚',
  'pages.aiModels.hints.frequencyPenalty':
    '按 token 在文本中出现的频率对其施加递增的惩罚。',
  'pages.aiModels.fields.presencePenalty': '存在惩罚',
  'pages.aiModels.hints.presencePenalty': '对已经出现过的 token 施加固定惩罚。',
  'pages.aiModels.fields.maxOutputTokens': '最大输出 token 数',
  'pages.aiModels.hints.maxOutputTokens':
    '设置模型单次响应可生成的最大 token 数。',
  'pages.aiModels.fields.contextLength': '上下文长度',
  'pages.aiModels.hints.contextLength':
    '定义上下文窗口的大小（以 token 计）。该值设定模型的总内存上限，包括用户输入和生成的响应。',
  'pages.aiModels.fieldMin': '不能小于最小值。',
  'pages.aiModels.fieldMax': '不能大于最大值。',

  'pages.aiModels.checkConnectivity': '检查连通性',
  'pages.aiModels.checkConnectivitySuccess': '测试请求成功',
  'pages.aiModels.checkConnectivityFailed': '测试请求失败',
  'pages.aiModels.checkConnectivityNoDetails': '服务商未返回错误详情。',
};
