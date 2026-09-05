/**
 * Pure field specs + validators for the shared notification message editor
 * (template-configuration, M12 wave 3-B) — mirrors ui-ngx
 * notification-template-configuration.component.ts buildForm limits
 * (subject 150/250/50, body 250/320/150, button text 50, link 300) so the
 * editor rules, the send-wizard step gate and the templates page (wave 3-C)
 * all validate from one source.
 */
import {
  type DeliveryMethodNotificationTemplate,
  type MobileAppTemplateAdditionalConfig,
  type NotificationButtonConfig,
  NotificationDeliveryMethod,
} from '@/types/tb/notification';

export type TemplateValue = Partial<
  Record<NotificationDeliveryMethod, DeliveryMethodNotificationTemplate>
>;

export type TemplateFieldId =
  | 'subject'
  | 'body'
  | 'buttonText'
  | 'buttonLink'
  | 'buttonDashboardId';

export interface TemplateFieldViolation {
  field: TemplateFieldId;
  kind: 'required' | 'maxLength';
  maxLength?: number;
}

/** Methods whose template carries a subject field. */
export function hasSubjectField(method: NotificationDeliveryMethod): boolean {
  return (
    method === NotificationDeliveryMethod.WEB ||
    method === NotificationDeliveryMethod.EMAIL ||
    method === NotificationDeliveryMethod.MICROSOFT_TEAMS ||
    method === NotificationDeliveryMethod.MOBILE_APP
  );
}

/** Subject is optional only on Microsoft Teams (ui-ngx form parity). */
export function subjectRequired(method: NotificationDeliveryMethod): boolean {
  return method !== NotificationDeliveryMethod.MICROSOFT_TEAMS;
}

/** Per-method character caps (undefined = uncapped). */
export function subjectMaxLength(
  method: NotificationDeliveryMethod,
): number | undefined {
  switch (method) {
    case NotificationDeliveryMethod.WEB:
      return 150;
    case NotificationDeliveryMethod.EMAIL:
      return 250;
    case NotificationDeliveryMethod.MOBILE_APP:
      return 50;
    default:
      return undefined;
  }
}

export function bodyMaxLength(
  method: NotificationDeliveryMethod,
): number | undefined {
  switch (method) {
    case NotificationDeliveryMethod.WEB:
      return 250;
    case NotificationDeliveryMethod.SMS:
      return 320;
    case NotificationDeliveryMethod.MOBILE_APP:
      return 150;
    default:
      return undefined;
  }
}

/** Body is required on every method (ui-ngx parity). */
export function bodyRequired(_method: NotificationDeliveryMethod): boolean {
  return true;
}

/** Methods with an icon block (WEB / MOBILE_APP additionalConfig.icon). */
export function supportsIcon(method: NotificationDeliveryMethod): boolean {
  return (
    method === NotificationDeliveryMethod.WEB ||
    method === NotificationDeliveryMethod.MOBILE_APP
  );
}

/** Methods with the shared action-button block. */
export function supportsActionButton(
  method: NotificationDeliveryMethod,
): boolean {
  return (
    method === NotificationDeliveryMethod.WEB ||
    method === NotificationDeliveryMethod.MICROSOFT_TEAMS ||
    method === NotificationDeliveryMethod.MOBILE_APP
  );
}

/** Mobile hides the button text field (the notification IS the tap target). */
export function buttonHidesText(method: NotificationDeliveryMethod): boolean {
  return method === NotificationDeliveryMethod.MOBILE_APP;
}

/** Icon block shape (JsonNode passthrough of the WEB/MOBILE template). */
export interface MethodIconConfig {
  enabled?: boolean;
  icon?: string;
  color?: string;
}

/** Reads the button block wherever the method parks it on the wire. */
export function actionButtonOf(
  template: DeliveryMethodNotificationTemplate | undefined,
): NotificationButtonConfig | undefined {
  if (!template) {
    return undefined;
  }
  // Narrow on the template discriminator (`method` rides the wire too).
  switch (template.method) {
    case NotificationDeliveryMethod.WEB:
      return template.additionalConfig?.actionButtonConfig;
    case NotificationDeliveryMethod.MICROSOFT_TEAMS:
      return template.button;
    case NotificationDeliveryMethod.MOBILE_APP:
      return template.additionalConfig?.onClick;
    default:
      return undefined;
  }
}

// --- typed read accessors (the per-method union only exposes each field on
// its own variant; hosts prefill from arbitrary methods) --------------------

export function templateSubject(
  template: DeliveryMethodNotificationTemplate | undefined,
): string {
  if (!template) {
    return '';
  }
  switch (template.method) {
    case NotificationDeliveryMethod.WEB:
    case NotificationDeliveryMethod.EMAIL:
    case NotificationDeliveryMethod.MICROSOFT_TEAMS:
    case NotificationDeliveryMethod.MOBILE_APP:
      return template.subject ?? '';
    default:
      return '';
  }
}

export function templateIconConfig(
  template: DeliveryMethodNotificationTemplate | undefined,
): MethodIconConfig | undefined {
  if (template?.method === NotificationDeliveryMethod.WEB) {
    return template.additionalConfig?.icon;
  }
  if (template?.method === NotificationDeliveryMethod.MOBILE_APP) {
    // The fork's MOBILE additionalConfig type only declares onClick, but the
    // wire (and ngx) carry the icon block as well — read as passthrough.
    return (template.additionalConfig as { icon?: MethodIconConfig })?.icon;
  }
  return undefined;
}

