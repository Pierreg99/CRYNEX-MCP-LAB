import assert from 'node:assert/strict';
import { it } from 'node:test';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { createHash } from 'node:crypto';

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

it('serves an opt-in immutable local skill snapshot over MCP', { timeout: 25_000 }, async () => {
  const client = new Client(
    { name: 'crynex-skills-test', version: '0.2.0' },
    { versionNegotiation: { mode: { pin: '2026-07-28' } } }
  );
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['dist/src/index.js'],
    cwd: process.cwd(),
    env: { ...inheritedEnv(), CRYNEX_SKILLS_DIRECTORY: resolve('examples/skills') }
  });
  await client.connect(transport);
  try {
    assert.equal(client.getProtocolEra(), 'modern');
    const names = (await client.listTools()).tools.map(t => t.name);
    assert.ok(names.includes('cryo_skill_search'));
    const found = await client.callTool({ name: 'cryo_skill_search', arguments: { query: 'crynex' } });
    const content = found.structuredContent as { skills: Array<{ name: string; uri: string; sha256: string }> };
    assert.equal(content.skills[0]?.name, 'crynex-lab');
    const chosen = content.skills[0];
    assert.ok(chosen);
    const response = await client.readResource({ uri: chosen.uri });
    const text = response.contents[0]?.text;
    assert.equal(typeof text, 'string');
    assert.equal(createHash('sha256').update(String(text)).digest('hex'), chosen.sha256);
    const get = await client.callTool({ name: 'cryo_skill_get', arguments: { name: 'crynex-lab' } });
    assert.match(JSON.stringify(get.structuredContent), /review and test/);
  } finally {
    await client.close();
  }
});
