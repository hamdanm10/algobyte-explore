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
5. **Hubungkan dengan keputusan produksi video itu**: baca `docs/VIDEOS.md` (gaya visual) dan catatan video di `docs/PERFORMANCE.md` (apa yang sedang diuji: pembuka, durasi, caption, musik, topik). Pisahkan yang bisa dijelaskan data dari yang hanya dugaan.
6. **Tulis hasil ke `docs/PERFORMANCE.md`:**
   - tambahkan/perbarui blok video di "Catatan per video" (maks sekitar 10 baris: tanggal analisis, umur video, angka kunci, diagnosis, hipotesis, aksi),
   - perbarui "Pelajaran aktif" (maks 10 butir; ubah keyakinan, gabung, atau hapus yang usang),
   - perbarui tabel "Jadwal analisis" (centang yang sudah, tambahkan video baru dengan tanggal hari ke-3/4 dan ke-28).
7. **Laporkan ke user** (ringkas): angka kunci, 1 diagnosis utama, **maksimal 3 hal konkret untuk diuji di video berikutnya** (tiap hal disertai metrik yang akan dicek), dan batas keyakinan. Tanya apakah ide baru perlu masuk backlog di `docs/VIDEOS.md` atau langsung dilanjutkan dengan `/create-video`.

## Cara hasilnya dipakai
- `/create-video` tahap 1 membaca "Pelajaran aktif" untuk memilih topik dan hook (sebagai hipotesis, bukan perintah).
- Hook, durasi, dan format video berikutnya dirancang untuk menguji hipotesis yang tertulis.
- Tabel gaya visual di `docs/VIDEOS.md` dipakai bersama hasil ini untuk menilai gaya mana yang jangkauannya baik, tanpa menghilangkan variasi (agar tidak terlihat template).
- Snapshot `docs/performance/snapshots.jsonl` memantau pertumbuhan subscriber dan views menuju syarat monetisasi.
