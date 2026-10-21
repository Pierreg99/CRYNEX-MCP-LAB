# Architecture

```text
MCP host (local client)
        |
        | stdio / MCP JSON-RPC
        v
src/index.ts -- serveStdio(createServer)
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
