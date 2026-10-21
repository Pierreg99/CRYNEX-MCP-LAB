# Architecture

```text
MCP host (local client)
        |
        | stdio / MCP JSON-RPC
        v
src/index.ts -- serveStdio(() => createServer(options))
        |
        v
src/server.ts -- registers tools, resources and prompts
        |
        +-- src/tools/custom/index.ts -- first-party MCP tools (Zod)
        |          |
        |          +-- src/tools/custom/logic.ts -- pure bounded helpers
        |
        +-- src/connectors/cryo/* -- operator-selected snapshots
        |
        +-- src/logic.ts -- side-effect-free text helpers
```

## MCP surface

| Type | Name | Purpose |
| --- | --- | --- |
| Tool | `ping` | Check liveness |
| Tool | `text_stats` | Count Unicode characters, words and lines |
| Tool | `sha256` | Hash caller-supplied UTF-8 text |
| Resource | `crynex://about` | Non-sensitive server metadata |
| Prompt | `review-tool-design` | Template for tool design review |

No project-specific Cryo-OMEGA services are automatically connected. Integration
with a real plugin registry or external API is a **future opt-in** capability.
See SECURITY.md before adding network access.

## Verification

- `tests/logic.test.ts`: pure-function unit tests.
- `tests/server.test.ts`: spawns the built binary and uses the official MCP
  TypeScript client over stdio for handshake, discovery, calls, invalid input,
  resources and prompts.
- GitHub Actions runs on Node 22 and 24 and audits production dependencies.

## Next milestones

1. Keep the committed lockfile updated and review Dependabot PRs.
2. Add optional pluggable connectors behind explicit configuration.
3. Add least-privilege access policy and auditable tool permissions.
4. Consider HTTP transport only after authentication and threat modeling.

## Optional read-only boundaries

- Config: src/config.ts parses explicit absolute local catalog and Skills paths.
- Catalog: src/connectors/cryo/catalog.ts loads strict Zod manifests (max 1 MiB), searches and gets metadata; no execution or HTTP.
- Skills: src/connectors/cryo/skills.ts loads a flat operator-specified directory (up to 32 skills and 64 KiB per SKILL.md), captures SHA-256 digests, serves read-only MCP tools and skill:// resources.
- Policy: src/security/policy.ts denies install/execute/write permissions; catalog discovery only receives plugins:read.
- No remote Cryo API is connected until its real schema, issuer, audience and scopes are known.

See CRYO-INTEGRATION.md and THREAT-MODEL.md. Protocol tests exercise both legacy and modern stdio paths.

## First-party custom MCP tools (v0.3.0)

The always-enabled tools `crynex_json_pointer`, `crynex_text_diff`,
`crynex_slugify` and `crynex_manifest_lint` are registered through
`src/tools/custom/index.ts`. The pure, bounded transformations are in
`src/tools/custom/logic.ts`. They publish typed Zod schemas, MCP read-only
annotations, structured output and the resource `crynex://tools/custom`.

Extend this registry rather than introducing dynamic imports from catalog
files. See [CUSTOM-TOOLS.md](CUSTOM-TOOLS.md). Tests verify both MCP eras.
