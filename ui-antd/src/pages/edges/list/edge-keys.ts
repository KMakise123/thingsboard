/**
 * Client-side Edge credential generators (R07/R08).
 *
 * The backend NEVER generates routingKey/secret — the create dialog mints
 * them locally (ui-ngx edge.component.ts:138-143) and they stay read-only
 * after save. Formats mirror ui-ngx core/utils: `guid()` (8-4-4-4-12 hex)
 * and `generateSecret(20)` (20 lowercase base36 chars). The random source
 * is injectable so tests can pin the output deterministically.
 */

const HEX_CHUNK = 0x10000;

function s4(random: () => number): string {
  // ngx trick: floor((1 + r) * 0x10000).toString(16) is always 5 hex digits
  // with a leading 1 — dropping it yields exactly 4.
  return Math.floor((1 + random()) * HEX_CHUNK)
    .toString(16)
    .substring(1);
}

/** 8-4-4-4-12 lowercase hex routing key (ui-ngx guid() parity). */
export function generateRoutingKey(random: () => number = Math.random): string {
  return `${s4(random)}${s4(random)}-${s4(random)}-${s4(random)}-${s4(random)}-${s4(random)}${s4(random)}${s4(random)}`;
}

/**
 * `length` (default 20) lowercase base36 secret chars —
 * ui-ngx generateSecret(20) parity.
 */
const BASE36_CHUNK = 36 ** 10; // 36^10 < 2^53: exact doubles, no bias gap

export function generateSecret(
  length = 20,
  random: () => number = Math.random,
): string {
  let out = '';
  while (out.length < length) {
    out += Math.floor(random() * BASE36_CHUNK)
      .toString(36)
      .padStart(10, '0');
  }
  return out.slice(0, length);
}
