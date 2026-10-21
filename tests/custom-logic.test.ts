import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { jsonPointer, lintManifest, slugify, textDiff } from '../src/tools/custom/logic.js';

describe('JSON Pointer', () => {
  const document = JSON.stringify({
    nested: { 'a/b': { '~key': [null, false, 42] } },
    empty: null,
    __proto__: 'own key is never reached'
  });

  it('reads an RFC 6901 escaped path safely', () => {
    assert.deepEqual(jsonPointer(document, '/nested/a~1b/~0key/2'), { found: true, value: 42 });
    assert.deepEqual(jsonPointer(document, '/nested/a~1b/~0key/0'), { found: true, value: null });
    assert.deepEqual(jsonPointer(document, '/nested/a~1b/~0key/1'), { found: true, value: false });
    assert.equal(jsonPointer(document, '').found, true);
    assert.deepEqual(jsonPointer(document, '/missing'), { found: false });
    assert.deepEqual(jsonPointer(document, '/nested/a~1b/~0key/9'), { found: false });
    assert.deepEqual(jsonPointer(document, '/nested/a~1b/~0key/02'), { found: false });
  });

  it('rejects malformed pointers and special prototype keys', () => {
    assert.throws(() => jsonPointer(document, '/__proto__'), /Unsafe/);
    assert.throws(() => jsonPointer(document, '/constructor'), /Unsafe/);
    assert.throws(() => jsonPointer(document, 'nested'), /must be empty/);
    assert.throws(() => jsonPointer(document, '/nested/~3'), /escape/);
    assert.throws(() => jsonPointer('oops', ''), SyntaxError);
    assert.throws(() => jsonPointer(document, '/x'.repeat(33)), /too deep/);
  });
});

describe('Text diff', () => {
  it('produces one minimal changed line span', () => {
    assert.deepEqual(textDiff('one\ntwo\nthree', 'one\nnew\nthree'), {
      equal: false, startLine: 2, beforeLines: 3, afterLines: 3,
      removed: ['two'], added: ['new']
    });
    assert.equal(textDiff('unchanged', 'unchanged').equal, true);
    assert.deepEqual(textDiff('', 'created').added, ['created']);
    assert.deepEqual(textDiff('deleted', '').removed, ['deleted']);
    assert.equal(textDiff('a\r\nb', 'a\nb').equal, true);
  });
  it('rejects pathological line counts', () => {
    assert.throws(() => textDiff('a\n'.repeat(300), ''), /Too many lines/);
  });
});

describe('Slugify', () => {
  it('transliterates accents and removes unsafe punctuation', () => {
    assert.equal(slugify(' Übergröße & Spaß! '), 'ubergrosse-spass');
    assert.equal(slugify('Déjà Vu / API v2'), 'deja-vu-api-v2');
    assert.equal(slugify('---'), '');
    assert.equal(slugify('abc - def', 5), 'abc-d');
  });
});

describe('Cryo manifest linting', () => {
  const manifest = {
    id: 'my-tool', name: 'My Tool', version: '1.0.0',
    description: 'Offline metadata only', publisher: 'Local',
    status: 'published', capabilities: ['discovery'],
    requiredScopes: ['plugins:read']
  };
  it('validates the actual Cryo schema', () => {
    const result = lintManifest(JSON.stringify(manifest));
    assert.equal(result.valid, true);
    assert.equal(result.id, 'my-tool');
    assert.ok(result.warnings.some(w => w.includes('SHA-256')));
  });
  it('warns about elevated scopes, revocation and insecure URLs', () => {
    const result = lintManifest(JSON.stringify({
      ...manifest, status: 'revoked', requiredScopes: ['plugins:execute'],
      sourceUrl: 'http://example.invalid/plugin'
    }));
    assert.equal(result.valid, true);
    assert.equal(result.warnings.length, 4);
  });
  it('rejects unknown manifest fields and invalid JSON', () => {
    assert.equal(lintManifest('bad').valid, false);
    const result = lintManifest(JSON.stringify({ ...manifest, shellCommand: 'echo hi' }));
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  });
});
