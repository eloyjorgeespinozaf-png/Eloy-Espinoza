/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Centralized Audio Context manager with Dynamics Compressor to prevent clipping and ensure crisp cybernetic transients
let sharedAudioCtx: AudioContext | null = null;
let masterCompressor: DynamicsCompressorNode | null = null;
let lastSoundTimestamp = 0;
let soundMuted = false;

export function setAudioMuted(muted: boolean): void {
  soundMuted = muted;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('PII_LCC_AUDIO_MUTED', muted ? 'true' : 'false');
    }
  } catch {}
}

export function isAudioMuted(): boolean {
  if (soundMuted) return true;
  try {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('PII_LCC_AUDIO_MUTED') === 'true';
    }
  } catch {}
  return false;
}

export function getAudioContext(): AudioContext | null {
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

function getMasterNode(ctx: AudioContext): AudioNode {
  if (!masterCompressor) {
    try {
      masterCompressor = ctx.createDynamicsCompressor();
      masterCompressor.threshold.setValueAtTime(-18, ctx.currentTime);
      masterCompressor.knee.setValueAtTime(8, ctx.currentTime);
      masterCompressor.ratio.setValueAtTime(6, ctx.currentTime);
      masterCompressor.attack.setValueAtTime(0.002, ctx.currentTime);
      masterCompressor.release.setValueAtTime(0.06, ctx.currentTime);
      masterCompressor.connect(ctx.destination);
    } catch {
      return ctx.destination;
    }
  }
  return masterCompressor;
}

/**
 * High-tech cybernetic click for buttons and tactical controls.
 * Uses a dual-stage laser/micro-pitch sweep with resonant bandpass filtering.
 */
export function playCyberClick(
  variant: 'crisp' | 'soft' | 'laser' | 'toggle' | 'subtle' = 'crisp',
  volume = 0.08
): void {
  if (isAudioMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = performance.now();
    if (now - lastSoundTimestamp < 25) return; // Prevent double-chirp flutter
    lastSoundTimestamp = now;

    const t = ctx.currentTime;
    const dest = getMasterNode(ctx);

    // Filter for futuristic electronic polish
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(3.8, t);

    const gain = ctx.createGain();

    if (variant === 'laser') {
      // Fast laser chirping tick
      filter.frequency.setValueAtTime(2400, t);
      filter.frequency.exponentialRampToValueAtTime(700, t + 0.04);

      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2800, t);
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.04);

      gain.gain.setValueAtTime(volume * 1.1, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.start(t);
      osc.stop(t + 0.05);
    } else if (variant === 'toggle') {
      // Futuristic toggle switch (dual micro-tone)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      
      osc1.type = 'triangle';
      osc2.type = 'sine';
      
      osc1.frequency.setValueAtTime(1400, t);
      osc1.frequency.exponentialRampToValueAtTime(900, t + 0.035);

      osc2.frequency.setValueAtTime(1800, t);
      osc2.frequency.exponentialRampToValueAtTime(1200, t + 0.035);

      filter.frequency.setValueAtTime(1600, t);

      gain.gain.setValueAtTime(volume * 0.9, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.045);
      osc2.stop(t + 0.045);
    } else if (variant === 'soft' || variant === 'subtle') {
      // Subtle holographic UI blip
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1250, t);
      osc.frequency.exponentialRampToValueAtTime(820, t + 0.03);

      filter.frequency.setValueAtTime(1400, t);

      gain.gain.setValueAtTime(volume * 0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.start(t);
      osc.stop(t + 0.04);
    } else {
      // Default 'crisp' cyber blip (Tactile holographic response)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      
      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(2100, t);
      osc1.frequency.exponentialRampToValueAtTime(940, t + 0.038);

      osc2.frequency.setValueAtTime(1400, t);
      osc2.frequency.exponentialRampToValueAtTime(620, t + 0.038);

      filter.frequency.setValueAtTime(1800, t);
      filter.frequency.exponentialRampToValueAtTime(1100, t + 0.038);

      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.045);
      osc2.stop(t + 0.045);
    }
  } catch (e) {}
}

/**
 * Futuristic module entry sound (Ingreso a los módulos).
 * Synthesizes a holographic warp / quantum initialization sweep
 * with multi-harmonic frequency glide, resonant filter ascent, and crystal confirmation ping.
 */
