import { parseJson } from './utils';

describe('JsonEventParser', () => {
  it('3 bytes of utf8', async() => {
    await expect(parseJson('"├──"'))
      .resolves.toEqual('├──');
  });

  it('utf8 snowman', async() => {
    await expect(parseJson('"☃"'))
      .resolves.toEqual('☃');
  });

  it('utf8 with regular ascii', async() => {
    await expect(parseJson('["snow: ☃!","xyz","¡que!"]'))
      .resolves.toEqual([ 'snow: ☃!', 'xyz', '¡que!' ]);
  });
});
