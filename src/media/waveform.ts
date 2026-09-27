/**
 * Audio waveform visualization data.
 */

export function generateWaveformBars(amplitudes: number[], barCount: number): number[] {
  if (amplitudes.length === 0) return new Array(barCount).fill(0);
  const step = amplitudes.length / barCount;
  const bars: number[] = [];
  for (let i = 0; i < barCount; i++) {
    const start = Math.floor(i * step);
    const end = Math.floor((i + 1) * step);
    let max = 0;
    for (let j = start; j < end && j < amplitudes.length; j++) {
      max = Math.max(max, amplitudes[j]);
    }
    bars.push(max);
  }
  return bars;
}

export function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}
