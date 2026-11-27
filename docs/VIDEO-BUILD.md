# Pola membangun komposisi video

Dibaca saat tahap Visual di `/create-short-video` dan `/create-long-video`. Folder video dihapus setelah dikemas ke D:, jadi pola reusable ada di sini dan di `src/shared/`.
**Koordinat dan tata letak di bagian gaya per video (002, 003, 004, 005, 006, 007) adalah CONTOH teknik, bukan template:** tata letak wajib divariasikan (`docs/RECIPE.md` bagian 3). Video 002-007 hampir semuanya memakai susunan yang sama (judul atas, peta di jendela kotak tengah, panel angka, caption): jangan diulang kecuali video eksploitasi yang sengaja mengikuti gaya referensi.
Bagian di bawah ditulis untuk **Shorts 1080x1920** (koordinat, area aman, watermark). Untuk video panjang 1920x1080, bagian "Video panjang" di akhir menimpa aturan tata letak Shorts; teknik peta/kamera/gaya tetap bisa dipakai.

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
6. Musik: `<Music id="calm-explainer-01" volume={0.2} />` (Shorts: volume 0,20 sesuai resep [user]; volume katalog 0,10 terlalu pelan di HP; fade in/out otomatis; loop). Video panjang: lihat `docs/RECIPE-LONG.md`.
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

## Mengambil data resmi (BPS, PBB) tanpa API key
- **Tabel BPS** (`bps.go.id/id/statistics-table/2/<id>/...`) tidak lagi memuat angka di HTML biasa: ambil dengan header React Server Components, `curl -sL -A "Mozilla/5.0" -H "RSC: 1" "<url tabel>"`, lalu cari `"datacontent":{...}`. Kunci = kode wilayah (4 digit, `3200` Jabar, `9999` Indonesia) + kode var + kode turvar (`585` = jumlah) + kode tahun (`120` = 2020) + `0`. Nama wilayah ada di `"vervar":[...]`. Hanya tahun default tabel yang ikut; id tabel = base64 dari `"<var>#2"` (mis. var 2131 = hasil SP2020 per provinsi, `MjEzMSMy`; var 1886 = proyeksi per provinsi). Parameter tahun di URL tidak berpengaruh.
- **PBB World Population Prospects 2024:** CSV resmi `https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/CSV_FILES/WPP2024_TotalPopulationBySex.csv.gz` (17 MB; filter `Variant=Medium`, `LocTypeName=Country/Area`, kolom `PopTotal` dalam ribu). API data portal butuh token (401).
- Bandingkan angka di tahun yang SAMA (mis. Sensus 2020 vs PBB 2020) dan tulis "tanpa Indonesia" bila bagian Indonesia diperingkatkan dengan negara.

## Gaya kertas krem + gelembung penduduk (video 006, peta dunia 2D Equal Earth)
Krem `#f4eee3`, arang `#1f2a2e`, koral `#e4572e` (Jawa), teal `#2a9d8f` (negara lain); Archivo Black + IBM Plex Sans.
- Peta dunia `geoEqualEarth().center([lon,lat]).scale(s).translate([MW/2,MH/2])` digambar ulang tiap frame (241 negara, 933 frame sekitar 1 menit render). Kamera = stop `{f, lon, lat, s}`, s logaritmik. s 178 = seluruh dunia di jendela 1000x580; s 2500-2900 = Pulau Jawa memenuhi jendela.
- Pulau = gabungan poligon `idn-provinces.json` diproyeksikan dengan proyeksi dunia yang sama (Jawa = 6 provinsi, Sumatera = 10). Centroid negara besar (AS, Rusia) diganti titik manual agar gelembung tidak jatuh di laut/ujung.
- Gelembung luas sebanding nilai: radius = k x sqrt(nilai). Panel duel di bawah peta (y 1100-1330) memakai k 9 (150 juta = radius 110). Ukuran teks di dalam gelembung diskalakan dengan radius (`min(46, r*0.42)`), kalau tidak meluber di gelembung kecil.
- Papan peringkat menggantikan peta di jendela yang sama; baris muncul berurutan, baris yang disorot masuk terakhir.

