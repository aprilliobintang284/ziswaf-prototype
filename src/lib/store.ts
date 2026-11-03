import { useSyncExternalStore } from 'react'
import { createSeed, DB_VERSION, seedTransactions, seedWithdrawals } from './seed'
import { daysLeft } from './format'
import type { DB, Fundraiser, Program, ProgramStatus } from './types'

const KEY = 'ziswaf-proto-db'

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DB
      if (parsed.version === 3) return migrateV7(migrateV6(migrateV5(migrateV4(migrateV3(parsed)))))
      if (parsed.version === 4) return migrateV7(migrateV6(migrateV5(migrateV4(parsed))))
      if (parsed.version === 5) return migrateV7(migrateV6(migrateV5(parsed)))
      if (parsed.version === 6) return migrateV7(migrateV6(parsed))
      if (parsed.version === 7) return migrateV7(parsed)
      if (parsed.version === DB_VERSION) return parsed
    }
  } catch {
    // localStorage tidak tersedia / data rusak → pakai data awal
  }
  return createSeed()
}

/** v3 → v4: status "Diterima" diganti "Aktif" (update desain), startDate → decidedAt. Data & sesi tetap. */
function migrateV3(db: DB): DB {
  db.programs.forEach((p) => {
    const old = p as unknown as { status: string; startDate?: string; decidedAt?: string }
    if (old.status === 'Diterima') old.status = 'Aktif'
    if (old.startDate) { old.decidedAt = old.startDate + 'T10:00:00'; delete old.startDate }
  })
  db.version = 4
  return db
}

/** v4 → v5: menu Transaksi (desain Hifi 30 Okt 2026) → tambahkan transaksi dummy. Data & sesi tetap. */
function migrateV4(db: DB): DB {
  db.transactions = seedTransactions(db.programs)
  db.version = 5
  return db
}

/** v5 → v6: perubahan program Aktif tidak lagi menunggu persetujuan (meeting 30 Okt 2026) → yang tertunda langsung diterapkan. */
function migrateV5(db: DB): DB {
  db.programs.forEach((p) => {
    const old = p as Program & { pendingEdit?: Partial<Program> }
    if (old.pendingEdit) { Object.assign(p, old.pendingEdit); delete old.pendingEdit }
  })
  db.version = 6
  return db
}

/** v6 → v7: menu Penarikan (desain Hifi 30 Okt 2026) → tambahkan penarikan dummy. Data & sesi tetap. */
function migrateV6(db: DB): DB {
  db.fundraisers.forEach((f) => { f.accountName ??= f.name })
  db.withdrawals = seedWithdrawals(db.programs, db.fundraisers)
  db.version = 7
  return db
}

/**
 * v7 → v8 (desain 3 Nov 2026): field Nama Pemilik Rekening Penarikan, dan akun Terverifikasi tidak lagi
 * diverifikasi ulang setelah mengedit data → akun yang sedang “verifikasi ulang” dikembalikan ke Terverifikasi.
 */
function migrateV7(db: DB): DB {
  db.fundraisers.forEach((f) => {
    const old = f as Fundraiser & { reverify?: boolean }
    f.accountName ??= f.name
    if (old.reverify) {
      f.status = 'Terverifikasi'
      f.verifiedAt ??= new Date().toISOString()
    }
    delete old.reverify
  })
  db.withdrawals.forEach((w) => {
    w.accountName ??= db.fundraisers.find((f) => f.id === w.fundraiserId)?.accountName ?? ''
  })
  db.version = DB_VERSION
  return db
}

let state: DB = load()
const listeners = new Set<() => void>()

// Tab lain mengubah data (simpan, logout, ganti akun) → muat ulang, supaya tab ini ikut berganti
// dan tidak menimpa data terbaru dengan salinan lama saat menyimpan (K-42).
window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return
  state = load()
  listeners.forEach((l) => l())
})

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Kuota penuh (misalnya banyak foto) → data tetap ada selama tab terbuka
    console.warn('Data prototipe tidak bisa disimpan ke localStorage (kuota penuh).')
  }
}

