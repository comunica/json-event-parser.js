import { parseJson } from './utils';

describe('JsonEventParser', () => {
  it('2 byte utf8 \'De\' character: д', async() => {
    await expect(parseJson([ '"', Buffer.from([ 0xD0, 0xB4 ]), '"' ]))
      .resolves.toEqual('д');
  });

  it('3 byte utf8 \'Han\' character: 我', async() => {
    await expect(parseJson([ '"', Buffer.from([ 0xE6, 0x88, 0x91 ]), '"' ]))
      .resolves.toEqual('我');
  });

  it('4 byte utf8 character (unicode scalar U+2070E): 𠜎', async() => {
    await expect(parseJson([ '"', Buffer.from([ 0xF0, 0xA0, 0x9C, 0x8E ]), '"' ]))
      .resolves.toEqual('𠜎');
  });

  it('3 byte utf8 \'Han\' character chunked inbetween 2nd and 3rd byte: 我', async() => {
    await expect(parseJson([ '"', Buffer.from([ 0xE6, 0x88 ]), Buffer.from([ 0x91 ]), '"' ]))
      .resolves.toEqual('我');
  });

  test('4 byte utf8 character (unicode scalar U+2070E) chunked inbetween 2nd and 3rd byte: 𠜎', async() => {
    await expect(parseJson([ '"', Buffer.from([ 0xF0, 0xA0 ]), Buffer.from([ 0x9C, 0x8E ]), '"' ]))
      .resolves.toEqual('𠜎');
  });

  it('1-4 byte utf8 character string chunked inbetween random bytes: Aж文𠜱B', async() => {
    const eclectic_buffer = Buffer.from([ 0x41, // A
      0xD0, 0xB6, // Ж
      0xE6, 0x96, 0x87, // 文
      0xF0, 0xA0, 0x9C, 0xB1, // 𠜱
      0x42 ]); // B
    for (let i = 0; i < eclectic_buffer.length; i++) {
      await expect(parseJson([ '"', eclectic_buffer.slice(0, i), eclectic_buffer.slice(i), '"' ]))
        .resolves.toEqual('Aж文𠜱B');
    }
  });
});
