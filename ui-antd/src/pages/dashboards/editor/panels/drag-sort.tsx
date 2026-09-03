/**
 * Native-HTML5 drag sort for panel list rows (M7 wave K): zero new
 * dependencies, per spec. The draggable surface is a dedicated handle so
 * text selection inside the row's inputs is untouched. Up/Down buttons are
 * the keyboard fallback (and the happy-dom-testable path — happy-dom has no
 * drag-and-drop event implementation).
 */
import { Button } from 'antd';
import { useRef } from 'react';

export interface DragSortApi {
  /** Spread onto the row wrapper: tracks the dragged row landing. */
  rowProps: (index: number) => {
    onDragOver: (event: React.DragEvent) => void;
    onDrop: (event: React.DragEvent) => void;
  };
  /** Spread onto the handle element (draggable source). */
  handleProps: (index: number) => {
    draggable: true;
    onDragStart: (event: React.DragEvent) => void;
    onDragEnd: (event: React.DragEvent) => void;
  };
  move: (from: number, to: number) => void;
  moveUp: (index: number) => void;
  moveDown: (index: number) => void;
}

export function useDragSort(
  onReorder: (from: number, to: number) => void,
): DragSortApi {
  const fromRef = useRef<number | null>(null);

  return {
    rowProps: (index) => ({
      onDragOver: (event) => {
        if (fromRef.current !== null && fromRef.current !== index) {
          event.preventDefault();
        }
      },
      onDrop: () => {
        const from = fromRef.current;
        fromRef.current = null;
        if (from !== null && from !== index) {
          onReorder(from, index);
        }
      },
    }),
    handleProps: (index) => ({
      draggable: true as const,
      onDragStart: () => {
        fromRef.current = index;
      },
      onDragEnd: () => {
        fromRef.current = null;
      },
    }),
    move: (from, to) => {
      if (from === to) {
        return;
      }
      onReorder(from, to);
    },
    moveUp: (index) => {
      if (index > 0) {
        onReorder(index, index - 1);
      }
    },
    moveDown: (index) => {
      if (index >= 0) {
        onReorder(index, index + 1);
      }
    },
  };
}

/** The ↑/↓ keyboard-fallback pair with stable testids. */
export function DragSortButtons({
  api,
  index,
  count,
  testIdPrefix,
}: {
  api: DragSortApi;
  index: number;
  count: number;
  testIdPrefix: string;
}) {
  return (
    <>
      <Button
        size="small"
        type="text"
        icon="↑"
        aria-label="Move up"
        disabled={index === 0}
        data-testid={`${testIdPrefix}-up`}
        onClick={() => api.moveUp(index)}
      />
      <Button
        size="small"
        type="text"
        icon="↓"
        aria-label="Move down"
        disabled={index === count - 1}
        data-testid={`${testIdPrefix}-down`}
        onClick={() => api.moveDown(index)}
      />
    </>
  );
}

/** The draggable grip handle (native dnd source). */
export function DragSortHandle({
  api,
  index,
  testIdPrefix,
}: {
  api: DragSortApi;
  index: number;
  testIdPrefix: string;
}) {
  return (
    <span
      {...api.handleProps(index)}
      title="Drag to reorder"
      data-testid={`${testIdPrefix}-drag`}
      style={{ cursor: 'grab', userSelect: 'none', padding: '0 2px' }}
    >
      ⠿
    </span>
  );
}
