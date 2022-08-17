import { JsonEventParser } from '..';

const expected = [
  '',
  'Hello',
  'This"is',
  '\r\n\f\t\\/"',
  'Λάμβδα',
  '\\',
  '/',
  '"',
  0,
  1,
  -1,
  [ 0, 1, -1 ],
  1,
  1.1,
  -1.1,
  -1,
  [ 1, 1.1, -1.1, -1 ],
  -1,
  [ -1 ],
  -0.1,
  [ -0.1 ],
  6.02e+23,
  [ 6.02e+23 ],
  71_610_932,
  [ 71_610_932 ],
];

describe('JsonEventParser', () => {
  it('primitives', () => {
    const p = new JsonEventParser({
      onValue(value: any) {
        expect(value).toEqual(expected.shift());
      },
    });
    p.write('"""Hello""This\\"is""\\r\\n\\f\\t\\\\\\/\\""');
    p.write('"\\u039b\\u03ac\\u03bc\\u03b2\\u03b4\\u03b1"');
    p.write('"\\\\"');
    p.write('"\\/"');
    p.write('"\\""');
    p.write('[0,1,-1]');
    p.write('[1.0,1.1,-1.1,-1.0][-1][-0.1]');
    p.write('[6.02e23]');
    p.write('[71610932]');
  });
});
