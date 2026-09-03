/**
 * EditorCanvas — the editing surface for the CURRENT state: resolves the
 * states controller (default controller starts at the root state), alias
 * resolution (same chain as the readonly DashboardPage) and renders an
 * EditorGrid per active layout (main + optional right side-by-side).
 */

import type { MenuProps } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useStatesController } from '@/components/dashboard/use-states-controller';
import {
  type AliasResolution,
  resolveEntityAliases,
} from '@/core/dashboard/alias-resolver';
import type { StatesControllerMode } from '@/core/dashboard/states';
import type { EditorSession } from '@/core/editor/session';
import { useEditorSession } from '@/core/editor/use-editor-session';
import type { DashboardConfiguration } from '@/types/tb/dashboard';
import type { Timewindow } from '@/types/tb/timewindow';

import { EditorGrid } from './EditorGrid';

export interface EditorCanvasProps {
  session: EditorSession<DashboardConfiguration>;
  selectedWidgetId: string | null;
  onSelectWidget: (widgetId: string | null) => void;
  onWidgetContextMenu?: (widgetId: string) => void;
  widgetMenu?: (widgetId: string) => MenuProps;
  /** runtime timewindow bound by the shell toolbar (never a draft write). */
  dashboardTimewindow: Timewindow;
  showRightLayout: boolean;
  /** explicit width override for tests. */
  containerWidth?: number;
}

export function EditorCanvas({
  session,
  selectedWidgetId,
  onSelectWidget,
  onWidgetContextMenu,
  widgetMenu,
  dashboardTimewindow,
  showRightLayout,
  containerWidth,
}: EditorCanvasProps) {
  const snapshot = useEditorSession(session);
  const configuration = snapshot.current;
  const statesMap = configuration.states;

  const settings = configuration.settings ?? {};
  const mode: StatesControllerMode =
    settings.stateControllerId === 'default' ? 'default' : 'entity';
  const states = useStatesController({ states: statesMap, mode });

  const [aliases, setAliases] = useState<AliasResolution>({});
  const stateEntityKey = JSON.stringify(
    states.currentStateParams.entityId ?? null,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: stateEntityKey covers every field of states.currentStateParams the resolver reads
  useEffect(() => {
    let cancelled = false;
    resolveEntityAliases({
      entityAliases: configuration.entityAliases,
      stateParams: states.currentStateParams,
    }).then(
      (resolution) => {
        if (!cancelled) {
          setAliases(resolution);
        }
      },
      () => {
        if (!cancelled) {
          setAliases({});
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [configuration, stateEntityKey]);

  const currentStateId = useMemo(
    () =>
      states.currentStateId in statesMap
        ? states.currentStateId
        : Object.keys(statesMap)[0],
    [states.currentStateId, statesMap],
  );
  const currentState = statesMap[currentStateId];
  const mainLayout = currentState?.layouts?.main;
  const rightLayout = currentState?.layouts?.right;

  if (!mainLayout) {
    return <div data-editor-canvas="true" data-editor-empty="true" />;
  }

  return (
    <div
      data-editor-canvas="true"
      data-editor-state={currentStateId}
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'stretch',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <EditorGrid
          session={session}
          stateId={currentStateId}
          layoutId="main"
          selectedWidgetId={selectedWidgetId}
          onSelectWidget={onSelectWidget}
          onWidgetContextMenu={onWidgetContextMenu}
          widgetMenu={widgetMenu}
          dashboardTimewindow={dashboardTimewindow}
          aliases={aliases}
          states={states}
          isMobile={false}
          containerWidth={containerWidth}
        />
      </div>
      {showRightLayout && rightLayout ? (
        <div style={{ flex: 1, minWidth: 0 }}>
          <EditorGrid
            session={session}
            stateId={currentStateId}
            layoutId="right"
            selectedWidgetId={selectedWidgetId}
            onSelectWidget={onSelectWidget}
            onWidgetContextMenu={onWidgetContextMenu}
            widgetMenu={widgetMenu}
            dashboardTimewindow={dashboardTimewindow}
            aliases={aliases}
            states={states}
            isMobile={false}
            containerWidth={containerWidth}
          />
        </div>
      ) : null}
    </div>
  );
}
