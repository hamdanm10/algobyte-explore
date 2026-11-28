# Data video YouTube: penyimpanan, metrik, dan ciri konten

Tujuan: semua keputusan konten (resep, topik, gaya) diambil dari data yang **tidak hilang**, sebanding antar video, dan tetap hemat token walaupun videonya ribuan. Prinsip: **data mentah tidak pernah masuk ke konteks Claude**. Skrip yang menghitung, Claude hanya membaca ringkasannya.

## 1. Tiga lapis penyimpanan
| Lapis | Tempat | Isi | Git |
|---|---|---|---|
| Keputusan produksi | `docs/production-log.jsonl` | pengaturan yang dikendalikan per video: format, kelompok, pilar/angle, `features`, voice, visual, audio, `analyzed` | ya (tidak bisa diambil ulang dari mana pun) |
| Data mentah | `data/youtube.db` (SQLite bawaan Node 24) | metrik harian, sumber trafik, retensi, istilah pencarian, snapshot publik, komentar, metrik tempelan user | **tidak** (`.gitignore`); cadangan `D:\Hamdan\Contents\algobyte-explore\data\youtube.db` lewat `yt-sync.mjs --backup` |
| Kesimpulan | `docs/RECIPE*.md`, `docs/TOPICS.md`, `docs/PERFORMANCE.md` | keputusan dan hipotesis | ya |

Metrik **tidak lagi ditulis ke log**. Log hanya mencatat kapan sebuah jendela sudah dianalisis: `analyzed: {d3, d28}` (Shorts) atau `{d7, d28}` (video panjang), berisi tanggal analisis atau `null`.
Sebagian besar isi database bisa diambil ulang dari API bila hilang (Analytics menyimpan riwayat harian). Yang **tidak bisa**: snapshot publik lama, komentar yang sudah dihapus penulisnya, dan angka tempelan user (`manual_metrics`). Karena itu cadangan tetap wajib.

## 2. Skrip
| Skrip | Kapan | Fungsi |
|---|---|---|
| `node --env-file=.env scripts/yt-sync.mjs [--backup] [--quiet] [--public-only]` | tahap 0 kedua command **setiap kali** (murah), dan `/analyze-video` dengan `--backup` | sinkronisasi inkremental publik + privat, melengkapi `youtubeId`/`uploadedAt`/`uploadSlot` di log |
| `node scripts/yt-report.mjs` | tahap 0 | status ringkas: kesegaran data, subscriber, analisis jatuh tempo, lonjakan |
| `node scripts/yt-report.mjs --due` | `/analyze-video` | jendela yang jatuh tempo + metrik + ciri konten + indeks baseline |
| `node scripts/yt-report.mjs --table[=d3] [--format=short]` | `/analyze-video` (median kelompok/pilar/gaya) | satu baris per video pada satu jendela |
| `node scripts/yt-report.mjs --video=<no atau id>` | video mencolok | semua jendela, trafik, retensi, istilah pencarian |
| `node scripts/yt-report.mjs --comments [--since=YYYY-MM-DD] [--limit=40]` | ide topik | komentar teratas sejak tanggal (default 7 hari), teks dipotong |
| `node scripts/recent-styles.mjs [--format=long]` | GATE 1 | kulit visual 10 Short (atau 5 video panjang) terakhir, untuk aturan variasi |

Semua mode punya `--json` bila perlu diolah lebih lanjut. Jangan membaca `data/youtube.db` atau seluruh log secara langsung untuk analisis rutin.

### Sinkronisasi (`yt-sync.mjs`)
- **Publik** (`YOUTUBE_API_KEY`, sekitar 3 + N/50 unit kuota): statistik channel, semua video, snapshot views/like/komentar (disimpan hanya bila berubah), komentar baru hanya untuk video yang jumlah komentarnya berubah (tanpa nama/ID penulis).
- **Privat** (OAuth read-only): metrik harian channel dan per video (`day,video`), sumber trafik harian per video, diminta per kelompok 10 video, hanya rentang yang belum ada (3 hari terakhir diambil ulang karena data Analytics masih berubah). Frekuensi per video: umur sampai 35 hari tiap sinkron, sampai 400 hari mingguan, lebih tua bulanan.
- **Retensi** diambil per jendela (`d3`/`d28` Shorts, `d7`/`d28` video panjang) dengan rentang tanggal jendela itu, sekali saja setelah jendelanya lengkap.
- **Istilah pencarian**: 25 teratas seumur video, diperbarui bersama metrik harian.
- Bila OAuth gagal (`invalid_grant`, token mode Testing kedaluwarsa sekitar 7 hari), bagian publik tetap jalan dan pesan login ulang dicetak: `! node --env-file=.env scripts/yt-oauth.mjs`. Data yang terlewat diambil otomatis di sinkron berikutnya.
- Data Analytics tertinggal sekitar 2-3 hari. Tanggal "day" memakai waktu Pacific.

