/**
 * C-wave placeholder for the AddBreakpointDialog (P wave fills the real
 * dialog behind the frozen EditorDialogProps signature — see ./host.tsx
 * header).
 */
import { EditorDialogPlaceholder } from './dialog-placeholder';
import type { EditorDialogProps } from './host';

export function AddBreakpointDialog(props: EditorDialogProps) {
  return (
    <EditorDialogPlaceholder
      open={props.open}
      title="Add breakpoint"
      onClose={props.onClose}
    />
  );
}
