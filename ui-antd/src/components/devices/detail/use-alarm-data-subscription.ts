/**
 * useAlarmDataSubscription — the React binding for the core/ws ALARM_DATA
 * channel (spec 3.6: the alarms tab consumes the WS stream, not REST
 * polling). Mirrors the core hook family's shape (useSyncExternalStore over
 * the manager's per-subscription buffer; WS data never enters the query
 * cache). Lives here instead of core/ws because core is closed for this
 * wave — the manager surface it consumes is public API.
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { getDefaultWsManager } from '@/core/ws/hooks';
import type { WsStatus } from '@/core/ws/manager';
import type { AlarmSearchStatus } from '@/services/tb/alarm';
import type { AlarmData, EntityId } from '@/types/tb';

/** EntityKey wire shape for entityFields / alarmFields. */
interface EntityKeyWire {
  type: string;
  key: string;
}

export interface AlarmDataQueryWire {
  entityFilter: { type: 'singleEntity'; singleEntity: EntityId };
  pageLink: {
    pageSize: number;
    page: number;
    sortOrder: {
      key: EntityKeyWire;
      direction: 'ASC' | 'DESC';
    };
    statusList?: Array<AlarmSearchStatus>;
  };
  entityFields: Array<EntityKeyWire>;
  alarmFields: Array<EntityKeyWire>;
}

/** Fields the alarms table + details dialog need from every alarm row. */
const ALARM_FIELDS: Array<EntityKeyWire> = [
  { type: 'ALARM_FIELD', key: 'createdTime' },
  { type: 'ALARM_FIELD', key: 'startTime' },
  { type: 'ALARM_FIELD', key: 'endTime' },
  { type: 'ALARM_FIELD', key: 'ackTime' },
  { type: 'ALARM_FIELD', key: 'clearTime' },
  { type: 'ALARM_FIELD', key: 'assignTime' },
  { type: 'ALARM_FIELD', key: 'originatorDisplayName' },
  { type: 'ALARM_FIELD', key: 'originatorLabel' },
  { type: 'ALARM_FIELD', key: 'type' },
  { type: 'ALARM_FIELD', key: 'severity' },
  { type: 'ALARM_FIELD', key: 'status' },
  { type: 'ALARM_FIELD', key: 'assignee' },
  { type: 'ALARM_FIELD', key: 'details' },
];

const ENTITY_FIELDS: Array<EntityKeyWire> = [
  { type: 'ENTITY_FIELD', key: 'createdTime' },
  { type: 'ENTITY_FIELD', key: 'name' },
  { type: 'ENTITY_FIELD', key: 'label' },
  { type: 'ENTITY_FIELD', key: 'additionalInfo' },
];

/**
 * Build the ALARM_DATA query for one entity (singleEntity filter pre-fills
 * the entity-scoped tab, exactly the ui-ngx alarm-table datasource shape).
 */
export function buildAlarmDataQuery(
  entityId: EntityId,
  options: {
    statusList?: Array<AlarmSearchStatus>;
    pageSize?: number;
  } = {},
): AlarmDataQueryWire {
  const pageLink: AlarmDataQueryWire['pageLink'] = {
    pageSize: options.pageSize ?? 100,
    page: 0,
    sortOrder: {
      key: { type: 'ENTITY_FIELD', key: 'createdTime' },
      direction: 'DESC',
    },
  };
  if (options.statusList?.length) {
    pageLink.statusList = options.statusList;
  }
  return {
    entityFilter: { type: 'singleEntity', singleEntity: entityId },
    pageLink,
    entityFields: ENTITY_FIELDS,
    alarmFields: ALARM_FIELDS,
  };
}

export interface AlarmSubscriptionResult {
  data: AlarmData[];
  status: WsStatus;
}

export function useAlarmDataSubscription(params: {
  entityId: EntityId;
  statusList?: Array<AlarmSearchStatus>;
  seed?: AlarmData[];
}): AlarmSubscriptionResult {
  const manager = getDefaultWsManager();
  const entityType = params.entityId.entityType;
  const entityId = params.entityId.id;
  const statusList = params.statusList?.join(',') ?? '';
  const seed = params.seed;

  const query = useMemo(
    () =>
      buildAlarmDataQuery(
        { entityType, id: entityId },
        {
          statusList: statusList
            ? (statusList.split(',') as Array<AlarmSearchStatus>)
            : undefined,
        },
      ),
    [entityType, entityId, statusList],
  );

  const subscription = useMemo(
    () =>
      manager.subscribeAlarmData({
        query: query as unknown as Record<string, unknown>,
        seed,
      }),
    [manager, query, seed],
  );

  useEffect(
    () => () => {
      subscription.unsubscribe();
    },
    [subscription],
  );

  const data = useSyncExternalStore(
    (listener) => subscription.subscribe(listener),
    () => subscription.getSnapshot(),
  );
  return { data, status: subscription.getStatus() };
}
