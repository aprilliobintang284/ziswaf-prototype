import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { ConfirmModal, Field, useToast } from '../components/ui'
import { Icon } from '../components/icons'
import { Presence } from '../components/motion'
import { useMarkUnsaved } from '../lib/unsaved'
import { fundraiserActive, statusOf, useDB, withdrawable } from '../lib/store'
import { submitWithdrawal } from '../lib/actions'
import { digitsToRupiahText, pastedAmountToDigits, rupiah } from '../lib/format'
import { shownError } from '../lib/validation'

type Key = 'program' | 'amount' | 'note'
const NOTE_MAX = 250 // batas Catatan belum diatur PRD/desain → asumsi sama dengan Alasan Penolakan (Desain vs PRD D-16)

/**
 * Pengajuan Penarikan Dana (desain Hifi Skenario 4, frame 860:42292–860:42645).
 * PRD: hanya program Aktif atau Selesai yang masih punya dana; rekening default dari data registrasi;
 * Program berupa dropdown; pengajuan tidak bisa diubah setelah dikirim (kecuali diajukan ulang setelah Ditolak, D-13).
 */
export function PenarikanFormPage() {
  const db = useDB()
  const nav = useNavigate()
  const toast = useToast()
  const { id } = useParams()
  const user = db.users.find((u) => u.id === db.session?.userId)!
  const fundraiser = db.fundraisers.find((f) => f.id === user.fundraiserId)
  const editing = id ? db.withdrawals.find((w) => w.id === id) : undefined

  const guard = useMemo(() => {
    if (user.role !== 'fundraiser') return 'Admin tidak dapat mengajukan penarikan'
    if (!fundraiserActive(fundraiser)) return 'Penarikan bisa diajukan setelah akun Anda terverifikasi'
    if (id && (!editing || editing.fundraiserId !== fundraiser.id)) return 'Data penarikan tidak ditemukan'
    if (editing && editing.status !== 'Ditolak') return 'Pengajuan yang sudah dikirim tidak bisa diubah'
    return null
  }, [user, fundraiser, id, editing])

  // Program yang pernah tayang (Aktif atau Selesai) dan masih punya dana yang bisa ditarik
  const options = useMemo(() => db.programs
    .filter((p) => p.fundraiserId === user.fundraiserId && p.status === 'Aktif')
    .map((p) => ({ id: p.id, title: p.title, selesai: statusOf(p) === 'Selesai', max: withdrawable(db, p.id, editing?.id) }))
    .filter((o) => o.max > 0 || o.id === editing?.programId),
  [db, user.fundraiserId, editing])

  const initial = useMemo(() => ({
    program: editing?.programId ?? '',
    amount: editing ? String(editing.amount) : '',
    note: editing?.note ?? '',
  }), [editing])
  const [v, setV] = useState(initial)
  const [touched, setTouched] = useState<Partial<Record<Key, boolean>>>({})
  const [confirm, setConfirm] = useState(false)
  const skipBlock = useRef(false)
  const dirty = JSON.stringify(v) !== JSON.stringify(initial)
  useMarkUnsaved(dirty)

  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    !skipBlock.current && dirty && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  // Nominal berformat titik ribuan: kursor dijaga di digit yang sedang diedit (sama dengan Target di form Program)
  const amountRef = useRef<HTMLInputElement>(null)
  const caret = useRef<number | null>(null)
  useLayoutEffect(() => {
    const el = amountRef.current
    if (caret.current === null || !el) return
    let pos = 0
    for (let seen = 0; pos < el.value.length && seen < caret.current; pos++) if (/\d/.test(el.value[pos])) seen++
    el.setSelectionRange(pos, pos)
    caret.current = null
  }, [v.amount])

  const touchProgram = useCallback(() => setTouched((t) => (t.program ? t : { ...t, program: true })), [])

  const guardNotified = useRef(false)
  useEffect(() => {
    if (guard && !guardNotified.current) { guardNotified.current = true; toast(guard, 'err') }
  }, [guard, toast])
  if (guard) return <Navigate to="/dashboard/penarikan" replace />

  const selected = options.find((o) => o.id === v.program)
  const max = selected?.max ?? 0
  const amount = Number(v.amount || 0)
  const errs: Partial<Record<Key, string>> = {
    program: v.program ? undefined : 'Program wajib dipilih',
    amount: !v.amount ? 'Nominal wajib diisi'
      : amount <= 0 ? 'Nominal harus lebih dari 0' // K-30 serupa: batas minimal penarikan belum diatur (D-15)
        : selected && amount > max ? `Nominal melebihi dana yang dapat ditarik (maksimal ${rupiah(max)})` : undefined,
    note: v.note.trim().length > NOTE_MAX ? `Catatan maksimal ${NOTE_MAX} karakter` : undefined,
  }
  const shown = {
    program: touched.program ? errs.program : undefined,
    amount: shownError(errs.amount, v.amount, touched.amount),
    note: errs.note,
  }
  const valid = !Object.values(errs).some(Boolean)
  const set = (k: Key, val: string) => setV((s) => ({ ...s, [k]: val }))

  const onAmountChange = (el: HTMLInputElement) => {
    const all = el.value.replace(/\D/g, '')
    const lead = all.length - all.replace(/^0+(?=\d)/, '').length
    const digits = all.slice(lead, lead + 15)
    const before = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, '').length - lead
    caret.current = Math.max(0, Math.min(before, digits.length))
    set('amount', digits)
  }

  const run = () => {
    setConfirm(false)
    if (!submitWithdrawal(fundraiser!.id, { programId: v.program, amount, note: v.note }, editing?.id)) {
      // Contoh: dana program berubah di tab lain sehingga nominal melebihi batas
      toast('Pengajuan gagal dikirim. Periksa kembali nominal penarikan.', 'err')
      return
    }
    skipBlock.current = true
    toast(editing ? 'Pengajuan penarikan berhasil diajukan ulang' : 'Pengajuan penarikan berhasil dikirim')
    nav('/dashboard/penarikan')
  }

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">
          <button className="back" onClick={() => nav('/dashboard/penarikan')} aria-label="Kembali"><Icon name="back-arrow" size={26} tint /></button>
          Pengajuan Penarikan Dana
        </h1>
      </div>

      <div className="acct-card">
        <div className="acct-title">Rekening Penarikan</div>
        <div>Nama Bank Rekening Penarikan: {fundraiser!.bankName}</div>
        <div>Nomor Rekening Penarikan: {fundraiser!.withdrawAccount}</div>
      </div>

      <div className="card form-card">
        <Field label="Nama Program" error={shown.program}>
          <ProgramPicker options={options} value={v.program} onChange={(pid) => { set('program', pid); touchProgram() }} onClose={touchProgram} />
        </Field>
        {selected && (
          <div className="fund-box swap-in" key={selected.id}>
            <div className="fund-label">Total Dana yang Dapat Ditarik</div>
            <div className="fund-value">{rupiah(max)}</div>
          </div>
        )}
        <Field label="Nominal" error={shown.amount} aside={selected && <span className="max-note">Maksimal: <b>{rupiah(max)}</b></span>}>
          <div className="input-wrap">
            <span className="input-prefix">Rp</span>
            <input ref={amountRef} className="input with-prefix" placeholder="Masukkan nominal" inputMode="numeric"
              value={digitsToRupiahText(v.amount)} onChange={(e) => onAmountChange(e.target)}
              onBlur={() => setTouched((t) => ({ ...t, amount: true }))}
              onPaste={(e) => { e.preventDefault(); set('amount', pastedAmountToDigits(e.clipboardData.getData('text'))) }} />
          </div>
        </Field>
        <Field label="Catatan" error={shown.note}>
          {/* Placeholder desain "Masukkan deskripsi program" salah salin dari form Program (D-16) */}
          <textarea className="textarea" placeholder="Masukkan catatan penarikan" value={v.note} onChange={(e) => set('note', e.target.value)} />
          <div className="counter">{v.note.trim().length}/{NOTE_MAX}</div>
        </Field>
      </div>

      <div className="form-actions">
        {/* Desain: Batal ikut nonaktif saat form kosong; di prototipe Batal selalu bisa dipakai untuk kembali (D-16) */}
        <button className="btn btn-outline btn-wide" onClick={() => nav('/dashboard/penarikan')}>Batal</button>
        <button className="btn btn-primary btn-wide" disabled={!valid} onClick={() => setConfirm(true)}>Ajukan Penarikan</button>
      </div>

      <Presence show={confirm}>{confirm && (
        <ConfirmModal title="Konfirmasi Pengajuan" text="Apakah Anda yakin ingin mengajukan penarikan dana ini?"
          onNo={() => setConfirm(false)} onYes={run} />
      )}</Presence>
      <Presence show={blocker.state === 'blocked'}>{blocker.state === 'blocked' && (
        <ConfirmModal
          title="Keluar dari halaman?"
          text="Apakah Anda yakin ingin meninggalkan halaman ini? Data yang sudah diisi akan hilang."
          onNo={() => blocker.reset()}
          onYes={() => blocker.proceed()}
        />
      )}</Presence>
    </>
  )
}

