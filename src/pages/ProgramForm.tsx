import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { ConfirmModal, Field, useToast } from '../components/ui'
import { Icon } from '../components/icons'
import { DatePicker } from '../components/DatePicker'
import { Presence } from '../components/motion'
import { useMarkUnsaved } from '../lib/unsaved'
import { canEditProgram, fundraiserActive, statusOf, useDB } from '../lib/store'
import { createProgram, titleTaken, updateProgram } from '../lib/actions'
import { digitsToRupiahText, pastedAmountToDigits, todayISO } from '../lib/format'
import { readImageResized, sniffType } from '../lib/export'
import {
  clean, shownError, validateDescription, validateEndDate, validateImageFile, validateProgramTitle, validateTarget,
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

  // Meeting 30 Okt 2026 (ikut desain): selain Draf, Nama Program terkunci dan form hanya punya Batal/Simpan.
  // live = sudah pernah tayang (status tersimpan "Aktif": Aktif & Selesai) → perubahan langsung berlaku.
  const live = program?.status === 'Aktif'
  const titleLocked = !!program && program.status !== 'Draf'
  const initial = useMemo(() => ({
    title: program?.title ?? '',
    target: program?.target ? String(program.target) : '',
    endDate: program?.endDate ?? '',
    description: program?.description ?? '',
    image: program?.image ?? '',
  }), [program])

  const [v, setV] = useState(initial)
  const [touched, setTouched] = useState<Partial<Record<keyof Errs, boolean>>>({})
  const [imageErr, setImageErr] = useState<string>()
  const [pending, setPending] = useState<Pending>(null)
  const skipBlock = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)
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
  const touch = (k: keyof Errs) => setTouched((t) => (t[k] ? t : { ...t, [k]: true }))

  // Nama program tidak boleh sama dengan program lain (28 Okt 2026); selain Draf, nama program terkunci
  const titleErr = titleLocked ? undefined
    : validateProgramTitle(v.title) ?? (titleTaken(v.title, program?.id) ? 'Nama program sudah digunakan' : undefined)
  const errs: Errs = {
    title: titleErr,
    target: validateTarget(v.target),
    // Program yang pernah tayang boleh menyimpan perubahan lain tanpa mengganti tanggal (contoh program Selesai)
    endDate: live && v.endDate === initial.endDate ? undefined : validateEndDate(v.endDate, todayISO()),
    description: validateDescription(v.description),
    image: imageErr ?? (v.image ? undefined : 'Foto program wajib diupload'),
  }
  // K-36 (desainer 30 Okt 2026): error tampil saat field ditinggalkan, format salah langsung saat mengetik,
  // dan semua field dicek lagi saat tombol diklik. Cek nama ganda baru jalan setelah field ditinggalkan.
  const shown: Errs = {
    title: !touched.title && titleErr === 'Nama program sudah digunakan' ? undefined : shownError(errs.title, v.title, touched.title),
    target: shownError(errs.target, v.target, touched.target),
    endDate: shownError(errs.endDate, v.endDate, touched.endDate),
    description: shownError(errs.description, v.description, touched.description),
    image: imageErr ?? (touched.image ? errs.image : undefined),
  }

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
    if (err) { setImageErr(err); return }
    try {
      set('image', await readImageResized(file))
      setImageErr(undefined)
    } catch {
      setImageErr('File tidak valid atau rusak')
    }
  }

  const ask = (kind: 'submit' | 'draft') => {
    // Draf cukup Nama Program; Ajukan/Simpan mengecek semua field
    const keys: (keyof Errs)[] = kind === 'draft' ? ['title'] : ['title', 'target', 'endDate', 'description', 'image']
    setTouched((t) => ({ ...t, ...Object.fromEntries(keys.map((k) => [k, true])) }))
    if (keys.some((k) => errs[k])) return
    setPending(kind)
  }

  const run = () => {
    const kind = pending!
    const input = { title: clean(v.title), target: Number(v.target || 0), endDate: v.endDate, description: clean(v.description), image: v.image }
    if (mode === 'create') createProgram(fundraiser!.id, input, kind === 'draft')
    else updateProgram(program!.id, input, kind === 'draft' ? 'draft' : 'submit')
    skipBlock.current = true
    setPending(null)
    toast(kind === 'draft' ? 'Program disimpan sebagai draf'
      : mode === 'create' || program?.status === 'Draf' ? 'Program berhasil diajukan'
        : live ? 'Perubahan program berhasil disimpan' : 'Program berhasil diajukan ulang')
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
        <Field label="Nama Program" required error={shown.title}>
          <input className="input" placeholder="Masukkan nama program" value={v.title} disabled={titleLocked} maxLength={120} onChange={(e) => set('title', e.target.value)} onBlur={() => touch('title')} />
        </Field>
        <Field label="Target Terkumpul" required error={shown.target}>
          <div className="input-wrap">
            <span className="input-prefix">Rp</span>
            <input ref={targetRef} className="input with-prefix" placeholder="Masukkan nominal target" inputMode="numeric"
              value={digitsToRupiahText(v.target)} onChange={(e) => onTargetChange(e.target)} onBlur={() => touch('target')}
              onPaste={(e) => { e.preventDefault(); set('target', pastedAmountToDigits(e.clipboardData.getData('text'))) }} />
          </div>
        </Field>
        <Field label="Tanggal Berakhir" required error={shown.endDate}>
          <DatePicker value={v.endDate} onChange={(iso) => set('endDate', iso.startsWith('invalid:') ? iso.slice(8) : iso)} invalid={!!shown.endDate} />
        </Field>
        <Field label="Deskripsi Program" required error={shown.description}>
          <textarea className="textarea" placeholder="Masukkan deskripsi program" value={v.description} onChange={(e) => set('description', e.target.value)} onBlur={() => touch('description')} />
          <div className="counter">{v.description.length}/1000</div>
        </Field>
        <Field label="Foto Program" required error={shown.image}>
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
        {titleLocked ? (
          <button className="btn btn-primary" onClick={() => ask('submit')}>Simpan</button>
        ) : (
          <>
            <button className="btn btn-outline" onClick={() => ask('draft')}>Simpan ke Draf</button>
            <button className="btn btn-primary" onClick={() => ask('submit')}>{mode === 'create' ? 'Ajukan Program' : 'Ajukan Perubahan'}</button>
          </>
        )}
      </div>

      <Presence show={!!pending}>{pending && (
        <ConfirmModal
          title="Konfirmasi"
          text={pending === 'draft' ? 'Simpan program sebagai draf?'
            : mode === 'create' ? 'Apakah Anda yakin untuk membuat dan mengajukan program ini?'
              : titleLocked ? 'Apakah Anda yakin untuk menyimpan perubahan ini?'
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
