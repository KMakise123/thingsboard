/**
 * AI-model transport (handwritten) — M14 wave-1 (settings /ai-models).
 *
 * Base paths (AiModelController.java, TA only):
 *   GET    /api/ai/model             paged list
 *   POST   /api/ai/model             create/update
 *   GET    /api/ai/model/{modelId}   by id
 *   DELETE /api/ai/model/{modelId}   delete → boolean
 *   POST   /api/ai/model/chat        single-turn connectivity probe
 *
 * Wire gotchas (contract #24):
 *   - tenantId is server-forced from the session; never sent.
 *   - DELETE of a missing model answers 200 with body `false` (NOT 404).
 *   - /chat errors arrive as HTTP 200 + a FAILURE envelope — parse the
 *     envelope, don't catch HTTP errors. SSRF-guarded baseUrls reject
 *     with 400 "AI model provider URL is not allowed: ...".
 */

import type { QueryParams } from '@/core/http/client';
import type { PageData, PageLink } from '@/types/tb/page';
import { pageLinkToQueryParams } from '@/types/tb/page';
import type {
  AiModel,
  TbChatRequest,
  TbChatResponse,
} from '@/types/tb/ai-model';

import { tbHttp } from './http';

/** Default sort for list callers that don't pin one (backend default is id ASC). */
function aiModelPageLink(pageLink: PageLink): PageLink {
  return {
    ...pageLink,
    sortOrder: pageLink.sortOrder ?? {
      property: 'createdTime',
      direction: 'DESC',
    },
  };
}

/**
 * GET /api/ai/model — paged list. Safe sort columns: createdTime | name |
 * provider | modelId (all real entity properties); defaults to
 * createdTime DESC.
 */
export async function getAiModels(
  pageLink: PageLink,
): Promise<PageData<AiModel>> {
  return tbHttp.get<PageData<AiModel>>(
    '/api/ai/model',
    pageLinkToQueryParams(aiModelPageLink(pageLink)) as QueryParams,
  );
}

/** GET /api/ai/model/{modelId}. */
export async function getAiModelById(modelId: string): Promise<AiModel> {
  return tbHttp.get<AiModel>(`/api/ai/model/${modelId}`);
}

/**
 * POST /api/ai/model — create/update. The response is the stored row (the
 * server assigns ids/tenantId and bumps `version`).
 */
export async function saveAiModel(model: AiModel): Promise<AiModel> {
  return tbHttp.post<AiModel>('/api/ai/model', model);
}

/**
 * DELETE /api/ai/model/{modelId} — resolves `false` when the model is
 * already gone (200 body, not 404): callers treat false as "did not
 * exist" instead of an error.
 */
export async function deleteAiModel(modelId: string): Promise<boolean> {
  return tbHttp.delete<boolean>(`/api/ai/model/${modelId}`);
}

/**
 * POST /api/ai/model/chat — single-turn probe used by the edit dialog's
 * "Check connectivity" action (works with unsaved form values; the model
 * config rides in the request). HTTP 200 ALWAYS — check
 * TbChatResponse.status: SUCCESS carries generatedContent, FAILURE
 * carries errorDetails.
 *
 * The chatModelConfig's timeoutSeconds (probe: 20s) bounds the backend's
 * DeferredResult, so the CLIENT timeout must exceed it — the shared 10s
 * default aborts legitimate probes (live-checked in wave-3).
 */
export async function checkAiModelConnectivity(
  request: TbChatRequest,
): Promise<TbChatResponse> {
  return tbHttp.request<TbChatResponse>('/api/ai/model/chat', {
    method: 'POST',
    body: request,
    timeoutMs: 25_000,
  });
}
