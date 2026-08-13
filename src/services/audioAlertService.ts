// Audio Alert & Sound Synthesizer Service using native Web Audio API
// Provides crisp, zero-latency sound effects without relying on external .mp3 files.

export type SoundType =
  | "SUCCESS"
  | "ALERT"
  | "STATUS_CHANGE"
  | "TIMER"
  | "MIC_START"
  | "MIC_STOP"
  | "CLICK";

class AudioAlertService {
  private audioCtx: AudioContext | null = null;
  private isEnabled: boolean = true;
  private isVoiceEnabled: boolean = true;

  constructor() {
    // Read persisted sound preference (default: enabled)
    try {
      const savedMute = localStorage.getItem("hme_audio_alerts_enabled");
      if (savedMute !== null) {
        this.isEnabled = savedMute === "true";
      }
      const savedVoice = localStorage.getItem("hme_voice_alerts_enabled");
      if (savedVoice !== null) {
        this.isVoiceEnabled = savedVoice === "true";
      }
    } catch {
      this.isEnabled = true;
      this.isVoiceEnabled = true;
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public isAudioEnabled(): boolean {
    return this.isEnabled;
  }

  public setAudioEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    try {
      localStorage.setItem("hme_audio_alerts_enabled", String(enabled));
    } catch {}
    if (enabled) {
      this.playTone("CLICK");
    }
  }

  public toggleAudio(): boolean {
    const newState = !this.isEnabled;
    this.setAudioEnabled(newState);
    return newState;
  }

  public isVoiceAlertsEnabled(): boolean {
    return this.isVoiceEnabled;
  }

  public setVoiceAlertsEnabled(enabled: boolean): void {
    this.isVoiceEnabled = enabled;
    try {
      localStorage.setItem("hme_voice_alerts_enabled", String(enabled));
    } catch {}
  }

  /**
   * Play synthesized audio tones
   */
  public playTone(type: SoundType): void {
    if (!this.isEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      if (type === "SUCCESS") {
        // High pleasant dual-harmony chord (C5 -> E5 -> G5)
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + index * 0.08);

          gain.gain.setValueAtTime(0.001, now + index * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.18, now + index * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.45);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + index * 0.08);
          osc.stop(now + index * 0.08 + 0.5);
        });
      } else if (type === "ALERT") {
        // High attention alert double-beep for critical priority
        [880, 880].forEach((freq, idx) => {
          const startTime = now + idx * 0.15;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.001, startTime);
          gain.gain.linearRampToValueAtTime(0.22, startTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.14);
        });
      } else if (type === "STATUS_CHANGE") {
        // Smooth soft sweep tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.18);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === "TIMER") {
        // Clean mechanical start/pause acoustic click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(750, now);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === "MIC_START") {
        // Mic on ascending beep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.12);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (type === "MIC_STOP") {
        // Mic off descending beep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.linearRampToValueAtTime(440, now + 0.12);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (type === "CLICK") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, now);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
      }
    } catch (err) {
      console.warn("Audio synthesis note failed:", err);
    }
  }

  /**
   * Optional Speech Announcement (e.g. "Work Order JC-001 in progress")
   */
  public speak(message: string): void {
    if (!this.isEnabled || !this.isVoiceEnabled) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 0.85;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("Speech synthesis failed:", err);
    }
  }
}

export const audioAlertService = new AudioAlertService();