export function playCyberModuleTransition(targetModule = '', volume = 0.1): void {
  if (isAudioMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = performance.now();
    if (now - lastSoundTimestamp < 50) return;
    lastSoundTimestamp = now;

    const t = ctx.currentTime;
    const dest = getMasterNode(ctx);

    // 1. Sub-bass power initialization thump (depth & weight)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, t);
    subOsc.frequency.exponentialRampToValueAtTime(75, t + 0.16);
    subGain.gain.setValueAtTime(volume * 0.9, t);
    subGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    subOsc.connect(subGain);
    subGain.connect(dest);
    subOsc.start(t);
    subOsc.stop(t + 0.19);

    // 2. Holographic upward frequency glide with resonance
    const sweepOsc = ctx.createOscillator();
    const sweepFilter = ctx.createBiquadFilter();
    const sweepGain = ctx.createGain();

    sweepOsc.type = 'triangle';
    sweepOsc.frequency.setValueAtTime(340, t);
    sweepOsc.frequency.exponentialRampToValueAtTime(1180, t + 0.18);

    sweepFilter.type = 'bandpass';
    sweepFilter.Q.setValueAtTime(4.2, t);
    sweepFilter.frequency.setValueAtTime(480, t);
    sweepFilter.frequency.exponentialRampToValueAtTime(2600, t + 0.18);

    sweepGain.gain.setValueAtTime(0.001, t);
    sweepGain.gain.linearRampToValueAtTime(volume * 0.9, t + 0.06);
    sweepGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

    sweepOsc.connect(sweepFilter);
    sweepFilter.connect(sweepGain);
    sweepGain.connect(dest);

    sweepOsc.start(t);
    sweepOsc.stop(t + 0.23);

    // 3. Cybernetic detuned harmonic shimmer (quantum handshake)
    const shimmerOsc1 = ctx.createOscillator();
    const shimmerOsc2 = ctx.createOscillator();
    const shimmerGain = ctx.createGain();

    shimmerOsc1.type = 'sine';
    shimmerOsc2.type = 'sine';

    // Detuned by 6Hz for futuristic chorus shimmer
    shimmerOsc1.frequency.setValueAtTime(880, t + 0.04);
    shimmerOsc1.frequency.exponentialRampToValueAtTime(1760, t + 0.24);

    shimmerOsc2.frequency.setValueAtTime(886, t + 0.04);
    shimmerOsc2.frequency.exponentialRampToValueAtTime(1766, t + 0.24);

    shimmerGain.gain.setValueAtTime(0.001, t);
    shimmerGain.gain.setValueAtTime(volume * 0.65, t + 0.08);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);

    shimmerOsc1.connect(shimmerGain);
    shimmerOsc2.connect(shimmerGain);
    shimmerGain.connect(dest);

    shimmerOsc1.start(t + 0.04);
    shimmerOsc2.start(t + 0.04);
    shimmerOsc1.stop(t + 0.27);
    shimmerOsc2.stop(t + 0.27);

    // 4. Crystal high-frequency confirmation ping at apex
    const pingOsc = ctx.createOscillator();
    const pingGain = ctx.createGain();
    pingOsc.type = 'sine';
    pingOsc.frequency.setValueAtTime(2093, t + 0.12); // C7
    pingGain.gain.setValueAtTime(volume * 0.7, t + 0.12);
    pingGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    pingOsc.connect(pingGain);
    pingGain.connect(dest);
    pingOsc.start(t + 0.12);
    pingOsc.stop(t + 0.31);
  } catch (e) {}
}

/**
 * Cybernetic Access Granted / Authorization Chime
 * Holographic 4-tone rapid ascending quantum sequence
 */
export function playCyberAccessGranted(volume = 0.1): void {
  if (isAudioMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const dest = getMasterNode(ctx);

    const notes = [
      { freq: 587.33, start: 0, dur: 0.14 },    // D5
      { freq: 880.00, start: 0.05, dur: 0.16 },  // A5
      { freq: 1174.66, start: 0.11, dur: 0.18 }, // D6
      { freq: 1760.00, start: 0.18, dur: 0.28 }  // A6
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, t + note.start);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(note.freq * 1.3, t + note.start);
      filter.Q.setValueAtTime(3.0, t + note.start);

      gain.gain.setValueAtTime(0.0001, t + note.start);
      gain.gain.linearRampToValueAtTime(volume * 0.85, t + note.start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + note.start + note.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.start(t + note.start);
      osc.stop(t + note.start + note.dur + 0.02);
    });
  } catch (e) {}
}

/**
 * Cybernetic Access Denied / Glitch Rejection tone
 * Low resonant dual-sawtooth frequency sweep through lowpass filter
 */
export function playCyberDenied(volume = 0.12): void {
  if (isAudioMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const dest = getMasterNode(ctx);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';

    osc1.frequency.setValueAtTime(140, t);
    osc1.frequency.linearRampToValueAtTime(90, t + 0.24);

    osc2.frequency.setValueAtTime(152, t); // Dissonant beating
    osc2.frequency.linearRampToValueAtTime(96, t + 0.24);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(750, t);
    filter.frequency.exponentialRampToValueAtTime(180, t + 0.24);
    filter.Q.setValueAtTime(4.0, t);

    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.26);
    osc2.stop(t + 0.26);
  } catch (e) {}
}

/**
 * Cybernetic Tactical Alert / Warning Ping
 * Dual-pulse FM ping for incoming telemetry, urgent orders, or radar hits.
 */
