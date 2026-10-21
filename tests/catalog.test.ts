import assert from 'node:assert/strict';
import { mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { readConfig } from '../src/config.js';
import { loadPluginCatalog, findPlugin, searchPlugins } from '../src/connectors/cryo/catalog.js';
import { allowed, localScopes } from '../src/security/policy.js';

const sample = {
  schemaVersion: 1,
  plugins: [{
    id: 'test-plugin', name: 'Test Plugin', version: '1.0.0', description: 'Local test only',
    publisher: 'Test', status: 'published', capabilities: ['discovery'],
    requiredScopes: ['plugins:read']
  }]
};

describe('local security policy', () => {
  it('denies all privileged actions by default', () => {
    for (const configured of [false, true]) {
      const scopes = localScopes(configured);
      assert.equal(allowed(scopes, 'plugins:install'), false);
      assert.equal(allowed(scopes, 'plugins:execute'), false);
      assert.equal(allowed(scopes, 'registry:write'), false);
      assert.equal(allowed(scopes, 'plugins:read'), configured);
    }
  });

  it('requires an absolute opt-in path', () => {
    assert.deepEqual(readConfig({}), {});
    assert.throws(() => readConfig({ CRYNEX_CATALOG_FILE: './catalog.json' }), /absolute/);
    assert.deepEqual(readConfig({ CRYNEX_CATALOG_FILE: '/tmp/catalog.json' }),
      { catalogFile: '/tmp/catalog.json' });
  });
});

describe('catalog validation', () => {
  it('loads a bounded, read-only snapshot and rejects duplicate IDs', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'crynex-catalog-'));
    const path = join(dir, 'catalog.json');
    try {
      await writeFile(path, JSON.stringify(sample), 'utf8');
      const catalog = await loadPluginCatalog(path);
      assert.equal(searchPlugins(catalog, 'test', 10).length, 1);
      assert.equal(findPlugin(catalog, 'test-plugin')?.name, 'Test Plugin');
      assert.equal(findPlugin(catalog, 'missing'), undefined);
      await writeFile(path, JSON.stringify({ ...sample, plugins: [sample.plugins[0], sample.plugins[0]] }));
      await assert.rejects(loadPluginCatalog(path), /Duplicate plugin id/);
      await writeFile(path, JSON.stringify({ ...sample, plugins: [{ ...sample.plugins[0], commands: ['rm -rf /'] }] }));
      await assert.rejects(loadPluginCatalog(path));
      await writeFile(path, 'x'.repeat(1_048_577));
      await assert.rejects(loadPluginCatalog(path), /at most 1 MiB/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('refuses symlinked catalogs', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'crynex-symlink-'));
    const actual = join(dir, 'actual.json');
    const link = join(dir, 'link.json');
    try {
      await writeFile(actual, JSON.stringify(sample));
      await symlink(actual, link);
      await assert.rejects(loadPluginCatalog(link));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
