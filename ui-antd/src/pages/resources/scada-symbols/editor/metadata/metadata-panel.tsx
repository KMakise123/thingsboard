/**
 * MetadataPanel — the four-tab symbol metadata editor (M11 wave-2D),
 * ui-ngx `scada-symbol-metadata.component.ts` parity: general / tags /
 * behavior / properties. Fully controlled (metadata in → onChange out,
 * mirroring the fork's FormPropertyForm discipline); validity is gated by
 * the pure `isMetadataValid` helper.
 */

import type { TabsProps } from 'antd';
import { Tabs } from 'antd';
import { useIntl } from 'react-intl';

import type { ScadaSymbolMetadata } from '@/core/scada/symbol-metadata';

import { BehaviorTab } from './behavior-tab';
import { GeneralTab } from './general-tab';
import { PropertiesTab } from './properties-tab';
import { TagsTab } from './tags-tab';

export interface MetadataPanelProps {
  metadata: ScadaSymbolMetadata;
  onChange: (next: ScadaSymbolMetadata) => void;
  /** Tag names present on the canvas (cross-reference for the tags tab). */
  canvasTags: string[];
  disabled: boolean;
  /** Controlled active tab (the page focuses a tag row on request). */
  activeTab?: string;
  onActiveTabChange?: (tab: string) => void;
}

export function MetadataPanel({
  metadata,
  onChange,
  canvasTags,
  disabled,
  activeTab,
  onActiveTabChange,
}: MetadataPanelProps) {
  const { formatMessage } = useIntl();

  const patch = (part: Partial<ScadaSymbolMetadata>) =>
    onChange({ ...metadata, ...part });

  const items: TabsProps['items'] = [
    {
      key: 'general',
      label: formatMessage({
        id: 'pages.resources.scadaSymbolEditor.general.title',
        defaultMessage: 'Title',
      }),
      children: (
        <GeneralTab metadata={metadata} onChange={patch} disabled={disabled} />
      ),
    },
    {
      key: 'tags',
      label: formatMessage({
        id: 'pages.resources.scadaSymbolEditor.tags.title',
        defaultMessage: 'Tags',
      }),
      children: (
        <TagsTab
          metadata={metadata}
          onChange={patch}
          canvasTags={canvasTags}
          disabled={disabled}
        />
      ),
    },
    {
      key: 'behavior',
      label: formatMessage({
        id: 'pages.resources.scadaSymbolEditor.behavior.title',
        defaultMessage: 'Behavior',
      }),
      children: (
        <BehaviorTab metadata={metadata} onChange={patch} disabled={disabled} />
      ),
    },
    {
      key: 'properties',
      label: formatMessage({
        id: 'pages.resources.scadaSymbolEditor.properties.title',
        defaultMessage: 'Properties',
      }),
      children: (
        <PropertiesTab
          metadata={metadata}
          onChange={patch}
          disabled={disabled}
        />
      ),
    },
  ];

  return (
    <div
      data-testid="scada-metadata-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        height: '100%',
      }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={(key) => onActiveTabChange?.(key)}
        items={items}
        style={{ minHeight: 0 }}
      />
    </div>
  );
}

export default MetadataPanel;
