import { parseJson } from './utils';

describe('JsonEventParser', () => {
  it('too many closing', async() => {
    await expect(parseJson('{}}')).rejects.toBeInstanceOf(Error);
  });

  describe('invalid constants', () => {
    for (const c of [
      'txxx', 'trxx', 'trux', // True
      'fxxxx', 'faxxx', 'falxx', 'falsx', // False
      'nxxx', 'nuxx', 'nulx', // True
    ]) {
      it(`Parsing of invalid constant "${c}"`, async() => {
        await expect(parseJson(`{"test": ${c}}`)).rejects.toBeInstanceOf(Error);
      });
    }
  });
});
