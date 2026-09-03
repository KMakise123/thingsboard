/**
 * Canvas context menu — one controlled slot for all four menu kinds (pane /
 * node / edge / note). The M7 dashboards editor wraps each static grid cell
 * in its own antd Dropdown; React Flow nodes are reconciled view elements,
 * so per-node Dropdowns would push menu closures through the element
 * reconciler. The anchor+controlled-`open` Dropdown reproduces the native
 * context-menu UX at the pointer coordinates while keeping the menu content
 * owned by the shell.
 */

import type { MenuProps } from 'antd';
import { Dropdown } from 'antd';

export interface CanvasContextMenuState {
  x: number;
  y: number;
  menu: MenuProps;
}

export function CanvasContextMenu({
  state,
  onClose,
}: {
  state: CanvasContextMenuState | null;
  onClose: () => void;
}) {
  if (!state) {
    return null;
  }
  return (
    <div
      style={{
        position: 'fixed',
        left: state.x,
        top: state.y,
        width: 0,
        height: 0,
        zIndex: 1000,
      }}
    >
      <Dropdown
        menu={state.menu}
        trigger={['contextMenu']}
        open
        onOpenChange={(open) => {
          if (!open) {
            onClose();
          }
        }}
      >
        <div style={{ width: 0, height: 0 }} />
      </Dropdown>
    </div>
  );
}

/** Normalized pointer coordinates for the fixed anchor. */
export function contextMenuPoint(event: { clientX: number; clientY: number }): {
  x: number;
  y: number;
} {
  return { x: event.clientX, y: event.clientY };
}
