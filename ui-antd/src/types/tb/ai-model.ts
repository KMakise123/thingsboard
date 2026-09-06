/**
 * AI-model wire types (handwritten, authoritative) — M14 wave-1.
 *
 * Modeled against the openapi snapshot (AiModel + the nine per-provider
 * ChatModelConfig/ProviderConfig schemas, cross-checked with the backend
 * AiModelController contract, 2026-09-06). `AI_MODEL_PROVIDER_MAP` is the
 * render/validation whitelist ported verbatim from ui-ngx
 * shared/models/ai-model.models.ts (AiModelMap): it decides which provider
 * fields, sampling fields and model candidates each provider exposes.
 * Model candidates are a FRONTEND static list — there is no models API.
 */

import type {
  BaseData,
  EntityType,
  HasTenantIdAndCustomer,
} from './entity';

export type AiProvider =
  | 'OPENAI'
  | 'AZURE_OPENAI'
  | 'GOOGLE_AI_GEMINI'
  | 'GOOGLE_VERTEX_AI_GEMINI'
  | 'MISTRAL_AI'
  | 'ANTHROPIC'
  | 'AMAZON_BEDROCK'
  | 'GITHUB_MODELS'
  | 'OLLAMA';

/** Keys that may appear in a provider config (ui-ngx ProviderFieldsAllList). */
export type AiProviderField =
  | 'apiKey'
  | 'personalAccessToken'
  | 'projectId'
  | 'location'
  | 'serviceAccountKey'
  | 'fileName'
  | 'endpoint'
  | 'serviceVersion'
  | 'region'
  | 'accessKeyId'
  | 'secretAccessKey'
  | 'baseUrl';

/** Sampling/model-behavior fields (ui-ngx ModelFieldsAllList). */
export type AiModelField =
  | 'temperature'
  | 'topP'
  | 'topK'
  | 'frequencyPenalty'
  | 'presencePenalty'
  | 'maxOutputTokens'
  | 'contextLength';

export interface AiProviderMapEntry {
  /** Static model-id candidates; empty = free-input in the UI. */
  modelList: string[];
  providerFieldsList: AiProviderField[];
  modelFieldsList: AiModelField[];
}

/**
 * Per-provider whitelist driving the M14 ai-models form (ported from ui-ngx
 * AiModelMap verbatim, 2026-09-06). OPENAI carries the `baseUrl` special
 * case (non-official base URLs make the API key optional); OLLAMA's
 * `baseUrl` is required and pairs with the `auth` block on the wire.
 */
export const AI_MODEL_PROVIDER_MAP: Readonly<
  Record<AiProvider, AiProviderMapEntry>
> = {
  OPENAI: {
    modelList: [
      'o3-pro',
      'o3',
      'gpt-5.5-pro',
      'gpt-5.5',
      'gpt-5.4-pro',
      'gpt-5.4',
      'gpt-5.4-mini',
      'gpt-5.4-nano',
      'gpt-5.2',
      'gpt-5.1',
      'gpt-5',
      'gpt-5-mini',
      'gpt-5-nano',
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4o',
      'gpt-4o-mini',
    ],
    providerFieldsList: ['baseUrl', 'apiKey'],
    modelFieldsList: [
      'temperature',
      'topP',
      'frequencyPenalty',
      'presencePenalty',
      'maxOutputTokens',
    ],
  },
  AZURE_OPENAI: {
    modelList: [],
    providerFieldsList: ['apiKey', 'endpoint', 'serviceVersion'],
    modelFieldsList: [
      'temperature',
      'topP',
      'frequencyPenalty',
      'presencePenalty',
      'maxOutputTokens',
    ],
  },
  GOOGLE_AI_GEMINI: {
    modelList: [
      'gemini-3.5-flash',
      'gemini-3.1-pro-preview',
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
    ],
    providerFieldsList: ['apiKey'],
    modelFieldsList: [
      'temperature',
      'topP',
      'topK',
      'frequencyPenalty',
      'presencePenalty',
      'maxOutputTokens',
    ],
  },
  GOOGLE_VERTEX_AI_GEMINI: {
    modelList: [
      'gemini-3.5-flash',
      'gemini-3.1-pro-preview',
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
    ],
    providerFieldsList: ['projectId', 'location', 'serviceAccountKey', 'fileName'],
    modelFieldsList: [
      'temperature',
      'topP',
      'topK',
      'frequencyPenalty',
      'presencePenalty',
      'maxOutputTokens',
    ],
  },
  MISTRAL_AI: {
    modelList: [
      'mistral-large-latest',
      'mistral-medium-latest',
      'mistral-small-latest',
      'ministral-14b-latest',
      'ministral-8b-latest',
      'ministral-3b-latest',
    ],
    providerFieldsList: ['apiKey'],
    modelFieldsList: [
      'temperature',
      'topP',
      'frequencyPenalty',
      'presencePenalty',
      'maxOutputTokens',
    ],
  },
  ANTHROPIC: {
    modelList: [
      'claude-opus-4-8',
      'claude-opus-4-7',
      'claude-opus-4-6',
      'claude-opus-4-5',
      'claude-opus-4-1',
      'claude-sonnet-4-6',
      'claude-sonnet-4-5',
      'claude-haiku-4-5',
    ],
    providerFieldsList: ['apiKey'],
    modelFieldsList: ['temperature', 'topP', 'topK', 'maxOutputTokens'],
  },
  AMAZON_BEDROCK: {
    modelList: [],
    providerFieldsList: ['region', 'accessKeyId', 'secretAccessKey'],
    modelFieldsList: ['temperature', 'topP', 'maxOutputTokens'],
  },
  GITHUB_MODELS: {
    modelList: [],
    providerFieldsList: ['personalAccessToken'],
    modelFieldsList: [
      'temperature',
      'topP',
      'frequencyPenalty',
      'presencePenalty',
      'maxOutputTokens',
    ],
  },
  OLLAMA: {
    modelList: [],
    providerFieldsList: ['baseUrl'],
    modelFieldsList: [
      'temperature',
      'topP',
      'topK',
      'maxOutputTokens',
      'contextLength',
    ],
  },
};

