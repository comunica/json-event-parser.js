import { JsonEventParser } from '..';

describe('JsonEventParser', () => {
  it('3 bytes of utf8', () => {
    expect(JsonEventParser.parse(Buffer.from('"├──"'))).toEqual('├──');
  });

  it('utf8 snowman', () => {
    expect(JsonEventParser.parse(Buffer.from('"☃"'))).toEqual('☃');
  });

  it('utf8 with regular ascii', () => {
    expect(JsonEventParser.parse(Buffer.from('["snow: ☃!","xyz","¡que!"]'))).toEqual([ 'snow: ☃!', 'xyz', '¡que!' ]);
  });
});
