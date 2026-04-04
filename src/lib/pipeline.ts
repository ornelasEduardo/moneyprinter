export interface ProcessedRow {
  data: Record<string, unknown>;
  status: 'valid' | 'duplicate' | 'error' | 'skipped';
  tags: string[];
  errors: { field: string; message: string }[];
  duplicateMatch?: Record<string, unknown>;
}

export interface PipelineContext {
  existingTransactions: Record<string, unknown>[];
}

export type PipelineStep = (
  row: ProcessedRow,
  behaviors: Record<string, unknown>,
  context: PipelineContext,
) => ProcessedRow;

interface Pipeline {
  run(
    rows: ProcessedRow[],
    behaviors: Record<string, unknown>,
    context: PipelineContext,
  ): ProcessedRow[];
}

interface PipelineBuilder {
  use(step: PipelineStep): PipelineBuilder;
  build(): Pipeline;
}

export function createPipeline(): PipelineBuilder {
  const steps: PipelineStep[] = [];

  const builder: PipelineBuilder = {
    use(step: PipelineStep) {
      steps.push(step);
      return builder;
    },
    build(): Pipeline {
      return {
        run(rows, behaviors, context) {
          return rows.map((row) => {
            let current = row;
            for (const step of steps) {
              // Short-circuit: don't run further steps on errored/skipped rows
              if (current.status === 'error' || current.status === 'skipped') break;
              current = step(current, behaviors, context);
            }
            return current;
          });
        },
      };
    },
  };

  return builder;
}
