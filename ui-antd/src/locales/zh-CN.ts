/**
 * zh-CN aggregator. umi's locale plugin only scans top-level files in
 * src/locales, so directory files are imported and spread here by hand.
 * Add one import + spread per new domain file — scripts/check-locale.mjs
 * verifies zh-CN/en-US key parity and cross-file duplicates.
 */
import common from './zh-CN/common';
import menu from './zh-CN/menu';

export default {
  ...common,
  ...menu,
};
