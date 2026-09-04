/**
 * Descriptor size budget — the 512KB SOFT limit (ADR 0004 §4: the wire
 * descriptor is a free JsonNode with a varchar 1MB hard cap upstream, so the
 * editor warns at 512KB). Warning only — never blocks the save (spec §7
 * enhancement register: 仅警告不阻断); the predicate is pure so tests can pin
 * the warn-not-block contract at the exact byte boundary (P8 evidence
 * anchor).
 */
import type { WidgetTypeDetails } from '@/types/tb/widget-type';

export const WIDGET_DESCRIPTOR_SOFT_LIMIT_BYTES = 512 * 1024;

/** UTF-8 wire size of the descriptor as the POST body will carry it. */
export function descriptorWireBytes(details: WidgetTypeDetails): number {
  return new TextEncoder().encode(JSON.stringify(details.descriptor ?? {}))
    .length;
}

export function overDescriptorSoftLimit(details: WidgetTypeDetails): boolean {
  return descriptorWireBytes(details) > WIDGET_DESCRIPTOR_SOFT_LIMIT_BYTES;
}
