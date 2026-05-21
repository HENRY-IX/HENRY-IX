/**
 * AudioEngine.ts
 *
 * Imperative audio DSP controller that directly manipulates Web Audio API nodes.
 * This decouples audio processing from React's render cycle, achieving instant
 * latency for EQ, filter, gain, and crossfader adjustments.
 *
 * Pattern: UI components call engine methods synchronously → DSP updates instantly
 * (no React re-render delay). Zustand is only updated for UI state that matters
 * (isPlaying, track metadata), NOT for rapidly-changing parameters.
 */

export interface DeckDSPNodes {
  lowShelf: BiquadFilterNode;
  midPeak: BiquadFilterNode;
  highShelf: BiquadFilterNode;
  filterNode: BiquadFilterNode;
  gainNode: GainNode;
}

export class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private deckNodes: Record<number, DeckDSPNodes | null> = { 1: null, 2: null, 3: null, 4: null };

  constructor() {}

  /**
   * Initialize the engine with an existing AudioContext and deck nodes.
   * This is called by AudioProvider once after DSP initialization.
   */
  init(audioCtx: AudioContext, nodes: Record<number, DeckDSPNodes>) {
    this.audioCtx = audioCtx;
    this.deckNodes = nodes;
  }

  /**
   * Set EQ gain for a specific deck and frequency band.
   * Updates audio instantly—no React cycle required.
   */
  setEQ(deckId: number, band: 'low' | 'mid' | 'high', value: number) {
    if (!this.audioCtx || !this.deckNodes[deckId]) return;

    const nodes = this.deckNodes[deckId];
    if (!nodes) return;

    // Clamp to [0, 100]
    const clamped = Math.max(0, Math.min(100, value));

    let gain: number;
    if (clamped < 50) {
      // Boost below 50%, dip above 50%
      gain = -32 * (1 - clamped / 50);
    } else {
      gain = (band === 'low' ? 12 : 10) * ((clamped - 50) / 50);
    }

    const node = band === 'low' ? nodes.lowShelf : band === 'mid' ? nodes.midPeak : nodes.highShelf;
    node.gain.setTargetAtTime(gain, this.audioCtx.currentTime, 0.015);
  }

  /**
   * Set filter cutoff/resonance for a specific deck.
   * Switches between lowpass (filter < 50) and highpass (filter > 50).
   */
  setFilter(deckId: number, value: number) {
    if (!this.audioCtx || !this.deckNodes[deckId]) return;

    const nodes = this.deckNodes[deckId];
    if (!nodes) return;

    const clamped = Math.max(0, Math.min(100, value));

    if (clamped < 50) {
      // Lowpass mode: sweep 80 Hz → 20 kHz
      nodes.filterNode.type = 'lowpass';
      const pct = clamped / 50;
      const frequency = 80 + 19920 * Math.pow(pct, 2.5);
      nodes.filterNode.frequency.setTargetAtTime(frequency, this.audioCtx.currentTime, 0.015);
    } else if (clamped > 50) {
      // Highpass mode: sweep 15 Hz → 6 kHz
      nodes.filterNode.type = 'highpass';
      const pct = (clamped - 50) / 50;
      const frequency = 15 + 5985 * Math.pow(pct, 2.5);
      nodes.filterNode.frequency.setTargetAtTime(frequency, this.audioCtx.currentTime, 0.015);
    } else {
      // Neutral: peaking with zero gain
      nodes.filterNode.type = 'peaking';
      nodes.filterNode.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.015);
    }
  }

  /**
   * Set deck volume (fader + crossfader).
   * Call this whenever volume, crossfader, or mute state changes.
   */
  setGain(deckId: number, faderVolume: number, crossfaderMultiplier: number, isMuted: boolean) {
    if (!this.audioCtx || !this.deckNodes[deckId]) return;

    const nodes = this.deckNodes[deckId];
    if (!nodes) return;

    const faderPct = Math.max(0, Math.min(100, faderVolume)) / 100;
    const targetGain = isMuted ? 0 : faderPct * crossfaderMultiplier;
    nodes.gainNode.gain.setTargetAtTime(targetGain, this.audioCtx.currentTime, 0.015);
  }

  /**
   * Compute crossfader multiplier for a given deck and crossfader position.
   * Deck must have a crossfaderAssign of 'L' or 'R'.
   * Crossfader position: 0 (full left) → 50 (center) → 100 (full right)
   */
  computeCrossfaderGain(
    crossfaderAssign: 'L' | 'R',
    crossfaderPosition: number
  ): number {
    const clamped = Math.max(0, Math.min(100, crossfaderPosition));

    if (crossfaderAssign === 'L') {
      // Left deck: fades out as crossfader moves right (50 → 100)
      return clamped <= 50 ? 1 : Math.max(0, 1 - (clamped - 50) / 50);
    } else {
      // Right deck: fades in as crossfader moves right (0 → 50)
      return clamped >= 50 ? 1 : Math.max(0, clamped / 50);
    }
  }

  /**
   * Get the AudioContext (for external components that need currentTime, etc.)
   */
  getAudioContext(): AudioContext | null {
    return this.audioCtx;
  }

  /**
   * Check if the AudioContext is initialized and active
   */
  isReady(): boolean {
    return this.audioCtx !== null && this.audioCtx.state !== 'closed';
  }
}

// Singleton instance
export const audioEngine = new AudioEngine();
