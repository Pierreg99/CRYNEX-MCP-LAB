# Cryo-OMEGA read-only integration

**Implemented:** local discovery of user-selected plugin manifest snapshots and
Skill documents. **Not implemented:** remote Cryo-OMEGA access, plugin
installation/execution, OAuth HTTP server, or a native Skills extension.

## Pluginstore catalog

The process owner sets an **absolute path**:

```bash
CRYNEX_CATALOG_FILE="$(pwd)/examples/cryo-catalog.json" npm run dev
```

The file is a JSON object with schemaVersion 1 and a plugins array.
Each plugin has id, name, version, description, publisher, status,
capabilities and requiredScopes. Optional metadata: sourceUrl and sha256.

Limits: 1 MiB file size, 256 manifests, strict Zod validation, duplicate
ID rejection, and no symlinked catalog file. Only read-only
cryo_plugin_search and cryo_plugin_get tools become available.
Revoked plugins are hidden. The sample catalog is demonstration data.

Tool responses always mark catalog data **trust: unverified**. An optional
sha256 field describes third-party content but is not verified as a
publisher signature. Never use these records as execution instructions.

## Local Skills catalog

Enable an explicit flat directory of skill subdirectories:

```bash
CRYNEX_SKILLS_DIRECTORY="$(pwd)/examples/skills" npm run dev
```

Each folder must have a SKILL.md with plain YAML-style name and
description frontmatter. Names must match the directory name. Limits:
32 skills, 64 KiB per file, no symlinked child entries or SKILL.md files.

The server provides two read-only tools (cryo_skill_search, cryo_skill_get)
and a stable, snapshot-backed MCP resource URI per skill:
`skill://crynex/<name>/SKILL.md`. The search response publishes SHA-256,
which a client can recompute and compare after reading the resource.

The native MCP Skills extension (skills/list and skills/get) is not
advertised here. It must be added separately after the published SDK
package version offers the documented extension exports and tests pass.

## Connecting the real Cryo-OMEGA Pluginstore

Before enabling remote access, confirm the **actual** service origin,
API endpoints/OpenAPI contract, token issuer/audience, read scopes,
manifest signature scheme, revocation lifecycle and rate limits.
Do not invent endpoint paths or assume the sample manifest is production data.
Create an explicit HTTPS-only read adapter with timeouts, no redirects,
response-size cap, Zod validation, and a deny-by-default policy. Only
plugins:read and skills:read should be requested in discovery mode.

Never introduce install or execute tools without human approval,
authenticating each caller, sandbox isolation and audit records.
