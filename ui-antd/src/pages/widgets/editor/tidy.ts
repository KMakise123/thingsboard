/**
 * Tidy — prettier standalone wiring for the widget editor code tabs (M9
 * brief §3 wave S; ADR 0004 §4 "Tidy = prettier standalone").
 *
 * Everything is dynamically imported so the prettier + plugin chunks load
 * only on the first Tidy invocation (编辑器路由独占 + 懒加载 chunk 纪律).
 * The parser set matches the four tabs: typescript(+jsx) for TSX, postcss
 * for CSS, babel-json for the two JSON tabs. Throws the parse error
 * verbatim — the shell surfaces it without touching the draft (a failed
 * Tidy never enters the undo stack).
 */

export type TidyLanguage = 'tsx' | 'css' | 'json';

export async function tidySource(
  source: string,
  language: TidyLanguage,
): Promise<string> {
  const prettier = await import('prettier/standalone');
  if (language === 'tsx') {
    const [typescript, estree] = await Promise.all([
      import('prettier/plugins/typescript'),
      import('prettier/plugins/estree'),
    ]);
    return prettier.format(source, {
      parser: 'typescript',
      plugins: [typescript, estree],
    });
  }
  if (language === 'css') {
    const postcss = await import('prettier/plugins/postcss');
    return prettier.format(source, { parser: 'css', plugins: [postcss] });
  }
  const [babel, estree] = await Promise.all([
    import('prettier/plugins/babel'),
    import('prettier/plugins/estree'),
  ]);
  return prettier.format(source, { parser: 'json', plugins: [babel, estree] });
}
