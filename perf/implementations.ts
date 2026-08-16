import { Readable } from 'readable-stream';
import { JsonEventParser } from '../lib/JsonEventParser';

/**
 * Samples the heap while a document is being parsed.
 *
 * {@link process.memoryUsage} is far too expensive to call per event, and an interval timer
 * would never fire inside a synchronous parser, so implementations call {@link Sampler.tick}
 * per event and only every {@link Sampler.INTERVAL}-th call actually reads the heap.
 */
export class Sampler {
  private static readonly INTERVAL = 4_096;

  public peak = 0;
  private counter = 0;
  private readonly baseline: number;

  public constructor(baseline: number) {
    this.baseline = baseline;
  }

  public tick(): void {
    if (++this.counter % Sampler.INTERVAL === 0) {
      this.read();
    }
  }

  public read(): void {
    const used = process.memoryUsage().heapUsed - this.baseline;
    if (used > this.peak) {
      this.peak = used;
    }
  }
}

/**
 * A parser to measure.
 */
export interface IImplementation {
  name: string;
  /**
   * Whether this implementation's numbers are written to the tracked output file.
   * Reference implementations are only shown in the console comparison.
   */
  tracked: boolean;
  /**
   * Parse the given chunks and return the number of emitted events, so that the work cannot be
   * optimised away.
   *
   * Note that event counts are not comparable across implementations: this parser emits a
   * separate open and close event per container, while `jsonparse` emits a single value per
   * completed container. Throughput per byte is the comparable metric.
   */
  parse: (chunks: Buffer[], sampler: Sampler) => Promise<number>;
}

/**
 * Replays pre-chunked data, so that every implementation sees exactly the same chunk boundaries.
 */
class ChunkStream extends Readable {
  private index = 0;
  private readonly chunks: Buffer[];

  public constructor(chunks: Buffer[]) {
    super();
    this.chunks = chunks;
  }

  public _read(): void {
    this.push(this.index < this.chunks.length ? this.chunks[this.index++] : null);
  }
}

/**
 * Counts events without ever filling the readable buffer, which isolates the cost of tokenizing
 * from the cost of Node's object-mode stream plumbing.
 *
 * This is not the public API. It exists to show how much of the wall time is spent on stream
 * overhead rather than on parsing, which is what a callback-based entrypoint would recover.
 */
class SinkParser extends JsonEventParser {
  public events = 0;
  private sampler: Sampler | undefined = undefined;

  public useSampler(sampler: Sampler): void {
    this.sampler = sampler;
  }

  public push(_event: any, _encoding?: any): boolean {
    this.events++;
    this.sampler?.tick();
    return true;
  }
}

/**
 * Implementations that are benchmarked and tracked over time.
 *
 * Each of these is measured in its own process. Subclassing {@link JsonEventParser} to override
 * `push` would otherwise make the `this.push(...)` call site inside `_transform` polymorphic,
 * deoptimising whichever implementation happens to run second.
 */
export const IMPLEMENTATIONS: IImplementation[] = [
  {
    name: 'json-event-parser',
    tracked: true,
    async parse(chunks, sampler) {
      const parser = new JsonEventParser();
      new ChunkStream(chunks).pipe(parser);
      let events = 0;
      for await (const _event of parser) {
        events++;
        sampler.tick();
      }
      return events;
    },
  },
  {
    name: 'json-event-parser (tokenizer only)',
    tracked: true,
    async parse(chunks, sampler) {
      const parser = new SinkParser();
      parser.useSampler(sampler);
      for (const chunk of chunks) {
        await new Promise<void>((resolve, reject) => {
          parser._transform(chunk, 'buffer', error => error ? reject(error) : resolve());
        });
      }
      await new Promise<void>((resolve, reject) => {
        parser._flush(error => error ? reject(error) : resolve());
      });
      return parser.events;
    },
  },
  {
    // The parser that jsonld-streaming-parser currently builds on. Required as a dev dependency
    // only, and never written to the tracked output: a fixed baseline would just add noise to
    // the regression alerts.
    name: '@bergos/jsonparse',
    tracked: false,
    async parse(chunks, sampler) {
      const Parser = require('@bergos/jsonparse');
      const parser = new Parser();
      let events = 0;
      parser.onValue = (): void => {
        events++;
        sampler.tick();
      };
      parser.onError = (error: Error): void => {
        throw error;
      };
      for (const chunk of chunks) {
        parser.write(chunk);
      }
      return events;
    },
  },
];

/**
 * Look up an implementation by name, failing loudly on a typo.
 */
export function getImplementation(name: string): IImplementation {
  const implementation = IMPLEMENTATIONS.find(candidate => candidate.name === name);
  if (!implementation) {
    throw new Error(`No such implementation '${name}', expected one of ${IMPLEMENTATIONS.map(({ name: id }) => id).join(', ')}`);
  }
  return implementation;
}
