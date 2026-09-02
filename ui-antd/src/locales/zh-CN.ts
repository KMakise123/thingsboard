/**
 * zh-CN aggregator. umi's locale plugin only scans top-level files in
 * src/locales, so directory files are imported and spread here by hand.
 * Add one import + spread per new domain file — scripts/check-locale.mjs
 * verifies zh-CN/en-US key parity and cross-file duplicates.
 */
import assets from './zh-CN/assets';
import common from './zh-CN/common';
import customers from './zh-CN/customers';
import devicesDetail from './zh-CN/devices/detail';
import devicesList from './zh-CN/devices/list';
import entityViews from './zh-CN/entityViews';
import login from './zh-CN/login';
import menu from './zh-CN/menu';
import users from './zh-CN/users';

export default {
  ...common,
  ...login,
  ...menu,
  ...assets,
  ...customers,
  ...entityViews,
  ...users,
  ...devicesList,
  ...devicesDetail,
};
