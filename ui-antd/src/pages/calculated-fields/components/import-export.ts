/**
 * CF import/export (M14 wave-4, R16, spec 6.1-16; ui-ngx import-export
 * `exportCalculatedField` / table-config import-chain parity).
 *
 * Export = full row → strip entityId → downloadBlob JSON (wire-compatible
 * with upstream's calculatedField.json). Import = parse → reject ALARM and
 * unknown types → rewrite TENANT references to the importing tenant → the
 * edit dialog re-selects the target entity.
 */
import { downloadBlob } from '@/components/shared/download-blob';
import { getCalculatedFieldById } from '@/services/tb/calculated-fields';
import type {
  CalculatedField,
  CalculatedFieldConfiguration,
  CalculatedFieldType,
} from '@/types/tb/calculated-fields';
import { CF_PAGE_TYPES } from './data';

/** ngx exportCalculatedField — the file never carries the target entity. */
export function stripEntityId(
  field: CalculatedField,
): Omit<CalculatedField, 'entityId'> {
  const { entityId: _entityId, ...rest } = field;
  return rest;
}

/** Row action: download the calculated field as upstream-compatible JSON. */
export async function exportCalculatedField(
  calculatedFieldId: string,
): Promise<void> {
  const field = await getCalculatedFieldById(calculatedFieldId);
  downloadBlob(
    new Blob([JSON.stringify(stripEntityId(field), null, 2)], {
      type: 'application/json',
    }),
    'calculatedField.json',
  );
}

export type CfImportFailureReason = 'parse' | 'type' | 'not-object';

export type CfImportResult =
  | { ok: true; field: CalculatedField }
  | { ok: false; reason: CfImportFailureReason };

/**
 * Parses + validates imported JSON. ALARM (a separate domain, R18) and any
 * unknown type are rejected exactly like ngx :350-374; everything else is
 * kept as-is (the edit dialog owns entity re-selection).
 */
export function parseImportedField(text: string): CfImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'parse' };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: 'not-object' };
  }
  const type = (parsed as { type?: unknown }).type;
  if (
    typeof type !== 'string' ||
    !CF_PAGE_TYPES.includes(type as CalculatedFieldType)
  ) {
    return { ok: false, reason: 'type' };
  }
  return { ok: true, field: parsed as CalculatedField };
}

const NULL_UUID = '13814000-1dd2-11b2-8080-808080808080';

/**
 * ngx :376-396 — every `refEntityId` pointing at TENANT inside arguments /
 * zone groups references the EXPORTING tenant, so the id is rewritten to
 * the importing tenant (NULL_UUID sentinels stay untouched).
 */
export function rewriteTenantReferences(
  field: CalculatedField,
  currentTenantId: string,
): CalculatedField {
  const rewriteId = (id?: string): string | undefined =>
    id === NULL_UUID ? id : currentTenantId;

  const configuration: CalculatedFieldConfiguration = JSON.parse(
    JSON.stringify(field.configuration),
  );

  const rewriteRecord = (
    record: Record<
      string,
      { refEntityId?: { entityType: string; id: string } }
    >,
  ) => {
    for (const value of Object.values(record ?? {})) {
      if (value?.refEntityId?.entityType === 'TENANT') {
        value.refEntityId.id =
          rewriteId(value.refEntityId.id) ?? currentTenantId;
      }
    }
  };

  if ('arguments' in configuration) {
    rewriteRecord(
      configuration.arguments as Record<
        string,
        { refEntityId?: { entityType: string; id: string } }
      >,
    );
  }
  if ('zoneGroups' in configuration) {
    rewriteRecord(
      configuration.zoneGroups as Record<
        string,
        { refEntityId?: { entityType: string; id: string } }
      >,
    );
  }
  return { ...field, configuration };
}

/** File-picker read (import button) — text content of a .json file. */
export function readImportFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsText(file);
  });
}
