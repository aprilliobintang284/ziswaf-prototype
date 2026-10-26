# Prototipe Dashboard Ziswaf (Sprint 1)

Prototipe klikabel untuk Dashboard Ziswaf (Admin & Fundraiser) dengan cakupan **Authentication → Fundraiser → Program**.
Tampilannya mengikuti desain Hifi di Figma (`UI Design Ziswaf Platform` → MVP Dashboard → Hifi). Tidak ada backend: semua data dummy disimpan di `localStorage` browser.

> Ini alat bantu QA dan diskusi, bukan aplikasi produksi. Aturan validasi diambil dari PRD. Bagian yang belum jelas dibuat sebagai **asumsi** (lihat daftar di bawah).

## Cara menjalankan

Butuh Node.js 18 atau lebih baru.

```bash
cd C:\Ziswaf\prototype-dashboard
npm install
npm run dev
```

Buka http://localhost:5173. Perintah lain: `npm run typecheck` (cek TypeScript) dan `npm run build` (build produksi ke `dist/`).

## Versi online (GitHub Pages)

Link: https://aprilliobintang284.github.io/ziswaf-prototype/

- Setiap push ke branch `main` otomatis di-build dan dipublikasikan oleh workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Progresnya bisa dilihat di tab **Actions** repo.
- Repo ini public (GitHub Pages gratis hanya untuk repo public), jadi situs dan kode sumbernya bisa dilihat siapa pun yang punya link.
- Data dummy tetap tersimpan di browser masing-masing orang, jadi perubahan satu orang tidak terlihat oleh orang lain.

## Akun demo

Ada juga di halaman Masuk, panel **"Akun demo (khusus prototipe)"** (klik email untuk mengisi otomatis).

| Peran | Email | Password |
|---|---|---|
| Admin | admin@ziswaf.id | Admin@2026 |
| Fundraiser terverifikasi (punya program semua status) | yayasan@gmail.com | Ziswaf@2026 |
| Fundraiser terverifikasi tanpa program | individu@gmail.com | Ziswaf@2026 |
| Fundraiser menunggu verifikasi | yayasanb@gmail.com | Ziswaf@2026 |
| Fundraiser ditolak | komunitas@gmail.com | Ziswaf@2026 |

## Tips pengujian

- **Email simulasi**: tombol "Email simulasi" di kanan bawah menampilkan email yang "terkirim" (reset password, hasil verifikasi, dll.). Email reset punya tombol **Atur Ulang Password** dan **Simulasikan lewat 60 menit** untuk menguji tautan kedaluwarsa.
- **Sesi diam 30 menit**: buka `/masuk?idle=1` supaya batasnya jadi 1 menit (berlaku selama tab terbuka). Diam tanpa klik, gerak mouse, atau scroll akan logout otomatis.
- **Reset data**: hapus key `ziswaf-proto-db` di DevTools → Application → Local Storage, lalu muat ulang halaman.
- Data tersimpan per browser/port. Port 5173 dan port lain punya data sendiri-sendiri.

## Isi prototipe

- **Masuk**: tombol nonaktif sampai email dan password terisi. Setelah gagal, kedua field merah dan tombol nonaktif sampai isian diubah.
- **Daftar Akun** (2 langkah):
  - Error muncul per field setelah field ditinggalkan.
  - "Berikut" aktif hanya jika semua valid, dokumen dipilih, dan pernyataan dicentang.
  - "Daftar" aktif hanya jika password memenuhi kriteria dan konfirmasinya cocok.
- **Lupa Password / Atur Ulang Password**:
  - Email tidak terdaftar menampilkan "Email tidak terdaftar".
  - Modal "Periksa Email Anda" punya tombol "Tutup".
  - Tautan berlaku 60 menit dan hanya sekali pakai.
  - Setelah berhasil muncul modal "Password Berhasil Diubah".
- **Fundraiser**:
  - Admin melihat daftar, detail, setujui/tolak (dengan alasan), dan Export CSV.
  - Fundraiser melihat data sendiri dengan tombol Batal/Edit (nonaktif saat Menunggu Verifikasi), lalu form **Edit Fundraiser**.
- **Program**:
  - Kartu Gross/Net/Fee 3% dan tabel status Draf / Menunggu Persetujuan / **Aktif** / Ditolak / **Selesai**.
  - Detail program dengan "Tanggal Persetujuan".
  - Buat/Edit program dengan date picker, upload foto, dan peringatan keluar halaman.
  - Admin bisa menyetujui atau menolak program.
- **Topbar**: ikon ☰ dan menu pengguna (peran, nama, email, tombol "Keluar" dengan konfirmasi).
- **Transaksi & Penarikan**: masih placeholder (desain Hifi belum ada).

## Asumsi yang dipakai (perlu konfirmasi PM/Designer)

- **K-01** Sesi 7 hari dihitung ulang setiap website dibuka.
- **K-05/K-06** Kategori fundraiser berupa teks bebas, huruf + spasi, 5–20 karakter.
- **K-07** Setelah ditolak, fundraiser memperbaiki data lewat Edit lalu statusnya kembali "Menunggu Verifikasi". Email penolakan ikut dikirim.
- **K-13** Edit program Aktif hanya bisa mengubah deskripsi dan foto, lalu menunggu persetujuan Admin. "Simpan ke Draf" nonaktif untuk program Aktif.
- **K-16** Fee 3% dibulatkan ke rupiah terdekat.
- **K-17** Meminta tautan reset baru membatalkan tautan lama.
- **K-30** Target terkumpul cukup lebih dari 0 (batas maksimal belum ditentukan).
- **Baru (update desain 26 Okt 2026)**:
  - Edit data saat **Terverifikasi** langsung tersimpan, status tetap Terverifikasi. Belum jelas apakah harus diverifikasi ulang.
  - Program **Selesai** bisa diedit, mengikuti desain (pensil & tombol Edit aktif). Perilakunya disamakan dengan program Aktif.
  - Tombol **Batal** di halaman lihat Fundraiser = kembali ke halaman sebelumnya.
  - "Lupa Password" menampilkan "Email tidak terdaftar" sesuai desain, padahal AC PRD meminta pesan yang sama untuk email terdaftar/tidak.
  - Kolom "Nama Fundraiser" di tabel Program hanya untuk Admin. Di desain, kolom ini muncul bersama tombol "Buat Program Baru".
- **Baru (update desain 26 Okt 2026 malam)**:
  - Ikon ☰ di topbar fungsinya belum dijelaskan di desain. Di prototipe ikon ini menyembunyikan/menampilkan sidebar.
