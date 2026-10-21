import assert from 'node:assert/strict';
import { it } from 'node:test';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

it('completes MCP handshake and serves tools, resource and prompt', { timeout: 20_000 }, async () => {
  const client = new Client({ name: 'crynex-test-client', version: '0.1.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['dist/src/index.js'],
    cwd: process.cwd()
  });

  await client.connect(transport);
  try {
    const listed = await client.listTools();
    assert.deepEqual(listed.tools.map(tool => tool.name).sort(), ['ping', 'sha256', 'text_stats']);

    const ping = await client.callTool({ name: 'ping', arguments: {} });
    assert.equal(ping.isError, undefined);
    const pong = ping.content.find(block => block.type === 'text');
    assert.equal(pong?.type === 'text' ? pong.text : undefined, 'pong');

    const stats = await client.callTool({ name: 'text_stats', arguments: { text: 'Hello world' } });
    assert.deepEqual(stats.structuredContent, { characters: 11, words: 2, lines: 1 });

    const digest = await client.callTool({ name: 'sha256', arguments: { text: 'abc' } });
    const hash = digest.content.find(block => block.type === 'text');
    assert.equal(hash?.type === 'text' ? hash.text : undefined,
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');

    const invalid = await client.callTool({ name: 'text_stats', arguments: { text: 123 } });
    assert.equal(invalid.isError, true);

    const tooLong = await client.callTool({
      name: 'sha256',
      arguments: { text: 'a'.repeat(10_001) }
    });
    assert.equal(tooLong.isError, true);

    const about = await client.readResource({ uri: 'crynex://about' });
    assert.equal(about.contents.length, 1);
    assert.match(JSON.stringify(about.contents), /crynex-mcp-lab/);

    const prompt = await client.getPrompt({
      name: 'review-tool-design',
      arguments: { proposal: 'A read-only tool' }
    });
    assert.equal(prompt.messages.length, 1);
    assert.match(JSON.stringify(prompt.messages), /least-privilege/);
  } finally {
    await client.close();
  }
});
