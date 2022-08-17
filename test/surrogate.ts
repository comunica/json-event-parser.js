import { JsonEventParser } from '..';

describe('JsonEventParser', () => {
  it('parse surrogate pair', () => {
    const p = new JsonEventParser({
      onValue(value: any) {
        expect(value).toBe('😋');
      },
    });
    p.write('"\\uD83D\\uDE0B"');
  });

  it('parse chunked surrogate pair', () => {
    const p = new JsonEventParser({
      onValue(value: any) {
        expect(value).toBe('😋');
      },
    });
    p.write('"\\uD83D');
    p.write('\\uDE0B"');
  });
});
