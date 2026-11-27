import React from "react";

// Daftarkan video yang SEDANG dikerjakan di sini (2 Composition per video: video dan thumbnail).
// Short: "NNN-slug" + "NNN-thumbnail" (1080x1920). Video panjang: "long-NNN-slug" + "long-NNN-thumbnail" (1920x1080 dan 1280x720).
// Video yang sudah dikemas ke D: dihapus beserta registrasinya (lihat .claude/commands/create-short-video.md dan create-long-video.md).
// Contoh:
//   import { Composition } from "remotion";
//   <Composition id="008-slug" component={Video} durationInFrames={T.total} fps={T.fps} width={1080} height={1920} />
//   <Composition id="008-thumbnail" component={Thumbnail} durationInFrames={1} fps={30} width={1080} height={1920} />
export const RemotionRoot: React.FC = () => {
  return <></>;
};
