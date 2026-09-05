/**
 * Light SVG metadata title extraction: namespace auto-declare, CDATA JSON,
 * and every failure mode degrading to undefined.
 */
import { describe, expect, it } from 'vitest';

import { extractScadaSymbolTitle } from './svg-metadata-title';

const NS = 'xmlns:tb="https://thingsboard.io/svg"';

function svg(body: string, withNs = true): string {
  return `<svg ${withNs ? `${NS} ` : ''}viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

function metadataCdata(json: string): string {
  return `<tb:metadata><![CDATA[${json}]]></tb:metadata>`;
}

describe('extractScadaSymbolTitle', () => {
  it('reads the title from CDATA metadata (namespace declared)', () => {
    const content = svg(
      metadataCdata('{"title":"Pump","tags":[],"description":"d"}'),
    );
    expect(extractScadaSymbolTitle(content)).toBe('Pump');
  });

  it('auto-declares the tb namespace when the SVG omits it', () => {
    const content = svg(metadataCdata('{"title":"Valve"}'), false);
    expect(extractScadaSymbolTitle(content)).toBe('Valve');
  });

  it('returns undefined without a metadata element', () => {
    expect(
      extractScadaSymbolTitle(svg('<rect width="1" height="1"/>')),
    ).toBeUndefined();
  });

  it('returns undefined when the metadata JSON is malformed', () => {
    expect(
      extractScadaSymbolTitle(svg(metadataCdata('{not-json'))),
    ).toBeUndefined();
  });

  it('returns undefined when the title is missing or not a string', () => {
    expect(
      extractScadaSymbolTitle(svg(metadataCdata('{"description":"d"}'))),
    ).toBeUndefined();
    expect(
      extractScadaSymbolTitle(svg(metadataCdata('{"title":42}'))),
    ).toBeUndefined();
    expect(
      extractScadaSymbolTitle(svg(metadataCdata('{"title":"   "}'))),
    ).toBeUndefined();
  });

  it('degrades to undefined on non-SVG garbage', () => {
    expect(extractScadaSymbolTitle('this is not svg at all')).toBeUndefined();
    expect(extractScadaSymbolTitle('')).toBeUndefined();
  });
});
