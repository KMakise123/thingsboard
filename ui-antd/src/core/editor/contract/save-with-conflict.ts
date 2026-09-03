/**
 * Generic save-with-conflict path for the editor suite — §3.8 409 三选项
 * 闭环 (ADR 0004 §2). Hoisted from pages/dashboards/editor/contract in M8
 * wave F and made entity-agnostic: the transport binding (save / fetch /
 * draft extraction) is injected via `DraftConflictHooks`, the undo/redo
 * semantics stay owned by EditorSession.
 *
 *  - happy path: POST the entity rebuilt around the serialized draft WITH
 *    the optimistic-lock `version` from the entity meta, then re-anchor the
 *    session baseline to the server truth. The undo stack SURVIVES the save.
 *  - 409 (`errorCode === 35` VERSION_CONFLICT): the server entity is fetched
 *    and surfaced through `{status:'conflict', serverEntity}` for the
 *    three-option ConflictDialog; a failed GET still reports conflict with
 *    `serverEntity: null` (honest "unknown server state").
 *  - Option B (`overwriteDraftWithLocalDraft`): re-GET the latest server
 *    version, POST with it; retry capped at MAX_OVERWRITE_ATTEMPTS, then
 *    degrade back to `conflict` (NOT error).
 *
 * Baseline discipline: the draft is committed to the session baseline AFTER
 * a 2xx only — a failed/conflicted POST leaves the undo stack and dirty
 * state untouched.
 */

import type { EditorSession } from '@/core/editor/session';

/** ThingsBoard errorCode for an optimistic-locking version conflict. */
export const VERSION_CONFLICT_ERROR_CODE = 35;

/** ADR 0004 §2: a second 409 retries at most this many overwrite attempts. */
export const MAX_OVERWRITE_ATTEMPTS = 3;

export type SaveDraftOutcome<TEntity> =
  | { status: 'saved'; entity: TEntity }
  | { status: 'conflict'; serverEntity: TEntity | null }
  | { status: 'error'; error: unknown };

/**
 * Entity-specific bindings of a concrete editor. `TDraft` is the session
 * draft shape, `TEntity` the wire entity posted to the server.
 */
export interface DraftConflictHooks<TEntity, TDraft extends object> {
  /** POST the entity (upsert); resolves with the persisted server entity. */
  save(entity: TEntity): Promise<TEntity>;
  /** GET the current server entity (conflict snapshot + fresh version). */
  fetchEntity(id: string): Promise<TEntity>;
  /** The id `fetchEntity` is called with. */
  entityId(entity: TEntity): string | undefined;
  /** Optimistic-lock version reader of an entity. */
  versionOf(entity: TEntity): number | undefined;
  /**
   * Rebuilds the outgoing entity around the serialized draft. `version` is
   * passed ONLY by the overwrite loop (fresh server version) — omit it to
   * keep the entity meta's own version.
   */
  withDraft(entity: TEntity, draft: TDraft, version?: number): TEntity;
  /** Server entity → the new session baseline after a successful save. */
  draftOf(entity: TEntity, fallback: TDraft): TDraft;
}

export interface SaveDraftWithConflictArgs<TEntity, TDraft extends object> {
  session: EditorSession<TDraft>;
  /**
   * Current server entity meta (id / version / display fields). Draft-bearing
   * fields of this object are ignored — the session draft is authoritative.
   */
  entity: TEntity;
  hooks: DraftConflictHooks<TEntity, TDraft>;
}

export function errorCodeOf(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'errorCode' in error) {
    return (error as { errorCode?: unknown }).errorCode as number | undefined;
  }
  return undefined;
}

export function isVersionConflict(error: unknown): boolean {
  return errorCodeOf(error) === VERSION_CONFLICT_ERROR_CODE;
}

/**
 * POSTs the local draft against the optimistic-locking `version` carried by
 * the entity meta. 409 → GET the server entity and report the conflict.
 */
export async function saveDraftWithConflict<TEntity, TDraft extends object>(
  args: SaveDraftWithConflictArgs<TEntity, TDraft>,
): Promise<SaveDraftOutcome<TEntity>> {
  const { session, entity, hooks } = args;
  const serialized = session.current;
  try {
    const server = await hooks.save(hooks.withDraft(entity, serialized));
    // Re-anchor to the server truth (also backfills server-side mutations).
    session.save(hooks.draftOf(server, serialized));
    return { status: 'saved', entity: server };
  } catch (error) {
    if (!isVersionConflict(error)) {
      return { status: 'error', error };
    }
    let serverEntity: TEntity | null = null;
    try {
      serverEntity = await hooks.fetchEntity(hooks.entityId(entity) ?? '');
    } catch {
      // server state unknown — the dialog degrades to Option C only
    }
    return { status: 'conflict', serverEntity };
  }
}

export interface OverwriteDraftWithLocalDraftArgs<
  TEntity,
  TDraft extends object,
> extends SaveDraftWithConflictArgs<TEntity, TDraft> {
  /** Test seam: override the attempt cap (defaults to MAX_OVERWRITE_ATTEMPTS). */
  maxAttempts?: number;
}

/**
 * 409 Option B — 用我的版本覆盖: force-save the local draft by re-reading
 * the server's latest `version` before each POST. Retry on further 409s up
 * to `maxAttempts` (3); exhaustion degrades back to `conflict` with the
 * latest observed server snapshot.
 */
export async function overwriteDraftWithLocalDraft<
  TEntity,
  TDraft extends object,
>(
  args: OverwriteDraftWithLocalDraftArgs<TEntity, TDraft>,
): Promise<SaveDraftOutcome<TEntity>> {
  const { session, entity, hooks, maxAttempts = MAX_OVERWRITE_ATTEMPTS } = args;
  let lastServer: TEntity | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let freshVersion: number | undefined;
    try {
      lastServer = await hooks.fetchEntity(hooks.entityId(entity) ?? '');
      freshVersion = hooks.versionOf(lastServer) ?? hooks.versionOf(entity);
    } catch (error) {
      // Cannot learn the fresh version — refusing to blind-POST.
      return { status: 'error', error };
    }
    try {
      const server = await hooks.save(
        hooks.withDraft(entity, session.current, freshVersion),
      );
      session.save(hooks.draftOf(server, session.current));
      return { status: 'saved', entity: server };
    } catch (error) {
      if (!isVersionConflict(error)) {
        return { status: 'error', error };
      }
      // version raced again — fall through to the next attempt
    }
  }
  return { status: 'conflict', serverEntity: lastServer };
}

/**
 * 409 Option A — 加载服务器版: adopt a (caller-normalized) server draft as
 * the new editing baseline (fresh `enter()` — history resets). The
 * entity-specific normalization lives in the caller; the core owns only the
 * session re-baseline.
 */
export function loadServerDraft<TDraft extends object>(
  session: EditorSession<TDraft>,
  draft: TDraft,
): void {
  session.enter(draft);
}
