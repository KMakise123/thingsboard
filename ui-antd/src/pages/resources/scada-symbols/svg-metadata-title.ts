/**
 * Light SCADA-symbol title extraction (M11 wave-2C, spec §3.3 上传解析 SVG
 * metadata 预填 title).
 *
 * Scope guard: the FULL metadata pipeline (parse + rewrite + namespace
 * normalization) belongs to the editor wave (2D, src/core/scada). This
 * page-local reader only answers "what title does the SVG carry" so the
 * upload dialog can prefill — ui-ngx
 * parseScadaSymbolMetadataFromContent().title parity with a fraction of
 * the machinery. Two readers, same answer:
 *   1. DOM: declare `xmlns:tb` on the root tag when missing (XML parsing
 *      rejects the undeclared prefix — the light slice of upstream
 *      applyTbNamespaceToSvgContent), then DOMParser('image/svg+xml') +
 *      `tb:metadata` lookup;
 *   2. regex scan of the `tb:metadata` element (upstream keeps a
 *      tbMetadataRegex for the same raw-text purpose) — also covers XML
 *      parsers that reject the prefixed element outright.
 * Any failure degrades to undefined (the dialog keeps the file-name
 * prefill) — never throws.
 */

const TB_NS_DECLARATION = 'xmlns:tb="https://thingsboard.io/svg"';

function titleFromMetadataJson(raw: string): string | undefined {
  try {
    const metadata = JSON.parse(raw) as { title?: unknown } | null;
    if (
      metadata &&
      typeof metadata.title === 'string' &&
      metadata.title.trim()
    ) {
      return metadata.title;
    }
  } catch {
    // Malformed metadata — fall through.
  }
  return undefined;
}

function extractTitleFromDom(svgContent: string): string | undefined {
  try {
    let content = svgContent ?? '';
    if (!content.includes('xmlns:tb=')) {
      content = content.replace(
        /<svg\b([^>]*)>/,
        (_match: string, attrs: string) => `<svg ${TB_NS_DECLARATION}${attrs}>`,
      );
    }
    const doc = new DOMParser().parseFromString(content, 'image/svg+xml');
    if (doc.getElementsByTagName('parsererror').length > 0) {
      return undefined;
    }
    const elements = doc.getElementsByTagName('tb:metadata');
    if (elements.length === 0) {
      return undefined;
    }
    return titleFromMetadataJson(elements[0].textContent ?? '');
  } catch {
    return undefined;
  }
}

function extractTitleByRegex(svgContent: string): string | undefined {
  const match = /<tb:metadata[^>]*>([\s\S]*?)<\/tb:metadata>/.exec(
    svgContent ?? '',
  );
  if (!match) {
    return undefined;
  }
  let body = match[1].trim();
  const cdata = /^<!\[CDATA\[([\s\S]*)\]\]>$/.exec(body);
  if (cdata) {
    body = cdata[1];
  }
  return titleFromMetadataJson(body);
}

export function extractScadaSymbolTitle(
  svgContent: string,
): string | undefined {
  return extractTitleFromDom(svgContent) ?? extractTitleByRegex(svgContent);
}

/** File-flavored helper handed to the gallery's upload dialog. */
export async function extractScadaSymbolTitleFromFile(
  file: File,
): Promise<string | undefined> {
  return extractScadaSymbolTitle(await file.text());
}
