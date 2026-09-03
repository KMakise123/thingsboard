/**
 * EditorShell — edit-mode layout (M7 brief §2): editor toolbar on top,
 * editing canvas in the center, right config-panel slot, DialogHost at the
 * bottom.
 *
 * Toolbar (spec §3.1 齐套): save / undo / redo (behavior contract) /
 * layout toggle + manage-layouts entry / fullscreen / states / aliases /
 * filters / settings / import / export / version-control entry / exit-edit.
 * The timewindow picker binds RUNTIME state only — it never reaches the
 * session writer (§3.9 不入栈项).
 *
 * Exit semantics (§3.1, D wave): 保存退出 → saveDashboardDraft → success
 * navigates to the readonly view, 409 opens the three-option conflict dialog
 * first (an overwrite success still lands on the view); 取消退出 → dirty
 * confirm (§3.8) → entry-checkpoint rollback (prevDashboard semantics) →
 * view. Import swaps the draft through ONE undoable group (draft-only until
 * save); export downloads the current draft JSON.
 */
import {
  AppstoreOutlined,
  ClusterOutlined,
  DownloadOutlined,
  FilterOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  HistoryOutlined,
  LayoutOutlined,
  PlusOutlined,
  ProjectOutlined,
  RedoOutlined,
  SaveOutlined,
  SettingOutlined,
  UndoOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { history } from '@umijs/max';
import type { MenuProps } from 'antd';
import { App, Button, Dropdown, Popover, Space, Tooltip } from 'antd';
import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useIntl } from 'react-intl';
import { TimewindowPicker } from '@/components/dashboard/timewindow/TimewindowPicker';
import { serverErrorText } from '@/components/entities/server-error-text';
import { getRootStateId } from '@/core/dashboard/model';
import { removeWidget, writeDraft } from '@/core/editor/dashboard-draft';
import type { EditorSession } from '@/core/editor/session';
import { useEditorSession } from '@/core/editor/use-editor-session';
import type {
  Dashboard,
  DashboardConfiguration,
  EntityAlias,
} from '@/types/tb/dashboard';
import {
  createDefaultDashboardTimewindow,
  type Timewindow,
} from '@/types/tb/timewindow';
import { EditorCanvas } from './canvas/EditorCanvas';
import { EditorCanvasOverrideProvider } from './canvas/editor-canvas-context';
import {
  canPasteWidgetReference,
  copyWidgetReferencesToClipboard,
  copyWidgetsToClipboard,
  findWidgetLayout,
  getClipboard,
  hasClipboard,
  isReferenceWidget,
  pasteFromClipboard,
  replaceReferenceWithCopy,
} from './clipboard';
import { ConflictDialog } from './contract/ConflictDialog';
import { exportDraftDashboard } from './contract/export-draft';
import { ImportDashboardDialog } from './contract/import-dialog';
import {
  loadServerVersion,
  overwriteWithLocalDraft,
  type SaveOutcome,
  saveDashboardDraft,
} from './contract/save-with-conflict';
import { useEditorEntryCheckpoint } from './contract/use-editor-entry-checkpoint';
import { shouldPromptLeave, useLeaveGuard } from './contract/use-leave-guard';
import { AddWidgetFlow } from './dialogs/add-widget';
import { DialogHost, useEditorDialogs } from './dialogs/host';
import { WidgetConfigPanel } from './panels';

export interface EditorShellProps {
  session: EditorSession<DashboardConfiguration>;
  /** loaded server entity (id / title / version for the save path). */
  dashboard: Dashboard;
}

/** True when the keystroke belongs to a text editor, not the canvas. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) {
    return false;
  }
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable ||
    Boolean(el.closest?.('.cm-editor'))
  );
}

/** Self-wrapped native Fullscreen API (ADR 0004 §1 — no library). */
function useFullscreen(target: RefObject<HTMLDivElement | null>) {
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () =>
      setFullscreen((document.fullscreenElement ?? null) !== null);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggle = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
    } else {
      void target.current?.requestFullscreen?.();
    }
  };
  return { fullscreen, toggle };
}

