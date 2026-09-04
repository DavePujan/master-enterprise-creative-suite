/**
 * Dedicated Voiceover TTS PCM to WAV Containerizer.
 * Encodes raw 24kHz 16-bit mono linear PCM into a standard, deterministic WAV file.
 */

export interface PcmAudioSpecs {
  sampleRate?: number; // Default: 24000 Hz
  numChannels?: number; // Default: 1 (mono)
  bitsPerSample?: number; // Default: 16-bit
}

export interface EncodedWavResult {
  wavBuffer: Buffer;
  wavBase64: string;
  durationSeconds: number;
  byteLength: number;
  mimeType: "audio/wav";
}

export function ttsPcmToWav(
  pcmInput: Buffer | string,
  specs: PcmAudioSpecs = {}
): EncodedWavResult {
  const sampleRate = specs.sampleRate || 24000;
  const numChannels = specs.numChannels || 1;
  const bitsPerSample = specs.bitsPerSample || 16;

  const pcmBuffer =
    typeof pcmInput === "string" ? Buffer.from(pcmInput, "base64") : pcmInput;

  if (!pcmBuffer || pcmBuffer.length === 0) {
    throw new Error("PCM audio buffer is empty or invalid.");
  }

  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmBuffer.length;
  const wavHeader = Buffer.alloc(44);

  // 1. "RIFF" chunk descriptor
  wavHeader.write("RIFF", 0);
  wavHeader.writeUInt32LE(36 + dataSize, 4);
  wavHeader.write("WAVE", 8);

  // 2. "fmt " sub-chunk
  wavHeader.write("fmt ", 12);
  wavHeader.writeUInt32LE(16, 16); // Subchunk1Size for PCM = 16
  wavHeader.writeUInt16LE(1, 20); // AudioFormat = 1 (Linear PCM)
  wavHeader.writeUInt16LE(numChannels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(bitsPerSample, 34);

  // 3. "data" sub-chunk
  wavHeader.write("data", 36);
  wavHeader.writeUInt32LE(dataSize, 40);

  const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);
  const durationSeconds = parseFloat((dataSize / byteRate).toFixed(2));

  return {
    wavBuffer,
    wavBase64: wavBuffer.toString("base64"),
    durationSeconds,
    byteLength: wavBuffer.length,
    mimeType: "audio/wav",
  };
}

export function pcmToWavBuffer(
  pcmBuffer: Buffer,
  sampleRate: number = 24000,
  numChannels: number = 1,
  bitsPerSample: number = 16
): EncodedWavResult {
  return ttsPcmToWav(pcmBuffer, { sampleRate, numChannels, bitsPerSample });
}

export function pcmBase64ToWavDataUrl(
  pcmBase64: string,
  sampleRate: number = 24000
): string {
  const res = ttsPcmToWav(pcmBase64, { sampleRate });
  return `data:audio/wav;base64,${res.wavBase64}`;
}
