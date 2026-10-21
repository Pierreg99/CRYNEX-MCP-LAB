# Build your own CRYNEX MCP functions

CRYNEX v0.3.0 ships four first-party tools; unlike local plugin and Skills
snapshots, these tools are enabled by default. They are executable MCP
**handlers**, but contain no shell execution, filesystem reads, or network
calls. Untrusted plugin catalogs never register code dynamically.

## Architecture

- `src/tools/custom/logic.ts`: pure, independently unit-tested helpers.
- `src/tools/custom/index.ts`: `registerCustomTools(server)` holds the
  MCP registrations, Zod validation, safe annotations and structured outputs.
- `src/server.ts`: calls the registry once for each MCP stdio connection.
- `tests/custom-logic.test.ts`: unit and security edge cases.
- `tests/custom-mcp.test.ts`: actual legacy and modern stdio MCP clients.

## Tools and limits

| Tool | Input | Output | Design |
| --- | --- | --- | --- |
| `crynex_json_pointer` | JSON string ≤10k characters, pointer ≤256 chars | `found` and `value` | RFC 6901; no eval, prototype keys denied |
| `crynex_text_diff` | Two texts ≤10k each, ≤300 lines each | single changed range | linear work; no multi-hunk algorithm |
| `crynex_slugify` | text ≤1000 chars, maxLength 1..100 | ASCII slug | UI labels only, not auth |
| `crynex_manifest_lint` | strict manifest JSON ≤10k | valid, id, warnings, errors | advisory only, never run code |

The custom tool catalog is also exposed as the read-only MCP resource
`crynex://tools/custom`.

## Add another first-party tool

1. Write a pure function in `src/tools/custom/logic.ts`, with explicit
   input bounds and deterministic output.
2. Register it in `registerCustomTools` with Zod input and output schemas.
3. Add its name to `CUSTOM_TOOL_NAMES` so it appears in the about resource.
4. Add unit tests and live stdio MCP tests (both protocol eras).
5. Document permission, side effects, expected limits and errors.

Example registration pattern (adapt only the logic and test cases):

```ts
server.registerTool('crynex_uppercase', {
  title: 'CRYNEX Uppercase',
  description: 'Uppercase caller-supplied text (local only).',
  inputSchema: z.object({ text: z.string().max(1000) }),
  outputSchema: z.object({ text: z.string() }),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
  }
}, async ({ text }) => ({
  content: [{ type: 'text', text: JSON.stringify({ text: text.toUpperCase() }) }],
  structuredContent: { text: text.toUpperCase() }
}));
```

## Security checklist

- Validate all tool arguments at the MCP boundary, not only in documentation.
- Reject unsafe JSON key paths, giant strings and unbounded recursion/loops.
- Never interpolate untrusted arguments into a shell command.
- Do not read local files or tokens merely to process caller-supplied text.
- Treat plugin manifests and skill instructions as **untrusted data**.
- Do not claim `readOnlyHint` is an authorization mechanism.
- Prefer explicit opt-in capabilities for network, write or OS access.
- Test MCP error responses and edge cases before opening a PR.

## Verify and inspect

```bash
npm ci
npm run typecheck
npm test
npx @modelcontextprotocol/inspector node dist/src/index.js
```

In Inspector, call `tools/list` and use the `crynex_*` tools.
Use `resources/read` for `crynex://tools/custom`. The GitHub CI matrix
runs Node.js 22 and 24 with reproducible `npm ci`.
