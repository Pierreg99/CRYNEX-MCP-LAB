import { createHash } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { analyzeText } from './logic.js';

const MAX_TEXT_LENGTH = 10_000;
const textSchema = z.string().max(MAX_TEXT_LENGTH).describe('Text to process (at most 10,000 UTF-16 code units).');

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'crynex-mcp-lab',
    version: '0.1.0'
  });

  server.registerTool(
    'ping',
    {
      title: 'Ping',
      description: 'Check whether the local MCP server is responding.',
      inputSchema: z.object({})
    },
    async () => ({
      content: [{ type: 'text' as const, text: 'pong' }]
    })
  );

  server.registerTool(
    'text_stats',
    {
      title: 'Text statistics',
      description: 'Count Unicode characters, words, and lines in supplied text without saving it.',
      inputSchema: z.object({ text: textSchema })
    },
    async ({ text }) => {
      const stats = analyzeText(text);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(stats) }],
        structuredContent: { ...stats }
      };
    }
  );

  server.registerTool(
    'sha256',
    {
      title: 'SHA-256 hash',
      description: 'Compute a SHA-256 hex digest of provided UTF-8 text locally.',
      inputSchema: z.object({ text: textSchema })
    },
    async ({ text }) => ({
      content: [{
        type: 'text' as const,
        text: createHash('sha256').update(text, 'utf8').digest('hex')
      }]
    })
  );

  server.registerResource(
    'about',
    'crynex://about',
    {
      title: 'About CRYNEX MCP Lab',
      description: 'Public, non-sensitive server metadata.',
      mimeType: 'application/json'
    },
    async uri => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify({
          name: 'crynex-mcp-lab',
          version: '0.1.0',
          transport: 'stdio',
          tools: ['ping', 'text_stats', 'sha256'],
          access: 'local-only'
        })
      }]
    })
  );

  server.registerPrompt(
    'review-tool-design',
    {
      title: 'Review an MCP tool design',
      description: 'Ask a model to review a proposed tool for security and usability.',
      argsSchema: z.object({
        proposal: z.string().min(1).max(2_000)
      })
    },
    ({ proposal }) => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: 'Review this proposed MCP tool design. Identify input validation, least-privilege, data exposure, error handling, and test gaps. Do not execute the proposal.\n\n' + proposal
        }
      }]
    })
  );

  return server;
}
