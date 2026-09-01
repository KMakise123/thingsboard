/**
 * Customer domain copy aggregate (list / form / detail / scope files).
 * Keep zh-CN/en-US key-for-key identical (check-locale gate).
 */
import detail from './detail';
import form from './form';
import list from './list';
import scope from './scope';

export default {
  ...list,
  ...form,
  ...detail,
  ...scope,
};
