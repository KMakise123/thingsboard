/**
 * Pure send-wizard logic (M12 wave 3-B, spec §4.3) — request assembly, the
 * "notify again" prefill, and the schedule (timezone → sendingDelayInSec)
 * conversion, mirroring ui-ngx sent-notification-dialog.componet.ts
 * (notificationFormValue :251-265, minDate/maxDate :287-295, request
 * prefill :165-183). Kept side-effect-free for direct unit testing.
 */
import dayjs, { type Dayjs } from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import type { TemplateValue } from '@/components/notifications/template-configuration/template-fields';
import { emptyMethodTemplate } from '@/components/notifications/template-configuration/template-fields';
import { EntityType } from '@/types/tb/entity';
import type {
  NotificationRequest,
  NotificationRequestInfo,
  NotificationTemplate,
} from '@/types/tb/notification';
import { NotificationType } from '@/types/tb/notification';

dayjs.extend(utc);
dayjs.extend(timezone);

/** ngx sets a fresh guid as the inline template name (server ignores it). */
export function generatedTemplateName(): string {
  const hex = (size: number) =>
    Array.from({ length: size }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
}

// ---------------------------------------------------------------------------
// Schedule: timezone pick + sendingDelayInSec conversion
// ---------------------------------------------------------------------------

const FALLBACK_TIMEZONES = [
  'UTC',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Taipei',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Australia/Sydney',
];

/** IANA timezone list (Intl when available; a pragmatic fallback otherwise). */
export function listTimezones(): Array<string> {
  try {
    const supported = (
      Intl as unknown as {
        supportedValuesOf?: (key: string) => Array<string>;
      }
    ).supportedValuesOf;
    if (typeof supported === 'function') {
      const zones = supported('timeZone');
      // Some ICU builds omit the UTC alias from the IANA list.
      return zones.includes('UTC') ? zones : ['UTC', ...zones];
    }
  } catch {
    // Fall through to the static list.
  }
  return FALLBACK_TIMEZONES;
}

export function defaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Seconds between `now` and the picked wall-clock time interpreted in the
 * picked timezone (ngx: `(time - minDate)/1000`). Negative answers clamp to
 * 0 — the server treats 0 as "send immediately".
 */
export function sendingDelayInSeconds(
  timezone: string,
  scheduledAt: Dayjs,
  nowMs: number = Date.now(),
): number {
  const absolute = dayjs.tz(
    scheduledAt.format('YYYY-MM-DD HH:mm:ss'),
    timezone,
  );
  return Math.max(0, Math.round((absolute.valueOf() - nowMs) / 1000));
}

/** Upper bound of the schedule picker: ngx maxDate = now + 7 days. */
export const SCHEDULE_MAX_DELAY_SEC = 7 * 24 * 60 * 60;

/** A picked schedule is valid between "now" and "+7 days" in its timezone. */
export function scheduleWithinRange(
  timezone: string,
  scheduledAt: Dayjs,
  nowMs: number = Date.now(),
): boolean {
  const delay = sendingDelayInSeconds(timezone, scheduledAt, nowMs);
  return delay > 0 && delay <= SCHEDULE_MAX_DELAY_SEC;
}

// ---------------------------------------------------------------------------
// Request assembly + notify-again prefill
// ---------------------------------------------------------------------------

export interface BuildRequestInput {
  targetIds: Array<string>;
  useTemplate: boolean;
  templateId?: string;
  templateValue: TemplateValue;
  sendingDelayInSec: number;
}

/**
 * POST /api/notification/request payload — `targets` are bare UUIDs;
 * template mode carries `templateId`, from-scratch mode carries the inline
 * GENERAL `template` (server rejects both missing / both set is fine but
 * unused here).
 */
export function buildNotificationRequest(
  input: BuildRequestInput,
): NotificationRequest {
  // Server POST payload: id/createdTime are generated server-side, so the
  // BaseData-required fields stay absent (cast mirrors recipient-dialog).
  const request = {
    targets: input.targetIds,
    additionalConfig: {
      sendingDelayInSec: Math.max(0, Math.round(input.sendingDelayInSec)),
    },
  } as NotificationRequest;
  if (input.useTemplate) {
    request.templateId = {
      entityType: EntityType.NOTIFICATION_TEMPLATE,
      id: input.templateId ?? '',
    };
  } else {
    // ngx sends a guid-named inline GENERAL template; the server only reads
    // its configuration (the name rides along harmlessly).
    request.template = {
      name: generatedTemplateName(),
      notificationType: NotificationType.GENERAL,
      configuration: {
        deliveryMethodsTemplates: normalizeTemplateValue(input.templateValue),
      },
    } as NotificationTemplate;
  }
  return request;
}

/** Drops disabled/absent entries; enabled entries keep `method` + `enabled`. */
export function normalizeTemplateValue(value: TemplateValue): TemplateValue {
  const out: TemplateValue = {};
  for (const [method, template] of Object.entries(value)) {
    if (template?.enabled) {
      out[method as keyof TemplateValue] = {
        ...template,
        enabled: true,
      };
    }
  }
  return out;
}

/** Wizard seed derived from an existing request ("notify again"). */
export interface WizardPrefill {
  useTemplate: boolean;
  templateId?: string;
  targetIds: Array<string>;
  templateValue: TemplateValue;
}

/**
 * ngx dialog prefill (:165-183): templateId present → template mode;
 * inline template present → scratch mode prefilled with its
 * deliveryMethodsTemplates (every entry already carries enabled+method).
 */
export function prefillFromRequest(
  request: NotificationRequest | NotificationRequestInfo,
): WizardPrefill {
  const targetIds = (request.targets ?? []).map(String);
  if (request.templateId?.id) {
    return {
      useTemplate: true,
      templateId: request.templateId.id,
      targetIds,
      templateValue: {},
    };
  }
  const templates =
    request.template?.configuration?.deliveryMethodsTemplates ?? {};
  return {
    useTemplate: false,
    targetIds,
    templateValue: normalizeTemplateValue(templates),
  };
}

/** Fresh from-scratch seed (every switch off). */
export function emptyWizardPrefill(): WizardPrefill {
  return { useTemplate: false, targetIds: [], templateValue: {} };
}

/** Toggling a method on seeds an enabled, method-stamped entry. */
export function withMethodEnabled(
  value: TemplateValue,
  method: keyof TemplateValue,
  enabled: boolean,
): TemplateValue {
  if (!enabled) {
    const next = { ...value };
    delete next[method];
    return next;
  }
  return { ...value, [method]: value[method] ?? emptyMethodTemplate(method) };
}
