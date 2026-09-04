/**
 * WidgetEditorShell — the widget editor layout (M9 brief §3 wave S items
 * 5/6/8): toolbar (save / save-as / run / tidy / undo / redo / fullscreen /
 * metadata toggle / exit + "?" help), react-resizable-panels split (left
 * code area with the four tabs TSX / CSS / Schema / defaultConfig — all
 * CodeEditor, right column stacked preview over console) and the metadata
 * sidebar.
 *
 * Undo boundaries (spec §5.3 behavior contract):
 *   - the four code tabs are bound controlled into the session with a
 *     per-tab coalesceKey; INSIDE CodeMirror ctrl+z drives CodeMirror's own
 *     stack (the shell hotkey yields — no preventDefault, no session.undo);
 *   - in the metadata sidebar / anywhere else, ctrl+z (and redo) drives the
 *     EditorSession, replacing the browser's native input undo;
 *   - save itself never enters the stack (baseline advance via session.save).
 *
 * Hotkeys (react-hotkeys-hook, enabled over form tags AND CodeMirror's
 * contenteditable so they fire from any focus area of the split layout):
 *   ctrl+s save · shift+ctrl+s save-as · ctrl+enter run (runId bump)
 *   shift+ctrl+f tidy (prettier standalone, active tab) · ctrl+q exit
 *   (through the leave guard) · "?" opens the shortcuts help (non-typing
 *   focus only).
 *
 * Dialogs go through the single-slot DialogHost (new / derive / save-as /
 * import); the leave guard + entry checkpoint are the shared core/editor
 * contract pieces (M7/M8 parity). The toolbar also carries the wave-3 D
 * areas: 恢复上次保存 (restore last saved) and 导入/导出 (§5.7 file ops).
 */

import {
  DownloadOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  RedoOutlined,
  RollbackOutlined,
  SaveOutlined,
  UndoOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { history } from '@umijs/max';
import type { TabsProps } from 'antd';
import {
  App,
  Button,
  Drawer,
  Modal,
  Space,
  Tabs,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useIntl } from 'react-intl';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { CodeEditor } from '@/components/code-editor';
import type { FormProperty } from '@/components/form-property/types';
import { useEditorEntryCheckpoint } from '@/core/editor/contract/use-editor-entry-checkpoint';
import {
  shouldPromptLeave,
  useLeaveGuard,
} from '@/core/editor/contract/use-leave-guard';
import type { EditorSession } from '@/core/editor/session';
import { useEditorSession } from '@/core/editor/use-editor-session';
import type { ImportWidgetDialogPayload } from './contract/import-dialog';
import type { SaveAsWidgetDialogPayload } from './contract/save-as-dialog';
import { useRestoreSaved } from './contract/use-restore-saved';
import { useWidgetSave } from './contract/use-widget-save';
import { DialogHost, useWidgetEditorDialogs } from './dialog-host';
import type { WidgetEditorDoc } from './draft-convert';
import {
  exportWidgetTypeDraft,
  importWidgetTypeFile,
  type WidgetImport,
  WidgetImportError,
  writeImportedDoc,
} from './import-export';
import { WidgetMetadataPanel } from './metadata';
import type { WidgetConsoleEntry, WidgetPreviewError } from './preview';
import { WidgetPreview } from './preview';
import { useCompileErrorExtensions } from './preview/compile-lint';
import { ConsolePane } from './preview/console';
import { tidySource } from './tidy';

/** True when the keystroke belongs to a text editor/form, not the page. */
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

/** True when focus is inside a CodeMirror surface (its own undo stack). */
export function isCodeMirrorTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return Boolean(el?.closest?.('.cm-editor'));
}

/** Hotkey options: fire from any focus area of the split layout. */
const ANY_FOCUS = {
  enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'] as const,
  enableOnContentEditable: true,
};

export type WidgetEditorTab = 'tsx' | 'css' | 'schema' | 'defaultConfig';

