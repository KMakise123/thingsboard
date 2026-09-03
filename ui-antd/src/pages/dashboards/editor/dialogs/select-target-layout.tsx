/**
 * C-wave placeholder for the SelectTargetLayoutDialog (paste / multi-widget
 * add target layout choice; the C add-widget flow may use it when a
 * dashboard has more than one layout — P wave fills the real dialog behind
 * the frozen EditorDialogProps signature — see ./host.tsx header).
 */
import { EditorDialogPlaceholder } from './dialog-placeholder';
import type { EditorDialogProps } from './host';

export function SelectTargetLayoutDialog(props: EditorDialogProps) {
  return (
    <EditorDialogPlaceholder
      open={props.open}
      title="Select target layout"
      onClose={props.onClose}
    />
  );
}
