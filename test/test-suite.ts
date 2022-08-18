import { readdirSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { JsonEventParser } from '..';

describe('JsonEventParser', () => {
  const path = join(__dirname, '../JSONTestSuite/test_parsing');
  for (const file of readdirSync(path)) {
    if (file.startsWith('y_')) {
      it(`should parse successfully ${file}`, async() => {
        let error = null;
        const p = new JsonEventParser({
          onError(err: Error) {
            error = err;
          },
        });
        p.write(await readFile(join(path, file)));
        expect(error).toBeNull();
      });
    }
  }
});
