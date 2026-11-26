# Performa video dan pelajaran

Diisi oleh `/analyze-video` (mingguan). `/create-video` tahap 1 membaca bagian "Pelajaran aktif" sebagai hipotesis. Keputusan resep ada di `docs/RECIPE.md`, skor topik di `docs/TOPICS.md`, angka per video di `docs/production-log.jsonl`.
Statistik publik otomatis: `node --env-file=.env scripts/channel-stats.mjs` (snapshot di `docs/performance/snapshots.jsonl`).
Metrik privat (Viewed vs Swiped Away, retensi, sumber trafik) ditempel user dari YouTube Studio saat analisis.

## Pelajaran aktif
Aturan: maksimal 10 butir; perbarui atau hapus yang usang. Tiap butir diberi tingkat keyakinan dan jumlah video yang mendukungnya.
**Status data: baru 3 video (2 lama + 001). Semua butir di bawah adalah HIPOTESIS, bukan aturan.** Jangan menyimpulkan dari kurang dari 5 video.

- H1 (rendah, 2 video): topik jumlah penduduk/wilayah per pulau (19.228 views) jauh lebih laku daripada ekonomi/gaji kota (3.354 views). Rasio like hampir sama (2,4% vs 2,7%), jadi bedanya ada di jangkauan feed, bukan kualitas yang dirasakan penonton. Penyebab belum diketahui: topik, pembuka, durasi (1:18 vs 0:53), atau waktu upload. Butuh data Viewed vs Swiped Away untuk memisahkannya.
- H2 (rendah): format "peringkat/perbandingan data Indonesia di peta" relatable; uji lagi dengan topik berbeda sebelum menjadikannya pola.

## Analisis mingguan (terbaru di atas)
Jadwal: sekali seminggu, mencakup semua video berumur 3+ hari yang `metrics.d3`-nya kosong dan video berumur sekitar 28 hari (`d28`). Analisis pertama: **2026-11-28/29** (001, 002, 004; plus 003 dan 005 bila sudah tayang 3 hari).
(belum ada)

## Jadwal awal K0 (sebelum sistem mingguan)
| Video | Upload | Analisis 1 (hari ke-3/4: Shorts bisa naik sampai hari ke-4) | Analisis 2 (sekitar hari ke-28: dorongan algoritma meluruh sekitar 28-30 hari) |
|---|---|---|---|
| 001 Top 5 Provinsi Penduduk Terbanyak [zDx3ss62WdE] | 2026-11-25 | 2026-11-28/29 | sekitar 2026-12-23 |
| 002 Kepadatan Provinsi [CVpQYLpZKEQ] | 2026-11-25 | 2026-11-28/29 | sekitar 2026-12-23 |
| 003 Jawa Muat Berapa Kali | belum terlihat di API per 2026-11-26 (isi tanggal saat tayang) | hari ke-3/4 setelah tayang | sekitar hari ke-28 |
| 004 Total Bobotoh Persib [ecypH7HcFM8] | 2026-11-25 | 2026-11-28/29 | sekitar 2026-12-23 |
| 005 Sabang–Merauke di Eropa | belum diupload (isi tanggal saat upload) | hari ke-3/4 setelah upload | sekitar hari ke-28 |

Catatan 2026-11-26: `/analyze-video` dijalankan saat umur 0,8-0,9 hari, ditunda atas keputusan user. Angka API hari ke-1 (hanya acuan, belum dianalisis): 001 1.308 views (like 1,1%), 002 1.607 views (like 1,1%), 004 1.379 views (like 1,7%, komentar 0,29%). Subscriber 99 ke 101. Ketiganya tayang di hari yang sama, jadi saling bersaing di feed penonton yang sama; perhitungkan saat membandingkan.

## Catatan per batch (terbaru di atas)
Mulai video 006: satu blok singkat per batch harian (tanggal tayang, video + slot, kelompok, yang diuji). Blok per video di bawah = kelompok K0 (001-005).

### 005 Sabang–Merauke di Eropa (42,5 dtk)
- Status: dikemas ke D:, menunggu upload.
- Hal yang diuji: topik wilayah/geografi (H1) dengan format **overlay skala/penggaris** antarbenua, bukan peringkat (H2 tidak dipakai, jadi pembanding); pembuka visual langsung (globe Eropa + penggaris berhenti di "?") dengan pertanyaan "sampai mana?"; **voice tempo cepat** (speed 1,15 + atempo 1,1, jeda antar segmen 0,12 dtk; preferensi user) dibanding 001-004 yang lebih lambat; durasi lebih pendek (42,5 dtk); penutup ajakan komentar "barat atau timur?"; gaya terang atlas + globe 3D berputar.
- Yang dilihat nanti: Viewed vs Swiped Away dibanding 001-004 (apakah pembuka visual + tempo cepat menahan lebih banyak), % rata-rata ditonton (durasi pendek + tempo cepat: harapan di atas 80%, cek ada loop), titik jatuh retensi (saat globe pindah ke AS/Australia?), jumlah komentar dan isinya (kota asal/barat-timur), sumber trafik, subscriber didapat.

