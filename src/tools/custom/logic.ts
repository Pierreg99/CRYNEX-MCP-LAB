import { pluginSchema } from '../../connectors/cryo/catalog.js';

export const MAX_JSON_SIZE = 10_000;
export const MAX_DIFF_SIZE = 10_000;

export interface JsonPointerResult {
  found: boolean;
  value?: unknown;
}

/** RFC 6901 JSON Pointer: no path evaluation, code execution, or prototype lookup. */
export function jsonPointer(document: string, pointer: string): JsonPointerResult {
  const parsed: unknown = JSON.parse(document);
  if (pointer === '') return { found: true, value: parsed };
  if (!pointer.startsWith('/')) throw new Error('JSON pointer must be empty or start with /');
  const segments = pointer.slice(1).split('/');
  if (segments.length > 32) throw new Error('JSON pointer is too deep');
  let current: unknown = parsed;
  for (const raw of segments) {
    if (/~(?![01])/u.test(raw)) throw new Error('Invalid JSON pointer escape');
    const token = raw.replace(/~1/gu, '/').replace(/~0/gu, '~');
    // Explicitly deny special object keys even though JSON.parse creates only data.
    if (['__proto__', 'constructor', 'prototype'].includes(token)) {
      throw new Error('Unsafe JSON pointer token');
    }
    if (Array.isArray(current)) {
      if (!/^(0|[1-9][0-9]*)$/u.test(token)) return { found: false };
      const index = Number(token);
      if (!Number.isSafeInteger(index) || index >= current.length) return { found: false };
      current = current[index];
    } else if (current !== null && typeof current === 'object') {
      if (!Object.hasOwn(current, token)) return { found: false };
      current = (current as Record<string, unknown>)[token];
    } else {
      return { found: false };
    }
  }
  return { found: true, value: current };
}

export interface TextChange {
  equal: boolean;
  startLine: number;
  beforeLines: number;
  afterLines: number;
  removed: string[];
  added: string[];
}

/** Single-span line diff with linear cost and deterministic bounded output. */
export function textDiff(before: string, after: string): TextChange {
  const a = before === '' ? [] : before.split(/\r\n|\r|\n/u);
  const b = after === '' ? [] : after.split(/\r\n|\r|\n/u);
  if (a.length > 300 || b.length > 300) throw new Error('Too many lines (maximum 300 per text)');
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--; endB--;
  }
  const removed = a.slice(start, endA);
  const added = b.slice(start, endB);
  return {
    equal: removed.length === 0 && added.length === 0,
    startLine: start + 1,
    beforeLines: a.length,
    afterLines: b.length,
    removed,
    added
  };
}

/** Predictable ASCII slugs for docs and tool labels, never filesystem paths. */
export function slugify(text: string, maxLength = 80): string {
  const normalized = text.trim().replace(/ß/gu, 'ss').replace(/ẞ/gu, 'SS')
    .normalize('NFKD').replace(/[\u0300-\u036f]/gu, '').toLowerCase();
  return normalized.replace(/[^a-z0-9]+/gu, '-').replace(/^-+|-+$/gu, '')
    .slice(0, maxLength).replace(/-+$/gu, '');
}

export interface ManifestReport {
  valid: boolean;
  id: string | null;
  warnings: string[];
  errors: string[];
}

/** Strict local schema linting. Does not load, resolve, sign, or execute plugins. */
export function lintManifest(json: string): ManifestReport {
  let input: unknown;
  try { input = JSON.parse(json); }
  catch { return { valid: false, id: null, warnings: [], errors: ['Invalid JSON'] }; }

  const parsed = pluginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false, id: null, warnings: [],
      errors: parsed.error.issues.slice(0, 12).map(issue =>
        (issue.path.length ? issue.path.join('.') : '$') + ': ' + issue.message.slice(0, 160))
    };
  }
  const data = parsed.data;
  const warnings: string[] = [];
  if (data.status === 'revoked') warnings.push('Plugin is revoked and unavailable for discovery');
  if (data.status === 'draft') warnings.push('Plugin is a draft, not a verified publication');
  if (data.sourceUrl && !data.sourceUrl.startsWith('https://')) {
    warnings.push('Source URL is not HTTPS');
  }
  if (data.requiredScopes.some(scope => /(^|[:/._*-])(write|admin|execute|install|delete)([:/._*-]|$)/iu.test(scope) || scope.includes('*'))) {
    warnings.push('Manifest declares elevated or wildcard permissions; require independent review');
  }
  if (!data.sha256) warnings.push('No artifact SHA-256 metadata present (not a signature)');
  return { valid: true, id: data.id, warnings, errors: [] };
}
