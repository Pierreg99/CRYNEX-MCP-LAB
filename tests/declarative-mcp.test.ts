import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { it } from 'node:test';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

async function runWithCustomTools(modern: boolean): Promise<void> {
  const client = new Client(
    { name: 'crynex-configured-tools', version: '0.4.0' },
    modern ? { versionNegotiation: { mode: { pin: '2026-07-28' } } } : undefined
  );
  const env = Object.fromEntries(Object.entries(process.env).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string'
  ));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['dist/src/index.js'],
    cwd: process.cwd(),
    env: { ...env, CRYNEX_CUSTOM_TOOLS_FILE: resolve('examples/custom-tools.json') }
  });
  await client.connect(transport);
  try {
    if (modern) assert.equal(client.getProtocolEra(), 'modern');
    const names = (await client.listTools()).tools.map(t => t.name);
    assert.ok(names.includes('custom_uppercase'));
    assert.ok(names.includes('custom_compact_slug'));
    assert.ok(names.includes('custom_private_digest'));
    const meta = (await client.listTools()).tools.find(t => t.name === 'custom_uppercase');
    assert.equal(meta?.annotations?.readOnlyHint, true);
    assert.ok(meta?.outputSchema);
    const output = await client.callTool({ name: 'custom_uppercase', arguments: { text: 'hallo' } });
    assert.deepEqual(output.structuredContent, { value: 'HALLO' });
    const forbidden = await client.callTool({
      name: 'custom_uppercase', arguments: { text: 'hi', command: 'rm -rf /' }
    });
    assert.equal(forbidden.isError, true);
    const resource = await client.readResource({ uri: 'crynex://tools/configured' });
    assert.match(JSON.stringify(resource.contents), /custom_uppercase/);
    const about = await client.readResource({ uri: 'crynex://about' });
    assert.match(JSON.stringify(about.contents), /custom_private_digest/);
  } finally {
    await client.close();
  }
}

it('loads operator-defined tools in legacy MCP', { timeout: 25_000 }, () => runWithCustomTools(false));
it('loads operator-defined tools in modern MCP', { timeout: 25_000 }, () => runWithCustomTools(true));
