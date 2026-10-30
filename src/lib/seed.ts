import { addDays, todayISO } from './format'
import type { DB, Fundraiser, Program, Transaction, User, Withdrawal } from './types'

export const DB_VERSION = 7

const PALETTES: [string, string][] = [
  ['#0E8A7C', '#7FD1C5'],
  ['#2D6CDF', '#9CC3FF'],
  ['#E08A1E', '#FFD58F'],
  ['#7A4FD8', '#C9B6FF'],
  ['#C2410C', '#FDBA74'],
  ['#0F766E', '#99F6E4'],
]

/** Gambar banner contoh (SVG) untuk program seed — pengganti foto asli di desain. */
export function bannerSvg(title: string, seed = 0): string {
  const [a, b] = PALETTES[seed % PALETTES.length]
  const safe = title.replace(/[<>&"]/g, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="380" viewBox="0 0 800 380">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
<rect width="800" height="380" fill="url(#g)"/>
<circle cx="640" cy="90" r="140" fill="#fff" opacity=".12"/>
<circle cx="120" cy="340" r="180" fill="#fff" opacity=".08"/>
<path d="M0 300 L170 200 L300 270 L460 150 L620 250 L800 170 L800 380 L0 380Z" fill="#000" opacity=".12"/>
<path d="M600 175c0-22 18-38 38-38 12 0 22 6 28 15 6-9 16-15 28-15 20 0 38 16 38 38 0 36-48 62-66 78-18-16-66-42-66-78z" fill="#fff" opacity=".9"/>
<text x="40" y="330" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="700" fill="#fff">${safe}</text>
<text x="40" y="70" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="600" fill="#fff" opacity=".85">Gambar contoh</text>
</svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

function fr(
  id: string, name: string, email: string, category: string, status: Fundraiser['status'], regDaysAgo: number,
  extra: Partial<Fundraiser> = {},
): Fundraiser {
  const t = todayISO()
  const base: Fundraiser = {
    id, name, email, category, status,
    phone: '081234567890',
    businessField: 'Pengelolaan Zakat dan Dana Sosial',
    licenseNo: 'IZ2026' + id.replace(/\D/g, '').padStart(6, '0'),
    address: 'Jl. Kenanga No.10, Bogor, Jawa Barat',
    bankName: 'Bank Negara Indonesia',
    withdrawAccount: '9876543210',
    commodityAccount: '1234567890',
    npwp: '6543217890123456',
    doc: { name: 'Izin_Usaha.pdf', size: 1.2 * 1024 * 1024, type: 'application/pdf' },
    registeredAt: addDays(t, -regDaysAgo) + 'T09:00:00',
  }
  if (status === 'Terverifikasi') base.verifiedAt = addDays(t, -regDaysAgo + 1) + 'T10:00:00'
  if (status === 'Ditolak') {
    base.rejectedAt = addDays(t, -regDaysAgo + 1) + 'T10:00:00'
    base.rejectReason = 'Dokumen izin usaha tidak terbaca'
  }
  return { ...base, ...extra }
}

function prog(
  id: string, fundraiserId: string, title: string, status: Program['status'], target: number,
  endInDays: number, gross = 0, donors = 0, extra: Partial<Program> = {}, seed = 0,
): Program {
  const t = todayISO()
  return {
    id, fundraiserId, title, status, target, gross, donors,
    endDate: addDays(t, endInDays),
    description: `Program ini untuk menggalang dana ${title.toLowerCase()}. Dana yang terkumpul akan disalurkan langsung kepada penerima manfaat dan dilaporkan secara berkala.`,
    image: bannerSvg(title, seed),
    createdAt: addDays(t, -30 + seed) + 'T08:00:00',
    decidedAt: status === 'Aktif' ? addDays(t, -25 + seed) + 'T10:00:00'
      : status === 'Ditolak' ? addDays(t, -20 + seed) + 'T10:00:00' : undefined,
    ...extra,
  }
}

const DONORS = ['Andi', 'Siti Aminah', 'Budi Santoso', 'Rina Wati', 'Ahmad Fauzi', 'Dewi Lestari', 'Rizky Pratama',
  'Nur Aisyah', 'Hendra Gunawan', 'Fitri Handayani', 'Agus Salim', 'Maya Sari', 'Yusuf Hakim']

/**
 * Transaksi dummy untuk program yang pernah tayang. Transaksi Berhasil per program dijumlahkan sama persis
 * dengan Total Terkumpul (Gross) dan banyaknya sama dengan Jumlah Donatur, supaya angka di menu Program dan
 * Transaksi bisa dicocokkan. Ditambah beberapa transaksi Menunggu Pembayaran, Diproses, dan Gagal.
 */
export function seedTransactions(programs: Program[]): Transaction[] {
  let r = 20261030
  const rand = () => (r = (r * 1103515245 + 12345) % 2147483648) / 2147483648
  const now = Date.now()
  let k = 0
  const donorInfo = () => {
    const name = DONORS[k % DONORS.length]
    const slug = name.toLowerCase().replace(/[^a-z]/g, '')
    const tx = {
      donorName: name,
      email: `${slug}${k % 7 === 0 ? '' : k % 97}@gmail.com`,
      phone: k % 5 === 4 ? '' : '08' + String(1200000000 + Math.floor(rand() * 8799999999)).slice(0, 10),
      anonymous: k % 6 === 5,
    }
    k++
    return tx
  }
  const list: Omit<Transaction, 'id'>[] = []
  programs.forEach((p) => {
    if (p.status !== 'Aktif') return
    const start = new Date(p.decidedAt ?? p.createdAt).getTime()
    const end = Math.min(now - 60 * 60 * 1000, new Date(p.endDate + 'T23:59:59').getTime())
    const at = () => new Date(start + rand() * Math.max(1, end - start)).toISOString()
    if (p.donors > 0) {
      const base = Math.floor(p.gross / p.donors / 1000) * 1000
      const d = Math.min(25_000, Math.floor(base / 2000) * 1000)
      let sum = 0
      for (let i = 0; i < p.donors; i++) {
        const amount = i === p.donors - 1 ? p.gross - sum : base + (i % 2 === 0 ? d : -d)
        sum += amount
        list.push({ programId: p.id, ...donorInfo(), amount, createdAt: at(), status: 'Berhasil' })
      }
    }
    list.push({ programId: p.id, ...donorInfo(), amount: 50_000, createdAt: at(), status: 'Gagal' })
    // Masih berjalan → ada pembayaran yang belum selesai (QRIS berlaku 30 menit)
    if (new Date(p.endDate + 'T23:59:59').getTime() > now) {
      list.push({ programId: p.id, ...donorInfo(), amount: 100_000, createdAt: new Date(now - (5 + rand() * 20) * 60_000).toISOString(), status: 'Menunggu Pembayaran' })
      list.push({ programId: p.id, ...donorInfo(), amount: 25_000, createdAt: new Date(now - (30 + rand() * 60) * 60_000).toISOString(), status: 'Diproses' })
    }
  })
  return list
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((t, i) => ({ id: 'TS-' + String(i + 1).padStart(3, '0'), ...t }))
}

/**
 * Penarikan dummy (desain Hifi Penarikan 30 Okt 2026) untuk program yang pernah tayang. Total Diterima + Diajukan
 * per program tidak melebihi Total Terkumpul (Net), supaya batas "Total Dana yang Dapat Ditarik" tetap masuk akal.
 */
export function seedWithdrawals(programs: Program[], fundraisers: Fundraiser[]): Withdrawal[] {
  const t = todayISO()
  const plan: [string, number, Withdrawal['status'], number, string][] = [
    // [program, nominal, status, diajukan (hari lalu), catatan]
    ['p11', 5_000_000, 'Diterima', 12, 'Penyaluran tahap 1 untuk korban banjir'],
    ['p07', 4_000_000, 'Diterima', 11, 'Biaya operasi gelombang pertama'],
    ['p04', 1_000_000, 'Diterima', 9, 'Pembelian material atap'],
    ['p03', 400_000, 'Ditolak', 8, 'Pembelian kitab santri'],
    ['p11', 2_000_000, 'Diterima', 6, 'Penyaluran tahap 2'],
    ['p04', 500_000, 'Ditolak', 5, 'Biaya tukang'],
    ['p01', 300_000, 'Diterima', 4, 'Untuk keperluan pembelian alat'],
    ['p07', 5_000_000, 'Diajukan', 2, 'Biaya operasi gelombang kedua'],
    ['p10', 300_000, 'Diajukan', 1, ''],
    ['p11', 1_000_000, 'Diajukan', 1, 'Penyaluran tahap 3'],
    ['p01', 200_000, 'Diajukan', 0, 'Untuk keperluan pembelian alat'],
  ]
  return plan.flatMap(([pid, amount, status, ago, note], i) => {
    const p = programs.find((x) => x.id === pid)
    const f = fundraisers.find((x) => x.id === p?.fundraiserId)
    if (!p || !f || p.status !== 'Aktif') return []
    const w: Withdrawal = {
      id: 'WD-' + String(i + 1).padStart(3, '0'), programId: p.id, fundraiserId: f.id, amount, note,
      bankName: f.bankName, account: f.withdrawAccount, createdAt: addDays(t, -ago) + 'T09:30:00', status,
    }
    if (status !== 'Diajukan') w.decidedAt = addDays(t, -ago + 1) + 'T11:00:00'
    if (status === 'Ditolak') w.rejectReason = 'Permintaan penarikan dana terindikasi duplikat'
    return [w]
  })
}

export function createSeed(): DB {
  const fundraisers: Fundraiser[] = [
    fr('f01', 'Yayasan A', 'yayasan@gmail.com', 'Yayasan', 'Terverifikasi', 9),
    fr('f02', 'Individu A', 'individu@gmail.com', 'Individu', 'Terverifikasi', 9),
    fr('f03', 'Komunitas A', 'komunitas@gmail.com', 'Komunitas', 'Ditolak', 9),
    fr('f04', 'Yayasan B', 'yayasanb@gmail.com', 'Yayasan', 'Menunggu Verifikasi', 8),
    fr('f05', 'Individu B', 'individub@gmail.com', 'Individu', 'Terverifikasi', 8),
    fr('f06', 'Komunitas B', 'komunitasb@gmail.com', 'Komunitas', 'Ditolak', 8),
    fr('f07', 'Yayasan C', 'yayasanc@gmail.com', 'Yayasan', 'Menunggu Verifikasi', 7),
    fr('f08', 'Individu C', 'individuc@gmail.com', 'Individu', 'Terverifikasi', 7),
    fr('f09', 'Komunitas C', 'komunitasc@gmail.com', 'Komunitas', 'Ditolak', 7),
    fr('f10', 'Yayasan D', 'yayasand@gmail.com', 'Yayasan', 'Menunggu Verifikasi', 6),
    fr('f11', 'Yayasan E', 'yayasane@gmail.com', 'Yayasan', 'Terverifikasi', 5),
    fr('f12', 'Lembaga Amal F', 'lembagaf@gmail.com', 'Lembaga', 'Menunggu Verifikasi', 2),
  ]

  const users: User[] = [
    { id: 'u-admin', email: 'admin@ziswaf.id', password: 'Admin@2026', role: 'admin', name: 'Admin Ziswaf' },
    ...fundraisers.map((f) => ({
      id: 'u-' + f.id, email: f.email, password: 'Ziswaf@2026', role: 'fundraiser' as const, name: f.name, fundraiserId: f.id,
    })),
  ]

  const programs: Program[] = [
    prog('p01', 'f01', 'Sumbangan Darurat Bencana', 'Aktif', 10_000_000, 10, 1_000_000, 10, {}, 0),
    prog('p02', 'f01', 'Bantuan Air Bersih Desa', 'Menunggu Persetujuan', 5_000_000, 45, 0, 0, {}, 1),
    prog('p03', 'f01', 'Beasiswa Santri Yatim', 'Aktif', 5_000_000, 5, 500_000, 5, {}, 2),
    prog('p04', 'f05', 'Renovasi Masjid Al Ikhlas', 'Aktif', 8_000_000, 12, 2_000_000, 20, {}, 3),
    prog('p05', 'f01', 'Paket Sembako Lansia', 'Ditolak', 10_000_000, 30, 0, 0, { rejectReason: 'Deskripsi kurang lengkap' }, 4),
    prog('p06', 'f01', 'Wakaf Sumur Bor', 'Draf', 0, 60, 0, 0, {}, 5),
    prog('p07', 'f05', 'Operasi Katarak Gratis', 'Aktif', 15_000_000, 0, 15_000_000, 150, {}, 0),
    prog('p08', 'f11', 'Ambulans Gratis Dhuafa', 'Menunggu Persetujuan', 50_000_000, 90, 0, 0, {}, 1),
    prog('p09', 'f11', 'Sekolah Darurat Pengungsi', 'Draf', 25_000_000, 75, 0, 0, {}, 2),
    prog('p10', 'f05', 'Qurban untuk Pelosok', 'Aktif', 3_000_000, 3, 1_500_000, 15, {}, 3),
    prog('p11', 'f01', 'Bantuan Banjir Bekasi', 'Aktif', 10_000_000, -3, 12_000_000, 98, {}, 4),
    prog('p12', 'f01', 'Infaq Pendidikan Anak', 'Aktif', 20_000_000, 40, 2_500_000, 30, {}, 5),
  ]
  // p06: draf yang baru berisi judul
  programs[5].description = ''
  programs[5].image = ''

  return {
    version: DB_VERSION, users, fundraisers, programs, transactions: seedTransactions(programs),
    withdrawals: seedWithdrawals(programs, fundraisers), emails: [], resetTokens: [], session: null,
  }
}
