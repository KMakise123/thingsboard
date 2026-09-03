/**
 * C-wave placeholder for the DashboardSettingsDialog (P wave fills the real
 * dialog behind the frozen EditorDialogProps signature — see ./host.tsx
 * header).
 */
import { EditorDialogPlaceholder } from './dialog-placeholder';
import type { EditorDialogProps } from './host';

export function DashboardSettingsDialog(props: EditorDialogProps) {
  return (
    <EditorDialogPlaceholder
      open={props.open}
      title="Dashboard settings"
      onClose={props.onClose}
    />
  );
}
