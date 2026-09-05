/**
 * Notifications domain aggregate (M12, spec §4) — same hand-written
 * aggregation contract as the top-level locale aggregator: one import +
 * spread per sub-domain file, so parallel page agents never touch this file.
 */
import bell from './notifications/bell';
import common from './notifications/common';
import inbox from './notifications/inbox';
import recipients from './notifications/recipients';
import rules from './notifications/rules';
import sent from './notifications/sent';
import templates from './notifications/templates';

export default {
  ...common,
  ...bell,
  ...inbox,
  ...sent,
  ...recipients,
  ...rules,
  ...templates,
} as const;
