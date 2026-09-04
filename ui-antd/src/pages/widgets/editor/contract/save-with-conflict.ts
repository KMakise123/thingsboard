/**
 * Widget-type binding of the generic save-with-conflict core (§5.2 409 行为
 * 契约, same shape as §3.8/§6.2). The flow logic (version-carrying POST /
 * 409 fetch / Option-B retry loop capped at 3) lives in
 * core/editor/contract/save-with-conflict.ts; this module only injects the
 * widget transport hooks and maps the outcome onto widget-flavored keys:
 * `saveWidgetTypeDraft` / `overwriteWidgetTypeWithLocalDraft` /
 * `loadServerWidgetType` — the three conflict options live beside each
 * other so the hook wiring stays declarative (dashboards parity).
 *
 * Transport note: `saveWidgetType` is a static import because the wave-S
 * shell tests stub this transport module with `saveWidgetType` alone; the
 * conflict-time GET (`getWidgetTypeById`) loads through a dynamic import
 * inside the hook so the shell's static graph never binds an export those
 * tests do not mock.
 */
import {
  type DraftConflictHooks,
  loadServerDraft,
  overwriteDraftWithLocalDraft,
  type SaveDraftOutcome,
  saveDraftWithConflict,
} from '@/core/editor/contract/save-with-conflict';
import type { EditorSession } from '@/core/editor/session';
import { saveWidgetType } from '@/services/tb/widget-type';
import type { WidgetTypeDetails } from '@/types/tb/widget-type';

import {
  draftToWidgetType,
  type WidgetEditorDoc,
  widgetTypeToDraft,
} from '../draft-convert';

export {
  MAX_OVERWRITE_ATTEMPTS,
  VERSION_CONFLICT_ERROR_CODE,
} from '@/core/editor/contract/save-with-conflict';

/** §5.2 save outcome with the widget-flavored key names. */
export type SaveWidgetOutcome =
  | { status: 'saved'; widgetType: WidgetTypeDetails }
  | { status: 'conflict'; serverWidgetType: WidgetTypeDetails | null }
  | { status: 'error'; error: unknown };

/**
 * The draft fully determines the POST body (`draftToWidgetType`); the
 * entity meta only contributes identity for the conflict-time GET and the
 * fresh version for the overwrite loop.
 */
export const widgetTypeConflictHooks: DraftConflictHooks<
  WidgetTypeDetails,
  WidgetEditorDoc
> = {
  save: (entity) => saveWidgetType(entity),
  fetchEntity: async (id: string) => {
    const { getWidgetTypeById } = await import('@/services/tb/widget-type');
    return getWidgetTypeById(id);
  },
  entityId: (entity) => entity.id?.id,
  versionOf: (entity) => entity.version,
  withDraft: (_entity, draft, version) => {
    const body = draftToWidgetType(draft);
    return version === undefined ? body : { ...body, version };
  },
  // the descriptor is what makes an entity convertible; without it the
  // server payload is unusable and the current draft stays authoritative
  draftOf: (entity, fallback) =>
    entity.descriptor === undefined ? fallback : widgetTypeToDraft(entity),
};

function mapOutcome(
  outcome: SaveDraftOutcome<WidgetTypeDetails>,
): SaveWidgetOutcome {
  switch (outcome.status) {
    case 'saved':
      return { status: 'saved', widgetType: outcome.entity };
    case 'conflict':
      return { status: 'conflict', serverWidgetType: outcome.serverEntity };
    default:
      return outcome;
  }
}

export interface SaveWidgetTypeDraftArgs {
  session: EditorSession<WidgetEditorDoc>;
  /** The outgoing POST body (already gated through compile/smoke). */
  entity: WidgetTypeDetails;
}

/**
 * POSTs the draft against the optimistic-locking `version` it carries.
 * 409 → GET the server type and report the conflict (three-option dialog).
 */
export async function saveWidgetTypeDraft(
  args: SaveWidgetTypeDraftArgs,
): Promise<SaveWidgetOutcome> {
  const outcome = await saveDraftWithConflict({
    session: args.session,
    entity: args.entity,
    hooks: widgetTypeConflictHooks,
  });
  return mapOutcome(outcome);
}

export interface OverwriteWidgetTypeArgs extends SaveWidgetTypeDraftArgs {
  /** Test seam: override the attempt cap (defaults to MAX_OVERWRITE_ATTEMPTS). */
  maxAttempts?: number;
}

/**
 * 409 Option B — 用我的版本覆盖: force-save the draft by re-reading the
 * server's latest `version` before each POST; retry capped (3), exhaustion
 * degrades back to `conflict` (NOT error — never blind-write).
 */
export async function overwriteWidgetTypeWithLocalDraft(
  args: OverwriteWidgetTypeArgs,
): Promise<SaveWidgetOutcome> {
  const { maxAttempts, ...rest } = args;
  const outcome = await overwriteDraftWithLocalDraft({
    session: rest.session,
    entity: rest.entity,
    hooks: widgetTypeConflictHooks,
    ...(maxAttempts !== undefined ? { maxAttempts } : {}),
  });
  return mapOutcome(outcome);
}

/**
 * 409 Option A — 加载服务器版: adopt the server entity as the new editing
 * baseline (fresh `enter()` — history resets; the entry checkpoint handle
 * goes inert by session contract, exactly the dashboards behavior).
 */
export function loadServerWidgetType(
  session: EditorSession<WidgetEditorDoc>,
  server: WidgetTypeDetails,
): void {
  loadServerDraft(session, widgetTypeToDraft(server));
}
