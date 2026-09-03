/**
 * AddWidgetFlow — orchestrates the real add-widget lifecycle (spec §3.2):
 * picker drawer (step 1) → parameter/layout confirm dialog (step 2) →
 * addWidget recipe (ONE transaction group: map insert + layout entry).
 * The target layout is chosen in the confirm step on multi-layout
 * dashboards (SCADA layouts are out of scope — the draft model has no
 * scada layout yet).
 */
import { useState } from 'react';
import { getRootStateId } from '@/core/dashboard/model';
import { addWidget, writeDraft } from '@/core/editor/dashboard-draft';
import type { EditorSession } from '@/core/editor/session';
import { useEditorSession } from '@/core/editor/use-editor-session';
import type {
  DashboardConfiguration,
  DashboardLayoutId,
} from '@/types/tb/dashboard';

import {
  AddWidgetConfirmDialog,
  type AddWidgetConfirmPayload,
  type AddWidgetConfirmResult,
} from './add-widget-confirm-dialog';
import { WidgetPickerDrawer } from './widget-picker-drawer';

export interface AddWidgetFlowProps {
  session: EditorSession<DashboardConfiguration>;
  open: boolean;
  onClose: () => void;
  /** widget id lands back here (shell selects it). */
  onAdded?: (widgetId: string) => void;
}

export function AddWidgetFlow({
  session,
  open,
  onClose,
  onAdded,
}: AddWidgetFlowProps) {
  const snapshot = useEditorSession(session);
  const configuration = snapshot.current;
  const [payload, setPayload] = useState<AddWidgetConfirmPayload | null>(null);

  const rootStateId = getRootStateId(configuration.states);
  const layouts = Object.keys(configuration.states[rootStateId]?.layouts ?? {});

  const onPick = (fqn: string) => {
    setPayload({
      fqn,
      label: fqn,
      stateId: rootStateId,
      layouts: layouts.map((id) => ({
        id,
        name: id,
        layoutType:
          configuration.states[rootStateId]?.layouts[id as DashboardLayoutId]
            ?.gridSettings.layoutType,
      })),
    });
  };

  const onConfirm = (result: AddWidgetConfirmResult) => {
    if (!payload) {
      return;
    }
    const layoutId: DashboardLayoutId =
      result.layoutId === 'right' ? 'right' : 'main';
    writeDraft(
      session,
      addWidget({
        widget: {
          typeFullFqn: payload.fqn,
          config: {
            ...(result.title ? { title: result.title } : {}),
            // scada auto-instrumentation defaults from the confirm step
            // (spec §3.6: 去标题/去阴影/透明背景/锁定宽高比)
            ...(result.scadaDefaults ?? {}),
          },
        },
        stateId: payload.stateId,
        layoutId,
        placement: {
          row: result.row,
          col: result.col,
          sizeX: result.sizeX,
          sizeY: result.sizeY,
        },
      }),
    );
    // find the freshly inserted map entry (the recipe regenerates the guid)
    let committedId = '';
    const next = session.current;
    for (const [id, widget] of Object.entries(next.widgets)) {
      if (widget.typeFullFqn === payload.fqn && !configuration.widgets[id]) {
        committedId = id;
        break;
      }
    }
    setPayload(null);
    onClose();
    if (committedId) {
      onAdded?.(committedId);
    }
  };

  return (
    <>
      <WidgetPickerDrawer
        open={open && payload === null}
        onClose={onClose}
        onPick={onPick}
      />
      <AddWidgetConfirmDialog
        open={payload !== null}
        payload={payload}
        onConfirm={onConfirm}
        onClose={() => setPayload(null)}
      />
    </>
  );
}
