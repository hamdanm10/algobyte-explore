# ElevenLabs Eleven Music + pelacakan kredit

Dibaca dari dokumentasi resmi 2026-11-25. Skrip: `scripts/gen-music.mjs`. Katalog: `public/music/music-index.json` (ringkas) + `music-detail.json` (lengkap). Komponen: `src/shared/components/Music.tsx`.

Sumber: https://elevenlabs.io/docs/overview/capabilities/music , https://elevenlabs.io/docs/api-reference/music/compose , https://elevenlabs.io/music-terms , https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform.md

## API
`POST https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128`, header `xi-api-key`. Body yang kami pakai:
`{ "prompt": "...", "music_length_ms": 60000, "model_id": "music_v2_5", "force_instrumental": true }`.
- `music_length_ms`: 3.000 sampai 600.000 (halaman API) atau maks 5 menit (halaman overview): tidak konsisten; kami memakai 60 detik.
- `model_id`: default API masih `music_v1` yang **dihapus 31 Jan 2027**. Selalu set `music_v2_5` eksplisit.
- `force_instrumental: true` menjamin tanpa vokal (hanya bersama `prompt`). Tulis juga "instrumental only" di prompt.
- Respons: file audio. Pembuatan 60 detik makan waktu sekitar 30-60 detik.

## Prompt untuk musik di bawah voiceover
Jawab lima hal: genre, mood, instrumen, tempo (BPM), era produksi. Tambah "instrumental only", "sits quietly under a voiceover", "steady energy with no sudden changes".
Loop: sebut jumlah bar, BPM, key. Kosong/jeda harus disebut eksplisit (kalau tidak model mengisinya). Kosakata produksi (sidechained, plate reverb, tape saturation) mengubah mixing.
Dokumentasi tidak memberi rekomendasi level di bawah voice. Volume 0,10 ternyata hampir tidak terdengar di HP (masukan user 2026-11-27); Shorts sekarang memakai 0,20 (`docs/RECIPE.md`).

## Lisensi (PENTING untuk monetisasi)
- Plan berbayar memuat lisensi komersial (selama bukan layanan Beta). Plan Free: tidak ada lisensi komersial dan wajib atribusi "Eleven Music".
- Music Terms: Free sampai Pro "For Individual Use Only"; hak media: semua penggunaan online/offline komersial **kecuali film, TV, radio, game studio**; distribusi di platform streaming musik (Spotify dsb.) dilarang untuk Free/Starter, **diizinkan mulai Creator**. YouTube adalah platform video, bukan streaming musik, tapi syarat persisnya belum dikonfirmasi ElevenLabs.
- **Tidak disebut di dokumentasi mana pun:** monetisasi YouTube, Content ID, atau mendaftarkan musik sebagai milik sendiri. Risiko nyata: sistem Content ID bisa memberi klaim salah. Bila ada klaim, ajukan sanggahan dengan bukti pembuatan (log `docs/usage/`, file di `public/music/`).
- Music Terms 4.4: patuhi kebijakan pengungkapan konten AI di platform (di YouTube Studio isi formulir "altered or synthetic content").
- Music Terms 4.2: dilarang memakai output untuk menyusun "Music Library". Perpustakaan pribadi untuk video sendiri aman; jangan dijual/dibagikan sebagai koleksi.
- Plan kami per 2026-11-25: **Starter** (berbayar), "For Individual Use Only", atribusi tidak wajib.

## Kredit
- Pool kredit SAMA untuk SFX, musik, dan TTS ElevenLabs (halaman harga: "Credits are shared across all products").
- **Biaya yang teramati di plan Starter kami (2026-11-25):** musik 60 detik = **750 kredit** (12,5 per detik; halaman harga menyebut sekitar 900 per menit). SFX 0,5 detik = **5 kredit** (sekitar 10 per detik; dokumentasi menyebut 40 per detik dengan durasi manual, jadi lebih mahal di atas kertas daripada kenyataan). Sampel kecil, perbarui bila ada data lebih banyak.
- Saldo: `GET https://api.elevenlabs.io/v1/user/subscription` -> `character_count` (kredit terpakai periode ini), `character_limit` (batas), `next_character_count_reset_unix`, `tier`. Nama field "character" tetapi nilainya kredit.
- **Saldo di API terlambat diperbarui sekitar 20 detik** setelah generate. Pelacak (`scripts/lib/usage.mjs`) menunggu sampai berubah; SFX batch dihitung sekali per batch.
- Saldo saat dicek 2026-11-25: terpakai 12.992 dari 34.751 (sisa sekitar 21.760), reset 18 Des 2026.

## Pelacakan pemakaian
- Log: `docs/usage/elevenlabs.jsonl` (tiap SFX/musik: perkiraan, selisih saldo sebenarnya, saldo sesudahnya) dan `docs/usage/gemini.jsonl` (token tiap voice).
- Laporan: `node --env-file=.env scripts/usage-report.mjs [--since=2026-11]`. Bila `creditsActual` null atau 0 pada entri baru, saldo belum diperbarui API: cek lagi dengan laporan.
- Satu entri awal (`calm-explainer-01`) dikoreksi manual karena pelacak versi pertama tidak menunggu saldo berubah.
