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

- **Email simulasi**: tombol "Email simulasi" di kiri bawah (supaya tidak menutupi tombol aksi di kanan bawah form) menampilkan email yang "terkirim". Isinya mengikuti template email di Figma: "Atur Ulang Password", "Password Berhasil Diubah", "Fundraiser Berhasil Diverifikasi", dan "Fundraiser Belum Berhasil Diverifikasi" (berisi alasan penolakan; desain 30 Okt 2026). Email reset punya tombol **Atur Ulang Password**, tautan cadangan, dan **Simulasikan lewat 60 menit** untuk menguji tautan kedaluwarsa.
- **Sesi diam 30 menit**: buka `/masuk?idle=1` supaya batasnya jadi 1 menit (berlaku selama tab terbuka). Diam tanpa klik, gerak mouse, atau scroll akan logout otomatis.
- **Reset data**: hapus key `ziswaf-proto-db` di DevTools → Application → Local Storage, lalu muat ulang halaman.
- Data tersimpan per browser/port. Port 5173 dan port lain punya data sendiri-sendiri.

## Isi prototipe

- **Pesan error di semua form** (K-36, desainer 30 Okt 2026): field yang dibiarkan kosong baru diberi error setelah ditinggalkan (pindah kolom); isian yang formatnya salah sudah diberi error saat mengetik. Form Program juga mengecek semua field saat tombol diklik. Cek email terdaftar dan nama program ganda baru jalan setelah field ditinggalkan.
- **Masuk**: tombol nonaktif sampai email valid dan password terisi. Setelah gagal, kedua field merah dan tombol nonaktif sampai isian diubah.
- **Daftar Akun** (2 langkah):
  - Ada field **Nama Pemilik Rekening Penarikan** (desain 3 Nov 2026): wajib, huruf dan spasi; isian berangka memunculkan "Format nama tidak valid". Kategori berisi angka/simbol memunculkan "Format kategori salah".
  - "Berikut" aktif hanya jika semua valid, dokumen dipilih, dan pernyataan dicentang.
  - **Dokumen Izin Usaha hanya PDF**, maksimal 5 MB (PRD Validasi 12 Nov 2026 dan komentar Figma #69; AC PRD masih menulis PDF/JPG/JPEG/PNG, desain belum dicek, K-54). Isi file dicek (file bukan PDF yang diganti nama ditolak). Foto program tetap JPG/JPEG/PNG maks 2 MB.
  - "Daftar" aktif hanya jika password memenuhi kriteria dan konfirmasinya cocok.
- **Lupa Password / Atur Ulang Password**:
  - "Kirim Tautan" aktif hanya jika format email benar.
  - Email terdaftar maupun tidak terdaftar menampilkan pesan yang sama: "Jika email terdaftar, tautan reset sudah dikirim" (email hanya terkirim kalau terdaftar).
  - Modal "Periksa Email Anda" punya tombol "Tutup".
  - Tautan berlaku 60 menit dan hanya sekali pakai.
  - Setelah berhasil muncul modal "Password Berhasil Diubah".
- **Fundraiser**:
  - Admin melihat daftar, detail, setujui/tolak (dengan alasan), dan Export Excel (.xlsx).
  - Fundraiser melihat data sendiri dengan tombol **Edit** di kanan atas, sejajar judul halaman (komentar Figma #72, 14 Nov 2026; nonaktif saat Menunggu Verifikasi), lalu form **Edit Fundraiser**.
  - Edit Fundraiser (desain 3 Nov 2026, judul "← Edit Fundraiser"):
    - **Terverifikasi**: hanya Nomor Telepon dan Alamat yang bisa diubah; pop-up "Apakah Anda yakin ingin menyimpan perubahan data?" lalu langsung tersimpan, status tetap Terverifikasi (tanpa verifikasi ulang).
    - **Ditolak**: semua field kecuali Email bisa diubah; pop-up "…mengajukan kembali untuk diverifikasi oleh admin?" lalu status kembali Menunggu Verifikasi.
    - Kolom Email selalu terkunci. Menambah spasi di awal/akhir saja tidak dihitung sebagai perubahan, jadi Simpan tetap nonaktif.
    - Edit di dua tab (FR-080): yang disimpan hanya field yang diubah di tab itu, jadi simpanan dari tab lain tidak tertimpa data lama.
  - Detail dan export menampilkan Nama Pemilik Rekening Penarikan.
  - Tampilan kosong list Admin: "Belum Ada Data Fundraiser" (tanpa Export).
- **Program**:
  - Kartu Gross/Net/Fee 3% dan tabel status Draf / Menunggu Persetujuan / **Aktif** / Ditolak / **Selesai**.
  - Detail program dengan "Tanggal Persetujuan".
  - Buat/Edit program dengan date picker, upload foto (ikon X di pojok foto untuk menghapus), dan peringatan keluar halaman.
  - Admin bisa menyetujui atau menolak program.
  - Nama program tidak boleh sama dengan program lain (beda huruf besar/kecil dan spasi berlebih tetap dianggap sama).
  - Export Excel (.xlsx) untuk Admin dan Fundraiser.
- **Topbar**: ikon ☰ meringkas menu samping menjadi ikon saja dan melebarkannya lagi (desain 3 Nov 2026), dan menu pengguna (peran, nama, email, tombol "Keluar" dengan konfirmasi).
- **Transaksi** (desain Hifi 30 Okt 2026):
  - Tabel ID Transaksi, Donatur, Program, Fundraiser, Nominal, Waktu transaksi, Status (Menunggu Pembayaran / Diproses / Berhasil / Gagal), Aksi; urutan terbaru di atas; Export .xlsx.
  - Panel Detail Transaksi berisi ID, Donatur, Email, Nomor Telepon, Program, Fundraiser, Nominal, Waktu, dan Status.
  - Admin melihat semua transaksi; Fundraiser hanya transaksi program miliknya. Kolom/baris Fundraiser hanya untuk Admin: di tampilan Fundraiser tidak ada di tabel, panel detail, dan file export (instruksi QA 12 Nov 2026; berlaku juga di Penarikan). Akun yang belum terverifikasi tidak bisa membuka menu ini.
  - Data dummy: jumlah transaksi Berhasil per program sama persis dengan Total Terkumpul (Gross), dan banyaknya sama dengan Jumlah Donatur.
- **Penarikan** (desain Hifi 30 Okt 2026):
  - Kartu Frekuensi Pencairan dan Total Pencairan (hanya penarikan Diterima), tabel ID Penarikan, Fundraiser (khusus Admin), Program, Nominal, Tanggal Diajukan, Status (Diajukan / Diterima / Ditolak), Aksi; Export .xlsx.
  - Admin menyetujui atau menolak pengajuan Diajukan (Tolak wajib alasan) dengan pop-up konfirmasi sesuai desain.
  - Fundraiser membuat pengajuan lewat **Buat Pengajuan**: kartu Rekening Penarikan dari data registrasi, dropdown Nama Program yang bisa dicari, "Total Dana yang Dapat Ditarik" dan batas Maksimal di Nominal, Catatan opsional.
  - Pengajuan Ditolak punya tombol **Edit** untuk mengajukan ulang; pengajuan Diajukan tidak bisa diubah (juga lewat URL).
  - Ikon kartu Frekuensi/Total Pencairan dan ikon bank di kartu Rekening Penarikan disalin dari Figma (10 Nov 2026).
- **Animasi**: sidebar (☰), menu pengguna, pop-up, panel detail, date picker, kotak email simulasi, toast, tabel, dan perpindahan halaman memakai transisi singkat (±0,1–0,3 detik). Animasi dimatikan otomatis jika pengaturan "kurangi gerakan" (reduce motion) aktif di perangkat.

## Aset dari Figma

Logo, ilustrasi kotak donasi, background panel login (`src/assets/bg-auth-panel.svg`), dan semua ikon/ilustrasi empty state (`src/assets/icons/*.svg`) diambil langsung dari Figma lewat klik kanan → Copy as → Copy as SVG, tanpa digambar ulang. Komponen `Icon` (`src/components/icons.tsx`) merender file itu apa adanya; opsi `tint` hanya mengganti warnanya menjadi warna teks (misalnya ikon menu sidebar yang aktif jadi putih).

Update 10 Nov 2026: ilustrasi tampilan kosong Fundraiser, Transaksi, dan Penarikan, ikon kartu Frekuensi/Total Pencairan, dan ikon bank sudah diganti dengan SVG asli dari Figma. Ikon bank dipotong ke kotak 16×16 (aslinya dibungkus kotak 16×60). Frame baru "Empty state fundraiser belum terverifikasi" (1018:36034, Penarikan Dana Belum Bisa Diajukan) belum dibuat karena bertentangan dengan menu abu-abu K-08; ditanyakan di K-52.

Pengecualian: ikon panah kanan dan chevron kanan memakai versi cermin dari panah/chevron kiri di Figma, dan beberapa ikon khusus prototipe yang tidak ada di desain (kotak masuk simulasi, halaman placeholder) masih memakai lucide.

## Asumsi yang dipakai (perlu konfirmasi PM/Designer)

- **Aturan umum (31 Okt 2026)**: kalau PRD dan desain Hifi berbeda, prototipe ikut desain karena desain sudah direview PM (Ringkasan Keputusan #29). Contoh: detail program tanpa tooltip dan tanpa Total Dana Dicairkan (K-15). Keputusan PM/QA yang tercatat (K-02, K-32, K-43, K-47) tetap dipakai.
- **Penarikan (Desain vs PRD, 30 Okt 2026)**: status ikut Validasi PRD dan desain (Diajukan, Diterima, Ditolak), bukan "Menunggu Approval"/"Berhasil" di AC (D-11). Tombol Buat Pengajuan hanya untuk Fundraiser (D-12). Tombol Edit di detail Ditolak hanya untuk Fundraiser pemilik dan mengajukan ulang data yang sama (D-13). Dana yang dapat ditarik = Total Terkumpul (Net) − penarikan Diterima − penarikan yang masih Diajukan; nominal minimal lebih dari Rp0 (D-15). Catatan opsional maksimal 250 karakter, tombol Batal dan Ajukan Penarikan nonaktif saat form kosong (ikut desain), dan ada pop-up "Apakah Anda yakin ingin mengajukan penarikan dana ini?" (D-16).
- **Label Nama Bank**: semua halaman memakai "Nama Bank Rekening Penarikan" (seragam di Figma sejak 3 Nov 2026, D-21).
- **Nama Pemilik Rekening Penarikan (desain 3 Nov 2026)**: aturan validasi belum diatur PRD (K-51); sementara wajib, huruf dan spasi, maksimal 100 karakter. Data lama diisi dengan Nama Fundraiser.
- **Tampilan kosong (desain 3 Nov 2026)**: Fundraiser (Admin), Transaksi, dan Penarikan tanpa tabel, kartu, dan Export; Penarikan versi Fundraiser punya tombol Buat Pengajuan. Ilustrasinya disalin dari Figma (Copy as SVG, 10 Nov 2026: 1004:19892, 1011:35382, 1011:35530).

- **Transaksi (Desain vs PRD, 30 Okt 2026)**: status mengikuti desain (Diproses, Gagal), padahal PRD memakai Pending dan Gagal/expired (D-07). Donatur anonim tampil "Anonim", dan Email/Nomor Telepon-nya "-" (D-08). Tampilan Fundraiser memakai desain Admin dengan data milik sendiri (D-09).

- **K-01** (terjawab PM 27 Okt) Tab/browser ditutup lalu dibuka lagi ≤ 24 jam tetap login; ≥ 24 jam harus login ulang. Aturan 7 hari dihapus. Diam 30 menit tetap otomatis logout.
- **K-02** (terjawab PM 27 Okt) Password 8–25 karakter tanpa spasi; huruf, angka, dan simbol tidak wajib semuanya.
- **K-06** (terjawab PM 27 Okt) Kategori fundraiser berupa teks bebas, huruf + spasi (spasi = standar QA), 5–20 karakter.
- **K-08** (terjawab desainer 30 Okt) Untuk fundraiser yang belum terverifikasi, menu Transaksi dan Penarikan tetap tampil tetapi abu-abu dan tidak bisa diklik.
- **K-35** (terjawab desainer 30 Okt) Label Ditolak memang dibedakan: fundraiser memakai "Tanggal Verifikasi" dan "Alasan Ditolak", program memakai "Tanggal Persetujuan" dan "Alasan Penolakan".
- **K-07** (terjawab desain 27 Okt) Setelah ditolak, fundraiser memperbaiki data lewat Edit lalu statusnya kembali "Menunggu Verifikasi". Email status dikirim saat disetujui maupun ditolak; sejak desain 30 Okt templatenya dibedakan dan email ditolak berisi alasan.
- **K-11 & K-12** (terjawab PM 28 Okt) Program masih Aktif sampai 23.59 WIB di tanggal berakhir (sisa waktu "0 Hari"), lalu Selesai mulai hari berikutnya. Program Draf atau Menunggu Persetujuan yang tanggal berakhirnya lewat juga otomatis Selesai dan tidak bisa disetujui lagi.
- **K-13** (terjawab meeting 30 Okt, ikut desain Hifi) Draf bisa mengubah semua field. Ditolak, Aktif, dan Selesai bisa mengubah semua field kecuali Nama Program; form edit hanya punya tombol Batal dan Simpan dengan pop-up "Apakah Anda yakin untuk menyimpan perubahan ini?". Program Ditolak lalu Menunggu Persetujuan. Perubahan program Aktif dan Selesai langsung berlaku tanpa persetujuan Admin, dan program Selesai yang diperpanjang langsung Aktif kembali. Detail program Selesai menampilkan sisa waktu "0 Hari".
  - Draf/pengajuan yang menjadi Selesai karena tanggalnya lewat tidak bisa diedit (asumsi prototipe).
- **K-16** (terjawab PM 28 Okt) Fee 3% dibulatkan ke atas ke rupiah penuh, dihitung per program (Rp10.001 → fee Rp301, Net Rp9.700); kartu Total Fee = jumlah fee tiap program. Persentase Tercapai tampil angka bulat, dibulatkan ke bawah (keputusan QA 28 Okt).
- **K-23 & K-43** (terjawab PM 28 Okt, diperbarui desain 3 Nov) Fundraiser bisa mengedit data saat Ditolak (semua field kecuali Email) atau Terverifikasi (hanya Nomor Telepon dan Alamat); Menunggu Verifikasi tidak bisa. Kolom Email terkunci.
- **K-21** (terjawab 28 Okt) File export berformat Excel (.xlsx), sama seperti export di payment gateway. Teks disimpan sebagai sel teks, jadi nomor HP, rekening, dan NPWP tidak berubah dan isi yang diawali `=`, `+`, `-`, `@` tidak dibaca sebagai rumus.
- **K-25** (terjawab PRD & PM 28 Okt) Nomor Izin Usaha maksimal 25 karakter, boleh huruf, angka, dan simbol (termasuk "/" dan "-", contoh 503/123/DPMPTSP/2026). Standar QA: spasi di tengah ditolak dan isian harus berisi huruf atau angka.
- **K-45** (sebagian terjawab 28 Okt) Nama program tidak boleh sama dengan program lain mana pun, termasuk milik fundraiser lain dan program Selesai (cakupan seluruh platform masih asumsi).
- Standar keamanan: meminta tautan reset baru membatalkan tautan lama.
- **K-30** Target terkumpul cukup lebih dari 0 (batas maksimal belum ditentukan).
- **Baru (update desain 26 Okt 2026)**:
  - Program **Selesai** bisa diedit, mengikuti desain (pensil & tombol Edit aktif) dan PRD (lihat K-13).
  - **K-32** (terjawab 29 Okt) Lupa Password ikut PRD: pesannya selalu "Jika email terdaftar, tautan reset sudah dikirim", baik email terdaftar maupun tidak (desain akan disesuaikan). Login memakai satu pesan umum "Email atau password salah".
  - Kolom "Nama Fundraiser" di tabel Program hanya untuk Admin (AC View List). **K-20** (terjawab 29 Okt): Admin tidak membuat atau mengedit program, jadi tombol Buat Program Baru dan Edit tidak tampil untuk Admin.
- **Baru (update desain 26 Okt 2026 malam)**:
  - Ikon ☰ di topbar meringkas sidebar menjadi ikon saja (desain 3 Nov; sebelumnya disembunyikan), dan kondisinya tetap sama setelah refresh (29 Okt). Dropdown menu pengguna tertutup dengan klik nama lagi, klik di luar, atau Esc. Kalau klik Keluar saat ada isian form yang belum disimpan (Buat/Edit Program, Edit Fundraiser), pop-up "Keluar" ikut memperingatkan bahwa data akan hilang (K-38, 29 Okt).
- **Baru (update desain 27 Okt 2026)**:
  - **K-39** (terjawab desain 3 Nov) Fundraiser Terverifikasi yang mengedit data tidak lagi diverifikasi ulang: hanya Nomor Telepon dan Alamat yang bisa diubah, jadi rekening tidak bisa diganti dan program, Transaksi, serta Penarikan tidak terpengaruh. Data lama yang masih "verifikasi ulang" otomatis dikembalikan ke Terverifikasi.
  - **K-40** Email status verifikasi dibedakan untuk disetujui dan ditolak (desain 30 Okt, email ditolak berisi alasan); tidak ada email setelah registrasi, mengikuti desain. Tautan cadangan di email reset memakai domain prototipe (di desain contohnya financeadmin.app).
- **Baru (audit QA v6, 27 Okt 2026)**, belum diatur PRD:
  - Standar QA (tidak perlu konfirmasi PM): email dan semua field teks dibersihkan sebelum divalidasi dan disimpan: spasi/tab/baris baru di awal & akhir dibuang, non-breaking space jadi spasi biasa, karakter tak terlihat (zero-width space) dibuang. Batas minimal/maksimal dihitung setelahnya. Password tidak di-trim; No. HP tetap ikut PRD (spasi di awal/akhir = error).
  - Standar QA: email maksimal 254 karakter.
  - Nomor telepon cukup angka 10–13 digit; awalan (08/62) tidak dicek (keputusan QA).
  - **K-42** Sesi dibagi semua tab: aktivitas di tab mana pun (termasuk mengetik) menahan logout, dan logout/ganti akun di satu tab langsung berlaku di tab lain.
  - Target Terkumpul: nominal yang ditempel ("Rp 15.000.000", "15.000.000,00") dibaca sebagai Rp15.000.000, tidak jadi 100× lipat. Kursor tidak lompat ke akhir saat mengedit angka di tengah.
