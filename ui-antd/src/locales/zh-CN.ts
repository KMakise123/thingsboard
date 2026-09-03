/**
 * zh-CN aggregator. umi's locale plugin only scans top-level files in
 * src/locales, so directory files are imported and spread here by hand.
 * Add one import + spread per new domain file — scripts/check-locale.mjs
 * verifies zh-CN/en-US key parity and cross-file duplicates.
 */
import account from './zh-CN/account';
import alarms from './zh-CN/alarms';
import assetProfiles from './zh-CN/asset-profiles';
import assets from './zh-CN/assets';
import common from './zh-CN/common';
import customers from './zh-CN/customers';
import dashboards from './zh-CN/dashboards';
import deviceProfiles from './zh-CN/device-profiles';
import devicesDetail from './zh-CN/devices/detail';
import devicesList from './zh-CN/devices/list';
import editor from './zh-CN/editor';
import entityViews from './zh-CN/entityViews';
import login from './zh-CN/login';
import menu from './zh-CN/menu';
import settings from './zh-CN/settings';
import tenantProfiles from './zh-CN/tenant-profiles';
import tenants from './zh-CN/tenants';
import users from './zh-CN/users';

export default {
  ...common,
  ...login,
  ...menu,
  ...account,
  ...alarms,
  ...assetProfiles,
  ...assets,
  ...customers,
  ...dashboards,
  ...deviceProfiles,
  ...entityViews,
  ...settings,
  ...tenantProfiles,
  ...tenants,
  ...users,
  ...devicesList,
  ...devicesDetail,
  ...editor,
};
