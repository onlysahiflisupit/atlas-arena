# Atlas Arena

Game kuis ekspedisi 3D berbahasa Indonesia. Buka [Atlas Arena](https://atlas-arena.onlysahiflisupit.workers.dev/) di browser yang mendukung WebGL. Permainan berjalan tanpa instalasi aplikasi.

## Bermain

- **Solo** membuka permainan pribadi dan langsung memulai setelah pengaturan dikonfirmasi.
- **Buat room** memilih arena, kelas, pelajaran, jumlah soal (1–20), waktu per soal (15–180 detik), akses dan kapasitas (1–32 orang). Host dapat mulai sebelum room penuh.
- **Room publik** dapat difilter menurut arena, mata pelajaran dan tingkat. **Quick Play** mencari room terbuka yang memiliki pemain tersambung. PIN enam digit dan tautan undangan dapat digunakan untuk bergabung selama room masih menunggu.
- Semua pemain memburu titik yang sama pada saat bersamaan. Setiap pemain mendapat soal acak sesuai pengaturan dan riwayatnya sendiri. Mendekati suar membuka soal dan empat pelat sasaran. Tembak atau sentuh pilihan. Server mengunci pilihan terakhir pada akhir timer. Jawaban benar memberi 100 poin dan hasil akhir menampilkan ulasan pribadi.
- Komputer memakai WASD, mouse, Shift, Spasi, C, V dan angka 1–4. Roda mouse mengganti blaster, Q kembali ke blaster sebelumnya, dan R mengisi energi. Klik untuk menembak, F atau klik kanan untuk lensa fokus dan Esc untuk melepas mouse. HP memakai analog, usap untuk melihat, dan tombol aksi yang mendukung multitouch.
- Identitas anonim dilindungi cookie browser. Riwayat sepuluh sesi per mata pelajaran tetap berlaku ketika berpindah room memakai profil browser yang sama. Profil terpisah, mode privat baru, atau menghapus cookie akan memulai riwayat baru.

## Konten

Pilih antara 12 arena, empat karakter dan empat blaster fiksi. Lingkungan low-poly, model Kenney dan Three.js dilayani dari Worker yang sama. Pratinjau arena berasal dari geometri game. Kredit ada di [halaman aset](https://atlas-arena.onlysahiflisupit.workers.dev/credits.html).

Bank bawaan menyediakan 16 pelajaran, pilihan campuran, serta 15 tingkat dari PG hingga umum. Soal menggunakan keluarga tantangan Bebras, olimpiade matematika dan latihan orisinal. Contoh, angka, susunan, dan pilihan dapat berubah. Kredit dan lisensi adaptasi tersedia di [sumber soal](https://atlas-arena.onlysahiflisupit.workers.dev/sumber-soal.html).

Untuk mapel tambahan pilih **Mata pelajaran sendiri**. Tempel enam kolom dari spreadsheet (Soal, A, B, C, D, Kunci). Kunci berisi satu huruf A–D. Sediakan minimal sebelas kali jumlah soal per sesi agar sepuluh sesi terdahulu dapat dikecualikan. Tersedia hingga 500 baris. Draf terakhir tersimpan di browser host.

## Pengembangan dan publikasi

Gunakan Node.js 24. Tidak ada dependensi npm yang perlu dipasang.

```sh
npm test
npm run build
```

Build mengemas aset per berkas (teks dikompresi gzip) sebagai satu modul data Worker. Worker utama ada di `src/worker.js` dan generator di `src/bank.js`. `public/game.js` menangani gerak dan bidikan lokal. Server menyinkronkan posisi, waktu dan skor melalui WebSocket. Durable Object terpisah menangani setiap room, direktori publik dan riwayat tiap profil. Hanya soal yang sudah ditemukan yang dikirim ke peserta. Kunci jawaban dikirim sesudah ronde berakhir.

Untuk memublikasikan hasil build, sediakan `CLOUDFLARE_ACCOUNT_ID` dan `CLOUDFLARE_API_TOKEN` melalui lingkungan deployment, lalu jalankan `node scripts/deploy.mjs`. Skrip menargetkan Worker `atlas-arena` dan menggunakan migrasi awal kelas SQLite saat membuat Worker baru. Perubahan kelas di masa mendatang memerlukan migrasi lanjutan. Kredensial tidak disertakan di repositori.
