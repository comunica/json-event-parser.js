import { JsonEventParser } from '..';

describe('JsonEventParser', () => {
  it('unvalid', done => {
    let count = 0;
    const p = new JsonEventParser({
      onError(error) {
        count++;
        expect(count).toBe(1);
        done();
      },
    });
    p.write('{"test": eer[');
  });
});
