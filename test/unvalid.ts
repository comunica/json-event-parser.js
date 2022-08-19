import { parseJson } from './utils';

describe('JsonEventParser', () => {
  it('unvalid', async() => {
    await expect(parseJson('{"test": eer[')).rejects.toBeInstanceOf(Error);
  });
});
