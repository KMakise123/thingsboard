/**
 * AI-model conversion unit tests (M14 wave-3, R27/R34): the provider
 * whitelist mapping, the OPENAI baseUrl special case, the payload
 * normalization round-trip and the connectivity probe request shape.
 */
import { describe, expect, it } from 'vitest';
import type { AiModel } from '@/types/tb/ai-model';
import {
  buildConnectivityRequest,
  isOpenAiApiKeyOptional,
  OPENAI_OFFICIAL_BASE_URL,
  parseConnectivityError,
  toAiModelFormValue,
  toAiModelPayload,
  type AiModelFormValues,
} from './data';

function openAiValues(): AiModelFormValues {
  return {
    name: 'prod-model',
    provider: 'OPENAI',
    modelId: 'gpt-5',
    apiKey: 'sk-test',
    baseUrl: OPENAI_OFFICIAL_BASE_URL,
    authType: 'NONE',
    temperature: 0.5,
  };
}

describe('isOpenAiApiKeyOptional', () => {
  it('official base URL keeps the API key required', () => {
    expect(isOpenAiApiKeyOptional(OPENAI_OFFICIAL_BASE_URL)).toBe(false);
    expect(isOpenAiApiKeyOptional(undefined)).toBe(false);
  });

  it('non-official base URLs make the key optional', () => {
    expect(isOpenAiApiKeyOptional('http://localhost:11434/v1')).toBe(true);
  });
});

describe('toAiModelPayload', () => {
  it('keeps only the active provider whitelist fields (nested providerConfig)', () => {
    const payload = toAiModelPayload({
      ...openAiValues(),
      // Stray keys from a previously selected provider never travel.
      region: 'eu-west-1',
      personalAccessToken: 'gh-token',
      authType: 'TOKEN',
      authToken: 'leak',
    });
    const config = payload.configuration as Record<string, unknown>;
    const providerConfig = config.providerConfig as Record<string, unknown>;
    expect(config.provider).toBe('OPENAI');
    expect(config.modelId).toBe('gpt-5');
    expect(providerConfig.apiKey).toBe('sk-test');
    expect(providerConfig.baseUrl).toBe(OPENAI_OFFICIAL_BASE_URL);
    expect(providerConfig.region).toBeUndefined();
    expect(providerConfig.personalAccessToken).toBeUndefined();
    expect(providerConfig.auth).toBeUndefined();
    // Sampling fields ride the configuration root.
    expect(config.temperature).toBe(0.5);
    // Whitelist-sampled fields not set stay absent.
    expect(config.topP).toBeUndefined();
  });

  it('falls back to the official OPENAI base URL when blank', () => {
    const payload = toAiModelPayload({
      ...openAiValues(),
      baseUrl: undefined,
    });
    const config = payload.configuration as Record<string, unknown>;
    expect(
      (config.providerConfig as Record<string, unknown>).baseUrl,
    ).toBe(OPENAI_OFFICIAL_BASE_URL);
  });

  it('builds the OLLAMA auth block from the flat values', () => {
    const payload = toAiModelPayload({
      ...openAiValues(),
      provider: 'OLLAMA',
      modelId: 'llama3',
      apiKey: undefined,
      baseUrl: 'http://ollama.internal:11434',
      authType: 'BASIC',
      authUsername: 'user',
      authPassword: 'pass',
    });
    const providerConfig = (payload.configuration as Record<string, unknown>)
      .providerConfig as Record<string, unknown>;
    expect(providerConfig.baseUrl).toBe('http://ollama.internal:11434');
    expect(providerConfig.auth).toEqual({
      type: 'BASIC',
      username: 'user',
      password: 'pass',
    });
  });

  it('round-trips a stored OPENAI model through the form values', () => {
    const stored = {
      id: { entityType: 'AI_MODEL', id: 'm-1' },
      createdTime: 1,
      name: 'prod-model',
      version: 2,
      configuration: {
        provider: 'OPENAI' as const,
        modelId: 'gpt-5',
        providerConfig: {
          baseUrl: OPENAI_OFFICIAL_BASE_URL,
          apiKey: 'sk-test',
        },
        temperature: 0.5,
      },
    } as unknown as AiModel;
    const values = toAiModelFormValue(stored);
    expect(values.modelId).toBe('gpt-5');
    expect(values.apiKey).toBe('sk-test');
    const payload = toAiModelPayload(values, stored);
    expect(payload.id).toEqual(stored.id);
    expect(payload.version).toBe(2);
    expect(payload.configuration).toEqual(stored.configuration);
  });
});

describe('connectivity probe', () => {
  it('rides the unsaved config with maxRetries 0 + 20s timeout (ngx parity)', () => {
    const values = openAiValues();
    const configuration = toAiModelPayload(values).configuration;
    const request = buildConnectivityRequest(configuration);
    expect(request.userMessage.contents[0].text).toBe(
      'What is the capital of Ukraine?',
    );
    expect(request.chatModelConfig.maxRetries).toBe(0);
    expect(request.chatModelConfig.timeoutSeconds).toBe(20);
    expect(request.chatModelConfig.modelId).toBe('gpt-5');
  });

  it('pretty-prints JSON error envelopes and passes raw strings through', () => {
    expect(parseConnectivityError('{"error":"boom"}')).toBe(
      '{\n  "error": "boom"\n}',
    );
    expect(parseConnectivityError('plain failure')).toBe('plain failure');
    expect(parseConnectivityError(undefined)).toBe('');
  });
});
