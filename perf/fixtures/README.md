# Benchmark fixtures

These files are vendored rather than downloaded at benchmark time, so that CI runs are
deterministic and work offline. They mirror the workloads that
[`jsonld-streaming-parser`](https://github.com/rubensworks/jsonld-streaming-parser.js#performance)
measures itself against, so numbers from the two repositories are comparable.

| File | Origin | Shape |
| ---- | ------ | ----- |
| `person.jsonld` | The "Person" example from the [JSON-LD playground](https://json-ld.org/playground/) | Tiny document with an inline context |
| `sparql-init.json` | [Comunica](https://github.com/comunica/comunica) `actor-init-sparql` config set, taken from tag `v1.22.3` | Many complex, nested and remote contexts |
| `toRdf-manifest.jsonld` | The JSON-LD toRdf test manifest, from [`w3c/json-ld-api`](https://github.com/w3c/json-ld-api/blob/main/tests/toRdf-manifest.jsonld) | Typical JSON-LD document with a single context |

`toRdf-manifest.jsonld` is part of the W3C JSON-LD API test suite and is redistributed here
under the [W3C Software and Document License](https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document).

A fourth workload, `dbpedia-expanded`, is **generated** by `perf/workloads.ts` rather than
vendored. The `dbpedia-10000-expanded.json` file used by `jsonld-streaming-parser` is not
publicly published, so the generator produces a deterministic stand-in with the same shape:
a large array of expanded JSON-LD node objects. It is the only workload big enough to make
memory behaviour visible, and being generated it keeps the repository small.
