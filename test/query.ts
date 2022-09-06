import { Readable } from 'readable-stream';
import { JsonEventParser } from '../lib/JsonEventParser';
import type { JsonValue } from '../lib/JsonStreamPathTransformer';
import { JsonStreamPathTransformer } from '../lib/JsonStreamPathTransformer';

function testQuery(name: string, json: string, query: (string | null)[], results: JsonValue[]) {
  it(name, async() => {
    // @ts-expect-error Readable.from exists
    await expect(Readable.from(json)
      .pipe(new JsonEventParser())
      .pipe(new JsonStreamPathTransformer([{
        id: 'test',
        query,
        returnContent: true,
      }]))
      .toArray()).resolves.toEqual(results.map(value => { return {
      query: 'test',
      value,
    }; }));
  });

  it(`${name} without values`, async() => {
    // @ts-expect-error Readable.from exists
    await expect(Readable.from(json)
      .pipe(new JsonEventParser())
      .pipe(new JsonStreamPathTransformer([{
        id: 'test',
        query,
        returnContent: false,
      }]))
      .toArray()).resolves.toEqual(results.map(value => { return {
      query: 'test',
    }; }));
  });
}

describe('JsonStreamPathTransformer', () => {
  testQuery(
    'empty query',
    '{"foo": "bar"}',
    [],
    [{ foo: 'bar' }],
  );

  testQuery(
    'query value',
    '{"foo": "bar"}',
    [ 'foo' ],
    [ 'bar' ],
  );

  testQuery(
    'query object',
    '{"foo": {"bar": {"baz": "a"}}}',
    [ 'foo' ],
    [{ bar: { baz: 'a' }}],
  );

  testQuery(
    'query array',
    '{"foo": ["bar", ["baz"]]}',
    [ 'foo' ],
    [[ 'bar', [ 'baz' ]]],
  );

  testQuery(
    'query array values',
    '{"foo": ["bar", ["baz"]]}',
    [ 'foo', null ],
    [ 'bar', [ 'baz' ]],
  );
});
