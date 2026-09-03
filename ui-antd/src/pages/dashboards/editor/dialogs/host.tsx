/**
 * DialogHost — stable seam of the editor dialog system (M7 brief §2).
 *
 * FROZEN CONTRACT (waves P/K fill the bodies behind these exact paths and
 * signature — do not rename):
 *
 *   ids            : EditorDialogId = 'manage-states' | 'manage-layouts' |
 *                    'add-breakpoint' | 'dashboard-settings' |
 *                    'dashboard-image' | 'manage-aliases' | 'alias' |
 *                    'filters' | 'move-widgets' | 'select-target-layout'
 *   dialog props   : { open: boolean; payload?: unknown; onClose: () => void }
 *                    (per-id payload types are additive refinements)
 *   dialog files   : dialogs/<id>.tsx, one named export `<PascalId>Dialog`
 *                    except dialogs/add-widget/** (C wave real flow) —
 *                    'alias' is the single-alias editor used by
 *                    manage-aliases (P wave may re-export from a folder).
 *
 * The host owns one "active dialog" slot: openDialog(id, payload?) swaps
 * the slot, closeDialog clears it. One dialog at a time is the TB editing
 * interaction shape (no stacking).
 */

import { Spin } from 'antd';
import { lazy, Suspense, useState } from 'react';

export type EditorDialogId =
  | 'manage-states'
  | 'manage-layouts'
  | 'add-breakpoint'
  | 'dashboard-settings'
  | 'dashboard-image'
  | 'manage-aliases'
  | 'alias'
  | 'filters'
  | 'move-widgets'
  | 'select-target-layout';

/** Frozen prop signature of every editor dialog. */
export interface EditorDialogProps<P = unknown> {
  open: boolean;
  payload?: P;
  onClose: () => void;
}

export interface EditorDialogsController {
  activeId: EditorDialogId | null;
  payload?: unknown;
  openDialog: (id: EditorDialogId, payload?: unknown) => void;
  closeDialog: () => void;
}

export function useEditorDialogs(): EditorDialogsController {
  const [active, setActive] = useState<{
    id: EditorDialogId;
    payload?: unknown;
  } | null>(null);
  return {
    activeId: active?.id ?? null,
    payload: active?.payload,
    openDialog: (id, payload) => setActive({ id, payload }),
    closeDialog: () => setActive(null),
  };
}

type DialogComponent = React.ComponentType<EditorDialogProps>;

/** Static lazy map — the stable registration point of all dialog ids. */
const DIALOG_COMPONENTS: Record<EditorDialogId, DialogComponent> = {
  'manage-states': lazy(() =>
    import('./manage-states').then((m) => ({ default: m.ManageStatesDialog })),
  ),
  'manage-layouts': lazy(() =>
    import('./manage-layouts').then((m) => ({
      default: m.ManageLayoutsDialog,
    })),
  ),
  'add-breakpoint': lazy(() =>
    import('./add-breakpoint').then((m) => ({
      default: m.AddBreakpointDialog,
    })),
  ),
  'dashboard-settings': lazy(() =>
    import('./dashboard-settings').then((m) => ({
      default: m.DashboardSettingsDialog,
    })),
  ),
  'dashboard-image': lazy(() =>
    import('./dashboard-image').then((m) => ({
      default: m.DashboardImageDialog,
    })),
  ),
  'manage-aliases': lazy(() =>
    import('./manage-aliases').then((m) => ({
      default: m.ManageAliasesDialog,
    })),
  ),
  alias: lazy(() =>
    import('./alias').then((m) => ({ default: m.AliasDialog })),
  ),
  filters: lazy(() =>
    import('./filters').then((m) => ({ default: m.FiltersDialog })),
  ),
  'move-widgets': lazy(() =>
    import('./move-widgets').then((m) => ({ default: m.MoveWidgetsDialog })),
  ),
  'select-target-layout': lazy(() =>
    import('./select-target-layout').then((m) => ({
      default: m.SelectTargetLayoutDialog,
    })),
  ),
};

export interface DialogHostProps {
  controller: EditorDialogsController;
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
