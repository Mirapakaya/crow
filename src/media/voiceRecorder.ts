/**
 * Browser voice recording using MediaRecorder API.
 * Records Opus audio for voice messages.
 */

export interface VoiceRecording {
  blob: Blob;
  durationMs: number;
  waveform: number[];
}

export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startTime: number = 0;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private waveformSamples: number[] = [];

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/ogg; codecs=opus')
        ? 'audio/ogg; codecs=opus'
        : 'audio/webm; codecs=opus',
    });
    this.chunks = [];
    this.waveformSamples = [];

    // Set up analyser for waveform
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(this.stream);
    this.analyser = audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.startTime = Date.now();
    this.mediaRecorder.start(100); // 100ms chunks

    // Collect waveform samples
    this.collectWaveform();
  }

  private waveformInterval: ReturnType<typeof setInterval> | null = null;

  private collectWaveform(): void {
    if (!this.analyser) return;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.waveformInterval = setInterval(() => {
      if (!this.analyser) return;
      this.analyser.getByteTimeDomainData(dataArray);
      const avg = dataArray.reduce((s, v) => s + Math.abs(v - 128), 0) / dataArray.length;
      this.waveformSamples.push(avg / 128);
    }, 50);
  }

  stop(): VoiceRecording | null {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') return null;

    // Stop waveform collection
    if (this.waveformInterval) clearInterval(this.waveformInterval);

    // Stop recording
    this.mediaRecorder.stop();
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }

    const blob = new Blob(this.chunks, { type: this.mediaRecorder.mimeType });
    const durationMs = Date.now() - this.startTime;

    return {
      blob,
      durationMs,
      waveform: downsampleWaveform(this.waveformSamples, 60),
    };
  }

  cancel(): void {
    if (this.waveformInterval) clearInterval(this.waveformInterval);
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
    }
    this.chunks = [];
    this.stream = null;
    this.mediaRecorder = null;
  }

  get isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  get durationMs(): number {
    return this.startTime > 0 ? Date.now() - this.startTime : 0;
  }
}

function downsampleWaveform(samples: number[], targetLength: number): number[] {
  if (samples.length <= targetLength) return samples;
  const step = samples.length / targetLength;
  const result: number[] = [];
  for (let i = 0; i < targetLength; i++) {
    const start = Math.floor(i * step);
    const end = Math.floor((i + 1) * step);
    let max = 0;
    for (let j = start; j < end; j++) {
      max = Math.max(max, samples[j]);
    }
    result.push(max);
  }
  return result;
}
