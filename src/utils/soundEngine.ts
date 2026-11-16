export type MusicTrack = 'lobby' | 'battle' | 'none';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private musicMuted = false;
  private musicGain: GainNode | null = null;
  private currentTrack: MusicTrack = 'none';
  private schedulerId: number | null = null;
  private nextNoteTime = 0;
  private stepIndex = 0;
  private duckTimeout: number | null = null;

  setMuted(muted: boolean) {
    this.muted = muted;
    this.syncMusicGain();
    if (muted) {
      this.stopScheduler();
    } else if (!this.musicMuted && this.currentTrack !== 'none') {
      this.startScheduler();
    }
  }

  setMusicMuted(musicMuted: boolean) {
    this.musicMuted = musicMuted;
    this.syncMusicGain();
    if (musicMuted) {
      this.stopScheduler();
    } else if (!this.muted && this.currentTrack !== 'none') {
      this.startScheduler();
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  isMusicMuted(): boolean {
    return this.musicMuted;
  }

  private ensureCtx(allowWhenMuted = false): AudioContext | null {
    if (this.muted && !allowWhenMuted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this.musicGain) {
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.muted || this.musicMuted ? 0 : 0.28;
      this.musicGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  private syncMusicGain(ducked = false) {
    if (!this.ctx || !this.musicGain) return;
    const target = this.muted || this.musicMuted ? 0 : ducked ? 0.08 : 0.28;
    this.musicGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.06);
  }

  unlockFromGesture() {
    if (this.muted || this.musicMuted) return;
    const ctx = this.ensureCtx();
    if (ctx && this.currentTrack !== 'none' && this.schedulerId === null) {
      this.startScheduler();
    }
  }

  setMusicTrack(track: MusicTrack) {
    if (this.currentTrack === track && this.schedulerId !== null) return;
    this.currentTrack = track;
    this.stepIndex = 0;
    this.stopScheduler();
    if (track !== 'none' && !this.muted && !this.musicMuted) {
      this.startScheduler();
    }
  }

  private stopScheduler() {
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
  }

  private startScheduler() {
    if (typeof window === 'undefined') return;
    if (this.schedulerId !== null) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;

    this.nextNoteTime = ctx.currentTime + 0.05;
    this.schedulerId = window.setInterval(() => {
      this.scheduleAhead();
    }, 100);
  }

  private scheduleAhead() {
    if (this.muted || this.musicMuted || this.currentTrack === 'none') return;
    const ctx = this.ensureCtx();
    if (!ctx || ctx.state !== 'running') return;

    const bpm = this.currentTrack === 'battle' ? 132 : 108;
    const stepDuration = 60 / bpm / 2; // 8th-note steps

    while (this.nextNoteTime < ctx.currentTime + 0.22) {
      this.scheduleMusicStep(this.stepIndex, this.nextNoteTime, stepDuration);
      this.nextNoteTime += stepDuration;
      this.stepIndex = (this.stepIndex + 1) % 32;
    }
  }

  private scheduleMusicStep(step: number, time: number, stepDur: number) {
    if (!this.ctx || !this.musicGain) return;

    if (this.currentTrack === 'lobby') {
      // Cheerful sunny C-major adventure groove
      const bassPattern = [
        130.81, 0, 130.81, 196.0, 146.83, 0, 146.83, 196.0,
        164.81, 0, 164.81, 196.0, 174.61, 0, 196.0, 0,
      ];
      const leadPattern = [
        523.25, 0, 659.25, 587.33, 523.25, 0, 392.0, 0,
        440.0, 523.25, 659.25, 0, 587.33, 0, 493.88, 0,
        523.25, 0, 659.25, 783.99, 659.25, 0, 587.33, 0,
        440.0, 0, 523.25, 587.33, 523.25, 0, 392.0, 0,
      ];

      const bass = bassPattern[step % bassPattern.length];
      if (bass > 0) {
        this.playMusicVoice(bass, stepDur * 0.8, 'triangle', 0.22, time);
      }
      const lead = leadPattern[step];
      if (lead > 0) {
        this.playMusicVoice(lead, stepDur * 0.72, 'sine', 0.14, time);
      }
      if (step % 4 === 0) {
        this.playPerc(step % 8 === 0 ? 'kick' : 'hat', time);
      }
    } else if (this.currentTrack === 'battle') {
      // Energetic Brawl-style western/arcade rhythm (A minor pentatonic / Dorian bounce)
      const bassPattern = [
        110.0, 110.0, 0, 164.81, 110.0, 0, 146.83, 164.81,
        98.0, 98.0, 0, 146.83, 130.81, 0, 146.83, 164.81,
      ];
      const leadPattern = [
        440.0, 0, 523.25, 587.33, 659.25, 0, 587.33, 523.25,
        440.0, 0, 392.0, 440.0, 523.25, 0, 392.0, 0,
        440.0, 523.25, 659.25, 0, 783.99, 0, 659.25, 587.33,
        523.25, 0, 587.33, 659.25, 440.0, 0, 329.63, 0,
      ];

      const bass = bassPattern[step % bassPattern.length];
      if (bass > 0) {
        this.playMusicVoice(bass, stepDur * 0.78, 'triangle', 0.24, time);
      }
      const lead = leadPattern[step];
      if (lead > 0) {
        this.playMusicVoice(lead, stepDur * 0.65, 'square', 0.06, time);
      }
      if (step % 2 === 0) {
        this.playPerc(step % 4 === 0 ? 'kick' : 'hat', time);
      }
    }
  }

  private playMusicVoice(
    freq: number,
    duration: number,
    type: OscillatorType,
    peak: number,
    startTime: number
  ) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    g.gain.setValueAtTime(0.001, startTime);
    g.gain.linearRampToValueAtTime(peak, startTime + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private playPerc(kind: 'kick' | 'hat', startTime: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    if (kind === 'kick') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, startTime);
      osc.frequency.exponentialRampToValueAtTime(42, startTime + 0.11);
      g.gain.setValueAtTime(0.28, startTime);
      g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(startTime);
      osc.stop(startTime + 0.13);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1600, startTime);
      osc.frequency.exponentialRampToValueAtTime(900, startTime + 0.035);
      g.gain.setValueAtTime(0.045, startTime);
      g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.04);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(startTime);
      osc.stop(startTime + 0.045);
    }
  }

  private playTone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType = 'triangle',
    gainPeak = 0.16,
    delay = 0
  ) {
    const ctx = this.ensureCtx();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playClick() {
    this.playTone(520, 680, 0.07, 'triangle', 0.1);
  }

  playBlast(combo = 1) {
    const pitchBoost = Math.min(combo * 35, 220);
    this.playTone(340 + pitchBoost, 720 + pitchBoost, 0.12, 'sawtooth', 0.11);
    this.playTone(620 + pitchBoost, 960 + pitchBoost, 0.11, 'triangle', 0.12, 0.03);
  }

  playGemCollect(combo = 1) {
    const notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
    const base = notes[Math.min(combo - 1, notes.length - 1)] || 523.25;
    this.playTone(base, base * 1.25, 0.14, 'sine', 0.16);
    this.playTone(base * 1.5, base * 1.5, 0.16, 'triangle', 0.1, 0.06);
  }

  playWrong() {
    this.playTone(250, 145, 0.22, 'triangle', 0.14);
  }

  playSuperReady() {
    this.playTone(523.25, 523.25, 0.1, 'triangle', 0.14, 0);
    this.playTone(659.25, 659.25, 0.1, 'triangle', 0.14, 0.08);
    this.playTone(1046.5, 1174.66, 0.22, 'square', 0.1, 0.16);
  }

  playSuperBlast() {
    this.playTone(220, 880, 0.28, 'sawtooth', 0.16, 0);
    this.playTone(140, 60, 0.35, 'triangle', 0.2, 0.08);
    this.playTone(784, 1318, 0.28, 'triangle', 0.14, 0.12);
  }

  playVictory() {
    const fanfare = [523.25, 659.25, 783.99, 1046.5];
    fanfare.forEach((f, idx) => {
      this.playTone(f, f * 1.02, 0.18, 'triangle', 0.15, idx * 0.09);
    });
  }

  playDefeat() {
    this.playTone(392, 330, 0.18, 'triangle', 0.13, 0);
    this.playTone(311, 220, 0.3, 'triangle', 0.13, 0.18);
  }

  playLevelUp() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((f, idx) => {
      this.playTone(f, f * 1.04, 0.14, 'triangle', 0.15, idx * 0.065);
    });
    this.playTone(1567.98, 1567.98, 0.28, 'sine', 0.14, 0.33);
  }

  playBrawlerUnlock() {
    this.playTone(220, 660, 0.24, 'sawtooth', 0.09, 0);
    const fanfare = [
      { f: 523.25, t: 0.2, dur: 0.14 },
      { f: 659.25, t: 0.31, dur: 0.14 },
      { f: 783.99, t: 0.42, dur: 0.14 },
      { f: 1046.5, t: 0.54, dur: 0.38 },
      { f: 1318.51, t: 0.56, dur: 0.36 },
      { f: 1567.98, t: 0.58, dur: 0.34 },
    ];
    fanfare.forEach((n) => {
      this.playTone(n.f, n.f * 1.01, n.dur, 'triangle', 0.14, n.t);
    });
  }

  speakWord(text: string) {
    if (this.muted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      this.syncMusicGain(true);
      if (this.duckTimeout !== null) window.clearTimeout(this.duckTimeout);
      this.duckTimeout = window.setTimeout(() => {
        this.syncMusicGain(false);
      }, 1200);

      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-US';
      utter.rate = 0.86;
      utter.pitch = 1.06;
      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore if speech synthesis is unavailable
    }
  }
}

export const soundEngine = new SoundEngine();
