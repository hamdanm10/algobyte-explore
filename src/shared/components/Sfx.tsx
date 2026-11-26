import React from "react";
import { Audio } from "@remotion/media";
import { Sequence, staticFile } from "remotion";
// Katalog detail SFX (dibuat scripts/gen-sfx.mjs). Katalog ringkasnya: public/sfx/sfx-index.json
import detail from "../../../public/sfx/sfx-detail.json";

type Item = { file: string; volume: number };
const items = detail.items as Record<string, Item>;

// Pakai: <Sfx id="whoosh-camera" from={30} />  — id harus ada di sfx-index.json
export const Sfx: React.FC<{ readonly id: string; readonly from: number; readonly volume?: number }> = ({
  id,
  from,
  volume,
}) => {
  const item = items[id];
  if (!item) {
    throw new Error(`SFX "${id}" tidak ada di public/sfx/sfx-detail.json`);
  }
  return (
    <Sequence name={`SFX ${id}`} from={Math.max(0, from)} layout="none">
      <Audio src={staticFile(item.file)} volume={volume ?? item.volume} />
    </Sequence>
  );
};
