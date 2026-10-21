import { runDeclarativeOperation, type DeclarativeTool } from '../declarative.js';

export const PIPELINE_OPERATIONS = ['uppercase', 'lowercase', 'trim', 'slugify', 'sha256'] as const;
export type PipelineOperation = (typeof PIPELINE_OPERATIONS)[number];

export interface PipelineResult {
  value: string;
  operations: PipelineOperation[];
  inputLength: number;
  outputLength: number;
  intermediateLengths: number[];
}

/** Sequential, audited transformations. Never evaluates code or reads files. */
export function executePipeline(text: string, operations: readonly PipelineOperation[]): PipelineResult {
  if (text.length > 10_000) throw new Error('Input exceeds 10,000 UTF-16 code units');
  if (operations.length < 1 || operations.length > 8) throw new Error('Pipeline must contain 1 to 8 operations');
  let value = text;
  const intermediateLengths: number[] = [];
  for (const operation of operations) {
    if (!PIPELINE_OPERATIONS.includes(operation)) throw new Error('Unsupported pipeline operation');
    const tool: DeclarativeTool = {
      name: 'custom_pipeline', title: 'Internal pipeline step',
      description: 'Audited local transformation', operation
    };
    value = runDeclarativeOperation(tool, value);
    if (value.length > 10_000) throw new Error('Intermediate output exceeds 10,000 UTF-16 code units');
    intermediateLengths.push(value.length);
  }
  return {
    value,
    operations: [...operations],
    inputLength: text.length,
    outputLength: value.length,
    intermediateLengths
  };
}
