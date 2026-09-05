/**
 * The 14 trigger-config forms (M12 wave 3-B, spec §4.5; field-level parity
 * with ui-ngx rule-notification-dialog.component.html:119-712, anchors in
 * docs/agents/m12-ngx-inventory.md §5).
 *
 * All forms render INSIDE the wizard's trigger `<Form>` so their Form.Items
 * share one form instance. Conditional blocks (DEVICE_ACTIVITY either-side,
 * RULE_ENGINE rule-node sub-area) go through the M11 `shouldUpdate` render
 * prop, not Form.useWatch — the watch lags one render behind setFieldsValue.
 */
import {
  Form,
  Input,
  InputNumber,
  Segmented,
  Select,
  Slider,
  Switch,
} from 'antd';
import { useIntl } from 'react-intl';

import { RecipientEntitySelect } from '@/components/notifications/recipient-entity-select';
import {
  getDeviceInfoById,
  getDeviceProfiles,
  getTenantDevices,
} from '@/services/tb/device';
import { getEdgeInfo, getTenantEdgeInfos } from '@/services/tb/edge';
import { tbHttp } from '@/services/tb/http';
import { getRuleChains } from '@/services/tb/rule-chain';
import type { DeviceInfo, RuleChain } from '@/types/tb';
import { AlarmSeverity } from '@/types/tb/alarm';
import { EntityType } from '@/types/tb/entity';
import {
  AlarmAction,
  AlarmAssignmentAction,
  AlarmSearchStatus,
  ApiFeature,
  ApiUsageStateValue,
  DeviceActivityEvent,
  EdgeConnectivityEvent,
  LimitedApi,
  NotificationRuleTriggerType,
  RuleEngineLifecycleEvent,
  type NotificationRuleTriggerType as TriggerType,
} from '@/types/tb/notification';
import type { PageData } from '@/types/tb/page';
import {
  ENTITIES_LIMIT_ENTITY_TYPES,
  ENTITY_ACTION_ENTITY_TYPES,
} from './rule-meta';
import type { TriggerFormValues } from './rule-submit';

const PICKER_PAGE_SORT = {
  pageSize: 50,
  page: 0,
  sortOrder: { property: 'name', direction: 'ASC' as const },
};

interface EdgeRow {
  id: { id: string };
  name: string;
}

/** GET /api/tenant/edgeInfos — tenant-scope edge list via the edge service. */
async function fetchEdges(textSearch: string): Promise<PageData<EdgeRow>> {
  return getTenantEdgeInfos(
    { ...PICKER_PAGE_SORT, textSearch: textSearch || undefined },
    'DEFAULT',
  );
}

async function fetchEdgeById(id: string) {
  const edge = await getEdgeInfo(id);
  return { label: edge.name, value: id };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Enum-value → translated option list (label key `<prefix>.<VALUE>`). */
function useEnumOptions() {
  const { formatMessage } = useIntl();
  return <T extends string>(values: Array<T>, prefix: string) =>
    values.map((value) => ({
      value,
      label: formatMessage({ id: `${prefix}.${value}`, defaultMessage: value }),
    }));
}

function useLabel() {
  const { formatMessage } = useIntl();
  return (id: string, defaultMessage: string) =>
    formatMessage({ id, defaultMessage });
}

const ALARM_SEARCH_STATUSES: Array<AlarmSearchStatus> = [
  AlarmSearchStatus.ACTIVE,
  AlarmSearchStatus.CLEARED,
  AlarmSearchStatus.ACK,
  AlarmSearchStatus.UNACK,
];

/** Slider + number combo on one percent form field (ui-ngx limit-slider). */
function PercentField({
  value,
  onChange,
  disabled,
  testId,
}: {
  value?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  testId: string;
}) {
  return (
    <div className="flex w-full items-center gap-3">
      <Slider
        className="flex-1"
        min={0}
        max={100}
        step={1}
        value={value ?? 0}
        disabled={disabled}
        onChange={(next) => onChange?.(next)}
        tooltip={{ formatter: (next) => `${next}%` }}
      />
      <InputNumber
        className="w-28"
        min={0}
        max={100}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(next) => onChange?.(next ?? 0)}
        addonAfter="%"
        data-testid={testId}
      />
    </div>
  );
}

