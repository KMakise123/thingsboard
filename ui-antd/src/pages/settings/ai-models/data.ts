/**
 * AI-model page helpers (M14 wave-3, R27).
 *
 * Everything render/validation related is driven by the wave-1 whitelist
 * constant AI_MODEL_PROVIDER_MAP (ported from ui-ngx AiModelMap): the
 * provider-config fields, the sampling fields and the model candidates per
 * provider. Two special cases (contract #24 / ngx ai-model-dialog):
 *   - OPENAI baseUrl: blank falls back to the official API base; a
 *     NON-official base makes the API key OPTIONAL;
 *   - OLLAMA carries an auth block (NONE / BASIC username+password / TOKEN).
 * Model candidates are a FRONTEND static list — there is no models API.
 */
import type {
  AiChatModelConfig,
  AiModel,
  AiModelField,
  AiProvider,
  AiProviderField,
  OllamaAuthType,
  TbChatRequest,
} from '@/types/tb/ai-model';
import { AI_MODEL_PROVIDER_MAP } from '@/types/tb/ai-model';

export const OPENAI_OFFICIAL_BASE_URL = 'https://api.openai.com/v1';

/** Non-official OpenAI base URLs (self-hosted/proxy) make the key optional. */
export function isOpenAiApiKeyOptional(baseUrl?: string): boolean {
  return (baseUrl ?? OPENAI_OFFICIAL_BASE_URL) !== OPENAI_OFFICIAL_BASE_URL;
}

export const AI_PROVIDERS: Array<AiProvider> = [
  'OPENAI',
  'AZURE_OPENAI',
  'GOOGLE_AI_GEMINI',
  'GOOGLE_VERTEX_AI_GEMINI',
  'MISTRAL_AI',
  'ANTHROPIC',
  'AMAZON_BEDROCK',
  'GITHUB_MODELS',
  'OLLAMA',
];

export const AI_PROVIDER_LABEL_KEYS: Record<AiProvider, string> = {
  OPENAI: 'pages.aiModels.providers.openai',
  AZURE_OPENAI: 'pages.aiModels.providers.azureOpenai',
  GOOGLE_AI_GEMINI: 'pages.aiModels.providers.googleAiGemini',
  GOOGLE_VERTEX_AI_GEMINI: 'pages.aiModels.providers.googleVertexAiGemini',
  MISTRAL_AI: 'pages.aiModels.providers.mistralAi',
  ANTHROPIC: 'pages.aiModels.providers.anthropic',
  AMAZON_BEDROCK: 'pages.aiModels.providers.amazonBedrock',
  GITHUB_MODELS: 'pages.aiModels.providers.githubModels',
  OLLAMA: 'pages.aiModels.providers.ollama',
};

export const AI_PROVIDER_FIELD_LABEL_KEYS: Record<AiProviderField, string> = {
  apiKey: 'pages.aiModels.fields.apiKey',
  personalAccessToken: 'pages.aiModels.fields.personalAccessToken',
  projectId: 'pages.aiModels.fields.projectId',
  location: 'pages.aiModels.fields.location',
  serviceAccountKey: 'pages.aiModels.fields.serviceAccountKey',
  fileName: 'pages.aiModels.fields.fileName',
  endpoint: 'pages.aiModels.fields.endpoint',
  serviceVersion: 'pages.aiModels.fields.serviceVersion',
  region: 'pages.aiModels.fields.region',
  accessKeyId: 'pages.aiModels.fields.accessKeyId',
  secretAccessKey: 'pages.aiModels.fields.secretAccessKey',
  baseUrl: 'pages.aiModels.fields.baseUrl',
};

export const AI_MODEL_FIELD_LABEL_KEYS: Record<AiModelField, string> = {
  temperature: 'pages.aiModels.fields.temperature',
  topP: 'pages.aiModels.fields.topP',
  topK: 'pages.aiModels.fields.topK',
  frequencyPenalty: 'pages.aiModels.fields.frequencyPenalty',
  presencePenalty: 'pages.aiModels.fields.presencePenalty',
  maxOutputTokens: 'pages.aiModels.fields.maxOutputTokens',
  contextLength: 'pages.aiModels.fields.contextLength',
};

export const AI_MODEL_FIELD_HINT_KEYS: Record<AiModelField, string> = {
  temperature: 'pages.aiModels.hints.temperature',
  topP: 'pages.aiModels.hints.topP',
  topK: 'pages.aiModels.hints.topK',
  frequencyPenalty: 'pages.aiModels.hints.frequencyPenalty',
  presencePenalty: 'pages.aiModels.hints.presencePenalty',
  maxOutputTokens: 'pages.aiModels.hints.maxOutputTokens',
  contextLength: 'pages.aiModels.hints.contextLength',
};

/** Sampling-field numeric constraints (ngx Validators matrix). */
export const AI_MODEL_FIELD_CONSTRAINTS: Record<
  AiModelField,
  { min?: number; max?: number }
> = {
  temperature: { min: 0 },
  topP: { min: 0.1, max: 1 },
  topK: { min: 0 },
  frequencyPenalty: {},
  presencePenalty: {},
  maxOutputTokens: {},
  contextLength: {},
};

/** Flat dialog form shape (providerConfig + auth block flattened). */
export interface AiModelFormValues {
  name: string;
  provider: AiProvider;
  modelId: string;
  apiKey?: string;
  personalAccessToken?: string;
  projectId?: string;
  location?: string;
  serviceAccountKey?: string;
  fileName?: string;
  endpoint?: string;
  serviceVersion?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  baseUrl?: string;
  authType: OllamaAuthType;
  authUsername?: string;
  authPassword?: string;
  authToken?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  maxOutputTokens?: number;
  contextLength?: number;
}