## Gaya arsip sepia + stempel (video 007, peta Indonesia 2D, kelompok per provinsi induk)
Kertas `#efe3c8` + vignette radial, laut bergaris tipis, arsiran 45 derajat di atas daratan (`<pattern>`), tinta `#3a2a1a`, stempel merah `#b3261e` (`mixBlendMode: multiply`, border + outline ganda); Libre Caslon Text + Courier Prime.
- Mewarnai 33 poligon lama per **induk 1945** (map nama provinsi -> kelompok) dengan `stroke` = warna isi, sehingga batas antar provinsi hilang; batas sekarang muncul sebagai lapisan garis terpisah dengan `strokeOpacity` dianimasikan.
- Provinsi yang tidak punya poligon di data lama (Kaltara, 4 provinsi baru Papua) ditampilkan sebagai titik + label dari `projectLonLat`.
- Kamera peta Indonesia penuh: `s = MW / MAP_W * 0.96` (jangan `min` lebar/tinggi: jendela 1000x580 dibatasi lebar). Zoom per wilayah: kotak poligon + titik label, `pad` 0,62.
- Label muncul bertahap: jeda per label `min(7, 36 / jumlah)` frame agar semua tampil sebelum kamera pindah.
- Thumbnail memakai komponen peta video pada frame tertentu: bungkus dengan `<Sequence from={-frame} layout="none">`.

