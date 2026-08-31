/**
 * en-US aggregator — same hand-written aggregation contract as zh-CN.ts
 * (umi only scans top-level locale files).
 */
import common from './en-US/common';
import devicesDetail from './en-US/devices/detail';
import devicesList from './en-US/devices/list';
import login from './en-US/login';
import menu from './en-US/menu';

export default {
  ...common,
  ...login,
  ...menu,
  ...devicesList,
  ...devicesDetail,
};
