// Timeline video dari durasi voice per segmen (voice.json dari scripts/gen-voice.mjs).
// Durasi video mengikuti narasi: tiap segmen = durasi voice + jeda hening.
//
//   import voice from "./voice.json";
//   const T = buildTimeline(voice, ["hook", "r1", "outro"] as const);
//   <Sequence from={T.segStart.r1} durationInFrames={T.segLen.r1}> ... </Sequence>
//   <Composition durationInFrames={T.total} fps={T.fps} ... />

export type VoiceJson<Id extends string> = Record<Id, { dur: number; pauses: number[][] }>;

export type Timeline<Id extends string> = {
  readonly fps: number;
  // Frame voice mulai diputar setelah awal segmen (nafas kecil)
  readonly voiceLead: number;
  readonly segLen: Record<Id, number>;
  readonly segStart: Record<Id, number>;
  readonly total: number;
};

export const buildTimeline = <Id extends string>(
  voice: VoiceJson<Id>,
  order: readonly Id[],
  opts: { fps?: number; gapSeconds?: number; voiceLead?: number } = {},
): Timeline<Id> => {
  const fps = opts.fps ?? 30;
  const gap = opts.gapSeconds ?? 0.45;
  const segLen = {} as Record<Id, number>;
  const segStart = {} as Record<Id, number>;
  let at = 0;
  for (const id of order) {
    segLen[id] = Math.ceil((voice[id].dur + gap) * fps);
    segStart[id] = at;
    at += segLen[id];
  }
  return { fps, voiceLead: opts.voiceLead ?? 3, segLen, segStart, total: at };
};

// Detik di dalam segmen -> frame (relatif ke awal segmen)
export const sec = (seconds: number, fps = 30): number => Math.round(seconds * fps);

// Detik saat kalimat ke-(index+1) SELESAI, dari jeda yang diukur ffmpeg silencedetect.
// Contoh: pauseEnd(voice, "r5", 1) = saat jeda ke-2 berakhir = awal kalimat berikutnya. Undefined bila tidak ada.
export const pauseEnd = <Id extends string>(voice: VoiceJson<Id>, id: Id, index: number): number | undefined =>
  voice[id].pauses[index]?.[1];
