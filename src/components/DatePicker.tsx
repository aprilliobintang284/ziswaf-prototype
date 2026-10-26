import { useEffect, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { NAMA_BULAN, toISODate, todayISO } from '../lib/format'

const DOW = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

function toDisplay(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function fromDisplay(text: string): string {
  const m = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return text.trim()
  const [, d, mo, y] = m
  const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  const date = new Date(iso + 'T00:00:00')
  // Tolak tanggal yang tidak ada (contoh 31/02/2026)
  if (Number.isNaN(date.getTime()) || toISODate(date) !== iso) return 'invalid:' + text
  return iso
}

/** Date picker dengan tampilan seperti desain Hifi. Tanggal sebelum hari ini tidak bisa dipilih. */
export function DatePicker({ value, onChange, disabled, invalid }: { value: string; onChange: (iso: string) => void; disabled?: boolean; invalid?: boolean }) {
  const today = todayISO()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(toDisplay(value))
  const [temp, setTemp] = useState(value)
  const base = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T00:00:00') : new Date()
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setText(toDisplay(value)) }, [value])
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const first = new Date(view.y, view.m, 1)
  const offset = (first.getDay() + 6) % 7 // Senin sebagai hari pertama
  const cells = Array.from({ length: 42 }, (_, i) => new Date(view.y, view.m, 1 - offset + i))
  const shift = (months: number) => {
    const d = new Date(view.y, view.m + months, 1)
    setView({ y: d.getFullYear(), m: d.getMonth() })
  }

  return (
    <div className="input-wrap" ref={ref}>
      <input
        className={'input with-icon' + (invalid ? ' invalid' : '')}
        placeholder="Pilih tanggal berakhir program"
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => { if (text !== toDisplay(value)) onChange(text ? fromDisplay(text) : '') }}
        onFocus={() => { setTemp(value); setOpen(true) }}
      />
      <button type="button" className="input-icon-btn" disabled={disabled} onClick={() => { setTemp(value); setOpen((o) => !o) }} aria-label="Buka kalender">
        <Calendar size={18} />
      </button>
      {open && !disabled && (
        <div className="dp" role="dialog" aria-label="Pilih tanggal">
          <div className="dp-head">
            <div>
              <button type="button" onClick={() => shift(-12)} aria-label="Tahun sebelumnya"><ChevronsLeft size={16} /></button>
              <button type="button" onClick={() => shift(-1)} aria-label="Bulan sebelumnya"><ChevronLeft size={16} /></button>
            </div>
            <span>{NAMA_BULAN[view.m]} {view.y}</span>
            <div>
              <button type="button" onClick={() => shift(1)} aria-label="Bulan berikutnya"><ChevronRight size={16} /></button>
              <button type="button" onClick={() => shift(12)} aria-label="Tahun berikutnya"><ChevronsRight size={16} /></button>
            </div>
          </div>
          <div className="dp-grid">
            {DOW.map((d) => <span key={d} className="dp-dow">{d}</span>)}
            {cells.map((d) => {
              const iso = toISODate(d)
              const cls = ['dp-day', d.getMonth() !== view.m ? 'other' : '', iso === today ? 'today' : '', iso === temp ? 'sel' : ''].join(' ')
              return (
                <button type="button" key={iso} className={cls} disabled={iso < today} onClick={() => setTemp(iso)}>
                  {d.getDate()}
                </button>
              )
            })}
          </div>
          <div className="dp-foot">
            <button type="button" className="link" style={{ color: 'var(--primary)', fontWeight: 600 }} onClick={() => { onChange(temp); setOpen(false) }}>Simpan</button>
          </div>
        </div>
      )}
    </div>
  )
}
