/**
 * Pure template-page logic (M12 wave 3-C, spec §4.6) — the Setup-step
 * candidates, the Setup delivery-method toggles ⇄ deliveryMethodsTemplates
 * conversions, and the save-payload assembly. Side-effect-free for direct
 * unit testing.
 *
 * The authority narrowing mirrors ui-ngx
 * template-notification-dialog.component.ts :182-197 verbatim:
 * SYS_ADMIN = GENERAL + the 7 platform-level types, TENANT_ADMIN = the rest
 * (declaration order).
 */
import {
  emptyMethodTemplate,
  type TemplateValue,
} from '@/components/notifications/template-configuration/template-fields';
import {
  type DeliveryMethodNotificationTemplate,
  NotificationDeliveryMethod,
  type NotificationTemplate,
  type NotificationTemplateConfig,
  NotificationType,
} from '@/types/tb/notification';

// ---------------------------------------------------------------------------
// NotificationType candidates by authority (ngx :182-197)
// ---------------------------------------------------------------------------

/** The 7 platform-level types (sysadmin-only in the template dialog). */
const SYSADMIN_ONLY_NOTIFICATION_TYPES: ReadonlySet<NotificationType> = new Set(
  [
    NotificationType.ENTITIES_LIMIT,
    NotificationType.ENTITIES_LIMIT_INCREASE_REQUEST,
    NotificationType.API_USAGE_LIMIT,
    NotificationType.NEW_PLATFORM_VERSION,
    NotificationType.RATE_LIMITS,
    NotificationType.TASK_PROCESSING_FAILURE,
    NotificationType.RESOURCES_SHORTAGE,
  ],
);

/** SYS_ADMIN candidates: GENERAL first, then ngx's literal platform list. */
const SYSADMIN_NOTIFICATION_TYPES: Array<NotificationType> = [
  NotificationType.GENERAL,
  NotificationType.ENTITIES_LIMIT,
  NotificationType.ENTITIES_LIMIT_INCREASE_REQUEST,
  NotificationType.API_USAGE_LIMIT,
  NotificationType.NEW_PLATFORM_VERSION,
  NotificationType.RATE_LIMITS,
  NotificationType.TASK_PROCESSING_FAILURE,
  NotificationType.RESOURCES_SHORTAGE,
];

/**
 * Template-type candidates for an authority. SYS gets GENERAL + the platform
 * types; TENANT gets every other type (declaration order, RULE_NODE included
 * — same filter as ngx).
 */
export function notificationTypesForAuthority(
  isSysAdmin: boolean,
): Array<NotificationType> {
  if (isSysAdmin) {
    return [...SYSADMIN_NOTIFICATION_TYPES];
  }
  return Object.values(NotificationType).filter(
    (type) => !SYSADMIN_ONLY_NOTIFICATION_TYPES.has(type),
  );
}

// ---------------------------------------------------------------------------
// Setup toggles ⇄ deliveryMethodsTemplates
// ---------------------------------------------------------------------------

/**
 * Toggling a Setup method on seeds an enabled entry (re-using a prefilled
 * entry's fields when there is one); off removes the entry — the editor
 * contract stores only enabled:true entries, and the server requires at
 * least one (@NotEmpty).
 */
export function withMethodEnabled(
  value: TemplateValue,
  method: NotificationDeliveryMethod,
  enabled: boolean,
): TemplateValue {
  if (!enabled) {
    if (!value[method]) {
      return value;
    }
    const next = { ...value };
    delete next[method];
    return next;
  }
  if (value[method]?.enabled) {
    return value;
  }
  const existing = value[method];
  const template: DeliveryMethodNotificationTemplate =
    existing ?? emptyMethodTemplate(method);
  return { ...value, [method]: { ...template, enabled: true, method } };
}

/** The methods whose Setup toggle is on (drives the editor's visible blocks). */
export function enabledMethodsOf(
  value: TemplateValue,
): Array<NotificationDeliveryMethod> {
  return Object.values(NotificationDeliveryMethod).filter(
    (method) => value[method]?.enabled === true,
  );
}

/**
 * Fresh Setup seed (ngx constructor): no name, GENERAL preselected, WEB on —
 * the only method whose slide-toggle starts enabled (ngx
 * template-configuration.ts :77-80).
 */
export function emptySetupValue(): TemplateValue {
  return {
    [NotificationDeliveryMethod.WEB]: emptyMethodTemplate(
      NotificationDeliveryMethod.WEB,
    ),
  };
}

// ---------------------------------------------------------------------------
// Save payload
// ---------------------------------------------------------------------------

/**
 * Strips disabled/absent entries and keeps `enabled` + `method` on the rest
 * — the wire shape the shared editor and the send wizard (wave 3-B's
 * normalizeTemplateValue) both commit to.
 */
export function normalizeTemplateValue(value: TemplateValue): TemplateValue {
  const out: TemplateValue = {};
  for (const [method, template] of Object.entries(value)) {
    if (template?.enabled) {
      out[method as NotificationDeliveryMethod] = {
        ...template,
        enabled: true,
      };
    }
  }
  return out;
}

/** Recursive string trim (ngx deepTrim on the dialog payload). */
function deepTrim(input: unknown): unknown {
  if (typeof input === 'string') {
    return input.trim();
  }
  if (Array.isArray(input)) {
    return input.map(deepTrim);
  }
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(input)) {
      out[key] = deepTrim(entry);
    }
    return out;
  }
  return input;
}

export interface BuildTemplatePayloadInput {
  /** Edit source; null for create and copy. */
  source: NotificationTemplate | null;
  isCopy: boolean;
  name: string;
  notificationType: NotificationType;
  templateValue: TemplateValue;
}

/**
 * POST /api/notification/template payload (ngx add() :154-164): create and
 * copy save a fresh entity (copy never carries the source id), while edit
 * spreads the source back over the new values so id/tenantId/createdTime
 * survive. Strings are deep-trimmed like ngx.
 */
export function buildTemplatePayload(
  input: BuildTemplatePayloadInput,
): NotificationTemplate {
  const configuration = {
    deliveryMethodsTemplates: normalizeTemplateValue(input.templateValue),
  } as NotificationTemplateConfig;
  const base = {
    name: input.name.trim(),
    notificationType: input.notificationType,
    configuration,
  };
  if (input.source && !input.isCopy) {
    return deepTrim({
      ...input.source,
      ...base,
    }) as NotificationTemplate;
  }
  return deepTrim(base) as NotificationTemplate;
}

/** ngx copy entry: name + " (copy)" (rules wizard uses the same suffix). */
export function copiedTemplateName(name: string): string {
  return `${name} (copy)`;
}
