import { parseJson } from './utils';

describe('JsonEventParser', () => {
  it('can handle large tokens without running out of memory', async() => {
    const chunkSize = 1_024;
    const chunks = 1_024 * 200; // 200mb

    await expect(parseJson({ * [Symbol.iterator]() {
      const quote = Buffer.from('"');
      yield quote;
      for (let i = 0; i < chunks; ++i) {
        const buf = Buffer.alloc(chunkSize);
        buf.fill('a');
        yield buf;
      }
      yield quote;
    } })).resolves.toHaveLength(chunkSize * chunks);
  });

  it('can handle large tokens of escape sequences without running out of memory', async() => {
    // Escape sequences are appended one character at a time, unlike plain characters which
    // are copied as runs, so this is what exercises the single-character buffer flush.
    const escapesPerChunk = 512;
    const chunks = 256; // 128Ki characters, twice the internal string buffer

    await expect(parseJson({ * [Symbol.iterator]() {
      const quote = Buffer.from('"');
      yield quote;
      for (let i = 0; i < chunks; ++i) {
        yield Buffer.from('\\n'.repeat(escapesPerChunk));
      }
      yield quote;
    } })).resolves.toHaveLength(escapesPerChunk * chunks);
  });

  it('can handle large tokens with surrogates without running out of memory', async() => {
    const chunkSize = 1_024;
    const chunks = 1_024;

    await expect(parseJson({ * [Symbol.iterator]() {
      const quote = Buffer.from('"');
      yield quote;
      yield Buffer.from('a');
      for (let i = 0; i < chunks; ++i) {
        const buf = Buffer.alloc(chunkSize);
        buf.fill('🥳');
        yield buf;
      }
      yield quote;
    } })).resolves.toHaveLength(chunkSize * chunks / 2 + 1);
  });
});
