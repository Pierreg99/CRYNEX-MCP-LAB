# Contributing

1. Use Node.js 22 or newer and run `npm install`.
2. Run `npm run typecheck` and `npm test` before sending a PR.
3. For each MCP tool, add Zod input validation, limits and an integration test.
4. Never add arbitrary shell, filesystem, network or secret access by default.
5. Keep the README and SECURITY.md accurate when changing the surface area.

Changes should be reviewed through pull requests. CI must pass before merge.
