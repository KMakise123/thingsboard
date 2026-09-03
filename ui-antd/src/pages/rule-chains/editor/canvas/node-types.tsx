/**
 * React Flow node type components (M8 brief §3 wave C). Registered through
 * the module-level `RULE_CHAIN_NODE_TYPES` constant (React Flow requires a
 * stable identity — an inline object would remount every node per render).
 *
 *  - ruleNode : ui-ngx 170×50 rule-node card, left target + right source
 *               handle (descriptor in/out gating), search highlight ring.
 *  - inputNode: the INPUT virtual node — readonly, one right source handle,
 *               no context menu (the canvas filters its context events).
 *  - note     : sticky note — markdown body (react-markdown +
 *               rehype-sanitize), NodeResizer committed at resize end.
 *
 * All chrome colors come from antd tokens; note background/border colors
 * are persisted note DATA (user-editable), not theme chrome.
 */

import type { NodeProps } from '@xyflow/react';
import { Handle, NodeResizer, Position, useNodeId } from '@xyflow/react';
import { theme } from 'antd';
import type { CSSProperties } from 'react';
import { memo, useMemo } from 'react';
import Markdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

import { NOTE_DEFAULT_BACKGROUND_COLOR, namespaceNoteCss } from './note-css';
import type {
  InputFlowNode,
  NoteFlowNode,
  RuleNodeFlowNode,
} from './reconcile';

function RuleNodeView({ data, selected }: NodeProps<RuleNodeFlowNode>) {
  const { token } = theme.useToken();
  const style: CSSProperties = {
    width: '100%',
    height: '100%',
    borderRadius: token.borderRadiusLG,
    border: `1px solid ${selected ? token.colorPrimary : token.colorBorder}`,
    background: token.colorBgContainer,
    boxShadow: selected ? `0 0 0 2px ${token.colorPrimary}` : undefined,
    outline: data.highlighted ? `2px solid ${token.colorWarning}` : undefined,
    padding: '4px 10px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 2,
    overflow: 'hidden',
    cursor: 'pointer',
    boxSizing: 'border-box',
  };
  const handleStyle: CSSProperties = {
    width: 10,
    height: 10,
    background: token.colorPrimaryBorder,
    border: `1px solid ${token.colorBgContainer}`,
  };
  return (
    <div style={style} data-testid="rc-node" data-rc-clazz={data.clazz}>
      {data.inEnabled ? (
        <Handle type="target" position={Position.Left} style={handleStyle} />
      ) : null}
      <span
        style={{
          fontSize: token.fontSizeSM,
          fontWeight: token.fontWeightStrong,
          color: token.colorText,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {data.name}
      </span>
      <span
        style={{
          fontSize: token.fontSize - 2,
          color: token.colorTextSecondary,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={data.description ?? data.clazz}
      >
        {data.clazz.split('.').pop()}
      </span>
      {data.outEnabled ? (
        <Handle type="source" position={Position.Right} style={handleStyle} />
      ) : null}
    </div>
  );
}

export const RuleNodeViewComponent = memo(RuleNodeView);

function InputNodeView(_props: NodeProps<InputFlowNode>) {
  const { token } = theme.useToken();
  return (
    <div
      data-testid="rc-input-node"
      style={{
        width: '100%',
        height: '100%',
        borderRadius: token.borderRadiusLG,
        border: `1px dashed ${token.colorPrimary}`,
        background: token.colorPrimaryBg,
        color: token.colorPrimaryText,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: token.fontSizeSM,
        fontWeight: token.fontWeightStrong,
        letterSpacing: 1,
        boxSizing: 'border-box',
      }}
    >
      INPUT
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 10,
          height: 10,
          background: token.colorPrimary,
          border: `1px solid ${token.colorBgContainer}`,
        }}
      />
    </div>
  );
}

export const InputNodeViewComponent = memo(InputNodeView);

/**
 * Namespaced default markdown typography for notes
 * (applyDefaultMarkdownStyle; ui-ngx heading/padding override parity).
 */
const NOTE_DEFAULT_MARKDOWN_CSS = `
h1 { font-size: 1.6em; margin: 0.2em 0; }
h2 { font-size: 1.35em; margin: 0.2em 0; }
h3, h4, h5, h6 { margin: 0.2em 0; }
p { margin: 0.15em 0; }
ul, ol { margin: 0.15em 0; padding-left: 1.3em; }
`;

function NoteView({ data, selected }: NodeProps<NoteFlowNode>) {
  const { token } = theme.useToken();
  const nodeId = useNodeId() ?? '';
  const note = data.note;
  const scopeClass = `rc-note-${nodeId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const css = useMemo(() => {
    const parts: Array<string> = [];
    if (note.applyDefaultMarkdownStyle !== false) {
      parts.push(namespaceNoteCss(NOTE_DEFAULT_MARKDOWN_CSS, `.${scopeClass}`));
    }
    if (note.markdownCss) {
      parts.push(namespaceNoteCss(note.markdownCss, `.${scopeClass}`));
    }
    return parts.join('\n');
  }, [note.applyDefaultMarkdownStyle, note.markdownCss, scopeClass]);
  const style: CSSProperties = {
    width: '100%',
    height: '100%',
    background: note.backgroundColor ?? NOTE_DEFAULT_BACKGROUND_COLOR,
    border: `${note.borderWidth ?? 1}px solid ${note.borderColor ?? NOTE_DEFAULT_BACKGROUND_COLOR}`,
    borderRadius: token.borderRadiusSM,
    overflow: 'hidden',
    outline: selected
      ? `2px solid ${token.colorPrimary}`
      : data.highlighted
        ? `2px solid ${token.colorWarning}`
        : undefined,
    boxShadow: selected ? `0 0 0 2px ${token.colorPrimary}` : undefined,
  };
  return (
    <div style={style} data-testid="rc-note">
      <style>{css}</style>
      <div
        className={`${scopeClass} rc-note-body`}
        style={{
          width: '100%',
          height: '100%',
          overflow: 'auto',
          padding: 8,
          color: token.colorText,
          fontSize: token.fontSizeSM,
          boxSizing: 'border-box',
        }}
      >
        <Markdown rehypePlugins={[rehypeSanitize]}>
          {note.content ?? ''}
        </Markdown>
      </div>
      <NodeResizer
        isVisible={selected}
        minWidth={100}
        minHeight={80}
        color={token.colorPrimary}
      />
    </div>
  );
}

export const NoteNodeViewComponent = memo(NoteView);

/** Module-level nodeTypes constant (stable identity — never inline). */
export const RULE_CHAIN_NODE_TYPES = {
  ruleNode: RuleNodeViewComponent,
  inputNode: InputNodeViewComponent,
  note: NoteNodeViewComponent,
};
