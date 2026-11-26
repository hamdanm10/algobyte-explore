import React from "react";
import { Audio } from "@remotion/media";
import { Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
// Katalog detail musik (dibuat scripts/gen-music.mjs). Katalog ringkasnya: public/music/music-index.json
import detail from "../../../public/music/music-detail.json";

type Item = { file: string; volume: number };
const items = detail.items as Record<string, Item>;

type Props = {
  // id dari public/music/music-index.json
  readonly id: string;
  // Frame mulai (relatif ke komposisi). Musik berhenti di akhir komposisi.
  readonly from?: number;
  // Menimpa volume dasar dari katalog (0-1). Musik harus pelan di bawah voice.
  readonly volume?: number;
  readonly fadeInSeconds?: number;
  readonly fadeOutSeconds?: number;
};

// Musik latar dengan fade in/out. Diulang (loop) bila lagu lebih pendek dari video.
export const Music: React.FC<Props> = ({ id, from = 0, volume, fadeInSeconds = 1.2, fadeOutSeconds = 2 }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const item = items[id];
  if (!item) {
    throw new Error(`Musik "${id}" tidak ada di public/music/music-detail.json`);
  }
  const base = volume ?? item.volume;
  const total = durationInFrames - from;
  return (
    <Sequence name={`Music ${id}`} from={from} layout="none">
      <Audio
        src={staticFile(item.file)}
        loop
        volume={(f) =>
          base *
          interpolate(f, [0, fadeInSeconds * fps, total - fadeOutSeconds * fps, total], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
    </Sequence>
  );
};
