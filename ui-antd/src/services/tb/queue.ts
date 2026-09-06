/**
 * Queue transport (handwritten) — M14 wave-1 (settings /queues pages).
 *
 * Base paths (QueueController.java):
 *   GET    /api/queues?serviceType=...   paged list (SA + TA)
 *   POST   /api/queues?serviceType=...   create/update (SA only)
 *   GET    /api/queues/{queueId}         by id (SA + TA)
 *   DELETE /api/queues/{queueId}         delete (SA only)
 *
 * Wire gotchas (contract #14/#15/#16):
 *   - `serviceType` is a REQUIRED query param on BOTH list and save, pinned
 *     here to TB_RULE_ENGINE (ServiceType.of normalizes the hyphen form,
 *     so this is wire-equivalent to the swagger's "TB-RULE-ENGINE").
 *   - Saving with a non-rule-engine serviceType returns a 200 with an
 *     EMPTY body — callers must not parse the save response into an entity.
 *   - Name/topic are immutable after creation (update attempts 400).
 *   - TENANT write calls 403; a non-isolated tenant's list is always empty
 *     (default queues live in the tenant profile, not as queue rows).
 */

import type { QueryParams } from '@/core/http/client';
import type { PageData, PageLink } from '@/types/tb/page';
import { pageLinkToQueryParams } from '@/types/tb/page';
import type { Queue } from '@/types/tb/queue';

import { tbHttp } from './http';

/** Wire value pinned per M14 contract #14 (device-profile.ts:106 precedent). */
const RULE_ENGINE_SERVICE_TYPE = 'TB_RULE_ENGINE';

/** Default sort for list callers that don't pin one (backend default is id ASC). */
function ruleEngineQueuePageLink(pageLink: PageLink): PageLink {
  return {
    ...pageLink,
    sortOrder: pageLink.sortOrder ?? {
      property: 'createdTime',
      direction: 'DESC',
    },
  };
}

/**
 * GET /api/queues?serviceType=TB_RULE_ENGINE — paged queue list. Sortable
 * columns: createdTime | name | topic; defaults to createdTime DESC.
 */
export async function getQueues(pageLink: PageLink): Promise<PageData<Queue>> {
  const params: QueryParams = {
    ...pageLinkToQueryParams(ruleEngineQueuePageLink(pageLink)),
    serviceType: RULE_ENGINE_SERVICE_TYPE,
  };
  return tbHttp.get<PageData<Queue>>('/api/queues', params);
}

/** GET /api/queues/{queueId} — SA + TA readable. */
export async function getQueueById(queueId: string): Promise<Queue> {
  return tbHttp.get<Queue>(`/api/queues/${queueId}`);
}

/**
 * POST /api/queues?serviceType=TB_RULE_ENGINE — create/update (SA only).
 * The body does NOT carry a serviceType field; it rides as the query param.
 * Name/topic immutable on update; no entity parsing of the response (see
 * the empty-body caveat in the header).
 */
export async function saveQueue(queue: Queue): Promise<Queue> {
  return tbHttp.post<Queue>('/api/queues', queue, {
    serviceType: RULE_ENGINE_SERVICE_TYPE,
  });
}

/**
 * DELETE /api/queues/{queueId} (SA only). Deletion fails with 400 while
 * device profiles reference the queue — the ONLY backend protection: the
 * name=Main system queue has none, so callers must gate it in the UI.
 */
export async function deleteQueue(queueId: string): Promise<void> {
  return tbHttp.delete<void>(`/api/queues/${queueId}`);
}