/** Free-string chip list (alarm type filter), no dropdown suggestions. */
function StringItemsField(props: { placeholder: string; testId: string }) {
  return (
    <Select
      mode="tags"
      open={false}
      tokenSeparators={[',']}
      allowClear
      placeholder={props.placeholder}
      data-testid={props.testId}
    />
  );
}

function SwitchField({ name, label }: { name: string; label: string }) {
  return (
    <Form.Item name={name} label={label} valuePropName="checked">
      <Switch data-testid={`trigger-switch-${name}`} />
    </Form.Item>
  );
}

function FilterLegend({ children }: { children: string }) {
  return <legend className="mb-2 text-sm text-neutral-500">{children}</legend>;
}

// ---------------------------------------------------------------------------
// Field blocks shared by the alarm-family triggers
// ---------------------------------------------------------------------------

/** alarmTypes + alarmSeverities (+ optional alarmStatuses) under "Filter". */
function AlarmFilterBlock({ withStatuses }: { withStatuses?: boolean }) {
  const label = useLabel();
  const enumOptions = useEnumOptions();
  return (
    <fieldset className="mb-4 rounded border-0 border-solid border-neutral-200 pb-2 dark:border-neutral-700">
      <FilterLegend>
        {label('pages.notifications.rules.triggerForm.filter', 'Filter')}
      </FilterLegend>
      <Form.Item
        name="alarmTypes"
        label={label(
          'pages.notifications.rules.triggerForm.alarmTypeList',
          'Alarm type list',
        )}
      >
        <StringItemsField
          placeholder={label(
            'pages.notifications.rules.triggerForm.anyType',
            'Any type',
          )}
          testId="trigger-alarm-types"
        />
      </Form.Item>
      <Form.Item
        name="alarmSeverities"
        label={label(
          'pages.notifications.rules.triggerForm.alarmSeverityList',
          'Alarm severity list',
        )}
      >
        <Select
          mode="multiple"
          allowClear
          placeholder={label(
            'pages.notifications.rules.triggerForm.anySeverity',
            'Any severity',
          )}
          options={enumOptions(
            Object.values(AlarmSeverity),
            'pages.notifications.rules.severity',
          )}
        />
      </Form.Item>
      {withStatuses && (
        <Form.Item
          name="alarmStatuses"
          label={label(
            'pages.notifications.rules.triggerForm.alarmStatusList',
            'Alarm status list',
          )}
        >
          <Select
            mode="multiple"
            allowClear
            placeholder={label(
              'pages.notifications.rules.triggerForm.anyStatus',
              'Any status',
            )}
            options={enumOptions(
              ALARM_SEARCH_STATUSES,
              'pages.notifications.rules.status',
            )}
          />
        </Form.Item>
      )}
    </fieldset>
  );
}

function DescriptionField() {
  const label = useLabel();
  return (
    <Form.Item
      name="description"
      label={label(
        'pages.notifications.rules.triggerForm.description',
        'Description',
      )}
    >
      <Input.TextArea rows={2} />
    </Form.Item>
  );
}

function NotifyOnField({
  values,
  prefix,
  testId,
}: {
  values: Array<string>;
  prefix: string;
  testId: string;
}) {
  const label = useLabel();
  const enumOptions = useEnumOptions();
  return (
    <Form.Item
      name="notifyOn"
      label={label(
        'pages.notifications.rules.triggerForm.notifyOn',
        'Notify on',
      )}
      rules={[
        {
          required: true,
          message: label(
            'pages.notifications.rules.triggerForm.notifyOnRequired',
            'Notify on events is required',
          ),
        },
      ]}
    >
      <Select
        mode="multiple"
        options={enumOptions(values, prefix)}
        data-testid={testId}
      />
    </Form.Item>
  );
}

/** Server-search multi picker for entity UUID lists (devices/profiles/chains/edges). */
function EntityListField<T>({
  name,
  label,
  hint,
  fetchPage,
  toOption,
  resolveOne,
  testId,
}: {
  name: string;
  label: string;
  hint?: string;
  fetchPage: (textSearch: string) => Promise<PageData<T>>;
  toOption: (row: T) => { label: string; value: string };
  resolveOne?: (id: string) => Promise<{ label: string; value: string }>;
  testId: string;
}) {
  const formatLabel = useLabel();
  return (
    <Form.Item name={name} label={label} extra={hint}>
      <RecipientEntitySelect
        mode="multiple"
        queryKey={['notifications', 'rules', 'entity-picker', name]}
        fetchPage={fetchPage}
        toOption={toOption}
        resolveOne={resolveOne}
        placeholder={formatLabel(
          'pages.notifications.rules.triggerForm.searchEntities',
          'Search entities',
        )}
        data-testid={testId}
      />
    </Form.Item>
  );
}

