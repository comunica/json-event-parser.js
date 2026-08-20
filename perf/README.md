# Benchmarks

```bash
$ yarn run perf          # measure this parser, and write perf/output.json
$ yarn run perf-compare  # also measure @bergos/jsonparse for comparison
```

Results and the comparison against `@bergos/jsonparse` are in the
[main README](../README.md#performance).

## Layout

| File | Purpose |
| ---- | ------- |
| `workloads.ts` | The input documents. See [`fixtures/README.md`](fixtures/README.md) for their provenance. |
| `implementations.ts` | The parsers being measured, and the heap sampler. |
| `measure.ts` | Measures one implementation against one workload; prints JSON. |
| `benchmark.ts` | Spawns `measure.js` per pair, prints the table, writes `output.json`. |

## Methodology

**Every measurement runs in its own process.** All implementations exercise the same
`JsonEventParser` class, and `SinkParser` overrides `push` to count events. Running them together
makes the `this.push(...)` call site inside `_transform` polymorphic, which deoptimises whichever
implementation happens to run second — enough, when this suite was first written, to report the
tokenizer as *slower* than the full stream pipeline. Isolation also means each heap measurement
starts from a clean slate.

**Documents are fed in 64 KiB chunks**, mimicking a network-sourced stream, and every
implementation sees identical chunk boundaries.

**Timings are the fastest of 7 samples**, after 3 discarded warmup samples, with each sample
repeating the parse enough times to clear 500 ms. Three details here are load-bearing, and were
each arrived at by measuring the harness against itself:

- **The minimum, not the mean or median.** Benchmark noise is one-sided — scheduling, GC and JIT
  tiering can only ever make a sample slower — so the fastest sample is the closest estimate of
  the real cost. Reporting the median left the sub-millisecond workloads swinging by more than 3x
  between runs, which alone would trip the CI regression alert.
- **Calibration runs warm.** The iteration count per sample is derived from a parse that has
  already run `CALIBRATION_WARMUP` times. Sizing it from a cold parse made samples several times
  shorter than intended and left the measurement straddling V8's optimisation tiers, showing up as
  a bimodal distribution — `toRdf-manifest` alternated between 1.43 ms and 2.06 ms depending on
  which tier it settled in.
- **A 500 ms sample floor**, so timer resolution does not dominate on the small documents.

Together these bring every workload's run-to-run spread within 1.07x–1.41x, comfortably inside the
alert threshold. Without them the same measurements spanned 3.3x.

**Heap is sampled per event**, not on a timer: an interval timer never fires inside a synchronous
parser. `process.memoryUsage()` is too expensive to call per event, so only every 4096th sample
actually reads it. Memory numbers are reported only for documents of at least 1 MiB — below that
the measurement is allocator noise and would only produce false alerts. Run with `--expose-gc`
(as the npm scripts do) for stable numbers.

**Event counts are not comparable across implementations.** This parser emits a separate open and
close event per container, while `jsonparse` emits a single value per completed container.
Throughput per byte is the comparable metric; the event count is reported only to confirm the work
was not optimised away.

## Tracking over time

`benchmark.ts` writes `perf/output.json` in the `customSmallerIsBetter` format consumed by
[github-action-benchmark](https://github.com/benchmark-action/github-action-benchmark). Only the
`json-event-parser` rows are tracked: `@bergos/jsonparse` is a fixed baseline whose numbers would
add nothing but noise to the regression alerts.

The `benchmark` job in [`ci.yml`](../.github/workflows/ci.yml) runs this on every push and pull
request. History is written to the `gh-pages` branch from `master` only, so the branch must exist
for publishing to work; pull requests are measured and compared against that history, and comment
when a regression exceeds the alert threshold rather than failing the build.
