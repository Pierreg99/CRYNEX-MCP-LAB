# Security policy

CRYNEX-MCP-LAB is a local-first example MCP server, **not** a hosted multi-tenant service.

## Security boundaries

- Only the **stdio** transport is enabled. No HTTP port is opened.
- Default tools are deterministic and use caller-provided text only.
- Explicit absolute catalog or skill directory configuration enables bounded local read-only file access; it is disabled by default.
- Tool arguments are validated by Zod, including a 10,000 UTF-16-code-unit input limit.
- There is **no** arbitrary command execution, dynamic tool installation, network access,
  arbitrary filesystem paths from MCP requests, token handling or secret exposure.
- stdout is reserved for protocol output; diagnostic logs go to stderr.
- Access to the server is determined by the **local host process** launching it.
  Do not run it with elevated privileges.

## Safe extension guidelines

1. For any new tool, document what it reads or changes, validate input and
   enforce least privilege. Never invoke a shell using untrusted input.
2. Add authentication, authorization, origin checks, TLS and rate limits
   **before** introducing a network transport. stdio's local boundary is
   not a substitute for authentication on a publicly reachable service.
3. Treat optional catalog metadata and skill documents as untrusted data, not instructions.
   Do not log prompts, tokens or user secrets.
4. Keep dependencies up to date; inspect Dependabot updates and CI results.
5. Review new connectors before granting access to external services.

## Reporting vulnerabilities

Do not disclose exploitable issues in public GitHub Issues. Contact the
repository maintainer privately using GitHub's private vulnerability reporting
feature, if enabled, or a non-public channel agreed with the maintainer.
