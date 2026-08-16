/* eslint-disable no-console */
import { execFileSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { IMPLEMENTATIONS } from './implementations';
import type { IMeasurement } from './measure';
import type { IWorkload } from './workloads';
import { WORKLOADS } from './workloads';

/**
 * Documents below this size have their memory numbers omitted: at that scale the measurement is
 * dominated by allocator noise and would only produce false alerts.
 */
const MIN_MEMORY_WORKLOAD_SIZE = 1_024 * 1_024;

/**
 * One entry of the `customSmallerIsBetter` format consumed by
 * {@link https://github.com/benchmark-action/github-action-benchmark | github-action-benchmark}.
 */
interface IBenchmarkResult {
  name: string;
  unit: string;
  value: number;
}

/**
 * Run one measurement in a dedicated process.
 *
 * Isolation matters here: all implementations exercise the same {@link JsonEventParser} class,
 * and running them in one process makes shared call sites polymorphic, which penalises whichever
 * implementation runs second. It also means every heap measurement starts from a clean slate.
 */
function measureInSubprocess(implementation: string, workload: string): IMeasurement {
  const output = execFileSync(
    process.execPath,
    [ '--expose-gc', join(__dirname, 'measure.js'), implementation, workload ],
    { encoding: 'utf8', maxBuffer: 1_024 * 1_024 },
  );
  return <IMeasurement>JSON.parse(output);
}

function formatHeap(measurement: IMeasurement, workload: IWorkload, bytes: number): string {
  return bytes >= MIN_MEMORY_WORKLOAD_SIZE ? `${(measurement.peakHeapBytes / 1_024 / 1_024).toFixed(1)} MB` : '-';
}

function run(): void {
  const compare = process.argv.includes('--compare');
  const implementations = IMPLEMENTATIONS.filter(implementation => compare || implementation.tracked);
  const results: IBenchmarkResult[] = [];

  for (const workload of WORKLOADS) {
    let bytes = 0;
    const measurements: { name: string; tracked: boolean; measurement: IMeasurement }[] = [];
    for (const implementation of implementations) {
      const measurement = measureInSubprocess(implementation.name, workload.name);
      bytes = measurement.bytes;
      measurements.push({ name: implementation.name, tracked: implementation.tracked, measurement });
    }

    console.log(`\n## ${workload.name} — ${(bytes / 1_024).toFixed(1)} KiB`);
    console.log(`   ${workload.description}\n`);
    console.log(`   ${'implementation'.padEnd(36)}${'ms'.padStart(10)}${'MB/s'.padStart(10)}${'peak heap'.padStart(12)}${'events'.padStart(10)}`);
    for (const { name, tracked, measurement } of measurements) {
      console.log(`   ${name.padEnd(36)}${measurement.msPerIteration.toFixed(3).padStart(10)}${measurement.megabytesPerSecond.toFixed(1).padStart(10)}${formatHeap(measurement, workload, bytes).padStart(12)}${String(measurement.events).padStart(10)}`);

      if (tracked) {
        results.push({
          name: `${name} · ${workload.name} · time`,
          unit: 'ms',
          value: Number(measurement.msPerIteration.toFixed(4)),
        });
        if (bytes >= MIN_MEMORY_WORKLOAD_SIZE) {
          results.push({
            name: `${name} · ${workload.name} · peak heap`,
            unit: 'MB',
            value: Number((measurement.peakHeapBytes / 1_024 / 1_024).toFixed(2)),
          });
        }
      }
    }
  }

  const output = join(__dirname, 'output.json');
  writeFileSync(output, `${JSON.stringify(results, null, 2)}\n`);
  console.log(`\nWrote ${results.length} tracked metrics to ${output}`);
}

run();
/* eslint-enable no-console */
