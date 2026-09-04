/**
 * The five-starter contract (spec §5.6 + §5.4):
 *  - each starter compiles through the REAL pipeline with zero errors
 *    (execute stage included — proving whitelist-only requires and erased
 *    `import type` lines);
 *  - each defaultConfig parses and carries a `type:'function'` datasource
 *    with a funcBody (preview random data out of the box);
 *  - starterToDoc delivers a fresh create-path doc (no identity) filled
 *    with the bundle, one per bucket.
 */
import { describe, expect, it } from 'vitest';
import { compileWidget } from '@/core/widget/compile';

import {
  STARTER_KIND_ORDER,
  starterToDoc,
  WIDGET_STARTER_TEMPLATES,
} from './index';

describe('widget starter templates — five ui-ngx buckets', () => {
  it('covers exactly the five create buckets', () => {
    expect(STARTER_KIND_ORDER).toEqual([
      'latest',
      'timeseries',
      'rpc',
      'alarm',
      'static',
    ]);
    expect(Object.keys(WIDGET_STARTER_TEMPLATES)).toHaveLength(5);
  });

  it.each(STARTER_KIND_ORDER)('%s compiles with zero errors', (kind) => {
    const template = WIDGET_STARTER_TEMPLATES[kind];
    const compiled = compileWidget(template.tsx, { name: `starter-${kind}` });
    if ('error' in compiled) {
      throw new Error(
        `starter "${kind}" must compile: ${compiled.error.message}`,
      );
    }
    expect(compiled.component).toBeDefined();
  });

  it.each(
    STARTER_KIND_ORDER,
  )('%s defaultConfig carries a function datasource with funcBody', (kind) => {
    const template = WIDGET_STARTER_TEMPLATES[kind];
    const parsed = JSON.parse(template.defaultConfig) as {
      datasources?: Array<{
        type?: string;
        dataKeys?: Array<{ type?: string; funcBody?: string }>;
      }>;
    };
    const datasource = parsed.datasources?.[0];
    expect(datasource?.type).toBe('function');
    expect(datasource?.dataKeys?.length).toBeGreaterThan(0);
    for (const key of datasource?.dataKeys ?? []) {
      expect(key.type).toBe('function');
      expect(key.funcBody).toContain('prevValue');
    }
  });

  it.each(STARTER_KIND_ORDER)('%s carries meta matching its bucket', (kind) => {
    const template = WIDGET_STARTER_TEMPLATES[kind];
    expect(template.meta.type).toBe(kind);
    expect(template.meta.sizeX).toBeGreaterThan(0);
    expect(template.meta.sizeY).toBeGreaterThan(0);
    expect(template.settingsForm.length).toBeGreaterThan(0);
  });

  it('starterToDoc delivers a fresh create-path doc per bucket', () => {
    for (const kind of STARTER_KIND_ORDER) {
      const doc = starterToDoc(kind);
      expect(doc.widgetTypeId).toBeNull();
      expect(doc.fqn).toBe('');
      expect(doc.version).toBeNull();
      expect(doc.meta.type).toBe(kind);
      expect(doc.source.tsx).toBe(WIDGET_STARTER_TEMPLATES[kind].tsx);
      expect(doc.source.css).toBe(WIDGET_STARTER_TEMPLATES[kind].css);
      expect(doc.defaultConfig).toBe(
        WIDGET_STARTER_TEMPLATES[kind].defaultConfig,
      );
      // keep-string discipline: defaultConfig is a string, not an object
      expect(typeof doc.defaultConfig).toBe('string');
    }
  });
});
