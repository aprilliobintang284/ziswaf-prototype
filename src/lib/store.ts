import { useSyncExternalStore } from 'react'
import { createSeed, DB_VERSION } from './seed'
import { daysLeft } from './format'
import type { DB, Program, ProgramStatus } from './types'

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
export const FEE_RATE = 0.03

export function feeOf(p: Program): number {
  return Math.round(p.gross * FEE_RATE) // K-16: aturan pembulatan belum ditentukan
}

export function netOf(p: Program): number {
  return p.gross - feeOf(p)
}

export function statusOf(p: Program): ProgramStatus {
  if (p.pendingEdit) return 'Menunggu Persetujuan'
  if (p.status === 'Aktif' && daysLeft(p.endDate) < 0) return 'Selesai'
  return p.status
}

// Desain Hifi terbaru: pensil/Edit hanya nonaktif untuk "Menunggu Persetujuan" (Selesai pun bisa diedit — perlu konfirmasi)
export const EDITABLE: ProgramStatus[] = ['Draf', 'Ditolak', 'Aktif', 'Selesai']

export function isLive(p: Program): boolean {
  return p.status === 'Aktif'
}