export function templateThemeColor(
  template: DeliveryMethodNotificationTemplate | undefined,
): string {
  return template?.method === NotificationDeliveryMethod.MICROSOFT_TEAMS
    ? (template.themeColor ?? '')
    : '';
}

export function emptyButtonConfig(): NotificationButtonConfig {
  return {
    enabled: false,
    text: '',
    linkType: 'LINK',
    link: '',
    setEntityIdInState: true,
  };
}

/** Fresh per-method template with `enabled` + `method` already injected. */
export function emptyMethodTemplate(
  method: NotificationDeliveryMethod,
): DeliveryMethodNotificationTemplate {
  switch (method) {
    case NotificationDeliveryMethod.WEB:
      return {
        method,
        enabled: true,
        subject: '',
        body: '',
        additionalConfig: {
          icon: { enabled: false, icon: 'notifications', color: '#757575' },
        },
      };
    case NotificationDeliveryMethod.EMAIL:
      return { method, enabled: true, subject: '', body: '' };
    case NotificationDeliveryMethod.SMS:
      return { method, enabled: true, body: '' };
    case NotificationDeliveryMethod.SLACK:
      return { method, enabled: true, body: '' };
    case NotificationDeliveryMethod.MICROSOFT_TEAMS:
      return {
        method,
        enabled: true,
        subject: '',
        body: '',
        themeColor: '',
        button: emptyButtonConfig(),
      };
    case NotificationDeliveryMethod.MOBILE_APP:
      return {
        method,
        enabled: true,
        subject: '',
        body: '',
        // The fork's MOBILE additionalConfig type omits the icon block, but
        // the wire (and ngx) carry it — seed it as a JsonNode passthrough.
        additionalConfig: {
          icon: { enabled: false, icon: 'notifications', color: '#757575' },
        } as MobileAppTemplateAdditionalConfig,
      };
  }
}

/** Button-block violations; empty when the button is disabled. */
export function validateActionButton(
  config: NotificationButtonConfig | undefined | null,
  options: { hideButtonText?: boolean } = {},
): Array<TemplateFieldViolation> {
  if (!config?.enabled) {
    return [];
  }
  const violations: Array<TemplateFieldViolation> = [];
  if (!options.hideButtonText) {
    const text = config.text ?? '';
    if (!text.trim()) {
      violations.push({ field: 'buttonText', kind: 'required' });
    } else if (text.length > 50) {
      violations.push({
        field: 'buttonText',
        kind: 'maxLength',
        maxLength: 50,
      });
    }
  }
  if ((config.linkType ?? 'LINK') === 'LINK') {
    const link = config.link ?? '';
    if (!link.trim()) {
      violations.push({ field: 'buttonLink', kind: 'required' });
    } else if (link.length > 300) {
      violations.push({
        field: 'buttonLink',
        kind: 'maxLength',
        maxLength: 300,
      });
    }
  } else if (!config.dashboardId) {
    violations.push({ field: 'buttonDashboardId', kind: 'required' });
  }
  return violations;
}

/** Violations of one enabled method template (disabled methods are clean). */
export function validateMethodTemplate(
  method: NotificationDeliveryMethod,
  template: DeliveryMethodNotificationTemplate | undefined,
): Array<TemplateFieldViolation> {
  if (!template?.enabled) {
    return [];
  }
  const violations: Array<TemplateFieldViolation> = [];
  if (hasSubjectField(method)) {
    const subject = templateSubject(template);
    const max = subjectMaxLength(method);
    if (subjectRequired(method) && !subject.trim()) {
      violations.push({ field: 'subject', kind: 'required' });
    } else if (max !== undefined && subject.length > max) {
      violations.push({ field: 'subject', kind: 'maxLength', maxLength: max });
    }
  }
  const body = template.body ?? '';
  if (!body.trim()) {
    violations.push({ field: 'body', kind: 'required' });
  } else {
    const max = bodyMaxLength(method);
    if (max !== undefined && body.length > max) {
      violations.push({ field: 'body', kind: 'maxLength', maxLength: max });
    }
  }
  const button = actionButtonOf(template);
  violations.push(
    ...validateActionButton(button, {
      hideButtonText: buttonHidesText(method),
    }),
  );
  return violations;
}

/** Violations grouped per enabled method; empty array = configuration valid. */
export function validateTemplateConfiguration(
  value: TemplateValue | undefined,
): Array<{
  method: NotificationDeliveryMethod;
  violations: Array<TemplateFieldViolation>;
}> {
  const result: Array<{
    method: NotificationDeliveryMethod;
    violations: Array<TemplateFieldViolation>;
  }> = [];
  for (const method of Object.values(NotificationDeliveryMethod)) {
    const violations = validateMethodTemplate(method, value?.[method]);
    if (violations.length > 0) {
      result.push({ method, violations });
    }
  }
  return result;
}

/** At least one method enabled (wizard Setup gate; server @NotEmpty too). */
export function hasEnabledMethod(value: TemplateValue | undefined): boolean {
  return Object.values(NotificationDeliveryMethod).some(
    (method) => value?.[method]?.enabled,
  );
}

/**
 * Deterministic signature of a template value — used by the editor to tell
 * "the parent echoed my own onChange payload" (no reseed) from "the parent
 * changed the value externally" (reseed the form).
 */
export function templateValueSignature(
  value: TemplateValue | undefined,
): string {
  const parts: Array<string> = [];
  for (const method of Object.values(NotificationDeliveryMethod)) {
    const entry = value?.[method];
    if (!entry) {
      continue;
    }
    parts.push(`${method}:${JSON.stringify(entry)}`);
  }
  return parts.join('|');
}
