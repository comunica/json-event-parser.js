import { parseJson } from './utils';

describe('JsonEventParser', () => {
  it('parse surrogate pair', async() => {
    await expect(parseJson('"\\uD83D\\uDE0B"'))
      .resolves.toEqual('😋');
  });

  it('parse chunked surrogate pair', async() => {
    await expect(parseJson([ '"\\uD83D', '\\uDE0B"' ]))
      .resolves.toEqual('😋');
  });
});
