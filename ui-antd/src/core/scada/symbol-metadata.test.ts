/**
 * SCADA symbol metadata pure-function tests (M11 wave-2D).
 *
 * Contract mirrored from ui-ngx
 * `components/widget/lib/scada/scada-symbol.models.ts:197-352`:
 * CDATA-wrapped JSON metadata under a `tb:metadata` element, the
 * `xmlns:tb="https://thingsboard.io/svg"` namespace declaration, and the
 * missing-metadata fallback derived from the root viewBox / width-height.
 */
import { describe, expect, it } from 'vitest';

import {
  applyTbNamespaceToSvgContent,
  emptyMetadata,
  parseScadaSymbolMetadataFromContent,
  parseScadaSymbolsTagsFromContent,
  removeScadaSymbolMetadata,
  scadaSymbolContentData,
  updateScadaSymbolMetadataInContent,
  validateSvgDocument,
} from './symbol-metadata';

describe('validateSvgDocument', () => {
  it('accepts namespace-prefixed, CDATA-bearing documents', () => {
    const content = svgWithMetadata(
      '{"title":"Pump","widgetSizeX":1,"widgetSizeY":1}',
    );
    expect(() => validateSvgDocument(content)).not.toThrow();
  });

  it('rejects structurally broken documents', () => {
    expect(() => validateSvgDocument('<svg width="10"><rect></svg>')).toThrow();
  });
});

const TB_NS = 'xmlns:tb="https://thingsboard.io/svg"';

const svgWithMetadata = (metadataJson: string) =>
  `<svg ${TB_NS} width="200" height="100">\n` +
  `<tb:metadata>\n<![CDATA[${metadataJson}]]></tb:metadata>\n` +
  `<rect tb:tag="first" x="1" y="2" width="10" height="20"/>\n</svg>`;

describe('applyTbNamespaceToSvgContent', () => {
  it('adds the tb namespace declaration when missing', () => {
    const content = '<svg width="10"><rect/></svg>';
    const result = applyTbNamespaceToSvgContent(content);
    expect(result).toContain(TB_NS);
    expect(result).toContain('<rect/>');
    expect(result).toContain('</svg>');
  });

  it('leaves content untouched when the namespace is already declared', () => {
    const content = `<svg ${TB_NS} width="10"><rect/></svg>`;
    expect(applyTbNamespaceToSvgContent(content)).toBe(content);
  });

  it('throws on a non-SVG document', () => {
    expect(() => applyTbNamespaceToSvgContent('<div>nope</div>')).toThrow();
  });
});

describe('parseScadaSymbolMetadataFromContent', () => {
  it('reads the CDATA JSON metadata block', () => {
    const metadata = parseScadaSymbolMetadataFromContent(
      svgWithMetadata(
        '{"title":"Pump","widgetSizeX":4,"widgetSizeY":2,"tags":[],"behavior":[],"properties":[]}',
      ),
    );
    expect(metadata.title).toBe('Pump');
    expect(metadata.widgetSizeX).toBe(4);
    expect(metadata.widgetSizeY).toBe(2);
  });

  it('falls back to emptyMetadata sized from the viewBox when metadata is absent', () => {
    const content = `<svg width="10" viewBox="0 0 640 480"><rect/></svg>`;
    const metadata = parseScadaSymbolMetadataFromContent(content);
    expect(metadata).toEqual(emptyMetadata(640, 480));
    expect(metadata.widgetSizeX).toBe(6);
    expect(metadata.widgetSizeY).toBe(5);
  });

  it('falls back to width/height when no viewBox exists', () => {
    const metadata = parseScadaSymbolMetadataFromContent(
      '<svg width="300" height="250"><rect/></svg>',
    );
    expect(metadata).toEqual(emptyMetadata(300, 250));
  });

  it('defaults to the 3x3 metadata when no sizing info exists', () => {
    const metadata = parseScadaSymbolMetadataFromContent(
      `<svg ${TB_NS}></svg>`,
    );
    expect(metadata).toEqual(emptyMetadata());
    expect(metadata.widgetSizeX).toBe(3);
    expect(metadata.widgetSizeY).toBe(3);
  });

  it('returns emptyMetadata for broken content instead of throwing', () => {
    expect(parseScadaSymbolMetadataFromContent('not svg at all')).toEqual(
      emptyMetadata(),
    );
  });

  it('roundtrips: parse → update → parse is equivalent', () => {
    const content = svgWithMetadata(
      '{"title":"Valve","widgetSizeX":2,"widgetSizeY":1,"tags":[],"behavior":[],"properties":[]}',
    );
    const parsed = parseScadaSymbolMetadataFromContent(content);
    parsed.description = 'steam line';
    parsed.searchTags = ['steam', 'valve'];
    const updated = updateScadaSymbolMetadataInContent(content, parsed);
    expect(parseScadaSymbolMetadataFromContent(updated)).toEqual(parsed);
  });
});

