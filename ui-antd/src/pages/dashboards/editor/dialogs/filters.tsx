/**
 * C-wave placeholder for the FiltersDialog (P wave fills the real dialog
 * behind the frozen EditorDialogProps signature — see ./host.tsx header).
 */
import { EditorDialogPlaceholder } from './dialog-placeholder';
import type { EditorDialogProps } from './host';

export function FiltersDialog(props: EditorDialogProps) {
  return (
    <EditorDialogPlaceholder
      open={props.open}
      title="Filters"
      onClose={props.onClose}
    />
  );
}
