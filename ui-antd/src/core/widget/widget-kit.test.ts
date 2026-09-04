/**
 * widget-kit facade surface (ADR 0004 §4). The compile pipeline hands this
 * namespace to compiled widgets as `require('widget-kit')`; the tests pin
 * the export face (P2's other half lives in compile.test.ts: the SAME antd
 * component objects must reach compiled code).
 */

import * as hostAntd from 'antd';
import hostDayjs from 'dayjs';
import * as hostRecharts from 'recharts';
import { describe, expect, it } from 'vitest';

import { formatValue } from './format-value';
import * as widgetKit from './widget-kit';

describe('widget-kit facade', () => {
  it('re-exports the host antd namespace (same module objects)', () => {
    expect(widgetKit.antd.Button).toBe(hostAntd.Button);
    expect(widgetKit.antd.Typography).toBe(hostAntd.Typography);
    expect(widgetKit.antd.ConfigProvider).toBe(hostAntd.ConfigProvider);
  });

  it('re-exports the host dayjs default instance', () => {
    expect(widgetKit.dayjs).toBe(hostDayjs);
    expect(widgetKit.dayjs('2026-01-02T03:04:05Z').year()).toBe(2026);
  });

  it('re-exports the host recharts namespace (same module objects)', () => {
    expect(widgetKit.recharts.LineChart).toBe(hostRecharts.LineChart);
    expect(widgetKit.recharts.ResponsiveContainer).toBe(
      hostRecharts.ResponsiveContainer,
    );
  });

  it('exposes formatValue with TB semantics', () => {
    expect(widgetKit.formatValue).toBe(formatValue);
    expect(widgetKit.formatValue(41.234, 1, '°C')).toBe('41.2 °C');
  });

  it('keeps transport/store internals off the facade', () => {
    for (const key of ['http', 'tbHttp', 'getDefaultWsManager', 'history']) {
      expect(Object.keys(widgetKit)).not.toContain(key);
    }
  });
});