### 004 Total Bobotoh Persib (52,6 dtk)
- Status: tayang 2026-11-25 [ecypH7HcFM8], belum dianalisis (jadwal 2026-11-28/29).
- Hal yang diuji: topik olahraga/komunitas (bukan data wilayah murni) untuk H1; format perbandingan klaim vs data BPS (H2, bukan peringkat); pembuka tanpa angka ("tidak ada yang tahu pasti") dan penutup ajakan komentar; judul berformat klaim ("Klaimnya 22 Juta") dengan catatan jujur klaim klub bukan survei; voice ElevenLabs eleven_v4; gaya papan skor LED gelap.
- Yang dilihat nanti: Viewed vs Swiped Away dibanding 001-003, % rata-rata ditonton, titik jatuh retensi (sebelum atau sesudah stempel "klaim klub"), jumlah komentar (ajakan komentar) dan isinya (angka tandingan, sumber lain, protes soal "klaim"), sumber trafik (apakah komunitas Bobotoh/Persib membagikan), subscriber didapat.

### 003 Pulau Jawa Muat Berapa Kali (44,7 dtk)
- Status: dikemas ke D:, menunggu upload.
- Hal yang diuji: topik wilayah/pulau di luar tema penduduk (H1) dengan format hitung mundur perbandingan (H2, ketiga kalinya setelah 001 dan 002); pembuka pernyataan mengejutkan ("satu provinsi lebih luas dari seluruh Jawa") + kontras dengan 56% penduduk; voice laki-laki ElevenLabs Putra (001 dan 002 memakai Kore perempuan, jadi suara berbeda); durasi lebih pendek (44,7 dtk vs 48,6 dan 55); gaya cetak biru.
- Yang dilihat nanti: Viewed vs Swiped Away dibanding 001 dan 002, % rata-rata ditonton, titik jatuh retensi (apakah bertahan sampai Kalimantan nomor 1), sumber trafik, subscriber didapat, komentar soal "luas wilayah vs daratan" atau pertanyaan kenapa Papua tidak nomor satu.

### 002 5 Provinsi Terpadat (kepadatan per km2) (48,6 dtk)
- Status: tayang 2026-11-25 [CVpQYLpZKEQ], judul "5 Provinsi Terpadat di Indonesia (Jakarta Jauh di Atas Semuanya!)", belum dianalisis (jadwal 2026-11-28/29).
- Hal yang diuji: pembuka kontras angka (16.165 vs 5) langsung di detik pertama (001: pembuka pelan), format hitung mundur peringkat (H2) dengan topik berbeda, caption per kata dan musik tipis (001 tanpa keduanya, jadi variabel bercampur), gaya terang 2D vs gelap 3D.
- Yang dilihat nanti: Viewed vs Swiped Away dibanding 001, % rata-rata ditonton, titik jatuh retensi (apakah penonton bertahan sampai nomor 1), sumber trafik, subscriber didapat, komentar soal "kepadatan vs jumlah penduduk".

### 001 Top 5 Provinsi Penduduk Terbanyak (55 dtk)
- Status: tayang 2026-11-25 [zDx3ss62WdE], belum dianalisis (jadwal 2026-11-28/29).
- Hal yang diuji: pembuka 4 dtk pelan ("280+ juta" + peta melayang), sorotan peta 3D "kertas bertumpuk", tanpa caption dan tanpa musik, ada 6 SFX. Judul upload "penduduk terbanyak" sedangkan overlay/narasi memakai kata "terpadat".
- Yang dilihat nanti: Viewed vs Swiped Away (di bawah 60% = hook lemah), % rata-rata ditonton (70%+ = promosi agresif), titik jatuh di grafik retensi, sumber trafik, subscriber yang didapat.

### Baseline video lama (dibuat manual, data API 2026-11-25)
- Q_wNa5JrUEk "Ternyata Segini Jumlah Penduduk Tiap Pulau di Indonesia!" 1:18, 19.228 views, like 2,4%, komentar 0,17%, sekitar 45 views/hari rata-rata sejak tayang (2025-09-27).
- JfyOhgREXSk "5 Kota dengan UMK Tertinggi di Indonesia!" 0:53, 3.354 views, like 2,7%, komentar 0,24%, sekitar 8 views/hari (2025-10-19).
- Total channel: 99 subscriber, 22.576 views, 2 video. Tidak ada upload selama sekitar 13 bulan sebelum 001.
