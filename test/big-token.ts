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
});
