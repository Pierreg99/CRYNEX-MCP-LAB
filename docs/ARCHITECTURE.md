# Architecture

```text
MCP host (local client)
        |
        | stdio / MCP JSON-RPC
        v
src/index.ts -- serveStdio(() => createServer(options))
        |
        v
src/server.ts -- MCP tools / resource / prompt (Zod validation)
        |
        v
src/logic.ts -- side-effect-free text helpers
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
