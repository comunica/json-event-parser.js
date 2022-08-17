import { JsonEventParser } from '..';

describe('JsonEventParser', () => {
  it('2 byte utf8 \'De\' character: д', () => {
    const p = new JsonEventParser({
      onValue(value: any) {
        expect(value).toBe('д');
      },
    });
    const de_buffer = Buffer.from([ 0xD0, 0xB4 ]);
    p.write('"');
    p.write(de_buffer);
    p.write('"');
  });

  it('3 byte utf8 \'Han\' character: 我', () => {
    const p = new JsonEventParser({ onValue(value: any) {
      expect(value).toBe('我');
    } });

    const han_buffer = Buffer.from([ 0xE6, 0x88, 0x91 ]);
    p.write('"');
    p.write(han_buffer);
    p.write('"');
  });

  it('4 byte utf8 character (unicode scalar U+2070E): 𠜎', () => {
    const p = new JsonEventParser({ onValue(value: any) {
      expect(value).toBe('𠜎');
    } });

    const Ux2070E_buffer = Buffer.from([ 0xF0, 0xA0, 0x9C, 0x8E ]);
    p.write('"');
    p.write(Ux2070E_buffer);
    p.write('"');
  });

  it('3 byte utf8 \'Han\' character chunked inbetween 2nd and 3rd byte: 我', () => {
    const p = new JsonEventParser({ onValue(value: any) {
      expect(value).toBe('我');
    } });

    const han_buffer_first = Buffer.from([ 0xE6, 0x88 ]);
    const han_buffer_second = Buffer.from([ 0x91 ]);
    p.write('"');
    p.write(han_buffer_first);
    p.write(han_buffer_second);
    p.write('"');
  });

  test('4 byte utf8 character (unicode scalar U+2070E) chunked inbetween 2nd and 3rd byte: 𠜎', () => {
    const p = new JsonEventParser({ onValue(value: any) {
      expect(value).toBe('𠜎');
    } });

    const Ux2070E_buffer_first = Buffer.from([ 0xF0, 0xA0 ]);
    const Ux2070E_buffer_second = Buffer.from([ 0x9C, 0x8E ]);
    p.write('"');
    p.write(Ux2070E_buffer_first);
    p.write(Ux2070E_buffer_second);
    p.write('"');
  });

  it('1-4 byte utf8 character string chunked inbetween random bytes: Aж文𠜱B', () => {
    const p = new JsonEventParser({ onValue(value: any) {
      expect(value).toBe('Aж文𠜱B');
    } });

    const eclectic_buffer = Buffer.from([ 0x41, // A
      0xD0, 0xB6, // Ж
      0xE6, 0x96, 0x87, // 文
      0xF0, 0xA0, 0x9C, 0xB1, // 𠜱
      0x42 ]); // B

    const rand_chunk = Math.floor(Math.random() * (eclectic_buffer.length));
    const first_buffer = eclectic_buffer.slice(0, rand_chunk);
    const second_buffer = eclectic_buffer.slice(rand_chunk);

    // Console.log('eclectic_buffer: ' + eclectic_buffer)
    // console.log('sliced from 0 to ' + rand_chunk);
    // console.log(first_buffer);
    // console.log('then sliced from ' + rand_chunk + ' to the end');
    // console.log(second_buffer);

    p.write('"');
    p.write(first_buffer);
    p.write(second_buffer);
    p.write('"');
  });
});
