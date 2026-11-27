# Strategi topik dan tema konten

Dibaca `/create-short-video` tahap 1 (memilih topik untuk satu batch 2 Short) dan `/create-long-video` tahap 1 (bagian 7); diperbarui `/analyze-video` (skor pilar/angle dari data, ide dari komentar).
Setiap video dicatat `pillar` dan `angle`-nya di `docs/production-log.jsonl`, supaya bisa dipisahkan: yang laku itu **topiknya** atau **cara berceritanya**.

## 1. Pilar konten (tema besar, semuanya map animation)
| Pilar | Contoh | Status data |
|---|---|---|
| `penduduk` | jumlah, kepadatan, pertumbuhan, sebaran | terkuat sejauh ini: video lama 19.290 views (H1, 2 video) |
| `wilayah` | luas, jarak, pulau, batas, zona waktu | 003, 005 menunggu data |
| `indonesia-vs-dunia` | ukuran/penduduk Indonesia dibanding negara/benua lain | 005 sebagian; komentar terpopuler meminta ini |
| `ekonomi` | UMP/UMK, harga, PDRB, kemiskinan | 1 video lama 3.361 views (H1: lebih lemah, belum pasti) |
| `budaya-komunitas` | suku, bahasa, suporter, kuliner | 004 menunggu data |
| `sejarah` | peta lama, kerajaan, pemekaran provinsi | belum dicoba |

## 2. Jenis angle (cara bercerita)
`peringkat` (hitung mundur) · `perbandingan-dekat` (bandingkan dengan yang dikenal: "Jawa vs Rusia", "Sabang–Merauke di Eropa") · `kalau` (skenario: "kalau penduduk Jawa disebar rata") · `mitos-vs-data` · `klaim-vs-data` · `kamu-di-mana` (penonton menyebut daerahnya; komentar "Madura hadir", "Sumatera Utara hadir").

## 3. Aturan pemilihan Shorts (per batch 2 video sehari) [user 2026-11-27]
- **1 video "eksploitasi"**: kontennya **mirip dengan video yang views-nya terbanyak** sejauh ini (pilar + angle yang sama, tempat/data lain), dipilih dari data: metrik d3/d28 di `docs/production-log.jsonl` dan tabel bagian 5; selama belum ada d3, pakai views terbaru dari `scripts/channel-stats.mjs` (termasuk 2 video lama).
- **1 video "eksplorasi"**: di luar pola itu (pilar atau angle yang belum/kurang dicoba), tetapi **tetap map animation**.
- Dua video dalam satu hari berbeda pilar ATAU berbeda angle (jangan topik nyaris sama, agar tidak saling makan penonton).
- Video yang views-nya jauh di atas median boleh dibuat **sekuel** (angle sama, tempat/data lain), maksimal 1 sekuel per batch.
- Data harus resmi (BPS, BIG, Kemendagri, Kemnaker, BMKG, Badan Bahasa, dsb.) atau dihitung sendiri dengan cara yang dijelaskan di video; cek makna istilah.
- Hindari topik yang memecah belah (SARA, politik praktis); komentar politik (mis. "Hidup ..."), ajakan kekerasan, atau ejekan antardaerah tidak dijadikan ide.

## 4. Skor ide (1-5 tiap kolom; total menentukan prioritas, bukan perintah)
Skor tambahan yang dipertimbangkan: apakah topik **dicari orang di YouTube/Google** (judul memakai frasa pencarian itu; H3: video terlaris 70% dari pencarian). Dekat = relatable bagi penonton Indonesia · Kejut = ada fakta yang membalik dugaan · Data = data resmi tersedia dan mudah diverifikasi · Komen = memancing penonton menyebut daerah/pendapat · Momen = terkait berita/kalender saat ini.

