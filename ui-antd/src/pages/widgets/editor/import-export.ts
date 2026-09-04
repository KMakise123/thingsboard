/**
 * Widget-type import/export (spec §5.7; M9 brief §2 import-export.ts).
 *
 * Export — the CURRENT EDITING draft as a portable WidgetTypeDetails JSON
 * download. Stripping follows the ui-ngx `prepareExport` rule (deep clone;
 * drop id / createdTime / tenantId / customerId / externalId / version —
 * the import path reassigns identity); the descriptor rides along
 * VERBATIM, so `descriptor.resources[]` and every unknown key survive the
 * round trip (P10 half-item) and the exported fork JSON self-describes via
 * `runtime: 'react-1'` + `schemaVersion` (harmless to TB imports).
 *
 * Import — file text → validate (broken JSON / missing name / missing
 * descriptor are readable refusals, never a crash) → classify:
 *   - `runtime === 'react-1'`: a full editor draft (identity reset — the
 *     import lands as a NEW type; the confirm dialog replaces the current
 *     draft in ONE undoable group).
 *   - anything else: an Angular widget (P9). ADR 0004: importing Angular
 *     JSON is ALLOWED (refusing would strand dashboards referencing it) —
 *     the import dialog badges it (非 react-1), explains the honest
 *     placeholder and offers a VERBATIM server copy (`saveImportedAngularCopy`
 *     — the descriptor is posted untouched, no fork increments injected).
 *
 * Transport note: `saveWidgetType` is imported DYNAMICALLY inside its only
 * caller so this module stays bindable from the shell's static graph — the
 * wave-S shell tests stub the transport module with `saveWidgetType` alone
 * and a static named import of any other export would throw on the mock.
 */

import type { EditorSession } from '@/core/editor/session';
import type { WidgetTypeDetails } from '@/types/tb/widget-type';
import {
  draftToWidgetType,
  type WidgetEditorDoc,
  widgetTypeToDraft,
} from './draft-convert';

/** ui-ngx prepareExport parity: drop identity/audit fields on export. */
export function prepareWidgetTypeExport(
  details: WidgetTypeDetails,
): WidgetTypeDetails {
  const clone = JSON.parse(JSON.stringify(details)) as Record<string, unknown>;
  for (const field of [
    'id',
    'createdTime',
    'tenantId',
    'customerId',
    'externalId',
    'version',
  ]) {
    delete clone[field];
  }
  return clone as WidgetTypeDetails;
}

/** Serializes the export payload (pure — tests pin the strip rule on it). */
export function serializeWidgetTypeExport(doc: WidgetEditorDoc): string {
  return JSON.stringify(
    prepareWidgetTypeExport(draftToWidgetType(doc)),
    null,
    2,
  );
}

/** Downloads the current draft as a portable `{name}.json` Blob. */
export function exportWidgetTypeDraft(doc: WidgetEditorDoc): void {
  const blob = new Blob([serializeWidgetTypeExport(doc)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${doc.name || 'widget'}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// import
// ---------------------------------------------------------------------------

/**
 * Commits an imported doc into the open session as ONE undoable transaction
 * group (the §5.7 import confirm semantics — same group shape the
 * dashboards import uses). The session stays DIRTY afterwards: nothing
 * reaches the server until the user saves.
 */
export function writeImportedDoc(
  session: EditorSession<WidgetEditorDoc>,
  doc: WidgetEditorDoc,
): void {
  session.write('import:widget', (target) => {
    target.widgetTypeId = doc.widgetTypeId;
    target.fqn = doc.fqn;
    target.name = doc.name;
    target.source = doc.source;
    target.settingsForm = doc.settingsForm;
    target.defaultConfig = doc.defaultConfig;
    target.meta = doc.meta;
    target.version = doc.version;
    target.descriptorPassthrough = doc.descriptorPassthrough;
  });
}

/** Machine-readable import refusal codes (the dialog maps them to copy). */
export type WidgetImportErrorCode =
  | 'brokenJson'
  | 'missingName'
  | 'missingDescriptor';

export class WidgetImportError extends Error {
  readonly code: WidgetImportErrorCode;

  constructor(code: WidgetImportErrorCode) {
    super(`widget import refused: ${code}`);
    this.code = code;
  }
}

export type WidgetImport =
  | {
      /** fork widget — full source editing draft. */
      kind: 'react-1';
      /** the draft to deliver (identity reset: imports land as NEW types). */
      doc: WidgetEditorDoc;
      /** the raw parsed entity (name/fqn shown in the confirm dialog). */
      source: WidgetTypeDetails;
    }
  | {
      /** legacy Angular widget — P9: allowed in, badged, verbatim copy. */
      kind: 'angular';
      source: WidgetTypeDetails;
    };

/** ui-ngx validateImportedWidgetTypeDetails parity: name + descriptor. */
export function parseWidgetTypeImport(text: string): WidgetImport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new WidgetImportError('brokenJson');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new WidgetImportError('brokenJson');
  }
  const details = parsed as WidgetTypeDetails;
  if (
    details.name === undefined ||
    details.name === null ||
    details.name === ''
  ) {
    throw new WidgetImportError('missingName');
  }
  if (
    details.descriptor === undefined ||
    details.descriptor === null ||
    typeof details.descriptor !== 'object'
  ) {
    throw new WidgetImportError('missingDescriptor');
  }
  if (details.descriptor.runtime === 'react-1') {
    const doc = widgetTypeToDraft(details);
    return {
      kind: 'react-1',
      // identity reset: an import is a NEW type on this tenant (the server
      // derives the fqn on the next save; version starts fresh)
      doc: { ...doc, widgetTypeId: null, fqn: '', version: null },
      source: details,
    };
  }
  // anything without the fork marker IS the Angular marker (ADR 0004 §4)
  return { kind: 'angular', source: details };
}

/** Reads + parses an import file (the shell hands it a picked File). */
export async function importWidgetTypeFile(file: File): Promise<WidgetImport> {
  const text = await file.text();
  return parseWidgetTypeImport(text);
}

/**
 * P9 verbatim copy — POST the imported Angular entity with its descriptor
 * UNTOUCHED (no runtime/schemaVersion/source injection). Identity stripping
 * (`prepareWidgetTypeExport`) makes it a new entity; tenantId is forced
 * server-side.
 */
export async function saveImportedAngularCopy(
  source: WidgetTypeDetails,
): Promise<WidgetTypeDetails> {
  const { saveWidgetType } = await import('@/services/tb/widget-type');
  return saveWidgetType(prepareWidgetTypeExport(source));
}