describe('updateScadaSymbolMetadataInContent', () => {
  it('replaces an existing metadata block in place', () => {
    const content = svgWithMetadata(
      '{"title":"Old","widgetSizeX":1,"widgetSizeY":1}',
    );
    const metadata = { ...emptyMetadata(), title: 'New' };
    const updated = updateScadaSymbolMetadataInContent(content, metadata);
    expect(updated).not.toContain('Old');
    expect(parseScadaSymbolMetadataFromContent(updated).title).toBe('New');
  });

  it('inserts a metadata block when the document has none', () => {
    const content = `<svg ${TB_NS} width="10"><rect/></svg>`;
    const metadata = { ...emptyMetadata(), title: 'Created' };
    const updated = updateScadaSymbolMetadataInContent(content, metadata);
    expect(updated).toContain('tb:metadata');
    expect(parseScadaSymbolMetadataFromContent(updated).title).toBe('Created');
  });

  it('keeps the tb namespace declaration idempotent', () => {
    const content = '<svg width="10"><rect/></svg>';
    const updated = updateScadaSymbolMetadataInContent(
      content,
      emptyMetadata(),
    );
    expect(updated).toContain(TB_NS);
    expect(
      updateScadaSymbolMetadataInContent(updated, emptyMetadata()),
    ).toContain(TB_NS);
  });

  it('escapes a CDATA terminator sequence inside metadata strings', () => {
    const metadata = { ...emptyMetadata(), title: 'a]]>b' };
    const updated = updateScadaSymbolMetadataInContent(
      '<svg width="10"><rect/></svg>',
      metadata,
    );
    // The produced document must stay parseable and roundtrip the value.
    expect(parseScadaSymbolMetadataFromContent(updated).title).toBe('a]]>b');
  });

  it('throws on structurally invalid svg content', () => {
    expect(() =>
      updateScadaSymbolMetadataInContent('<svg width="10"><rect></svg>', {
        ...emptyMetadata(),
      }),
    ).toThrow();
  });
});

describe('parseScadaSymbolsTagsFromContent', () => {
  it('collects distinct tb:tag values in order of appearance', () => {
    const content =
      '<svg><rect tb:tag="b"/><g tb:tag="a"><rect tb:tag="a"/></g></svg>';
    expect(parseScadaSymbolsTagsFromContent(content)).toEqual(['b', 'a']);
  });

  it('returns empty for content without tags', () => {
    expect(parseScadaSymbolsTagsFromContent('<svg><rect/></svg>')).toEqual([]);
  });
});

describe('removeScadaSymbolMetadata', () => {
  it('strips the metadata element from the content', () => {
    const content = svgWithMetadata(
      '{"title":"T","widgetSizeX":1,"widgetSizeY":1}',
    );
    const stripped = removeScadaSymbolMetadata(content);
    expect(stripped).not.toContain('tb:metadata');
    expect(stripped).toContain('<rect');
    expect(parseScadaSymbolMetadataFromContent(stripped)).toEqual(
      emptyMetadata(200, 100),
    );
  });

  it('leaves content without metadata untouched', () => {
    const content = '<svg width="10"><rect/></svg>';
    expect(removeScadaSymbolMetadata(content)).toBe(content);
  });
});

describe('scadaSymbolContentData', () => {
  it('splits root node and inner svg, dropping the metadata block', () => {
    const content = svgWithMetadata(
      '{"title":"T","widgetSizeX":1,"widgetSizeY":1}',
    );
    const data = scadaSymbolContentData(content);
    expect(data.svgRootNode).toContain('<svg');
    expect(data.svgRootNode).toContain(TB_NS);
    expect(data.innerSvg).toContain('<rect');
    expect(data.innerSvg).not.toContain('tb:metadata');
    expect(data.innerSvg).not.toContain('title');
  });

  it('reassembly without metadata still parses', () => {
    const content = svgWithMetadata(
      '{"title":"T","widgetSizeX":1,"widgetSizeY":1}',
    );
    const data = scadaSymbolContentData(content);
    const rebuilt = `${data.svgRootNode}\n${data.innerSvg}\n</svg>`;
    expect(rebuilt).toContain('</svg>');
    expect(parseScadaSymbolsTagsFromContent(rebuilt)).toEqual(['first']);
  });
});
