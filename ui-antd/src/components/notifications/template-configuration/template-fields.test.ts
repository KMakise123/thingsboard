/**
 * template-fields pure spec tests — the field limits and validators shared by
 * the editor rules and the wizard step gate (ui-ngx buildForm parity).
 */
import { describe, expect, it } from 'vitest';

import {
  type NotificationButtonConfig,
  NotificationDeliveryMethod,
  type WebNotificationTemplate,
} from '@/types/tb/notification';
import {
  actionButtonOf,
  bodyMaxLength,
  buttonHidesText,
  emptyButtonConfig,
  emptyMethodTemplate,
  hasEnabledMethod,
  hasSubjectField,
  subjectMaxLength,
  subjectRequired,
  supportsActionButton,
  supportsIcon,
  templateIconConfig,
  templateSubject,
  templateThemeColor,
  templateValueSignature,
  validateActionButton,
  validateMethodTemplate,
  validateTemplateConfiguration,
} from './template-fields';

const M = NotificationDeliveryMethod;

describe('field specs', () => {
  it('caps subjects at 150/250/50 like ui-ngx', () => {
    expect(subjectMaxLength(M.WEB)).toBe(150);
    expect(subjectMaxLength(M.EMAIL)).toBe(250);
    expect(subjectMaxLength(M.MOBILE_APP)).toBe(50);
    expect(subjectMaxLength(M.SMS)).toBeUndefined();
    expect(subjectMaxLength(M.MICROSOFT_TEAMS)).toBeUndefined();
  });

  it('caps bodies at 250/320/150 like ui-ngx', () => {
    expect(bodyMaxLength(M.WEB)).toBe(250);
    expect(bodyMaxLength(M.SMS)).toBe(320);
    expect(bodyMaxLength(M.MOBILE_APP)).toBe(150);
    expect(bodyMaxLength(M.EMAIL)).toBeUndefined();
  });

  it('marks the per-method structural flags', () => {
    expect(hasSubjectField(M.SLACK)).toBe(false);
    expect(hasSubjectField(M.MICROSOFT_TEAMS)).toBe(true);
    expect(subjectRequired(M.MICROSOFT_TEAMS)).toBe(false);
    expect(subjectRequired(M.WEB)).toBe(true);
    expect(supportsIcon(M.MOBILE_APP)).toBe(true);
    expect(supportsIcon(M.EMAIL)).toBe(false);
    expect(supportsActionButton(M.SMS)).toBe(false);
    expect(supportsActionButton(M.WEB)).toBe(true);
    expect(buttonHidesText(M.MOBILE_APP)).toBe(true);
    expect(buttonHidesText(M.WEB)).toBe(false);
  });

  it('seeds fresh method templates with enabled + method injected', () => {
    for (const method of Object.values(M)) {
      const template = emptyMethodTemplate(method);
      expect(template.enabled).toBe(true);
      expect(template.method).toBe(method);
      expect(template.body).toBe('');
    }
    expect(templateIconConfig(emptyMethodTemplate(M.WEB))?.icon).toBe(
      'notifications',
    );
    expect(templateThemeColor(emptyMethodTemplate(M.MICROSOFT_TEAMS))).toBe('');
  });
});