// ---------------------------------------------------------------------------
// The 14 trigger forms
// ---------------------------------------------------------------------------

function AlarmTriggerForm({ clearRuleEnabled }: { clearRuleEnabled: boolean }) {
  const label = useLabel();
  const enumOptions = useEnumOptions();
  return (
    <>
      <AlarmFilterBlock />
      <NotifyOnField
        values={Object.values(AlarmAction)}
        prefix="pages.notifications.rules.alarmAction"
        testId="trigger-alarm-notify-on"
      />
      <Form.Item
        name="clearAlarmStatuses"
        label={label(
          'pages.notifications.rules.triggerForm.clearRuleStatuses',
          'Stop the escalation when the alarm status becomes',
        )}
        extra={
          clearRuleEnabled
            ? undefined
            : label(
                'pages.notifications.rules.triggerForm.clearRuleHint',
                'Enabled when the escalation chain has more than one stage',
              )
        }
      >
        <Select
          mode="multiple"
          allowClear
          disabled={!clearRuleEnabled}
          placeholder={label(
            'pages.notifications.rules.triggerForm.anyStatus',
            'Any status',
          )}
          options={enumOptions(
            ALARM_SEARCH_STATUSES,
            'pages.notifications.rules.status',
          )}
          data-testid="trigger-clear-alarm-statuses"
        />
      </Form.Item>
      <DescriptionField />
    </>
  );
}

function DeviceActivityTriggerForm() {
  const label = useLabel();
  return (
    <>
      <Form.Item name="filterByDevice" className="flex justify-center">
        {/* Form.Item value stays boolean; Segmented wants a string key. */}
        <BooleanSegmented
          trueLabel={label(
            'pages.notifications.rules.triggerForm.devices',
            'Devices',
          )}
          falseLabel={label(
            'pages.notifications.rules.triggerForm.deviceProfiles',
            'Device profiles',
          )}
        />
      </Form.Item>
      <Form.Item
        noStyle
        shouldUpdate={(prev, next) =>
          prev.filterByDevice !== next.filterByDevice
        }
      >
        {({ getFieldValue }) =>
          getFieldValue('filterByDevice') ? (
            <EntityListField<DeviceInfo>
              name="devices"
              label={label(
                'pages.notifications.rules.triggerForm.devices',
                'Devices',
              )}
              hint={label(
                'pages.notifications.rules.triggerForm.deviceListHint',
                'Notifications will be generated only for the devices on the list; empty means all devices',
              )}
              fetchPage={(textSearch) =>
                getTenantDevices({
                  ...PICKER_PAGE_SORT,
                  textSearch: textSearch || undefined,
                })
              }
              toOption={(device) => ({
                label: device.name,
                value: device.id.id,
              })}
              resolveOne={async (id) => {
                const device = await getDeviceInfoById(id);
                return { label: device.name, value: id };
              }}
              testId="trigger-devices"
            />
          ) : (
            <EntityListField<{ id: { id: string }; name: string }>
              name="deviceProfiles"
              label={label(
                'pages.notifications.rules.triggerForm.deviceProfiles',
                'Device profiles',
              )}
              hint={label(
                'pages.notifications.rules.triggerForm.deviceProfilesHint',
                'Notifications will be generated only for the profiles on the list; empty means all profiles',
              )}
              fetchPage={(textSearch) =>
                getDeviceProfiles({
                  ...PICKER_PAGE_SORT,
                  textSearch: textSearch || undefined,
                })
              }
              toOption={(profile) => ({
                label: profile.name,
                value: profile.id.id,
              })}
              resolveOne={async (id) => {
                const profile = await tbHttp.get<{
                  id: { id: string };
                  name: string;
                }>(`/api/deviceProfile/info/${id}`);
                return { label: profile.name, value: id };
              }}
              testId="trigger-device-profiles"
            />
          )
        }
      </Form.Item>
      <NotifyOnField
        values={Object.values(DeviceActivityEvent)}
        prefix="pages.notifications.rules.deviceEvent"
        testId="trigger-device-notify-on"
      />
      <DescriptionField />
    </>
  );
}

