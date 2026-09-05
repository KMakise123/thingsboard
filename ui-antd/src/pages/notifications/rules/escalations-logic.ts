/**
 * Escalation-chain pure logic (M12 wave 3-B, spec §4.5) — conversions between
 * the wire shape (`escalationTable: Record<string, string[]>`, keys = delay in
 * SECONDS as JSON strings, values = bare target UUIDs) and the editor's row
 * model, plus the delay unit picker math.
 *
 * Wire unit note: backend DefaultNotificationRuleProcessor feeds each map key
 * straight into `NotificationRequestConfig.sendingDelayInSec`, so the key is
 * seconds (the m12-backend-contract.md "minutes" wording is wrong; the TS type
 * comment in types/tb/notification.ts inherits it). ui-ngx round-trips
 * `delayInSec * 1000` (ms) through its form and divides back — same seconds
 * key on the wire (escalations.component.ts:113,157).
 */

export interface EscalationRow {
  /** Delay in seconds; first row is fixed at 0 (immediately). */
  delayInSec: number;
  targets: Array<string>;
}

/** First (immediate) escalation is always at 0 seconds. */
export const FIRST_ESCALATION_DELAY_SEC = 0;
/** New stage default: 1 hour (ui-ngx addEscalation 3600000 ms). */
export const DEFAULT_STAGE_DELAY_SEC = 3600;
/** Non-first rows: 1 minute minimum, 7 days maximum (ui-ngx timeinterval bounds). */
export const MIN_STAGE_DELAY_SEC = 60;
export const MAX_STAGE_DELAY_SEC = 604800;

export function escalationTableToRows(
  table: Record<string, Array<string>> | undefined | null,
): Array<EscalationRow> {
  if (!table) {
    return [{ delayInSec: FIRST_ESCALATION_DELAY_SEC, targets: [] }];
  }
  const rows = Object.entries(table).map(([key, targets]) => ({
    delayInSec: Number(key),
    targets: targets ?? [],
  }));
  if (rows.length === 0) {
    return [{ delayInSec: FIRST_ESCALATION_DELAY_SEC, targets: [] }];
  }
  // Integer-like object keys iterate in ascending numeric order already;
  // sort keeps that guarantee explicit.
  rows.sort((a, b) => a.delayInSec - b.delayInSec);
  return rows;
}

export function rowsToEscalationTable(
  rows: Array<EscalationRow>,
): Record<string, Array<string>> {
  const table: Record<string, Array<string>> = {};
  for (const row of rows) {
    table[String(row.delayInSec)] = row.targets;
  }
  return table;
}

/**
 * Whole-table validity for the wizard's Form.Item rule: every stage needs
 * targets and a delay in range (first stage 0, later stages 1 min … 7 days).
 */
export function escalationTableIsValid(
  table: Record<string, Array<string>> | undefined | null,
): boolean {
  if (!table || Object.keys(table).length === 0) {
    return false;
  }
  return Object.entries(table).every(([key, targets]) =>
    escalationEntryIsValid(Number(key), targets ?? []),
  );
}

export function escalationEntryIsValid(
  delayInSec: number,
  targets: Array<string>,
): boolean {
  if (!Number.isInteger(delayInSec) || delayInSec < 0) {
    return false;
  }
  if (
    delayInSec !== FIRST_ESCALATION_DELAY_SEC &&
    (delayInSec < MIN_STAGE_DELAY_SEC || delayInSec > MAX_STAGE_DELAY_SEC)
  ) {
    return false;
  }
  return targets.length > 0;
}

/** Whether the clearRule block is editable: only for chains with >1 stage. */
export function clearRuleEnabled(
  table: Record<string, Array<string>> | undefined | null,
): boolean {
  return !!table && Object.keys(table).length > 1;
}

// ---------------------------------------------------------------------------
// Delay unit picker (minutes / hours / days, ui-ngx escalation-form bounds)
// ---------------------------------------------------------------------------

export type DelayUnit = 'minutes' | 'hours' | 'days';

export const DELAY_UNIT_SEC: Record<DelayUnit, number> = {
  minutes: 60,
  hours: 3600,
  days: 86400,
};

/** Seconds → picker value, preferring the largest unit that divides evenly. */
export function delaySecToPicker(sec: number): {
  value: number;
  unit: DelayUnit;
} {
  if (sec % DELAY_UNIT_SEC.days === 0) {
    return { value: sec / DELAY_UNIT_SEC.days, unit: 'days' };
  }
  if (sec % DELAY_UNIT_SEC.hours === 0) {
    return { value: sec / DELAY_UNIT_SEC.hours, unit: 'hours' };
  }
  return { value: sec / DELAY_UNIT_SEC.minutes, unit: 'minutes' };
}

/** Picker value → seconds, clamped to the 1 minute … 7 days stage bounds. */
export function pickerToDelaySec(value: number, unit: DelayUnit): number {
  const sec = Math.round(value * DELAY_UNIT_SEC[unit]);
  return Math.min(Math.max(sec, MIN_STAGE_DELAY_SEC), MAX_STAGE_DELAY_SEC);
}
