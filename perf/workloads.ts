import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A single benchmark input document.
 */
export interface IWorkload {
  /**
   * Short identifier, used as the benchmark name in the tracked output.
   */
  name: string;
  /**
   * What this document exercises.
   */
  description: string;
  /**
   * Produce the raw document bytes. Lazy, because each measurement runs in its own process and
   * only ever needs one of the workloads.
   */
  load: () => Buffer;
}

const FIXTURES = join(__dirname, 'fixtures');

/**
 * Deterministic pseudo-random generator, so that the generated workload is byte-for-byte
 * identical on every run and on every machine. Benchmark numbers are only comparable over
 * time if the input never changes.
 */
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    // Numerical Recipes linear congruential generator
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}

/**
 * Generate a stand-in for the `dbpedia-10000-expanded.json` workload that
 * {@link https://github.com/rubensworks/jsonld-streaming-parser.js#performance | jsonld-streaming-parser}
 * benchmarks against. That file is not publicly published, so this produces a document of the
 * same shape: a large array of expanded JSON-LD node objects, where every value is wrapped in
 * an array of `@value` / `@id` objects.
 *
 * @param nodes - The number of node objects to generate.
 */
export function generateExpandedJsonLd(nodes: number): Buffer {
  const random = createRandom(42);
  const parts: string[] = [ '[' ];
  for (let i = 0; i < nodes; i++) {
    if (i > 0) {
      parts.push(',');
    }
    const links: string[] = [];
    for (let count = 1 + Math.floor(random() * 8), link = 0; link < count; link++) {
      links.push(`{"@id":"http://dbpedia.org/resource/Resource_${Math.floor(random() * nodes)}"}`);
    }
    parts.push(`{
      "@id": "http://dbpedia.org/resource/Resource_${i}",
      "@type": [ "http://dbpedia.org/ontology/Person" ],
      "http://www.w3.org/2000/01/rdf-schema#label": [{ "@value": "Resource ${i}", "@language": "en" }],
      "http://dbpedia.org/ontology/abstract": [{ "@value": "${'Lorem ipsum dolor sit amet. '.repeat(1 + Math.floor(random() * 6))}", "@language": "en" }],
      "http://dbpedia.org/ontology/birthDate": [{ "@value": "19${10 + Math.floor(random() * 89)}-0${1 + Math.floor(random() * 9)}-1${Math.floor(random() * 9)}", "@type": "http://www.w3.org/2001/XMLSchema#date" }],
      "http://dbpedia.org/ontology/wikiPageID": [{ "@value": ${Math.floor(random() * 10_000_000)}, "@type": "http://www.w3.org/2001/XMLSchema#integer" }],
      "http://dbpedia.org/ontology/wikiPageWikiLink": [ ${links.join(',')} ]
    }`);
  }
  parts.push(']');
  return Buffer.from(parts.join(''), 'utf8');
}

/**
 * All benchmark workloads, ordered from smallest to largest.
 */
export const WORKLOADS: IWorkload[] = [
  {
    name: 'person',
    description: 'Tiny document with an inline context (JSON-LD playground example)',
    load: () => readFileSync(join(FIXTURES, 'person.jsonld')),
  },
  {
    name: 'sparql-init',
    description: 'Comunica config with many complex, nested and remote contexts',
    load: () => readFileSync(join(FIXTURES, 'sparql-init.json')),
  },
  {
    name: 'toRdf-manifest',
    description: 'Typical JSON-LD document with a single context (JSON-LD toRdf test manifest)',
    load: () => readFileSync(join(FIXTURES, 'toRdf-manifest.jsonld')),
  },
  {
    name: 'dbpedia-expanded',
    description: 'Large expanded JSON-LD document, 10 000 node objects (generated)',
    load: () => generateExpandedJsonLd(10_000),
  },
];

/**
 * Look up a workload by name, failing loudly on a typo.
 */
export function getWorkload(name: string): IWorkload {
  const workload = WORKLOADS.find(candidate => candidate.name === name);
  if (!workload) {
    throw new Error(`No such workload '${name}', expected one of ${WORKLOADS.map(({ name: id }) => id).join(', ')}`);
  }
  return workload;
}
