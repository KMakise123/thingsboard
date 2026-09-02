/**
 * Tenant-profile form value helpers: default configuration seeding, the
 * isolated-queues preset, and the merge-on-save behavior that keeps
 * server-side configuration fields the v1 form does not render.
 */
import { describe, expect, it } from 'vitest';

import {
  createDefaultTenantProfileConfiguration,
  defaultIsolatedQueues,
  formValuesToProfile,
  profileToFormValues,
  type TenantProfileFormValues,
} from './profile-form';

describe('tenant-profile form helpers', () => {
  it('seeds the default configuration with ui-ngx values', () => {
    const configuration = createDefaultTenantProfileConfiguration();
    expect(configuration.type).toBe('DEFAULT');
    expect(configuration.maxDevices).toBe(0);
    expect(configuration.maxCalculatedFieldsPerEntity).toBe(5);
    expect(configuration.maxDebugModeDurationMinutes).toBe(15);
    expect(configuration.smsEnabled).toBe(true);
  });

  it('seeds the three stock queues for isolated rule engine', () => {
    const queues = defaultIsolatedQueues();
    expect(queues.map((queue) => queue.name)).toEqual([
      'Main',
      'HighPriority',
      'SequentialByOriginator',
    ]);
    expect(queues[1].processingStrategy.retries).toBe(0);
  });

  it('falls back to the default configuration for a blank profile', () => {
    const values = profileToFormValues(null);
    expect(values.name).toBe('');
    expect(values.isolatedTbRuleEngine).toBe(false);
    expect(values.profileData.configuration.type).toBe('DEFAULT');
    expect(values.profileData.queueConfiguration).toBeNull();
  });

  it('keeps server configuration fields the form does not render', () => {
    const existing = {
      id: { entityType: 'TENANT_PROFILE', id: 'profile-1' },
      createdTime: 0,
      name: 'Gold',
      default: true,
      profileData: {
        configuration: {
          ...createDefaultTenantProfileConfiguration(),
          maxDevices: 12,
          calculatedFieldDebugEventsRateLimit: '1:60',
        },
        queueConfiguration: null,
      },
    } as never;
    const values: TenantProfileFormValues = {
      ...profileToFormValues(existing),
      name: 'Gold 2',
    };
    values.profileData.configuration.maxDevices = 24;

    const wire = formValuesToProfile(values, existing);
    expect(wire.name).toBe('Gold 2');
    const configuration = wire.profileData?.configuration;
    expect(configuration?.maxDevices).toBe(24);
    // Not rendered by the v1 form, still survives the save.
    expect(
      (configuration as unknown as Record<string, unknown>)
        .calculatedFieldDebugEventsRateLimit,
    ).toBe('1:60');
    expect(configuration?.type).toBe('DEFAULT');
  });

  it('drops the queues when the isolated toggle is off', () => {
    const existing = {
      id: { entityType: 'TENANT_PROFILE', id: 'profile-1' },
      createdTime: 0,
      name: 'Gold',
      isolatedTbRuleEngine: true,
      profileData: {
        configuration: createDefaultTenantProfileConfiguration(),
        queueConfiguration: defaultIsolatedQueues(),
      },
    } as never;
    const values = profileToFormValues(existing);
    expect(values.profileData.queueConfiguration).toHaveLength(3);

    values.isolatedTbRuleEngine = false;
    const wire = formValuesToProfile(values, existing);
    expect(wire.isolatedTbRuleEngine).toBe(false);
    expect(wire.profileData?.queueConfiguration).toBeNull();
  });
});
