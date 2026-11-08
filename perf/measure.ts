/* eslint-disable no-console */
import type { IImplementation, Sampler as SamplerType } from './implementations';
import { getImplementation, Sampler } from './implementations';
import { getWorkload } from './workloads';

/**
 * Size of the chunks the documents are fed in, mimicking a network-sourced stream.
 */
const CHUNK_SIZE = 64 * 1_024;
/**
 * Iterations are repeated until a single sample takes at least this long, so that timer
 * resolution does not dominate on the small documents.
 */
const MIN_SAMPLE_MS = 500;
/**
 * Parses run before calibration, so that the iteration count is derived from the steady-state
 * cost rather than from a cold parse.
 */
const CALIBRATION_WARMUP = 20;
/**
 * Samples that are thrown away to let the JIT warm up.
 */
const WARMUP_SAMPLES = 3;
/**
 * Samples that are kept. The median is reported, which is far more stable than the mean on
 * shared CI runners.
 */
const SAMPLES = 7;

/**
 * The result of measuring one implementation against one workload.
 */
export interface IMeasurement {
  bytes: number;
  msPerIteration: number;
  megabytesPerSecond: number;
  peakHeapBytes: number;
  events: number;
}

function chunk(data: Buffer): Buffer[] {
  const chunks: Buffer[] = [];
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    chunks.push(data.subarray(i, i + CHUNK_SIZE));
  }
  return chunks;
}

function collectGarbage(): void {
  // Exposed by running node with --expose-gc; without it the memory numbers are noisier, but
  // the timings are unaffected, so this is a soft requirement.
  (<any>global).gc?.();
}

async function measure(implementation: IImplementation, data: Buffer): Promise<IMeasurement> {
  const chunks = chunk(data);

  // Calibrate: repeat the parse enough times that a single sample clears MIN_SAMPLE_MS.
  // Calibrate on a warm parse, not a cold one. A cold parse can be several times slower than
  // the steady state, which would size every sample far too short and leave the measurement
  // straddling V8's optimisation tiers.
  let events = 0;
  for (let warm = 0; warm < CALIBRATION_WARMUP; warm++) {
    events = await implementation.parse(chunks, new Sampler(0));
  }
  const calibrationStart = process.hrtime.bigint();
  events = await implementation.parse(chunks, new Sampler(0));
  const calibrationMs = Number(process.hrtime.bigint() - calibrationStart) / 1e6;
  const iterations = Math.min(5_000, Math.max(1, Math.ceil(MIN_SAMPLE_MS / Math.max(calibrationMs, 0.01))));

  const durations: number[] = [];
  let peakHeapBytes = 0;
  for (let sample = 0; sample < WARMUP_SAMPLES + SAMPLES; sample++) {
    collectGarbage();
    const sampler: SamplerType = new Sampler(process.memoryUsage().heapUsed);
    const start = process.hrtime.bigint();
    for (let iteration = 0; iteration < iterations; iteration++) {
      await implementation.parse(chunks, sampler);
    }
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
    sampler.read();
    if (sample >= WARMUP_SAMPLES) {
      durations.push(elapsedMs / iterations);
      peakHeapBytes = Math.max(peakHeapBytes, sampler.peak);
    }
  }

  durations.sort((left, right) => left - right);
  // The minimum, not the median. Benchmark noise is one-sided: scheduling, GC and JIT tiering
  // can only ever make a sample slower, so the fastest sample is the closest estimate of the
  // real cost. On sub-millisecond workloads the median still swings by more than 3x between
  // runs, which is enough to trip the CI regression alert on noise alone.
  const msPerIteration = durations[0];
  return {
    bytes: data.length,
    msPerIteration,
    megabytesPerSecond: data.length / 1_024 / 1_024 / (msPerIteration / 1_000),
    peakHeapBytes,
    events,
  };
}

/**
 * Measure a single implementation against a single workload and print the result as JSON.
 *
 * This runs as its own process, spawned by `benchmark.ts`, so that implementations cannot
 * deoptimise each other and so that heap measurements start from a clean slate.
 */
async function run(): Promise<void> {
  const [ implementationName, workloadName ] = process.argv.slice(2);
  if (!implementationName || !workloadName) {
    throw new Error('Usage: node perf/measure.js <implementation> <workload>');
  }
  const measurement = await measure(getImplementation(implementationName), getWorkload(workloadName).load());
  console.log(JSON.stringify(measurement));
}

run().catch((error: Error) => {
  console.error(error);
  process.exitCode = 1;
});
/* eslint-enable no-console */
