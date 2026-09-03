/**
 * C-wave placeholder for the AliasDialog (single-alias editor; P wave fills
 * the real dialog behind the frozen EditorDialogProps signature — see
 * ./host.tsx header).
 */
import { EditorDialogPlaceholder } from './dialog-placeholder';
import type { EditorDialogProps } from './host';

export function AliasDialog(props: EditorDialogProps) {
  return (
    <EditorDialogPlaceholder
      open={props.open}
      title="Entity alias"
      onClose={props.onClose}
    />
  );
}