## Video panjang (16:9, `/create-long-video`)
- **Nama:** folder `src/videos/long-NNN-slug/` dan `out/long-NNN-slug/`; komposisi `long-NNN-slug` (1920x1080, 30 fps) dan `long-NNN-thumbnail` (1280x720, durasi 1 frame cukup). Awalan `long-` wajib: `package-video.mjs` memakai awalan ini untuk mengemas ke `videos\long\`.
- **Voice:** file dari AI Studio di `voice-raw/<id>.wav` (milik user, jangan diubah) diproses `scripts/import-voice.mjs` menjadi `voice/<id>.wav` + `voice.json` (format sama dengan `gen-voice.mjs`). `voice-script.json` memuat `"format": "long"` dan `"timeline": { "gapSeconds": 0.6, "voiceLead": 1 }`; teruskan nilai yang sama ke `buildTimeline` agar `.srt` dan chapters sinkron.
- **Struktur:** satu komponen per bab (`Hook.tsx`, `B1.tsx`, ...), masing-masing di `<Sequence name="b1" from={T.segStart.b1} durationInFrames={T.segLen.b1}>`, sehingga tiap bab bisa dicek terpisah dengan `remotion still --frame=<T.segStart.b1 + n>`. Transisi bab: kartu judul bab 1-1,5 dtk di dalam jeda antar segmen (judul bab = judul chapter di deskripsi).
- **Waktu reveal:** dari `pauses` di `voice.json` (jeda kalimat Gemini cukup jelas) atau dari kata di `captions.json` (Whisper) untuk angka tertentu.
- **Tata letak 16:9:** area aman judul/teks di tengah 1700x900; jangan taruh teks penting di 120 px bawah (bilah progres pemutar). Watermark: `<Watermark width={260} marginX={48} marginY={40} />` (kiri atas), cadangkan x di bawah 340, y di bawah 100. **Caption wajib tampil** [user 2026-11-27]: `<PhraseCaptions>` (`src/shared/components/PhraseCaptions.tsx`; BUKAN `<Captions>` gaya Shorts yang memotong di tengah kalimat) di dalam Sequence tiap segmen dengan `pauses={voice[id].pauses}` (frasa dipotong di jeda asli audio, maks 7 kata, potongan 1 kata digabung), `startFrame={T.voiceLead}`, `fontSize` 46, `maxWidth` 1400, `style={{ position: "absolute", left: 260, top: 888 }}` (bawah kotak sekitar y 950, di atas 120 px bilah progres). Area y sekitar 880-960 dicadangkan untuk caption: angka, batang, garis waktu, legenda ditaruh di atas y 860; keterangan sumber kecil di kanan atas (top 70).
- **Chapters:** `00:00` = awal hook; bab berikutnya = `T.segStart.<id> / 30` dibulatkan ke bawah ke detik, ditulis `m:ss`. Minimal 3 chapter dan masing-masing minimal 10 dtk (aturan YouTube).
- **Thumbnail 1280x720:** peta + 1 angka/kontras besar, maks 4 kata, teks besar terbaca di ukuran kecil, tanpa watermark. Render opsi dengan `npx remotion still long-NNN-thumbnail out/long-NNN-slug/thumbnail-a.png`.
- **Musik:** `<Music>` per babak di dalam `<Sequence>` berbeda (2-3 trek) agar tidak satu loop 60 dtk selama 10 menit.
- **Render:** sekitar 18.000 frame untuk 10 menit; jalankan di background, cek dulu tiap bab dengan still. Bila peta berat (3D/titik banyak), uji render satu bab dengan `--frames=<awal>-<akhir>` sebelum render penuh.
- **Pelajaran L001 (2026-11-27):**
  - **Whisper lokal berat untuk video panjang.** `@remotion/whisper-webgpu` di WSL ini praktis jalan di CPU (sekitar 680% CPU, 2,8 GB RAM) walau `canUseWhisperWebGpu()` = supported. Satu file 7,5 menit sekaligus membuat PC macet. Yang aman: `gen-captions.mjs --only=<id>` **satu bab per proses, berurutan**, `nice -n 10`, `timeout 300` per bab, di background (L001: sekitar 2,4x durasi audio, total sekitar 23 menit untuk 7,2 menit narasi). Jangan pakai `taskset` 4 core (terlalu lambat, sempat di-kill sistem).
  - **Audio AI Studio wajib per bab.** File "full" dari AI Studio punya header WAV salah (byterate 96000 untuk mono 24 kHz 16-bit): dibaca penuh benar, tetapi `ffmpeg -ss` meleset 2x. Bila terpaksa, perbaiki dulu dengan `ffmpeg -i in.wav -c:a pcm_s16le out.wav`.
  - **Hening panjang Gemini (sampai 2 dtk) dirapatkan gratis** setelah `import-voice.mjs`: potong hening di atas 0,6 dtk menjadi 0,45 dtk di `voice/<id>.wav`, lalu ukur ulang `dur` + `pauses` di `voice.json` (silencedetect -35 dB, d 0,2). L001: tempo 2,08 menjadi 2,21 kata/dtk, durasi 7,7 menjadi 7,2 menit.
  - **Waktu reveal dari caption:** cari frasa di teks caption yang digabung tanpa spasi/tanda baca (tahan token gabungan seperti "Di tingkat"); angka ditulis seperti caption (digit: "2024", "52,7"), bukan seperti naskah. Uji semua frasa sebelum still (skrip kecil yang membaca `cue("id", "...")` dari file .tsx).
  - Koreksi caption manual setelah `gen-captions` (ejaan sudah di-snap ke naskah, sisanya ganti/gabung token tanpa mengubah waktu): mis. "betah"->"peta", "2,3"->"dua pertiga", "132,000"->"132.000", "kotanusantara"->"Kota Nusantara".
  - `mix()` di `src/shared/lib/color.ts` hanya menerima hex: hasil `mix()` (string `rgb(...)`) yang dicampur lagi menjadi hitam. Simpan warna antara sebagai hex.
  - Kartu judul bab diberi `zIndex` agar tidak tertutup peta yang digambar setelahnya.
  - Render panjang: `nice -n 10 npx remotion render ... --concurrency=4` di background agar PC tetap bisa dipakai. Cek still lewat satu bundle (`npx remotion bundle --out-dir=<dir>` lalu `npx remotion still <dir> <id> ...`) dan lembar kontak 2x2 dengan ffmpeg `hstack/vstack`.

## Gaya atlas topografi malam (L001, video panjang 16:9)
Reusable dari L001: `src/shared/lib/islands.ts` (`ISLAND_OF` kelompok pulau BPS, `POP_PCT`, `POP_DOTS` 1 titik = 100 ribu orang, `islandBox`), `src/shared/data/idn-volcanoes.json` (GVP, field `java`), `src/shared/components/PhraseCaptions.tsx`.
Hijau-hitam `#0b1512`/`#0f1a17`, kontur topografi prosedural yang bergeser pelan di latar (elips bergelombang per "bukit", setiap garis ke-4 lebih tebal), oranye lava `#ff7a3d` (Jawa, gunung api), emas padi `#e9c46a` (pangan, ekonomi), Instrument Serif + Geist. Kartu bab "▲ BAB n" seperti penanda ketinggian.
- Satu `MapView` (33 poligon, kamera `{x,y,s}` di koordinat `MAP_W` 2400) dipakai semua bab; isi tiap bab digambar sebagai children dengan ukuran garis `/ cam.s`.
- Peta titik penduduk: 1 titik = 100 ribu orang, disebar seragam per luas di dalam kelompok pulau (`geoContains` + RNG deterministik), jadi kerapatan titik = kepadatan.
- Perbandingan siluet dua pulau (Jawa vs Honshu): `geoAzimuthalEqualArea` dengan `rotate` ke pusat masing-masing dan skala yang sama (luas jujur).
- Gunung api: Smithsonian GVP (WFS GeoServer, GeoJSON Holocene volcanoes) difilter `Country` Indonesia; segitiga ukuran konstan di layar.
- "Berat ekonomi": kolom vertikal di centroid provinsi, tinggi sebanding persen PDRB.
- Grafik garis porsi Jawa (sensus garis penuh + proyeksi putus-putus) dipakai ulang di bab transmigrasi dan penutup; label titik dipindah atas/bawah agar tidak bertumpuk.
- Ekor 5 dtk setelah narasi untuk kartu sumber (`DURATION = T.total + TAIL`); musik babak 2 menutup sampai akhir.
