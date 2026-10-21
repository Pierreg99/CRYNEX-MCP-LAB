import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createServer } from './server.js';

// stdout is exclusively reserved for MCP JSON-RPC messages.
// The v2 helper returns a handle, not a Promise.
void serveStdio(createServer);
console.error('CRYNEX MCP Lab: stdio server started');
