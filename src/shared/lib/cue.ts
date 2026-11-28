// Waktu reveal dari caption Whisper (captions.json dari scripts/gen-captions.mjs).
// cueFrame(captions, "r2", "kalimantan utara") = frame (relatif ke AWAL SEGMEN, sudah + voiceLead) saat frasa mulai diucapkan.
// Pencocokan: teks token digabung tanpa spasi/tanda baca, huruf kecil (tahan token gabungan seperti "Di tingkat").
// Angka ditulis seperti caption (digit "2012", bukan "dua ribu dua belas"). nth = kemunculan ke-n (0 = pertama).
// Frasa yang tidak ketemu melempar error, jadi salah ketik ketahuan saat still/render.
import type { Caption } from "@remotion/captions";

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

export const cueMs = (captions: Record<string, Caption[]>, seg: string, phrase: string, nth = 0): number => {
  const toks = captions[seg];
  if (!toks) throw new Error(`cue: segmen "${seg}" tidak ada di captions.json`);
  const want = norm(phrase);
  let joined = "";
  const starts: { at: number; ms: number }[] = [];
  for (const t of toks) {
    starts.push({ at: joined.length, ms: t.startMs });
    joined += norm(t.text);
  }
  let from = 0;
  for (let k = 0; ; k++) {
    const i = joined.indexOf(want, from);
    if (i < 0) throw new Error(`cue: "${phrase}" (ke-${nth}) tidak ada di segmen ${seg}: "${joined}"`);
    if (k === nth) {
      let ms = starts[0].ms;
      for (const s of starts) if (s.at <= i) ms = s.ms;
      return ms;
    }
    from = i + 1;
  }
};

export const cueFrame = (
  captions: Record<string, Caption[]>,
  seg: string,
  phrase: string,
  opts: { nth?: number; fps?: number; voiceLead?: number } = {},
): number => Math.round((cueMs(captions, seg, phrase, opts.nth ?? 0) / 1000) * (opts.fps ?? 30)) + (opts.voiceLead ?? 1);
