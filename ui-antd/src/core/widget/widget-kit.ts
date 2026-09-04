/**
 * widget-kit — the controlled dependency facade for compiled custom widgets
 * (ADR 0004 §4). The compile pipeline (`compile.ts`) maps the virtual module
 * name `widget-kit` onto this module's namespace, so `require('widget-kit')`
 * inside widget source code resolves HERE and nowhere else.
 *
 * THIS IS THE ONLY HOST-DEPENDENCY ENTRY POINT for custom widgets — and by
 * construction the single bridge point if the runtime is ever moved behind
 * an iframe/worker boundary (ADR 0004 §4 upgrade path 4): swap this
 * module's implementation for a postMessage RPC surface and the widget
 * contract stays untouched.
 *
 * Export surface (frozen for M9; new capabilities ship as versioned
 * additions here, NEVER by widening CustomWidgetProps):
 *   - antd        the host's antd namespace (Button, Typography, …)
 *   - dayjs       the host's dayjs default instance
 *   - recharts    the host's recharts namespace (charts, 3.x)
 *   - formatValue TB value formatting (ui-ngx core/utils semantics)
 *
 * Everything else (network, storage, transport, stores) stays out: a
 * compiled widget has no legitimate path to host internals.
 */

export * as antd from 'antd';

import dayjs from 'dayjs';

export * as recharts from 'recharts';
export { formatValue } from './format-value';
export { dayjs };
