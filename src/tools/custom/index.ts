import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { jsonPointer, lintManifest, slugify, textDiff, MAX_JSON_SIZE, MAX_DIFF_SIZE } from './logic.js';
import { inspectJson } from './inspection.js';
import { executePipeline, PIPELINE_OPERATIONS } from './pipeline.js';

export const CUSTOM_TOOL_NAMES = [
  'crynex_json_pointer',
  'crynex_text_diff',
  'crynex_slugify',
  'crynex_manifest_lint',
  'crynex_json_inspect',
  'crynex_text_pipeline'
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


  server.registerTool('crynex_json_inspect', {
    title: 'CRYNEX JSON Shape Inspector',
    description: 'Summarize type, depth, node counts and top-level keys. Scalar values are not returned. Bounded local-only inspection.',
    inputSchema: z.strictObject({
      document: z.string().max(MAX_JSON_SIZE),
      maxDepth: z.number().int().min(1).max(12).default(8)
    }),
    outputSchema: z.strictObject({
      type: z.enum(['object', 'array', 'string', 'number', 'boolean', 'null']),
      depth: z.number().int().nonnegative(),
      nodes: z.number().int().nonnegative(),
      objects: z.number().int().nonnegative(),
      arrays: z.number().int().nonnegative(),
      scalars: z.number().int().nonnegative(),
      topKeys: z.array(z.string()),
      truncated: z.boolean()
    }),
    annotations: readOnly
  }, async ({ document, maxDepth }) => {
    try { return ok(inspectJson(document, maxDepth)); }
    catch { return fail('Invalid or too complex JSON input'); }
  });

  server.registerTool('crynex_text_pipeline', {
    title: 'CRYNEX Local Text Pipeline',
    description: 'Chain 1–8 approved pure text transformations; 10,000-character intermediate limit; no arbitrary code.',
    inputSchema: z.strictObject({
      text: z.string().max(10_000),
      operations: z.array(z.enum(PIPELINE_OPERATIONS)).min(1).max(8)
    }),
    outputSchema: z.strictObject({
      value: z.string(),
      operations: z.array(z.enum(PIPELINE_OPERATIONS)),
      inputLength: z.number().int().nonnegative(),
      outputLength: z.number().int().nonnegative(),
      intermediateLengths: z.array(z.number().int().nonnegative())
    }),
    annotations: readOnly
  }, async ({ text, operations }) => {
    try { return ok(executePipeline(text, operations)); }
    catch { return fail('Invalid pipeline or intermediate output limit exceeded'); }
  });

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
