import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { it } from 'node:test';

it('ships a self-contained interactive docs UI with local assets', async () => {
  const html = await readFile(resolve('docs/index.html'), 'utf8');
  const script = await readFile(resolve('docs/playground.js'), 'utf8');
  const stylesheet = await readFile(resolve('docs/playground.css'), 'utf8');
  const readme = await readFile(resolve('README.md'), 'utf8');

  for (const element of ['id="playground"', 'id="tool-builder"', 'id="play-run"',
    'id="builder-download"', 'id="builder-output"', 'id="play-output"']) {
    assert.ok(html.includes(element), 'Missing interactive UI element: ' + element);
  }
  assert.match(html, /src="playground\.js"/);
  assert.match(html, /href="playground\.css"/);
  assert.match(html, /Browser demo — not a connected MCP client/);
  assert.match(script, /function jsonPointer/);
  assert.match(script, /function textDiff/);
  assert.match(script, /function render/);
  assert.match(stylesheet, /prefers-reduced-motion/);
  assert.doesNotMatch(script, /(?:\bfetch\s*\(|\beval\s*\(|new Function\s*\(|XMLHttpRequest)/);
  assert.match(readme, /docs\/assets\/hero\.svg/);
  assert.match(readme, /<details>/);

  for (const icon of ['json', 'diff', 'slug', 'shield', 'terminal', 'workflow']) {
    const file = resolve('docs/assets/icons/' + icon + '.svg');
    await access(file);
    const source = await readFile(file, 'utf8');
    assert.match(source, /<svg/);
    assert.doesNotMatch(source, /<script|onload\s*=/i);
  }
  await access(resolve('docs/assets/hero.svg'));
  await access(resolve('docs/assets/brand.svg'));
});
