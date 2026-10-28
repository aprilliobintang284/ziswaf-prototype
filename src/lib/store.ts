import { useSyncExternalStore } from 'react'
import { createSeed, DB_VERSION } from './seed'
import { daysLeft } from './format'
import type { DB, Fundraiser, Program, ProgramStatus } from './types'

const KEY = 'ziswaf-proto-db'

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DB
      if (parsed.version === 3) return migrateV3(parsed)
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
  if (p.pendingEdit) return 'Menunggu Persetujuan'
  if (ENDS.includes(p.status) && p.endDate && daysLeft(p.endDate) < 0) return 'Selesai'
  return p.status
}

/**
 * Fundraiser boleh memakai fitur program, Transaksi, dan Penarikan: Terverifikasi, atau sedang
 * diverifikasi ulang setelah mengedit data (K-39, PM 28 Okt 2026: fitur tidak dikunci selama menunggu).
 */
export function fundraiserActive(f: Fundraiser | null | undefined): f is Fundraiser {
  return !!f && (f.status === 'Terverifikasi' || (f.status === 'Menunggu Verifikasi' && !!f.reverify))
}

// Desain Hifi terbaru: pensil/Edit hanya nonaktif untuk "Menunggu Persetujuan" (Selesai bisa diedit, PRD 27 Okt 2026)
export const EDITABLE: ProgramStatus[] = ['Draf', 'Ditolak', 'Aktif', 'Selesai']

/**
 * Program Selesai yang belum pernah tayang (draf atau pengajuan yang tanggalnya lewat, K-12) sudah final,
 * jadi tidak bisa diedit lagi (keputusan QA 28 Okt 2026: lanjutkan dengan program baru).
 */
export function canEditProgram(p: Program): boolean {
  const s = statusOf(p)
  return EDITABLE.includes(s) && !(s === 'Selesai' && p.status !== 'Aktif')
}

export function isLive(p: Program): boolean {
  return p.status === 'Aktif'
}
