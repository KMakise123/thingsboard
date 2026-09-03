/**
 * Dashboard editor re-export shim (M8 wave F hoist) — the implementation
 * lives in core/editor/contract/ConflictDialog.tsx. The frozen dashboard
 * prop name `serverDashboard` is preserved and mapped onto the generic
 * server-entity descriptor; all other props pass through untouched.
 */

import type { ConflictDialogProps as BaseConflictDialogProps } from '@/core/editor/contract/ConflictDialog';
import { ConflictDialog as BaseConflictDialog } from '@/core/editor/contract/ConflictDialog';
import type { Dashboard } from '@/types/tb/dashboard';

export type ConflictDialogProps = Omit<
  BaseConflictDialogProps,
  'serverEntity'
> & {
  /** Server entity observed at conflict time (null = GET failed). */
  serverDashboard?: Dashboard | null;
};

export function ConflictDialog({
  serverDashboard,
  ...rest
}: ConflictDialogProps) {
  return <BaseConflictDialog {...rest} serverEntity={serverDashboard} />;
}
