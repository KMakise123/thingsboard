/**
 * C-wave placeholder for the MoveWidgetsDialog (cols/rows offset shift of
 * every widget in the layout; P wave fills the real dialog behind the
 * frozen EditorDialogProps signature — see ./host.tsx header).
 */
import { EditorDialogPlaceholder } from './dialog-placeholder';
import type { EditorDialogProps } from './host';

export function MoveWidgetsDialog(props: EditorDialogProps) {
  return (
    <EditorDialogPlaceholder
      open={props.open}
      title="Move all widgets"
      onClose={props.onClose}
    />
  );
}
