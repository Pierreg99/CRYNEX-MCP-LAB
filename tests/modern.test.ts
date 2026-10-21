import assert from 'node:assert/strict';
import { it } from 'node:test';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

it('supports explicit modern MCP 2026-07-28 over stdio', { timeout: 25_000 }, async () => {
  const client = new Client(
    { name: 'crynex-modern-test', version: '0.2.0' },
    { versionNegotiation: { mode: { pin: '2026-07-28' } } }
  );
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['dist/src/index.js'],
    cwd: process.cwd()
  });
  await client.connect(transport);
  try {
    assert.equal(client.getProtocolEra(), 'modern');
    const first = await client.listTools();
    const second = await client.listTools();
    assert.deepEqual(first.tools.map(t => t.name), ['ping', 'text_stats', 'sha256', 'crynex_json_pointer', 'crynex_text_diff', 'crynex_slugify', 'crynex_manifest_lint']);
    assert.deepEqual(second.tools.map(t => t.name), first.tools.map(t => t.name));
    for (const tool of first.tools) {
      assert.equal(tool.annotations?.readOnlyHint, true);
      assert.equal(tool.annotations?.destructiveHint, false);
    }
    const stats = first.tools.find(t => t.name === 'text_stats');
    assert.ok(stats?.outputSchema);
    const result = await client.callTool({ name: 'text_stats', arguments: { text: 'modern MCP' } });
    assert.deepEqual(result.structuredContent, { characters: 10, words: 2, lines: 1 });
    const resource = await client.readResource({ uri: 'crynex://about' });
    assert.match(JSON.stringify(resource.contents), /0.4.0/);
    const prompt = await client.getPrompt({ name: 'review-tool-design', arguments: { proposal: 'Read-only lookup' } });
    assert.equal(prompt.messages.length, 1);
  } finally {
    await client.close();
  }
});
