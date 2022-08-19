import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { parseJson } from './utils';

const IGNORED_FILE = new Set([
  'string_1_escaped_invalid_codepoint.json',
  'string_2_escaped_invalid_codepoints.json',
  'string_3_escaped_invalid_codepoints.json',
]);

describe('JsonEventParser', () => {
  const path = join(__dirname, '../JSONTestSuite/test_transform');
  for (const file of readdirSync(path)) {
    if (IGNORED_FILE.has(file)) {
      continue;
    }

    it(`should parse ${file} like JSON.parse`, async() => {
      const data = readFileSync(join(path, file));
      await expect(parseJson(data)).resolves.toEqual(JSON.parse(data.toString()));
    });
  }
});
