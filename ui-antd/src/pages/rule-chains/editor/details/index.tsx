/**
 * RuleNodeDetailsDrawer — the real three-tab node details drawer (M8 brief
 * §3 wave-3 K2; the wave-C path and prop signature are preserved, with the
 * sanctioned ADDITIVE `session?` prop).
 *
 *   props: { open, node, descriptor?, onClose, session? }
 *
 * Tabs (ui-ngx rulechain-page drawer parity — details/events/help):
 *  - details: node-level header fields + generated NodeConfigForm (details-tab);
 *  - events: ONLY for saved nodes (`ruleNodeId` present) — the wave-3 D slot
 *    component renders the DEBUG_RULE_NODE table;
 *  - help: descriptor HTML through DOMPurify + docUrl out-link (help-tab).
 *
 * Checkpoint contract (M7 WidgetConfigPanel paradigm): opening the drawer
 * takes `session.checkpoint('node-details:<uid>')`; edits write the MAIN
 * draft live (WYSIWYG — the canvas label follows every keystroke). Apply
 * drops the checkpoint and closes (edits stay, coalesced per channel via
 * `${uid}:fields` / `${uid}:configuration`); Cancel and every other close
 * path (✕ / mask / Esc) roll the whole post-open batch back as ONE group —
 * zero residue. Switching to another node while open keeps the previous
 * node's edits (documented M7 panel parity). Without a session the drawer is
 * a read-only display (placeholder-compatible usage).
 */
import { Button, Drawer, Space, Tabs } from 'antd';
import { useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import type { EditorCheckpoint, EditorSession } from '@/core/editor/session';
import type { CanvasNode, CanvasRuleChain } from '@/core/rulechain/types';
import type { RuleNodeComponentDescriptor } from '@/types/tb/rule-chain';

import { RuleNodeDetailsTab } from './details-tab';
import { RuleNodeEventsTab } from './events-tab';
import { RuleNodeHelpTab } from './help-tab';

export interface RuleNodeDetailsDrawerProps {
  open: boolean;
  node: CanvasNode;
  descriptor?: RuleNodeComponentDescriptor;
  onClose: () => void;
  /** Absent → read-only display (wave-C placeholder compatibility). */
  session?: EditorSession<CanvasRuleChain>;
}

export function RuleNodeDetailsDrawer({
  open,
  node,
  descriptor,
  onClose,
  session,
}: RuleNodeDetailsDrawerProps) {
  const { formatMessage } = useIntl();

  // §3.9 checkpoint: taken when the drawer opens FOR a node, before any
  // write; re-taken when another node is opened in place.
  const checkpointRef = useRef<EditorCheckpoint | null>(null);
  useEffect(() => {
    checkpointRef.current =
      open && session ? session.checkpoint(`node-details:${node.uid}`) : null;
    return () => {
      checkpointRef.current = null;
    };
  }, [session, open, node.uid]);

  const closeWithRollback = (): void => {
    checkpointRef.current?.rollback();
    checkpointRef.current = null;
    onClose();
  };

  const apply = (): void => {
    // commit: drop the checkpoint, the coalesced writes stay on the stack
    checkpointRef.current = null;
    onClose();
  };

  const nameMissing = node.name.trim() === '';

  const tabItems = [
    {
      key: 'details',
      label: formatMessage({
        id: 'editor.ruleNode.tab.details',
        defaultMessage: 'Details',
      }),
      children: (
        <RuleNodeDetailsTab
          node={node}
          descriptor={descriptor}
          session={session}
        />
      ),
    },
    ...(node.ruleNodeId
      ? [
          {
            key: 'events',
            label: formatMessage({
              id: 'editor.ruleNode.tab.events',
              defaultMessage: 'Events',
            }),
            children: (
              <RuleNodeEventsTab
                ruleNodeId={node.ruleNodeId.id}
                node={node}
                descriptor={descriptor}
                tenantId={session?.current.chain.tenantId?.id}
              />
            ),
          },
        ]
      : []),
    {
      key: 'help',
      label: formatMessage({
        id: 'editor.ruleNode.tab.help',
        defaultMessage: 'Help',
      }),
      children: <RuleNodeHelpTab descriptor={descriptor} clazz={node.clazz} />,
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={closeWithRollback}
      title={formatMessage({
        id: 'editor.ruleChain.canvas.details.title',
        defaultMessage: 'Rule node details',
      })}
      width={560}
      destroyOnHidden
      footer={
        session ? (
          <Space
            style={{ display: 'flex', justifyContent: 'flex-end' }}
            data-testid="rc-details-footer"
          >
            <Button data-testid="rc-details-cancel" onClick={closeWithRollback}>
              {formatMessage({
                id: 'editor.common.cancel',
                defaultMessage: 'Cancel',
              })}
            </Button>
            <Button
              type="primary"
              disabled={nameMissing}
              data-testid="rc-details-apply"
              onClick={apply}
            >
              {formatMessage({
                id: 'editor.ruleNode.details.apply',
                defaultMessage: 'Apply',
              })}
            </Button>
          </Space>
        ) : undefined
      }
      data-testid="rc-node-details-drawer"
    >
      <Tabs defaultActiveKey="details" items={tabItems} />
    </Drawer>
  );
}
