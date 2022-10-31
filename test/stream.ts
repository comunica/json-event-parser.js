import { JsonEventParser } from '../lib/JsonEventParser';

describe('JsonEventParser', () => {
  describe('should push event as soon as possible', () => {
    const parser = new JsonEventParser();

    it('should ignore space', () => {
      parser.write(' ');
      expect(parser.read(1)).toBeNull();
    });

    it('should push open object', () => {
      parser.write('{');
      expect(parser.read(1)).toEqual({ type: 'open-object' });
    });

    it('should push simple key-value', () => {
      parser.write('"a": "b"');
      expect(parser.read(1)).toEqual({ type: 'value', value: 'b', key: 'a' });
    });

    it('should push open array', () => {
      parser.write(',"k": ["');
      expect(parser.read(1)).toEqual({ type: 'open-array', key: 'k' });
    });

    it('should push value', () => {
      parser.write('foo"');
      expect(parser.read(1)).toEqual({ type: 'value', value: 'foo', key: 0 });
    });

    it('should push other value', () => {
      parser.write(',1.0E1 ');
      expect(parser.read(1)).toEqual({ type: 'value', value: 1e1, key: 1 });
    });

    it('should close array', () => {
      parser.write(']');
      expect(parser.read(1)).toEqual({ type: 'close-array' });
    });

    it('should close object', () => {
      parser.write('}');
      expect(parser.read(1)).toEqual({ type: 'close-object' });
    });

    it('should properly close the stream', () => {
      parser.end();
      expect(parser.writable).toBeFalsy();
    });
  });
});
