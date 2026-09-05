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
import { findFirstFreePlacement } from './find-free-placement';
import { WidgetPickerDrawer, widgetTypeLabel } from './widget-picker-drawer';

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
  // Default target layout (D2) — also the scada probe source (§3.6-1): the
  // drawer opens BEFORE the confirm step's layout picker, so the default
  // target's layoutType decides whether its two fetch paths ask
  // scada-first (ui-ngx feeds the same per-layout flag into the select).
  const targetLayoutId = (layouts[0] ?? 'main') as DashboardLayoutId;
  const targetLayoutType =
    configuration.states[rootStateId]?.layouts[targetLayoutId]?.gridSettings
      ?.layoutType;

  const onPick = (fqn: string) => {
    // D2 (ui-ngx findPosition parity): prefill the confirm step with the
    // first free slot of the default target layout so a new widget never
    // stacks onto existing ones; an explicit user edit keeps its values.
    const targetLayout =
      configuration.states[rootStateId]?.layouts[targetLayoutId];
    const defaultPlacement = findFirstFreePlacement({
      widgets: targetLayout?.widgets ?? {},
      sizeX: 8,
      sizeY: 6,
      columns: targetLayout?.gridSettings?.columns ?? 24,
    });
    setPayload({
      fqn,
      // D3: human label (registry meta.label), not the raw fqn
      label: widgetTypeLabel(fqn),
      stateId: rootStateId,
      defaultPlacement,
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
        scadaFirst={targetLayoutType === 'scada'}
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
