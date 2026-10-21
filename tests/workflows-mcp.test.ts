import assert from 'node:assert/strict';
import { it } from 'node:test';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

async function check(modern: boolean): Promise<void> {
  const client = new Client({ name: 'crynex-workflows-test', version: '0.5.0' },
    modern ? { versionNegotiation: { mode: { pin: '2026-07-28' } } } : undefined);
  const transport = new StdioClientTransport({
    command: process.execPath, args: ['dist/src/index.js'], cwd: process.cwd()
  });
  await client.connect(transport);
  try {
    if (modern) assert.equal(client.getProtocolEra(), 'modern');
    const listing = await client.listTools();
    for (const name of ['crynex_json_inspect', 'crynex_text_pipeline']) {
      const tool = listing.tools.find(tool => tool.name === name);
      assert.ok(tool, 'Missing tool: ' + name);
      assert.equal(tool.annotations?.readOnlyHint, true);
      assert.equal(tool.annotations?.destructiveHint, false);
      assert.ok(tool.outputSchema, 'Expected structured output schema');
    }
    const inspect = await client.callTool({
      name: 'crynex_json_inspect',
      arguments: { document: '{"top":{"token":"private"},"items":[1,2]}' }
    });
    assert.equal(inspect.isError, undefined);
    const summary = inspect.structuredContent as { type: string; topKeys: string[] };
    assert.equal(summary.type, 'object');
    assert.deepEqual(summary.topKeys, ['items', 'top']);
    assert.doesNotMatch(JSON.stringify(inspect.structuredContent), /private/);

    const pipeline = await client.callTool({
      name: 'crynex_text_pipeline',
      arguments: { text: '  Hallo Welt!  ', operations: ['trim', 'slugify', 'uppercase'] }
    });
    assert.equal((pipeline.structuredContent as { value: string }).value, 'HALLO-WELT');

    const forbidden = await client.callTool({
      name: 'crynex_text_pipeline',
      arguments: { text: 'hello', operations: ['eval'] }
    });
    assert.equal(forbidden.isError, true);
    const invalid = await client.callTool({
      name: 'crynex_json_inspect',
      arguments: { document: '{}', maxDepth: 50 }
    });
    assert.equal(invalid.isError, true);
    const about = await client.readResource({ uri: 'crynex://tools/custom' });
    assert.match(JSON.stringify(about.contents), /crynex_text_pipeline/);
  } finally {
    await client.close();
  }
}

it('new workflow tools on legacy MCP', { timeout: 25_000 }, () => check(false));
it('new workflow tools on modern MCP', { timeout: 25_000 }, () => check(true));
