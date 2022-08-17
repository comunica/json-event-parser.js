import { JsonEventParser } from '..';

describe('JsonEventParser', () => {
  it('3 bytes of utf8', () => {
    const p = new JsonEventParser({
      onValue(value: any) {
        expect(value).toBe('├──');
      },
    });
    p.write('"├──"');
  });

  it('utf8 snowman', () => {
    const p = new JsonEventParser({
      onValue(value: any) {
        expect(value).toBe('☃');
      },
    });
    p.write('"☃"');
  });

  it('utf8 with regular ascii', () => {
    const expected: any = [ 'snow: ☃!', 'xyz', '¡que!' ];
    expected.push([ ...expected ]);
    const p = new JsonEventParser({
      onValue(value: any) {
        expect(value).toEqual(expected.shift());
      },
    });
    p.write('["snow: ☃!","xyz","¡que!"]');
  });
});
