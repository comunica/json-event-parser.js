window.BENCHMARK_DATA = {
  "lastUpdate": 1787233272982,
  "repoUrl": "https://github.com/comunica/json-event-parser.js",
  "entries": {
    "json-event-parser": [
      {
        "commit": {
          "author": {
            "email": "ruben.taelman@ugent.be",
            "name": "Ruben Taelman",
            "username": "rubensworks"
          },
          "committer": {
            "email": "rubensworks@users.noreply.github.com",
            "name": "Ruben Taelman",
            "username": "rubensworks"
          },
          "distinct": true,
          "id": "28a0ab2d6b52e563a3fc478b1e7be0bfee88a5bf",
          "message": "Run performance benchmark in CI",
          "timestamp": "2026-08-20T15:31:53+02:00",
          "tree_id": "03b13a357cad532393a37bcce5aace749fc39385",
          "url": "https://github.com/comunica/json-event-parser.js/commit/28a0ab2d6b52e563a3fc478b1e7be0bfee88a5bf"
        },
        "date": 1787233271160,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "json-event-parser · person · time",
            "value": 0.1822,
            "unit": "ms"
          },
          {
            "name": "json-event-parser (tokenizer only) · person · time",
            "value": 0.0514,
            "unit": "ms"
          },
          {
            "name": "json-event-parser · sparql-init · time",
            "value": 0.3172,
            "unit": "ms"
          },
          {
            "name": "json-event-parser (tokenizer only) · sparql-init · time",
            "value": 0.0678,
            "unit": "ms"
          },
          {
            "name": "json-event-parser · toRdf-manifest · time",
            "value": 8.6095,
            "unit": "ms"
          },
          {
            "name": "json-event-parser (tokenizer only) · toRdf-manifest · time",
            "value": 7.299,
            "unit": "ms"
          },
          {
            "name": "json-event-parser · dbpedia-expanded · time",
            "value": 271.4408,
            "unit": "ms"
          },
          {
            "name": "json-event-parser · dbpedia-expanded · peak heap",
            "value": 15.86,
            "unit": "MB"
          },
          {
            "name": "json-event-parser (tokenizer only) · dbpedia-expanded · time",
            "value": 130.6939,
            "unit": "ms"
          },
          {
            "name": "json-event-parser (tokenizer only) · dbpedia-expanded · peak heap",
            "value": 8.14,
            "unit": "MB"
          }
        ]
      }
    ]
  }
}