/** Boolean two-option segmented control; maps the store boolean to a key. */
function BooleanSegmented({
  value,
  onChange,
  trueLabel,
  falseLabel,
}: {
  value?: boolean;
  onChange?: (value: boolean) => void;
  trueLabel: string;
  falseLabel: string;
}) {
  return (
    <Segmented
      options={[
        { label: trueLabel, value: 'true' },
        { label: falseLabel, value: 'false' },
      ]}
      value={value === false ? 'false' : 'true'}
      onChange={(next) => onChange?.(next === 'true')}
      data-testid="trigger-filter-by-device"
    />
  );
}

function EntityActionTriggerForm() {
  const label = useLabel();
  const enumOptions = useEnumOptions();
  return (
    <>
      <fieldset className="mb-4 rounded border-0 border-solid border-neutral-200 pb-2 dark:border-neutral-700">
        <FilterLegend>
          {label('pages.notifications.rules.triggerForm.filter', 'Filter')}
        </FilterLegend>
        <Form.Item
          name="entityTypes"
          label={label(
            'pages.notifications.rules.triggerForm.entityTypes',
            'Entity types',
          )}
          rules={[
            {
              required: true,
              message: label(
                'pages.notifications.rules.triggerForm.entityTypesRequired',
                'Entity types is required',
              ),
            },
          ]}
        >
          <Select
            mode="multiple"
            options={enumOptions(
              ENTITY_ACTION_ENTITY_TYPES,
              'pages.notifications.rules.entityType',
            )}
            data-testid="trigger-entity-types"
          />
        </Form.Item>
        <SwitchField
          name="created"
          label={label(
            'pages.notifications.rules.triggerForm.created',
            'Created',
          )}
        />
        <SwitchField
          name="updated"
          label={label(
            'pages.notifications.rules.triggerForm.updated',
            'Updated',
          )}
        />
        <SwitchField
          name="deleted"
          label={label(
            'pages.notifications.rules.triggerForm.deleted',
            'Deleted',
          )}
        />
      </fieldset>
      <DescriptionField />
    </>
  );
}

function AlarmCommentTriggerForm() {
  const label = useLabel();
  return (
    <>
      <AlarmFilterBlock withStatuses />
      <SwitchField
        name="onlyUserComments"
        label={label(
          'pages.notifications.rules.triggerForm.onlyUserComments',
          'Notify only on user comments',
        )}
      />
      <SwitchField
        name="notifyOnCommentUpdate"
        label={label(
          'pages.notifications.rules.triggerForm.notifyOnCommentUpdate',
          'Notify on comment update',
        )}
      />
      <DescriptionField />
    </>
  );
}

function AlarmAssignmentTriggerForm() {
  return (
    <>
      <AlarmFilterBlock withStatuses />
      <NotifyOnField
        values={Object.values(AlarmAssignmentAction)}
        prefix="pages.notifications.rules.assignmentAction"
        testId="trigger-assignment-notify-on"
      />
      <DescriptionField />
    </>
  );
}

