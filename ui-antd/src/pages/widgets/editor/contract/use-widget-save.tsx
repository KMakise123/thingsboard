/**
 * useWidgetSave — the save chain of the widget editor (spec §5.2: 编译 →
 * 执行 → 冒烟渲染 → commit, 不静默降级). Wave-3 D implementation; the
 * result signature is the frozen wave-S seam ({saving, saveDisabled, save,
 * conflictDialog}) — the shell binds the toolbar save button + ctrl+s and
 * renders `conflictDialog` as-is.
 *
 * Gates, in order (any failure aborts with console + toast — never a POST):
 *   1. `compileWidget(source.tsx)` — transform AND module-top-level throws
 *      come back structured (never throws); a type that does not compile
 *      must never be stored (ADR 0004 §4).
 *   2. `smokeRenderWidget` — the compiled component is mounted once on a
 *      detached div; render-phase throws (execution errors that only fire
 *      under a React lifecycle) abort the save with the P1 line mapping.
 *   3. 512KB descriptor soft limit — WARN ONLY, never blocks (ADR 0004;
 *      tests pin warn-not-block at the byte boundary).
 * Only after all gates: POST through the generic save-with-conflict core
 * (409 → three-option dialog, same shape as §3.8/§6.2; the core re-anchors
 * the session baseline to the saved entity — version/id backfill — while
 * the undo stack survives).
 *
 * Conflict options:
 *   A 加载服务器版  — adopt `widgetTypeToDraft(server)` via fresh enter().
 *   B 用我的版本覆盖 — re-GET the fresh version, POST again; a second 409
 *     retries up to 3 times, exhaustion degrades back to the dialog.
 *   C 导出本地 JSON 后放弃 — download the draft (`exportWidgetTypeDraft`,
 *     TB strip rule) then `onAbandon` (shell: rollback-to-entry + exit).
 */
import { App } from 'antd';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { ConflictDialog } from '@/core/editor/contract/ConflictDialog';
import type { EditorSession } from '@/core/editor/session';
import { useEditorSession } from '@/core/editor/use-editor-session';
import { compileWidget, type WidgetCompileError } from '@/core/widget/compile';
import type { CustomWidgetProps } from '@/core/widget/types';
import type { WidgetConfig } from '@/types/tb/widget';
import type { WidgetTypeDetails } from '@/types/tb/widget-type';
import { draftToWidgetType, type WidgetEditorDoc } from '../draft-convert';
import { exportWidgetTypeDraft } from '../import-export';
import { overDescriptorSoftLimit } from './descriptor-budget';
import {
  loadServerWidgetType,
  overwriteWidgetTypeWithLocalDraft,
  type SaveWidgetOutcome,
  saveWidgetTypeDraft,
} from './save-with-conflict';
import { smokeRenderWidget } from './smoke-render';

export interface UseWidgetSaveArgs {
  session: EditorSession<WidgetEditorDoc>;
  /**
   * exit path after the conflict dialog's "load server version / abandon"
   * options — the shell wires it to rollback-to-entry + route exit.
   */
  onAbandon: () => void;
}

export interface UseWidgetSaveResult {
  saving: boolean;
  /**
   * Save button disabled source: nothing to commit until the session is
   * dirty, and no re-entry while a save is in flight.
   */
  saveDisabled: boolean;
  /**
   * Runs the save chain; resolves the saved server entity (null when the
   * chain aborted — the shell uses a non-null result to mint/replace the
   * editor URL after a first save).
   */
  save: () => Promise<WidgetTypeDetails | null>;
  /** 409 three-option dialog slot — render as-is. */
  conflictDialog: ReactNode;
}

interface SaveGateFailure {
  message: string;
  line?: number;
}

/** Console + toast sink for the gate aborts (no silent degradation). */
type GateAnnouncer = (
  gate: 'compile' | 'execute' | 'smoke',
  failure: SaveGateFailure,
) => void;

/** Smoke-render props stub built from the draft's own defaultConfig. */
export function smokePropsOf(doc: WidgetEditorDoc): CustomWidgetProps {
  let config: WidgetConfig = {};
  let settings: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(doc.defaultConfig) as unknown;
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    ) {
      config = parsed as WidgetConfig;
      const rawSettings = (parsed as WidgetConfig).settings;
      if (
        rawSettings !== null &&
        typeof rawSettings === 'object' &&
        !Array.isArray(rawSettings)
      ) {
        settings = rawSettings as Record<string, unknown>;
      }
    }
  } catch {
    // unparseable defaultConfig is surfaced by the preview; the smoke pass
    // runs with an empty config rather than adding a fourth save gate
  }
  return {
    config,
    settings,
    datasources: [],
    data: {},
    latestData: {},
    timewindow: null,
    actions: {},
    ctx: {
      // rough pixel stubs from the grid size — enough for layout-time reads
      width: doc.meta.sizeX * 100,
      height: doc.meta.sizeY * 50,
      isEdit: false,
      isPreview: true,
      locale: 'zh-CN',
      toast: () => {},
    },
  };
}

