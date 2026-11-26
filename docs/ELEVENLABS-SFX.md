# ElevenLabs Sound Effects: praktik terbaik

Dibaca dari dokumentasi resmi pada 2026-11-25. Pakai ini sebelum menambah/mengubah SFX.
Skrip kita: `scripts/gen-sfx.mjs`. Katalog: `public/sfx/sfx-index.json` (ringkas, untuk memilih) dan `public/sfx/sfx-detail.json` (lengkap, untuk dipakai).

Sumber:
- https://elevenlabs.io/docs/overview/capabilities/sound-effects
- https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert
- https://elevenlabs.io/docs/help-center/product/core-capabilities/sound-effects/how-do-i-prompt-for-sound-effects.md
- https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform.md
- https://elevenlabs.io/pricing/api

## 1. Menulis prompt
- Satu SFX = satu kejadian. Deskripsikan **aksi + material/tempat + suasana**, bukan kategori luas.
  - Bagus: "Glass shattering on concrete", "Heavy wooden door creaking open", "Footsteps on gravel approaching slowly".
  - Hindari: "glass", "a sound", atau satu kalimat berisi banyak kejadian ("door opens, footsteps, then thunder"). Buat terpisah lalu gabungkan di editor/Remotion.
- Jumlah pengulangan tidak dijamin diikuti ("triangle hit 4 times" tidak selalu benar). Atur lewat `duration_seconds`.
- Istilah audio yang dikenali: Impact, Whoosh, Braam (hit sinematik besar), Glitch (transisi), Drone, One-shot, Loop, Ambience.
  - Tambahkan "one-shot" bila butuh satu hit tanpa loop. Untuk loop pakai parameter `loop: true`, bukan kata "loop" di prompt.
- Tambah detail secukupnya: "high-quality, professionally recorded ..., sound effects foley". Terlalu panjang justru tidak membantu.
- Model v3 mengikuti prompt multi-bagian lebih baik dan lebih bagus untuk suara vokal/musikal. Bandingkan v2 vs v3 pada prompt kita sendiri.
- Templat yang kami pakai (saran sendiri, bukan dari dokumentasi): `[material/objek] [aksi] [tempat], [suasana], no music`.

## 2. Parameter API (`POST https://api.elevenlabs.io/v1/sound-generation`)
| Parameter | Catatan |
|---|---|
| `text` | wajib |
| `duration_seconds` | 0,5 s sampai 30 s (halaman API). Halaman overview menulis 0,1 s: **tidak konsisten**, pegang 0,5 s. Kosong = model menebak durasi |
| `prompt_influence` | 0 sampai 1, default 0,3. Lebih tinggi = lebih literal dan lebih sedikit variasi. Kami pakai 0,5 |
| `loop` | boolean, loop mulus |
| `model_id` | `eleven_text_to_sound_v2` (default, **deprecated, dihapus 1 Maret 2027**) atau `eleven_text_to_sound_v3` |
| `output_format` (query) | default `mp3_44100_128`. WAV/PCM 44,1 kHz butuh plan Pro ke atas |
| header | `xi-api-key` |

**TODO:** `scripts/gen-sfx.mjs` belum mengirim `model_id` sehingga memakai v2. Set `model_id: "eleven_text_to_sound_v3"` untuk SFX baru dan uji ulang hasilnya sebelum mengganti yang lama.

Batas: maks 30 detik per generasi. Konkurensi SFX: Free 4, Starter 4, Creator 6, Pro 6, Scale 8.

## 3. Biaya dan lisensi komersial (PENTING untuk monetisasi)
- **Teramati di plan Starter kami (2026-11-25): SFX 0,5 detik = 5 kredit (sekitar 10 per detik)**, lebih murah dari 40 kredit per detik di dokumentasi. Saldo dilacak otomatis (`docs/usage/`, `scripts/usage-report.mjs`); saldo API terlambat sekitar 20 detik.
- Harga daftar API: sekitar $0,12 per menit audio SFX (halaman pricing API). Overview menulis 40 kredit per detik bila durasi ditentukan. Dua satuan ini tidak berhasil didamaikan. SFX pendek kita (0,5 sampai 1,5 detik) murah.
- **Plan Free tidak punya lisensi komersial** dan wajib atribusi ("elevenlabs.io" atau "11.ai" di judul).
- **Semua plan berbayar memuat lisensi komersial**, selama tidak memakai layanan Beta. Konten yang dibuat saat berlangganan boleh dipakai komersial tanpa batas waktu.
- Konten yang dibuat di luar masa langganan berbayar tidak boleh dipakai komersial.
- Halaman pricing menyebut SFX "royalty-free". Syarat khusus layanan ada di https://elevenlabs.io/service-specific-terms (belum dibaca). Ini bukan nasihat hukum.
- **Tindakan:** pastikan SFX video yang akan dimonetisasi dibuat saat plan berbayar aktif. Catat plan yang dipakai di `public/sfx/sfx-detail.json` (field `created`) bila perlu.

## 4. Perpustakaan SFX yang konsisten dan reusable
- Selalu set `duration_seconds`, `prompt_influence`, `model_id`, dan `output_format` secara eksplisit.
- Satu prompt template per kategori, satu kejadian per file.
- **Katalog dipecah dua** supaya tidak jadi ribuan baris:
  - `sfx-index.json`: `id`, `tags`, `mood`, `fit` (cocok untuk apa), `dur`. Dibaca AI untuk memilih.
  - `sfx-detail.json`: `file`, `prompt`, `volume`, `note`, `source`, `created`. Dibaca hanya untuk id terpilih (komponen `src/shared/components/Sfx.tsx` mengambil dari sini).
  - Bila index mencapai ratusan item, pecah per kategori (`sfx-index-ui.json`, `sfx-index-impact.json`, ...) tanpa mengubah format.
- Pakai SFX hemat. Impact besar cukup 1 sampai 2 kali per video agar tetap terasa. Volume SFX jangan menutupi voice (lihat `volume` di detail).
