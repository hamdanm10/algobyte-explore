# Pola membangun komposisi video

Dibaca saat tahap Visual di `/create-video`. Folder video dihapus setelah dikemas ke D:, jadi pola reusable ada di sini dan di `src/shared/`.

## Struktur folder video `src/videos/NNN-slug/`
`voice-script.json`, `voice.json` + `voice/*.wav` (dari gen-voice), `captions.json` (dari gen-captions), `data.ts` (timeline + data), `index.tsx` (komposisi),
komponen visual khusus video (peta, overlay), `Thumbnail.tsx`, `README.md` (status selama dikerjakan). Daftarkan 2 `<Composition>` di `src/Root.tsx`: video dan `NNN-thumbnail`.
ID komposisi hanya boleh huruf, angka, strip (tanpa garis bawah).

## Timeline dari voice (`src/shared/lib/timeline.ts`)
```ts
import voice from "./voice.json";
import { buildTimeline } from "../../shared/lib/timeline";
const ORDER = ["hook", "r1", "r2", "outro"] as const;           // sama dengan id di voice-script.json
export const T = buildTimeline(voice, ORDER);                    // T.segStart / T.segLen / T.total / T.fps / T.voiceLead
```
Default `buildTimeline` = resep aktif (jeda 0,12 dtk, lead 1 frame). Bila video memakai nilai lain, tulis `"timeline": { "gapSeconds": ..., "voiceLead": ... }` di `voice-script.json` dan teruskan ke `buildTimeline` (import JSON-nya), supaya `.srt` tetap sinkron.
Impor wav langsung (`import hookWav from "./voice/hook.wav"`, tipe di `src/assets.d.ts`). Durasi `<Composition durationInFrames={T.total}>`.
Titik "angka disebut" / "fakta disebut" diambil dari `voice.json` (`pauses`: `[mulai, selesai]` detik, hasil silencedetect); ukur ulang bila voice dibuat ulang (`gen-voice.mjs <folder> --measure-only`).

