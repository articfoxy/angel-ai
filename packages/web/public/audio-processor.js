class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Int16Array(1600); // 100ms at 16kHz
    this.bufferIndex = 0;
  }

  process(inputs) {
    const input = inputs[0][0]; // mono channel
    if (!input) return true;

    for (let i = 0; i < input.length; i++) {
      // Convert float32 [-1,1] to int16
      this.buffer[this.bufferIndex++] = Math.max(-32768, Math.min(32767, input[i] * 32768));

      if (this.bufferIndex >= 1600) {
        this.port.postMessage(this.buffer.slice());
        this.bufferIndex = 0;
      }
    }
    return true;
  }
}

registerProcessor('audio-capture', AudioCaptureProcessor);
