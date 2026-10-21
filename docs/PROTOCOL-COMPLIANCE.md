# MCP protocol compatibility

The project uses the official MCP TypeScript SDK v2 with stdio.
The server launches with a factory via `serveStdio(() => createServer())`.

| Feature | Status |
| --- | --- |
| 2025-era stdio / initialize | Integration test in tests/server.test.ts |
| 2026-07-28 stdio / server/discover | Pinned modern integration test in tests/modern.test.ts |
| Core tools, prompts, resources | Both eras tested |
| Tool annotations | Read-only, idempotent, no open-world hint |
| text_stats outputSchema | Typed structured content |
| Local Cryo catalog | Optional, read-only MCP tools |
| Local Skill catalog | Optional read-only tools and skill:// resources |
| Official Skills extension | Not present in SDK 2.3.1 exported entrypoints |
| Streamable HTTP + OAuth | Not implemented |
| Independent wire-level certification | Not performed |

Clients need to explicitly opt into modern MCP using
`versionNegotiation: { mode: { pin: '2026-07-28' } }`.
The default SDK client remains legacy. The test asserts
`client.getProtocolEra() === 'modern'`.

Wire-level resultType/caching behavior is delegated to the official
SDK. An independent wire conformance suite is a later milestone.

Reference: https://ts.sdk.modelcontextprotocol.io/v2/migration/support-2026-07-28
