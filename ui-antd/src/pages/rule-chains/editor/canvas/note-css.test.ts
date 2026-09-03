import { describe, expect, it } from 'vitest';

import { namespaceNoteCss } from './note-css';

describe('namespaceNoteCss — ui-ngx cssjs namespacing parity (reduced)', () => {
  it('prefixes every selector with the scope class', () => {
    const css = namespaceNoteCss(
      'p { margin: 0; } h1 { color: red; }',
      '.note-a',
    );
    expect(css).toContain('.note-a p{margin: 0;}');
    expect(css).toContain('.note-a h1{color: red;}');
  });

  it('prefixes each selector of a comma group', () => {
    const css = namespaceNoteCss('p, ul { padding: 0; }', '.note-a');
    expect(css).toContain('.note-a p, .note-a ul{padding: 0;}');
  });

  it('keeps font-face untouched but prefixes media inner rules', () => {
    const css = namespaceNoteCss(
      '@font-face { font-family: X; } @media (max-width: 10px) { p { color: blue; } }',
      '.note-a',
    );
    expect(css).toContain('@font-face{font-family: X;}');
    expect(css).toContain('.note-a p{color: blue;}');
  });

  it('strips comments', () => {
    const css = namespaceNoteCss('/* hidden */ p { margin: 0; }', '.note-a');
    expect(css).not.toContain('hidden');
    expect(css).toContain('.note-a p');
  });
});
