---
description: Analisis performa video yang sudah tayang dan simpan pelajaran untuk video berikutnya
argument-hint: "[judul atau id video, opsional; kosong = video terbaru]"
---

Analisis performa satu video Algobyte Explore yang sudah tayang: `$ARGUMENTS` (kosong = video publik terbaru). Komunikasi dalam bahasa Indonesia.

## Aturan keras
- Jangan menjalankan Remotion Studio. Jangan tampilkan nilai `.env`. Skrip dijalankan `node --env-file=.env ...`.
- Hasil disimpan di `docs/PERFORMANCE.md`, BUKAN di `CLAUDE.md`.
- **Jaga kejujuran statistik.** Data channel sangat sedikit. Jangan menyimpulkan sebab dari kurang dari 5 video; tulis sebagai **hipotesis** dengan tingkat keyakinan dan jumlah video pendukung. Bandingkan terutama dengan video channel sendiri; patokan di skill `youtube` berbasis pasar AS/Inggris, jadi perlakukan sebagai petunjuk kasar.
- Skill `youtube`: konteks channel (niche, tier New, tujuan Growth) ada di `docs/CHANNEL.md`; jangan tanya ulang. Integrasi DataForSEO tidak aktif: jangan menunggunya.

## Tahap
1. **Ambil statistik publik:** `node --env-file=.env scripts/channel-stats.mjs` (views, like, komentar, views per hari, perubahan sejak snapshot terakhir, subscriber). Bila video yang dimaksud tidak muncul, kemungkinan masih diproses, privat, atau terjadwal: katakan ke user dan berhenti.
2. **Cek umur video.** Di bawah 2 hari: peringatkan analisis terlalu dini (Shorts bisa naik sampai hari ke-4) dan tanya apakah tetap lanjut. Jadwal ideal: hari ke-3/4, lalu sekitar hari ke-28 (lihat `docs/PERFORMANCE.md`).
3. **Minta metrik privat dari user** (API key tidak bisa mengambilnya). Minta ditempel angka atau screenshot dari YouTube Studio > Konten > Shorts > pilih video > Analytics:
   - **Dilihat vs digeser menjauh** (Viewed vs Swiped Away, %) dan jumlah "Shown in feed"/impresi,
   - **Rata-rata % ditonton** dan rata-rata durasi tayang,
   - **Grafik retensi**: di detik berapa penonton paling banyak pergi, dan apakah ada lonjakan (tanda loop),
   - **Sumber trafik** (feed Shorts, pencarian, beranda, dsb.),
   - **Subscriber yang didapat** dari video ini.
   Bila user menempel screenshot, baca gambarnya. Jangan mengarang angka yang tidak diberikan.
4. **Analisis dengan skill `youtube`:** sub-skill `analyze` (corong, kelas grafik retensi, kesehatan sumber trafik, aksi prioritas). Bila Viewed vs Swiped Away di bawah 60% jalankan juga `hook`. Patokan dari `references/shorts-playbook.md`: swipe-away 75%+ bagus, di bawah 60% = pembuka lemah; penyelesaian 70%+ = promosi agresif; di atas 100% rata-rata ditonton = ada loop.
5. **Hubungkan dengan keputusan produksi video itu**: baca baris video di `docs/production-log.jsonl` (pengaturan yang dipakai + field `testing`), `docs/RECIPE.md` (resep saat itu), `docs/VIDEOS.md` (gaya visual), dan catatan di `docs/PERFORMANCE.md`. Bandingkan dengan video lain di log **pada umur yang sama** (d3 dengan d3, d28 dengan d28) dan beri catatan bila video tayang di hari yang sama. Pisahkan yang bisa dijelaskan data dari yang hanya dugaan.
6. **Tulis hasil ke `docs/PERFORMANCE.md`:**
   - tambahkan/perbarui blok video di "Catatan per video" (maks sekitar 10 baris: tanggal analisis, umur video, angka kunci, diagnosis, hipotesis, aksi),
   - perbarui "Pelajaran aktif" (maks 10 butir; ubah keyakinan, gabung, atau hapus yang usang),
   - perbarui tabel "Jadwal analisis" (centang yang sudah, tambahkan video baru dengan tanggal hari ke-3/4 dan ke-28).
6b. **Perbarui log dan resep (agar video berikutnya membaik):**
   - Di `docs/production-log.jsonl`, isi baris video itu: `youtubeId`, `uploadedAt`, `uploadTime` bila diketahui, dan `metrics.d3` atau `metrics.d28` = `{views, likePct, commentPct, viewedPct, avgViewPct, avgViewSec, dropSec, subsGained, trafficShortsFeedPct}` (null untuk angka yang tidak diberikan user; jangan mengarang).
   - Jalankan **aturan keputusan** di `docs/RECIPE.md` bagian 5 untuk tiap hal di `testing`: naikkan/turunkan label, masukkan ke resep tetap, atau kembalikan; ubah tabel resep (bagian 2), status di "Antrian eksperimen", dan tambah butir di "Riwayat perubahan resep" dengan tanggal dan alasan berbasis angka.
   - Usulkan 1-2 eksperimen berikutnya di "Antrian eksperimen" (prioritas: dimensi dengan dampak terbesar pada metrik terlemah).
7. **Laporkan ke user** (ringkas): angka kunci, 1 diagnosis utama, **perubahan resep** (apa yang naik/turun label atau dikembalikan, dan alasannya), **maksimal 3 hal konkret untuk diuji di video berikutnya** (tiap hal disertai metrik yang akan dicek), dan batas keyakinan. Tanya apakah ide baru perlu masuk backlog di `docs/VIDEOS.md` atau langsung dilanjutkan dengan `/create-video`.

## Cara hasilnya dipakai
- `/create-video` memulai setiap video dari `docs/RECIPE.md` (resep aktif) dan hanya mengubah 1-2 hal yang diuji; "Pelajaran aktif" dipakai untuk memilih topik dan hook (sebagai hipotesis, bukan perintah).
- `docs/production-log.jsonl` adalah data mentah yang dibandingkan antar video (pengaturan vs metrik).
- Hook, durasi, dan format video berikutnya dirancang untuk menguji hipotesis yang tertulis.
- Dimensi visual yang bisa dibandingkan (tema terang/gelap, jenis peta, caption, dll.) dinilai lewat log dan masuk resep bila terbukti; "kulit" visual (palet, font, reveal) tetap selalu divariasikan agar tidak terlihat template.
- Snapshot `docs/performance/snapshots.jsonl` memantau pertumbuhan subscriber dan views menuju syarat monetisasi.