function RuleEngineTriggerForm() {
  const label = useLabel();
  const enumOptions = useEnumOptions();
  const eventOptions = enumOptions(
    Object.values(RuleEngineLifecycleEvent),
    'pages.notifications.rules.lifecycleEvent',
  );
  const allEvents = label(
    'pages.notifications.rules.triggerForm.allEvents',
    'All events',
  );
  return (
    <>
      <fieldset className="mb-4 rounded border-0 border-solid border-neutral-200 pb-2 dark:border-neutral-700">
        <FilterLegend>
          {label(
            'pages.notifications.rules.triggerForm.ruleEngineFilter',
            'Rule chain filter',
          )}
        </FilterLegend>
        <EntityListField<RuleChain>
          name="ruleChains"
          label={label(
            'pages.notifications.rules.triggerForm.ruleChains',
            'Rule chains',
          )}
          hint={label(
            'pages.notifications.rules.triggerForm.ruleChainsHint',
            'Notifications will be generated only for the rule chains on the list; empty means all rule chains',
          )}
          fetchPage={(textSearch) =>
            getRuleChains({
              ...PICKER_PAGE_SORT,
              textSearch: textSearch || undefined,
            })
          }
          toOption={(chain) => ({ label: chain.name, value: chain.id.id })}
          resolveOne={async (id) => {
            const chain = await tbHttp.get<RuleChain>(`/api/ruleChain/${id}`);
            return { label: chain.name, value: id };
          }}
          testId="trigger-rule-chains"
        />
        <Form.Item
          name="ruleChainEvents"
          label={label(
            'pages.notifications.rules.triggerForm.ruleChainEvents',
            'Rule chain events',
          )}
        >
          <Select
            mode="multiple"
            allowClear
            placeholder={allEvents}
            options={eventOptions}
          />
        </Form.Item>
        <SwitchField
          name="onlyRuleChainLifecycleFailures"
          label={label(
            'pages.notifications.rules.triggerForm.onlyRuleChainLifecycleFailures',
            'Only rule chain lifecycle failures',
          )}
        />
      </fieldset>
      <fieldset>
        <FilterLegend>
          {label(
            'pages.notifications.rules.triggerForm.ruleNodeFilter',
            'Rule node filter',
          )}
        </FilterLegend>
        <SwitchField
          name="trackRuleNodeEvents"
          label={label(
            'pages.notifications.rules.triggerForm.trackRuleNodeEvents',
            'Track rule node events',
          )}
        />
        <Form.Item
          noStyle
          shouldUpdate={(prev, next) =>
            prev.trackRuleNodeEvents !== next.trackRuleNodeEvents
          }
        >
          {({ getFieldValue }) =>
            getFieldValue('trackRuleNodeEvents') ? (
              <>
                <Form.Item
                  name="ruleNodeEvents"
                  label={label(
                    'pages.notifications.rules.triggerForm.ruleNodeEvents',
                    'Rule node events',
                  )}
                >
                  <Select
                    mode="multiple"
                    allowClear
                    placeholder={allEvents}
                    options={eventOptions}
                    data-testid="trigger-rule-node-events"
                  />
                </Form.Item>
                <SwitchField
                  name="onlyRuleNodeLifecycleFailures"
                  label={label(
                    'pages.notifications.rules.triggerForm.onlyRuleNodeLifecycleFailures',
                    'Only rule node lifecycle failures',
                  )}
                />
              </>
            ) : null
          }
        </Form.Item>
      </fieldset>
      <DescriptionField />
    </>
  );
}

function EdgeTriggerForm({ withEvents }: { withEvents?: boolean }) {
  const label = useLabel();
  const enumOptions = useEnumOptions();
  return (
    <>
      <fieldset className="mb-4 rounded border-0 border-solid border-neutral-200 pb-2 dark:border-neutral-700">
        <FilterLegend>
          {label('pages.notifications.rules.triggerForm.filter', 'Filter')}
        </FilterLegend>
        <EntityListField<EdgeRow>
          name="edges"
          label={label(
            'pages.notifications.rules.triggerForm.edgeInstances',
            'Edge instances',
          )}
          hint={label(
            'pages.notifications.rules.triggerForm.edgeListHint',
            'Notifications will be generated only for the edge instances on the list; empty means all edges',
          )}
          fetchPage={fetchEdges}
          toOption={(edge) => ({ label: edge.name, value: edge.id.id })}
          resolveOne={fetchEdgeById}
          testId="trigger-edges"
        />
        {withEvents && (
          <Form.Item
            name="notifyOn"
            label={label(
              'pages.notifications.rules.triggerForm.notifyOn',
              'Notify on',
            )}
          >
            <Select
              mode="multiple"
              allowClear
              placeholder={label(
                'pages.notifications.rules.triggerForm.allEvents',
                'All events',
              )}
              options={enumOptions(
                Object.values(EdgeConnectivityEvent),
                'pages.notifications.rules.edgeEvent',
              )}
            />
          </Form.Item>
        )}
      </fieldset>
      <DescriptionField />
    </>
  );
}

