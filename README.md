# CRYNEX MCP LAB

[![CI](https://github.com/Pierreg99/CRYNEX-MCP-LAB/actions/workflows/ci.yml/badge.svg)](https://github.com/Pierreg99/CRYNEX-MCP-LAB/actions/workflows/ci.yml)

**Local-first Model Context Protocol development lab** built with TypeScript,
the official **MCP SDK v2**, Zod validation, and a real stdio integration test.

> Starter project: it does not automatically connect to GitHub, Cryo-OMEGA,
> or third-party systems. All shipped operations are local and read-only.

## Requirements

- Node.js **22 or later**
- npm

## Quick start

```bash
git clone https://github.com/Pierreg99/CRYNEX-MCP-LAB.git
cd CRYNEX-MCP-LAB
npm install
npm run typecheck
npm test
npm run build
npm start
```

The server runs over **stdio** and waits for an MCP client. It prints diagnostics
to **stderr**, never stdout.

For development, use `npm run dev`. For the MCP Inspector:

```bash
npm run build
npx @modelcontextprotocol/inspector node dist/src/index.js
```

## MCP capabilities

| Kind | Name | Description |
| --- | --- | --- |
| Tool | `ping` | Returns `pong` |
| Tool | `text_stats` | Unicode character, word, and line counts |
| Tool | `sha256` | SHA-256 hash of UTF-8 input |
| Resource | `crynex://about` | Static server metadata |
| Prompt | `review-tool-design` | Template for reviewing an MCP tool design |

Example tool call for `text_stats`:

```json
{"text":"Hallo Welt"}
```

Expected text response:

```json
{"characters":10,"words":2,"lines":1}
```

## Connect a desktop MCP host

Build the server with `npm run build`, then configure your MCP host to launch
the executable from an **absolute** path. Adapt the following generic
`mcpServers` style configuration to the format expected by your host:

```json
{
  "mcpServers": {
    "crynex-mcp-lab": {
      "command": "node",
      "args": ["/absolute/path/to/CRYNEX-MCP-LAB/dist/src/index.js"]
    }
  }
}
```

Do not launch the server separately when your MCP client manages the process.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start TypeScript source directly |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run compiled stdio server |
| `npm run typecheck` | Strict TypeScript check |
| `npm test` | Build and run unit + MCP protocol integration tests |
| `npm run audit:prod` | Audit production dependencies |

## Security and development

- **No network listener, file access, child command execution or credentials.**
- Zod validates tool inputs and enforces a maximum size.
- GitHub Actions tests Node.js 22/24, and Dependabot proposes updates.
- `npm install` is used until a reviewed lockfile is generated and committed;
  for production-grade reproducibility, add `package-lock.json` and switch CI
  to `npm ci`.

Read [SECURITY.md](SECURITY.md), [architecture](docs/ARCHITECTURE.md), and
[contributing](CONTRIBUTING.md) before enabling additional capabilities.

## Roadmap

1. Secure typed MCP tool registry and developer playground.
2. Opt-in connector interface for Cryo-OMEGA and compatible plugin registries.
3. Permission profiles, auditable tool execution, and optional remote transport.

See [official MCP TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/v2/)
for the protocol and current APIs.
