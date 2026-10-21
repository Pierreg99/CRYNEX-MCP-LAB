import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import * as z from 'zod/v4';

export const MAX_CATALOG_BYTES = 1_048_576;
export const pluginSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-z0-9][a-z0-9._-]*$/),
  name: z.string().min(1).max(100),
  version: z.string().min(1).max(32),
  description: z.string().max(500),
  publisher: z.string().min(1).max(100),
  status: z.enum(['draft', 'published', 'deprecated', 'revoked']),
  capabilities: z.array(z.string().min(1).max(64)).max(20),
  requiredScopes: z.array(z.string().min(1).max(64)).max(20),
  sourceUrl: z.url().max(300).optional(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/).optional()
}).strict();

const catalogSchema = z.object({
  schemaVersion: z.literal(1),
  plugins: z.array(pluginSchema).max(256)
}).strict();

export type PluginManifest = z.infer<typeof pluginSchema>;
export type PluginCatalog = readonly PluginManifest[];

/** Read one operator-selected local JSON file, only once at startup. */
export async function loadPluginCatalog(filePath: string): Promise<PluginCatalog> {
  const flags = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0);
  const handle = await open(filePath, flags);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > MAX_CATALOG_BYTES) {
      throw new Error('Catalog must be a regular file of at most 1 MiB');
    }
    const raw = await handle.readFile({ encoding: 'utf8' });
    const parsed: unknown = JSON.parse(raw);
    const catalog = catalogSchema.parse(parsed);
    const ids = new Set<string>();
    for (const plugin of catalog.plugins) {
      if (ids.has(plugin.id)) throw new Error('Duplicate plugin id: ' + plugin.id);
      ids.add(plugin.id);
    }
    return catalog.plugins.slice().sort((a, b) => a.id.localeCompare(b.id));
  } finally {
    await handle.close();
  }
}

export function searchPlugins(catalog: PluginCatalog, query: string, limit: number): PluginManifest[] {
  const needle = query.trim().toLocaleLowerCase('en');
  return catalog.filter(p => p.status !== 'revoked' &&
    (p.id + ' ' + p.name + ' ' + p.description + ' ' + p.publisher).toLocaleLowerCase('en').includes(needle)
  ).slice(0, limit);
}

export function findPlugin(catalog: PluginCatalog, id: string): PluginManifest | undefined {
  const plugin = catalog.find(p => p.id === id);
  return plugin?.status === 'revoked' ? undefined : plugin;
}
