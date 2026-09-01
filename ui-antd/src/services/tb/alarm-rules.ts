/**
 * Alarm-rule transport (handwritten) — entity alarm-rules tab.
 *
 * Alarm rules are calculated fields of type ALARM on this backend
 * (openapi AlarmRuleDefinition); the tab lists the entity-scoped page and
 * edits through the dedicated /api/alarm/rule endpoints.
 *
 * Base paths:
 *   GET    /api/alarm/rules/{entityType}/{entityId}   entity-scoped page
 *   POST   /api/alarm/rule                            save
 *   DELETE /api/alarm/rule/{alarmRuleId}              delete
 */

import type { QueryParams } from '@/core/http/client';
import type { AlarmSeverity } from '@/types/tb';
import type { CalculatedFieldConfiguration } from './calculated-fields';

import { tbHttp } from './http';
import type {
  BaseData,
  EntityId,
  EntityType,
  HasTenantIdAndCustomer,
  HasVersion,
  PageData,
  PageLink,
} from '@/types/tb';

/** ui-ngx AlarmRule models — the condition tree the backend round-trips. */
export interface AlarmRuleNumericPredicate {
  type: 'NUMERIC';
  operation:
    | 'EQUAL'
    | 'NOT_EQUAL'
    | 'GREATER'
    | 'LESS'
    | 'GREATER_OR_EQUAL'
    | 'LESS_OR_EQUAL';
  value: { staticValue?: number; dynamicValueArgument?: string };
}

export interface AlarmRuleFilter {
  argument: string;
  valueType: 'NUMERIC';
  operation: 'AND' | 'OR';
  predicates: Array<AlarmRuleNumericPredicate>;
}

export interface AlarmRuleCondition {
  type: 'SIMPLE' | 'DURATION' | 'REPEATING';
  expression: {
    type: 'SIMPLE' | 'TBEL';
    expression?: string;
    filters?: Array<AlarmRuleFilter>;
    operation?: 'AND' | 'OR';
  };
}

export interface AlarmRule {
  condition: AlarmRuleCondition;
  alarmDetails?: string;
}

/** ALARM-type calculated-field configuration (ui-ngx CalculatedFieldAlarmRuleConfiguration). */
export interface AlarmRuleConfiguration extends CalculatedFieldConfiguration {
  type: 'ALARM';
  arguments: Record<
    string,
    { refEntityId: EntityId; refEntityKey: { type: string; key: string } }
  >;
  createRules: Partial<Record<AlarmSeverity, AlarmRule>>;
  clearRule?: AlarmRule;
  propagate?: boolean;
}

/** GET/POST row (openapi AlarmRuleDefinition). */
export interface AlarmRuleDefinition
  extends BaseData<{ entityType: EntityType; id: string }>,
    HasTenantIdAndCustomer,
    HasVersion {
  entityId: EntityId;
  type: 'ALARM';
  name: string;
  debugMode?: boolean;
  configurationVersion?: number;
  configuration: AlarmRuleConfiguration;
  additionalInfo?: Record<string, unknown>;
}

/** GET /api/alarm/rules/{entityType}/{entityId} — entity-scoped page. */
export async function getAlarmRulesByEntityId(
  entityId: EntityId,
  pageLink: PageLink,
): Promise<PageData<AlarmRuleDefinition>> {
  const params: QueryParams = {
    pageSize: pageLink.pageSize,
    page: pageLink.page,
    textSearch: pageLink.textSearch,
    sortProperty: pageLink.sortOrder?.property,
    sortOrder: pageLink.sortOrder?.direction,
  };
  return tbHttp.get<PageData<AlarmRuleDefinition>>(
    `/api/alarm/rules/${entityId.entityType}/${entityId.id}`,
    params,
  );
}

/** POST /api/alarm/rule — create/update. */
export async function saveAlarmRule(
  rule: AlarmRuleDefinition,
): Promise<AlarmRuleDefinition> {
  return tbHttp.post<AlarmRuleDefinition>('/api/alarm/rule', rule);
}

/** DELETE /api/alarm/rule/{id}. */
export async function deleteAlarmRule(
  alarmRuleId: string,
): Promise<boolean> {
  return tbHttp.delete<boolean>(`/api/alarm/rule/${alarmRuleId}`);
}

/** Severities carrying a create rule, in display order. */
export function alarmRuleSeverities(rule: AlarmRuleDefinition): Array<string> {
  const order = [
    'CRITICAL',
    'MAJOR',
    'MINOR',
    'WARNING',
    'INDETERMINATE',
  ];
  const present = Object.keys(rule.configuration?.createRules ?? {});
  return order.filter((severity) => present.includes(severity));
}
