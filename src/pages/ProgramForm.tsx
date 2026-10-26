import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ImageUp, Upload } from 'lucide-react'
import { ConfirmModal, Field, useToast } from '../components/ui'
import { DatePicker } from '../components/DatePicker'
import { EDITABLE, statusOf, useDB } from '../lib/store'
import { createProgram, updateProgram } from '../lib/actions'
import { digitsToRupiahText, todayISO } from '../lib/format'
import { readImageResized, sniffType } from '../lib/export'
import {
  validateDescription, validateEndDate, validateImageFile, validateProgramTitle, validateTarget,
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
    if (fundraiser?.status !== 'Terverifikasi') return 'Program bisa dibuat setelah akun Anda terverifikasi'
    if (mode === 'edit') {
      if (!program || program.fundraiserId !== fundraiser.id) return 'Data program tidak ditemukan'
      if (!EDITABLE.includes(statusOf(program))) return 'Program yang menunggu persetujuan tidak bisa diedit'
    }
    return null
  }, [user, fundraiser, program, mode])

  // Aktif & Selesai (status tersimpan "Aktif"): hanya deskripsi & foto yang bisa diubah
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

  const guardNotified = useRef(false)
  useEffect(() => {
    if (guard && !guardNotified.current) { guardNotified.current = true; toast(guard, 'err') }
  }, [guard, toast])
  if (guard) return <Navigate to="/dashboard/program" replace />

  const set = (k: keyof typeof v, val: string) => setV((s) => ({ ...s, [k]: val }))

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
          target: live ? undefined : validateTarget(v.target),
          endDate: live ? undefined : validateEndDate(v.endDate, todayISO()),
          description: validateDescription(v.description),
          image: v.image ? undefined : 'Foto program wajib diupload',
        }
    setErrs(e)
    if (Object.values(e).some(Boolean)) return
    setPending(kind)
  }

  const run = () => {
    const kind = pending!
    const input = { title: v.title.trim(), target: Number(v.target || 0), endDate: v.endDate, description: v.description, image: v.image }
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
          <button className="back" onClick={() => nav('/dashboard/program')} aria-label="Kembali"><ArrowLeft size={26} /></button>
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
            <input className="input with-prefix" placeholder="Masukkan nominal target" inputMode="numeric" disabled={live}
              value={digitsToRupiahText(v.target)} onChange={(e) => set('target', e.target.value.replace(/\D/g, '').slice(0, 15))} />
          </div>
        </Field>
        <Field label="Tanggal Berakhir" required error={errs.endDate}>
          <DatePicker value={v.endDate} disabled={live} onChange={(iso) => set('endDate', iso.startsWith('invalid:') ? iso.slice(8) : iso)} invalid={!!errs.endDate} />
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
                <button type="button" className="upload-change" aria-label="Ganti foto" onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}><ImageUp size={16} /></button>
              </>
            ) : (
              <><Upload size={22} color="#555" />Format: JPG atau PNG (Maks. 2 MB)</>
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

      {pending && (
        <ConfirmModal
          title="Konfirmasi"
          text={pending === 'draft' ? 'Simpan program sebagai draf?'
            : mode === 'create' ? 'Apakah Anda yakin untuk membuat dan mengajukan program ini?'
              : 'Apakah Anda yakin untuk menyimpan perubahan dan mengajukan ulang program ini?'}
          onNo={() => setPending(null)}
          onYes={run}
        />
      )}
      {blocker.state === 'blocked' && (
        <ConfirmModal
          title="Keluar dari halaman?"
          text="Apakah Anda yakin ingin meninggalkan halaman ini? Data yang sudah diisi akan hilang."
          onNo={() => blocker.reset()}
          onYes={() => blocker.proceed()}
        />
      )}
    </>
  )
}
