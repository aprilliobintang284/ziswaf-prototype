import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { DocField, FundraiserFields, checkDocFile, hasErrors, validateFundraiserForm } from '../components/FundraiserFields'
import type { FundraiserForm } from '../components/FundraiserFields'
import { ConfirmModal, StatusBadge, useToast } from '../components/ui'
import { Presence } from '../components/motion'
import { useDB } from '../lib/store'
import { useMarkUnsaved } from '../lib/unsaved'
import { updateFundraiserData } from '../lib/actions'
import type { DocFile } from '../lib/types'

/** Edit Fundraiser — mengikuti desain Hifi (bisa diakses saat status Terverifikasi atau Ditolak). */
export function FundraiserEditPage() {
  const db = useDB()
  const nav = useNavigate()
  const toast = useToast()
  const user = db.users.find((u) => u.id === db.session?.userId)!
  const f = db.fundraisers.find((x) => x.id === user.fundraiserId)
  const initial = useMemo<FundraiserForm | null>(() => f ? {
    email: f.email, category: f.category, phone: f.phone, licenseNo: f.licenseNo, name: f.name, businessField: f.businessField,
    address: f.address, bankName: f.bankName, commodityAccount: f.commodityAccount, withdrawAccount: f.withdrawAccount, npwp: f.npwp,
  } : null, [f])
  const [values, setValues] = useState<FundraiserForm | null>(initial)
  const [doc, setDoc] = useState<DocFile | null>(f?.doc ?? null)
  const [docError, setDocError] = useState<string>()
  const [confirm, setConfirm] = useState(false)
  useMarkUnsaved(!!f && !!values && (JSON.stringify(values) !== JSON.stringify(initial) || doc !== f.doc))

  if (!f || !values || f.status === 'Menunggu Verifikasi') {
    return <Navigate to="/dashboard/fundraiser" replace />
  }

  // Data sudah terisi, jadi error ditampilkan langsung saat isian berubah
  const errors = validateFundraiserForm(values, doc, docError)
  const changed = JSON.stringify(values) !== JSON.stringify(initial) || doc !== f.doc
  const canSave = changed && !hasErrors(errors)

  // Desain 27 Okt: setiap simpan perubahan (Ditolak maupun Terverifikasi) diajukan ulang → Menunggu Verifikasi
  const save = () => {
    setConfirm(false)
    updateFundraiserData(f.id, values, doc!)
    toast('Data berhasil disimpan dan diajukan ulang untuk verifikasi')
    nav('/dashboard/fundraiser')
  }

  return (
    <>
      <div className="page-head"><h1 className="page-title">Fundraiser</h1></div>
      <div className="card detail-card">
        <div className="hero">
          <div className="hero-row">
            <div className="hero-title">Edit Fundraiser</div>
            {/* Badge status hanya tampil saat Ditolak (desain 27 Okt) */}
            {f.status === 'Ditolak' && <StatusBadge status={f.status} />}
          </div>
        </div>
        <div className="sec-title">Informasi Fundraiser</div>
        <FundraiserFields values={values} errors={errors} emailLocked
          onChange={(k, v) => setValues((s) => s && (k === 'email' ? s : { ...s, [k]: v }))} />
        <div className="sec-title" style={{ marginTop: 22 }}>Dokumen Pendukung</div>
        <DocField doc={doc} error={errors.doc} onDoc={async (file) => {
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
          text="Apakah Anda yakin ingin menyimpan perubahan data dan mengajukan kembali untuk diverifikasi oleh admin?"
          onNo={() => setConfirm(false)} onYes={save} />
      )}</Presence>
    </>
  )
}