describe('validateActionButton', () => {
  it('is silent while the button is disabled', () => {
    expect(validateActionButton(emptyButtonConfig())).toEqual([]);
    expect(validateActionButton(undefined)).toEqual([]);
    expect(validateActionButton(null)).toEqual([]);
  });

  it('requires text and link for a plain LINK button', () => {
    const button: NotificationButtonConfig = {
      ...emptyButtonConfig(),
      enabled: true,
      text: '',
      link: '',
    };
    expect(validateActionButton(button)).toEqual([
      { field: 'buttonText', kind: 'required' },
      { field: 'buttonLink', kind: 'required' },
    ]);
  });

  it('enforces the 50/300 character caps', () => {
    const button: NotificationButtonConfig = {
      ...emptyButtonConfig(),
      enabled: true,
      text: 'a'.repeat(51),
      link: 'a'.repeat(301),
    };
    expect(validateActionButton(button)).toEqual([
      { field: 'buttonText', kind: 'maxLength', maxLength: 50 },
      { field: 'buttonLink', kind: 'maxLength', maxLength: 300 },
    ]);
  });

  it('requires a dashboard for DASHBOARD links and skips text on mobile', () => {
    const button: NotificationButtonConfig = {
      ...emptyButtonConfig(),
      enabled: true,
      linkType: 'DASHBOARD',
    };
    expect(validateActionButton(button, { hideButtonText: true })).toEqual([
      { field: 'buttonDashboardId', kind: 'required' },
    ]);
    button.dashboardId = 'dash-1';
    expect(validateActionButton(button, { hideButtonText: true })).toEqual([]);
  });
});

describe('validateMethodTemplate / validateTemplateConfiguration', () => {
  it('requires subject and body on an enabled WEB template', () => {
    const template = emptyMethodTemplate(M.WEB);
    expect(validateMethodTemplate(M.WEB, template)).toEqual([
      { field: 'subject', kind: 'required' },
      { field: 'body', kind: 'required' },
    ]);
  });

  it('ignores disabled methods and enforces caps on filled fields', () => {
    const template = {
      ...emptyMethodTemplate(M.SMS),
      body: 'a'.repeat(321),
    };
    expect(
      validateMethodTemplate(M.SMS, { ...template, enabled: false }),
    ).toEqual([]);
    expect(validateMethodTemplate(M.SMS, template)).toEqual([
      { field: 'body', kind: 'maxLength', maxLength: 320 },
    ]);
  });

  it('reports the incomplete action button through the method template', () => {
    const template: WebNotificationTemplate = {
      method: M.WEB,
      enabled: true,
      subject: 'hello',
      body: 'world',
      additionalConfig: {
        actionButtonConfig: { ...emptyButtonConfig(), enabled: true },
      },
    };
    expect(validateMethodTemplate(M.WEB, template)).toEqual([
      { field: 'buttonText', kind: 'required' },
      { field: 'buttonLink', kind: 'required' },
    ]);
  });

  it('groups violations per enabled method only', () => {
    expect(validateTemplateConfiguration({})).toEqual([]);
    expect(
      validateTemplateConfiguration({
        [M.WEB]: emptyMethodTemplate(M.WEB),
        [M.SLACK]: { method: M.SLACK, enabled: true, body: 'slack text' },
      }),
    ).toEqual([
      {
        method: M.WEB,
        violations: [
          { field: 'subject', kind: 'required' },
          { field: 'body', kind: 'required' },
        ],
      },
    ]);
    expect(hasEnabledMethod({})).toBe(false);
    expect(hasEnabledMethod({ [M.SMS]: emptyMethodTemplate(M.SMS) })).toBe(
      true,
    );
  });
});

describe('read accessors + signature', () => {
  it('reads subjects/icons/theme colors across variants', () => {
    expect(templateSubject(emptyMethodTemplate(M.EMAIL))).toBe('');
    expect(templateSubject(emptyMethodTemplate(M.SMS))).toBe('');
    expect(
      actionButtonOf(emptyMethodTemplate(M.MICROSOFT_TEAMS))?.enabled,
    ).toBe(false);
    expect(actionButtonOf(emptyMethodTemplate(M.SMS))).toBeUndefined();
  });

  it('builds a stable signature that tracks value changes', () => {
    const value = { [M.WEB]: emptyMethodTemplate(M.WEB) };
    expect(templateValueSignature(value)).toBe(
      templateValueSignature({ ...value }),
    );
    expect(templateValueSignature(value)).not.toBe(
      templateValueSignature({
        [M.WEB]: { ...emptyMethodTemplate(M.WEB), body: 'x' },
      }),
    );
    expect(templateValueSignature(undefined)).toBe('');
  });
});
