# Declarative CRYNEX MCP tools (v0.4.0)

Use the browser-only [tool builder](index.html#tool-builder) or edit
[the checked-in example](../examples/custom-tools.json).

## Why declarative?

This configuration provides **new MCP tool names** without allowing
operator-supplied JSON to inject arbitrary JavaScript. Each tool maps to
a reviewed internal operation. This is intentionally not a full
plugin/agent execution platform.

## Configure and start

```bash
npm ci
npm test
CRYNEX_CUSTOM_TOOLS_FILE="$(pwd)/examples/custom-tools.json" npm run dev
```

The path must be absolute and set by the **process owner**, not a tool
argument. Restart the process after editing the file; CRYNEX loads one
immutable startup snapshot.

## JSON v1

```json
{
  "schemaVersion": 1,
  "tools": [
    {
      "name": "custom_uppercase",
      "title": "Uppercase a message",
      "description": "Convert provided text to uppercase.",
      "operation": "uppercase"
    }
  ]
}
```

Allowed `operation` values: `uppercase`, `lowercase`, `trim`,
`slugify` and `sha256`.

- **Names:** must match `^custom_[a-z][a-z0-9_]{2,48}$`.
- **Maximum:** 16 tools and 32 KiB for the JSON file.
- **Tool inputs:** `{"text":"..."}` with max 10,000 UTF-16 code units.
- **Tool outputs:** `{"value":"..."}` in MCP `structuredContent`.
- **Version:** strict `schemaVersion: 1` and no unknown fields.
- **Filesystem:** opening a symlink to the JSON file is refused on
  supported systems, and no runtime tool accepts a path.
- **Privileges:** no network requests, local file reads during tool
  calls, shell, dynamic imports or mutable global state.
- **MCP visibility:** tools appear in `tools/list` only when enabled;
  `crynex://tools/configured` lists their declared metadata.

To implement a **new actual algorithm**, edit the audited TypeScript
functions in `src/tools/declarative.ts`, update the Zod enum and tests,
then review the security impact. Do **not** evaluate arbitrary
operator-defined code or map a tool name directly to a shell command.

## Browser demo vs MCP runtime

The static docs page (`docs/index.html`, `docs/playground.js`) can generate
and download a JSON manifest. Its interactive executions run strictly
in the browser; no JSON-RPC or MCP connection is made. To verify the
real MCP behavior, run the MCP Inspector against the local stdio binary.

## Troubleshooting

If startup fails, check the absolute path, JSON syntax, schema version,
duplicate tool names, length restrictions, the selected operation and
whether the file is a symlink. An invalid configuration must **fail closed**.

The SDK currently supports both legacy MCP initialize and modern
2026-07-28 protocol eras; both are covered by the integration tests.

## Interactive website: validated import and editing

The documentation page supports a live capability search, importing a local
JSON configuration, editing tool entries, reordering tools with accessible
buttons, and exporting the resulting JSON. An import only changes the browser
draft after schema validation: wrong versions, extra fields, duplicates,
unknown operations and oversized files are refused without losing prior data.

**No automatic activation:** the server reads an explicit absolute file path
from `CRYNEX_CUSTOM_TOOLS_FILE` at startup. Restart the local process and use
MCP Inspector to verify real tool behavior. README.md itself cannot execute JS.
