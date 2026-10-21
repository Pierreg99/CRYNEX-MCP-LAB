import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { jsonPointer, lintManifest, slugify, textDiff, MAX_JSON_SIZE, MAX_DIFF_SIZE } from './logic.js';

export const CUSTOM_TOOL_NAMES = [
  'crynex_json_pointer',
  'crynex_text_diff',
  'crynex_slugify',
  'crynex_manifest_lint'
] as const;

const readOnly = {
  readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false
} as const;

function ok(result: object) {
  const structuredContent = result as Record<string, unknown>;
  return { content: [{ type: 'text' as const, text: JSON.stringify(result) }], structuredContent };
}
function fail(message: string) {
  return { isError: true, content: [{ type: 'text' as const, text: message }] };
}

/** Single extension point for first-party, safe custom MCP tools. */
export function registerCustomTools(server: McpServer): void {
  server.registerTool('crynex_json_pointer', {
    title: 'CRYNEX JSON Pointer',
    description: 'Extract one JSON value using RFC 6901. No JS execution or filesystem access.',
    inputSchema: z.object({
      document: z.string().max(MAX_JSON_SIZE),
      pointer: z.string().max(256)
    }),
    outputSchema: z.object({ found: z.boolean(), value: z.unknown().optional() }),
    annotations: readOnly
  }, async ({ document, pointer }) => {
    try {
      const result = jsonPointer(document, pointer);
      return ok(result.found ? { found: true, value: result.value ?? null } : { found: false });
    } catch {
      return fail('Invalid JSON document or JSON pointer');
    }
  });

  server.registerTool('crynex_text_diff', {
    title: 'CRYNEX Text Diff',
    description: 'Find a single changed line span; 300 lines and 10,000 UTF-16 units per input.',
    inputSchema: z.object({
      before: z.string().max(MAX_DIFF_SIZE),
      after: z.string().max(MAX_DIFF_SIZE)
    }),
    outputSchema: z.object({
      equal: z.boolean(), startLine: z.number().int().nonnegative(),
      beforeLines: z.number().int().nonnegative(), afterLines: z.number().int().nonnegative(),
      removed: z.array(z.string()), added: z.array(z.string())
    }),
    annotations: readOnly
  }, async ({ before, after }) => {
    try { return ok(textDiff(before, after)); }
    catch { return fail('Diff exceeds the 300-line limit'); }
  });

  server.registerTool('crynex_slugify', {
    title: 'CRYNEX Slug Generator',
    description: 'Generate a deterministic ASCII slug, suitable for display IDs (not authentication).',
    inputSchema: z.object({
      text: z.string().max(1000),
      maxLength: z.number().int().min(1).max(100).default(80)
    }),
    outputSchema: z.object({ slug: z.string() }),
    annotations: readOnly
  }, async ({ text, maxLength }) => ok({ slug: slugify(text, maxLength) }));

  server.registerTool('crynex_manifest_lint', {
    title: 'CRYNEX Plugin Manifest Linter',
    description: 'Validate an untrusted Cryo manifest with the actual local schema; returns advisory warnings only.',
    inputSchema: z.object({ manifest: z.string().max(MAX_JSON_SIZE) }),
    outputSchema: z.object({
      valid: z.boolean(), id: z.string().nullable(),
      warnings: z.array(z.string()), errors: z.array(z.string())
    }),
    annotations: readOnly
  }, async ({ manifest }) => ok(lintManifest(manifest)));

  server.registerResource('custom-tool-catalog', 'crynex://tools/custom', {
    title: 'CRYNEX Custom Tools',
    description: 'Available first-party custom tools with no network, shell, or filesystem access.',
    mimeType: 'application/json'
  }, async uri => ({
    contents: [{
      uri: uri.href, mimeType: 'application/json',
      text: JSON.stringify({
        version: 1, origin: 'first-party', readOnly: true,
        tools: [...CUSTOM_TOOL_NAMES],
        docs: 'docs/CUSTOM-TOOLS.md'
      })
    }]
  }));
}
