/**
 * 实体视图域（M2）locale 聚合：form（dialog 与详情页头共用）/ list / detail。
 * Keep zh-CN/en-US key-for-key identical (check-locale gate).
 */
import detail from './detail';
import form from './form';
import list from './list';

export default {
  ...form,
  ...list,
  ...detail,
};
