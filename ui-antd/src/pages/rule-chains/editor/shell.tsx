/**
 * RuleChainEditorShell — canvas editor layout (M8 brief §3 wave C): editor
 * toolbar on top (save/undo/redo/note/library/exit + chain name), the
 * semi-controlled rule-chain canvas in the center, the node-library drawer,
 * the details drawer SLOT (wave-3 K2 placeholder) and the DialogHost.
 *
 * House style parity with the M7 dashboards editor shell:
 *  - hotkeys through react-hotkeys-hook with the isTypingTarget guard
 *    (ctrl+z/y undo/redo, ctrl+s save, ctrl+a select-all, esc deselect,
 *    Delete delete-selected, alt+n note, ctrl+c/v copy/paste, ctrl+r
 *    nested chain);
 *  - context menus as one controlled slot (canvas/context-menu.tsx) with
 *    the four ui-ngx menu kinds (pane/node/edge/note);
 *  - the generic contract seam: useEditorEntryCheckpoint + useLeaveGuard
 *    (真实现) + saveRuleChainDraft slot (wave-3 D finalizes the 409 dialog).
 */
import {
  BookOutlined,
  HighlightOutlined,
  RedoOutlined,
  SaveOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { history } from '@umijs/max';
import type { MenuProps } from 'antd';
import { App, Button, Drawer, Space, Tooltip, Typography } from 'antd';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { useEditorEntryCheckpoint } from '@/core/editor/contract/use-editor-entry-checkpoint';
import {
  shouldPromptLeave,
  useLeaveGuard,
} from '@/core/editor/contract/use-leave-guard';
import type { EditorSession } from '@/core/editor/session';
import { useEditorSession } from '@/core/editor/use-editor-session';
import {
  addEdge,
  addNode,
  addNote,
  type NoteFieldPatch,
  updateEdgeLabels,
  updateNote,
  writeRuleChainDraft,
} from '@/core/rulechain/rule-chain-draft';
import type { CanvasRuleChain } from '@/core/rulechain/types';
import { INPUT_NODE_UID } from '@/core/rulechain/types';
import { saveRuleChain, saveRuleChainMetaData } from '@/services/tb/rule-chain';
import type {
  RuleChain,
  RuleNodeComponentDescriptor,
} from '@/types/tb/rule-chain';
import type { CanvasCommands } from './canvas';
import { RuleChainCanvas } from './canvas';
import {
  copySelectionToClipboard,
  getRuleChainClipboard,
  pasteRuleChainClipboard,
} from './canvas/clipboard';
import type { CanvasContextMenuState } from './canvas/context-menu';
import { CanvasContextMenu, contextMenuPoint } from './canvas/context-menu';
import type { CanvasSelection } from './canvas/interactions';
import {
  commitDeleteSelection,
  EMPTY_SELECTION,
  inputEdgeId,
} from './canvas/interactions';
import type { RuleNodeDescriptors } from './canvas/nested-chain';
import {
  applyNestedChainReplacement,
  buildNestedChainMetadata,
  validateNestedChainSelection,
} from './canvas/nested-chain';
import { useRuleChainSave } from './contract/use-rule-chain-save';
import { RuleNodeDetailsDrawer } from './details';
import { DialogHost, useRuleChainDialogs } from './dialogs/host';
import { NodeLibrary } from './node-library';
import {
  indexDescriptors,
  useRuleNodeComponents,
} from './node-library/use-rule-node-components';

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

export interface RuleChainEditorShellProps {
  session: EditorSession<CanvasRuleChain>;
}

export function RuleChainEditorShell({ session }: RuleChainEditorShellProps) {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();

  const snapshot = useEditorSession(session);
  const draft = snapshot.current;

  const [selection, setSelection] = useState<CanvasSelection>(EMPTY_SELECTION);
  const [searchText, setSearchText] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [detailsUid, setDetailsUid] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<CanvasContextMenuState | null>(
    null,
  );
  const dialogs = useRuleChainDialogs();
  const commandsRef = useRef<CanvasCommands | null>(null);

  const componentsQuery = useRuleNodeComponents();
  const descriptors: RuleNodeDescriptors = useMemo(
    () => indexDescriptors(componentsQuery.data ?? []),
    [componentsQuery.data],
  );

  // 取消退出 + 离开确认 — generic contract pieces (真实现, brief §3).
  const entryCheckpoint = useEditorEntryCheckpoint({ session, enabled: true });
  useLeaveGuard({ session, enabled: true });

  // ------------------------------------------------------------------
  // save + §3.8 409 three-option resolution (wave-3 D contract flow)
  // ------------------------------------------------------------------
  const { saving, save, conflictDialog } = useRuleChainSave({
    session,
    // Option C with an unknown server state: abandon the draft and exit.
    onAbandon: () => {
      entryCheckpoint.rollbackToEntry();
      history.push('/ruleChains');
    },
  });

  const exitEditor = () => {
    const discardAndExit = () => {
      entryCheckpoint.rollbackToEntry();
      history.push('/ruleChains');
    };
    if (!shouldPromptLeave(session)) {
      discardAndExit();
      return;
    }
    modal.confirm({
      title: formatMessage({
        id: 'editor.ruleChain.canvas.toolbar.exitDirtyTitle',
        defaultMessage: 'Unsaved changes',
      }),
      content: formatMessage({
        id: 'editor.ruleChain.canvas.toolbar.exitDirtyText',
        defaultMessage: 'The draft has unsaved changes; exiting discards them.',
      }),
      okText: formatMessage({
        id: 'editor.ruleChain.canvas.toolbar.exitDirtyOk',
        defaultMessage: 'Discard changes',
      }),
      okButtonProps: { danger: true },
      cancelText: formatMessage({
        id: 'editor.common.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: discardAndExit,
    });
  };

  // ------------------------------------------------------------------
  // selection-level actions
  // ------------------------------------------------------------------
  const allSelection = useCallback((): CanvasSelection => {
    const live = session.current;
    const nodeIds = Object.keys(live.nodes).concat(
      live.notes.map((note) => note.uid),
    );
    const edgeIds = live.edges.map((edge) => edge.id);
    const inputEdge = inputEdgeId(live.inputTargetUid);
    if (inputEdge) {
      edgeIds.push(inputEdge);
    }
    return { nodeIds, edgeIds };
  }, [session]);

  const selectAll = useCallback(() => {
    setSelection(allSelection());
  }, [allSelection]);

  const copySelected = useCallback(() => {
    copySelectionToClipboard({ draft: session.current, selection });
  }, [session, selection]);

  const pasteFromClipboard = useCallback(() => {
    const clip = getRuleChainClipboard();
    if (!clip) {
      return;
    }
    let at: { x: number; y: number } | undefined;
    if (clip.nodes.length > 0) {
      // 相对偏移落位: paste one grid-step off the copied bounding box
      const minX = Math.min(...clip.nodes.map((node) => node.x));
      const minY = Math.min(...clip.nodes.map((node) => node.y));
      at = { x: minX + 20, y: minY + 20 };
    }
    pasteRuleChainClipboard({ session, at });
  }, [session]);

  const deleteSelected = useCallback(() => {
    if (selection.nodeIds.length === 0 && selection.edgeIds.length === 0) {
      return;
    }
    commitDeleteSelection(session, selection);
    setSelection(EMPTY_SELECTION);
  }, [session, selection]);

  // ------------------------------------------------------------------
  // note flow (alt+n / menu)
  // ------------------------------------------------------------------
  const openNoteCreate = useCallback(() => {
    const position = commandsRef.current?.getCenter() ?? { x: 100, y: 100 };
    dialogs.openDialog('note', {
      mode: 'create',
      onConfirm: (fields: NoteFieldPatch) => {
        writeRuleChainDraft(
          session,
          addNote({ ...fields, x: position.x - 100, y: position.y - 60 }),
        );
      },
    });
  }, [dialogs, session]);

  const openNoteEdit = useCallback(
    (uid: string) => {
      const note = session.current.notes.find((entry) => entry.uid === uid);
      if (!note) {
        return;
      }
      dialogs.openDialog('note', {
        mode: 'edit',
        initial: { ...note },
        onConfirm: (fields: NoteFieldPatch) => {
          writeRuleChainDraft(session, updateNote(uid, fields));
        },
      });
    },
    [dialogs, session],
  );

  // ------------------------------------------------------------------
  // nested rule chain (ctrl+r / menu)
  // ------------------------------------------------------------------
  const createNestedChain = useCallback(
    async (name: string, nodeIds: Array<string>) => {
      const selectionSnapshot: CanvasSelection = {
        nodeIds,
        edgeIds: [],
      };
      try {
        // 1. POST the new chain entity (mints the id)
        const newChain: RuleChain = await saveRuleChain({
          name,
          type: 'CORE',
        } as RuleChain);
        const newChainId = newChain.id?.id;
        if (!newChainId) {
          throw new Error('rule chain id missing after save');
        }
        // 2. POST the exported sub-graph as the new chain's metadata
        const metadata = buildNestedChainMetadata(
          session.current,
          selectionSnapshot,
          descriptors,
          newChainId,
        );
        await saveRuleChainMetaData(metadata);
        // 3. replace the selection with ONE TbRuleChainInputNode (one group)
        writeRuleChainDraft(
          session,
          applyNestedChainReplacement({
            newChainId,
            newChainName: name,
            draft: session.current,
            selection: selectionSnapshot,
          }),
        );
        setSelection(EMPTY_SELECTION);
        message.success(
          formatMessage({
            id: 'editor.ruleChain.canvas.nestedChain.created',
            defaultMessage: 'Nested rule chain created',
          }),
        );
      } catch (error) {
        message.error(serverErrorText(error));
      }
    },
    [session, descriptors, message, formatMessage],
  );

  const openNestedChain = useCallback(() => {
    const live = session.current;
    const validation = validateNestedChainSelection(
      live,
      selection,
      descriptors,
    );
    if (validation.reason === 'noNodes') {
      message.warning(
        formatMessage({
          id: 'editor.ruleChain.canvas.nestedChain.noNodes',
          defaultMessage: 'Select the nodes to export first.',
        }),
      );
      return;
    }
    if (validation.reason === 'multipleEntries') {
      message.warning(
        formatMessage(
          {
            id: 'editor.ruleChain.canvas.nestedChain.multipleEntries',
            defaultMessage:
              'The sub-graph must contain at most one entry node without incoming links (found {count}).',
          },
          { count: validation.entryCount },
        ),
      );
      return;
    }
    const nodeIds = selection.nodeIds.filter((uid) => live.nodes[uid]);
    dialogs.openDialog('nested-chain', {
      nodeCount: nodeIds.length,
      onConfirm: (name: string) => {
        void createNestedChain(name, nodeIds);
      },
    });
  }, [
    session,
    selection,
    descriptors,
    message,
    formatMessage,
    dialogs,
    createNestedChain,
  ]);

  // ------------------------------------------------------------------
  // dialogs: add-node / link-labels
  // ------------------------------------------------------------------
  const openAddNode = useCallback(
    (clazz: string, position: { x: number; y: number }) => {
      const descriptor = descriptors[clazz];
      if (!descriptor) {
        return;
      }
      dialogs.openDialog('add-node', {
        descriptor,
        position,
        onConfirm: (result: {
          descriptor: RuleNodeComponentDescriptor;
          position: { x: number; y: number };
          name: string;
          configuration: Record<string, unknown>;
        }) => {
          writeRuleChainDraft(
            session,
            addNode({
              clazz: descriptor.clazz,
              name: result.name,
              x: result.position.x,
              y: result.position.y,
              configuration: result.configuration,
              configurationVersion: descriptor.configurationVersion ?? 0,
            }),
          );
        },
      });
    },
    [descriptors, dialogs, session],
  );

  /** ruleChainNode sources pull their labels from the target chain. */
  const sourceRuleChainIdOf = useCallback(
    (sourceUid: string): string | null => {
      const node = session.current.nodes[sourceUid];
      if (!node) {
        return null;
      }
      const definition =
        descriptors[node.clazz]?.configurationDescriptor?.nodeDefinition;
      if (!definition?.ruleChainNode) {
        return null;
      }
      const configured = node.configuration?.ruleChainId;
      return typeof configured === 'string'
        ? configured
        : ((configured as { id?: string } | undefined)?.id ?? null);
    },
    [session, descriptors],
  );

  const openLinkLabelsCreate = useCallback(
    (sourceUid: string, targetUid: string) => {
      const source = session.current.nodes[sourceUid];
      const definition =
        source &&
        descriptors[source.clazz]?.configurationDescriptor?.nodeDefinition;
      dialogs.openDialog('link-labels', {
        mode: 'create',
        sourceUid,
        targetUid,
        initialLabels: [],
        candidateLabels: definition?.relationTypes ?? [],
        allowCustom: definition?.customRelations === true,
        sourceRuleChainId: sourceRuleChainIdOf(sourceUid),
        onConfirm: (labels: Array<string>) => {
          writeRuleChainDraft(
            session,
            addEdge({ sourceUid, targetUid, labels }),
          );
        },
      });
    },
    [session, dialogs, descriptors, sourceRuleChainIdOf],
  );

  const openLinkLabelsEdit = useCallback(
    (edgeId: string) => {
      const edge = session.current.edges.find((entry) => entry.id === edgeId);
      if (!edge) {
        return;
      }
      const source = session.current.nodes[edge.sourceUid];
      const definition =
        source &&
        descriptors[source.clazz]?.configurationDescriptor?.nodeDefinition;
      dialogs.openDialog('link-labels', {
        mode: 'edit',
        edgeId,
        sourceUid: edge.sourceUid,
        initialLabels: [...edge.labels],
        candidateLabels: definition?.relationTypes ?? [],
        allowCustom: definition?.customRelations === true,
        sourceRuleChainId: sourceRuleChainIdOf(edge.sourceUid),
        onConfirm: (labels: Array<string>) => {
          writeRuleChainDraft(session, updateEdgeLabels(edgeId, labels));
        },
      });
    },
    [session, dialogs, descriptors, sourceRuleChainIdOf],
  );

  const edgeActions = useMemo(
    () => ({
      onEditLabels: (edgeId: string) => openLinkLabelsEdit(edgeId),
      onDelete: (edgeId: string) => {
        commitDeleteSelection(session, {
          nodeIds: [],
          edgeIds: [edgeId],
        });
      },
    }),
    [openLinkLabelsEdit, session],
  );

  // ------------------------------------------------------------------
  // context menus (four kinds, one slot)
  // ------------------------------------------------------------------
  const openMenuAt = (
    event: {
      clientX: number;
      clientY: number;
      preventDefault: () => void;
      stopPropagation?: () => void;
    },
    menu: CanvasContextMenuState['menu'],
  ) => {
    event.preventDefault();
    event.stopPropagation?.();
    setContextMenu({ ...contextMenuPoint(event), menu });
  };

  const paneMenu = (): MenuProps =>
    ({
      items: [
        {
          key: 'copySelected',
          label: formatMessage({
            id: 'editor.ruleChain.canvas.menu.copySelected',
            defaultMessage: 'Copy selected',
          }),
          disabled:
            selection.nodeIds.length === 0 && selection.edgeIds.length === 0,
          onClick: copySelected,
        },
        {
          key: 'paste',
          label: formatMessage({
            id: 'editor.ruleChain.canvas.menu.paste',
            defaultMessage: 'Paste',
          }),
          disabled: !getRuleChainClipboard(),
          onClick: pasteFromClipboard,
        },
        {
          key: 'addNote',
          label: formatMessage({
            id: 'editor.ruleChain.canvas.menu.addNote',
            defaultMessage: 'Add note',
          }),
          onClick: openNoteCreate,
        },
        {
          key: 'deselectAll',
          label: formatMessage({
            id: 'editor.ruleChain.canvas.menu.deselectAll',
            defaultMessage: 'Deselect all',
          }),
          disabled:
            selection.nodeIds.length === 0 && selection.edgeIds.length === 0,
          onClick: () => setSelection(EMPTY_SELECTION),
        },
        { type: 'divider' as const },
        {
          key: 'createNestedChain',
          label: formatMessage({
            id: 'editor.ruleChain.canvas.menu.createNestedChain',
            defaultMessage: 'Create nested rule chain',
          }),
          disabled: selection.nodeIds.length === 0,
          onClick: openNestedChain,
        },
        {
          key: 'deleteSelected',
          label: formatMessage({
            id: 'editor.ruleChain.canvas.menu.deleteSelected',
            defaultMessage: 'Delete selected',
          }),
          danger: true,
          disabled:
            selection.nodeIds.length === 0 && selection.edgeIds.length === 0,
          onClick: deleteSelected,
        },
        {
          key: 'selectAll',
          label: formatMessage({
            id: 'editor.ruleChain.canvas.menu.selectAll',
            defaultMessage: 'Select all',
          }),
          onClick: selectAll,
        },
        { type: 'divider' as const },
        {
          key: 'applyChanges',
          label: formatMessage({
            id: 'editor.ruleChain.canvas.menu.applyChanges',
            defaultMessage: 'Apply changes',
          }),
          disabled: !snapshot.dirty,
          onClick: () => void save(),
        },
        {
          key: 'discardChanges',
          label: formatMessage({
            id: 'editor.ruleChain.canvas.menu.discardChanges',
            defaultMessage: 'Discard changes',
          }),
          disabled: !snapshot.dirty,
          onClick: () => entryCheckpoint.rollbackToEntry(),
        },
      ],
      'data-testid': 'rc-pane-menu',
    }) as MenuProps;

  const nodeMenu = (nodeId: string) => {
    if (nodeId === INPUT_NODE_UID) {
      return undefined; // INPUT has no context menu (brief §3)
    }
    return {
      items: [
        {
          key: 'details',
          label: formatMessage({
            id: 'editor.ruleChain.canvas.menu.details',
            defaultMessage: 'Details',
          }),
          onClick: () => setDetailsUid(nodeId),
        },
        {
          key: 'copy',
          label: formatMessage({
            id: 'editor.ruleChain.canvas.menu.copy',
            defaultMessage: 'Copy',
          }),
          onClick: () =>
            copySelectionToClipboard({
              draft: session.current,
              selection: { nodeIds: [nodeId], edgeIds: [] },
            }),
        },
        {
          key: 'delete',
          danger: true,
          label: formatMessage({
            id: 'editor.ruleChain.canvas.menu.delete',
            defaultMessage: 'Delete',
          }),
          onClick: () => {
            commitDeleteSelection(session, {
              nodeIds: [nodeId],
              edgeIds: [],
            });
            setSelection(EMPTY_SELECTION);
          },
        },
      ],
      'data-testid': `rc-node-menu-${nodeId}`,
    } as MenuProps;
  };

  const edgeMenu = (edgeId: string) => {
    const isInputEdge = edgeId.startsWith(`${INPUT_NODE_UID}->`);
    const items: MenuProps['items'] = [];
    if (!isInputEdge) {
      items.push({
        key: 'details',
        label: formatMessage({
          id: 'editor.ruleChain.canvas.menu.details',
          defaultMessage: 'Details',
        }),
        onClick: () => openLinkLabelsEdit(edgeId),
      });
    }
    items.push({
      key: 'delete',
      danger: true,
      label: formatMessage({
        id: 'editor.ruleChain.canvas.menu.delete',
        defaultMessage: 'Delete',
      }),
      onClick: () => {
        commitDeleteSelection(session, { nodeIds: [], edgeIds: [edgeId] });
      },
    });
    return {
      items,
      'data-testid': `rc-edge-menu-${edgeId}`,
    } as MenuProps;
  };

  const noteMenu = (noteUid: string): MenuProps =>
    ({
      items: [
        {
          key: 'edit',
          label: formatMessage({
            id: 'editor.ruleChain.canvas.menu.editNote',
            defaultMessage: 'Edit note',
          }),
          onClick: () => openNoteEdit(noteUid),
        },
        {
          key: 'copy',
          label: formatMessage({
            id: 'editor.ruleChain.canvas.menu.copy',
            defaultMessage: 'Copy',
          }),
          onClick: () =>
            copySelectionToClipboard({
              draft: session.current,
              selection: { nodeIds: [noteUid], edgeIds: [] },
            }),
        },
        {
          key: 'delete',
          danger: true,
          label: formatMessage({
            id: 'editor.ruleChain.canvas.menu.delete',
            defaultMessage: 'Delete',
          }),
          onClick: () => {
            commitDeleteSelection(session, {
              nodeIds: [noteUid],
              edgeIds: [],
            });
          },
        },
      ],
      'data-testid': `rc-note-menu-${noteUid}`,
    }) as MenuProps;

  // ------------------------------------------------------------------
  // hotkeys (typing-target guard, M7 parity)
  // ------------------------------------------------------------------
  const hotkeyGuard = {
    enabled: (event: KeyboardEvent) => !isTypingTarget(event.target),
  };
  useHotkeys('ctrl+z, meta+z', () => session.undo(), hotkeyGuard);
  useHotkeys(
    'ctrl+y, meta+shift+z, ctrl+shift+z',
    () => session.redo(),
    hotkeyGuard,
  );
  useHotkeys(
    'ctrl+s, meta+s',
    (event) => {
      event.preventDefault();
      void save();
    },
    hotkeyGuard,
  );
  useHotkeys(
    'ctrl+a, meta+a',
    (event) => {
      event.preventDefault();
      selectAll();
    },
    hotkeyGuard,
  );
  useHotkeys(
    'esc',
    () => {
      setSelection(EMPTY_SELECTION);
      setContextMenu(null);
      dialogs.closeDialog();
    },
    hotkeyGuard,
  );
  useHotkeys('delete, backspace', deleteSelected, hotkeyGuard);
  useHotkeys(
    'alt+n',
    (event) => {
      event.preventDefault();
      openNoteCreate();
    },
    hotkeyGuard,
  );
  useHotkeys('ctrl+c, meta+c', copySelected, hotkeyGuard);
  useHotkeys('ctrl+v, meta+v', pasteFromClipboard, hotkeyGuard);
  useHotkeys(
    'ctrl+r, meta+r',
    (event) => {
      event.preventDefault();
      openNestedChain();
    },
    hotkeyGuard,
  );

  const detailsNode = detailsUid ? draft.nodes[detailsUid] : undefined;

  return (
    <div
      data-testid="rc-editor-shell"
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <Space wrap align="center" size={4}>
        <Typography.Text strong style={{ marginRight: 8 }}>
          {draft.chain.name}
        </Typography.Text>
        <Tooltip
          title={formatMessage({
            id: 'editor.common.save',
            defaultMessage: 'Save',
          })}
        >
          <Button
            size="small"
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            data-testid="rc-toolbar-save"
            onClick={() => void save()}
          />
        </Tooltip>
        <Tooltip
          title={formatMessage({
            id: 'editor.common.undo',
            defaultMessage: 'Undo',
          })}
        >
          <Button
            size="small"
            icon={<UndoOutlined />}
            disabled={!snapshot.canUndo}
            data-testid="rc-toolbar-undo"
            onClick={() => session.undo()}
          />
        </Tooltip>
        <Tooltip
          title={formatMessage({
            id: 'editor.common.redo',
            defaultMessage: 'Redo',
          })}
        >
          <Button
            size="small"
            icon={<RedoOutlined />}
            disabled={!snapshot.canRedo}
            data-testid="rc-toolbar-redo"
            onClick={() => session.redo()}
          />
        </Tooltip>
        <Tooltip
          title={formatMessage({
            id: 'editor.ruleChain.canvas.toolbar.addNote',
            defaultMessage: 'Add note',
          })}
        >
          <Button
            size="small"
            icon={<HighlightOutlined />}
            data-testid="rc-toolbar-add-note"
            onClick={openNoteCreate}
          />
        </Tooltip>
        <Tooltip
          title={formatMessage({
            id: 'editor.ruleChain.canvas.toolbar.library',
            defaultMessage: 'Node library',
          })}
        >
          <Button
            size="small"
            type={libraryOpen ? 'primary' : 'default'}
            icon={<BookOutlined />}
            data-testid="rc-toolbar-library"
            onClick={() => setLibraryOpen((open) => !open)}
          />
        </Tooltip>
        <Button size="small" data-testid="rc-toolbar-exit" onClick={exitEditor}>
          {formatMessage({
            id: 'editor.ruleChain.canvas.toolbar.exit',
            defaultMessage: 'Exit',
          })}
        </Button>
      </Space>

      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'stretch',
          minHeight: 480,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <RuleChainCanvas
            session={session}
            descriptors={descriptors}
            selection={selection}
            onSelectionChange={setSelection}
            highlightQuery={searchText}
            onConnectRequest={(connection) =>
              openLinkLabelsCreate(connection.sourceUid, connection.targetUid)
            }
            onDropNode={openAddNode}
            onCommands={(commands) => {
              commandsRef.current = commands;
            }}
            edgeActions={edgeActions}
            onPaneContextMenu={(event) => openMenuAt(event, paneMenu())}
            onNodeContextMenu={(event, node) => {
              const menu =
                node.type === 'note' ? noteMenu(node.id) : nodeMenu(node.id);
              if (!menu) {
                event.preventDefault();
                return; // INPUT node: menu suppressed
              }
              openMenuAt(event, menu);
            }}
            onEdgeContextMenu={(event, edge) =>
              openMenuAt(event, edgeMenu(edge.id))
            }
          />
        </div>
      </div>

      <NodeLibraryDrawer
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        descriptors={componentsQuery.data}
        loading={componentsQuery.isPending}
        searchText={searchText}
        onSearchTextChange={setSearchText}
      />

      {detailsNode ? (
        <RuleNodeDetailsDrawer
          open={Boolean(detailsNode)}
          node={detailsNode}
          descriptor={descriptors[detailsNode.clazz]}
          onClose={() => setDetailsUid(null)}
        />
      ) : null}

      <CanvasContextMenu
        state={contextMenu}
        onClose={() => setContextMenu(null)}
      />
      {conflictDialog}
      <DialogHost controller={dialogs} />
    </div>
  );
}

function NodeLibraryDrawer(args: {
  open: boolean;
  onClose: () => void;
  descriptors: Array<RuleNodeComponentDescriptor> | undefined;
  loading: boolean;
  searchText: string;
  onSearchTextChange: (text: string) => void;
}) {
  return (
    <Drawer
      open={args.open}
      onClose={args.onClose}
      title={undefined}
      placement="left"
      width={320}
      destroyOnHidden
      mask={false}
    >
      <NodeLibrary
        descriptors={args.descriptors}
        loading={args.loading}
        searchText={args.searchText}
        onSearchTextChange={args.onSearchTextChange}
      />
    </Drawer>
  );
}