export function useWidgetSave({
  session,
  onAbandon,
}: UseWidgetSaveArgs): UseWidgetSaveResult {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const { dirty } = useEditorSession(session);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<{
    serverWidgetType: WidgetTypeDetails | null;
  } | null>(null);

  // keep the exit path out of save's identity so the toolbar stays stable
  const onAbandonRef = useRef(onAbandon);
  useEffect(() => {
    onAbandonRef.current = onAbandon;
  }, [onAbandon]);

  const announceGate: GateAnnouncer = useCallback(
    (gate, failure) => {
      // console carries the full detail; the toast carries the decision
      console.error(`[widget save:${gate}]`, failure);
      message.error(
        `${formatMessage({
          id: `editor.widget.io.save.${gate}Failed`,
          defaultMessage: 'Save aborted',
        })}: ${failure.message}`,
      );
    },
    [message, formatMessage],
  );

  const save = useCallback(async (): Promise<WidgetTypeDetails | null> => {
    if (saving) {
      return null;
    }
    setSaving(true);
    try {
      const doc = session.current;
      // ---- gate 1: compile (+ module execution) ----
      const compiled = compileWidget(doc.source.tsx, {
        name: doc.name || doc.fqn || undefined,
      });
      if ('error' in compiled) {
        // gate 1 spans both compile stages: `transform` (Sucrase parse) and
        // `execute` (module top-level throw) — neither may ever be stored
        announceGate(
          compiled.error.stage === 'transform' ? 'compile' : 'execute',
          failureOf(compiled.error),
        );
        return null;
      }
      // ---- gate 2: smoke render (execution errors surface here) ----
      const smoke = await smokeRenderWidget(compiled, smokePropsOf(doc));
      if (!smoke.ok) {
        announceGate('smoke', smoke.failure);
        return null;
      }
      // ---- 512KB soft limit: warn, never block (ADR 0004) ----
      const outgoing = draftToWidgetType(doc);
      if (overDescriptorSoftLimit(outgoing)) {
        message.warning(
          formatMessage({
            id: 'editor.widget.io.save.descriptorSoftLimit',
            defaultMessage:
              'The descriptor exceeds the 512KB soft limit; saving continues.',
          }),
        );
      }
      // ---- POST + 409 three-option path ----
      const outcome = await saveWidgetTypeDraft({ session, entity: outgoing });
      if (outcome.status === 'conflict') {
        setConflict({ serverWidgetType: outcome.serverWidgetType });
        return null;
      }
      return settleOutcome(outcome, message, formatMessage);
    } finally {
      setSaving(false);
    }
  }, [saving, session, message, formatMessage, announceGate]);

  const settle = useCallback(
    (outcome: SaveWidgetOutcome): WidgetTypeDetails | null => {
      return settleOutcome(outcome, message, formatMessage);
    },
    [message, formatMessage],
  );

  const closeConflict = useCallback(() => setConflict(null), []);

  // Option A — 加载服务器版: adopt the server draft (fresh enter).
  const handleConflictLoadServer = useCallback(() => {
    const server = conflict?.serverWidgetType;
    closeConflict();
    if (!server) {
      message.error(
        formatMessage({
          id: 'editor.widget.io.save.loadServerFailed',
          defaultMessage: 'Could not load the server version.',
        }),
      );
      return;
    }
    loadServerWidgetType(session, server);
  }, [conflict, closeConflict, message, formatMessage, session]);

  // Option B — 用我的版本覆盖: re-GET fresh version → POST (retry capped).
  const handleConflictOverwrite = useCallback(async () => {
    const outcome = await overwriteWidgetTypeWithLocalDraft({
      session,
      entity: draftToWidgetType(session.current),
    });
    if (outcome.status === 'saved') {
      setConflict(null);
      settle(outcome);
      return;
    }
    if (outcome.status === 'conflict') {
      setConflict({ serverWidgetType: outcome.serverWidgetType });
      message.warning(
        formatMessage({
          id: 'editor.widget.io.save.overwriteFailed',
          defaultMessage:
            'Overwrite failed: the server version keeps changing.',
        }),
      );
      return;
    }
    settle(outcome);
  }, [session, settle, message, formatMessage]);

  // Option C — 导出本地 JSON 后放弃: download the draft, then abandon.
  const handleConflictExportLocal = useCallback(() => {
    closeConflict();
    exportWidgetTypeDraft(session.current);
    onAbandonRef.current();
  }, [closeConflict, session]);

  const conflictServer = conflict?.serverWidgetType ?? null;
  const conflictDialog = conflict ? (
    <ConflictDialog
      open
      serverEntity={{
        title: conflictServer?.name ?? conflictServer?.fqn ?? undefined,
        version: conflictServer?.version,
      }}
      onLoadServer={handleConflictLoadServer}
      onOverwrite={() => void handleConflictOverwrite()}
      onExportLocal={handleConflictExportLocal}
      onClose={closeConflict}
    />
  ) : null;

  return {
    saving,
    saveDisabled: !dirty || saving,
    save,
    conflictDialog,
  };
}

function failureOf(error: WidgetCompileError): SaveGateFailure {
  return {
    message: error.message,
    ...(error.line === undefined ? {} : { line: error.line }),
  };
}

function settleOutcome(
  outcome: SaveWidgetOutcome,
  message: ReturnType<typeof App.useApp>['message'],
  formatMessage: ReturnType<typeof useIntl>['formatMessage'],
): WidgetTypeDetails | null {
  switch (outcome.status) {
    case 'saved':
      message.success(
        formatMessage({
          id: 'editor.widget.editor.toolbar.saved',
          defaultMessage: 'Saved',
        }),
      );
      return outcome.widgetType;
    case 'conflict':
      // the three-option dialog takes over (rendered via conflictDialog)
      return null;
    default:
      message.error(serverErrorText(outcome.error));
      return null;
  }
}