const PROVIDER_FIELD_TO_FORM_KEY: Record<
  AiProviderField,
  keyof AiModelFormValues
> = {
  apiKey: 'apiKey',
  personalAccessToken: 'personalAccessToken',
  projectId: 'projectId',
  location: 'location',
  serviceAccountKey: 'serviceAccountKey',
  fileName: 'fileName',
  endpoint: 'endpoint',
  serviceVersion: 'serviceVersion',
  region: 'region',
  accessKeyId: 'accessKeyId',
  secretAccessKey: 'secretAccessKey',
  baseUrl: 'baseUrl',
};

/** Stored AiModel → flat dialog values (defaults per ngx dialog). */
export function toAiModelFormValue(model?: AiModel | null): AiModelFormValues {
  const config = model?.configuration;
  const provider = config?.provider ?? 'OPENAI';
  const values: AiModelFormValues = {
    name: model?.name ?? '',
    provider,
    modelId: config?.modelId ?? '',
    authType: 'NONE',
  };
  if (config) {
    const providerConfigRecord = (config.providerConfig ?? {}) as Record<
      string,
      unknown
    >;
    for (const field of AI_MODEL_PROVIDER_MAP[provider].providerFieldsList) {
      const key = PROVIDER_FIELD_TO_FORM_KEY[field];
      (values as unknown as Record<string, unknown>)[key] =
        providerConfigRecord[field];
    }
    if (provider === 'OLLAMA') {
      const auth = (
        config.providerConfig as {
          auth?: {
            type: OllamaAuthType;
            username?: string;
            password?: string;
            token?: string;
          };
        }
      ).auth;
      if (auth) {
        values.authType = auth.type;
        if (auth.type === 'BASIC') {
          values.authUsername = auth.username;
          values.authPassword = auth.password;
        }
        if (auth.type === 'TOKEN') {
          values.authToken = auth.token;
        }
      }
    }
    const configRecord = config as unknown as Record<string, unknown>;
    for (const field of AI_MODEL_PROVIDER_MAP[provider].modelFieldsList) {
      const value = configRecord[field];
      if (value !== undefined) {
        (values as unknown as Record<string, unknown>)[field] = value;
      }
    }
  }
  // OPENAI shows the official base unless a custom one is stored.
  if (provider === 'OPENAI' && !values.baseUrl) {
    values.baseUrl = OPENAI_OFFICIAL_BASE_URL;
  }
  return values;
}

/** OLLAMA auth block from the flat form values. */
function toOllamaAuth(values: AiModelFormValues): {
  type: OllamaAuthType;
  username?: string;
  password?: string;
  token?: string;
} {
  if (values.authType === 'BASIC') {
    return {
      type: 'BASIC',
      username: values.authUsername ?? '',
      password: values.authPassword ?? '',
    };
  }
  if (values.authType === 'TOKEN') {
    return { type: 'TOKEN', token: values.authToken ?? '' };
  }
  return { type: 'NONE' };
}

/**
 * Flat dialog values → wire AiModel. Only the ACTIVE provider's whitelist
 * fields travel (switching providers never leaks stray keys) NESTED under
 * `configuration.providerConfig` (the wire shape — ngx form nests them
 * identically); sampling fields ride the configuration root; the model
 * `version` snapshot field survives on update.
 */
export function toAiModelPayload(
  values: AiModelFormValues,
  snapshot?: AiModel | null,
): AiModel {
  const whitelist = AI_MODEL_PROVIDER_MAP[values.provider];
  const providerConfig: Record<string, unknown> = {};
  for (const field of whitelist.providerFieldsList) {
    const key = PROVIDER_FIELD_TO_FORM_KEY[field];
    const value = values[key];
    if (typeof value === 'string' && value.length > 0) {
      providerConfig[field] = value;
    }
  }
  if (values.provider === 'OPENAI' && !providerConfig.baseUrl) {
    providerConfig.baseUrl = OPENAI_OFFICIAL_BASE_URL;
  }
  if (values.provider === 'OLLAMA') {
    providerConfig.auth = toOllamaAuth(values);
  }

  const configuration = {
    provider: values.provider,
    modelId: values.modelId,
    providerConfig,
  } as unknown as AiChatModelConfig;
  for (const field of whitelist.modelFieldsList) {
    const value = (values as unknown as Record<string, unknown>)[field];
    if (typeof value === 'number') {
      (configuration as unknown as Record<string, unknown>)[field] = value;
    }
  }

  const payload = {
    ...(snapshot ?? {}),
    name: values.name.trim(),
    configuration,
  };
  return payload as AiModel;
}

/**
 * Connectivity probe request (ngx check-connectivity-dialog parity): the
 * hardcoded single-turn probe rides the UNSAVED form configuration with
 * maxRetries 0 + a 20s timeout. The answer is HTTP 200 ALWAYS — SUCCESS
 * or a FAILURE envelope with errorDetails (contract #24).
 */
export const CONNECTIVITY_PROBE_MESSAGE = 'What is the capital of Ukraine?';

export function buildConnectivityRequest(
  configuration: AiChatModelConfig,
): TbChatRequest {
  return {
    userMessage: {
      contents: [{ contentType: 'TEXT', text: CONNECTIVITY_PROBE_MESSAGE }],
    },
    chatModelConfig: {
      ...configuration,
      maxRetries: 0,
      timeoutSeconds: 20,
    },
  };
}

/**
 * ngx parses errorDetails as pretty JSON when possible (the provider
 * SDK error blobs), falling back to the raw string.
 */
export function parseConnectivityError(errorDetails?: string): string {
  if (!errorDetails) {
    return '';
  }
  try {
    return JSON.stringify(JSON.parse(errorDetails), null, 2);
  } catch {
    return errorDetails;
  }
}