function EntitiesLimitTriggerForm() {
  const label = useLabel();
  const enumOptions = useEnumOptions();
  return (
    <>
      <fieldset className="mb-4 rounded border-0 border-solid border-neutral-200 pb-2 dark:border-neutral-700">
        <FilterLegend>
          {label('pages.notifications.rules.triggerForm.filter', 'Filter')}
        </FilterLegend>
        <Form.Item
          name="entityTypes"
          label={label(
            'pages.notifications.rules.triggerForm.entityTypes',
            'Entity types',
          )}
        >
          <Select
            mode="multiple"
            options={enumOptions(
              ENTITIES_LIMIT_ENTITY_TYPES,
              'pages.notifications.rules.entityType',
            )}
            data-testid="trigger-limit-entity-types"
          />
        </Form.Item>
        <Form.Item
          name="threshold"
          label={label(
            'pages.notifications.rules.triggerForm.threshold',
            'Threshold',
          )}
        >
          <PercentField testId="trigger-threshold" />
        </Form.Item>
      </fieldset>
      <DescriptionField />
    </>
  );
}

function ApiUsageLimitTriggerForm() {
  const label = useLabel();
  const enumOptions = useEnumOptions();
  return (
    <>
      <Form.Item
        name="apiFeatures"
        label={label(
          'pages.notifications.rules.triggerForm.apiFeatures',
          'API features',
        )}
        extra={label(
          'pages.notifications.rules.triggerForm.apiFeaturesHint',
          'Empty means all API features are matched',
        )}
      >
        <Select
          mode="multiple"
          allowClear
          options={enumOptions(
            Object.values(ApiFeature),
            'pages.notifications.rules.apiFeature',
          )}
        />
      </Form.Item>
      <NotifyOnField
        values={Object.values(ApiUsageStateValue)}
        prefix="pages.notifications.rules.apiState"
        testId="trigger-api-notify-on"
      />
      <DescriptionField />
    </>
  );
}

function RateLimitsTriggerForm() {
  const label = useLabel();
  const enumOptions = useEnumOptions();
  return (
    <>
      <Form.Item
        name="apis"
        label={label(
          'pages.notifications.rules.triggerForm.rateLimits',
          'Rate limits',
        )}
        extra={label(
          'pages.notifications.rules.triggerForm.rateLimitsHint',
          'Predefined limited APIs',
        )}
      >
        <Select
          mode="multiple"
          allowClear
          showSearch
          optionFilterProp="label"
          options={enumOptions(
            Object.values(LimitedApi),
            'pages.notifications.rules.limitedApi',
          )}
          data-testid="trigger-limited-apis"
        />
      </Form.Item>
      <DescriptionField />
    </>
  );
}

function ResourcesShortageTriggerForm() {
  const label = useLabel();
  const thresholds: Array<{
    name: 'cpuThreshold' | 'ramThreshold' | 'storageThreshold';
    labelId: string;
    def: string;
    testId: string;
  }> = [
    {
      name: 'cpuThreshold',
      labelId: 'pages.notifications.rules.triggerForm.cpuThreshold',
      def: 'CPU threshold',
      testId: 'trigger-cpu-threshold',
    },
    {
      name: 'ramThreshold',
      labelId: 'pages.notifications.rules.triggerForm.ramThreshold',
      def: 'RAM threshold',
      testId: 'trigger-ram-threshold',
    },
    {
      name: 'storageThreshold',
      labelId: 'pages.notifications.rules.triggerForm.storageThreshold',
      def: 'Storage threshold',
      testId: 'trigger-storage-threshold',
    },
  ];
  return (
    <>
      {thresholds.map((threshold) => (
        <Form.Item
          key={threshold.name}
          name={threshold.name}
          label={label(threshold.labelId, threshold.def)}
        >
          <PercentField testId={threshold.testId} />
        </Form.Item>
      ))}
      <DescriptionField />
    </>
  );
}

