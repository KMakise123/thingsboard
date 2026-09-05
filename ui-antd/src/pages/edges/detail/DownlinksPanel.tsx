/**
 * Edge downlinks tab (M13 wave-4, R05 / spec §5.4) — the cloud-to-edge sync
 * event table, TENANT_ADMIN only, the only UI surface for
 * GET /api/edge/{edgeId}/events. Deliberately NOT the shared EventsPanel:
 * endpoint, derived status column and column set all differ.
 *
 * Wiring pinned against ui-ngx edge-downlink-table-config.ts:
 *  - two-stage fetch: read the SERVER_SCOPE `queueStartTs` attribute first,
 *    load the events page only once it settled (ngx fetchEvents concatMap);
 *  - order = the server response verbatim (backend sorts by seqId ASC and
 *    ignores sort params — no client inversion, no fake sort params);
 *  - time pagination channel (startTime/endTime) with no time-window
 *    picker UI (ngx header is an empty div) — effectively plain paging over
 *    the full range;
 *  - status is derived, never stored: createdTime ≤ queueStartTs →
 *    Deployed, else Pending (the == boundary counts as Deployed; a missing
 *    queueStartTs behaves as 0, so everything renders Pending — same as
 *    ngx). Colors come from antd tokens, not the ngx hex constants;
 *  - the data view opens only for events that are not ADMIN_SETTINGS
 *    deletes — content resolves per type through the entity services
 *    (ngx entity.service getEdgeEventContent parity; body-carrying actions
 *    short-circuit) with a body fallback when no lookup exists.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Alert, App, Button, Modal, Table, Typography, theme } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { getAlarmInfoById } from '@/services/tb/alarm';
import { getAssetInfoById } from '@/services/tb/asset';
import { getAssetProfileById } from '@/services/tb/asset-profile';
import { getAttributes } from '@/services/tb/attributes';
import { getCustomerById } from '@/services/tb/customer';
import { getDashboardInfo } from '@/services/tb/dashboard';
import { getDeviceById } from '@/services/tb/device';
import { getDeviceProfileById } from '@/services/tb/device-profile';
import {
  type EdgeEventsPageLink,
  getEdgeEvents,
  getEdgeInfo,
} from '@/services/tb/edge';
import { getEntityViewInfoById } from '@/services/tb/entity-view';
import { getOtaPackageInfo } from '@/services/tb/ota';
import {
  getRuleChainById,
  getRuleChainMetaData,
} from '@/services/tb/rule-chain';
import { getTenantInfo } from '@/services/tb/tenant';
import { getTenantProfileById } from '@/services/tb/tenant-profile';
import { getUserById } from '@/services/tb/user';
import { getWidgetTypeInfoById } from '@/services/tb/widget-type';
import { getWidgetsBundleById } from '@/services/tb/widgets-bundle';
import type { EntityId } from '@/types/tb';
import { AttributeScope, EntityType } from '@/types/tb';
import type { EdgeEvent } from '@/types/tb/edge';
import { EdgeEventActionType, EdgeEventType } from '@/types/tb/edge';

/** The sync watermark this tab derives its status column from. */
export type EdgeEventStatus = 'DEPLOYED' | 'PENDING';

/**
 * ngx isPending (strictly greater): the boundary `createdTime ==
 * queueStartTs` counts as Deployed — the sync had already started.
 */
export function isEdgeEventPending(
  createdTime: number,
  queueStartTs: number,
): boolean {
  return createdTime > queueStartTs;
}

export function deriveEdgeEventStatus(
  createdTime: number,
  queueStartTs: number,
): EdgeEventStatus {
  return isEdgeEventPending(createdTime, queueStartTs) ? 'PENDING' : 'DEPLOYED';
}

/** Missing/blank attribute behaves as 0 (ngx onUpdate parity). */
export function queueStartTsFromAttributes(
  attributes: Array<{ key: string; value: unknown }>,
): number {
  const value = attributes.find((entry) => entry.key === 'queueStartTs')?.value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (
    typeof value === 'string' &&
    value !== '' &&
    Number.isFinite(Number(value))
  ) {
    return Number(value);
  }
  return 0;
}