## 3. Jendela metrik dan metrik utama
- **Jendela `dN`** = hari 0 sampai N-1 sejak tanggal tayang (waktu Pacific). Dihitung dari data harian, jadi angkanya sama kapan pun dihitung dan semua video diukur di umur yang sama. Jendela yang tersedia: d1, d3, d7, d28, d90, d365.
- Jendela dianalisis hanya bila **lengkap** di data Analytics. Akibat keterlambatan data, d3 sebuah Short biasanya siap di hari ke-5 atau ke-6 setelah tayang.
- **Metrik utama** (satu per format, agar analisis tidak memilih angka yang kebetulan bagus):
  - Shorts: **engaged views d3**, dinilai sebagai indeks terhadap baseline. Pengaman: subscriber per 1.000 views.
  - Video panjang: **jam tonton d7** (awal) dan **d28** (utama), sebagai indeks terhadap baseline. Pengaman: subscriber per 1.000 views.
  - Metrik diagnosis tetap dipakai untuk menjelaskan sebab: `engagedPct`, `earlyRetention` (retensi di 10% durasi), % dan detik rata-rata ditonton, `dropSec`, `retention30s` (video panjang), sumber trafik, like/komentar per views.
- **Normalisasi baseline (`idx`)**: nilai metrik utama dibagi **median 20 video format sama yang tayang sebelumnya** (jendela sama, sudah lengkap). `idx` 1,0 = setara kebiasaan channel saat itu. Dengan ini video lama dan baru tetap sebanding walaupun channel tumbuh. Minimal 5 video pembanding; kurang dari itu `idx` kosong.

## 4. Deteksi lonjakan (video umur 0-7 hari)
`yt-report.mjs` membandingkan views publik terbaru sebuah video muda dengan median views kumulatif video format sama pada hari ke-sama (maksimal 20 pembanding, minimal 5). Rasio 3x atau lebih = **LONJAKAN**; 1/3 atau kurang = **JAUH DI BAWAH**.
Reaksi terhadap lonjakan (tidak menunggu d3, karena hanya memanfaatkan momentum):
1. Buka `yt-report.mjs --video=<no>` untuk melihat sumbernya (feed Shorts, pencarian, istilah pencarian, komentar).
2. Batch berikutnya: topik/angle video itu dijadikan **eksploitasi** (sekuel, sudut lain, tempat/data lain).
3. Tambahkan ke kandidat video panjang (`docs/TOPICS.md` bagian 7).
4. **Resep tidak diubah** karena satu lonjakan. Pengaruhnya ke gaya, hook, dan tata letak tetap diputuskan lewat median kelompok di d3/d28.

## 5. Ciri konten (`features` di log)
Diisi saat produksi (tahap "Catat" kedua command) dengan **nilai dari daftar tetap** agar bisa dihitung. Bila tidak ada yang cocok, tambahkan nilai baru ke daftar ini dulu (jangan teks bebas). `null` = tidak diketahui.

| Kunci | Nilai |
|---|---|
| `role` | `eksploitasi` · `eksplorasi` · `baseline` |
| `hookType` | `pertanyaan` · `angka-kejutan` · `pernyataan-kejutan` · `klaim-vs-data` · `visual-langsung` |
| `dataShape` | `peringkat` · `perbandingan` · `skala-ukuran` · `klaim-vs-data` · `perubahan-waktu` · `proporsi` |
| `region` | `indonesia` (seluruh/per provinsi) · `pulau` · `daerah` (provinsi/kota tertentu) · `asia` · `dunia` · `indonesia-vs-dunia` |
| `mapKind` | `2d` · `3d` · `globe` · `titik` |
| `theme` | `terang` · `gelap` |
| `outroType` | `ajakan-komentar` · `tebakan` · `pertanyaan` · `tanpa` |
| `twist` | `true`/`false`: ada pembalikan/kejutan di akhir |
| `searchDemand` | `tinggi` · `sedang` · `rendah`: perkiraan saat memilih topik, apakah orang mencari topik ini (evergreen) |

Yang dihitung otomatis oleh skrip (tidak perlu ditulis): durasi, panjang judul, angka di judul, slot jam (`uploadSlot`), hari tayang.
`features` video 001-007 dan L001 diisi ulang 2026-11-28 dari deskripsi di log; `twist` dan `searchDemand` belum diketahui (`null`).

## 6. Metrik tempelan user
Angka yang hanya ada di YouTube Studio (Viewed vs Swiped Away, CTR impresi thumbnail video panjang) disimpan di tabel `manual_metrics` (`video_id, metric, win, value, source, entered_at`), bukan di log. Hanya diminta bila diperlukan (aturan di `/analyze-video`).

## 7. Rencana lanjutan
- **Sekitar 50 video:** `scripts/analyze-data.mjs` menghitung median per kelompok, pilar/angle, gaya, tata letak, slot jam, dan `features` langsung dari database, mengeluarkan ringkasan berukuran tetap; `/analyze-video` memakainya menggantikan `--table`. Tambah pemetaan retensi ke segmen naskah (waktu segmen dari `voice.json`/`captions.json` disimpan saat produksi) dan jejak keputusan (setiap keputusan resep dievaluasi ulang di kelompok berikutnya).
- **Ratusan video:** interval keyakinan dan regresi untuk memisahkan pengaruh topik, gaya, jam, dan durasi; jendela d90 dan d365 ikut dianalisis (nilai jangka panjang, pencarian evergreen).
- Arsipkan blok mingguan lama `docs/PERFORMANCE.md` ke file arsip yang tidak dibaca rutin bila sudah panjang.