## Susunan layer di `index.tsx`
1. Latar + visual utama (peta/grafik), memakai `useCurrentFrame()` di komponen terkecil.
2. Overlay teks per segmen, tiap segmen dalam `<Sequence name from={T.segStart[id]} durationInFrames={T.segLen[id]}>`.
3. Voice: `<Sequence from={T.segStart[id] + T.voiceLead} layout="none"><Audio src={wav} /></Sequence>` (`Audio` dari `@remotion/media`).
4. Caption: `<Captions captions={captions[id]} startFrame={T.voiceLead} .../>` DI DALAM Sequence segmen yang sama. Kotak caption harus tidak menimpa teks lain (atur `style.top/left`, `fontSize`).
5. SFX: `<Sfx id="whoosh-camera" from={frame} />` (id dari `sfx-index.json`; volume dari katalog).
6. Musik: `<Music id="calm-explainer-01" />` (volume katalog sekitar 0,10; fade in/out otomatis; loop).
7. **Watermark (wajib, elemen TERAKHIR = paling atas):** `<Watermark />` (opacity 0,4, kiri atas x 44 y 130, lebar 300, fade in 0,6 dtk). Area kiri atas (x di bawah 400, y 120-200) dicadangkan: letakkan judul di bawah y 210 atau geser ke kanan. Latar terang: `tone="dark"` (logo dibalik jadi hitam). Aset: `public/brand/watermark.png` (684x103, putih transparan; asli di `D:\Hamdan\Contents\algobyte-explore\assets\images\`, di sana juga ada `logo.png` dan `banner.png`).
   Thumbnail tidak memakai watermark kecuali diminta.

## Peta (`src/shared/lib/map.ts`)
Proyeksi Mercator dari `src/shared/data/idn-provinces.json` (Natural Earth, 33 provinsi lama). `PROVINCES[i] = {name, d, cx, cy, box}`; `findProvince(name)`.
Bila perlu data wilayah lain (negara, pulau, kota), unduh Natural Earth lalu buat skrip serupa `scripts/build-geo.mjs`.

## Teknik 3D "kertas bertumpuk" (dipakai video 001, boleh diubah/dilewati demi variasi gaya)
Container `perspective` + `transformStyle: preserve-3d`, `transform: rotateX(tilt) rotateZ(yaw) scale3d(s,s,s) translate(-x,-y)` (pakai `scale3d`, bukan `scale`).
Tiap provinsi = N lapisan `<svg>` dengan `translateZ(h * i/N)`; warna dinding digradasi. **Potong tiap lapisan ke bbox provinsi** (`box`): lapisan seukuran seluruh peta yang diperbesar membuat Chrome timeout.
Kamera = daftar "stop" `{f, x, y, s, tilt, yaw, ease}` dan interpolasi per segmen. 16 lapisan sudah cukup halus.

## Subtitle .srt (wajib di paket D:)
Setelah caption final: `node scripts/gen-srt.mjs src/videos/NNN-slug out/NNN-slug/subtitle.srt` (frasa pendek dari `captions.json`, waktu = rumus `buildTimeline`).
`package-video.mjs` mewajibkan tepat satu `.srt` di `out/NNN-slug/` dan menyalinnya sebagai `<nama-paket>.srt` (dicek SHA-256). Upload di YouTube Studio > Subtitle > Bahasa Indonesia > Upload file (dengan waktu).

## Thumbnail
Komposisi `NNN-thumbnail` dengan durasi sama; render satu frame yang memperlihatkan hasil akhir:
`npx remotion still NNN-thumbnail out/NNN-slug/thumbnail.png --frame=<frame>`. Teks harus muat satu baris (`whiteSpace: nowrap`) dan tidak menimpa visual utama.

## Render dan audio
`npx remotion render NNN-slug out/NNN-slug/<nama>.mp4 --timeout=120000`. Setelah render: `volumedetect`; bila puncak 0 dB pasang limiter (lihat CLAUDE.md).

## Peta titik "1 titik = orang" (video 002, 2D datar, kamera lurus)
Komponen reusable: `src/shared/components/DotMap.tsx` (`DotMap`, `DENSITY` = kepadatan BPS 2024 per poligon lama). Satu `<svg>` dengan `<g transform=translate scale>`; titik = grid ber-jitter di bbox provinsi dipotong `clipPath` poligon,
jumlah per piksel peta = kepadatan / 20000, radius titik konstan di layar (`dotRadius / s`), provinsi di luar layar dilewati. Warna isi, outline, dan `dotProgress(nama)` lewat props.
Kamera = daftar stop `{f, cam:{x,y,s}}`, x/y linear dan skala di ruang logaritma, ease inOut cubic. Waktu kejadian dari `g(seg, detik) = segStart + voiceLead + detik*30` memakai `pauses` di `voice.json`.
Catatan: peta 33 provinsi lama; provinsi baru (Papua Selatan dst.) tidak punya poligon, tandai dengan titik/label. Kontak sheet cek: `remotion still` beberapa frame lalu `ffmpeg hstack`.
Video yang berumur 48,6 dtk dengan 1458 frame dirender sekitar 1 menit (titik sekitar 9 ribu lingkaran masih ringan).

## Gaya cetak biru + "kotak ukur" (video 003, 2D, peta digeser kamera)
Latar biru cyanotype (`#12469c` ke `#061b44`), grid dalam koordinat peta (garis tiap 100 km, tebal tiap 500 km, minor memudar saat zoom out), bingkai ganda, Barlow Condensed + Space Mono, penanda kuning `#ffd60a`.
- Skala peta: 0,46957 px per km (`MAP_W` 2400). Luas pulau = jumlah luas provinsi (BPS) dari poligon lama: Jawa 6, Sulawesi 6, Papua 2 (Papua+Papua Barat lama = seluruh sisi Indonesia), Sumatera 10, Kalimantan 4 (Kaltim lama sudah memuat Kaltara).
- "Kotak ukur" = persegi seluas satuan pembanding (sisi = sqrt(luas) x px/km), disusun per pulau (`cols`, `rot`, pusat) dan kotak terakhir dipotong sebagian sesuai pecahan. Siluet asli satuan yang panjang/tipis (Jawa) tidak muat di bentuk pulau, jadi tidak dipakai untuk menyusun. Pecahan di bawah 0,05 dibulatkan (kalau tidak muncul garis tipis).
- Kamera = daftar stop `{f, cam:{x,y,s}}` (x,y linear, s logaritmik, ease inOut) dengan titik layar tetap (540, 800). Garis dan font di dalam SVG diberi ukuran `px / s` supaya konstan di layar (jangan pakai `vectorEffect` pada garis putus-putus `pathLength`).
- Sorot provinsi digambar dengan `pathLength=1` + `strokeDashoffset`. Panel gelap bergradasi di bawah peta (mulai y 1050) menutupi peta di belakang angka dan caption; bingkai digambar SETELAH panel.
- Area aman: judul mulai y 215 (watermark y 130-175), peta y 500-1050, angka y 1090-1330, caption y 1385; UI Shorts menutupi bawah.

## Gaya papan skor stadion + peta titik LED (video 004, 2D, kamera zoom per segmen)
Latar #03060f ke #0a1636, dua sorot cahaya `conic-gradient` dari sudut atas, grid titik CSS; biru #2f6bff + amber #ffb020; Doto (angka LED) + Anton + Manrope (`@remotion/google-fonts`).
- Peta titik LED: satu `<svg>` 1080x580 di y 470; provinsi diisi `<pattern>` titik dengan jarak `13 / s` (konstan di layar saat zoom); sorot provinsi = isi warna + pola titik putih. Titik lokasi dari `projectLonLat(lon, lat)` di `src/shared/lib/map.ts` (Bandung 107.6191, -6.9175). Cincin "sorak" = lingkaran stroke yang melebar, radius `px / s`.
- Papan skor (header, y 215-440): glyph "?" di Doto mirip angka 7 dan titik ribuan terbaca "+": gambar per karakter (digit Doto, "?" Anton, pemisah = lingkaran CSS). Angka berputar naik dengan ease out quad.
- Caption dengan stroke tebal memakan spasi antar kata ("sebenarnyaBobotoh"): beri `wordSpacing: 14` lewat `style`.
- Lencana teks (Anton 84) harus `whiteSpace: nowrap` dan lebar 800, kalau tidak membungkus dan menimpa caption. Jakarta di peta lama sangat kecil: zoom s=8 pun hanya sekitar 40 px.
- Klaim tanpa survei: stempel amber miring "KLAIM KLUB", angka diredupkan, lalu angka kembali ke "?" di penutup (hook dan penutup berpasangan).
- ElevenLabs `eleven_v4` tersedia (id didukung). Tidak mendukung tag SSML `<break>`; jeda lewat tanda baca. `gen-voice.mjs` mengirim `previous_text`/`next_text` per segmen dan `seed` (opsional di voice-script.json). `/v1/models` butuh izin `models_read` yang tidak dimiliki API key ini.

## Gaya atlas sekolah + globe berputar (video 005, globe ortografis 3D)
Kertas biru keabuan `#e6edf0` bergrid halus, jendela peta 1000x900 di y 480 (sudut 30, bingkai tinta), laut `#b7d8e6`, negara pastel per `MAPCOLOR7`, Indonesia merah bata `#cf3f2a`; DM Serif Display + Work Sans.
- Data dunia: `src/shared/data/world-countries.json` (`scripts/build-world.mjs` dari Natural Earth 50m admin 0; properti `name`, `iso`, `c`=MAPCOLOR7). **d3-geo butuh arah putaran terbalik dari RFC 7946**: skrip membalik ring yang `geoArea > 2π`, kalau tidak seluruh globe terisi warna satu negara.
- Proyeksi: `geoOrthographic().scale(r).rotate([-lon,-lat]).clipAngle(90)`, 241 negara digambar ulang tiap frame masih cepat (1275 frame sekitar 1 menit). Kamera = stop `{f, center, r}`; pusat diinterpolasi dengan `slerpLonLat`, r logaritmik, dan sedikit zoom out di tengah perpindahan agar terasa berputar. r 1100-1150 = sekitar 5.000 km memenuhi lebar 1000 px.
- **Perbandingan jarak/ukuran yang jujur:** `src/shared/lib/sphere.ts` → `rigidMover(from, fromDir, to, toDir)` = rotasi kaku di bola (kuaternion, t 0..1) yang memindahkan garis/siluet tanpa mengubah panjang/bentuk; `arcFrom(a, b, km)` = titik lingkaran besar sepanjang km; `distKm` haversine. Label disembunyikan bila titik di balik globe (dot product dengan pusat kamera).
- Label pin dekat tepi jendela terpotong: atur `anchor`/`dx`, dan geser pusat kamera bila ujung penggaris keluar jendela.
