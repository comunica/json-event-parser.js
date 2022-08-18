import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { JsonEventParser } from '..';

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

    it(`should parse ${file} like JSON.parse`, () => {
      const data = readFileSync(join(path, file));
      expect(JsonEventParser.parse(data)).toEqual(JSON.parse(data.toString()));
    });
  }
});
