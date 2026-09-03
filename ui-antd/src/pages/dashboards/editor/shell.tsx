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
 * Exit semantics (§3.1): save → naive save → back to the readonly view
 * route; cancel → session reset to the entry baseline → back. Both paths
 * end in readonly; the D wave layers the leave-guard + 409 flow on top
 * (contract/ placeholders already wired).
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
import { App, Button, Popover, Space, Tooltip } from 'antd';
import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { TimewindowPicker } from '@/components/dashboard/timewindow/TimewindowPicker';
import { serverErrorText } from '@/components/entities/server-error-text';
import { getRootStateId } from '@/core/dashboard/model';
import type { EditorSession } from '@/core/editor/session';
import { useEditorSession } from '@/core/editor/use-editor-session';
import { exportDashboardToFile } from '@/pages/dashboards/list/import-export';
import type { Dashboard, DashboardConfiguration } from '@/types/tb/dashboard';
import {
  createDefaultDashboardTimewindow,
  type Timewindow,
} from '@/types/tb/timewindow';
import { EditorCanvas } from './canvas/EditorCanvas';
import { ConflictDialog } from './contract/ConflictDialog';
import { importDashboardIntoEditor } from './contract/import-dashboard';
import {
  type SaveOutcome,
  saveDashboardDraft,
} from './contract/save-with-conflict';
import { useLeaveGuard } from './contract/use-leave-guard';
import { AddWidgetFlow } from './dialogs/add-widget';
import { DialogHost, useEditorDialogs } from './dialogs/host';
import { WidgetConfigPanel } from './panels';

export interface EditorShellProps {
  session: EditorSession<DashboardConfiguration>;
  /** loaded server entity (id / title / version for the save path). */
  dashboard: Dashboard;
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
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const snapshot = useEditorSession(session);
  const configuration = snapshot.current;

  const [meta, setMeta] = useState<Dashboard>(dashboard);
  const [saving, setSaving] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [showRightLayout, setShowRightLayout] = useState(false);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [addWidgetOpen, setAddWidgetOpen] = useState(false);

  // entry baseline for the cancel path (ui-ngx prevDashboard semantics):
  // captured once at edit-mode entry, BEFORE any edit or save.
  const [entryBaseline] = useState<DashboardConfiguration>(
    () => session.current,
  );
  useLeaveGuard({ session, enabled: true });

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { fullscreen, toggle: toggleFullscreen } = useFullscreen(shellRef);

  const backToView = () => {
    history.push(`/dashboards/${meta.id?.id}`);
  };

  const applyOutcome = async (outcome: SaveOutcome): Promise<boolean> => {
    if (outcome.status === 'saved') {
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
      return true;
    }
    if (outcome.status === 'conflict') {
      setConflictOpen(true);
      return false;
    }
    message.error(
      `${formatMessage({
        id: 'editor.dashboard.toolbar.saveFailed',
        defaultMessage: 'Save failed',
      })}: ${serverErrorText(outcome.error)}`,
    );
    return false;
  };

  const save = async (): Promise<boolean> => {
    setSaving(true);
    try {
      return await applyOutcome(
        await saveDashboardDraft({ session, dashboard: meta }),
      );
    } finally {
      setSaving(false);
    }
  };

  const exitWithSave = async () => {
    if (await save()) {
      backToView();
    }
  };

  const exitWithCancel = () => {
    // 整体撤回进入前的基线 — a fresh enter() resets draft + history.
    session.enter(entryBaseline);
    backToView();
  };

  const undo = () => session.undo();
  const redo = () => session.redo();

  const onImportFile = async (file: File) => {
    try {
      const imported = await importDashboardIntoEditor(file);
      session.enter(
        imported.configuration ?? {
          widgets: {},
          states: {},
          entityAliases: {},
        },
      );
      setMeta(imported);
      setSelectedWidgetId(null);
    } catch (error) {
      message.error(
        `${formatMessage({
          id: 'editor.dashboard.toolbar.importFailed',
          defaultMessage: 'Import failed',
        })}: ${serverErrorText(error)}`,
      );
    }
  };

  const t = (id: string, defaultMessage: string) => ({ id, defaultMessage });

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
            onClick={() => fileInputRef.current?.click()}
          />
        </Tooltip>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          data-testid="editor-import-input"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) {
              void onImportFile(file);
            }
          }}
        />
        <Tooltip
          title={formatMessage(t('editor.dashboard.toolbar.export', 'Export'))}
        >
          <Button
            size="small"
            icon={<DownloadOutlined />}
            data-testid="editor-toolbar-export"
            onClick={() => {
              void exportDashboardToFile(meta.id?.id ?? '');
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <EditorCanvas
            session={session}
            selectedWidgetId={selectedWidgetId}
            onSelectWidget={setSelectedWidgetId}
            dashboardTimewindow={timewindow}
            showRightLayout={showRightLayout}
          />
        </div>
        <WidgetConfigPanel
          session={session}
          widgetId={selectedWidgetId}
          onClose={() => setSelectedWidgetId(null)}
        />
      </div>

      <ConflictDialog
        open={conflictOpen}
        serverDashboard={null}
        onLoadServer={() => setConflictOpen(false)}
        onOverwrite={() => setConflictOpen(false)}
        onExportLocal={() => setConflictOpen(false)}
        onClose={() => setConflictOpen(false)}
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
