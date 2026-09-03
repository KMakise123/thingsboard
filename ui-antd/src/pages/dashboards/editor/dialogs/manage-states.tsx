/**
 * C-wave placeholder for the ManageStatesDialog (P wave fills the real
 * dialog behind the frozen EditorDialogProps signature — see ./host.tsx
 * header).
 */
import { EditorDialogPlaceholder } from './dialog-placeholder';
import type { EditorDialogProps } from './host';

export function ManageStatesDialog(props: EditorDialogProps) {
  return (
    <EditorDialogPlaceholder
      open={props.open}
      title="ManageStatesDialog"
      onClose={props.onClose}
    />
  );
}
