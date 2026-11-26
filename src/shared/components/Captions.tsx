import React, { useMemo } from "react";
import { createTikTokStyleCaptions, type Caption } from "@remotion/captions";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

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
  // Kata yang jaraknya kurang dari ini digabung dalam satu halaman (ms). Makin kecil = halaman makin pendek.
  readonly combineMs?: number;
  readonly maxWidth?: number;
  // Posisi/ukuran kotak caption, mis. { position: "absolute", top: 960, left: 90 }
  readonly style?: React.CSSProperties;
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Caption per kata: halaman berisi beberapa kata, kata yang sedang diucapkan disorot dan sedikit membesar.
export const Captions: React.FC<Props> = ({
  captions,
  startFrame = 0,
  fontFamily,
  fontSize = 66,
  color = "#ffffff",
  highlightColor = "#ffd166",
  strokeColor = "#05070d",
  combineMs = 700,
  maxWidth = 900,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { pages } = useMemo(
    () => createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds: combineMs }),
    [captions, combineMs],
  );

  const t = ((frame - startFrame) / fps) * 1000;
  const index = pages.findIndex((p, i) => {
    const end = pages[i + 1] ? pages[i + 1].startMs : p.startMs + p.durationMs + 350;
    return t >= p.startMs && t < end;
  });
  if (index < 0) {
    return null;
  }
  const page = pages[index];
  const enter = interpolate(t, [page.startMs, page.startMs + 120], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });

  return (
    <div
      style={{
        width: maxWidth,
        textAlign: "center",
        fontFamily,
        fontSize,
        fontWeight: 800,
        lineHeight: 1.18,
        color,
        opacity: enter,
        scale: String(0.94 + 0.06 * enter),
        whiteSpace: "pre-wrap",
        WebkitTextStroke: `${Math.round(fontSize * 0.16)}px ${strokeColor}`,
        paintOrder: "stroke fill",
        ...style,
      }}
    >
      {page.tokens.map((token) => {
        const active = t >= token.fromMs && t < token.toMs;
        // Spasi di depan kata ditaruh DI LUAR elemen yang diskala, supaya jarak antar kata tidak menyempit
        const space = token.text.match(/^\s*/)?.[0] ?? "";
        return (
          <React.Fragment key={`${token.fromMs}-${token.text}`}>
            {space}
            <span
              style={{
                color: active ? highlightColor : color,
                display: "inline-block",
                scale: active ? "1.06" : "1",
              }}
            >
              {token.text.trimStart()}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};
