#!/usr/bin/env node
/**
 * Locale parity gate (ADR 0007) — wired into `npm run lint`.
 *
 * Checks:
 *  1. zh-CN and en-US expose identical key sets (missing keys listed).
 *  2. Within one locale, a key is not defined in more than one file.
 *
 * Any finding prints a report and exits 1; a clean tree prints nothing.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCALES = ['zh-CN', 'en-US'];
const localesDir = fileURLToPath(new URL('../src/locales/', import.meta.url));

/** All .ts files under the locale dir, including domain subdirectories. */
function listLocaleFiles(dir, prefix = '') {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      files.push(...listLocaleFiles(join(dir, entry.name), `${prefix}${entry.name}/`));
    } else if (entry.name.endsWith('.ts')) {
      files.push({ name: `${prefix}${entry.name}`, path: join(dir, entry.name) });
    }
  }
  return files;
}

/** Top-level object keys of a `export default { 'k': 'v' }` locale file. */
function extractKeys(source) {
  const keys = [];
  const pattern = /^\s*'([^']+)'\s*:/gm;
  for (const match of source.matchAll(pattern)) {
    keys.push(match[1]);
  }
  return keys;
}

function readLocaleFiles(locale) {
  const dir = join(localesDir, locale);
  const files = listLocaleFiles(dir).sort((a, b) => a.name.localeCompare(b.name));
  const perFile = new Map();
  for (const file of files) {
    perFile.set(file.name, extractKeys(readFileSync(file.path, 'utf8')));
  }
  return perFile;
}

const findings = [];
const localeKeys = {};

for (const locale of LOCALES) {
  const perFile = readLocaleFiles(locale);
  const seen = new Map();

  for (const [file, keys] of perFile) {
    for (const key of keys) {
      if (seen.has(key)) {
        findings.push(
          `[${locale}] duplicate key '${key}' in ${file} and ${seen.get(key)}`,
        );
      } else {
        seen.set(key, file);
      }
    }
  }
  localeKeys[locale] = new Set(seen.keys());
}

const [zh, en] = LOCALES.map((l) => localeKeys[l]);
for (const key of zh) {
  if (!en.has(key))
    findings.push(`[en-US] missing key '${key}' (exists in zh-CN)`);
}
for (const key of en) {
  if (!zh.has(key))
    findings.push(`[zh-CN] missing key '${key}' (exists in en-US)`);
}

if (findings.length > 0) {
  console.error(`check-locale: ${findings.length} finding(s):`);
  for (const line of findings) {
    console.error(`  - ${line}`);
  }
  process.exit(1);
}
