// Reconstructs a 64K memory image from either a DEC absolute-loader (.LDA) file
// or a raw EPROM chip dump.
//
// .LDA framing (verified against SNDAUX.LDA / TEMPST.LDA / ALEXEC.LDA):
//   01 00 | count(u16 LE) | addr(u16 LE) | data[count-6] | checksum(u8)
// `count` INCLUDES the 6-byte header but EXCLUDES the checksum, so a block
// consumes count+1 bytes. Blocks are NOT disjoint: 1-2 byte linker fixups land
// inside earlier blocks, so blocks MUST be applied in file order with later
// writes overwriting earlier ones.

export const IMAGE_SIZE = 0x10000;

export function parseLda(buf) {
  const image = new Uint8Array(IMAGE_SIZE);
  const blocks = [];
  let pos = 0;
  while (pos + 6 <= buf.length) {
    if (buf[pos] !== 0x01 || buf[pos + 1] !== 0x00) {
      throw new Error(`bad .LDA block marker at 0x${pos.toString(16)}`);
    }
    const count = buf[pos + 2] | (buf[pos + 3] << 8);
    if (count < 6) throw new Error(`bad .LDA count ${count} at 0x${pos.toString(16)}`);
    const addr = buf[pos + 4] | (buf[pos + 5] << 8);
    const dataLen = count - 6;
    const end = pos + count;          // checksum byte lives AT `end`
    if (end >= buf.length) throw new Error(`truncated .LDA block at 0x${pos.toString(16)}`);

    let sum = 0;
    for (let i = pos; i <= end; i++) sum = (sum + buf[i]) & 0xff;
    if (sum !== 0) {
      throw new Error(`.LDA checksum failure at 0x${pos.toString(16)} (sum=0x${sum.toString(16)})`);
    }

    if (dataLen === 0) break;         // zero-data block = end of image
    for (let i = 0; i < dataLen; i++) image[(addr + i) & 0xffff] = buf[pos + 6 + i];
    blocks.push({ addr, len: dataLen });
    pos = end + 1;                    // +1 for the checksum byte
  }
  return { image, blocks };
}

export function loadRawRom(buf, base) {
  const image = new Uint8Array(IMAGE_SIZE);
  for (let i = 0; i < buf.length; i++) image[(base + i) & 0xffff] = buf[i];
  return { image, base };
}

export function readImage(image, addr, len) {
  return image.slice(addr, addr + len);
}
