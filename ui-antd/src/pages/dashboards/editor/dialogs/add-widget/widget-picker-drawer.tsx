/**
 * Right-side widget type picker drawer (spec §3.2 添加 widget step 1):
 * grouped + searched over the builtin WIDGET_REGISTRY list. Unknown fqns
 * are out of scope for picking (the registry only lists react builtin
 * types); the three placeholder states never surface here.
 *
 * Scada pass-through (spec §3.6-1, M11 wave 2E): on a scada-layout target
 * BOTH upstream fetch paths (widgetTypes + widgetsBundles) carry
 * `scadaFirst=true` — ui-ngx parity anchor
 * dashboard-widget-select.component.ts:112-117 (the scadaFirst input) and
 * 292-307 (both fetch functions feed it through). The registry above stays
 * the picker source for now: pre-M11 no scada symbol types exist, so there
 * is nothing to merge yet — the wave-3V walkthrough witnesses the network
 * param on these two requests (and, once scada types exist, the pinning).
 */
import { useQuery } from '@tanstack/react-query';
import { Drawer, Empty, Input, List, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

import { WIDGET_REGISTRY } from '@/components/widgets/registry';
import { getWidgetTypes } from '@/services/tb/widget-type';
import { getWidgetsBundles } from '@/services/tb/widgets-bundle';

export interface WidgetPickerDrawerProps {
  open: boolean;
  onClose: () => void;
  onPick: (fqn: string) => void;
  /** target layout is scada — the two fetch paths must ask scada-first. */
  scadaFirst?: boolean;
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

/**
 * Human label of a widget type (D3): registry meta.label first, the raw fqn
 * as last resort. The widgetType-probe name leg of the resolution chain is
 * unreachable from the add-widget flow — the picker only offers registry
 * fqns, so an unknown fqn can only surface from direct callers.
 */
export function widgetTypeLabel(fqn: string): string {
  return WIDGET_REGISTRY[fqn]?.meta?.label ?? fqn;
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

/** Single first page is enough for the pass-through probe (upstream pages
 *  these paths; merging server rows is a post-M11 concern). */
const SCADA_PROBE_PAGE = { pageSize: 100, page: 0 } as const;

export function WidgetPickerDrawer({
  open,
  onClose,
  onPick,
  scadaFirst = false,
}: WidgetPickerDrawerProps) {
  const { formatMessage } = useIntl();
  const [search, setSearch] = useState('');

  // §3.6-1 probes — one per upstream fetch path, both scadaFirst=true.
  // Results stay unconsumed until scada symbol types exist (see header);
  // staleTime keeps repeat opens on one wire round-trip per session.
  useQuery({
    queryKey: ['add-widget-scada-widget-types'],
    queryFn: () => getWidgetTypes(SCADA_PROBE_PAGE, { scadaFirst: true }),
    enabled: open && scadaFirst,
    staleTime: Infinity,
  });
  useQuery({
    queryKey: ['add-widget-scada-bundles'],
    queryFn: () => getWidgetsBundles(SCADA_PROBE_PAGE, { scadaFirst: true }),
    enabled: open && scadaFirst,
    staleTime: Infinity,
  });

  const entries = useMemo<PickerEntry[]>(
    () =>
      Object.entries(WIDGET_REGISTRY)
        .map(([fqn]) => ({
          fqn,
          label: widgetTypeLabel(fqn),
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
