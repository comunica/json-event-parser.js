import { JsonEventParser } from '../lib/JsonEventParser';

describe('JsonEventParser', () => {
  it('tokenName and invalid key', () => {
    expect(() => (<any>JsonEventParser).tokenName(999)).toThrow(Error);
  });

  it('popFromStack on empty stack', () => {
    expect(() => (<any> new JsonEventParser()).popFromStack(0)).toThrow(Error);
  });
});