export function getDB(): DB {
  return state
}

export function setDB(mutate: (draft: DB) => void) {
  const draft = structuredClone(state)
  mutate(draft)
  state = draft
  persist()
  listeners.forEach((l) => l())
}

export function resetDB() {
  state = createSeed()
  persist()
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useDB(): DB {
  return useSyncExternalStore(subscribe, () => state)
}

// ---------------- Turunan data program ----------------
export const FEE_PERCENT = 3

// K-16 (PM 28 Okt 2026): fee dibulatkan ke atas ke rupiah penuh, dihitung per program.
// Pakai bilangan bulat (gross × 3 / 100), bukan gross × 0.03, supaya galat desimal tidak membuat
// Rp15.000.000 jadi fee Rp450.001.
export function feeOf(p: Program): number {
  return Math.ceil((p.gross * FEE_PERCENT) / 100)
}

export function netOf(p: Program): number {
  return p.gross - feeOf(p)
}

// K-11/K-12 (PM 28 Okt 2026): program masih berjalan sampai 23.59 WIB di tanggal berakhir, lalu Selesai.
// Draf dan Menunggu Persetujuan yang tanggalnya lewat juga otomatis Selesai.
const ENDS: ProgramStatus[] = ['Aktif', 'Draf', 'Menunggu Persetujuan']

export function statusOf(p: Program): ProgramStatus {
  if (ENDS.includes(p.status) && p.endDate && daysLeft(p.endDate) < 0) return 'Selesai'
  return p.status
}

/**
 * Fundraiser boleh memakai fitur program, Transaksi, dan Penarikan hanya saat Terverifikasi. Sejak desain 3 Nov 2026
 * akun Terverifikasi yang mengedit data (Nomor Telepon/Alamat) tetap Terverifikasi, jadi tidak ada lagi verifikasi ulang.
 */
export function fundraiserActive(f: Fundraiser | null | undefined): f is Fundraiser {
  return !!f && f.status === 'Terverifikasi'
}

// Desain Hifi terbaru: pensil/Edit hanya nonaktif untuk "Menunggu Persetujuan" (Selesai bisa diedit, PRD 27 Okt 2026)
export const EDITABLE: ProgramStatus[] = ['Draf', 'Ditolak', 'Aktif', 'Selesai']

/**
 * Asumsi prototipe: program Selesai yang belum pernah tayang (draf atau pengajuan yang tanggalnya lewat, K-12)
 * tidak bisa diedit, karena aturan edit program Selesai di PRD berlaku untuk program yang pernah tayang dan
 * pengajuannya sudah tidak bisa disetujui. Program Selesai yang pernah tayang tetap bisa diedit sesuai PRD.
 */
export function canEditProgram(p: Program): boolean {
  const s = statusOf(p)
  return EDITABLE.includes(s) && !(s === 'Selesai' && p.status !== 'Aktif')
}

export function isLive(p: Program): boolean {
  return p.status === 'Aktif'
}

// ---------------- Penarikan ----------------
/**
 * "Total Dana yang Dapat Ditarik" (desain Hifi Penarikan). Dasar perhitungan belum diatur PRD (Desain vs PRD D-15);
 * asumsi prototipe: Total Terkumpul (Net) dikurangi penarikan yang Diterima dan yang masih Diajukan, supaya dua
 * pengajuan yang menunggu tidak bisa melebihi dana program. Hanya program yang pernah tayang (Aktif/Selesai).
 */
export function withdrawable(db: DB, programId: string, exceptId?: string): number {
  const p = db.programs.find((x) => x.id === programId)
  if (!p || p.status !== 'Aktif') return 0
  const used = db.withdrawals
    .filter((w) => w.programId === programId && w.id !== exceptId && w.status !== 'Ditolak')
    .reduce((s, w) => s + w.amount, 0)
  return Math.max(0, netOf(p) - used)
}
