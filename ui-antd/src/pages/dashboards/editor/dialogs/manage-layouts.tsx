/**
 * C-wave placeholder for the ManageLayoutsDialog (P wave fills the real
 * dialog behind the frozen EditorDialogProps signature — see ./host.tsx
 * header).
 */
import { EditorDialogPlaceholder } from './dialog-placeholder';
import type { EditorDialogProps } from './host';

export function ManageLayoutsDialog(props: EditorDialogProps) {
  return (
    <EditorDialogPlaceholder
      open={props.open}
      title="Manage layouts"
      onClose={props.onClose}
    />
  );
}
