import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { loadSkillCatalog } from './connectors/cryo/skills.js';
import { readConfig } from './config.js';
import { loadPluginCatalog } from './connectors/cryo/catalog.js';
import { createServer, type ServerOptions } from './server.js';

async function main(): Promise<void> {
  const config = readConfig(process.env);
  const options: ServerOptions = {};
  if (config.catalogFile) options.catalog = await loadPluginCatalog(config.catalogFile);
  if (config.skillsDirectory) {
    options.skills = await loadSkillCatalog(config.skillsDirectory);
  }

  // The SDK requires a fresh MCP server per negotiated stdio connection.
  // stdout is exclusively for JSON-RPC; diagnostics go to stderr.
  void serveStdio(() => createServer(options));
  console.error('CRYNEX MCP Lab ready (stdio; optional local adapters: ' +
    (options.catalog ? 'catalog ' : '') + (options.skills ? 'skills' : '') + ')');
}

void main().catch(error => {
  // Do not echo configuration values or loaded external data to logs.
  console.error('CRYNEX MCP Lab startup failed:', error instanceof Error ? error.name : 'Error');
  process.exitCode = 1;
});
