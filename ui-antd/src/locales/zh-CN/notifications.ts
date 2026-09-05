/**
 * 通知域聚合文件（M12，spec §4）——与 en-US/notifications.ts 同一份手写
 * 聚合契约：每个子域文件一行 import + 一处展开，页面 agent 各改各的子域
 * 文件，永不触碰本文件。
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
