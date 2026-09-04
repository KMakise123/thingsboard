/**
 * defaultConfig parsing for the preview (spec §5.4).
 *
 * The draft carries defaultConfig as a JSON STRING end-to-end (F's frozen
 * contract — the backend helper depends on the string form); the preview is
 * the only consumer that parses it. An empty/blank string is an EMPTY
 * config (not an error — a brand-new widget starts blank); anything that
 * parses to a non-object IS an error and rides the runtime error channel
 * (spec §5.5 — the brief pins "解析失败 = 编译后执行错").
 */

import type { WidgetConfig } from '@/types/tb/widget';

export type ParsedDefaultConfig =
  | {
      ok: true;
      config: WidgetConfig;
      settings: Record<string, unknown>;
    }
  | { ok: false; message: string };

export function parseDefaultConfig(text: string): ParsedDefaultConfig {
  const trimmed = text.trim();
  if (trimmed === '') {
    return { ok: true, config: {}, settings: {} };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      ok: false,
      message: `defaultConfig must be a JSON object, got ${Array.isArray(parsed) ? 'an array' : typeof parsed}`,
    };
  }
  const config = parsed as WidgetConfig;
  const settings =
    typeof config.settings === 'object' && config.settings !== null
      ? (config.settings as Record<string, unknown>)
      : {};
  return { ok: true, config, settings };
}
