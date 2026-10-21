/** Bounded shape-only JSON inspection. Does not expose scalar contents. */
export interface JsonInspection {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  depth: number;
  nodes: number;
  objects: number;
  arrays: number;
  scalars: number;
  topKeys: string[];
  truncated: boolean;
}

type JsonType = JsonInspection['type'];
function jsonType(value: unknown): JsonType {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value === null ? 'null' : typeof value;
  throw new Error('Unsupported JSON value');
}

export function inspectJson(document: string, maxDepth = 8): JsonInspection {
  if (document.length > 10_000) throw new Error('JSON input exceeds 10,000 UTF-16 code units');
  if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > 12) throw new Error('Invalid maximum depth');
  const root: unknown = JSON.parse(document);
  const type = jsonType(root);
  const topKeys = type === 'object'
    ? Object.keys(root as Record<string, unknown>).sort().slice(0, 24)
    : [];
  const stack: Array<{ value: unknown; depth: number }> = [{ value: root, depth: 0 }];
  let depth = 0, nodes = 0, objects = 0, arrays = 0, scalars = 0, truncated = false;
  while (stack.length) {
    const next = stack.pop();
    if (!next) break;
    nodes++;
    if (nodes > 2_048) throw new Error('JSON node limit exceeded');
    depth = Math.max(depth, next.depth);
    const kind = jsonType(next.value);
    if (kind === 'object') objects++;
    else if (kind === 'array') arrays++;
    else scalars++;
    if (kind !== 'array' && kind !== 'object') continue;
    const children = kind === 'array'
      ? next.value as unknown[]
      : Object.values(next.value as Record<string, unknown>);
    if (next.depth >= maxDepth) {
      if (children.length) truncated = true;
      continue;
    }
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push({ value: children[i], depth: next.depth + 1 });
    }
    if (stack.length > 2_048) throw new Error('JSON node limit exceeded');
  }
  return { type, depth, nodes, objects, arrays, scalars, topKeys, truncated };
}
