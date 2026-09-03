/**
 * Right-side widget type picker drawer (spec §3.2 添加 widget step 1):
 * grouped + searched over the builtin WIDGET_REGISTRY list. Unknown fqns
 * are out of scope for picking (the registry only lists react builtin
 * types); the three placeholder states never surface here.
 */
import { Drawer, Empty, Input, List, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

import { WIDGET_REGISTRY } from '@/components/widgets/registry';

export interface WidgetPickerDrawerProps {
  open: boolean;
  onClose: () => void;
  onPick: (fqn: string) => void;
}

interface PickerEntry {
  fqn: string;
  label: string;
  group: string;
}

/** Bundle group from the fqn: `system.cards.entities_table` → `cards`; a
 *  two-segment fqn (`system.map`) falls into the general bucket. */
export function widgetGroupOf(fqn: string): string {
  const withoutScope = fqn.startsWith('system.') ? fqn.slice(7) : fqn;
  const segments = withoutScope.split('.');
  return segments.length > 1 ? segments.slice(0, -1).join('.') : 'general';
}

function groupLabel(
  group: string,
  formatMessage: (m: { id: string; defaultMessage: string }) => string,
): string {
  if (group === 'general') {
    return formatMessage({
      id: 'editor.dashboard.addWidget.group.general',
      defaultMessage: 'General',
    });
  }
  return group.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export function WidgetPickerDrawer({
  open,
  onClose,
  onPick,
}: WidgetPickerDrawerProps) {
  const { formatMessage } = useIntl();
  const [search, setSearch] = useState('');

  const entries = useMemo<PickerEntry[]>(
    () =>
      Object.entries(WIDGET_REGISTRY)
        .map(([fqn, entry]) => ({
          fqn,
          label: entry.meta?.label ?? fqn,
          group: widgetGroupOf(fqn),
        }))
        .sort(
          (a, b) =>
            a.group.localeCompare(b.group) || a.label.localeCompare(b.label),
        ),
    [],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return entries;
    }
    return entries.filter(
      (entry) =>
        entry.label.toLowerCase().includes(needle) ||
        entry.fqn.toLowerCase().includes(needle),
    );
  }, [entries, search]);

  const groups = useMemo(() => {
    const map = new Map<string, PickerEntry[]>();
    for (const entry of filtered) {
      const bucket = map.get(entry.group) ?? [];
      bucket.push(entry);
      map.set(entry.group, bucket);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <Drawer
      open={open}
      placement="right"
      width={320}
      title={formatMessage({
        id: 'editor.dashboard.addWidget.title',
        defaultMessage: 'Choose a widget type',
      })}
      onClose={onClose}
      destroyOnHidden
      data-testid="add-widget-drawer"
    >
      <Input
        allowClear
        placeholder={formatMessage({
          id: 'editor.dashboard.addWidget.search',
          defaultMessage: 'Search widget types',
        })}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        style={{ marginBottom: 12 }}
        data-testid="add-widget-search"
      />
      {filtered.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        groups.map(([group, groupEntries]) => (
          <div key={group} data-widget-group={group}>
            <Typography.Text type="secondary">
              {groupLabel(group, formatMessage)}
            </Typography.Text>
            <List
              size="small"
              dataSource={groupEntries}
              renderItem={(entry) => (
                <List.Item
                  style={{ cursor: 'pointer' }}
                  data-widget-pick={entry.fqn}
                  onClick={() => onPick(entry.fqn)}
                >
                  <Typography.Text>{entry.label}</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {entry.fqn}
                  </Typography.Text>
                </List.Item>
              )}
            />
          </div>
        ))
      )}
    </Drawer>
  );
}