export function playCyberAlert(frequency = 960, volume = 0.1): void {
  if (isAudioMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const dest = getMasterNode(ctx);

    [0, 0.09].forEach(delay => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency * 1.15, t + delay);
      osc.frequency.exponentialRampToValueAtTime(frequency, t + delay + 0.06);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(frequency, t + delay);
      filter.Q.setValueAtTime(4.0, t + delay);

      gain.gain.setValueAtTime(volume * 0.9, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.08);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.start(t + delay);
      osc.stop(t + delay + 0.09);
    });
  } catch (e) {}
}

/**
 * Enhanced Cybernetic Beep:
 * Replaces the raw 80s sine beep with a modern, futuristic cyber tone
 * featuring micro-pitch envelope and resonant harmonic filtering.
 */
export function playSyntheticBeep(
  frequency = 880,
  duration = 0.12,
  type: OscillatorType = 'sine',
  volume = 0.08
): void {
  if (isAudioMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const dest = getMasterNode(ctx);

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    // Use triangle/sine mix with micro-glide for authentic cyber touch
    osc.type = type === 'sawtooth' ? 'sawtooth' : 'triangle';
    
    // Cyber transient: brief micro-pitch drop in the first 20ms
    osc.frequency.setValueAtTime(frequency * 1.22, t);
    osc.frequency.exponentialRampToValueAtTime(frequency, t + Math.min(0.02, duration * 0.3));

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(frequency * 1.1, t);
    filter.Q.setValueAtTime(3.2, t);

    gain.gain.setValueAtTime(volume * 0.95, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + duration + 0.01);
  } catch (e) {}
}

/**
 * Enhanced Cybernetic Chime (Futuristic dual-note holographic chord with digital resonance)
 */
export function playChime(freq1 = 587.33, freq2 = 880.00, duration = 0.2): void {
  if (isAudioMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const dest = getMasterNode(ctx);

    // Note 1 (Crisp futuristic attack)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const filter1 = ctx.createBiquadFilter();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq1 * 1.15, t);
    osc1.frequency.exponentialRampToValueAtTime(freq1, t + 0.025);

    filter1.type = 'bandpass';
    filter1.frequency.setValueAtTime(freq1 * 1.2, t);
    filter1.Q.setValueAtTime(3.5, t);

    gain1.gain.setValueAtTime(0.07, t);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc1.connect(filter1);
    filter1.connect(gain1);
    gain1.connect(dest);

    osc1.start(t);
    osc1.stop(t + duration + 0.01);

    // Note 2 (Ascending cyber harmonic)
    const delay = 0.08;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    const filter2 = ctx.createBiquadFilter();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq2 * 1.1, t + delay);
    osc2.frequency.exponentialRampToValueAtTime(freq2, t + delay + 0.03);

    filter2.type = 'bandpass';
    filter2.frequency.setValueAtTime(freq2 * 1.15, t + delay);
    filter2.Q.setValueAtTime(4.0, t + delay);

    gain2.gain.setValueAtTime(0.085, t + delay);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t + delay + duration);

    osc2.connect(filter2);
    filter2.connect(gain2);
    gain2.connect(dest);

    osc2.start(t + delay);
    osc2.stop(t + delay + duration + 0.01);
  } catch (e) {}
}

/**
 * Universal Cybernetic Audio Event Listener:
 * Automatically provides futuristic cyber audio feedback when users click
 * any interactive buttons, tabs, or enter tactical modules.
 */
export function initCyberAudioListener(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleClick = (event: MouseEvent) => {
    try {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Find closest interactive element
      const interactiveEl = target.closest(
        'button, a, [role="button"], input[type="button"], input[type="submit"], [data-tactical-click], .cursor-pointer'
      ) as HTMLElement | null;

      if (!interactiveEl) return;

      // Check if button opt-outs
      if (interactiveEl.getAttribute('data-sound') === 'none') return;

      const text = (interactiveEl.innerText || interactiveEl.getAttribute('title') || interactiveEl.getAttribute('aria-label') || '').toLowerCase();
      const id = (interactiveEl.id || '').toLowerCase();
      const className = (interactiveEl.className || '').toLowerCase();

      // Check if this interaction is a Module Entry / Switch
      const isModuleEntry = 
        text.includes('módulo') ||
        text.includes('consola de operaciones') ||
        text.includes('arquitectura de sistemas') ||
        text.includes('malla descentrada') ||
        text.includes('código fuente') ||
        text.includes('acceso directo') ||
        text.includes('acceso rápido') ||
        text.includes('ingreso') ||
        text.includes('conectar') ||
        id.includes('module') ||
        id.includes('organ') ||
        id.includes('tab-') ||
        className.includes('module-card') ||
        interactiveEl.closest('[data-module-card="true"]');

      if (isModuleEntry) {
        playCyberModuleTransition(text, 0.09);
      } else {
        playCyberClick('crisp', 0.065);
      }
    } catch {}
  };

  window.addEventListener('click', handleClick, { passive: true, capture: true });

  return () => {
    window.removeEventListener('click', handleClick, { capture: true });
  };
}
