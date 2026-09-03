/**
 * RuleChainCanvas — the @xyflow/react v12 semi-controlled rule-chain canvas
 * (M8 brief §2 半受控契约):
 *
 *  - nodes/edges derive from the `useEditorSession` snapshot through the
 *    reconciling deriveCanvas (identity-stable, P4 topology);
 *  - drag/resize/selection intermediate state is applied to a LOCAL mirror
 *    (applyNodeChanges) and never reaches the session writer;
 *  - commit boundaries only: onNodeDragStop → `moveNodes` (+ per-note
 *    `moveNote`), onConnect → label dialog → `addEdge` (INPUT links go
 *    through `setInputTarget` — the INPUT node has exactly ONE outgoing
 *    link, a new one replaces the old), Delete/paste via the shell;
 *  - external changes (undo/redo/paste/discard) flow back through the
 *    controlled props (derive → mirror resync, skipped mid-interaction);
 *  - edge reconnection is off (`edgesReconnectable={false}`, brief §0);
 *  - blank-canvas left-drag = box selection (`selectionOnDrag` +
 *    `panOnDrag={[1]}` middle-button panning — button 2 is reserved for
 *    the pane context menu, see inline note), ctrl+click adds to the
 *    selection (RF default multiSelectionKeyCode), zoom 0.5–2, initial
 *    viewport (0,0)/1, fitView off, translateExtent carries the
 *    adjustCanvasSize semantics.
 */

