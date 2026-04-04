import { describe, it, expect } from 'vitest';
import { createPipeline, type ProcessedRow, type PipelineStep, type PipelineContext } from './pipeline';

const makeRow = (data: Record<string, unknown>): ProcessedRow => ({
  data,
  status: 'valid',
  tags: [],
  errors: [],
});

describe('createPipeline', () => {
  it('should run steps in order', () => {
    const log: string[] = [];

    const stepA: PipelineStep = (row) => {
      log.push('a');
      return { ...row, tags: [...row.tags, 'step-a'] };
    };

    const stepB: PipelineStep = (row) => {
      log.push('b');
      return { ...row, tags: [...row.tags, 'step-b'] };
    };

    const pipeline = createPipeline().use(stepA).use(stepB).build();
    const results = pipeline.run([makeRow({ name: 'test' })], {}, { existingTransactions: [] });

    expect(log).toEqual(['a', 'b']);
    expect(results[0].tags).toEqual(['step-a', 'step-b']);
  });

  it('should process multiple rows', () => {
    const upper: PipelineStep = (row) => ({
      ...row,
      data: { ...row.data, name: (row.data.name as string).toUpperCase() },
    });

    const pipeline = createPipeline().use(upper).build();
    const results = pipeline.run(
      [makeRow({ name: 'foo' }), makeRow({ name: 'bar' })],
      {},
      { existingTransactions: [] },
    );

    expect(results[0].data.name).toBe('FOO');
    expect(results[1].data.name).toBe('BAR');
  });

  it('should pass behaviors and context to steps', () => {
    let capturedBehaviors: Record<string, unknown> = {};
    let capturedContext: PipelineContext | null = null;

    const spy: PipelineStep = (row, behaviors, context) => {
      capturedBehaviors = behaviors;
      capturedContext = context;
      return row;
    };

    const pipeline = createPipeline().use(spy).build();
    const behaviors = { date_format: 'MM/DD/YYYY' };
    const context = { existingTransactions: [{ id: 1 }] as any[] };

    pipeline.run([makeRow({})], behaviors, context);

    expect(capturedBehaviors).toEqual(behaviors);
    expect(capturedContext!.existingTransactions).toHaveLength(1);
  });

  it('should short-circuit: skip steps for rows already in error status', () => {
    const errorRow: ProcessedRow = {
      data: { name: 'bad' },
      status: 'error',
      tags: [],
      errors: [{ field: 'amount', message: 'missing' }],
    };

    let called = false;
    const step: PipelineStep = (row) => {
      called = true;
      return row;
    };

    const pipeline = createPipeline().use(step).build();
    const results = pipeline.run([errorRow], {}, { existingTransactions: [] });

    expect(called).toBe(false);
    expect(results[0].status).toBe('error');
  });

  it('should work with empty pipeline', () => {
    const pipeline = createPipeline().build();
    const results = pipeline.run([makeRow({ a: 1 })], {}, { existingTransactions: [] });
    expect(results[0].data.a).toBe(1);
  });
});
