import { useEffect, useSyncExternalStore } from 'react'

// Penanda ada isian form yang belum disimpan di halaman dashboard. Dipakai pop-up "Keluar" supaya ikut
// memperingatkan data yang akan hilang (K-38, keputusan 29 Okt 2026; AC Create #5 & AC Edit #4).
let unsaved = false
const listeners = new Set<() => void>()

function set(v: boolean) {
  if (unsaved === v) return
  unsaved = v
  listeners.forEach((l) => l())
}

/** Dipanggil halaman form: menandai ada perubahan yang belum disimpan selama halaman masih terbuka. */
export function useMarkUnsaved(dirty: boolean) {
  useEffect(() => {
    set(dirty)
    return () => set(false)
  }, [dirty])
}

export function useHasUnsaved(): boolean {
  return useSyncExternalStore((l) => {
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, () => unsaved)
}
