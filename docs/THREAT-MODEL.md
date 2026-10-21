# Threat model — CRYNEX-MCP-LAB

## Trust boundaries

1. **Local host to stdio:** The process-launching local host is trusted.
   This is not remote or multi-user authentication.
2. **Environment to local catalog paths:** The operator, not the model,
   selects absolute files/directories. All discovered content is untrusted.
3. **Plugin/Skill metadata to model:** Descriptions can contain prompt injection.
   Treat them as data, never instructions, authority, or code.

## Defensive controls

| Risk | Current mitigation |
| --- | --- |
| Untrusted plugin execution | No install/execute APIs and no dynamic module loading |
| Path traversal by MCP caller | Tool arguments never include filesystem paths |
| Symlink catalog injection | O_NOFOLLOW on catalog/skill file opens |
| Oversized or malformed manifests | Strict Zod, 1 MiB, 256 items, duplicate checks |
| Oversized/invalid skill files | Maximum 32 files, 64 KiB each, strict frontmatter |
| Prompt injection | Untrusted provenance label; no automatic skill execution |
| Unauthorized write | Local scope gate permits only plugins:read |
| Stale file edits | Immutable snapshot read at startup; SHA-256 on skill files |
| Credential leakage | No credentials required, no user data logged |
| Remote attack surface | No network listener; remote OAuth is future work |
| Supply chain | npm lockfile, pinned GitHub Actions, CI and Dependabot |

## Residual risk

- The operator can grant the process access to local files. This is
  intentional opt-in. Run with OS least privilege; do not expose secrets.
- The actual owner/publisher and any sha256 metadata of a catalog
  manifest are not cryptographically authenticated.
- A SHA-256 digest provides integrity comparison, not publisher trust.
- Skills are untrusted content even when served by MCP Resources.
- The TypeScript SDK version in the lockfile does not yet ship the
  documented native Skills extension entrypoints; this implementation
  does not advertise or impersonate that capability.
- Production auth, audit persistence, provenance signatures and
  sandboxed execution are outstanding work.

## Added threat boundary: operator-defined tools

A local `CRYNEX_CUSTOM_TOOLS_FILE` path is selected by the process owner, not by a remote MCP model. The JSON contains **data definitions only**, never code, shell commands or fetch URLs. A strict allowlist of text-only transformations, name rules, uniqueness checks and 32 KiB size bounds prevent dynamic execution. The operator must avoid giving the process unnecessary local filesystem privileges. Browser demos and generated JSON remain entirely client-side and are not an authenticated MCP transport.
