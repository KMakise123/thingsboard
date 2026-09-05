/**
 * send-logic pure tests — request assembly, notify-again prefill and the
 * timezone → sendingDelayInSec conversion (ngx notificationFormValue parity).
 */
import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import { EntityType } from '@/types/tb/entity';
import {
  NotificationDeliveryMethod,
  NotificationType,
} from '@/types/tb/notification';
import {
  buildNotificationRequest,
  defaultTimezone,
  emptyWizardPrefill,
  generatedTemplateName,
  listTimezones,
  normalizeTemplateValue,
  prefillFromRequest,
  SCHEDULE_MAX_DELAY_SEC,
  scheduleWithinRange,
  sendingDelayInSeconds,
  withMethodEnabled,
} from './send-logic';

describe('schedule conversion', () => {
  it('converts a wall-clock pick in a timezone into seconds from now', () => {
    const now = Date.UTC(2026, 0, 1, 0, 0, 0);
    // Wall-clock fields are interpreted in the picked timezone.
    const picked = dayjs('2030-01-01 12:00:00');
    const expected = dayjs.tz('2030-01-01 12:00:00', 'UTC').valueOf() - now;
    expect(sendingDelayInSeconds('UTC', picked, now)).toBe(
      Math.round(expected / 1000),
    );
  });

  it('clamps past picks to 0 (send immediately)', () => {
    const now = Date.UTC(2026, 0, 1, 0, 0, 0);
    const picked = dayjs('2020-01-01 00:00:00');
    expect(sendingDelayInSeconds('UTC', picked, now)).toBe(0);
  });

  it('accepts picks within 7 days and rejects beyond', () => {
    const now = Date.UTC(2026, 0, 1, 0, 0, 0);
    expect(scheduleWithinRange('UTC', dayjs('2026-01-01 01:00:00'), now)).toBe(
      true,
    );
    expect(scheduleWithinRange('UTC', dayjs('2020-01-01 00:00:00'), now)).toBe(
      false,
    );
    const beyond = new Date(now + (SCHEDULE_MAX_DELAY_SEC + 3600) * 1000);
    const wallClock = dayjs(
      beyond.toISOString().slice(0, 19).replace('T', ' '),
    );
    expect(scheduleWithinRange('UTC', wallClock, now)).toBe(false);
  });

  it('lists timezones incl. UTC and resolves a default', () => {
    expect(listTimezones()).toContain('UTC');
    expect(defaultTimezone()).not.toBe('');
  });
});

describe('buildNotificationRequest', () => {
  it('assembles a template-mode request with bare-uuid targets', () => {
    const request = buildNotificationRequest({
      targetIds: ['t-1', 't-2'],
      useTemplate: true,
      templateId: 'tpl-9',
      templateValue: {},
      sendingDelayInSec: 90,
    });
    expect(request.targets).toEqual(['t-1', 't-2']);
    expect(request.templateId).toEqual({
      entityType: EntityType.NOTIFICATION_TEMPLATE,
      id: 'tpl-9',
    });
    expect(request.template).toBeUndefined();
    expect(request.additionalConfig).toEqual({ sendingDelayInSec: 90 });
  });

  it('assembles an inline GENERAL template in from-scratch mode', () => {
    const web = {
      method: NotificationDeliveryMethod.WEB,
      enabled: true,
      subject: 'hi',
      body: 'there',
    };
    const request = buildNotificationRequest({
      targetIds: ['t-1'],
      useTemplate: false,
      templateValue: { [NotificationDeliveryMethod.WEB]: web },
      sendingDelayInSec: -5,
    });
    expect(request.templateId).toBeUndefined();
    expect(request.template?.notificationType).toBe(NotificationType.GENERAL);
    expect(request.template?.name).toMatch(/^[0-9a-f-]{36}$/);
    expect(request.template?.configuration.deliveryMethodsTemplates).toEqual({
      [NotificationDeliveryMethod.WEB]: web,
    });
    // Negative delays clamp to 0.
    expect(request.additionalConfig).toEqual({ sendingDelayInSec: 0 });
  });

  it('generates unique guid-shaped template names', () => {
    expect(generatedTemplateName()).not.toBe(generatedTemplateName());
  });
});

describe('normalize + prefill', () => {
  it('drops disabled entries from the wire value', () => {
    const web = {
      method: NotificationDeliveryMethod.WEB,
      enabled: true,
      body: 'b',
    };
    const sms = {
      method: NotificationDeliveryMethod.SMS,
      enabled: false,
      body: 's',
    };
    expect(
      normalizeTemplateValue({
        [NotificationDeliveryMethod.WEB]: web,
        [NotificationDeliveryMethod.SMS]: sms,
      }),
    ).toEqual({ [NotificationDeliveryMethod.WEB]: web });
  });

  it('prefills template mode from a templateId request', () => {
    const prefill = prefillFromRequest({
      id: { entityType: EntityType.NOTIFICATION_REQUEST, id: 'r1' },
      createdTime: 0,
      targets: ['t-1'],
      templateId: {
        entityType: EntityType.NOTIFICATION_TEMPLATE,
        id: 'tpl-1',
      },
    } as never);
    expect(prefill).toEqual({
      useTemplate: true,
      templateId: 'tpl-1',
      targetIds: ['t-1'],
      templateValue: {},
    });
  });

  it('prefills scratch mode from an inline-template request', () => {
    const web = {
      method: NotificationDeliveryMethod.WEB,
      enabled: true,
      subject: 's',
      body: 'b',
    };
    const prefill = prefillFromRequest({
      targets: ['t-1', 't-2'],
      template: {
        notificationType: NotificationType.GENERAL,
        configuration: {
          deliveryMethodsTemplates: {
            [NotificationDeliveryMethod.WEB]: web,
          },
        },
      },
    } as never);
    expect(prefill.useTemplate).toBe(false);
    expect(prefill.targetIds).toEqual(['t-1', 't-2']);
    expect(prefill.templateValue).toEqual({
      [NotificationDeliveryMethod.WEB]: web,
    });
  });

  it('toggles methods while keeping the rest', () => {
    const web = {
      method: NotificationDeliveryMethod.WEB,
      enabled: true,
      body: 'b',
    };
    const value = withMethodEnabled(
      { [NotificationDeliveryMethod.WEB]: web },
      NotificationDeliveryMethod.SMS,
      true,
    );
    expect(value[NotificationDeliveryMethod.SMS]?.enabled).toBe(true);
    expect(value[NotificationDeliveryMethod.WEB]).toEqual(web);
    expect(
      withMethodEnabled(value, NotificationDeliveryMethod.WEB, false)[
        NotificationDeliveryMethod.WEB
      ],
    ).toBeUndefined();
  });

  it('starts from an empty seed', () => {
    expect(emptyWizardPrefill()).toEqual({
      useTemplate: false,
      targetIds: [],
      templateValue: {},
    });
  });
});