function DescriptionOnlyTriggerForm({ hint }: { hint: string }) {
  return (
    <>
      <p className="mb-4 text-sm text-neutral-500">{hint}</p>
      <DescriptionField />
    </>
  );
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/** Form seed when the trigger type changes (ui-ngx form defaults :233-355). */
export const TRIGGER_FORM_DEFAULTS: Record<TriggerType, TriggerFormValues> = {
  [NotificationRuleTriggerType.ALARM]: {
    alarmTypes: [],
    alarmSeverities: [],
    clearAlarmStatuses: [],
    notifyOn: [AlarmAction.CREATED],
  },
  [NotificationRuleTriggerType.ALARM_COMMENT]: {
    alarmTypes: [],
    alarmSeverities: [],
    alarmStatuses: [],
    onlyUserComments: false,
    notifyOnCommentUpdate: false,
  },
  [NotificationRuleTriggerType.ALARM_ASSIGNMENT]: {
    alarmTypes: [],
    alarmSeverities: [],
    alarmStatuses: [],
    notifyOn: [AlarmAssignmentAction.ASSIGNED],
  },
  [NotificationRuleTriggerType.DEVICE_ACTIVITY]: {
    filterByDevice: true,
    devices: [],
    deviceProfiles: [],
    notifyOn: [DeviceActivityEvent.INACTIVE],
  },
  [NotificationRuleTriggerType.ENTITY_ACTION]: {
    entityTypes: [EntityType.DEVICE],
    created: false,
    updated: false,
    deleted: false,
  },
  [NotificationRuleTriggerType.RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT]: {
    ruleChains: [],
    ruleChainEvents: [],
    onlyRuleChainLifecycleFailures: false,
    trackRuleNodeEvents: false,
    ruleNodeEvents: [],
    onlyRuleNodeLifecycleFailures: false,
  },
  [NotificationRuleTriggerType.EDGE_CONNECTION]: { edges: [], notifyOn: [] },
  [NotificationRuleTriggerType.EDGE_COMMUNICATION_FAILURE]: { edges: [] },
  [NotificationRuleTriggerType.ENTITIES_LIMIT]: {
    entityTypes: [],
    threshold: 80,
  },
  [NotificationRuleTriggerType.API_USAGE_LIMIT]: {
    apiFeatures: [],
    notifyOn: [ApiUsageStateValue.WARNING],
  },
  [NotificationRuleTriggerType.NEW_PLATFORM_VERSION]: {},
  [NotificationRuleTriggerType.RATE_LIMITS]: { apis: [] },
  [NotificationRuleTriggerType.TASK_PROCESSING_FAILURE]: {},
  [NotificationRuleTriggerType.RESOURCES_SHORTAGE]: {
    cpuThreshold: 80,
    ramThreshold: 80,
    storageThreshold: 80,
  },
};

export interface TriggerSettingsBodyProps {
  triggerType: TriggerType;
  clearRuleEnabled: boolean;
}

/** Renders the active trigger's fields; must sit inside the trigger Form. */
export function TriggerSettingsBody({
  triggerType,
  clearRuleEnabled,
}: TriggerSettingsBodyProps) {
  const label = useLabel();
  switch (triggerType) {
    case NotificationRuleTriggerType.ALARM:
      return <AlarmTriggerForm clearRuleEnabled={clearRuleEnabled} />;
    case NotificationRuleTriggerType.DEVICE_ACTIVITY:
      return <DeviceActivityTriggerForm />;
    case NotificationRuleTriggerType.ENTITY_ACTION:
      return <EntityActionTriggerForm />;
    case NotificationRuleTriggerType.ALARM_COMMENT:
      return <AlarmCommentTriggerForm />;
    case NotificationRuleTriggerType.ALARM_ASSIGNMENT:
      return <AlarmAssignmentTriggerForm />;
    case NotificationRuleTriggerType.RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT:
      return <RuleEngineTriggerForm />;
    case NotificationRuleTriggerType.EDGE_CONNECTION:
      return <EdgeTriggerForm withEvents />;
    case NotificationRuleTriggerType.EDGE_COMMUNICATION_FAILURE:
      return <EdgeTriggerForm />;
    case NotificationRuleTriggerType.ENTITIES_LIMIT:
      return <EntitiesLimitTriggerForm />;
    case NotificationRuleTriggerType.API_USAGE_LIMIT:
      return <ApiUsageLimitTriggerForm />;
    case NotificationRuleTriggerType.RATE_LIMITS:
      return <RateLimitsTriggerForm />;
    case NotificationRuleTriggerType.RESOURCES_SHORTAGE:
      return <ResourcesShortageTriggerForm />;
    case NotificationRuleTriggerType.NEW_PLATFORM_VERSION:
    case NotificationRuleTriggerType.TASK_PROCESSING_FAILURE:
      return (
        <DescriptionOnlyTriggerForm
          hint={label(
            'pages.notifications.rules.triggerForm.noConfig',
            'This trigger has no additional settings',
          )}
        />
      );
  }
}
