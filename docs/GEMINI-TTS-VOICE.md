# Google AI Studio (Gemini TTS): praktik terbaik voice

Dibaca dari dokumentasi resmi pada 2026-11-25. Pakai ini sebelum membuat/mengubah voice.
Skrip kita: `scripts/gen-voice.mjs <folder-video>` (konfigurasi per video di `<folder-video>/voice-script.json`).

Sumber:
- https://aistudio.google.com/docs/speech-generation (tadinya ai.google.dev/gemini-api/docs/speech-generation, redirect 301)
- https://aistudio.google.com/docs/models/gemini-3.8-flash-tts
- https://aistudio.google.com/docs/models/gemini-3.8-flash-lite-tts

## 0. Preferensi tempo user (2026-11-26, berlaku untuk semua video)
User menilai voice video sebelumnya **terlalu banyak jeda**. Mulai video 005 tempo dibuat **agak cepat dan rapat**:
- Target **2,7-3,0 kata/detik** (sebelumnya 2,4). Naskah 110-120 kata, sekitar 40-45 detik.
- ElevenLabs: `voiceSettings.speed` **1,15-1,2** (1,0 terlalu lambat). Gemini: `style` "speaking rapidly" (uji dulu).
- **Jeda antar segmen dipersingkat:** `buildTimeline(voice, ORDER, { gapSeconds: 0.12, voiceLead: 1 })` (default lama 0,45 dtk + 3 frame terasa seperti jeda tiap segmen). Segmen lebih sedikit dan lebih panjang (4-6 segmen), jangan satu segmen per kalimat pendek.
- Hindari elipsis ("...") dan koma berlebihan di naskah, karena TTS menjadikannya jeda panjang. Pakai satu titik/koma saja.
- `voice-qa.mjs`: anggap hening di dalam segmen di atas 0,4 dtk sebagai masalah; bila ada, rapatkan naskah atau naikkan `speed`.

## 1. Model
| Model | Untuk |
|---|---|
| `gemini-3.8-flash-tts` | Flagship: narasi studio, dialog multi-speaker, pelafalan sulit. 130+ bahasa |
| `gemini-3.8-flash-lite-tts` | Cepat dan murah untuk produksi massal. 101 bahasa |
| `gemini-2.5-flash-preview-tts` | Lama. **Yang kami pakai sekarang** (lihat bagian 6) |
Bahasa Indonesia didukung dan dideteksi otomatis (tidak perlu kode `id-ID`). API wajib `v1beta`. Input maks 8.192 token, output maks 16.384 token (sekitar 11 menit audio; audio = 25 token per detik).

## 2. Cara mengatur gaya TANPA dibacakan
Teks yang dikirim dianggap **transkrip yang dibaca apa adanya**. Instruksi biasa di dalam teks bisa **ikut diucapkan**.
- Resmi (3.8): taruh gaya di anotasi, bukan di teks:
  `{"type":"text","text":"<transkrip>","annotations":[{"type":"speech_metadata","style":"cheerful and friendly"}]}` lewat Interactions API.
- Contoh `style`: "cheerful and friendly", "speaking rapidly", "speaking slowly", "high pitch, cheerful and excited inflection".
- Jeda/ekspresi di titik tertentu pakai tag dalam kurung siku sudut, tetap berbahasa Inggris walau teks Indonesia: `<short pause>`, `<long pause>`, `<breath>`, `<laugh>`, `<gasp>`. Hanya suara manusia, bukan efek suara.
- Penekanan: huruf kapital ("SANGAT penting"). Tempo: `style` + tanda baca (koma, `--`, `...`).
- Jangan taruh aksen, usia, gender, atau nama di `style`. Aksen dipilih lewat voice (Extended Voice Library atau Voice Design).
- Awalan lama seperti "Say cheerfully: ..." **bisa dibacakan**. Uji dengan `style` kosong dulu.

## 3. Voice prebuilt (30)
Zephyr Bright, Puck Upbeat, Charon Informative, Kore Firm, Fenrir Excitable, Leda Youthful, Orus Firm, Aoede Breezy, Callirrhoe Easy-going, Autonoe Bright, Enceladus Breathy, Iapetus Clear, Umbriel Easy-going, Algieba Smooth, Despina Smooth, Erinome Clear, Algenib Gravelly, Rasalgethi Informative, Laomedeia Upbeat, Achernar Soft, Alnilam Firm, Schedar Even, Gacrux Mature, Pulcherrima Forward, Achird Friendly, Zubenelgenubi Casual, Vindemiatrix Gentle, Sadachbia Lively, Sadaltager Knowledgeable, Sulafat Warm.
- Kandidat narator edukasi energik (penilaian sendiri dari deskripsi): Puck, Laomedeia, Fenrir, Sadachbia, Zephyr, Achird, Leda. Narator tenang: Sulafat, Charon, Rasalgethi.
- Voice aktif channel ditentukan di `docs/RECIPE.md` (sekarang ElevenLabs, bukan Gemini). Kore (Firm) dipakai 001-002 dan tetap jadi cadangan gratis. Satu channel sebaiknya konsisten satu voice.
- Voice Indonesia khusus bisa dicari lewat `GET /v1beta/voices` (filter `language_code`). Belum diperiksa.