export function EditorShell({ session, dashboard }: EditorShellProps) {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

  const snapshot = useEditorSession(session);
  const configuration = snapshot.current;

  const [meta, setMeta] = useState<Dashboard>(dashboard);
  const [saving, setSaving] = useState(false);
  /** Non-null while the §3.8 three-option conflict dialog is open. */
  const [conflict, setConflict] = useState<{
    serverDashboard: Dashboard | null;
  } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [showRightLayout, setShowRightLayout] = useState(false);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [addWidgetOpen, setAddWidgetOpen] = useState(false);

  // §3.1 cancel-exit (ui-ngx prevDashboard semantics): the entry checkpoint
  // reverts every post-entry write as ONE rollback group; the leave-guard
  // layers the §3.8 dirty confirm + hard-navigation beforeunload on top.
  const entryCheckpoint = useEditorEntryCheckpoint({ session, enabled: true });
  useLeaveGuard({ session, enabled: true });
  /**
   * Set by 保存退出: after a conflict is resolved through the dialog, a
   * successful save still lands back on the readonly view (dialog-first
   * exit). Cleared when the dialog is dismissed without resolving.
   */
  const pendingExitRef = useRef(false);

  // Runtime-only timewindow: bound to the picker, never written to the draft.
  const [timewindow, setTimewindow] = useState<Timewindow>(
    () => configuration.timewindow ?? createDefaultDashboardTimewindow(),
  );

  const dialogs = useEditorDialogs();

  const rootStateId = getRootStateId(configuration.states);
  const hasRightLayout = Boolean(
    configuration.states[rootStateId]?.layouts?.right,
  );

  const shellRef = useRef<HTMLDivElement | null>(null);
  const { fullscreen, toggle: toggleFullscreen } = useFullscreen(shellRef);

  const backToView = () => {
    history.push(`/dashboards/${meta.id?.id}`);
  };

  /** Common 2xx landing: re-anchor meta, refresh caches, toast. */
  const applySavedOutcome = async (
    outcome: Extract<SaveOutcome, { status: 'saved' }>,
  ): Promise<void> => {
    setMeta(outcome.dashboard);
    await queryClient.invalidateQueries({
      queryKey: ['dashboard', 'full', outcome.dashboard.id?.id],
    });
    await queryClient.invalidateQueries({ queryKey: ['dashboards', 'list'] });
    message.success(
      formatMessage({
        id: 'editor.dashboard.toolbar.saved',
        defaultMessage: 'Saved',
      }),
    );
  };

  const save = async (): Promise<boolean> => {
    setSaving(true);
    try {
      const outcome = await saveDashboardDraft({ session, dashboard: meta });
      if (outcome.status === 'saved') {
        await applySavedOutcome(outcome);
        return true;
      }
      if (outcome.status === 'conflict') {
        // §3.8 409: surface the three-option dialog with the fetched server
        // snapshot; the session stays dirty until the user resolves it.
        setConflict({ serverDashboard: outcome.serverDashboard });
        return false;
      }
      message.error(
        `${formatMessage({
          id: 'editor.dashboard.toolbar.saveFailed',
          defaultMessage: 'Save failed',
        })}: ${serverErrorText(outcome.error)}`,
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const exitWithSave = async () => {
    pendingExitRef.current = true;
    if (await save()) {
      pendingExitRef.current = false;
      backToView();
    }
    // a conflict keeps the shell open — the dialog owns the rest of the
    // exit flow (overwrite success → navigate, option A/C → stay/leave)
  };

  const exitWithCancel = () => {
    // §3.1 取消退出 = entry-baseline rollback (prevDashboard semantics) with
    // the §3.8 confirm in front while the guard would prompt. Undo-to-bottom
    // leaves the draft reference-clean ⇒ no confirm, straight exit.
    const discardAndExit = () => {
      entryCheckpoint.rollbackToEntry();
      backToView();
    };
    if (!shouldPromptLeave(session)) {
      discardAndExit();
      return;
    }
    modal.confirm({
      title: formatMessage(
        t('editor.dashboard.contract.discardTitle', 'Unsaved changes'),
      ),
      content: formatMessage(
        t(
          'editor.dashboard.contract.discardText',
          'The draft has unsaved changes; exiting edit mode discards them.',
        ),
      ),
      okText: formatMessage(
        t('editor.dashboard.contract.discardOk', 'Discard changes'),
      ),
      okButtonProps: { danger: true },
      cancelText: formatMessage({
        id: 'editor.common.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: discardAndExit,
    });
  };

  // ------------------------------------------------------------------
  // §3.8 409 three-option resolution (ADR 0004 §2)
  // ------------------------------------------------------------------
  const closeConflict = () => {
    setConflict(null);
    pendingExitRef.current = false;
  };

  /** Option A — 加载服务器版: adopt the server entity as the new baseline. */
  const handleConflictLoadServer = () => {
    const server = conflict?.serverDashboard;
    closeConflict();
    if (!server) {
      // conflict-time GET failed — the adoption target is unknown
      message.error(
        formatMessage(
          t(
            'editor.dashboard.contract.conflict.loadFailed',
            'Failed to load the server version',
          ),
        ),
      );
      return;
    }
    loadServerVersion(session, server);
    setMeta(server);
    setSelectedWidgetId(null);
  };

  /** Option B — 用我的版本覆盖: fresh-version force-save, capped retry. */
  const handleConflictOverwrite = async () => {
    const outcome = await overwriteWithLocalDraft({ session, dashboard: meta });
    if (outcome.status === 'saved') {
      setConflict(null);
      await applySavedOutcome(outcome);
      // dialog-first exit: a pending 保存退出 lands on the view now
      if (pendingExitRef.current) {
        pendingExitRef.current = false;
        backToView();
      }
      return;
    }
    if (outcome.status === 'conflict') {
      // retry cap exhausted — refresh the dialog snapshot and force an
      // explicit decision (dialog stays open per ADR)
      setConflict({ serverDashboard: outcome.serverDashboard });
      message.warning(
        formatMessage(
          t(
            'editor.dashboard.contract.conflict.overwriteFailed',
            'Overwrite failed: the server version kept changing (3 retries used). Pick another option.',
          ),
        ),
      );
      return;
    }
    message.error(
      `${formatMessage({
        id: 'editor.dashboard.toolbar.saveFailed',
        defaultMessage: 'Save failed',
      })}: ${serverErrorText(outcome.error)}`,
    );
  };

  /** Option C — 导出本地 JSON 后放弃: download the draft, then adopt server. */
  const handleConflictExportLocal = () => {
    exportDraftDashboard({ dashboard: meta, configuration: session.current });
    const server = conflict?.serverDashboard;
    closeConflict();
    if (server) {
      // the server truth replaces the abandoned draft in the editor
      loadServerVersion(session, server);
      setMeta(server);
      setSelectedWidgetId(null);
    } else {
      // server state unknown — give up cleanly and leave the editor
      entryCheckpoint.rollbackToEntry();
      backToView();
    }
    message.success(
      formatMessage(
        t('editor.dashboard.contract.export.done', 'Draft JSON exported'),
      ),
    );
  };

  const undo = () => session.undo();
  const redo = () => session.redo();

  /**
   * §3.8 导入落编辑器: ONE undoable `import-dashboard` group replaces the
   * whole configuration content (widgets/states/entityAliases plus the
   * optional timewindow/settings/filters set), merging the 补录 alias stubs
   * created in the dialog. Draft-only: meta (id/title/version) is untouched
   * and no query is invalidated until a real save.
   */
  const applyImportedConfiguration = (
    configuration: DashboardConfiguration,
    createdAliases: EntityAlias[],
  ): void => {
    session.write('import-dashboard', (draft) => {
      for (const key of Object.keys(draft)) {
        delete draft[key];
      }
      Object.assign(draft, configuration);
      if (!draft.entityAliases) {
        draft.entityAliases = {};
      }
      const aliases = draft.entityAliases;
      for (const stub of createdAliases) {
        aliases[stub.id] = stub;
      }
    });
    setSelectedWidgetId(null);
  };

  const t = (id: string, defaultMessage: string) => ({ id, defaultMessage });

  // ------------------------------------------------------------------
  // context menus + hotkeys (spec §3.3 / §3.2 paste combos)
  // ------------------------------------------------------------------
  const removeWidgetWithConfirm = (widgetId: string) => {
    const widget = configuration.widgets[widgetId];
    if (!widget) {
      return;
    }
    modal.confirm({
      title: formatMessage({
        id: 'editor.dashboard.widget.removeTitle',
        defaultMessage: 'Remove widget',
      }),
      content: formatMessage({
        id: 'editor.dashboard.widget.removeText',
        defaultMessage: 'This removes the widget from the layout.',
      }),
      okText: formatMessage({
        id: 'editor.dashboard.widget.remove',
        defaultMessage: 'Remove',
      }),
      cancelText: formatMessage({
        id: 'editor.common.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => {
        writeDraft(session, removeWidget({ widgetId }));
        setSelectedWidgetId(null);
      },
    });
  };

  const widgetMenu = (widgetId: string): MenuProps => {
    const layoutId = findWidgetLayout(configuration, rootStateId, widgetId);
    const reference = isReferenceWidget(configuration, widgetId);
    const items: MenuProps['items'] = [
      {
        key: 'edit',
        label: formatMessage({
          id: 'editor.dashboard.menu.edit',
          defaultMessage: 'Edit',
        }),
        onClick: () => setSelectedWidgetId(widgetId),
      },
    ];
    if (reference && layoutId) {
      items.push({
        key: 'replaceReference',
        label: formatMessage({
          id: 'editor.dashboard.menu.replaceReference',
          defaultMessage: 'Replace reference with copy',
        }),
        onClick: () => {
          writeDraft(
            session,
            replaceReferenceWithCopy({
              widgetId,
              stateId: rootStateId,
              layoutId,
            }),
          );
        },
      });
    }
    items.push(
      {
        key: 'copy',
        label: formatMessage({
          id: 'editor.dashboard.menu.copy',
          defaultMessage: 'Copy',
        }),
        onClick: () => {
          copyWidgetsToClipboard({
            configuration,
            widgetIds: [widgetId],
            stateId: rootStateId,
            layoutId: layoutId ?? 'main',
            dashboardId: meta.id?.id,
          });
        },
      },
      {
        key: 'copyReference',
        label: formatMessage({
          id: 'editor.dashboard.menu.copyReference',
          defaultMessage: 'Copy reference',
        }),
        onClick: () => {
          copyWidgetReferencesToClipboard({
            configuration,
            widgetIds: [widgetId],
            stateId: rootStateId,
            layoutId: layoutId ?? 'main',
            dashboardId: meta.id?.id,
          });
        },
      },
      {
        key: 'remove',
        danger: true,
        label: formatMessage({
          id: 'editor.dashboard.menu.remove',
          defaultMessage: 'Delete',
        }),
        onClick: () => removeWidgetWithConfirm(widgetId),
      },
    );
    return {
      items,
      'data-testid': `editor-widget-menu-${widgetId}`,
    } as MenuProps;
  };

  /** Paste into the active layout (single) or via the layout picker. */
  const pasteFlow = () => {
    const layoutCount = hasRightLayout ? 2 : 1;
    if (layoutCount === 1) {
      pasteFromClipboard({
        session,
        configuration,
        stateId: rootStateId,
        layoutId: 'main',
        dashboardId: meta.id?.id,
      });
      return;
    }
    dialogs.openDialog('select-target-layout', {
      layouts: [
        {
          id: 'main',
          name: formatMessage({
            id: 'editor.dashboard.layout.main',
            defaultMessage: 'Main layout',
          }),
        },
        {
          id: 'right',
          name: formatMessage({
            id: 'editor.dashboard.layout.right',
            defaultMessage: 'Right layout',
          }),
        },
      ],
      onPick: (layoutId: string) => {
        pasteFromClipboard({
          session,
          configuration,
          stateId: rootStateId,
          layoutId: layoutId === 'right' ? 'right' : 'main',
          dashboardId: meta.id?.id,
        });
      },
    });
  };

  const dashboardMenu: MenuProps = {
    items: [
      {
        key: 'settings',
        label: formatMessage({
          id: 'editor.dashboard.toolbar.settings',
          defaultMessage: 'Settings',
        }),
        onClick: () => dialogs.openDialog('dashboard-settings'),
      },
      {
        key: 'aliases',
        label: formatMessage({
          id: 'editor.dashboard.toolbar.aliases',
          defaultMessage: 'Aliases',
        }),
        onClick: () => dialogs.openDialog('manage-aliases'),
      },
      {
        key: 'paste',
        disabled: !hasClipboard() || getClipboard()?.mode !== 'copy',
        label: formatMessage({
          id: 'editor.dashboard.menu.paste',
          defaultMessage: 'Paste',
        }),
        onClick: pasteFlow,
      },
      {
        key: 'pasteReference',
        disabled: !canPasteWidgetReference({
          configuration,
          dashboardId: meta.id?.id,
          stateId: rootStateId,
        }),
        label: formatMessage({
          id: 'editor.dashboard.menu.pasteReference',
          defaultMessage: 'Paste reference',
        }),
        onClick: pasteFlow,
      },
      {
        key: 'moveWidgets',
        label: formatMessage({
          id: 'editor.dashboard.menu.moveAllWidgets',
          defaultMessage: 'Move all widgets',
        }),
        onClick: () => dialogs.openDialog('move-widgets'),
      },
    ],
    'data-testid': 'editor-dashboard-menu',
  } as MenuProps;

  /** True when the keystroke belongs to a text editor, not the canvas. */
  const hotkeyGuard = {
    enabled: (event: KeyboardEvent) => !isTypingTarget(event.target),
  };
  useHotkeys('ctrl+z, meta+z', undo, hotkeyGuard);
  useHotkeys('ctrl+y, meta+shift+z, ctrl+shift+z', redo, hotkeyGuard);
  useHotkeys(
    'ctrl+c, meta+c',
    () => {
      if (selectedWidgetId) {
        copyWidgetsToClipboard({
          configuration,
          widgetIds: [selectedWidgetId],
          stateId: rootStateId,
          layoutId:
            findWidgetLayout(configuration, rootStateId, selectedWidgetId) ??
            'main',
          dashboardId: meta.id?.id,
        });
      }
    },
    hotkeyGuard,
  );
  useHotkeys(
    'ctrl+r, meta+r',
    () => {
      if (selectedWidgetId) {
        copyWidgetReferencesToClipboard({
          configuration,
          widgetIds: [selectedWidgetId],
          stateId: rootStateId,
          layoutId:
            findWidgetLayout(configuration, rootStateId, selectedWidgetId) ??
            'main',
          dashboardId: meta.id?.id,
        });
      }
    },
    hotkeyGuard,
  );
  useHotkeys('ctrl+v, meta+v', pasteFlow, hotkeyGuard);
  useHotkeys('ctrl+i, meta+i', pasteFlow, hotkeyGuard);
  useHotkeys(
    'delete, backspace',
    () => {
      if (selectedWidgetId) {
        removeWidgetWithConfirm(selectedWidgetId);
      }
    },
    hotkeyGuard,
  );
  useHotkeys(
    'esc',
    () => {
      setSelectedWidgetId(null);
      dialogs.closeDialog();
    },
    hotkeyGuard,
  );

  return (
    <div
      ref={shellRef}
      data-testid="editor-shell"
      data-dashboard-id={meta.id?.id}
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <Space wrap align="center" size={4}>
        <Tooltip title={formatMessage(t('editor.common.save', 'Save'))}>
          <Button
            size="small"
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            data-testid="editor-toolbar-save"
            onClick={() => void save()}
          />
        </Tooltip>
        <Tooltip title={formatMessage(t('editor.common.undo', 'Undo'))}>
          <Button
            size="small"
            icon={<UndoOutlined />}
            disabled={!snapshot.canUndo}
            data-testid="editor-toolbar-undo"
            onClick={undo}
          />
        </Tooltip>
        <Tooltip title={formatMessage(t('editor.common.redo', 'Redo'))}>
          <Button
            size="small"
            icon={<RedoOutlined />}
            disabled={!snapshot.canRedo}
            data-testid="editor-toolbar-redo"
            onClick={redo}
          />
        </Tooltip>
        {hasRightLayout ? (
          <Tooltip
            title={formatMessage(
              t('editor.dashboard.toolbar.rightLayout', 'Right layout'),
            )}
          >
            <Button
              size="small"
              type={showRightLayout ? 'primary' : 'default'}
              icon={<LayoutOutlined />}
              data-testid="editor-toolbar-right-layout"
              onClick={() => setShowRightLayout((value) => !value)}
            />
          </Tooltip>
        ) : null}
        <Tooltip
          title={formatMessage(t('editor.dashboard.toolbar.add', 'Add widget'))}
        >
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            data-testid="editor-toolbar-add-widget"
            onClick={() => setAddWidgetOpen(true)}
          />
        </Tooltip>
        <Tooltip
          title={formatMessage(
            t('editor.dashboard.toolbar.manageLayouts', 'Manage layouts'),
          )}
        >
          <Button
            size="small"
            icon={<AppstoreOutlined />}
            data-testid="editor-toolbar-manage-layouts"
            onClick={() => dialogs.openDialog('manage-layouts')}
          />
        </Tooltip>
        <Tooltip
          title={formatMessage(
            t('editor.dashboard.toolbar.fullscreen', 'Fullscreen'),
          )}
        >
          <Button
            size="small"
            icon={
              fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />
            }
            data-testid="editor-toolbar-fullscreen"
            onClick={toggleFullscreen}
          />
        </Tooltip>
        <Tooltip
          title={formatMessage(t('editor.dashboard.toolbar.states', 'States'))}
        >
          <Button
            size="small"
            icon={<ProjectOutlined />}
            data-testid="editor-toolbar-states"
            onClick={() => dialogs.openDialog('manage-states')}
          />
        </Tooltip>
        <Tooltip
          title={formatMessage(
            t('editor.dashboard.toolbar.aliases', 'Aliases'),
          )}
        >
          <Button
            size="small"
            icon={<ClusterOutlined />}
            data-testid="editor-toolbar-aliases"
            onClick={() => dialogs.openDialog('manage-aliases')}
          />
        </Tooltip>
        <Tooltip
          title={formatMessage(
            t('editor.dashboard.toolbar.filters', 'Filters'),
          )}
        >
          <Button
            size="small"
            icon={<FilterOutlined />}
            data-testid="editor-toolbar-filters"
            onClick={() => dialogs.openDialog('filters')}
          />
        </Tooltip>
        <Tooltip
          title={formatMessage(
            t('editor.dashboard.toolbar.settings', 'Settings'),
          )}
        >
          <Button
            size="small"
            icon={<SettingOutlined />}
            data-testid="editor-toolbar-settings"
            onClick={() => dialogs.openDialog('dashboard-settings')}
          />
        </Tooltip>
        <Tooltip
          title={formatMessage(t('editor.dashboard.toolbar.import', 'Import'))}
        >
          <Button
            size="small"
            icon={<UploadOutlined />}
            data-testid="editor-toolbar-import"
            onClick={() => setImportOpen(true)}
          />
        </Tooltip>
        <Tooltip
          title={formatMessage(t('editor.dashboard.toolbar.export', 'Export'))}
        >
          <Button
            size="small"
            icon={<DownloadOutlined />}
            data-testid="editor-toolbar-export"
            onClick={() => {
              // §3.8 export the CURRENT DRAFT (what the user sees), never a
              // re-fetched server copy
              exportDraftDashboard({
                dashboard: meta,
                configuration: snapshot.current,
              });
              message.success(
                formatMessage(
                  t(
                    'editor.dashboard.contract.export.done',
                    'Draft JSON exported',
                  ),
                ),
              );
            }}
          />
        </Tooltip>
        <Popover
          title={formatMessage(
            t('editor.dashboard.toolbar.versionControl', 'Version control'),
          )}
          content={formatMessage(
            t(
              'editor.dashboard.toolbar.versionControlEmpty',
              'No version control actions are wired into this editor.',
            ),
          )}
          trigger="click"
        >
          <Button
            size="small"
            icon={<HistoryOutlined />}
            data-testid="editor-toolbar-version-control"
          />
        </Popover>
        <TimewindowPicker value={timewindow} onChange={setTimewindow} />
        <Button
          size="small"
          data-testid="editor-toolbar-exit-cancel"
          onClick={exitWithCancel}
        >
          {formatMessage(t('editor.common.exitEdit', 'Exit edit'))}
        </Button>
        <Button
          size="small"
          danger
          data-testid="editor-toolbar-exit-save"
          onClick={() => void exitWithSave()}
        >
          {formatMessage(t('editor.common.save', 'Save'))}
        </Button>
      </Space>

      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <Dropdown menu={dashboardMenu} trigger={['contextMenu']}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <EditorCanvasOverrideProvider
              displayGridAlways={dialogs.activeId === 'move-widgets'}
            >
              <EditorCanvas
                session={session}
                selectedWidgetId={selectedWidgetId}
                onSelectWidget={setSelectedWidgetId}
                dashboardTimewindow={timewindow}
                showRightLayout={showRightLayout}
                widgetMenu={widgetMenu}
              />
            </EditorCanvasOverrideProvider>
          </div>
        </Dropdown>
        <WidgetConfigPanel
          session={session}
          widgetId={selectedWidgetId}
          onClose={() => setSelectedWidgetId(null)}
        />
      </div>

      <ConflictDialog
        open={conflict !== null}
        serverDashboard={conflict?.serverDashboard ?? null}
        onLoadServer={() => handleConflictLoadServer()}
        onOverwrite={() => void handleConflictOverwrite()}
        onExportLocal={() => handleConflictExportLocal()}
        onClose={closeConflict}
      />
      <ImportDashboardDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onApply={applyImportedConfiguration}
      />
      <AddWidgetFlow
        session={session}
        open={addWidgetOpen}
        onClose={() => setAddWidgetOpen(false)}
        onAdded={setSelectedWidgetId}
      />
      <DialogHost controller={dialogs} />
    </div>
  );
}
