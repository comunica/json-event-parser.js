import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { parseJson } from './utils';

describe('JsonEventParser', () => {
  const path = join(__dirname, '../JSONTestSuite/test_parsing');
  for (const file of readdirSync(path)) {
    const data = readFileSync(join(path, file));
    if (file.startsWith('y_')) {
      it(`should parse successfully ${file}`, async() => {
        await expect(parseJson(data)).resolves.toEqual(JSON.parse(data.toString()));
      });
    } else if (file.startsWith('n_')) {
      it(`should fail on ${file}`, async() => {
        await expect(parseJson(data)).rejects.toBeInstanceOf(Error);
      });
    }
  }
});