// ---------------------------------------------------------------------------
// Provider configs (openapi schemas, one per provider).
// ---------------------------------------------------------------------------

export interface OpenAiProviderConfig {
  /** Defaults to the official API base; non-official values make the API key optional (SSRF-checked server-side). */
  baseUrl?: string;
  apiKey?: string;
}

export interface AzureOpenAiProviderConfig {
  endpoint: string;
  serviceVersion?: string;
  apiKey: string;
}

export interface GoogleAiGeminiProviderConfig {
  apiKey: string;
}

export interface GoogleVertexAiGeminiProviderConfig {
  fileName: string;
  projectId: string;
  location: string;
  /** Service-account JSON uploaded as a string. */
  serviceAccountKey: string;
}

export interface MistralAiProviderConfig {
  apiKey: string;
}

export interface AnthropicProviderConfig {
  apiKey: string;
}

export interface AmazonBedrockProviderConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface GitHubModelsProviderConfig {
  personalAccessToken: string;
}

export type OllamaAuthType = 'NONE' | 'BASIC' | 'TOKEN';

/** Ollama auth schemes (openapi None/Basic/Token). */
export type OllamaAuth =
  | { type: 'NONE' }
  | { type: 'BASIC'; username: string; password: string }
  | { type: 'TOKEN'; token: string };

export interface OllamaProviderConfig {
  baseUrl: string;
  auth: OllamaAuth;
}

// ---------------------------------------------------------------------------
// Chat-model configuration union (discriminated by `provider`).
// ---------------------------------------------------------------------------

export interface AiChatModelConfigBase {
  modelId: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  maxOutputTokens?: number;
  contextLength?: number;
  timeoutSeconds?: number;
  maxRetries?: number;
}

export interface OpenAiChatModelConfig extends AiChatModelConfigBase {
  provider: 'OPENAI';
  providerConfig: OpenAiProviderConfig;
}

export interface AzureOpenAiChatModelConfig extends AiChatModelConfigBase {
  provider: 'AZURE_OPENAI';
  providerConfig: AzureOpenAiProviderConfig;
}

export interface GoogleAiGeminiChatModelConfig extends AiChatModelConfigBase {
  provider: 'GOOGLE_AI_GEMINI';
  providerConfig: GoogleAiGeminiProviderConfig;
}

export interface GoogleVertexAiGeminiChatModelConfig
  extends AiChatModelConfigBase {
  provider: 'GOOGLE_VERTEX_AI_GEMINI';
  providerConfig: GoogleVertexAiGeminiProviderConfig;
}

export interface MistralAiChatModelConfig extends AiChatModelConfigBase {
  provider: 'MISTRAL_AI';
  providerConfig: MistralAiProviderConfig;
}

export interface AnthropicChatModelConfig extends AiChatModelConfigBase {
  provider: 'ANTHROPIC';
  providerConfig: AnthropicProviderConfig;
}

export interface AmazonBedrockChatModelConfig extends AiChatModelConfigBase {
  provider: 'AMAZON_BEDROCK';
  providerConfig: AmazonBedrockProviderConfig;
}

export interface GitHubModelsChatModelConfig extends AiChatModelConfigBase {
  provider: 'GITHUB_MODELS';
  providerConfig: GitHubModelsProviderConfig;
}

export interface OllamaChatModelConfig extends AiChatModelConfigBase {
  provider: 'OLLAMA';
  providerConfig: OllamaProviderConfig;
}

export type AiChatModelConfig =
  | OpenAiChatModelConfig
  | AzureOpenAiChatModelConfig
  | GoogleAiGeminiChatModelConfig
  | GoogleVertexAiGeminiChatModelConfig
  | MistralAiChatModelConfig
  | AnthropicChatModelConfig
  | AmazonBedrockChatModelConfig
  | GitHubModelsChatModelConfig
  | OllamaChatModelConfig;

/** GET/POST /api/ai/model row (openapi AiModel). */
export interface AiModel
  extends BaseData<{ entityType: EntityType.AI_MODEL; id: string }>,
    HasTenantIdAndCustomer {
  /** Server-managed record version; echo it back on update. */
  version?: number;
  name: string;
  configuration?: AiChatModelConfig;
}

/**
 * POST /api/ai/model/chat — single-turn connectivity probe / chat. Errors
 * come back as HTTP 200 with a FAILURE envelope, NEVER as HTTP errors:
 * parse the envelope instead of catching (contract #24).
 */
export interface TbChatRequest {
  systemMessage?: string;
  userMessage: { contents: Array<{ contentType: 'TEXT'; text: string }> };
  chatModelConfig: AiChatModelConfig;
}

export type TbChatResponse =
  | { status: 'SUCCESS'; generatedContent?: string }
  | { status: 'FAILURE'; errorDetails?: string };
