import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { Icon } from './icons'
import type { IconName } from './icons'
import { checkPassword } from '../lib/validation'
import type { FundraiserStatus, ProgramStatus, TransactionStatus } from '../lib/types'

// ---------------- Field ----------------
interface FieldProps {
  label: string
  required?: boolean
  error?: string
  // Border merah tanpa teks (mis. field Email saat login gagal)
  invalid?: boolean
  hint?: string
  className?: string
  children: ReactNode
}

export function Field({ label, required, error, invalid, hint, className = '', children }: FieldProps) {
  return (
    <div className={`field ${error || invalid ? 'has-error' : ''} ${className}`}>
      <label>{label}{required && <span className="req"> *</span>}</label>
      {children}
      {error ? <ErrorText>{error}</ErrorText> : hint ? <span className="hint-text">{hint}</span> : null}
    </div>
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <span className="error-text"><Icon name="alert-circle" />{children}</span>
}

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false)
  return (
    <div className="input-wrap">
      <input {...props} type={show ? 'text' : 'password'} className="input with-icon" />
      <button type="button" className="input-icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}>
        <Icon name={show ? 'eye' : 'eye-off'} />
      </button>
    </div>
  )
}

export function PasswordCriteria({ value }: { value: string }) {
  const c = checkPassword(value)
  // PRD & PM 27 Okt 2026: huruf, angka, dan simbol tidak wajib semuanya (boleh salah satu sampai ketiganya)
  const items: [boolean, string][] = [
    [c.length, 'Minimal 8 karakter dan maksimal 25 karakter'],
    [value.length > 0 && c.noSpace, 'Tidak mengandung spasi'],
  ]
  return (
    <div className="criteria">
      <span className="criteria-title">Kriteria Password:</span>
      {items.map(([ok, text]) => (
        <span key={text} className={'criteria-item' + (ok ? ' ok' : '')}>
          <Icon name={ok ? 'check-circle' : 'check-circle-off'} />{text}
        </span>
      ))}
      <span className="criteria-note">Boleh berisi huruf, angka, dan/atau simbol (tidak wajib ketiganya).</span>
    </div>
  )
}

// ---------------- Badge ----------------
type BadgeStatus = FundraiserStatus | ProgramStatus | TransactionStatus

const BADGE: Record<BadgeStatus, string> = {
  'Menunggu Verifikasi': 'orange',
  Terverifikasi: 'green',
  Ditolak: 'red',
  'Menunggu Persetujuan': 'orange',
  Aktif: 'green',
  Draf: 'gray',
  Selesai: 'blue',
  // Transaksi (desain Hifi 30 Okt 2026)
  'Menunggu Pembayaran': 'orange',
  Diproses: 'blue',
  Berhasil: 'green',
  Gagal: 'red',
}

export function StatusBadge({ status, small = false }: { status: BadgeStatus; small?: boolean }) {
  return <span className={`badge ${BADGE[status]} ${small ? 'sm' : ''}`}>{status}</span>
}

// ---------------- Modal ----------------
type ModalIcon = 'warn' | 'ok' | 'bad' | 'mail' | 'logout'

const ICONS: Record<ModalIcon, IconName> = {
  warn: 'modal-warn',
  ok: 'modal-success',
  bad: 'modal-expired',
  mail: 'modal-mail',
  logout: 'modal-logout',
}

export function Modal({ icon, title, children, actions }: { icon: ModalIcon; title: string; children?: ReactNode; actions: ReactNode }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal">
        <Icon name={ICONS[icon]} className="modal-icon" />
        <h3 className="modal-title">{title}</h3>
        {children && <p className="modal-text">{children}</p>}
        {actions}
      </div>
    </div>
  )
}

export function ConfirmModal({ title, text, onNo, onYes, icon = 'warn' }: { title: string; text: string; onNo: () => void; onYes: () => void; icon?: ModalIcon }) {
  return (
    <Modal icon={icon} title={title} actions={
      <div className="modal-actions">
        <button className="btn btn-outline" onClick={onNo}>Tidak</button>
        <button className="btn btn-primary" onClick={onYes}>Ya</button>
      </div>
    }>{text}</Modal>
  )
}

// ---------------- Toast ----------------
interface ToastItem { id: number; text: string; kind: 'ok' | 'err' | 'info'; leaving?: boolean }
const ToastCtx = createContext<(text: string, kind?: ToastItem['kind']) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)
  const push = useCallback((text: string, kind: ToastItem['kind'] = 'ok') => {
    const id = ++seq.current
    setItems((x) => [...x, { id, text, kind }])
    // Ditandai "leaving" dulu supaya animasi keluarnya jalan, baru dilepas
    setTimeout(() => setItems((x) => x.map((t) => (t.id === id ? { ...t, leaving: true } : t))), 3000)
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3200)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts">{items.map((t) => <div key={t.id} className={`toast ${t.kind}${t.leaving ? ' leaving' : ''}`}>{t.text}</div>)}</div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)

// ---------------- Pagination ----------------
export function usePaged<T>(rows: T[]) {
  const [size, setSize] = useState(10)
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(rows.length / size))
  useEffect(() => { if (page > pages) setPage(pages) }, [page, pages])
  const slice = useMemo(() => rows.slice((page - 1) * size, page * size), [rows, page, size])
  return { slice, page, pages, size, setPage, setSize: (n: number) => { setSize(n); setPage(1) }, offset: (page - 1) * size }
}

export function TableFooter({ page, pages, size, setPage, setSize }: { page: number; pages: number; size: number; setPage: (n: number) => void; setSize: (n: number) => void }) {
  const nums: (number | '…')[] = []
  if (pages <= 5) for (let i = 1; i <= pages; i++) nums.push(i)
  else {
    const start = Math.max(1, Math.min(page - 1, pages - 3))
    for (let i = start; i < start + 3; i++) nums.push(i)
    if (start + 3 < pages) nums.push('…')
    nums.push(pages)
  }
  return (
    <div className="table-foot">
      <label className="rows-select">Baris per halaman
        <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
          {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <div className="pager">
        <button disabled={page === 1} onClick={() => setPage(1)} aria-label="Halaman pertama"><Icon name="chevrons-left" size={18} tint /></button>
        <button disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Halaman sebelumnya"><Icon name="chevron-left" size={18} tint /></button>
        {nums.map((n, i) => n === '…'
          ? <span key={'g' + i} className="gap">…</span>
          : <button key={n} className={n === page ? 'active' : ''} onClick={() => setPage(n)}>{n}</button>)}
        <button disabled={page === pages} onClick={() => setPage(page + 1)} aria-label="Halaman berikutnya"><Icon name="chevron-left" size={18} tint flip /></button>
        <button disabled={page === pages} onClick={() => setPage(pages)} aria-label="Halaman terakhir"><Icon name="chevrons-left" size={18} tint flip /></button>
      </div>
    </div>
  )
}
