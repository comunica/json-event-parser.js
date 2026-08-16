# JSON Event Parser

[![Build status](https://github.com/comunica/json-event-parser.js/workflows/CI/badge.svg)](https://github.com/comunica/json-event-parser.js/actions?query=workflow%3ACI)
[![Coverage Status](https://coveralls.io/repos/github/comunica/json-event-parser.js/badge.svg?branch=master)](https://coveralls.io/github/comunica/json-event-parser.js?branch=master)
[![npm version](https://badge.fury.io/js/json-event-parser.svg)](https://www.npmjs.com/package/json-event-parser)

A streaming SAX-style JSON parser.

This is a fork of [`jsonparse`](https://github.com/creationix/jsonparse).


## Installation

```bash
$ npm install json-event-parser
```
or
```bash
$ yarn add json-event-parser
```

This package also works out-of-the-box in browsers via tools such as [webpack](https://webpack.js.org/) and [browserify](http://browserify.org/).

## Usage

Example:

```typescript
import {JsonEventParser} from 'json-event-parser';
import {Readable} from "stream";

Readable.from(['{"test": "fo', 'o"}'])
    .pipe(new JsonEventParser())
    .on("end", () => console.log('Parsing done!'))
    .on("error", error => console.error(error))
    .on("data", event => console.log(`Event of type ${event.type}`));
```

The event fields are:
* `type`: the event type. Might be `"value"` (a plain value i.e. a string, a number, a boolean or null), `"open-array"` and `"close-array"` to mark that an array is opened and close, or `"open-object"` and `"close-object"` to mark the same thing with objects.
* `value`: used on the `"value"` type to store the value itself.
* `key`: used on the `"value"`, `"open-array"` and `"open-object"` to store the key in the parent object or the position in the parent array.


It is also possible to evaluate queries against a given JSON stream:

```typescript
import {JsonEventParser, JsonStreamPathTransformer} from 'json-event-parser';
import {Readable} from "stream";

Readable.from(['{"test": "fo', 'o"}'])
    .pipe(new JsonEventParser())
    .pipe(new JsonStreamPathTransformer([{id: 'test', query: ['test']}]))
    .on("end", () => console.log('Parsing done!'))
    .on("error", error => console.error(error))
    .on("data", result => console.log(`Matched ${result.value}`));
```
## Performance

```bash
$ yarn run perf          # measure this parser, and write perf/output.json
$ yarn run perf-compare  # also measure @bergos/jsonparse for comparison
```

The benchmarks run over the same workloads that
[`jsonld-streaming-parser`](https://github.com/rubensworks/jsonld-streaming-parser.js#performance)
measures itself against, so the numbers are comparable between the two projects. See
[`perf/fixtures/README.md`](perf/fixtures/README.md) for their provenance. Every measurement runs
in its own process, because all implementations share the same class and would otherwise
deoptimise each other.

The reference implementation is [`@bergos/jsonparse`](https://www.npmjs.com/package/@bergos/jsonparse),
the SAX parser that `jsonld-streaming-parser` currently builds on. `tokenizer only` bypasses Node's
object-mode stream plumbing and counts events directly; it is not part of the public API, and is
measured to show how much of the wall time is spent on stream overhead rather than on parsing.

Median time per parse, measured on Node 22. Absolute numbers vary per machine; the ratios are the
point:

| Workload | **json-event-parser** | *tokenizer only* | **@bergos/jsonparse** |
| -------- | --------------------- | ---------------- | --------------------- |
| `person` (0.4 KiB) | 0.199 ms | 0.114 ms | 0.090 ms |
| `sparql-init` (3.3 KiB) | 0.311 ms | 0.084 ms | 0.178 ms |
| `toRdf-manifest` (153.7 KiB) | 8.100 ms | 6.729 ms | 5.953 ms |
| `dbpedia-expanded` (9.1 MiB) | 357.6 ms | 156.7 ms | 199.4 ms |

End to end this parser is currently **1.4x to 2.2x slower** than `jsonparse`. That gap is stream
plumbing rather than parsing: the tokenizer alone is *faster* than `jsonparse` on the two workloads
where it is not dominated by per-parse setup.

What it buys is memory. `jsonparse` retains the entire parsed document, so its footprint grows with
the input, while this parser's stays flat:

| Document size | **json-event-parser** | **@bergos/jsonparse** |
| ------------- | --------------------- | --------------------- |
| 9.1 MB | 15.9 MB | 26.8 MB |
| 36.6 MB | 16.1 MB | 97.2 MB |
| 147.0 MB | **16.1 MB** | **376.1 MB** |

A 16x larger document costs this parser no extra memory at all, which is what makes documents
larger than memory parseable. The one limit is that a *single token* must still fit in memory: a
64 MB string value costs roughly 134 MB of heap.

Results are tracked over time in CI with
[github-action-benchmark](https://github.com/benchmark-action/github-action-benchmark). History is
written to the `gh-pages` branch from `master` only; pull requests are measured and compared
against it, and comment when a regression exceeds the alert threshold.

## License

This code is released under the [MIT license](http://opensource.org/licenses/MIT).
