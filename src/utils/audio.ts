/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Centralized Audio Context manager to avoid browser hardware limit (max 6 contexts)
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (err) {
    return null;
  }
}

/**
 * Play a synthesizer tone with given frequency, duration and waveform type.
 */
export function playSyntheticBeep(
  frequency = 880,
  duration = 0.15,
  type: OscillatorType = 'sine',
  volume = 0.08
): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Autoplay policy or audio device unavailable
  }
}

/**
 * Play tactical confirmation chime (two-step chord)
 */
export function playChime(freq1 = 523.25, freq2 = 659.25, duration = 0.18): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // First note
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq1, ctx.currentTime);
    gain1.gain.setValueAtTime(0.06, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + duration);

    // Second note slightly delayed
    setTimeout(() => {
      try {
        if (!ctx || ctx.state === 'closed') return;
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq2, ctx.currentTime);
        gain2.gain.setValueAtTime(0.07, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + duration);
      } catch (err) {}
    }, 90);
  } catch (e) {}
}
