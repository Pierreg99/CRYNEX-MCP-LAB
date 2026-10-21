import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { slugify } from './custom/logic.js';

export const MAX_CUSTOM_TOOL_CONFIG_BYTES = 32_768;
export const MAX_CUSTOM_INPUT_UNITS = 10_000;
export const operatorSchema = z.enum(['uppercase', 'lowercase', 'trim', 'slugify', 'sha256']);
const toolSchema = z.strictObject({
  name: z.string().regex(/^custom_[a-z][a-z0-9_]{2,48}$/),
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(240),
  operation: operatorSchema
});
const configSchema = z.strictObject({
  schemaVersion: z.literal(1),
  tools: z.array(toolSchema).max(16)
});
export type DeclarativeTool = z.infer<typeof toolSchema>;

export function parseDeclarativeTools(input: unknown): readonly DeclarativeTool[] {
  const config = configSchema.parse(input);
  const seen = new Set<string>();
  for (const tool of config.tools) {
    if (seen.has(tool.name)) throw new Error('Duplicate custom tool name: ' + tool.name);
    seen.add(tool.name);
  }
  return config.tools.map(tool => ({ ...tool }));
}

/** Explicit operator-selected file; never accepts a filesystem path from a model call. */
export async function loadDeclarativeTools(path: string): Promise<readonly DeclarativeTool[]> {
  const file = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > MAX_CUSTOM_TOOL_CONFIG_BYTES) {
      throw new Error('Custom tool config must be a regular file of at most 32 KiB');
    }
    // Limit bytes read even if the file grows between stat() and read().
    const buffer = Buffer.alloc(MAX_CUSTOM_TOOL_CONFIG_BYTES + 1);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    if (bytesRead > MAX_CUSTOM_TOOL_CONFIG_BYTES) throw new Error('Custom tool config is too large');
    const json: unknown = JSON.parse(buffer.subarray(0, bytesRead).toString('utf8'));
    return parseDeclarativeTools(json);
  } finally {
    await file.close();
  }
}

/** An intentionally closed, purely local operation set: never eval or import code. */
export function runDeclarativeOperation(tool: DeclarativeTool, text: string): string {
  if (text.length > MAX_CUSTOM_INPUT_UNITS) throw new Error('Input exceeds 10,000 UTF-16 units');
  switch (tool.operation) {
    case 'uppercase': return text.toUpperCase();
    case 'lowercase': return text.toLowerCase();
    case 'trim': return text.trim();
    case 'slugify': return slugify(text);
    case 'sha256': return createHash('sha256').update(text, 'utf8').digest('hex');
  }
}

export function registerDeclarativeTools(server: McpServer, tools: readonly DeclarativeTool[]): void {
  const readOnly = {
    readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false
  } as const;
  for (const tool of tools) {
    server.registerTool(tool.name, {
      title: tool.title,
      description: tool.description + ' (operator-defined, built-in local transformation only)',
      inputSchema: z.strictObject({ text: z.string().max(MAX_CUSTOM_INPUT_UNITS) }),
      outputSchema: z.strictObject({ value: z.string() }),
      annotations: readOnly
    }, async ({ text }) => {
      const value = runDeclarativeOperation(tool, text);
      const structuredContent = { value };
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(structuredContent) }],
        structuredContent
      };
    });
  }
  server.registerResource('configured-tools', 'crynex://tools/configured', {
    title: 'Operator-configured local tools',
    description: 'Read-only public metadata for configured, non-executable local transformations.',
    mimeType: 'application/json'
  }, async uri => ({
    contents: [{
      uri: uri.href, mimeType: 'application/json',
      text: JSON.stringify({
        schemaVersion: 1, readOnly: true, source: 'operator-configured',
        tools: tools.map(tool => ({ ...tool }))
      })
    }]
  }));
}
