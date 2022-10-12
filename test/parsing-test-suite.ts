import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { parseJson } from './utils';

const IGNORED_FILE = new Set([
  'n_array_just_minus.json',
  'n_number_-01.json',
  'n_number_-1.0..json',
  'n_number_-2..json',
  'n_number_0.1.2.json',
  'n_number_0.3e+.json',
  'n_number_0.3e.json',
  'n_number_0.e1.json',
  'n_number_0_capital_E+.json',
  'n_number_0_capital_E.json',
  'n_number_0e+.json',
  'n_number_0e.json',
  'n_number_1.0e+.json',
  'n_number_1.0e-.json',
  'n_number_1.0e.json',
  'n_number_1eE2.json',
  'n_number_2.e+3.json',
  'n_number_2.e-3.json',
  'n_number_2.e3.json',
  'n_number_9.e+.json',
  'n_number_expression.json',
  'n_number_invalid+-.json',
  'n_number_neg_int_starting_with_zero.json',
  'n_number_neg_real_without_int_part.json',
  'n_number_real_without_fractional_part.json',
  'n_number_with_leading_zero.json',
]);

describe('JsonEventParser', () => {
  const path = join(__dirname, '../JSONTestSuite/test_parsing');
  for (const file of readdirSync(path)) {
    if (IGNORED_FILE.has(file)) {
      // We ignore it
      continue;
    }

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
