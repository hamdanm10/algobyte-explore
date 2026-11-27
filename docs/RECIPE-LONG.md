# Resep aktif VIDEO PANJANG (titik awal setiap video panjang baru)

Dibaca oleh `/create-long-video` SEBELUM merancang video; diperbarui oleh `/analyze-video` dan oleh masukan user.
**Khusus video panjang (16:9).** Resep Shorts ada di `docs/RECIPE.md` dan TIDAK berlaku di sini, kecuali identitas channel yang disebut di bagian 1.
Produksi: **1 video panjang per minggu**, tayang **Sabtu 19.00 WIB** [user]. Shorts tetap jalan terpisah (2 per hari, `/create-short-video`); kedua alur tidak saling membuat konten secara otomatis.
Data mentah: `docs/production-log.jsonl` (baris dengan `"format": "long"`). Cerita/diagnosis: `docs/PERFORMANCE.md` bagian "Video panjang".

Label asal: **[user]** = keputusan user (hanya diubah bila user minta) · **[terbukti N]** = didukung data N video · **[hipotesis]** = sementara.

## 1. Identitas tetap (sama dengan Shorts, tidak diuji)
- Watermark `<Watermark />` kiri atas, opacity 0,4, layer paling atas **[user]**; posisi 16:9 di `docs/VIDEO-BUILD.md` bagian "Video panjang". Thumbnail tanpa watermark **[user]**.
- Bahasa Indonesia, nada narator penasaran dan santai, angka resmi diverifikasi, **sumber data tampil di akhir** **[user]**.
- Selalu **map animation** sebagai visual utama; boleh dicampur grafik, garis waktu, foto/arsip berlisensi bebas **[user]**.
- 1920x1080, 30 fps.

## 2. Pengaturan yang dioptimalkan oleh data
| Dimensi | Nilai aktif | Asal |
|---|---|---|
| Topik | dikembangkan dari **Short dengan performa terbaik** (views/komentar tertinggi di log atau `channel-stats.mjs`) yang belum pernah dijadikan video panjang; video panjang dari topik baru baru dicoba setelah ada beberapa video panjang berdata | **[user]** 2026-11-27 |
| Voice | **dibuat user sendiri di Google AI Studio** (Gemini TTS, gratis): Claude menyerahkan naskah siap tempel, user menyimpan audio di project, Claude memprosesnya (`scripts/import-voice.mjs`). Tidak memakai ElevenLabs | **[user]** 2026-11-27 |
| Model + voice AI Studio | dipilih di GATE 1 video panjang pertama lalu dikunci di sini agar konsisten antar video (kandidat narator: Charon "Informative", Sadaltager "Knowledgeable", Sulafat "Warm", Achird "Friendly"); style instruction sama di semua bab | belum dipilih |
| Durasi | 6-10 menit (video pertama: 6-8 menit), naskah sekitar 900-1.400 kata | [hipotesis] |
| Tempo | 2,2-2,6 kata/dtk, bercerita (lebih santai dari Shorts); jeda antar bab 0,6 dtk (`timeline.gapSeconds` di `voice-script.json`) | [hipotesis] |
| Struktur | hook 20-30 dtk (pertanyaan besar + janji jawaban + cuplikan visual terbaik) · 4-6 bab, tiap bab dibuka pertanyaan baru dan ada "hal baru" tiap 60-90 dtk · penutup: ringkasan, pertanyaan komentar, sumber data | [hipotesis] |
| Segmen audio | **satu file per bab** (`hook`, `b1`...`bN`, `outro`), maksimal sekitar 2 menit per file supaya mudah diulang bila ada salah baca | [hipotesis] |
| Caption | **tanpa caption per kata di video**; `.srt` wajib; teks penegas di layar hanya untuk angka/istilah kunci | [hipotesis] |
| Musik | 2-3 trek katalog berganti per babak (bukan satu trek 60 dtk diulang 10 menit), volume sekitar 0,08, diredam saat narasi padat | [hipotesis] |
| SFX | hemat: transisi bab, reveal angka penting, sekitar 2-4 cue per menit | [hipotesis] |
| Judul | frasa yang dicari orang + janji jawaban, maks sekitar 70 karakter (H3: pencarian menggerakkan video terlaris) | [hipotesis] |
| Thumbnail | 1280x720, peta + 1 angka/kontras besar, maks 4 kata, tanpa watermark; buat 2-3 opsi untuk dipilih user | [hipotesis] |
| Chapters | wajib di deskripsi: `00:00` pertama, minimal 3 bab, tiap bab minimal 10 dtk (aturan YouTube), dihitung dari `buildTimeline` | **[user]** 2026-11-27 (rancangan disetujui) |
| Jadwal upload | **Sabtu 19.00 WIB**, 1 per minggu (dijadwalkan manual di YouTube Studio; tanggal+jam di `metadata.md`) | **[user]** 2026-11-27 |
| Ekspor | `.mp4`, `.srt`, `thumbnail.png`, `metadata.md` ke `D:\Hamdan\Contents\algobyte-explore\videos\long\NNN-nama\` | **[user]** 2026-11-27 |

## 3. Gaya visual
- Kulit visual (palet + pasangan font + elemen khas) wajib beda dari **5 video panjang terakhir** dan dari Short yang tayang di minggu yang sama.
- Variasi DI DALAM video: tiap bab boleh ganti jenis visual (peta 2D, globe, peta titik, grafik, garis waktu) agar 10 menit tidak monoton; palet dan font tetap satu.
- Teknik yang bisa dipakai ulang ada di `docs/VIDEO-BUILD.md`.

## 4. Antrian eksperimen
Satu video per minggu, jadi satu kelompok = **1 variabel untuk 3-4 video panjang (3-4 minggu)**, dibandingkan dengan kelompok sebelumnya.

| Kelompok | Video | Yang diuji | Pembanding | Metrik utama | Status |
|---|---|---|---|---|---|
| LK0 | L001-L003 | baseline (resep di atas) | - | baseline | belum mulai |
Ide berikutnya: durasi 6 vs 10 menit; hook dengan cuplikan hasil akhir vs pertanyaan saja; satu voice AI Studio vs voice lain.

## 5. Aturan keputusan (dijalankan oleh `/analyze-video`)
Metrik utama video panjang: **klik** = CTR impresi thumbnail (hanya dari YouTube Studio, ditempel user bila diminta) dan **isi** = rata-rata durasi ditonton + % ditonton + retensi detik ke-30 (`yt-analytics.mjs --retention`). Pendukung: views d7/d28, subscriber didapat per 1.000 views, sumber trafik (pencarian vs disarankan vs Shorts), komentar.
- Dinilai di **d7** (hari ke-7) dan **d28**, bukan d3: video panjang tumbuh lebih lambat dari Shorts.
- Kurang dari 3 video panjang berdata: semua tetap [hipotesis]. Bandingkan median kelompok; selisih kecil tetap [hipotesis].
- Jangan bandingkan angka video panjang dengan Shorts (views, % ditonton) secara langsung; yang boleh dibandingkan lintas format hanya subscriber per 1.000 views.
- Masukan user selalu menang atas data.

## 6. Riwayat perubahan resep (terbaru di atas)
- 2026-11-27: resep video panjang pertama ditulis [user]: 1 per minggu Sabtu 19.00 WIB, topik dari Short terbaik, voice dibuat user di Google AI Studio, ekspor ke `videos\long\`.
