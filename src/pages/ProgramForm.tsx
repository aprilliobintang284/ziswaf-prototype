import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { ConfirmModal, Field, useToast } from '../components/ui'
import { Icon } from '../components/icons'
import { DatePicker } from '../components/DatePicker'
import { Presence } from '../components/motion'
import { canEditProgram, fundraiserActive, statusOf, useDB } from '../lib/store'
import { createProgram, titleTaken, updateProgram } from '../lib/actions'
import { digitsToRupiahText, pastedAmountToDigits, todayISO } from '../lib/format'
import { readImageResized, sniffType } from '../lib/export'
import {
  clean, validateDescription, validateEndDate, validateImageFile, validateProgramTitle, validateTarget,
} from '../lib/validation'

type Mode = 'create' | 'edit'
type Errs = Partial<Record<'title' | 'target' | 'endDate' | 'description' | 'image', string>>
type Pending = null | 'submit' | 'draft'

export function ProgramFormPage({ mode }: { mode: Mode }) {
  const db = useDB()
  const nav = useNavigate()
  const toast = useToast()
  const { id } = useParams()
  const user = db.users.find((u) => u.id === db.session?.userId)!
  const fundraiser = db.fundraisers.find((f) => f.id === user.fundraiserId)
  const program = mode === 'edit' ? db.programs.find((p) => p.id === id) : undefined

  const guard = useMemo(() => {
    if (user.role !== 'fundraiser') return 'Admin tidak dapat membuat atau mengedit program'
    if (!fundraiserActive(fundraiser)) return 'Program bisa dibuat setelah akun Anda terverifikasi'
    if (mode === 'edit') {
      if (!program || program.fundraiserId !== fundraiser.id) return 'Data program tidak ditemukan'
      if (!canEditProgram(program)) {
        return statusOf(program) === 'Selesai' ? 'Program yang sudah Selesai tidak bisa diedit' : 'Program yang menunggu persetujuan tidak bisa diedit'
      }
    }
    return null
  }, [user, fundraiser, program, mode])

  // K-13 (PM 28 Okt 2026): program yang sudah pernah tayang (status tersimpan "Aktif": Aktif, Selesai, perubahan ditolak)
  // hanya bisa mengubah Deskripsi, Foto, Target, Tanggal Berakhir; Nama Program terkunci. Draf & Ditolak baru: semua field.
  const live = program?.status === 'Aktif'
  const initial = useMemo(() => ({
    title: program?.title ?? '',
    target: program?.target ? String(program.target) : '',
    endDate: program?.endDate ?? '',
    description: program?.description ?? '',
    image: program?.image ?? '',
  }), [program])

  const [v, setV] = useState(initial)
  const [errs, setErrs] = useState<Errs>({})
  const [pending, setPending] = useState<Pending>(null)
  const skipBlock = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const dirty = JSON.stringify(v) !== JSON.stringify(initial)

  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    !skipBlock.current && dirty && currentLocation.pathname !== nextLocation.pathname)

  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  // Target berformat titik ribuan: kursor dijaga di posisi digit yang sedang diedit (tidak lompat ke akhir)
  const targetRef = useRef<HTMLInputElement>(null)
  const targetCaret = useRef<number | null>(null)
  useLayoutEffect(() => {
    const el = targetRef.current
    if (targetCaret.current === null || !el) return
    let pos = 0
    for (let seen = 0; pos < el.value.length && seen < targetCaret.current; pos++) if (/\d/.test(el.value[pos])) seen++
    el.setSelectionRange(pos, pos)
    targetCaret.current = null
  }, [v.target])

  const guardNotified = useRef(false)
  useEffect(() => {
    if (guard && !guardNotified.current) { guardNotified.current = true; toast(guard, 'err') }
  }, [guard, toast])
  if (guard) return <Navigate to="/dashboard/program" replace />

  const set = (k: keyof typeof v, val: string) => setV((s) => ({ ...s, [k]: val }))

  const onTargetChange = (el: HTMLInputElement) => {
    const all = el.value.replace(/\D/g, '')
    const lead = all.length - all.replace(/^0+(?=\d)/, '').length
    const digits = all.slice(lead, lead + 15)
    const before = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, '').length - lead
    targetCaret.current = Math.max(0, Math.min(before, digits.length))
    set('target', digits)
  }

  const onImage = async (file: File | undefined) => {
    if (!file) return
    let err = validateImageFile(file)
    if (!err) {
      const kind = await sniffType(file)
      if (kind !== 'jpg' && kind !== 'png') err = 'File tidak valid atau rusak'
    }
    if (err) { setErrs((e) => ({ ...e, image: err })); return }
    try {
      set('image', await readImageResized(file))
      setErrs((e) => ({ ...e, image: undefined }))
    } catch {
      setErrs((e) => ({ ...e, image: 'File tidak valid atau rusak' }))
    }
  }

  const ask = (kind: 'submit' | 'draft') => {
    const e: Errs = kind === 'draft'
      ? { title: validateProgramTitle(v.title) }
      : {
          title: live ? undefined : validateProgramTitle(v.title),
          target: validateTarget(v.target),
          // Program yang pernah tayang boleh mengajukan perubahan lain tanpa mengganti tanggal (contoh program Selesai)
          endDate: live && v.endDate === initial.endDate ? undefined : validateEndDate(v.endDate, todayISO()),
          description: validateDescription(v.description),
          image: v.image ? undefined : 'Foto program wajib diupload',
        }
    // Nama program tidak boleh sama dengan program lain (28 Okt 2026); nama program yang sudah tayang terkunci
    if (!live && !e.title && titleTaken(v.title, program?.id)) e.title = 'Nama program sudah digunakan'
    setErrs(e)
    if (Object.values(e).some(Boolean)) return
    setPending(kind)
  }

  const run = () => {
    const kind = pending!
    const input = { title: clean(v.title), target: Number(v.target || 0), endDate: v.endDate, description: clean(v.description), image: v.image }
    if (mode === 'create') createProgram(fundraiser!.id, input, kind === 'draft')
    else updateProgram(program!.id, input, kind === 'draft' ? 'draft' : 'submit')
    skipBlock.current = true
    setPending(null)
    toast(kind === 'draft' ? 'Program disimpan sebagai draf' : mode === 'create' ? 'Program berhasil diajukan' : 'Perubahan program berhasil diajukan')
    nav('/dashboard/program')
  }

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">
          <button className="back" onClick={() => nav('/dashboard/program')} aria-label="Kembali"><Icon name="back-arrow" size={26} tint /></button>
          {mode === 'create' ? 'Buat Program' : 'Edit Program'}
        </h1>
      </div>

      <div className="card form-card">
        <Field label="Nama Program" required error={errs.title}>
          <input className="input" placeholder="Masukkan nama program" value={v.title} disabled={live} maxLength={120} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="Target Terkumpul" required error={errs.target}>
          <div className="input-wrap">
            <span className="input-prefix">Rp</span>
            <input ref={targetRef} className="input with-prefix" placeholder="Masukkan nominal target" inputMode="numeric"
              value={digitsToRupiahText(v.target)} onChange={(e) => onTargetChange(e.target)}
              onPaste={(e) => { e.preventDefault(); set('target', pastedAmountToDigits(e.clipboardData.getData('text'))) }} />
          </div>
        </Field>
        <Field label="Tanggal Berakhir" required error={errs.endDate}>
          <DatePicker value={v.endDate} onChange={(iso) => set('endDate', iso.startsWith('invalid:') ? iso.slice(8) : iso)} invalid={!!errs.endDate} />
        </Field>
        <Field label="Deskripsi Program" required error={errs.description}>
          <textarea className="textarea" placeholder="Masukkan deskripsi program" value={v.description} onChange={(e) => set('description', e.target.value)} />
          <div className="counter">{v.description.length}/1000</div>
        </Field>
        <Field label="Foto Program" required error={errs.image}>
          <div className="upload-box" role="button" tabIndex={0} onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter') fileRef.current?.click() }}>
            {v.image ? (
              <>
                <img src={v.image} alt="Pratinjau foto program" />
                {/* Desain: ikon X di pojok foto untuk menghapus foto (lalu upload ulang) */}
                <button type="button" className="upload-change" aria-label="Hapus foto" onClick={(e) => { e.stopPropagation(); set('image', '') }}><Icon name="photo-remove" /></button>
              </>
            ) : (
              <><Icon name="upload" size={24} />Format: JPG atau PNG (Maks. 2 MB)</>
            )}
          </div>
          <input ref={fileRef} type="file" hidden accept=".jpg,.jpeg,.png" onChange={(e) => { onImage(e.target.files?.[0]); e.target.value = '' }} />
        </Field>
      </div>

      <div className="form-actions">
        <button className="btn btn-outline" onClick={() => nav('/dashboard/program')}>Batal</button>
        <button className="btn btn-outline" disabled={live} title={live ? 'Tidak tersedia untuk program aktif (menunggu keputusan PM, K-13)' : undefined} onClick={() => ask('draft')}>Simpan ke Draf</button>
        <button className="btn btn-primary" onClick={() => ask('submit')}>{mode === 'create' ? 'Ajukan Program' : 'Ajukan Perubahan'}</button>
      </div>

      <Presence show={!!pending}>{pending && (
        <ConfirmModal
          title="Konfirmasi"
          text={pending === 'draft' ? 'Simpan program sebagai draf?'
            : mode === 'create' ? 'Apakah Anda yakin untuk membuat dan mengajukan program ini?'
              : 'Apakah Anda yakin untuk menyimpan perubahan dan mengajukan ulang program ini?'}
          onNo={() => setPending(null)}
          onYes={run}
        />
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