/** ngx isEdgeEventHasData: admin-settings rows and deletes have no payload. */
export function edgeEventHasData(
  event: Pick<EdgeEvent, 'type' | 'action'>,
): boolean {
  return !(
    event.type === EdgeEventType.ADMIN_SETTINGS ||
    event.action === EdgeEventActionType.DELETED
  );
}

/** Actions whose body IS the content (ngx bodyContentEdgeEventActionTypes). */
const BODY_ACTION_TYPES: ReadonlySet<EdgeEventActionType> = new Set([
  EdgeEventActionType.POST_ATTRIBUTES,
  EdgeEventActionType.ATTRIBUTES_UPDATED,
  EdgeEventActionType.ATTRIBUTES_DELETED,
  EdgeEventActionType.TIMESERIES_UPDATED,
  EdgeEventActionType.RPC_CALL,
]);

/**
 * ngx entity.service getEdgeEventContent parity: resolve the payload per
 * event type through the entity services, with the raw body as the answer
 * for body-carrying actions and for types without a lookup (RELATION,
 * QUEUE, …). Uses the existing service functions only — no new endpoints.
 */
export async function lookupEdgeEventContent(
  event: EdgeEvent,
): Promise<unknown> {
  if (BODY_ACTION_TYPES.has(event.action)) {
    return event.body;
  }
  const id = event.entityId;
  switch (event.type) {
    case EdgeEventType.DASHBOARD:
      return getDashboardInfo(id);
    case EdgeEventType.ALARM:
      return getAlarmInfoById(id);
    case EdgeEventType.RULE_CHAIN:
      return getRuleChainById(id);
    case EdgeEventType.RULE_CHAIN_METADATA:
      return getRuleChainMetaData(id);
    case EdgeEventType.EDGE:
      return getEdgeInfo(id);
    case EdgeEventType.USER:
      return getUserById(id);
    case EdgeEventType.CUSTOMER:
      return getCustomerById(id);
    case EdgeEventType.TENANT:
      return getTenantInfo(id);
    case EdgeEventType.TENANT_PROFILE:
      return getTenantProfileById(id);
    case EdgeEventType.ASSET:
      return getAssetInfoById(id);
    case EdgeEventType.DEVICE:
      return getDeviceById(id);
    case EdgeEventType.ENTITY_VIEW:
      return getEntityViewInfoById(id);
    case EdgeEventType.WIDGET_TYPE:
      return getWidgetTypeInfoById(id);
    case EdgeEventType.WIDGETS_BUNDLE:
      return getWidgetsBundleById(id);
    case EdgeEventType.DEVICE_PROFILE:
      return getDeviceProfileById(id);
    case EdgeEventType.ASSET_PROFILE:
      return getAssetProfileById(id);
    case EdgeEventType.OTA_PACKAGE:
      return getOtaPackageInfo(id);
    default:
      return event.body;
  }
}

