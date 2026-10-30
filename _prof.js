const { generateExpandedJsonLd } = require('/home/user/json-event-parser.js/perf/workloads');
const { getImplementation, Sampler } = require('/home/user/json-event-parser.js/perf/implementations');
const impl = getImplementation('json-event-parser (tokenizer only)');
const data = generateExpandedJsonLd(10000);
const chunks = [];
for (let i = 0; i < data.length; i += 65536) chunks.push(data.subarray(i, i + 65536));
(async () => {
  const s = new Sampler(0);
  for (let n = 0; n < 12; n++) await impl.parse(chunks, s);
})();
