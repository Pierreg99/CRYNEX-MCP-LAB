/**
 * Local capability gate, not user authentication. The local MCP host is
 * the trust boundary; remote transports MUST add real caller authorization.
 */
export type Scope = 'plugins:read' | 'plugins:install' | 'plugins:execute' | 'registry:write';

export function allowed(scopes: ReadonlySet<Scope>, scope: Scope): boolean {
  return scopes.has(scope);
}

export function localScopes(catalogConfigured: boolean): ReadonlySet<Scope> {
  return new Set<Scope>(catalogConfigured ? ['plugins:read'] : []);
}