export interface WidgetEditorShellProps {
  session: EditorSession<WidgetEditorDoc>;
  /** fired after a successful save — the page mints/replaces the URL. */
  onSaved?: (saved: { id?: { id: string } }) => void;
}

/** Fullscreen API wrapper (dashboards-editor parity, local to this shell). */
function useFullscreen(target: React.RefObject<HTMLDivElement | null>) {
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => {
      setFullscreen((document.fullscreenElement ?? null) !== null);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggle = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else if (target.current) {
      void target.current.requestFullscreen();
    }
  };
  return { fullscreen, toggle };
}

/**
 * The Schema tab's text mirror: draft.settingsForm is structured, the tab
 * edits its JSON string. Parse-successful edits commit straight into the
 * session (coalesced); invalid intermediate text stays field-local (the
 * alert points at it) and the next undo/external change re-syncs the
 * mirror via the committed-text anchor — the undo-safe-value idea applied
 * to a CodeEditor surface.
 */
function SchemaTab({
  settingsForm,
  onCommit,
  testId,
}: {
  settingsForm: FormProperty[];
  onCommit: (next: FormProperty[]) => void;
  testId: string;
}) {
  const { formatMessage } = useIntl();
  const serialize = (value: FormProperty[]) => JSON.stringify(value, null, 2);

  const [text, setText] = useState(() => serialize(settingsForm));
  const [invalid, setInvalid] = useState(false);
  // The exact string the session currently reflects — divergence means an
  // external commit (undo/redo/tidy) and the mirror re-syncs (same paint).
  const committedRef = useRef(text);

  const committed = serialize(settingsForm);
  if (committed !== committedRef.current) {
    committedRef.current = committed;
    setText(committed);
    setInvalid(false);
  }

  const onChange = (next: string) => {
    setText(next);
    try {
      const parsed: unknown = JSON.parse(next);
      if (Array.isArray(parsed)) {
        committedRef.current = next;
        setInvalid(false);
        onCommit(parsed as FormProperty[]);
        return;
      }
    } catch {
      // fall through to the invalid state
    }
    setInvalid(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {invalid ? (
        <Typography.Text type="warning" data-testid={`${testId}-invalid`}>
          {formatMessage({
            id: 'editor.widget.editor.tab.schemaInvalid',
            defaultMessage: 'Invalid JSON — kept locally until it parses',
          })}
        </Typography.Text>
      ) : null}
      <CodeEditor
        value={text}
        language="json"
        onChange={onChange}
        height="420px"
        data-testid={`${testId}-editor`}
      />
    </div>
  );
}

export function WidgetEditorShell({
  session,
  onSaved,
}: WidgetEditorShellProps) {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();

  const snapshot = useEditorSession(session);
  const draft = snapshot.current;

  const shellRef = useRef<HTMLDivElement | null>(null);
  const { fullscreen, toggle: toggleFullscreen } = useFullscreen(shellRef);

  const [activeTab, setActiveTab] = useState<WidgetEditorTab>('tsx');
  const [metadataOpen, setMetadataOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  /**
   * M10 D1 family: the §3.8 exit confirm is a CONTROLLED Modal owned by
   * this shell (see discardAndExit) — never an imperative App-context
   * confirm, whose close sequence runs decoupled from this page.
   */
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [runId, setRunId] = useState(0);
  const [previewError, setPreviewError] = useState<WidgetPreviewError | null>(
    null,
  );
  const [consoleEntries, setConsoleEntries] = useState<WidgetConsoleEntry[]>(
    [],
  );
  const consoleIdRef = useRef(0);
  const dialogs = useWidgetEditorDialogs();

  // compile error → CM gutter diagnostics on the TSX tab (spec §5.5)
  const compileErrorExtensions = useCompileErrorExtensions(previewError);

  // 离开守卫 + 进入检查点 — shared core contract pieces (M7/M8 parity).
  const entryCheckpoint = useEditorEntryCheckpoint({ session, enabled: true });
  useLeaveGuard({ session, enabled: true });

  const { saving, saveDisabled, save, conflictDialog } = useWidgetSave({
    session,
    // Option C with an unknown server state: abandon the draft and exit.
    onAbandon: () => {
      entryCheckpoint.rollbackToEntry();
      history.push('/dashboards');
    },
  });

  // ---- wave-3 D toolbar area 1: restore last saved (§5.2) ----
  const { canRestore, restore } = useRestoreSaved({ session });

  const handleRestore = useCallback(() => {
    modal.confirm({
      title: formatMessage({
        id: 'editor.widget.io.restoreTitle',
        defaultMessage: 'Restore the last saved version?',
      }),
      content: formatMessage({
        id: 'editor.widget.io.restoreText',
        defaultMessage: 'The draft reverts to the most recently saved state.',
      }),
      okText: formatMessage({
        id: 'editor.widget.io.restoreOk',
        defaultMessage: 'Restore',
      }),
      onOk: () => {
        restore();
        message.success(
          formatMessage({
            id: 'editor.widget.io.restored',
            defaultMessage: 'Restored to the last saved version',
          }),
        );
      },
    });
  }, [modal, formatMessage, message, restore]);

  // ---- wave-3 D toolbar area 2: import / export (§5.7) ----
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = useCallback(() => {
    exportWidgetTypeDraft(session.current);
  }, [session]);

  const handleImportFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // reset so picking the same file again re-fires change
      event.target.value = '';
      if (!file) {
        return;
      }
      try {
        const result: WidgetImport = await importWidgetTypeFile(file);
        dialogs.openDialog('import', {
          result,
          onConfirm: (doc: WidgetEditorDoc) => writeImportedDoc(session, doc),
        } satisfies ImportWidgetDialogPayload);
      } catch (error) {
        if (error instanceof WidgetImportError) {
          const keyId =
            error.code.charAt(0).toUpperCase() + error.code.slice(1);
          message.error(
            formatMessage({
              id: `editor.widget.io.import${keyId}`,
              defaultMessage: 'Import refused',
            }),
          );
        } else {
          console.error('[widget import] read failed', error);
          message.error(
            formatMessage({
              id: 'editor.widget.io.importReadFailed',
              defaultMessage: 'Reading the file failed.',
            }),
          );
        }
      }
    },
    [dialogs, session, message, formatMessage],
  );

  const run = useCallback(() => {
    setRunId((current) => current + 1);
  }, []);

  const pushConsoleEntry = useCallback(
    (entry: { level: WidgetConsoleEntry['level']; text: string }) => {
      consoleIdRef.current += 1;
      const id = consoleIdRef.current;
      setConsoleEntries((entries) => [
        ...entries,
        { id, level: entry.level, text: entry.text, ts: Date.now() },
      ]);
    },
    [],
  );

  const discardAndExit = () => {
    entryCheckpoint.rollbackToEntry();
    // the widget-library listing belongs to the resources subsystem
    // (brief §0) — land on the TA dashboards face for now.
    history.push('/dashboards');
  };

  const exitEditor = () => {
    if (!shouldPromptLeave(session)) {
      discardAndExit();
      return;
    }
    setExitConfirmOpen(true);
  };

  const handleSave = useCallback(async () => {
    const saved = await save();
    if (saved) {
      onSaved?.(saved);
    }
  }, [save, onSaved]);

  const openSaveAs = useCallback(() => {
    const payload: SaveAsWidgetDialogPayload = {
      draft: session.current,
      onConfirm: (copy) => {
        session.enter(copy);
        void handleSave();
      },
    };
    dialogs.openDialog('save-as', payload);
  }, [dialogs, session, handleSave]);

  /** Tidy the ACTIVE tab (prettier standalone, lazy chunks). */
  const tidyActive = useCallback(async () => {
    try {
      const live = session.current;
      if (activeTab === 'tsx') {
        const formatted = await tidySource(live.source.tsx, 'tsx');
        session.write('tidy:tsx', (doc) => {
          doc.source.tsx = formatted;
        });
      } else if (activeTab === 'css') {
        const formatted = await tidySource(live.source.css, 'css');
        session.write('tidy:css', (doc) => {
          doc.source.css = formatted;
        });
      } else if (activeTab === 'defaultConfig') {
        const formatted = await tidySource(live.defaultConfig, 'json');
        session.write('tidy:defaultConfig', (doc) => {
          doc.defaultConfig = formatted;
        });
      } else {
        // schema: format the committed structured state (a locally invalid
        // mirror would fail prettier anyway — same error surface)
        const formatted = await tidySource(
          JSON.stringify(live.settingsForm, null, 2),
          'json',
        );
        const parsed = JSON.parse(formatted) as FormProperty[];
        session.write('tidy:schema', (doc) => {
          doc.settingsForm = parsed;
        });
      }
    } catch (error) {
      message.error(
        `${formatMessage({
          id: 'editor.widget.editor.toolbar.tidyFailed',
          defaultMessage: 'Tidy failed',
        })}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }, [activeTab, session, message, formatMessage]);

  // ------------------------------------------------------------------
  // hotkeys — see the module doc for the focus-routing matrix
  // ------------------------------------------------------------------
  useHotkeys(
    'ctrl+z, meta+z',
    (event) => {
      if (isCodeMirrorTarget(event.target)) {
        return; // CodeMirror's own undo — do not intercept
      }
      event.preventDefault();
      session.undo();
    },
    ANY_FOCUS,
  );
  useHotkeys(
    'ctrl+y, meta+shift+z, ctrl+shift+z',
    (event) => {
      if (isCodeMirrorTarget(event.target)) {
        return;
      }
      event.preventDefault();
      session.redo();
    },
    ANY_FOCUS,
  );
  useHotkeys(
    'ctrl+s, meta+s',
    (event) => {
      event.preventDefault();
      void handleSave();
    },
    ANY_FOCUS,
  );
  useHotkeys(
    'shift+ctrl+s, shift+meta+s',
    (event) => {
      event.preventDefault();
      openSaveAs();
    },
    ANY_FOCUS,
  );
  useHotkeys(
    'ctrl+enter, meta+enter',
    (event) => {
      event.preventDefault();
      run();
    },
    ANY_FOCUS,
  );
  useHotkeys(
    'shift+ctrl+f, shift+meta+f',
    (event) => {
      event.preventDefault();
      void tidyActive();
    },
    ANY_FOCUS,
  );
  useHotkeys(
    'ctrl+q, meta+q',
    (event) => {
      event.preventDefault();
      exitEditor();
    },
    ANY_FOCUS,
  );
  useHotkeys(
    '?',
    () => {
      setHelpOpen(true);
    },
    // '?' is a produced CHARACTER, not a physical code — match by event.key
    // (layout-independent) and only outside typing surfaces
    {
      useKey: true,
      enabled: (event) => !isTypingTarget(event.target),
    },
  );

  const writeSource =
    (
      label: string,
      coalesceKey: string,
      commit: (doc: WidgetEditorDoc, next: string) => void,
    ) =>
    (next: string) => {
      session.write(
        label,
        (doc) => {
          commit(doc, next);
        },
        { coalesceKey },
      );
    };

  const tabItems: TabsProps['items'] = [
    {
      key: 'tsx',
      label: formatMessage({
        id: 'editor.widget.editor.tab.tsx',
        defaultMessage: 'TSX',
      }),
      children: (
        <CodeEditor
          value={draft.source.tsx}
          language="tsx"
          extensions={compileErrorExtensions}
          onChange={writeSource('source.tsx', 'source:tsx', (doc, next) => {
            doc.source.tsx = next;
          })}
          height="420px"
          data-testid="we-tab-tsx-editor"
        />
      ),
    },
    {
      key: 'css',
      label: formatMessage({
        id: 'editor.widget.editor.tab.css',
        defaultMessage: 'CSS',
      }),
      children: (
        <CodeEditor
          value={draft.source.css}
          language="css"
          onChange={writeSource('source.css', 'source:css', (doc, next) => {
            doc.source.css = next;
          })}
          height="420px"
          data-testid="we-tab-css-editor"
        />
      ),
    },
    {
      key: 'schema',
      label: formatMessage({
        id: 'editor.widget.editor.tab.schema',
        defaultMessage: 'Schema',
      }),
      children: (
        <SchemaTab
          settingsForm={draft.settingsForm}
          onCommit={(next) =>
            session.write(
              'settingsForm',
              (doc) => {
                doc.settingsForm = next;
              },
              { coalesceKey: 'schema:text' },
            )
          }
          testId="we-tab-schema"
        />
      ),
    },
    {
      key: 'defaultConfig',
      label: formatMessage({
        id: 'editor.widget.editor.tab.defaultConfig',
        defaultMessage: 'defaultConfig',
      }),
      children: (
        <CodeEditor
          value={draft.defaultConfig}
          language="json"
          onChange={writeSource(
            'defaultConfig',
            'defaultConfig',
            (doc, next) => {
              doc.defaultConfig = next;
            },
          )}
          height="420px"
          data-testid="we-tab-default-config-editor"
        />
      ),
    },
  ];

  const helpRows: Array<[string, { id: string; defaultMessage: string }]> = [
    [
      'ctrl+s',
      { id: 'editor.widget.editor.help.save', defaultMessage: 'Save' },
    ],
    [
      'shift+ctrl+s',
      { id: 'editor.widget.editor.help.saveAs', defaultMessage: 'Save as' },
    ],
    [
      'ctrl+enter',
      { id: 'editor.widget.editor.help.run', defaultMessage: 'Run' },
    ],
    [
      'shift+ctrl+f',
      { id: 'editor.widget.editor.help.tidy', defaultMessage: 'Tidy' },
    ],
    [
      'ctrl+z',
      { id: 'editor.widget.editor.help.undo', defaultMessage: 'Undo' },
    ],
    [
      'ctrl+y',
      { id: 'editor.widget.editor.help.redo', defaultMessage: 'Redo' },
    ],
    [
      'ctrl+q',
      { id: 'editor.widget.editor.help.exit', defaultMessage: 'Exit' },
    ],
    ['?', { id: 'editor.widget.editor.help.help', defaultMessage: 'Help' }],
  ];

  return (
    <div
      ref={shellRef}
      data-testid="we-editor-shell"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        background: 'var(--ant-color-bg-base, inherit)',
      }}
    >
      <Space wrap align="center" size={4}>
        <Typography.Text strong style={{ marginRight: 8 }}>
          {draft.name}
        </Typography.Text>
        <Tooltip
          title={formatMessage({
            id: 'editor.widget.editor.toolbar.save',
            defaultMessage: 'Save',
          })}
        >
          <Button
            size="small"
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            disabled={saveDisabled && !saving}
            data-testid="we-toolbar-save"
            onClick={() => void handleSave()}
          />
        </Tooltip>
        <Tooltip
          title={formatMessage({
            id: 'editor.widget.editor.toolbar.saveAs',
            defaultMessage: 'Save as',
          })}
        >
          <Button
            size="small"
            data-testid="we-toolbar-save-as"
            onClick={openSaveAs}
          >
            {formatMessage({
              id: 'editor.widget.editor.toolbar.saveAs',
              defaultMessage: 'Save as',
            })}
          </Button>
        </Tooltip>
        <Tooltip
          title={formatMessage({
            id: 'editor.widget.io.restore',
            defaultMessage: 'Restore last saved',
          })}
        >
          <Button
            size="small"
            icon={<RollbackOutlined />}
            disabled={!canRestore}
            data-testid="we-toolbar-restore"
            onClick={handleRestore}
          />
        </Tooltip>
        <Tooltip
          title={formatMessage({
            id: 'editor.widget.editor.toolbar.run',
            defaultMessage: 'Run',
          })}
        >
          <Button
            size="small"
            data-testid="we-toolbar-run"
            onClick={run}
          >{`▶ ${formatMessage({
            id: 'editor.widget.editor.toolbar.run',
            defaultMessage: 'Run',
          })}`}</Button>
        </Tooltip>
        <Tooltip
          title={formatMessage({
            id: 'editor.widget.editor.toolbar.tidy',
            defaultMessage: 'Tidy',
          })}
        >
          <Button
            size="small"
            data-testid="we-toolbar-tidy"
            onClick={() => void tidyActive()}
          >
            {formatMessage({
              id: 'editor.widget.editor.toolbar.tidy',
              defaultMessage: 'Tidy',
            })}
          </Button>
        </Tooltip>
        <Tooltip
          title={formatMessage({
            id: 'editor.widget.io.import',
            defaultMessage: 'Import',
          })}
        >
          <Button
            size="small"
            icon={<UploadOutlined />}
            data-testid="we-toolbar-import"
            onClick={() => fileInputRef.current?.click()}
          />
        </Tooltip>
        <Tooltip
          title={formatMessage({
            id: 'editor.widget.io.export',
            defaultMessage: 'Export JSON',
          })}
        >
          <Button
            size="small"
            icon={<DownloadOutlined />}
            data-testid="we-toolbar-export"
            onClick={handleExport}
          />
        </Tooltip>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={(event) => void handleImportFile(event)}
          hidden
          data-testid="we-toolbar-import-input"
        />
        <Tooltip
          title={formatMessage({
            id: 'editor.widget.editor.toolbar.undo',
            defaultMessage: 'Undo',
          })}
        >
          <Button
            size="small"
            icon={<UndoOutlined />}
            disabled={!snapshot.canUndo}
            data-testid="we-toolbar-undo"
            onClick={() => session.undo()}
          />
        </Tooltip>
        <Tooltip
          title={formatMessage({
            id: 'editor.widget.editor.toolbar.redo',
            defaultMessage: 'Redo',
          })}
        >
          <Button
            size="small"
            icon={<RedoOutlined />}
            disabled={!snapshot.canRedo}
            data-testid="we-toolbar-redo"
            onClick={() => session.redo()}
          />
        </Tooltip>
        <Tooltip
          title={formatMessage({
            id: fullscreen
              ? 'editor.widget.editor.toolbar.exitFullscreen'
              : 'editor.widget.editor.toolbar.fullscreen',
            defaultMessage: 'Fullscreen',
          })}
        >
          <Button
            size="small"
            icon={
              fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />
            }
            data-testid="we-toolbar-fullscreen"
            onClick={toggleFullscreen}
          />
        </Tooltip>
        <Tooltip
          title={formatMessage({
            id: 'editor.widget.editor.toolbar.metadata',
            defaultMessage: 'Metadata',
          })}
        >
          <Button
            size="small"
            type={metadataOpen ? 'primary' : 'default'}
            data-testid="we-toolbar-metadata"
            onClick={() => setMetadataOpen((open) => !open)}
          >
            {formatMessage({
              id: 'editor.widget.editor.toolbar.metadata',
              defaultMessage: 'Metadata',
            })}
          </Button>
        </Tooltip>
        <Button size="small" data-testid="we-toolbar-exit" onClick={exitEditor}>
          {formatMessage({
            id: 'editor.widget.editor.toolbar.exit',
            defaultMessage: 'Exit',
          })}
        </Button>
        <Tooltip
          title={formatMessage({
            id: 'editor.widget.editor.toolbar.help',
            defaultMessage: 'Shortcuts',
          })}
        >
          <Button
            size="small"
            data-testid="we-toolbar-help"
            onClick={() => setHelpOpen(true)}
          >
            ?
          </Button>
        </Tooltip>
      </Space>

      <div style={{ flex: 1, minHeight: 480 }}>
        <Group
          orientation="horizontal"
          style={{ height: '100%', minHeight: 480 }}
          data-testid="we-split"
        >
          {metadataOpen ? (
            <>
              <Panel defaultSize="22%" minSize="15%" maxSize="45%">
                <WidgetMetadataPanel session={session} draft={draft} />
              </Panel>
              <Separator />
            </>
          ) : null}
          <Panel minSize="25%">
            <Tabs
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key as WidgetEditorTab)}
              items={tabItems}
              data-testid="we-tabs"
            />
          </Panel>
          <Separator />
          <Panel defaultSize="38%" minSize="20%">
            <Group
              orientation="vertical"
              style={{ height: '100%', minHeight: 480 }}
              data-testid="we-split-right"
            >
              <Panel defaultSize="65%" minSize="20%">
                <div style={{ height: '100%', overflow: 'auto' }}>
                  {previewError ? (
                    <Typography.Text
                      type="danger"
                      data-testid="we-preview-error"
                    >
                      {previewError.message}
                    </Typography.Text>
                  ) : null}
                  <WidgetPreview
                    tsx={draft.source.tsx}
                    css={draft.source.css}
                    settingsForm={draft.settingsForm}
                    defaultConfig={draft.defaultConfig}
                    runId={runId}
                    onError={setPreviewError}
                    onConsoleEntry={pushConsoleEntry}
                    onDefaultConfigChange={(next) =>
                      session.write('preview:defaultConfig', (doc) => {
                        doc.defaultConfig = next;
                      })
                    }
                  />
                </div>
              </Panel>
              <Separator />
              <Panel minSize="15%">
                <ConsolePane
                  entries={consoleEntries}
                  onClear={() => setConsoleEntries([])}
                />
              </Panel>
            </Group>
          </Panel>
        </Group>
      </div>

      <Drawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={formatMessage({
          id: 'editor.widget.editor.help.title',
          defaultMessage: 'Shortcuts',
        })}
        styles={{ wrapper: { width: 420, maxWidth: '85vw' } }}
        destroyOnHidden
        data-testid="we-help-drawer"
      >
        {helpRows.map(([keys, copy]) => (
          <div
            key={keys}
            style={{ display: 'flex', gap: 16, padding: '4px 0' }}
          >
            <Typography.Text code style={{ minWidth: 110 }}>
              {keys}
            </Typography.Text>
            <Typography.Text>
              {formatMessage({
                id: copy.id,
                defaultMessage: copy.defaultMessage,
              })}
            </Typography.Text>
          </div>
        ))}
      </Drawer>

      {conflictDialog}
      {/* M10 D1 family: controlled exit confirm (see discardAndExit) —
          owned by this page, so navigation unmounts it with the editor. */}
      <Modal
        open={exitConfirmOpen}
        title={formatMessage({
          id: 'editor.widget.editor.toolbar.exitDirtyTitle',
          defaultMessage: 'Unsaved changes',
        })}
        okText={formatMessage({
          id: 'editor.widget.editor.toolbar.exitDirtyOk',
          defaultMessage: 'Discard changes',
        })}
        okButtonProps={{
          danger: true,
          'data-testid': 'we-exit-confirm-ok',
        }}
        cancelText={formatMessage({
          id: 'editor.common.cancel',
          defaultMessage: 'Cancel',
        })}
        cancelButtonProps={{ 'data-testid': 'we-exit-confirm-cancel' }}
        onOk={() => {
          setExitConfirmOpen(false);
          discardAndExit();
        }}
        onCancel={() => setExitConfirmOpen(false)}
        maskClosable={false}
        data-testid="we-exit-confirm"
      >
        {formatMessage({
          id: 'editor.widget.editor.toolbar.exitDirtyText',
          defaultMessage:
            'The draft has unsaved changes; exiting discards them.',
        })}
      </Modal>
      <DialogHost controller={dialogs} />
    </div>
  );
}
