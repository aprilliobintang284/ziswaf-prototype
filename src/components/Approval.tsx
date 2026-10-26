import { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { ConfirmModal, Field } from './ui'
import { validateReason } from '../lib/validation'

interface Props {
  approveLabel: string
  statusWord: 'verifikasi' | 'persetujuan'
  approveConfirm: string
  rejectConfirm: string
  onApprove: () => void
  onReject: (reason: string) => void
}

/** Alur Setujui/Tolak seperti desain: pilih aksi → banner + Batal/Simpan → pop-up konfirmasi. */
export function ApprovalPanel({ approveLabel, statusWord, approveConfirm, rejectConfirm, onApprove, onReject }: Props) {
  const [mode, setMode] = useState<'idle' | 'approve' | 'reject'>('idle')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string>()
  const [confirm, setConfirm] = useState(false)

  const cancel = () => { setMode('idle'); setReason(''); setError(undefined) }
  const save = () => {
    if (mode === 'reject') {
      const err = validateReason(reason)
      setError(err)
      if (err) return
    }
    setConfirm(true)
  }

  if (mode === 'idle') {
    return (
      <div className="btn-pair">
        <button className="btn btn-danger btn-sm" onClick={() => setMode('reject')}><XCircle size={16} /> Tolak</button>
        <button className="btn btn-success btn-sm" onClick={() => setMode('approve')}><CheckCircle2 size={16} /> {approveLabel}</button>
      </div>
    )
  }

  return (
    <>
      {mode === 'reject' ? (
        <>
          <div className="alert red">
            <div className="alert-title"><XCircle size={16} /> Ditolak</div>
            Status {statusWord} akan berubah setelah Anda melakukan konfirmasi
          </div>
          <Field label="Alasan Penolakan" required error={error}>
            <textarea className="textarea" placeholder="Masukkan alasan penolakan..." value={reason} maxLength={300}
              onChange={(e) => setReason(e.target.value)} />
          </Field>
          <div className="counter">{reason.length}/250</div>
        </>
      ) : (
        <div className="alert green">
          <div className="alert-title"><CheckCircle2 size={16} /> Disetujui</div>
          Status {statusWord} akan berubah setelah Anda melakukan konfirmasi
        </div>
      )}
      <div className="btn-pair">
        <button className="btn btn-outline" onClick={cancel}>Batal</button>
        <button className="btn btn-primary" onClick={save}>Simpan</button>
      </div>
      {confirm && (
        <ConfirmModal
          title={mode === 'reject' ? 'Konfirmasi Penolakan' : 'Konfirmasi Persetujuan'}
          text={mode === 'reject' ? rejectConfirm : approveConfirm}
          onNo={() => setConfirm(false)}
          onYes={() => {
            setConfirm(false)
            if (mode === 'reject') onReject(reason)
            else onApprove()
            cancel()
          }}
        />
      )}
    </>
  )
}
