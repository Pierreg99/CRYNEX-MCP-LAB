import assert from 'node:assert/strict';
import { it } from 'node:test';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

async function exerciseCustomTools(modern: boolean): Promise<void> {
  const client = new Client(
    { name: 'crynex-custom-tools-test', version: '0.3.0' },
    modern ? { versionNegotiation: { mode: { pin: '2026-07-28' } } } : undefined
  );
  const transport = new StdioClientTransport({
    command: process.execPath, args: ['dist/src/index.js'], cwd: process.cwd()
  });
  await client.connect(transport);
  try {
    if (modern) assert.equal(client.getProtocolEra(), 'modern');
    const listed = await client.listTools();
    for (const name of ['crynex_json_pointer', 'crynex_text_diff', 'crynex_slugify', 'crynex_manifest_lint']) {
      const meta = listed.tools.find(t => t.name === name);
      assert.ok(meta, name + ' missing from tools/list');
      assert.equal(meta.annotations?.readOnlyHint, true);
      assert.equal(meta.annotations?.destructiveHint, false);
      assert.ok(meta.outputSchema, name + ' missing outputSchema');
    }

    const pointer = await client.callTool({
      name: 'crynex_json_pointer',
      arguments: { document: '{"items":[{"id":"local"}]}', pointer: '/items/0/id' }
    });
    assert.deepEqual(pointer.structuredContent, { found: true, value: 'local' });
    const forbidden = await client.callTool({
      name: 'crynex_json_pointer',
      arguments: { document: '{}', pointer: '/__proto__' }
    });
    assert.equal(forbidden.isError, true);

    const diff = await client.callTool({
      name: 'crynex_text_diff',
      arguments: { before: 'one\ntwo\nthree', after: 'one\nupdated\nthree' }
    });
    assert.deepEqual(diff.structuredContent, {
      equal: false, startLine: 2, beforeLines: 3, afterLines: 3,
      removed: ['two'], added: ['updated']
    });

    const slug = await client.callTool({
      name: 'crynex_slugify', arguments: { text: 'CRYNEX — Meine Tools!' }
    });
    assert.deepEqual(slug.structuredContent, { slug: 'crynex-meine-tools' });

    const invalid = await client.callTool({
      name: 'crynex_slugify', arguments: { text: 'a'.repeat(1001) }
    });
    assert.equal(invalid.isError, true);

    const manifest = await client.callTool({
      name: 'crynex_manifest_lint', arguments: { manifest: '{"id":"unsafe","commands":["echo hi"]}' }
    });
    assert.equal((manifest.structuredContent as { valid: boolean }).valid, false);

    const resource = await client.readResource({ uri: 'crynex://tools/custom' });
    assert.match(JSON.stringify(resource.contents), /crynex_json_pointer/);
    const about = await client.readResource({ uri: 'crynex://about' });
    assert.match(JSON.stringify(about.contents), /crynex_manifest_lint/);
  } finally {
    await client.close();
  }
}

it('registers custom tools in legacy MCP', { timeout: 25_000 }, () => exerciseCustomTools(false));
it('registers custom tools in modern MCP', { timeout: 25_000 }, () => exerciseCustomTools(true));
