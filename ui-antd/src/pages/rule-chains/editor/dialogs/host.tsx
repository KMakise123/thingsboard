/**
 * DialogHost — stable seam of the rule-chain editor dialog system (M8
 * brief §3 wave C, DialogHost contract parity with the M7 dashboards
 * editor).
 *
 * FROZEN CONTRACT (waves 3 D/K2 fill bodies behind these exact paths and
 * signatures — do not rename):
 *
 *   ids            : RuleChainDialogId = 'add-node' | 'link-labels' |
 *                    'note' | 'nested-chain'
 *   dialog props   : { open: boolean; payload?: unknown; onClose: () => void }
 *                    (per-id payload types are additive refinements)
 *   dialog files   : dialogs/<id> path per the lazy map below (add-node is
 *                    a folder — dialogs/add-node with the frozen
 *                    node-config-form-slot.tsx seam inside).
 *
 * The host owns one "active dialog" slot: openDialog(id, payload?) swaps
 * the slot, closeDialog clears it. One dialog at a time is the TB editing
 * interaction shape.
 */

import { Spin } from 'antd';
import { lazy, Suspense, useState } from 'react';

export type RuleChainDialogId =
  | 'add-node'
  | 'link-labels'
  | 'note'
  | 'nested-chain';

/** Frozen prop signature of every rule-chain editor dialog. */
export interface RuleChainDialogProps<P = unknown> {
  open: boolean;
  payload?: P;
  onClose: () => void;
}

export interface RuleChainDialogsController {
  activeId: RuleChainDialogId | null;
  payload?: unknown;
  openDialog: (id: RuleChainDialogId, payload?: unknown) => void;
  closeDialog: () => void;
}

export function useRuleChainDialogs(): RuleChainDialogsController {
  const [active, setActive] = useState<{
    id: RuleChainDialogId;
    payload?: unknown;
  } | null>(null);
  return {
    activeId: active?.id ?? null,
    payload: active?.payload,
    openDialog: (id, payload) => setActive({ id, payload }),
    closeDialog: () => setActive(null),
  };
}

type DialogComponent = React.ComponentType<RuleChainDialogProps>;

/** Static lazy map — the stable registration point of all dialog ids. */
const DIALOG_COMPONENTS: Record<RuleChainDialogId, DialogComponent> = {
  'add-node': lazy(() =>
    import('./add-node').then((m) => ({ default: m.AddNodeDialog })),
  ),
  'link-labels': lazy(() =>
    import('./link-labels').then((m) => ({ default: m.LinkLabelsDialog })),
  ),
  note: lazy(() =>
    import('./note-edit').then((m) => ({ default: m.NoteEditDialog })),
  ),
  'nested-chain': lazy(() =>
    import('./nested-chain').then((m) => ({ default: m.NestedChainDialog })),
  ),
};

export interface DialogHostProps {
  controller: RuleChainDialogsController;
}

export function DialogHost({ controller }: DialogHostProps) {
  const { activeId, payload, closeDialog } = controller;
  if (!activeId) {
    return null;
  }
  const Dialog = DIALOG_COMPONENTS[activeId];
  return (
    <Suspense
      fallback={<Spin style={{ display: 'block', margin: '32px auto' }} />}
    >
      <Dialog open payload={payload} onClose={closeDialog} />
    </Suspense>
  );
}
