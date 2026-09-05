/**
 * Handwritten authoritative widgets-bundle wire types (M11 wave 1B).
 *
 * Source of truth (cross-checked, in priority order):
 *   - backend `WidgetsBundleController.java` (+ the bundle-widget endpoints
 *     it shares with `WidgetTypeController.java`);
 *   - openapi snapshot: the `WidgetsBundle` schema and the
 *     `getWidgetsBundles` / `getAllWidgetsBundles` / `saveWidgetsBundle`
 *     operations;
 *   - ui-ngx `shared/models/widgets-bundle.model.ts` +
 *     `import-export/import-export.models.ts` (WidgetsBundleItem — the
 *     portable bundle export/import payload).
 *
 * Snapshot quirk: the generated schema marks `title` / `description` /
 * `order` readOnly, but the same fields are round-tripped by the upstream
 * save flow (widgets-bundle-dialog edits title + description and POSTs the
 * whole entity) — they are writable here, matching the wire behavior, not
 * the annotation.
 */

import type { EntityIdOf, EntityType, EpochMillis } from './entity';
import type { WidgetTypeDetails } from './widget-type';

/**
 * Widgets bundle entity — `GET /api/widgetsBundle/{id}` response and the
 * `POST /api/widgetsBundle` request/response body (upsert: with id =
 * update, without = create; the server mints `alias` on create and forces
 * `tenantId` from the session).
 */
export interface WidgetsBundle {
  id?: EntityIdOf<EntityType.WIDGETS_BUNDLE>;
  /** ms since epoch (server-assigned). */
  readonly createdTime?: EpochMillis;
  /** server-forced on save (NULL_UUID = system bundle). */
  readonly tenantId?: EntityIdOf<EntityType.TENANT>;
  /**
   * Scope-less unique alias (widget types reference bundles by it);
   * server-minted from the title on create — never posted back.
   */
  readonly alias?: string;
  /** UI/search title. */
  title: string;
  /**
   * Relative or external image URL. Relative URLs come back as base64
   * data URLs when the read carries `?inlineImages=true` (the export read).
   */
  image?: string;
  /** Whether the bundle groups SCADA symbol widget types. */
  scada?: boolean;
  description?: string;
  /** manual sort weight (dashboard bundle pickers order by it). */
  order?: number;
  /** optimistic-lock version; pass back on update, 409 on conflict. */
  version?: number;
  /** legacy BaseData name tail — kept so unknown consumers round-trip. */
  name?: string;
  [key: string]: unknown;
}

/** Extra query params of the paged `GET /api/widgetsBundles`. */
export interface WidgetsBundleListQuery {
  /** only tenant-owned bundles (TA session). */
  tenantOnly?: boolean;
  /** also search by description, not only title. */
  fullSearch?: boolean;
  /** fetch SCADA bundles first. */
  scadaFirst?: boolean;
}

/**
 * Portable widgets-bundle export/import payload (ui-ngx WidgetsBundleItem).
 * The two widget members are mutually alternative upstream: a bundle saved
 * with full types exports `widgetTypes`, one saved by-reference exports
 * `widgetTypeFqns`; the import merges both channels into one fqn set.
 */
export interface WidgetsBundleExportItem {
  widgetsBundle: WidgetsBundle;
  widgetTypes?: WidgetTypeDetails[];
  widgetTypeFqns?: string[];
}
