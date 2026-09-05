/**
 * Rule payload assembly tests — the three deep examples from the wave plan
 * (ALARM escalation chain, DEVICE_ACTIVITY either-side, ENTITIES_LIMIT ÷100)
 * plus edit/copy merge behavior and the triggerType prefill inverse.
 */
import { describe, expect, it } from 'vitest';

import { AlarmSeverity } from '@/types/tb/alarm';
import { EntityType } from '@/types/tb/entity';
import {
  AlarmAction,
  AlarmSearchStatus,
  DeviceActivityEvent,
  NotificationRuleTriggerType,
} from '@/types/tb/notification';

import {
  type BasicFormValues,
  buildRulePayload,
  buildTriggerConfig,
  type TriggerFormValues,
  triggerConfigToFormValues,
} from './rule-submit';

const basicBase: BasicFormValues = {
  name: 'r',
  enabled: true,
  triggerType: NotificationRuleTriggerType.ALARM,
  templateId: 'tpl-1',
};

describe('buildTriggerConfig', () => {
  it('builds the ALARM config with the clearRule sub-object', () => {
    expect(
      buildTriggerConfig(NotificationRuleTriggerType.ALARM, {
        alarmTypes: ['HighTemperature'],
        alarmSeverities: [AlarmSeverity.CRITICAL],
        notifyOn: [AlarmAction.CREATED, AlarmAction.CLEARED],
        clearAlarmStatuses: [AlarmSearchStatus.ACK, AlarmSearchStatus.UNACK],
      }),
    ).toEqual({
      triggerType: NotificationRuleTriggerType.ALARM,
      alarmTypes: ['HighTemperature'],
      alarmSeverities: [AlarmSeverity.CRITICAL],
      notifyOn: [AlarmAction.CREATED, AlarmAction.CLEARED],
      clearRule: {
        alarmStatuses: [AlarmSearchStatus.ACK, AlarmSearchStatus.UNACK],
      },
    });
  });

  it('keeps only the chosen DEVICE_ACTIVITY side and drops filterByDevice', () => {
    const devices = buildTriggerConfig(
      NotificationRuleTriggerType.DEVICE_ACTIVITY,
      {
        filterByDevice: true,
        devices: ['dev-1'],
        deviceProfiles: ['should-not-appear'],
        notifyOn: [DeviceActivityEvent.INACTIVE],
      },
    );
    expect(devices).toEqual({
      triggerType: NotificationRuleTriggerType.DEVICE_ACTIVITY,
      notifyOn: [DeviceActivityEvent.INACTIVE],
      devices: ['dev-1'],
    });
    expect(devices).not.toHaveProperty('filterByDevice');
    expect(devices).not.toHaveProperty('deviceProfiles');

    const profiles = buildTriggerConfig(
      NotificationRuleTriggerType.DEVICE_ACTIVITY,
      {
        filterByDevice: false,
        deviceProfiles: ['profile-9'],
        notifyOn: [DeviceActivityEvent.ACTIVE],
      },
    );
    expect(profiles).toEqual({
      triggerType: NotificationRuleTriggerType.DEVICE_ACTIVITY,
      notifyOn: [DeviceActivityEvent.ACTIVE],
      deviceProfiles: ['profile-9'],
    });
  });

  it('divides ENTITIES_LIMIT and RESOURCES_SHORTAGE percents by 100', () => {
    expect(
      buildTriggerConfig(NotificationRuleTriggerType.ENTITIES_LIMIT, {
        entityTypes: [EntityType.DEVICE],
        threshold: 80,
      }),
    ).toEqual({
      triggerType: NotificationRuleTriggerType.ENTITIES_LIMIT,
      entityTypes: [EntityType.DEVICE],
      threshold: 0.8,
    });
    expect(
      buildTriggerConfig(NotificationRuleTriggerType.RESOURCES_SHORTAGE, {
        cpuThreshold: 90,
        ramThreshold: 75,
        storageThreshold: 100,
      }),
    ).toEqual({
      triggerType: NotificationRuleTriggerType.RESOURCES_SHORTAGE,
      cpuThreshold: 0.9,
      ramThreshold: 0.75,
      storageThreshold: 1,
    });
  });

  it('emits an empty config for the no-field triggers', () => {
    expect(
      buildTriggerConfig(NotificationRuleTriggerType.NEW_PLATFORM_VERSION, {}),
    ).toEqual({
      triggerType: NotificationRuleTriggerType.NEW_PLATFORM_VERSION,
    });
    expect(
      buildTriggerConfig(
        NotificationRuleTriggerType.TASK_PROCESSING_FAILURE,
        {},
      ),
    ).toEqual({
      triggerType: NotificationRuleTriggerType.TASK_PROCESSING_FAILURE,
    });
  });
});

