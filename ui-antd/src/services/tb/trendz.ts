/**
 * Trendz settings transport (handwritten) — M14 wave-1 (settings /trendz).
 *
 * Base paths (TrendzSettingsController.java, TA + CU reads; TA writes):
 *   GET  /api/trendz/settings   read (unconfigured = EMPTY OBJECT, not 404)
 *   POST /api/trendz/settings   save (response echoes the request body)
 *
 * Wire gotcha (contract #22): GET does NOT strip the apiKey —
 * CUSTOMER_USER can read it raw. That is upstream-intended (CU consumes
 * Trendz directly); the antd side simply has no CU entry point for this
 * domain. Backend tightening is a separate registered issue, not M14.
 */

import { tbHttp } from './http';

/** GET/POST /api/trendz/settings body (openapi TrendzSettings). */
export interface TrendzSettings {
  enabled?: boolean;
  baseUrl?: string;
  /** NOT stripped on read — see the header note before adding consumers. */
  apiKey?: string;
}

/** GET /api/trendz/settings — unconfigured comes back as an empty object (never 404). */
export async function getTrendzSettings(): Promise<TrendzSettings> {
  return tbHttp.get<TrendzSettings>('/api/trendz/settings');
}

/** POST /api/trendz/settings — the response echoes the posted body. */
export async function saveTrendzSettings(
  settings: TrendzSettings,
): Promise<TrendzSettings> {
  return tbHttp.post<TrendzSettings>('/api/trendz/settings', settings);
}
