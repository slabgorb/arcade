// scripts/audio/wav.mjs
// 16-bit mono PCM. Replaces three copy-pasted writeWav implementations
// (tempest/tools/pokey-bake, star-wars/tools/pokey-bake, star-wars/tools/speech-bake).
import { writeFileSync } from 'node:fs';

// Raw 16-bit LE samples, no header — this is what byte-exact comparison uses.
export function pcmBytes(samples) {
  const buf = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  return buf;
}

export function writeWav(path, samples, sampleRate) {
  const pcm = pcmBytes(samples);
  const buf = Buffer.alloc(44 + pcm.length);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + pcm.length, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);              // PCM
  buf.writeUInt16LE(1, 22);              // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32);              // block align
  buf.writeUInt16LE(16, 34);             // bits
  buf.write('data', 36);
  buf.writeUInt32LE(pcm.length, 40);
  pcm.copy(buf, 44);
  writeFileSync(path, buf);
}
