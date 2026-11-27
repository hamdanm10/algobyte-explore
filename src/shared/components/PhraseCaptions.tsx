import React, { useMemo } from "react";
import type { Caption } from "@remotion/captions";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

// Caption per FRASA untuk video panjang (16:9). Beda dengan <Captions> (halaman per waktu, gaya Shorts):
// frasa dipotong di jeda asli audio (voice.json pauses) dan tanda tanya/seru, jadi tidak memotong di tengah kalimat.
// Kata yang sedang diucapkan disorot.
type Props = {
  // Caption dari scripts/gen-captions.mjs untuk SATU segmen voice (waktu relatif ke awal file voice-nya)
  readonly captions: Caption[];
  // Frame (relatif ke Sequence induk) tempat file voice itu mulai diputar
  readonly startFrame?: number;
  readonly fontFamily?: string;
  readonly fontSize?: number;
  readonly color?: string;
  readonly highlightColor?: string;
  readonly strokeColor?: string;
  // Jeda asli di audio segmen ini, [mulai, selesai] detik (voice.json "pauses"); batas frasa utama
  readonly pauses?: number[][];
  readonly maxWords?: number;
  readonly maxWidth?: number;
  readonly style?: React.CSSProperties;
};

type Phrase = { startMs: number; endMs: number; tokens: Caption[] };

const wordsOf = (toks: Caption[]) => toks.filter((t) => /[\p{L}\p{N}]/u.test(t.text.trim()[0] ?? "")).length;

// Batas frasa = jeda asli di audio (`pauses` dari voice.json, detik) dipetakan ke batas antar token terdekat,
// lalu frasa yang lebih dari maxWords kata dibagi rata (tanpa sisa satu kata).
export const buildPhrases = (caps: Caption[], pauses: number[][] = [], maxWords = 7): Phrase[] => {
  const breaks = new Set<number>();
  caps.forEach((c, i) => {
    if (/[?!.]$/.test(c.text.trim())) breaks.add(i);
  });
  for (const [ps, pe] of pauses) {
    const m = ((ps + pe) / 2) * 1000;
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < caps.length - 1; i++) {
      const b = (caps[i].endMs + caps[i + 1].startMs) / 2;
      const d = Math.abs(b - m);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best >= 0 && bestD < 450) breaks.add(best);
  }
  const groups: Caption[][] = [];
  let cur: Caption[] = [];
  caps.forEach((c, i) => {
    cur.push(c);
    if (breaks.has(i) || i === caps.length - 1) {
      groups.push(cur);
      cur = [];
    }
  });
  // Potongan satu kata ("Artinya", "Jawa") digabung ke frasa sesudahnya bila masih muat
  for (let i = 0; i < groups.length - 1; i++) {
    if (wordsOf(groups[i]) <= 1 && wordsOf(groups[i]) + wordsOf(groups[i + 1]) <= maxWords + 1) {
      groups[i + 1] = [...groups[i], ...groups[i + 1]];
      groups.splice(i, 1);
      i--;
    }
  }
  const out: Phrase[] = [];
  for (const g of groups) {
    const n = wordsOf(g);
    const parts = Math.max(1, Math.ceil(n / maxWords));
    const per = Math.ceil(g.length / parts);
    for (let k = 0; k < g.length; k += per) {
      const toks = g.slice(k, k + per);
      out.push({ startMs: toks[0].startMs, endMs: toks[toks.length - 1].endMs, tokens: toks });
    }
  }
  return out;
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const PhraseCaptions: React.FC<Props> = ({
  captions,
  startFrame = 0,
  fontFamily,
  fontSize = 46,
  color = "#ffffff",
  highlightColor = "#ffd166",
  strokeColor = "#05070d",
  pauses = [],
  maxWords = 7,
  maxWidth = 1400,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phrases = useMemo(() => buildPhrases(captions, pauses, maxWords), [captions, pauses, maxWords]);
  const t = ((frame - startFrame) / fps) * 1000;
  // Frasa tetap tampil sampai frasa berikutnya mulai (maks 600 ms setelah selesai), supaya tidak berkedip di jeda pendek
  const index = phrases.findIndex((p, i) => {
    const end = Math.min(phrases[i + 1]?.startMs ?? Infinity, p.endMs + 600);
    return t >= p.startMs - 60 && t < end;
  });
  if (index < 0) return null;
  const p = phrases[index];
  const enter = interpolate(t, [p.startMs - 60, p.startMs + 100], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <div
      style={{
        width: maxWidth,
        textAlign: "center",
        fontFamily,
        fontSize,
        fontWeight: 700,
        lineHeight: 1.2,
        color,
        opacity: enter,
        WebkitTextStroke: `${Math.round(fontSize * 0.14)}px ${strokeColor}`,
        paintOrder: "stroke fill",
        ...style,
      }}
    >
      {p.tokens.map((tok) => {
        const active = t >= tok.startMs && t < tok.endMs;
        const space = tok.text.match(/^\s*/)?.[0] ?? "";
        return (
          <React.Fragment key={`${tok.startMs}-${tok.text}`}>
            {space}
            <span style={{ color: active ? highlightColor : color }}>{tok.text.trimStart()}</span>
          </React.Fragment>
        );
      })}
    </div>
  );
};
