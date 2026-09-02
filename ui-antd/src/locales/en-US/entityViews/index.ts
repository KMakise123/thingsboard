/**
 * Entity-view domain (M2) locale aggregate: form (shared by the dialog and
 * the detail-page header form) / list / detail.
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
