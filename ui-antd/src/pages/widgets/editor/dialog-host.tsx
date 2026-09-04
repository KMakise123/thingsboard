/**
 * DialogHost — stable seam of the widget editor dialog system (M9 brief §3
 * wave S, house-style parity with the M8 rule-chains editor's dialogs/host).
 *
 * FROZEN CONTRACT (waves 3 D fill bodies behind these exact paths and
 * signatures — do not rename):
 *
 *   ids            : WidgetEditorDialogId = 'new' | 'derive' | 'save-as'
 *                    | 'import'   (wave-3 D: §5.7 import confirm dialog)
 *   dialog props   : WidgetEditorDialogProps<P> =
 *                    { open: boolean; payload?: P; onClose: () => void }
 *   payload types  : NewWidgetDialogPayload    (./new-dialog)
 *                    DeriveWidgetDialogPayload (./derive-dialog)
 *                    SaveAsWidgetDialogPayload (./contract/save-as-dialog)
 *                    ImportWidgetDialogPayload (./contract/import-dialog)
 *   dialog files   : the lazy map below.
 *
 * The host owns one "active dialog" slot: openDialog(id, payload?) swaps
 * the slot, closeDialog clears it. One dialog at a time is the TB editing
 * interaction shape.
 */

import { Spin } from 'antd';
import { lazy, Suspense, useState } from 'react';

export type WidgetEditorDialogId = 'new' | 'derive' | 'save-as' | 'import';

/** Frozen prop signature of every widget editor dialog. */
export interface WidgetEditorDialogProps<P = unknown> {
  open: boolean;
  payload?: P;
  onClose: () => void;
}

export interface WidgetEditorDialogsController {
  activeId: WidgetEditorDialogId | null;
  payload?: unknown;
  openDialog: (id: WidgetEditorDialogId, payload?: unknown) => void;
  closeDialog: () => void;
}

export function useWidgetEditorDialogs(): WidgetEditorDialogsController {
  const [active, setActive] = useState<{
    id: WidgetEditorDialogId;
    payload?: unknown;
  } | null>(null);
  return {
    activeId: active?.id ?? null,
    payload: active?.payload,
    openDialog: (id, payload) => setActive({ id, payload }),
    closeDialog: () => setActive(null),
  };
}

type DialogComponent = React.ComponentType<WidgetEditorDialogProps>;

/** Static lazy map — the stable registration point of all dialog ids. */
const DIALOG_COMPONENTS: Record<WidgetEditorDialogId, DialogComponent> = {
  new: lazy(() =>
    import('./new-dialog').then((m) => ({ default: m.NewWidgetDialog })),
  ),
  derive: lazy(() =>
    import('./derive-dialog').then((m) => ({ default: m.DeriveWidgetDialog })),
  ),
  'save-as': lazy(() =>
    import('./contract/save-as-dialog').then((m) => ({
      default: m.SaveAsWidgetDialog,
    })),
  ),
  import: lazy(() =>
    import('./contract/import-dialog').then((m) => ({
      default: m.ImportWidgetDialog,
    })),
  ),
};

export interface DialogHostProps {
  controller: WidgetEditorDialogsController;
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