import type {
  EdgeChange,
  NodeChange,
  OnSelectionChangeParams,
} from '@xyflow/react';
import {
  applyEdgeChanges,
  applyNodeChanges,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { EditorSession } from '@/core/editor/session';
import { useEditorSession } from '@/core/editor/use-editor-session';
import {
  setInputTarget,
  writeRuleChainDraft,
} from '@/core/rulechain/rule-chain-draft';
import type { CanvasRuleChain } from '@/core/rulechain/types';
import { INPUT_NODE_UID } from '@/core/rulechain/types';

import '@xyflow/react/dist/style.css';

import { RULE_CHAIN_EDGE_TYPES } from './edge-types';
import { canvasExtent } from './geometry';
import type { CanvasSelection } from './interactions';
import { commitNodeDragStop } from './interactions';
import type { RuleNodeDescriptors } from './nested-chain';
import { RULE_CHAIN_NODE_TYPES } from './node-types';
import type {
  CanvasFlowEdge,
  CanvasFlowNode,
  DerivedCanvas,
} from './reconcile';
import { deriveCanvas } from './reconcile';

/** Fallback viewport estimate before the wrapper has been measured. */
const FALLBACK_VIEWPORT = { width: 800, height: 600 };

export interface CanvasCommands {
  /** Flow-space center of the visible canvas (note creation anchor). */
  getCenter(): { x: number; y: number };
  screenToFlowPosition(position: { x: number; y: number }): {
    x: number;
    y: number;
  };
}

export const RULE_NODE_DROP_MIME = 'application/x-rule-node-clazz';

export interface RuleChainCanvasProps {
  session: EditorSession<CanvasRuleChain>;
  descriptors: RuleNodeDescriptors;
  selection: CanvasSelection;
  onSelectionChange: (selection: CanvasSelection) => void;
  highlightQuery: string;
  /** Non-INPUT connection completed — shell opens the link-labels dialog. */
  onConnectRequest: (connection: {
    sourceUid: string;
    targetUid: string;
  }) => void;
  /** Library item dropped — shell opens the add-node dialog at `position`. */
  onDropNode: (clazz: string, position: { x: number; y: number }) => void;
  /** Register imperative helpers with the shell (note anchor, paste...). */
  onCommands?: (commands: CanvasCommands) => void;
  /** Edge hover-button actions (shell-owned: dialogs / delete). */
  edgeActions: {
    onEditLabels: (edgeId: string) => void;
    onDelete: (edgeId: string) => void;
  };
  /** Context menu channels (shell-owned; one controlled menu slot). */
  onPaneContextMenu?: (event: {
    clientX: number;
    clientY: number;
    preventDefault: () => void;
    stopPropagation?: () => void;
  }) => void;
  onNodeContextMenu?: (event: ReactMouseEvent, node: CanvasFlowNode) => void;
  onEdgeContextMenu?: (event: ReactMouseEvent, edge: CanvasFlowEdge) => void;
  /** test seam: fixed canvas dimensions (happy-dom has no layout). */
  width?: number;
  height?: number;
  /** test seam: node type overrides (P4 render-count probes). */
  nodeTypes?: typeof RULE_CHAIN_NODE_TYPES;
}

export function RuleChainCanvas(props: RuleChainCanvasProps) {
  return (
    <ReactFlowProvider>
      <RuleChainCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function RuleChainCanvasInner({
  session,
  descriptors,
  selection,
  onSelectionChange,
  highlightQuery,
  onConnectRequest,
  onDropNode,
  onCommands,
  edgeActions,
  onPaneContextMenu,
  onNodeContextMenu,
  onEdgeContextMenu,
  width,
  height,
  nodeTypes = RULE_CHAIN_NODE_TYPES,
}: RuleChainCanvasProps) {
  const snapshot = useEditorSession(session);
  const draft = snapshot.current;
  const { screenToFlowPosition } = useReactFlow();

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [measured, setMeasured] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) {
        setMeasured({ width: rect.width, height: rect.height });
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const viewportSize = {
    width: width ?? measured.width ?? FALLBACK_VIEWPORT.width,
    height: height ?? measured.height ?? FALLBACK_VIEWPORT.height,
  };

  // ------------------------------------------------------------------
  // derive: draft + UI channels → RF view-model (identity reconciled)
  // ------------------------------------------------------------------
  const edgeActionsRef = useRef(edgeActions);
  edgeActionsRef.current = edgeActions;
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const prevDerivedRef = useRef<DerivedCanvas | null>(null);
  const derived = useMemo(() => {
    const next = deriveCanvas(
      {
        draft,
        selection,
        descriptors,
        highlightQuery,
        hoveredEdgeId,
        edgeActions: {
          onEditLabels: (id) => edgeActionsRef.current.onEditLabels(id),
          onDelete: (id) => edgeActionsRef.current.onDelete(id),
        },
      },
      prevDerivedRef.current,
    );
    prevDerivedRef.current = next;
    return next;
  }, [draft, selection, descriptors, highlightQuery, hoveredEdgeId]);

  // ------------------------------------------------------------------
  // local interaction mirror (never a session write)
  // ------------------------------------------------------------------
  const [uiNodes, setUiNodes] = useState<Array<CanvasFlowNode>>(derived.nodes);
  const [uiEdges, setUiEdges] = useState<Array<CanvasFlowEdge>>(derived.edges);
  const interactingRef = useRef(false);

  useEffect(() => {
    if (interactingRef.current) {
      // mid-drag / mid-connection: RF holds the intermediate state; the
      // resync happens when the interaction ends and the commit re-derives.
      return;
    }
    setUiNodes(derived.nodes);
    setUiEdges(derived.edges);
  }, [derived]);

  const handleNodesChange = (changes: Array<NodeChange<CanvasFlowNode>>) => {
    setUiNodes((nodes) => applyNodeChanges(changes, nodes));
  };
  const handleEdgesChange = (changes: Array<EdgeChange<CanvasFlowEdge>>) => {
    setUiEdges((edges) => applyEdgeChanges(changes, edges));
  };

  const selectionKey = (params: OnSelectionChangeParams) =>
    `${params.nodes.map((node) => node.id).join(',')}|${params.edges
      .map((edge) => edge.id)
      .join(',')}`;
  const lastSelectionKeyRef = useRef('');
  const handleSelectionChange = (params: OnSelectionChangeParams) => {
    const key = selectionKey(params);
    if (key === lastSelectionKeyRef.current) {
      return;
    }
    lastSelectionKeyRef.current = key;
    onSelectionChange({
      nodeIds: params.nodes.map((node) => node.id),
      edgeIds: params.edges.map((edge) => edge.id),
    });
  };

  // ------------------------------------------------------------------
  // commit boundaries
  // ------------------------------------------------------------------
  const handleNodeDragStart = () => {
    interactingRef.current = true;
  };
  const handleNodeDragStop = (
    _event: unknown,
    _node: CanvasFlowNode,
    draggedNodes: Array<CanvasFlowNode>,
  ) => {
    interactingRef.current = false;
    commitNodeDragStop(
      session,
      draggedNodes.map((node) => ({
        id: node.id,
        position: {
          x: Number.isFinite(node.position.x) ? node.position.x : 0,
          y: Number.isFinite(node.position.y) ? node.position.y : 0,
        },
      })),
    );
  };

  const isValidConnection = (connection: {
    source?: string | null;
    target?: string | null;
  }) => {
    const { source, target } = connection;
    if (!source || !target || source === target) {
      return false;
    }
    if (source === INPUT_NODE_UID) {
      // INPUT → any node with a left handle (strict mode enforces handles);
      // uniqueness is enforced by REPLACING the old link on commit.
      return Boolean(draft.nodes[target]);
    }
    return Boolean(draft.nodes[source] && draft.nodes[target]);
  };

  const handleConnect = (connection: {
    source?: string | null;
    target?: string | null;
  }) => {
    interactingRef.current = false;
    const { source, target } = connection;
    if (!source || !target || !isValidConnection(connection)) {
      return;
    }
    if (source === INPUT_NODE_UID) {
      // no label dialog for the INPUT link (ui-ngx parity) — its 唯一出边
      // semantics replace the previous target
      writeRuleChainDraft(session, setInputTarget(target));
      return;
    }
    onConnectRequest({ sourceUid: source, targetUid: target });
  };

  // ------------------------------------------------------------------
  // library DnD → add-node dialog at the drop point
  // ------------------------------------------------------------------
  const handleDragOver = (event: React.DragEvent) => {
    if (event.dataTransfer.types.includes(RULE_NODE_DROP_MIME)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  };
  const handleDrop = (event: React.DragEvent) => {
    const clazz = event.dataTransfer.getData(RULE_NODE_DROP_MIME);
    if (!clazz) {
      return;
    }
    event.preventDefault();
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    onDropNode(clazz, position);
  };

  // imperative helpers for the shell (note anchor / paste landing)
  const commandsRef = useRef(onCommands);
  commandsRef.current = onCommands;
  useEffect(() => {
    const commands: CanvasCommands = {
      getCenter: () => {
        const rect = wrapperRef.current?.getBoundingClientRect();
        return screenToFlowPosition({
          x: (rect?.left ?? 0) + (rect?.width ?? 0) / 2,
          y: (rect?.top ?? 0) + (rect?.height ?? 0) / 2,
        });
      },
      screenToFlowPosition: (position) => screenToFlowPosition(position),
    };
    commandsRef.current?.(commands);
  }, [screenToFlowPosition]);

  const translateExtent = canvasExtent(draft, viewportSize);

  return (
    <div
      ref={wrapperRef}
      data-testid="rc-canvas"
      style={{ width: '100%', height: '100%', minHeight: 480 }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow<CanvasFlowNode, CanvasFlowEdge>
        nodes={uiNodes}
        edges={uiEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onSelectionChange={handleSelectionChange}
        nodeTypes={nodeTypes}
        edgeTypes={RULE_CHAIN_EDGE_TYPES}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onConnect={handleConnect}
        isValidConnection={isValidConnection}
        onEdgeMouseEnter={(_event, edge) => setHoveredEdgeId(edge.id)}
        onEdgeMouseLeave={() => setHoveredEdgeId(null)}
        onPaneContextMenu={(event) => onPaneContextMenu?.(event)}
        onNodeContextMenu={(event, node) => onNodeContextMenu?.(event, node)}
        onEdgeContextMenu={(event, edge) => onEdgeContextMenu?.(event, edge)}
        onConnectStart={() => {
          interactingRef.current = true;
        }}
        onConnectEnd={() => {
          interactingRef.current = false;
        }}
        selectionOnDrag
        // middle-drag pans; right-drag pan (2) is NOT enabled because React
        // Flow suppresses the pane context menu when button 2 is in
        // panOnDrag — and the ui-ngx blank-canvas menu is a checklist item
        panOnDrag={[1]}
        deleteKeyCode={null}
        fitView={false}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.5}
        maxZoom={2}
        translateExtent={translateExtent}
        edgesReconnectable={false}
        {...(width !== undefined ? { width } : {})}
        {...(height !== undefined ? { height } : {})}
      />
    </div>
  );
}
