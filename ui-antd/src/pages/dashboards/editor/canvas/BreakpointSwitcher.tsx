/**
 * BreakpointSwitcher (spec §3.7, ui-ngx select-dashboard-breakpoint): the
 * toolbar select that forces a breakpoint bucket's override layout for the
 * preview, regardless of the actual viewport width.
 *
 *  - Lists `default` plus the breakpoint overrides defined on the ROOT
 *    state's main layout (manage-layouts edits the same state, so the two
 *    stay in sync). Hidden entirely when only `default` exists.
 *  - The selected bucket travels to EditorGrid through a small module
 *    store — the same in-module feature-memory pattern as the dialog
 *    session registry and the editor clipboard (M7 brief §2). EditorGrid
 *    applies the forced override; `default` restores the width-driven
 *    resolution.
 *  - The switcher mount is ALSO the publisher of the dialog-session
 *    registry (use-dialog-session contract): it publishes on mount so the
 *    P-wave dialogs can reach the editor session.
 */
import { Select, Tooltip } from 'antd';
import { useEffect, useSyncExternalStore } from 'react';
import { useIntl } from 'react-intl';

import { getRootStateId } from '@/core/dashboard/model';
import type { EditorSession } from '@/core/editor/session';
import type {
  DashboardBreakpointId,
  DashboardConfiguration,
} from '@/types/tb/dashboard';

import { publishDialogSession } from '../dialogs/use-dialog-session';

export interface BreakpointSwitcherProps {
  session: EditorSession<DashboardConfiguration>;
}

// ---------------------------------------------------------------------
// Preview-breakpoint store (module singleton + useSyncExternalStore)
// ---------------------------------------------------------------------

let previewBreakpoint: DashboardBreakpointId = 'default';
const listeners = new Set<() => void>();

/** Forces the preview bucket ('default' = width-driven resolution). */
export function setPreviewBreakpoint(
  breakpointId: DashboardBreakpointId,
): void {
  previewBreakpoint = breakpointId;
  for (const listener of listeners) {
    listener();
  }
}

export function getPreviewBreakpoint(): DashboardBreakpointId {
  return previewBreakpoint;
}

export function subscribePreviewBreakpoint(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** EditorGrid-side hook: the forced preview bucket. */
export function usePreviewBreakpoint(): DashboardBreakpointId {
  return useSyncExternalStore(
    subscribePreviewBreakpoint,
    getPreviewBreakpoint,
    getPreviewBreakpoint,
  );
}

export function BreakpointSwitcher({ session }: BreakpointSwitcherProps) {
  const { formatMessage } = useIntl();

  // Dialog-session registry publisher (use-dialog-session contract).
  useEffect(() => {
    publishDialogSession(session);
  }, [session]);

  // Leaving the editor (or unmounting the switcher) restores the
  // width-driven preview.
  useEffect(() => {
    return () => {
      setPreviewBreakpoint('default');
    };
  }, []);

  const configuration = session.current;
  const rootStateId = getRootStateId(configuration.states);
  const breakpoints = configuration.states[rootStateId]?.layouts.main
    ?.breakpoints as
    | Partial<Record<DashboardBreakpointId, unknown>>
    | undefined;
  const defined = (Object.keys(breakpoints ?? {}) as DashboardBreakpointId[])
    .filter((id) => breakpoints?.[id] !== undefined)
    .sort((a, b) => a.localeCompare(b));

  if (defined.length === 0) {
    return null;
  }

  return (
    <Tooltip
      title={formatMessage({
        id: 'editor.dashboard.dialogs.breakpoint.switcher',
        defaultMessage: 'Preview breakpoint',
      })}
    >
      <Select<DashboardBreakpointId>
        size="small"
        style={{ minWidth: 120 }}
        value={getPreviewBreakpoint()}
        onChange={setPreviewBreakpoint}
        data-testid="breakpoint-switcher"
        options={[
          {
            value: 'default',
            label: formatMessage({
              id: 'editor.dashboard.dialogs.layouts.defaultBreakpoint',
              defaultMessage: 'Default',
            }),
          },
          ...defined.map((id) => ({ value: id, label: id.toUpperCase() })),
        ]}
      />
    </Tooltip>
  );
}
