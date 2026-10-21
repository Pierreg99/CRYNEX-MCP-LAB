import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createServer } from './server.js';

// stdout is exclusively reserved for MCP JSON-RPC messages.
console.error('CRYNEX MCP Lab: stdio server starting');
void serveStdio(createServer).catch(error => {
  console.error('CRYNEX MCP Lab failed to start:', error);
  process.exitCode = 1;
});