describe('buildRulePayload', () => {
  it('assembles the ALARM deep example with a consistent three-way triggerType', () => {
    const payload = buildRulePayload({
      basic: {
        ...basicBase,
        escalations: { 0: ['t-1'], 3600: ['t-2', 't-3'] },
      },
      trigger: {
        alarmTypes: [],
        alarmSeverities: [],
        notifyOn: [AlarmAction.CREATED],
        clearAlarmStatuses: [AlarmSearchStatus.ACTIVE],
        description: 'page the on-call',
      } as TriggerFormValues,
      source: null,
      isCopy: false,
    });

    expect(payload.triggerType).toBe(NotificationRuleTriggerType.ALARM);
    expect(payload.triggerConfig).toMatchObject({
      triggerType: NotificationRuleTriggerType.ALARM,
      notifyOn: [AlarmAction.CREATED],
    });
    expect(payload.recipientsConfig).toEqual({
      triggerType: NotificationRuleTriggerType.ALARM,
      escalationTable: { 0: ['t-1'], 3600: ['t-2', 't-3'] },
    });
    expect(payload.templateId).toEqual({
      entityType: EntityType.NOTIFICATION_TEMPLATE,
      id: 'tpl-1',
    });
    expect(payload.additionalConfig).toEqual({
      description: 'page the on-call',
    });
    expect(payload.id).toBeUndefined();
  });

  it('sends plain targets for non-ALARM triggers', () => {
    const payload = buildRulePayload({
      basic: {
        ...basicBase,
        triggerType: NotificationRuleTriggerType.ENTITIES_LIMIT,
        targets: ['t-9'],
      },
      trigger: { description: '' },
      source: null,
      isCopy: false,
    });
    expect(payload.recipientsConfig).toEqual({
      triggerType: NotificationRuleTriggerType.ENTITIES_LIMIT,
      targets: ['t-9'],
    });
  });

  it('merges over the loaded rule when editing and keeps its id', () => {
    const source = {
      id: { entityType: EntityType.NOTIFICATION_RULE, id: 'rule-1' },
      createdTime: 123,
      name: 'old name',
      enabled: false,
      templateId: {
        entityType: EntityType.NOTIFICATION_TEMPLATE,
        id: 'tpl-old',
      },
      triggerType: NotificationRuleTriggerType.ENTITIES_LIMIT,
      triggerConfig: {
        triggerType: NotificationRuleTriggerType.ENTITIES_LIMIT,
        entityTypes: [EntityType.ASSET],
        threshold: 0.5,
      },
      recipientsConfig: {
        triggerType: NotificationRuleTriggerType.ENTITIES_LIMIT,
        targets: ['t-old'],
      },
    } as unknown as Parameters<typeof buildRulePayload>[0]['source'];

    const payload = buildRulePayload({
      basic: {
        ...basicBase,
        name: 'new name',
        triggerType: NotificationRuleTriggerType.ENTITIES_LIMIT,
        templateId: 'tpl-new',
        targets: ['t-new'],
      },
      trigger: { entityTypes: [EntityType.DEVICE], threshold: 80 },
      source,
      isCopy: false,
    });

    expect(payload.id).toEqual(source?.id);
    expect(payload.createdTime).toBe(123);
    expect(payload.name).toBe('new name');
    expect(payload.enabled).toBe(true);
    expect(payload.templateId).toEqual({
      entityType: EntityType.NOTIFICATION_TEMPLATE,
      id: 'tpl-new',
    });
    expect(payload.triggerConfig).toEqual({
      triggerType: NotificationRuleTriggerType.ENTITIES_LIMIT,
      entityTypes: [EntityType.DEVICE],
      threshold: 0.8,
    });
    expect(payload.recipientsConfig).toEqual({
      triggerType: NotificationRuleTriggerType.ENTITIES_LIMIT,
      targets: ['t-new'],
    });
  });

  it('starts fresh when copying (no source id)', () => {
    const payload = buildRulePayload({
      basic: basicBase,
      trigger: {},
      source: {
        id: { entityType: EntityType.NOTIFICATION_RULE, id: 'rule-1' },
        createdTime: 123,
        name: 'source',
        enabled: true,
        templateId: {
          entityType: EntityType.NOTIFICATION_TEMPLATE,
          id: 'tpl-1',
        },
        triggerType: NotificationRuleTriggerType.ALARM,
        triggerConfig: { triggerType: NotificationRuleTriggerType.ALARM },
        recipientsConfig: {
          triggerType: NotificationRuleTriggerType.ALARM,
          escalationTable: { 0: ['t-1'] },
        },
      } as unknown as Parameters<typeof buildRulePayload>[0]['source'],
      isCopy: true,
    });
    expect(payload.id).toBeUndefined();
    expect(payload.createdTime).toBeUndefined();
  });
});

describe('triggerConfigToFormValues', () => {
  it('inverts the percent scaling and unwraps clearRule', () => {
    expect(
      triggerConfigToFormValues(NotificationRuleTriggerType.ENTITIES_LIMIT, {
        triggerType: NotificationRuleTriggerType.ENTITIES_LIMIT,
        entityTypes: [EntityType.USER],
        threshold: 0.4,
      }),
    ).toEqual({ entityTypes: [EntityType.USER], threshold: 40 });
    expect(
      triggerConfigToFormValues(NotificationRuleTriggerType.ALARM, {
        triggerType: NotificationRuleTriggerType.ALARM,
        notifyOn: [AlarmAction.CREATED],
        clearRule: { alarmStatuses: [AlarmSearchStatus.CLEARED] },
      }),
    ).toEqual({
      notifyOn: [AlarmAction.CREATED],
      clearAlarmStatuses: [AlarmSearchStatus.CLEARED],
    });
  });

  it('derives filterByDevice from the loaded side', () => {
    expect(
      triggerConfigToFormValues(NotificationRuleTriggerType.DEVICE_ACTIVITY, {
        triggerType: NotificationRuleTriggerType.DEVICE_ACTIVITY,
        deviceProfiles: ['p-1'],
        notifyOn: [DeviceActivityEvent.INACTIVE],
      }).filterByDevice,
    ).toBe(false);
    expect(
      triggerConfigToFormValues(NotificationRuleTriggerType.DEVICE_ACTIVITY, {
        triggerType: NotificationRuleTriggerType.DEVICE_ACTIVITY,
        devices: ['d-1'],
        notifyOn: [DeviceActivityEvent.INACTIVE],
      }).filterByDevice,
    ).toBe(true);
  });
});
