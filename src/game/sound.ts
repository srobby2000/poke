import type { BattleFeedback } from "./battleState";

const MUTE_KEY = "creature-masters-muted-v1";

let context: AudioContext | null = null;
let muted = loadMuted();

function loadMuted(): boolean {
  try {
    return globalThis.localStorage?.getItem(MUTE_KEY) === "true";
  } catch {
    return false;
  }
}

export function isSoundMuted() {
  return muted;
}

export function setSoundMuted(value: boolean) {
  muted = value;
  try {
    globalThis.localStorage?.setItem(MUTE_KEY, String(value));
  } catch {
    // Storage unavailable — mute still applies for this session.
  }
}

function getContext(): AudioContext | null {
  if (muted || typeof window === "undefined" || typeof AudioContext === "undefined") {
    return null;
  }
  try {
    context = context ?? new AudioContext();
    if (context.state === "suspended") {
      void context.resume();
    }
    return context;
  } catch {
    return null;
  }
}

type ToneOptions = {
  frequency: number;
  endFrequency?: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
};

function playTone({ frequency, endFrequency, duration, type = "square", gain = 0.05, delay = 0 }: ToneOptions) {
  const audio = getContext();
  if (!audio) {
    return;
  }
  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const envelope = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
  }
  envelope.gain.setValueAtTime(gain, start);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(envelope).connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export function playFeedbackSound(kind: BattleFeedback["kind"]) {
  if (kind === "damage") {
    playTone({ frequency: 220, endFrequency: 140, duration: 0.12 });
  } else if (kind === "super") {
    playTone({ frequency: 420, endFrequency: 240, duration: 0.16, gain: 0.07 });
    playTone({ frequency: 630, endFrequency: 360, duration: 0.14, gain: 0.045, delay: 0.03 });
  } else if (kind === "resist") {
    playTone({ frequency: 150, endFrequency: 110, duration: 0.1, type: "triangle", gain: 0.04 });
  } else if (kind === "sync") {
    playTone({ frequency: 320, endFrequency: 760, duration: 0.3, type: "sawtooth", gain: 0.05 });
    playTone({ frequency: 480, endFrequency: 960, duration: 0.26, type: "sawtooth", gain: 0.035, delay: 0.06 });
  } else if (kind === "unity") {
    playTone({ frequency: 262, duration: 0.22, type: "triangle", gain: 0.05 });
    playTone({ frequency: 330, duration: 0.22, type: "triangle", gain: 0.05, delay: 0.05 });
    playTone({ frequency: 392, duration: 0.26, type: "triangle", gain: 0.05, delay: 0.1 });
  }
  // "status" feedback stays silent to avoid doubling up with hit sounds.
}

export function playKoSound() {
  playTone({ frequency: 300, endFrequency: 70, duration: 0.4, type: "sawtooth", gain: 0.06 });
}
