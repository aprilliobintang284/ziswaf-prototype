export type Role = 'admin' | 'fundraiser'

export type FundraiserStatus = 'Menunggu Verifikasi' | 'Terverifikasi' | 'Ditolak'

// Nama status mengikuti desain Hifi (update: "Diterima" → "Aktif"). "Selesai" dihitung otomatis dari tanggal berakhir.
export type ProgramStatus = 'Draf' | 'Menunggu Persetujuan' | 'Aktif' | 'Ditolak' | 'Selesai'

export interface User {
  id: string
  email: string
  password: string
  role: Role
  name: string
  fundraiserId?: string
}

export interface DocFile {
  name: string
  size: number
  type: string
}

export interface Fundraiser {
  id: string
  email: string
  phone: string
  name: string
  category: string
  businessField: string
  licenseNo: string
  address: string
  bankName: string
  withdrawAccount: string
  commodityAccount: string
  npwp: string
  doc: DocFile
  registeredAt: string
  status: FundraiserStatus
  verifiedAt?: string
  rejectedAt?: string
  rejectReason?: string
  /** Menunggu Verifikasi karena fundraiser Terverifikasi mengedit datanya (K-39), bukan pendaftaran baru */
  reverify?: boolean
}

export interface Program {
  id: string
  fundraiserId: string
  title: string
  target: number
  endDate: string // YYYY-MM-DD
  description: string
  image: string
  status: Exclude<ProgramStatus, 'Selesai'>
  gross: number
  donors: number
  createdAt: string
  // "Tanggal Persetujuan" di desain: tanggal Admin menyetujui/menolak pengajuan
  decidedAt?: string
  rejectReason?: string
}

// Status transaksi mengikuti desain Hifi Transaksi (30 Okt 2026); PRD memakai "Pending" dan "Gagal/expired"
// (Desain vs PRD D-07).
export type TransactionStatus = 'Menunggu Pembayaran' | 'Diproses' | 'Berhasil' | 'Gagal'

export interface Transaction {
  id: string // contoh TS-001
  programId: string
  donorName: string
  email: string
  phone: string // nomor HP donatur opsional (PRD) → bisa kosong
  /** Donatur mencentang "Sembunyikan Data Donatur" → tampil "Anonim" */
  anonymous: boolean
  amount: number
  createdAt: string
  status: TransactionStatus
}

// Status penarikan mengikuti Validasi PRD dan desain Hifi Penarikan (30 Okt 2026). AC PRD masih menulis
// "Menunggu Approval" dan "Berhasil" (Desain vs PRD D-11).
export type WithdrawalStatus = 'Diajukan' | 'Diterima' | 'Ditolak'

export interface Withdrawal {
  id: string // contoh WD-001
  programId: string
  fundraiserId: string
  amount: number
  note: string
  /** Rekening tujuan saat diajukan (default dari data registrasi fundraiser) */
  bankName: string
  account: string
  createdAt: string
  status: WithdrawalStatus
  /** "Tanggal Validasi" di desain: tanggal Admin menyetujui/menolak */
  decidedAt?: string
  rejectReason?: string
}

export interface SimEmail {
  id: string
  to: string
  subject: string
  body: string
  createdAt: string
  resetToken?: string
  /** Template email punya tombol "Masuk" (Password Berhasil Diubah, status verifikasi fundraiser) */
  loginButton?: boolean
  /** Paragraf setelah tombol (template email desain 27 Okt) */
  footer?: string
}

export interface ResetToken {
  token: string
  email: string
  createdAt: string
  used: boolean
  revoked: boolean
}

export interface Session {
  userId: string
  lastActive: string
}

export interface DB {
  version: number
  users: User[]
  fundraisers: Fundraiser[]
  programs: Program[]
  transactions: Transaction[]
  withdrawals: Withdrawal[]
  emails: SimEmail[]
  resetTokens: ResetToken[]
  session: Session | null
}
