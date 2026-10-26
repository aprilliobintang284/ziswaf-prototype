import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { DocField, FundraiserFields, checkDocFile, hasErrors, validateFundraiserForm } from '../components/FundraiserFields'
import type { FundraiserForm } from '../components/FundraiserFields'
import { StatusBadge, useToast } from '../components/ui'
import { useDB } from '../lib/store'
import { emailTaken, updateFundraiserData } from '../lib/actions'
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

  if (!f || !values || f.status === 'Menunggu Verifikasi') {
    return <Navigate to="/dashboard/fundraiser" replace />
  }

  // Data sudah terisi, jadi error ditampilkan langsung saat isian berubah
  const errors = validateFundraiserForm(values, doc, docError)
  if (!errors.email && emailTaken(values.email, user.id)) errors.email = 'Email sudah terdaftar.'
  const changed = JSON.stringify(values) !== JSON.stringify(initial) || doc !== f.doc
  const canSave = changed && !hasErrors(errors)

  const save = () => {
    if (!canSave) return
    const wasRejected = f.status === 'Ditolak'
    updateFundraiserData(f.id, values, doc!)
    toast(wasRejected ? 'Data berhasil disimpan dan diajukan ulang untuk verifikasi' : 'Data fundraiser berhasil disimpan')
    nav('/dashboard/fundraiser')
  }

  return (
    <>
      <div className="page-head"><h1 className="page-title">Fundraiser</h1></div>
      <div className="card detail-card">
        <div className="hero">
          <div className="hero-row">
            <div className="hero-title">Edit Fundraiser</div>
            <StatusBadge status={f.status} />
          </div>
        </div>
        <div className="sec-title">Informasi Fundraiser</div>
        <FundraiserFields values={values} errors={errors} onChange={(k, v) => setValues((s) => s && { ...s, [k]: v })} />
        <div className="sec-title" style={{ marginTop: 22 }}>Dokumen Pendukung</div>
        <DocField doc={doc} error={errors.doc} onDoc={async (file) => {
          if (!file) return
          setDocError(await checkDocFile(file))
          setDoc({ name: file.name, size: file.size, type: file.type })
        }} />
      </div>
      <div className="btn-pair">
        <button className="btn btn-outline" onClick={() => nav('/dashboard/fundraiser')}>Batal</button>
        <button className="btn btn-primary" disabled={!canSave} onClick={save}>Simpan</button>
      </div>
    </>
  )
}
