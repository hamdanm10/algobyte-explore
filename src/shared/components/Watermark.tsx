import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

type Props = {
  // Transparansi watermark (0-1). Pakai opacity saja agar video tetap terlihat.
  readonly opacity?: number;
  // Lebar logo (px). Aspek asli 684x103.
  readonly width?: number;
  readonly corner?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  readonly marginX?: number;
  readonly marginY?: number;
  readonly fadeInSeconds?: number;
  // "light" = logo putih asli (untuk latar gelap). "dark" = dibalik jadi hitam (WAJIB bila latar video terang).
  readonly tone?: "light" | "dark";
};

// WAJIB ada di setiap video, sebagai layer PALING ATAS (elemen terakhir di komposisi). Sumber: public/brand/watermark.png
// (logo putih transparan). Default: kiri atas, di bawah status bar ponsel. UI Shorts menutupi sisi kanan (tombol),
// bawah (judul/channel), dan atas kanan (pencarian), jadi kiri atas paling aman: jangan taruh teks lain di area ini.
export const Watermark: React.FC<Props> = ({
  opacity = 0.4,
  width = 300,
  corner = "top-left",
  marginX = 44,
  marginY = 130,
  fadeInSeconds = 0.6,
  tone = "light",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = interpolate(frame, [0, fadeInSeconds * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const place: React.CSSProperties = {
    position: "absolute",
    ...(corner.startsWith("top") ? { top: marginY } : { bottom: marginY }),
    ...(corner.endsWith("left") ? { left: marginX } : { right: marginX }),
  };
  return (
    <Img
      name="Watermark"
      src={staticFile("brand/watermark.png")}
      style={{
        ...place,
        width,
        opacity: opacity * fade,
        // Bayangan tipis agar logo tetap terbaca; tone "dark" membalik logo putih menjadi hitam
        filter:
          tone === "dark"
            ? "invert(1) drop-shadow(0 1px 4px rgba(255,255,255,0.5))"
            : "drop-shadow(0 2px 6px rgba(0,0,0,0.45))",
        pointerEvents: "none",
      }}
    />
  );
};
