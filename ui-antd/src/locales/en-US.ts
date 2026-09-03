/**
 * en-US aggregator — same hand-written aggregation contract as zh-CN.ts
 * (umi only scans top-level locale files).
 */
import account from './en-US/account';
import alarms from './en-US/alarms';
import assetProfiles from './en-US/asset-profiles';
import assets from './en-US/assets';
import common from './en-US/common';
import customers from './en-US/customers';
import dashboards from './en-US/dashboards';
import deviceProfiles from './en-US/device-profiles';
import devicesDetail from './en-US/devices/detail';
import devicesList from './en-US/devices/list';
import editor from './en-US/editor';
import entityViews from './en-US/entityViews';
import login from './en-US/login';
import menu from './en-US/menu';
import settings from './en-US/settings';
import tenantProfiles from './en-US/tenant-profiles';
import tenants from './en-US/tenants';
import users from './en-US/users';

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
