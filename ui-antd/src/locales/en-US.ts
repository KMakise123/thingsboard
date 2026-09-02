/**
 * en-US aggregator — same hand-written aggregation contract as zh-CN.ts
 * (umi only scans top-level locale files).
 */
import assets from './en-US/assets';
import common from './en-US/common';
import customers from './en-US/customers';
import devicesDetail from './en-US/devices/detail';
import devicesList from './en-US/devices/list';
import entityViews from './en-US/entityViews';
import login from './en-US/login';
import menu from './en-US/menu';
import users from './en-US/users';

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
