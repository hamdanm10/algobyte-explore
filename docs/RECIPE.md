# Resep aktif (titik awal setiap video baru)

Dibaca oleh `/create-video` SEBELUM merancang video; diperbarui oleh `/analyze-video` dan oleh masukan user.
Setiap video = resep ini + **maksimal 1-2 perubahan yang diuji** (ditulis di "Antrian eksperimen" dan di log).
Data mentah per video: `docs/production-log.jsonl` (satu baris JSON per video, pengaturan + metrik). Cerita/diagnosis: `docs/PERFORMANCE.md`.

Label asal tiap pengaturan:
- **[user]** = keputusan/preferensi user, langsung berlaku tanpa menunggu data. Hanya diubah bila user minta.
- **[terbukti N]** = didukung data di N video (aturan keputusan di bawah).
- **[hipotesis]** = pilihan sementara, belum ada data cukup.

## 1. Identitas tetap (tidak diuji, tidak diubah tanpa izin user)
- Watermark `<Watermark />` kiri atas, opacity 0,4 **[user]**. Thumbnail tanpa watermark **[user]**.
- Bahasa Indonesia, nada narator penasaran dan santai, angka resmi diverifikasi, **sumber data tampil di akhir** **[user]**.
- Struktur: hook pertanyaan/kontras di detik pertama, isi, penutup ajakan komentar **[hipotesis]**.
- 1080x1920, 30 fps, di bawah 60 detik.

## 2. Pengaturan yang dioptimalkan oleh data
| Dimensi | Nilai aktif | Asal | Diganti terakhir |
|---|---|---|---|
| Tempo voice | 2,6-3,0 kata/dtk (naskah), jeda antar segmen 0,12 dtk, jeda dalam segmen maks 0,25 dtk | **[user]** "jangan banyak jeda" | 005 |
| Voice | ElevenLabs `eleven_v4`, voice W8aRyPTvOnlcvcu0uYX3, `speed` 1,15, lalu `atempo` 1,1 + potong jeda (gratis) | [hipotesis] (004, 005) | 005 |
| Durasi | 40-45 dtk, 100-110 kata, 5 segmen | [hipotesis] | 005 |
| Hook | visual langsung + pertanyaan yang jawabannya baru muncul di tengah | [hipotesis] (005) | 005 |
| Penutup | pertanyaan pilihan sederhana untuk komentar ("barat atau timur?") | [hipotesis] (004, 005) | 005 |
| Format isi | perbandingan yang terasa dekat (overlay/penggaris, kontras angka) | [hipotesis] H2 | 005 |
| Topik | data wilayah/penduduk Indonesia | [hipotesis] H1 (2 video lama) | - |
| Tema terang/gelap | terang | [hipotesis] (002, 005) | 005 |
| Jenis peta | bebas, tidak boleh sama dengan video sebelumnya (2D datar, 3D miring, globe) | belum diuji | - |
| Caption | per kata, tengah bawah (y sekitar 1400), putih stroke gelap, sorot kuning | [hipotesis] (002-005) | 002 |
| Musik | `calm-explainer-01`, volume katalog (sekitar 0,10) | [hipotesis] | 002 |
| SFX | 8-14 cue: whoosh tiap pindah kamera, pop untuk label, impact di klimaks, sting di penutup | [hipotesis] | 005 |
| Judul | pertanyaan/klaim + angka atau tempat yang dikenal, maks sekitar 60 karakter | [hipotesis] | 005 |
| Upload | **jeda minimal 2-3 hari antar video**, catat jam upload | **[user-disarankan]** (001/002/004 tayang di hari yang sama, data bercampur) | - |

## 3. Selalu divariasikan (wajib beda tiap video, agar tidak terlihat template)
Palet warna, pasangan font, cara reveal/animasi khas, dekorasi latar. Cek kolom "Gaya visual" di `docs/VIDEOS.md` dan field `visual` di log.
Dimensi di bagian 2 boleh SAMA antar video (justru itu yang dioptimalkan); yang divariasikan adalah "kulit" visualnya.

## 4. Antrian eksperimen (1-2 per video, urut prioritas)
| Video | Yang diuji (satu variabel) | Pembanding | Metrik utama | Status |
|---|---|---|---|---|
| 005 | tempo cepat + hook visual langsung + format penggaris | 001-004 | Viewed vs Swiped Away, % rata-rata ditonton | menunggu upload |
| 006 | (diisi saat `/create-video`) | resep di atas | | |
Ide berikutnya: durasi 35 dtk vs 42 dtk; tema gelap vs terang dengan topik serupa; judul pertanyaan vs judul angka; topik ekonomi (menguji ulang H1).

## 5. Aturan keputusan (dijalankan oleh `/analyze-video`)
Metrik utama Shorts: **Viewed vs Swiped Away** (pembuka) dan **% rata-rata ditonton** (isi). Pendukung: views hari ke-3/4, subscriber didapat, komentar.
- Perubahan yang diuji **lebih baik** dari median video sebelumnya (Viewed vs Swiped Away +5 poin atau lebih, atau % ditonton +8 poin atau lebih): label naik ke [terbukti 1]. Bila terulang di video lain: [terbukti 2] dan **masuk resep tetap**.
- **Lebih buruk** dengan selisih yang sama: kembalikan ke nilai sebelumnya, catat di "Riwayat" sebagai "sudah dicoba, kurang".
- Selisih kecil: tetap [hipotesis], boleh diuji lagi dengan topik lain.
- Masukan user selalu menang atas data; data hanya mengusulkan perubahan, user memutuskan di GATE 1.
- Jangan bandingkan video yang tayang di hari yang sama tanpa catatan; bandingkan di umur yang sama (hari ke-3/4 atau ke-28).

## 6. Riwayat perubahan resep (terbaru di atas)
- 2026-11-26 (005): tempo dipercepat dan jeda dipangkas atas permintaan user; resep pertama ditulis dari catatan 001-005.
