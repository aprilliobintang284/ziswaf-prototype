import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { DocField, FundraiserFields, checkDocFile, hasErrors, validateFundraiserForm } from '../components/FundraiserFields'
import type { FormErrors, FundraiserForm } from '../components/FundraiserFields'
import { ConfirmModal, useToast } from '../components/ui'
import { Icon } from '../components/icons'
import { Presence } from '../components/motion'
import { useDB } from '../lib/store'
import { useMarkUnsaved } from '../lib/unsaved'
import { updateFundraiserData } from '../lib/actions'
import { clean, shownError } from '../lib/validation'
import type { DocFile } from '../lib/types'

// Desain 3 Nov 2026 (Skenario 3): fundraiser Terverifikasi hanya bisa mengubah Nomor Telepon dan Alamat
const VERIFIED_EDITABLE: (keyof FundraiserForm)[] = ['phone', 'address']

/**
 * Edit Fundraiser — desain Hifi 3 Nov 2026.
 * - Terverifikasi: hanya Nomor Telepon dan Alamat; langsung tersimpan tanpa verifikasi ulang (status tetap Terverifikasi).
 * - Ditolak: semua field kecuali Email (K-43); setelah disimpan diajukan ulang dan kembali Menunggu Verifikasi.
 */
export function FundraiserEditPage() {
  const db = useDB()
  const nav = useNavigate()
  const toast = useToast()
  const user = db.users.find((u) => u.id === db.session?.userId)!
  const f = db.fundraisers.find((x) => x.id === user.fundraiserId)
  const initial = useMemo<FundraiserForm | null>(() => f ? {
    email: f.email, category: f.category, phone: f.phone, licenseNo: f.licenseNo, name: f.name, businessField: f.businessField,
    address: f.address, bankName: f.bankName, withdrawAccount: f.withdrawAccount, accountName: f.accountName,
    commodityAccount: f.commodityAccount, npwp: f.npwp,
  } : null, [f])
  // Data saat form dibuka. `initial` ikut berubah kalau tab lain menyimpan, jadi perubahan dihitung dari sini (FR-080)
  const [base] = useState(initial)
  const [values, setValues] = useState<FundraiserForm | null>(initial)
  const [doc, setDoc] = useState<DocFile | null>(f?.doc ?? null)
  const [docError, setDocError] = useState<string>()
  const [confirm, setConfirm] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<keyof FundraiserForm, boolean>>>({})
  // Dokumen dibandingkan per isi: objek data fundraiser dibuat ulang setiap DB tersimpan (contoh aktivitas sesi)
  const docChanged = JSON.stringify(doc) !== JSON.stringify(f?.doc ?? null)
  useMarkUnsaved(!!f && !!values && (JSON.stringify(values) !== JSON.stringify(base) || docChanged))

  if (!f || !values || f.status === 'Menunggu Verifikasi') {
    return <Navigate to="/dashboard/fundraiser" replace />
  }

  const verified = f.status === 'Terverifikasi'
  const keys = verified ? VERIFIED_EDITABLE : (Object.keys(values) as (keyof FundraiserForm)[])
  // K-36: field yang dikosongkan diberi error setelah ditinggalkan; format salah langsung ditandai saat mengetik.
  // Akun Terverifikasi hanya dicek di field yang bisa diubah, supaya data lama yang terkunci tidak menghalangi simpan.
  const all = validateFundraiserForm(values, doc, docError)
  const errors: FormErrors = verified ? { phone: all.phone, address: all.address } : all
  const shown: FormErrors = verified ? {} : { doc: all.doc }
  for (const k of keys) shown[k] = shownError(errors[k], values[k], touched[k])
  // Hanya menambah spasi di awal/akhir tidak dihitung sebagai perubahan (spasi dibuang saat disimpan)
  const edited = keys.filter((k) => clean(values[k]) !== clean(base![k]))
  const changed = edited.length > 0 || (!verified && docChanged)
  const canSave = changed && !hasErrors(errors)

  const save = () => {
    setConfirm(false)
    // Hanya field yang diubah di tab ini yang dikirim; field lain memakai data terbaru supaya simpanan tab lain tidak tertimpa
    const merged = { ...initial!, ...Object.fromEntries(edited.map((k) => [k, values[k]])) }
    updateFundraiserData(f.id, merged, doc!)
    toast(verified ? 'Perubahan data berhasil disimpan' : 'Data berhasil disimpan dan diajukan ulang untuk verifikasi')
    nav('/dashboard/fundraiser')
  }

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">
          <button className="back" onClick={() => nav('/dashboard/fundraiser')} aria-label="Kembali"><Icon name="back-arrow" size={26} tint /></button>
          Edit Fundraiser
        </h1>
      </div>
      <div className="card detail-card">
        <div className="sec-title">Informasi Fundraiser</div>
        <FundraiserFields values={values} errors={shown} emailLocked editable={verified ? VERIFIED_EDITABLE : undefined}
          onChange={(k, v) => setValues((s) => s && (k === 'email' ? s : { ...s, [k]: v }))}
          onBlur={(k) => setTouched((t) => (t[k] ? t : { ...t, [k]: true }))} />
        <div className="sec-title" style={{ marginTop: 22 }}>Dokumen Pendukung</div>
        <DocField doc={doc} error={shown.doc} disabled={verified} onDoc={async (file) => {
          if (!file) return
          setDocError(await checkDocFile(file))
          setDoc({ name: file.name, size: file.size, type: file.type })
        }} />
      </div>
      <div className="form-actions">
        <button className="btn btn-outline btn-wide" onClick={() => nav('/dashboard/fundraiser')}>Batal</button>
        <button className="btn btn-primary btn-wide" disabled={!canSave} onClick={() => setConfirm(true)}>Simpan</button>
      </div>
      <Presence show={confirm}>{confirm && (
        <ConfirmModal title="Konfirmasi Perubahan"
          text={verified ? 'Apakah Anda yakin ingin menyimpan perubahan data?'
            : 'Apakah Anda yakin ingin menyimpan perubahan data dan mengajukan kembali untuk diverifikasi oleh admin?'}
          onNo={() => setConfirm(false)} onYes={save} />
      )}</Presence>
    </>
  )
}
