const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
export const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
export const NAMA_BULAN = BULAN

export function rupiah(n: number): string {
  return 'Rp' + Math.round(n).toLocaleString('id-ID')
}

export function digitsToRupiahText(digits: string): string {
  if (!digits) return ''
  return Number(digits).toLocaleString('id-ID')
}

/** Nominal yang ditempel (contoh "Rp 15.000.000" atau "15.000.000,00") → digit tanpa bagian desimal. */
export function pastedAmountToDigits(text: string): string {
  const s = text.trim().replace(/[.,]\d{1,2}$/, '')
  return s.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 15)
}

export function tanggal(iso?: string): string {
  if (!iso) return '-'
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`
}

export function todayISO(): string {
  const d = new Date()
  return toISODate(d)
}

export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/** Selisih hari kalender dari hari ini ke tanggal berakhir (0 = hari terakhir). */
export function daysLeft(endDate: string): number {
  const today = new Date(todayISO() + 'T00:00:00').getTime()
  const end = new Date(endDate + 'T00:00:00').getTime()
  return Math.round((end - today) / 86400000)
}

export function fileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB'
  return Math.max(1, Math.round(bytes / 1024)) + ' KB'
}

export function uid(prefix: string): string {
  return prefix + '-' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)
}
