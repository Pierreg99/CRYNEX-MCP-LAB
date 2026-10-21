import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { analyzeText } from '../src/logic.js';

describe('analyzeText', () => {
  it('handles empty input', () => {
    assert.deepEqual(analyzeText(''), { characters: 0, words: 0, lines: 0 });
  });

  it('counts Unicode code points and line endings', () => {
    assert.deepEqual(analyzeText('Hallo 🌍\r\nWelt!'), {
      characters: 14,
      words: 2,
      lines: 2
    });
  });

  it('counts words in multiple writing systems', () => {
    assert.deepEqual(analyzeText('你好 Welt'), {
      characters: 7,
      words: 2,
      lines: 1
    });
  });
});
