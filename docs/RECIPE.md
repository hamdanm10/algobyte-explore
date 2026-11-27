# Resep aktif SHORTS (titik awal setiap Short baru)

Dibaca oleh `/create-short-video` SEBELUM merancang video; diperbarui oleh `/analyze-video` dan oleh masukan user.
**Khusus Shorts (9:16).** Video panjang memakai `docs/RECIPE-LONG.md`; resep di file ini tidak berlaku untuk video panjang.
Produksi: **batch 2 video per hari**, tayang **18.45 dan 19.45 WIB**. Setiap video = resep ini + perubahan yang sedang diuji oleh **kelompok eksperimen** (bagian 4).
Topik dan tema: `docs/TOPICS.md`.
Data mentah per video: `docs/production-log.jsonl` (satu baris JSON per video, pengaturan + metrik; Shorts = `"format": "short"`). Cerita/diagnosis: `docs/PERFORMANCE.md`.

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
| Jadwal upload | **2 video/hari, 18.45 dan 19.45 WIB** (dijadwalkan di YouTube Studio; tanggal+jam ditulis di `metadata.md`); slot dicatat di log (`uploadSlot`) | **[user]** 2026-11-27; Claude boleh mengusulkan jam lain dari data, user yang memutuskan | - |
| Ekspor | `.mp4`, `.srt` (bahasa Indonesia), `thumbnail.png`, `metadata.md` ke `D:\Hamdan\Contents\algobyte-explore\videos\short\NNN-nama\` | **[user]** 2026-11-27 | - |

## 3. Gaya visual: referensi dari data + variasi
- **Selalu map animation** (peta sebagai visual utama; boleh dicampur grafik lain). Di dalam itu, gaya yang benar-benar baru selalu boleh **[user]**.
- **Gaya referensi:** video yang views/retensinya jauh di atas median (aturan bagian 5) masuk tabel di bawah. Video berikutnya boleh memakai **keluarga gaya** itu (jenis peta, tema, gerak kamera, cara reveal), tetapi "kulit"-nya wajib berbeda.
- **Kulit visual wajib beda dari 10 Short terakhir:** kombinasi palet + pasangan font + elemen khas (dekorasi/reveal) tidak boleh sama dengan salah satu dari 10 Short terakhir di `docs/VIDEOS.md`/log. Dalam satu batch harian, 2 video berbeda kulitnya.
- Sebagian batch boleh mencoba gaya baru (porsi eksplorasi, sama seperti topik di `docs/TOPICS.md`).

| Gaya referensi | Dari video | Alasan (angka) | Dipakai lagi di |
|---|---|---|---|
| (belum ada; diisi `/analyze-video` setelah ada data d3) | | | |

## 4. Antrian eksperimen (per KELOMPOK, bukan per video)
Dengan 2 video/hari, hasil hari ke-3 sebuah video baru ada setelah sekitar 6 video berikutnya dibuat. Karena itu satu eksperimen = **1-2 variabel yang sama untuk satu kelompok 6-8 video (3-4 hari)**, dibandingkan dengan kelompok sebelumnya; diputuskan di analisis mingguan.
Topik/pilar boleh berbeda di dalam kelompok (dicatat di log), tetapi variabel yang diuji harus konsisten di seluruh kelompok.

| Kelompok | Video | Yang diuji | Pembanding | Metrik utama | Status |
|---|---|---|---|---|---|
| K0 | 001-005 | campuran (variabel bercampur; tempo cepat mulai 005) | - | baseline | menunggu data d3 |
| K1 | 006-0xx (batch pertama) | (diisi saat `/create-short-video` batch pertama) | K0 | | |
Ide berikutnya: durasi 35 dtk vs 42 dtk; tema gelap vs terang; judul pertanyaan vs judul angka; slot jam (otomatis terukur dari `uploadSlot`).

## 5. Aturan keputusan (dijalankan oleh `/analyze-video`)
Metrik utama Shorts: **pembuka** = Viewed vs Swiped Away bila user menempelnya, kalau tidak proksi otomatis `engagedPct` (engagedViews / views) + retensi 10% pertama; **isi** = % rata-rata ditonton. Bandingkan antar kelompok dengan metrik pembuka yang SAMA jenisnya. Pendukung: views hari ke-3/4, subscriber didapat, komentar.
- Bandingkan **median kelompok** dengan median kelompok sebelumnya (minimal 5 video berdata per kelompok; kurang dari itu tetap [hipotesis]).
- Kelompok yang diuji **lebih baik** (median metrik pembuka +5 poin atau lebih, atau median % ditonton +8 poin atau lebih): label naik ke [terbukti 1]. Bila terulang di kelompok lain: [terbukti 2] dan **masuk resep tetap**.
- **Gaya referensi / sekuel topik:** video dengan views d3 di atas 2x median 10 video terakhir DAN Viewed vs Swiped Away tidak di bawah median.
- **Slot jam:** setelah minimal 2 minggu, bandingkan median views d3 per slot (18.45/19.45); usulkan jam lain ke user hanya bila selisihnya konsisten.
- **Lebih buruk** dengan selisih yang sama: kembalikan ke nilai sebelumnya, catat di "Riwayat" sebagai "sudah dicoba, kurang".
- Selisih kecil: tetap [hipotesis], boleh diuji lagi dengan topik lain.
- Masukan user selalu menang atas data; data hanya mengusulkan perubahan, user memutuskan di GATE 1.
- Bandingkan di umur yang sama (d3 dengan d3, d28 dengan d28). Video dalam satu hari saling berebut penonton: bandingkan per kelompok, bukan video satu lawan satu.

## 6. Riwayat perubahan resep (terbaru di atas)
- 2026-11-27: Shorts jadi 2 video/hari (18.45, 19.45 WIB; slot 20.45 dihapus) karena mulai ada 1 video panjang per minggu (`docs/RECIPE-LONG.md`) [user]; batch = 1 eksploitasi + 1 eksplorasi; kelompok eksperimen 6-8 video; ekspor ke `videos\short\`.
- 2026-11-26: jadwal 3 video/hari (18.45, 19.45, 20.45 WIB) dan ekspor .srt [user]; eksperimen dinilai per kelompok mingguan; gaya visual boleh mengikuti gaya referensi dari data, kulit wajib beda dari 10 video terakhir; aturan "jeda 2-3 hari" dihapus.
- 2026-11-26 (005): tempo dipercepat dan jeda dipangkas atas permintaan user; resep pertama ditulis dari catatan 001-005.
