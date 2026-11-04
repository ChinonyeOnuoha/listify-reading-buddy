/**
 * Small, quiet sound cues for building the nook. Synthesised on the device with Web Audio (no files to download).
 * Off until the reader switches Sound on, never played while recording or listening back, and never the only cue:
 * everything a sound marks is also visible on screen.
 */
export type Cue = "lamp" | "lantern" | "cushion" | "pages" | "page" | "tick";

let ctx: AudioContext | null = null;

export function playCue(cue: Cue) {
  try {
    const AC: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    const ac = ctx;
    if (ac.state === "suspended") void ac.resume();
    const t = ac.currentTime;

    const noise = (
      dur: number,
      freq: number,
      q: number,
      vol: number,
      type: BiquadFilterType = "bandpass",
    ) => {
      const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
      const src = ac.createBufferSource();
      src.buffer = buf;
      const f = ac.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ac.createGain();
      g.gain.value = vol;
      src.connect(f).connect(g).connect(ac.destination);
      src.start(t);
    };
    const tone = (freq: number, dur: number, vol: number, at = 0) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, t + at);
      g.gain.linearRampToValueAtTime(vol, t + at + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      o.connect(g).connect(ac.destination);
      o.start(t + at);
      o.stop(t + at + dur + 0.05);
    };

    if (cue === "lamp") {
      noise(0.03, 2500, 2, 0.4, "highpass"); // the switch
      tone(110, 1.2, 0.04, 0.05); // a soft warm hum
      tone(220, 0.9, 0.015, 0.05);
    }
    if (cue === "lantern") {
      noise(0.025, 1800, 3, 0.3);
      tone(330, 0.8, 0.02, 0.06);
    }
    if (cue === "cushion") noise(0.22, 260, 0.8, 0.7, "lowpass"); // a soft flump
    if (cue === "pages") noise(0.28, 3200, 0.7, 0.25); // paper rustle
    if (cue === "page") noise(0.18, 1600, 0.9, 0.22); // a page turn
    if (cue === "tick") noise(0.02, 3000, 4, 0.2);
  } catch {
    // Sound is decoration; failing quietly is correct.
  }
}
