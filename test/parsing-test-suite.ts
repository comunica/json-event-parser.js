import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { JsonEventParser } from '..';

const IGNORED_FILE = new Set([
  'n_array_extra_comma.json',
  'n_array_just_minus.json',
  'n_array_number_and_comma.json',
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
  'n_object_trailing_comma.json',
  'n_single_space.json',
  'n_string_single_doublequote.json',
  'n_structure_angle_bracket_..json',
  'n_structure_double_array.json',
  'n_structure_no_data.json',
  'n_structure_object_with_trailing_garbage.json',
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
      it(`should parse successfully ${file}`, () => {
        let error = null;
        const p = new JsonEventParser({
          onError(err: Error) {
            error = err;
          },
        });
        p.write(data);
        p.end();
        expect(error).toBeNull();
      });
    } else if (file.startsWith('n_')) {
      it(`should fail on ${file}`, () => {
        expect(() => {
          const p = new JsonEventParser({});
          p.write(data);
          p.end();
        }).toThrow(Error);
      });
    }
  }
});
