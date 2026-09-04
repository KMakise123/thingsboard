/**
 * TB `formatValue` semantics for compiled custom widgets (ADR 0004 §4).
 *
 * Faithful port of ui-ngx `core/utils.ts` formatValue (:153) — the value
 * formatter custom widgets historically rely on — because the host ui-antd
 * app had no equivalent before M9. Exposed exclusively through the
 * `widget-kit` facade; never imported by widgets directly.
 *
 * Behavior contract (locked by format-value.test.ts):
 *   - numeric values (or numeric STRINGS) with explicit `dec` and/or `units`
 *     are decimals-formatted and unit-suffixed;
 *   - without `showZeroDecimals` trailing zeros are stripped (2.50 → 2.5);
 *   - a numeric string formats even without dec/units (gate clause 3);
 *   - non-numerics pass through as text; null → '', undefined → undefined.
 */

function isDefinedAndNotNull(value: unknown): boolean {
  return value !== undefined && value !== null;
}

function isNotEmptyStr(value: unknown): boolean {
  return typeof value === 'string' && value.length > 0;
}

/**
 * ui-ngx isNumeric: `value - parseFloat(value) >= -1`. True for numbers and
 * numeric strings; false for booleans, objects, empty/NaN strings.
 */
function isNumeric(value: unknown): boolean {
  return Number(value) - Number.parseFloat(String(value)) + 1 >= 0;
}

export function formatValue(
  value: unknown,
  dec?: number,
  units?: string,
  showZeroDecimals?: boolean,
): string | undefined {
  if (
    isDefinedAndNotNull(value) &&
    isNumeric(value) &&
    (isDefinedAndNotNull(dec) ||
      isNotEmptyStr(units) ||
      // ui-ngx gate clause: raw numeric strings format even without dec/units
      // (strict `===` on purpose: the number 5 does NOT satisfy it, '5' does)
      Number(value).toString() === value)
  ) {
    let formatted: unknown = value;
    if (isDefinedAndNotNull(dec)) {
      formatted = Number(formatted).toFixed(dec);
    }
    if (!showZeroDecimals) {
      formatted = Number(formatted);
    }
    let text = String(formatted);
    if (isNotEmptyStr(units)) {
      text += ` ${units}`;
    }
    return text;
  }
  // ui-ngx passes the raw value through; Angular interpolation renders it
  // identically to String() for every primitive, so normalize to text
  // (undefined stays undefined, null becomes '' — both as upstream).
  if (value === undefined) {
    return undefined;
  }
  return value === null ? '' : String(value);
}
