/**
 * Import adapter for the editor — C wave placeholder. Signature frozen; the
 * D wave completes the §3.8 parity flow (missing-entity-aliases completion
 * dialog before the draft swap, ui-ngx dashboard-page.component.ts:1073
 * anchor; the v1 readonly import omitted that dialog).
 *
 * The placeholder validates + returns the parsed dashboard; applying it to
 * the session (fresh baseline via `enter`) is the caller's decision.
 */
import { parseDashboardImport } from '@/pages/dashboards/list/import-export';
import type { Dashboard } from '@/types/tb/dashboard';

export async function importDashboardIntoEditor(
  file: File,
): Promise<Dashboard> {
  const text = await file.text();
  return parseDashboardImport(text);
}
