import assert from 'node:assert/strict';
import { it } from 'node:test';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { SkillsClient } from '@modelcontextprotocol/client/ext/skills';

function inheritedEnv(): Record<string, string> {
  return Object.fromEntries(Object.entries(process.env).filter((item): item is [string, string] =>
    typeof item[1] === 'string'));
}

it('offers opt-in local Cryo discovery without executing manifests', { timeout: 25_000 }, async () => {
  const client = new Client({ name: 'crynex-catalog-test', version: '0.2.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['dist/src/index.js'],
    cwd: process.cwd(),
    env: {
      ...inheritedEnv(),
      CRYNEX_CATALOG_FILE: resolve('examples/cryo-catalog.json')
    }
  });
  await client.connect(transport);
  try {
    const names = (await client.listTools()).tools.map(t => t.name);
    assert.ok(names.includes('cryo_plugin_search'));
    assert.ok(names.includes('cryo_plugin_get'));
    assert.ok(!names.includes('cryo_plugin_execute'));
    const result = await client.callTool({
      name: 'cryo_plugin_search', arguments: { query: 'example' }
    });
    assert.equal(result.isError, undefined);
    assert.match(JSON.stringify(result.structuredContent), /crynex-demo-plugin/);
    const missing = await client.callTool({
      name: 'cryo_plugin_get', arguments: { id: 'unknown' }
    });
    assert.equal(missing.isError, true);
    const invalid = await client.callTool({
      name: 'cryo_plugin_search', arguments: { limit: 1000 }
    });
    assert.equal(invalid.isError, true);
  } finally {
    await client.close();
  }
});

it('publishes verified MCP Skills from an explicitly chosen local directory', { timeout: 25_000 }, async () => {
  const client = new Client(
    { name: 'crynex-skills-test', version: '0.2.0' },
    { versionNegotiation: { mode: { pin: '2026-07-28' } } }
  );
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['dist/src/index.js'],
    cwd: process.cwd(),
    env: {
      ...inheritedEnv(),
      CRYNEX_SKILLS_DIRECTORY: resolve('examples/skills')
    }
  });
  await client.connect(transport);
  try {
    const skills = new SkillsClient(client);
    const listing = await skills.list();
    const entry = listing.skills.find(s => s.frontmatter.name === 'crynex-lab');
    assert.ok(entry, 'Expected example skill in the catalog');
    const file = await skills.read(entry);
    assert.equal(file.verified, true);
    assert.match(file.body ?? '', /review and test/);
  } finally {
    await client.close();
  }
});