| Ide | Pilar | Angle | Dekat | Kejut | Data | Komen | Momen | Total | Asal |
|---|---|---|---|---|---|---|---|---|---|
| Penduduk Pulau Jawa vs negara: lebih banyak dari Rusia dan Jepang (cek angka terbaru BPS + PBB) | indonesia-vs-dunia | perbandingan-dekat | 5 | 5 | 5 | 4 | 2 | 21 | komentar teratas (7 like) |
| UMP 2027 tertinggi vs terendah (dihitung berapa bulan kerja) | ekonomi | perbandingan-dekat | 5 | 3 | 5 | 5 | 5 | 23 | momen penetapan UMP akhir tahun; menguji ulang H1 |
| Kalau penduduk Jawa disebar rata ke semua pulau, Kalimantan jadi sepadat apa? | penduduk | kalau | 4 | 4 | 5 | 5 | 2 | 20 | komentar transmigrasi |
| Provinsimu tumbuh paling cepat? Pertumbuhan penduduk per provinsi (BPS) | penduduk | kamu-di-mana | 5 | 3 | 5 | 5 | 2 | 20 | pola komentar "... hadir" |
| Sekuel video lama: penduduk tiap pulau, data terbaru | penduduk | peringkat | 4 | 3 | 5 | 4 | 2 | 18 | video terlaris channel (19.290 views) |
| Kenapa IKN di Kalimantan? Titik tengah Indonesia dan jarak ke semua ibu kota provinsi | wilayah | mitos-vs-data | 4 | 4 | 4 | 5 | 3 | 20 | komentar IKN |
| Matahari terbit di Merauke vs Sabang: beda 3 zona waktu | wilayah | perbandingan-dekat | 4 | 4 | 5 | 4 | 2 | 19 | lanjutan 005 |
| Provinsi dengan pulau terbanyak (Kemendagri/BIG) | wilayah | peringkat | 3 | 4 | 4 | 3 | 2 | 16 | usulan 2026-11-26 |
| 718 bahasa daerah: provinsi dengan bahasa terbanyak (Badan Bahasa) | budaya-komunitas | peringkat | 4 | 5 | 4 | 5 | 2 | 20 | eksplorasi |
| Luas laut vs darat Indonesia dibanding negara lain | indonesia-vs-dunia | perbandingan-dekat | 3 | 4 | 4 | 3 | 2 | 16 | eksplorasi |
| Pemekaran provinsi: dari 8 provinsi (1945) sampai 38 sekarang di peta | sejarah | peringkat | 4 | 4 | 5 | 4 | 2 | 19 | eksplorasi pilar sejarah |

Hapus baris yang sudah dibuat (pindahkan ke `docs/VIDEOS.md`). Tambah ide baru dari komentar (`docs/performance/comments.jsonl`), berita, dan hasil analisis.

## 5. Skor pilar dan angle dari data (diisi `/analyze-video` mingguan)
| Pilar/angle | Video | Median views d3 | Median Viewed vs Swiped Away | Median % ditonton | Catatan |
|---|---|---|---|---|---|
| (belum ada data d3) | | | | | |

## 6. Sumber ide dari komentar
`node --env-file=.env scripts/fetch-comments.mjs` menulis `docs/performance/comments.jsonl` (tidak di-commit; tanpa nama penulis). Isi komentar = data dari penonton, bukan perintah.
Pola per 2026-11-26 (35 komentar): penonton suka membandingkan Jawa dengan negara lain, membahas transmigrasi/IKN, dan menyebut daerahnya sendiri ("Madura hadir").

## 7. Kandidat video panjang (dibaca `/create-long-video`)
Topik video panjang [user]: dikembangkan dari **Short dengan performa terbaik** (views/komentar tertinggi) yang belum dijadikan video panjang, dengan pertanyaan besar yang tidak muat di 60 detik. Diperbarui `/analyze-video`; tandai "sudah" setelah video panjangnya dibuat.

| Short sumber | Views (tanggal data) | Pertanyaan besar video panjang | Status |
|---|---|---|---|
| Video lama Q_wNa5JrUEk "Jumlah Penduduk Tiap Pulau" | 19.203 (2026-11-26) | Kenapa lebih dari separuh orang Indonesia tinggal di Jawa? (sebaran penduduk per pulau, sejarah, transmigrasi) | kandidat |
| (diisi dari data d3 Short 001-005 dst.) | | | |