## 4. Format output
WAV 24 kHz mono 16-bit (non-streaming 3.8). Model lama mengembalikan PCM mentah tanpa header, itu yang `gen-voice.mjs` konversi dengan ffmpeg (buang hening awal/akhir, loudnorm -16 LUFS, 44,1 kHz).

## 5. Harga dan kuota
- 3.8-flash-tts (sampai 31 Des 2026): input $0,50 per 1 juta token, output audio $9 per 1 juta token (sekitar $0,00225 per 10 detik). **Naik dua kali lipat per 1 Jan 2027.** Ada tier gratis.
- Batas rate tidak tertulis di halaman ini. Kami pernah kena `429` (kuota) di 3.8 saat membuat 7 segmen beruntun, makanya skrip memberi jeda 7 detik per permintaan.
- Syarat lisensi/penggunaan audio hasil Gemini untuk monetisasi **belum diteliti**. Cek Gemini API Additional Terms sebelum monetisasi.

## 6. Jebakan dan temuan kami
- **Model 3.8 membacakan awalan instruksi** saat kami pakai awalan gaya di dalam teks: 7 segmen jadi 116 detik (harusnya sekitar 50 detik). Karena itu dipindah ke model 2.5, yang tidak membacakannya.
- Hasil verifikasi transkrip model 2.5 (video 001, 7 segmen, 2026-11-25): semua segmen membaca naskah dengan benar, **tidak ada instruksi gaya yang terbaca**. Angka terbaca benar (transkriber menulisnya sebagai digit). Satu catatan kecil: "Sumatera" terdengar/terdeteksi sebagai "Sumatra" di satu segmen.
- Konsistensi antar-panggilan: pakai voice dan string `style` yang sama di semua segmen. Jangan kirim blok persona panjang dan jangan tulis "pertahankan timbre yang sama" (justru menambah drift). Untuk persona tetap pakai Voice Design lalu simpan `voice_...` (maks 200 per project).
- Tulis angka dengan kata ("dua belas koma empat juta") agar tidak salah baca.
- Segmen dipotong per kalimat/bagian supaya sinkron dengan animasi. Jeda antar-kalimat diukur otomatis (`voice.json`, field `pauses`) lewat `ffmpeg silencedetect` dan dipakai untuk menentukan kapan angka/fakta muncul.
- Skrip verifikasi: `node --env-file=.env scripts/verify-voice.mjs <folder-video>` mentranskripsi tiap wav lewat `gemini-flash-latest` dan membandingkan dengan naskah. (`gemini-2.5-flash` terdaftar tapi menjawab 404.)

## 7. Rencana perbaikan
- Coba `gemini-3.8-flash-tts` dengan **anotasi `speech_metadata`** (Interactions API) atau tanpa `style`, lalu bandingkan kualitas dengan 2.5. Skrip saat ini memakai `generateContent` biasa dan belum mendukung anotasi.

## 8. Alternatif: ElevenLabs TTS (dipakai video 003, 2026-11-25)
Dipakai saat kuota Gemini preview habis (HTTP 429 setelah beberapa permintaan) dan karena user tidak suka timbre voice pertama.
- `gen-voice.mjs` mendukung `"provider": "elevenlabs"` di `voice-script.json`: `model` `eleven_multilingual_v2`, `voiceId`, `voice` (nama), `voiceSettings` (`stability` 0,45, `similarity_boost` 0,8, `style` 0,3, `speed`). Key: `ELEVEN_LABS_API_KEY`. Keluaran `pcm_24000` masuk pipeline ffmpeg yang sama. Kredit dicatat ke `docs/usage/elevenlabs.jsonl` (`action: tts`, sekitar 0,4 kredit per karakter di plan Starter: 655 karakter = 262 kredit).
- Daftar voice akun: `GET /v2/voices?page_size=100` (header `xi-api-key`). Voice Indonesia: honeypie (perempuan muda), Putra (pria, bersemangat), Meraki (perempuan, tenang), Mahaputra (pria, formal), DK (pria, dokumenter), Uncle Mizan (pria, matang), Depa.
- `speed` 1,0 membuat tempo lambat (honeypie 1,8 kata/dtk). 1,15 pada honeypie = 2,1 kata/dtk; Putra 1,1 = 2,5 kata/dtk. Naskah 105 kata: 50 dtk (honeypie) vs 42 dtk (Putra).
- ElevenLabs hampir tanpa hening antar kalimat, jadi `pauses` di `voice.json` bisa kosong; ambil timing dari kata Whisper (`captions.json`). Loudness antar segmen bisa selisih 3-4 LU: ratakan dengan gain per segmen ke -16 LUFS + `alimiter=limit=0.84` (tanpa kredit).
- Whisper kadang salah di kata pendek (mis. "muat" jadi "Mwad", "1,4" jadi "1.4"): periksa `captions.json` dan betulkan manual.
