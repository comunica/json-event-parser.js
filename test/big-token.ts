import { JsonEventParser } from '..';

describe('JsonEventParser', () => {
  it('can handle large tokens without running out of memory', () => {
    const parser = new JsonEventParser({});
    const chunkSize = 1_024;
    const chunks = 1_024 * 200; // 200mb
    const quote = Buffer.from('"');

    // @ts-expect-error
    parser.onToken = function(type: any, value: any) {
      expect(value.length).toEqual(chunkSize * chunks);
    };

    parser.write(quote);
    for (let i = 0; i < chunks; ++i) {
      const buf = Buffer.alloc(chunkSize);
      buf.fill('a');
      parser.write(buf);
    }
    parser.write(quote);
  });
});
