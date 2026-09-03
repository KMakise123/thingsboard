/**
 * NodeLibrary — the rule-node palette (M8 brief §3 wave C, spec §4.8): the
 * six component groups in fixed order inside one antd Collapse, a search
 * box SHARED with the canvas highlight (shell-owned `searchText`), and
 * HTML5 drag-and-drop items — the canvas wrapper's onDrop resolves the drop
 * point with RF `screenToFlowPosition` and opens the add-node dialog.
 */
import { Collapse, Empty, Input, Spin, Tag, Tooltip, theme } from 'antd';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';

import type { RuleNodeComponentDescriptor } from '@/types/tb/rule-chain';

import { RULE_NODE_DROP_MIME } from '../canvas';
import { RULE_NODE_COMPONENT_TYPES } from './use-rule-node-components';

export interface NodeLibraryProps {
  descriptors: Array<RuleNodeComponentDescriptor> | undefined;
  loading: boolean;
  searchText: string;
  onSearchTextChange: (text: string) => void;
}

function matches(query: string, descriptor: RuleNodeComponentDescriptor) {
  if (!query.trim()) {
    return true;
  }
  const needle = query.trim().toLowerCase();
  return (
    descriptor.name.toLowerCase().includes(needle) ||
    descriptor.clazz.toLowerCase().includes(needle)
  );
}

export function NodeLibrary({
  descriptors,
  loading,
  searchText,
  onSearchTextChange,
}: NodeLibraryProps) {
  const { formatMessage } = useIntl();
  const { token } = theme.useToken();

  const groups = useMemo(() => {
    const byType = new Map<string, Array<RuleNodeComponentDescriptor>>();
    for (const type of RULE_NODE_COMPONENT_TYPES) {
      byType.set(
        type,
        (descriptors ?? []).filter(
          (descriptor) =>
            descriptor.type === type && matches(searchText, descriptor),
        ),
      );
    }
    return byType;
  }, [descriptors, searchText]);

  if (loading) {
    return <Spin style={{ display: 'block', margin: '32px auto' }} />;
  }

  const items = RULE_NODE_COMPONENT_TYPES.map((type) => ({
    key: type,
    label: (
      <span>
        {formatMessage({
          id: `editor.ruleChain.canvas.library.group.${type.toLowerCase()}`,
          defaultMessage: type,
        })}
        <Tag style={{ marginLeft: 8 }}>{groups.get(type)?.length ?? 0}</Tag>
      </span>
    ),
    children: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {(groups.get(type) ?? []).map((descriptor) => (
          <Tooltip
            key={descriptor.clazz}
            title={
              descriptor.configurationDescriptor?.nodeDefinition?.description
            }
            placement="right"
          >
            <div
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(
                  RULE_NODE_DROP_MIME,
                  descriptor.clazz,
                );
                event.dataTransfer.effectAllowed = 'copy';
              }}
              data-testid="rc-library-item"
              data-rc-clazz={descriptor.clazz}
              style={{
                padding: '6px 8px',
                borderRadius: token.borderRadiusSM,
                border: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorBgContainer,
                cursor: 'grab',
                userSelect: 'none',
              }}
            >
              <div
                style={{ fontSize: token.fontSizeSM, color: token.colorText }}
              >
                {descriptor.name}
              </div>
              <div
                style={{
                  fontSize: token.fontSize - 2,
                  color: token.colorTextSecondary,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {descriptor.clazz.split('.').pop()}
              </div>
            </div>
          </Tooltip>
        ))}
        {(groups.get(type) ?? []).length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={formatMessage({
              id: 'editor.ruleChain.canvas.library.empty',
              defaultMessage: 'No matching nodes',
            })}
          />
        ) : null}
      </div>
    ),
  }));

  return (
    <div
      data-testid="rc-node-library"
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <Input
        value={searchText}
        onChange={(event) => onSearchTextChange(event.target.value)}
        placeholder={formatMessage({
          id: 'editor.ruleChain.canvas.toolbar.search',
          defaultMessage: 'Search nodes',
        })}
        allowClear
        data-testid="rc-library-search"
      />
      <Collapse
        items={items}
        defaultActiveKey={RULE_NODE_COMPONENT_TYPES}
        size="small"
        bordered={false}
      />
    </div>
  );
}