interface Option { id: string; title: string; selesai: boolean; max: number }

/** Dropdown program dengan kolom pencarian (desain frame 860:42499). */
function ProgramPicker({ options, value, onChange, onClose }: { options: Option[]; value: string; onChange: (id: string) => void; onClose: () => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = () => { setOpen(false); onClose() }
    const out = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) close() }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', out)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', out); document.removeEventListener('keydown', esc) }
  }, [open, onClose])

  const key = q.trim().toLowerCase()
  const list = options.filter((o) => o.title.toLowerCase().includes(key))
  const sel = options.find((o) => o.id === value)
  return (
    <div className="combo" ref={ref}>
      <button type="button" className="input combo-btn" aria-haspopup="listbox" aria-expanded={open}
        onClick={() => { setQ(''); setOpen((o) => !o) }}>
        <span className={sel ? '' : 'combo-placeholder'}>{sel ? sel.title : 'Pilih'}</span>
        <Icon name="chevron-down" />
      </button>
      {open && (
        <div className="combo-pop">
          <input className="input" autoFocus placeholder="Cari program" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="combo-list" role="listbox" aria-label="Daftar program">
            {list.map((o) => (
              <button type="button" role="option" aria-selected={o.id === value} className="combo-opt" key={o.id}
                onClick={() => { onChange(o.id); setOpen(false) }}>
                {o.title}{o.selesai && <span className="muted"> · Selesai</span>}
              </button>
            ))}
            {list.length === 0 && (
              <div className="combo-empty">{options.length ? 'Program tidak ditemukan' : 'Belum ada program yang dananya bisa ditarik'}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
