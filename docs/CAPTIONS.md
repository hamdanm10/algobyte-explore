# Caption

Skrip: `node scripts/gen-captions.mjs <folder-video> [--model=small] [--only=id1,id2]` -> `<folder>/captions.json` = `{ "<id segmen>": Caption[] }`, waktu RELATIF ke awal file voice segmen itu.
Komponen: `src/shared/components/Captions.tsx` (caption per kata, kata yang diucapkan disorot kuning).

## Cara kerja
- Whisper lokal lewat `@remotion/whisper-webgpu` (gratis, tanpa API key). Butuh GPU WebGPU: di WSL ini jalan lewat `/dev/dxg` (`canUseWhisperWebGpu()` mengembalikan `supported: true`). Model `small` multilingual diunduh sekali lalu di-cache; bahasa `indonesian`. Jangan pakai model `.en`.
- Format `Caption` dari `@remotion/captions` (`text` diawali spasi, `startMs`, `endMs`, ...). Halaman kata dibentuk `createTikTokStyleCaptions` (`combineMs` 700 = 1-3 kata per halaman).
- **Koreksi ejaan memakai naskah:** kata Whisper yang mirip kata naskah (jarak edit kecil) diganti ejaan naskah ("Pringkat" -> "Peringkat", "Sumatra" -> "Sumatera"); "Provinsi"+"mu" digabung. Angka tetap dari Whisper ("12,4 juta" lebih enak dibaca daripada "dua belas koma empat"). Titik/koma akhir kata dibuang, tanda tanya/seru dipertahankan.
- Hasil teruji pada voice Kore (Gemini 2.5 TTS): audio TTS bersih sehingga hampir semua kata benar.

## Pemakaian
Di dalam `<Sequence>` segmen: `<Captions captions={captions[id]} startFrame={voiceLead} fontFamily={...} style={{ position: "absolute", top: ..., left: ... }} />`.
Posisi dan ukuran font diatur per video agar tidak menimpa teks lain; layar Shorts bagian bawah sekitar 15-20% tertutup UI YouTube.
Jangan menggabungkan caption semua segmen menjadi satu timestamp global (panduan Remotion).
Bila voice segmen dibuat ulang, jalankan lagi dengan `--only=<id>`.