export default function DownlinksPanel({ edgeId }: { edgeId: string }) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewedJson, setViewedJson] = useState<string | null>(null);

  const edgeEntityId = useMemo<EntityId>(
    () => ({ entityType: EntityType.EDGE, id: edgeId }),
    [edgeId],
  );

  // Stage 1: the sync watermark attribute.
  const queueStartTsQuery = useQuery({
    queryKey: ['edge', 'queueStartTs', edgeId],
    queryFn: () =>
      getAttributes(edgeEntityId, AttributeScope.SERVER_SCOPE, [
        'queueStartTs',
      ]),
  });
  const queueStartTs = queueStartTsQuery.data
    ? queueStartTsFromAttributes(queueStartTsQuery.data)
    : 0;

  // Stage 2: the events page, only after the attribute read settled.
  const eventsQuery = useQuery({
    queryKey: ['edge', 'downlinks', edgeId, page, pageSize],
    queryFn: () =>
      getEdgeEvents(edgeId, {
        pageSize,
        page: page - 1,
      } satisfies EdgeEventsPageLink),
    enabled: queueStartTsQuery.isSuccess,
    placeholderData: keepPreviousData,
  });

  const openData = async (event: EdgeEvent) => {
    try {
      const content = await lookupEdgeEventContent(event);
      setViewedJson(JSON.stringify(content, null, 2));
    } catch (error) {
      void message.error(serverErrorText(error));
    }
  };

  const columns = [
    {
      title: formatMessage({
        id: 'pages.edge.createdTime',
        defaultMessage: 'Created time',
      }),
      dataIndex: 'createdTime',
      width: 170,
      render: (ts: number) => dayjs(ts).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: formatMessage({
        id: 'pages.edge.downlinks.type',
        defaultMessage: 'Type',
      }),
      dataIndex: 'type',
      width: 160,
      render: (type: EdgeEventType) =>
        formatMessage({
          id: `pages.edge.eventType.${type}`,
          defaultMessage: type,
        }),
    },
    {
      title: formatMessage({
        id: 'pages.edge.downlinks.action',
        defaultMessage: 'Action',
      }),
      dataIndex: 'action',
      width: 170,
      render: (action: EdgeEventActionType) =>
        formatMessage({
          id: `pages.edge.eventAction.${action}`,
          defaultMessage: action,
        }),
    },
    {
      title: formatMessage({
        id: 'pages.edge.downlinks.entityId',
        defaultMessage: 'Entity id',
      }),
      dataIndex: 'entityId',
      ellipsis: true,
    },
    {
      title: formatMessage({
        id: 'pages.edge.downlinks.status',
        defaultMessage: 'Status',
      }),
      key: 'status',
      width: 110,
      render: (_: unknown, record: EdgeEvent) => {
        const pending = isEdgeEventPending(record.createdTime, queueStartTs);
        return (
          <span
            style={{
              color: pending ? token.colorTextTertiary : token.colorText,
            }}
          >
            {formatMessage({
              id: pending
                ? 'pages.edge.downlinks.pending'
                : 'pages.edge.downlinks.deployed',
              defaultMessage: pending ? 'Pending' : 'Deployed',
            })}
          </span>
        );
      },
    },
    {
      title: formatMessage({
        id: 'pages.edge.downlinks.data',
        defaultMessage: 'Data',
      }),
      key: 'data',
      width: 90,
      render: (_: unknown, record: EdgeEvent) => (
        <Button
          type="link"
          size="small"
          disabled={!edgeEventHasData(record)}
          onClick={() => void openData(record)}
        >
          {formatMessage({
            id: 'pages.edge.downlinks.viewData',
            defaultMessage: 'View',
          })}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {eventsQuery.isError && (
        <Alert
          type="error"
          showIcon
          message={formatMessage({
            id: 'pages.edge.downlinks.loadFailed',
            defaultMessage: 'Failed to load downlinks',
          })}
          description={serverErrorText(eventsQuery.error)}
        />
      )}
      <Table<EdgeEvent>
        rowKey={(record) => String(record.seqId)}
        size="small"
        columns={columns}
        dataSource={eventsQuery.data?.data ?? []}
        loading={eventsQuery.isPending}
        pagination={{
          current: page,
          pageSize,
          total: eventsQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          onChange: (nextPage, nextSize) => {
            setPage(nextPage);
            setPageSize(nextSize);
          },
        }}
        locale={{
          emptyText: (
            <Typography.Text type="secondary">
              {formatMessage({
                id: 'pages.edge.downlinks.empty',
                defaultMessage: 'No downlinks yet',
              })}
            </Typography.Text>
          ),
        }}
      />
      <Modal
        open={viewedJson !== null}
        title={formatMessage({
          id: 'pages.edge.downlinks.data',
          defaultMessage: 'Data',
        })}
        footer={null}
        width={720}
        onCancel={() => setViewedJson(null)}
      >
        <pre className="max-h-[60vh] overflow-auto text-xs">{viewedJson}</pre>
      </Modal>
    </div>
  );
}
