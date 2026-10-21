# CRYNEX MCP LAB

[![CI](https://github.com/Pierreg99/CRYNEX-MCP-LAB/actions/workflows/ci.yml/badge.svg)](https://github.com/Pierreg99/CRYNEX-MCP-LAB/actions/workflows/ci.yml)

**Local-first Model Context Protocol development lab** built with TypeScript,
the official **MCP SDK v2**, Zod validation, and a real stdio integration test.

> The default runtime is entirely local and read-only. Optional Cryo and Skills
> adapters require explicit operator-selected filesystem paths. No remote
> Cryo-OMEGA API, plugin execution, or deployment is enabled.

## Project website

The responsive project page lives in [`docs/index.html`](docs/index.html). It includes
the quick start, copyable MCP host configuration, capability overview, security
boundaries, and clearly marked roadmap items.

Preview it locally from the repository root:

```bash
python3 -m http.server 8080 --directory docs
```

Open `http://localhost:8080`. The page has no build step, runtime dependencies,
external assets, or live server connection. It can also be served by a static host
using `docs/` as the public directory. Hosting access and deployment are configured
separately; committing this page does not enable GitHub Pages.

## Requirements

- Node.js **22 or later**
- npm

## Quick start

```bash
git clone https://github.com/Pierreg99/CRYNEX-MCP-LAB.git
cd CRYNEX-MCP-LAB
npm ci
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
| Tool | `cryo_plugin_search`, `cryo_plugin_get` | Optional local manifest discovery |
| Tool | `cryo_skill_search`, `cryo_skill_get` | Optional local skill discovery |
| Resource | `skill://crynex/<name>/SKILL.md` | Optional immutable skill document |

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

## Opt-in Cryo-OMEGA discovery and local skills

This release provides a **real read-only local adapter**, not an invented remote
Cryo-OMEGA endpoint. It can read an operator-selected JSON catalog that follows
the documented schema (see [Cryo integration](docs/CRYO-INTEGRATION.md)).
To enable sample catalog discovery:

```bash
CRYNEX_CATALOG_FILE="$(pwd)/examples/cryo-catalog.json" npm run dev
```

To enable a local Skill registry as normal MCP tools and resources:

```bash
CRYNEX_SKILLS_DIRECTORY="$(pwd)/examples/skills" npm run dev
```

Both paths must be absolute. They can be enabled independently or together.
The sample catalog and sample Skill are **illustrative** and are never
executed. All imported metadata remains untrusted model input.

The native `io.modelcontextprotocol/skills` extension is **not advertised**:
published SDK 2.3.1 does not expose the documented Skills import paths.
The current adapter provides read-only MCP discovery and `skill://`
resources; the standards-native extension is a follow-up once supported
by the locked SDK version.

See [protocol support](docs/PROTOCOL-COMPLIANCE.md) and the
[threat model](docs/THREAT-MODEL.md).

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

- **No network listener, shell execution or credentials.** Filesystem reads are opt-in, limited to operator-selected local catalogs.
- Zod validates tool inputs and enforces a maximum size.
- GitHub Actions tests Node.js 22/24 using a committed lockfile, and Dependabot proposes updates.
- A committed `package-lock.json` and `npm ci` ensure reproducible CI installs.

Read [SECURITY.md](SECURITY.md), [architecture](docs/ARCHITECTURE.md), and
[contributing](CONTRIBUTING.md) before enabling additional capabilities.

## Roadmap

1. Modern and legacy MCP stdio verification, typed read-only catalog and Skill discovery (v0.2.0).
2. Official Skills extension after support lands in the installed SDK.
3. Verified Cryo-OMEGA API contracts and scoped HTTPS discovery client.
4. Remote auth, observability and sandboxed execution after security review.

See [official MCP TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/v2/)
for the protocol and current APIs.
