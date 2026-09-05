/**
 * ResourceReferences → ResourceReferenceEntry[] resolution (pure, shared by
 * every resources-family delete flow — file library, JS library, wave-2C
 * image gallery).
 *
 * ui-ngx image-references parity (entityType → translated type name +
 * details URL), with the details-page map narrowed to the routes THIS fork
 * actually has: entity types without a details page degrade to plain text
 * (the slot stays link-ready). Unknown entity types fall back to the raw
 * wire string instead of dropping rows.
 */
import {
  ApartmentOutlined,
  AppstoreOutlined,
  BlockOutlined,
  DashboardOutlined,
  EyeOutlined,
  PartitionOutlined,
  TabletOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type { PrimitiveType } from 'intl-messageformat';
import type { ReactNode } from 'react';

import { EntityType } from '@/types/tb/entity';
import type { ResourceReferences } from '@/types/tb/resource';

import type { ResourceReferenceEntry } from './resources-in-use';

/** Caller-side formatMessage (structural — keeps this file UI-agnostic). */
export type FormatMessage = (
  descriptor: { id: string; defaultMessage?: string },
  values?: Record<string, PrimitiveType>,
) => string;

/** entity type → translated display name (i18n keys live with the library page locale). */
const NAME_KEYS: Partial<Record<EntityType, string>> = {
  [EntityType.WIDGET_TYPE]: 'pages.resources.library.entityTypes.WIDGET_TYPE',
  [EntityType.WIDGETS_BUNDLE]:
    'pages.resources.library.entityTypes.WIDGETS_BUNDLE',
  [EntityType.DASHBOARD]: 'pages.resources.library.entityTypes.DASHBOARD',
  [EntityType.RULE_CHAIN]: 'pages.resources.library.entityTypes.RULE_CHAIN',
  [EntityType.DEVICE_PROFILE]:
    'pages.resources.library.entityTypes.DEVICE_PROFILE',
  [EntityType.ASSET_PROFILE]:
    'pages.resources.library.entityTypes.ASSET_PROFILE',
  [EntityType.DEVICE]: 'pages.resources.library.entityTypes.DEVICE',
  [EntityType.ASSET]: 'pages.resources.library.entityTypes.ASSET',
  [EntityType.ENTITY_VIEW]: 'pages.resources.library.entityTypes.ENTITY_VIEW',
  [EntityType.CUSTOMER]: 'pages.resources.library.entityTypes.CUSTOMER',
  [EntityType.USER]: 'pages.resources.library.entityTypes.USER',
  [EntityType.TENANT]: 'pages.resources.library.entityTypes.TENANT',
};

/** entity type → small icon next to the reference row (optional). */
const ICONS: Partial<Record<EntityType, ReactNode>> = {
  [EntityType.WIDGET_TYPE]: <AppstoreOutlined />,
  [EntityType.WIDGETS_BUNDLE]: <BlockOutlined />,
  [EntityType.DASHBOARD]: <DashboardOutlined />,
  [EntityType.RULE_CHAIN]: <ApartmentOutlined />,
  [EntityType.DEVICE_PROFILE]: <PartitionOutlined />,
  [EntityType.ASSET_PROFILE]: <PartitionOutlined />,
  [EntityType.DEVICE]: <TabletOutlined />,
  [EntityType.ASSET]: <ToolOutlined />,
  [EntityType.ENTITY_VIEW]: <EyeOutlined />,
};

/** Details-page base per entity type — ONLY routes this fork ships. */
const DETAILS_BASE: Partial<Record<EntityType, string>> = {
  [EntityType.DEVICE]: '/devices',
  [EntityType.ASSET]: '/assets',
  [EntityType.DASHBOARD]: '/dashboards',
  [EntityType.RULE_CHAIN]: '/ruleChains',
  [EntityType.ENTITY_VIEW]: '/entityViews',
  [EntityType.WIDGET_TYPE]: '/widgets/editor',
  [EntityType.WIDGETS_BUNDLE]: '/resources/widgets-bundles',
};

/**
 * Flatten a references map into renderable rows. `formatMessage` resolves
 * the entity-type display names; unknown types degrade to the raw wire
 * string (upstream falls back to the key the same way).
 */
export function referencesToEntries(
  references: ResourceReferences,
  formatMessage: FormatMessage,
): Array<ResourceReferenceEntry> {
  const entries: Array<ResourceReferenceEntry> = [];
  for (const [entityType, entities] of Object.entries(references)) {
    if (!Array.isArray(entities)) {
      continue;
    }
    const type = entityType as EntityType;
    const nameKey = NAME_KEYS[type];
    const typeName = nameKey
      ? formatMessage({ id: nameKey, defaultMessage: entityType })
      : entityType;
    for (const [index, entity] of entities.entries()) {
      const base = DETAILS_BASE[type];
      const id = entity?.id?.id;
      entries.push({
        key: `${type}-${id ?? index}-${index}`,
        typeName,
        name: entity?.name || id || entityType,
        href: base && id ? `${base}/${id}` : undefined,
        icon: ICONS[type],
      });
    }
  }
  return entries;
}
