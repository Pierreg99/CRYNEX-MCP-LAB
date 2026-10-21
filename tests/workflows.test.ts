import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { inspectJson } from '../src/tools/custom/inspection.js';
import { executePipeline } from '../src/tools/custom/pipeline.js';

describe('CRYNEX JSON shape inspection', () => {
  it('only reveals metadata, never string values', () => {
    const result = inspectJson('{"secret":"do-not-disclose","items":[1,true,null],"nested":{"enabled":false}}');
    assert.deepEqual(result, {
      type: 'object', depth: 2, nodes: 8, objects: 2, arrays: 1, scalars: 5,
      topKeys: ['items', 'nested', 'secret'], truncated: false
    });
    assert.doesNotMatch(JSON.stringify(result), /do-not-disclose/);
  });
  it('reports truncation at explicit depth and supports primitive roots', () => {
    const partial = inspectJson('{"outer":{"inner":{"deep":1}}}', 1);
    assert.equal(partial.truncated, true);
    assert.equal(partial.depth, 1);
    assert.deepEqual(inspectJson('null'), {
      type: 'null', depth: 0, nodes: 1, objects: 0, arrays: 0, scalars: 1,
      topKeys: [], truncated: false
    });
  });
  it('rejects malformed and oversized inputs, invalid depth and node explosion', () => {
    assert.throws(() => inspectJson('{broken'), SyntaxError);
    assert.throws(() => inspectJson('"x"', 0), /depth/);
    assert.throws(() => inspectJson('"x"', 13), /depth/);
    assert.throws(() => inspectJson('x'.repeat(10_001)), /exceeds/);
    assert.throws(() => inspectJson('[' + Array(2_049).fill('0').join(',') + ']'), /node limit/);
  });
});

describe('CRYNEX local text pipeline', () => {
  it('chains fixed audited operations with bounded outputs', () => {
    const result = executePipeline('  Grüße CRYNEX!  ', ['trim', 'slugify', 'uppercase']);
    assert.deepEqual(result, {
      value: 'GRUSSE-CRYNEX', operations: ['trim', 'slugify', 'uppercase'],
      inputLength: 17, outputLength: 13, intermediateLengths: [13, 13, 13]
    });
    const digest = executePipeline(' abc ', ['trim', 'sha256']);
    assert.match(digest.value, /^[0-9a-f]{64}$/);
    assert.deepEqual(digest.intermediateLengths, [3, 64]);
  });
  it('rejects code-like unknown operations and excessive work', () => {
    assert.throws(() => executePipeline('ok', []), /1 to 8/);
    assert.throws(() => executePipeline('ok', Array(9).fill('trim')), /1 to 8/);
    assert.throws(() => executePipeline('ok', ['shell'] as never), /Unsupported/);
    assert.throws(() => executePipeline('a'.repeat(10_001), ['trim']), /exceeds/);
    assert.throws(() => executePipeline('ß'.repeat(6_000), ['uppercase']), /exceeds|Unexpected/);
  });
});
