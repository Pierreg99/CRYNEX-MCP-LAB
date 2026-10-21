/**
 * Pure text helpers. No filesystem, network or process execution.
 * "characters" counts Unicode code points, not UTF-16 code units.
 */
export interface TextStats {
  characters: number;
  words: number;
  lines: number;
}

export function analyzeText(text: string): TextStats {
  const words = text.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu);
  return {
    characters: Array.from(text).length,
    words: words?.length ?? 0,
    lines: text.length === 0 ? 0 : text.split(/\r\n|\r|\n/u).length
  };
}
