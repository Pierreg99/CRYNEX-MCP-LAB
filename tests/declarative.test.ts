import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { readConfig } from '../src/config.js';
import {
  loadDeclarativeTools, parseDeclarativeTools, runDeclarativeOperation
} from '../src/tools/declarative.js';

const example = {
  schemaVersion: 1,
  tools: [
    { name: 'custom_uppercase', title: 'Uppercase', description: 'Safe local text', operation: 'uppercase' },
    { name: 'custom_slugify', title: 'Slug', description: 'Generate slug', operation: 'slugify' }
  ]
};

describe('declarative custom tool config', () => {
  it('rejects tool code, unsafe names, duplicate names and invalid operations', () => {
    assert.equal(parseDeclarativeTools(example).length, 2);
    assert.throws(() => parseDeclarativeTools({ ...example, tools: [example.tools[0], example.tools[0]] }), /Duplicate/);
    assert.throws(() => parseDeclarativeTools({ ...example, tools: [{ ...example.tools[0], operation: 'shell' }] }));
    assert.throws(() => parseDeclarativeTools({ ...example, tools: [{ ...example.tools[0], name: 'ping' }] }));
    assert.throws(() => parseDeclarativeTools({ ...example, tools: [{ ...example.tools[0], command: 'rm -rf /' }] }));
    assert.throws(() => parseDeclarativeTools({ ...example, tools: Array(17).fill(example.tools[0]) }));
  });

  it('reads exactly the operator-opted-in bounded local regular file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'crynex-tools-'));
    const path = join(dir, 'custom-tools.json');
    try {
      await writeFile(path, JSON.stringify(example));
      assert.equal((await loadDeclarativeTools(path)).length, 2);
      await writeFile(path, 'x'.repeat(32_769));
      await assert.rejects(loadDeclarativeTools(path), /32 KiB/);
      await writeFile(path, JSON.stringify(example));
      await symlink(path, join(dir, 'alias.json'));
      await assert.rejects(loadDeclarativeTools(join(dir, 'alias.json')));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('needs absolute operator configuration and refuses relative paths', () => {
    assert.deepEqual(readConfig({}), {});
    assert.throws(() => readConfig({ CRYNEX_CUSTOM_TOOLS_FILE: './custom.json' }), /absolute/);
    assert.deepEqual(readConfig({ CRYNEX_CUSTOM_TOOLS_FILE: resolve('examples/custom-tools.json') }), {
      customToolsFile: resolve('examples/custom-tools.json')
    });
  });

  it('performs only allowlisted pure transformations', () => {
    const [upper, slug] = parseDeclarativeTools(example);
    assert.ok(upper && slug);
    assert.equal(runDeclarativeOperation(upper, 'hi'), 'HI');
    assert.equal(runDeclarativeOperation(slug, 'Grüße von CRYNEX!'), 'grusse-von-crynex');
    assert.equal(runDeclarativeOperation({ ...upper, operation: 'trim' }, ' a '), 'a');
    assert.equal(runDeclarativeOperation({ ...upper, operation: 'lowercase' }, 'ABC'), 'abc');
    assert.equal(runDeclarativeOperation({ ...upper, operation: 'sha256' }, 'abc'),
      createHash('sha256').update('abc').digest('hex'));
    assert.throws(() => runDeclarativeOperation(upper, 'x'.repeat(10_001)), /exceeds/);
  });
});
