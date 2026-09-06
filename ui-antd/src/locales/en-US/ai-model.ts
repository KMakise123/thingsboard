/**
 * AI-models domain copy (pages.aiModels.*) — M14 wave-3 (R27), ported from
 * ui-ngx locale ai-models.*.
 */
export default {
  'pages.aiModels.addModel': 'Add model',
  'pages.aiModels.editModel': 'Edit AI model',
  'pages.aiModels.createdTime': 'Created time',
  'pages.aiModels.search': 'Search models',
  'pages.aiModels.refresh': 'Refresh',
  'pages.aiModels.delete': 'Delete',
  'pages.aiModels.deleteSelected': 'Delete selected',
  'pages.aiModels.selectedCount': '{count} selected',
  'pages.aiModels.deleteOneTitle':
    "Are you sure you want to delete the model '{name}'?",
  'pages.aiModels.deleteOneText':
    'Be careful, after the confirmation the model and all related data will become unrecoverable.',
  'pages.aiModels.deleteManyTitle':
    'Are you sure you want to delete {count, plural, =1 {1 model} other {# models}}?',
  'pages.aiModels.deleteManyText':
    'Be careful, after the confirmation all selected models will be removed and all related data will become unrecoverable.',
  'pages.aiModels.toastSaved': 'AI model saved.',
  'pages.aiModels.toastDeleted': 'AI model deleted.',
  'pages.aiModels.toastAlreadyDeleted': 'The model no longer exists.',
  'pages.aiModels.batchResult': '{ok} succeeded, {fail} failed.',
  'pages.aiModels.total': '{count} total',
  'pages.aiModels.empty': 'No models found.',
  'pages.aiModels.loadFailed': 'Failed to load models',

  'pages.aiModels.providers.openai': 'OpenAI',
  'pages.aiModels.providers.azureOpenai': 'Azure OpenAI',
  'pages.aiModels.providers.googleAiGemini': 'Google Gemini (Gemini API)',
  'pages.aiModels.providers.googleVertexAiGemini':
    'Google Gemini (Agent Platform - Vertex AI)',
  'pages.aiModels.providers.mistralAi': 'Mistral AI',
  'pages.aiModels.providers.anthropic': 'Anthropic',
  'pages.aiModels.providers.amazonBedrock': 'Amazon Bedrock',
  'pages.aiModels.providers.githubModels': 'GitHub Models',
  'pages.aiModels.providers.ollama': 'Ollama',

  'pages.aiModels.authentication': 'Authentication',
  'pages.aiModels.authType.none': 'None',
  'pages.aiModels.authType.basic': 'Basic',
  'pages.aiModels.authType.token': 'Token',

  'pages.aiModels.fields.name': 'Name',
  'pages.aiModels.fields.nameRequired': 'Name is required.',
  'pages.aiModels.fields.aiProvider': 'AI provider',
  'pages.aiModels.fields.aiProviderRequired': 'AI provider is required.',
  'pages.aiModels.fields.providerColumn': 'Provider',
  'pages.aiModels.fields.modelId': 'Model ID',
  'pages.aiModels.fields.modelIdColumn': 'Model ID',
  'pages.aiModels.fields.modelIdRequired': 'Model ID is required.',
  'pages.aiModels.fields.modelIdFreeInput':
    'This provider has no static candidate list — type the model ID.',
  'pages.aiModels.fields.apiKey': 'API key',
  'pages.aiModels.fields.apiKeyRequired': 'API key is required.',
  'pages.aiModels.fields.apiKeyOptionalHint':
    'API key is optional when using a non-official base URL.',
  'pages.aiModels.fields.baseUrl': 'Base URL',
  'pages.aiModels.fields.baseUrlRequired': 'Base URL is required.',
  'pages.aiModels.fields.personalAccessToken': 'Personal access token',
  'pages.aiModels.fields.personalAccessTokenRequired':
    'Personal access token is required.',
  'pages.aiModels.fields.projectId': 'Project ID',
  'pages.aiModels.fields.projectIdRequired': 'Project ID is required.',
  'pages.aiModels.fields.location': 'Location',
  'pages.aiModels.fields.locationRequired': 'Location is required.',
  'pages.aiModels.fields.serviceAccountKey': 'Service account key file',
  'pages.aiModels.fields.serviceAccountKeyRequired':
    'Service account key file is required.',
  'pages.aiModels.fields.fileName': 'File name',
  'pages.aiModels.fields.fileNameRequired': 'File name is required.',
  'pages.aiModels.fields.endpoint': 'Endpoint',
  'pages.aiModels.fields.endpointRequired': 'Endpoint is required.',
  'pages.aiModels.fields.serviceVersion': 'Service version',
  'pages.aiModels.fields.region': 'Region',
  'pages.aiModels.fields.regionRequired': 'Region is required.',
  'pages.aiModels.fields.accessKeyId': 'Access key ID',
  'pages.aiModels.fields.accessKeyIdRequired': 'Access key ID is required.',
  'pages.aiModels.fields.secretAccessKey': 'Secret access key',
  'pages.aiModels.fields.secretAccessKeyRequired':
    'Secret access key is required.',
  'pages.aiModels.fields.username': 'Username',
  'pages.aiModels.fields.usernameRequired': 'Username is required.',
  'pages.aiModels.fields.password': 'Password',
  'pages.aiModels.fields.passwordRequired': 'Password is required.',
  'pages.aiModels.fields.token': 'Token',
  'pages.aiModels.fields.tokenRequired': 'Token is required.',

  'pages.aiModels.fields.temperature': 'Temperature',
  'pages.aiModels.hints.temperature':
    "Adjusts the level of randomness in the model's output. Higher values increase randomness, while lower values decrease it.",
  'pages.aiModels.fields.topP': 'Top P',
  'pages.aiModels.hints.topP':
    'Creates a pool of the most probable tokens for the model to choose from. Higher values create a larger and more diverse pool, while lower values create a smaller one.',
  'pages.aiModels.fields.topK': 'Top K',
  'pages.aiModels.hints.topK':
    'Restricts the model\'s choices to a fixed set of the "K" most likely tokens.',
  'pages.aiModels.fields.frequencyPenalty': 'Frequency penalty',
  'pages.aiModels.hints.frequencyPenalty':
    "Applies a penalty to a token's likelihood that increases based on its frequency in the text.",
  'pages.aiModels.fields.presencePenalty': 'Presence penalty',
  'pages.aiModels.hints.presencePenalty':
    'Applies a fixed penalty to the likelihood of a token if it has already appeared in the text.',
  'pages.aiModels.fields.maxOutputTokens': 'Maximum output tokens',
  'pages.aiModels.hints.maxOutputTokens':
    'Sets the maximum number of tokens that the model can generate in a single response.',
  'pages.aiModels.fields.contextLength': 'Context length',
  'pages.aiModels.hints.contextLength':
    "Defines the size of the context window in tokens. This value sets the total memory limit for the model, including both the user's input and the generated response.",
  'pages.aiModels.fieldMin': 'Must be greater than or equal to the minimum.',
  'pages.aiModels.fieldMax': 'Must be less than or equal to the maximum.',

  'pages.aiModels.checkConnectivity': 'Check connectivity',
  'pages.aiModels.checkConnectivitySuccess': 'Test request was successful',
  'pages.aiModels.checkConnectivityFailed': 'Test request failed',
  'pages.aiModels.checkConnectivityNoDetails':
    'The provider returned no error details.',
};
