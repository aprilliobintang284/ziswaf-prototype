import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/layouts'
import { Icon } from '../components/icons'
import { Logo } from '../components/brand'
import { Field, Modal, PasswordCriteria, PasswordInput } from '../components/ui'
import { DocField, EMPTY_FORM, FundraiserFields, checkDocFile, hasErrors, validateFundraiserForm } from '../components/FundraiserFields'
import type { FormErrors, FundraiserForm } from '../components/FundraiserFields'
import { emailTaken, registerFundraiser } from '../lib/actions'
import { shownError, validateConfirm, validatePassword } from '../lib/validation'
import type { DocFile } from '../lib/types'

type Touched = Partial<Record<keyof FormErrors, boolean>>

export function RegisterPage() {
  const nav = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const [values, setValues] = useState<FundraiserForm>(EMPTY_FORM)
  const [doc, setDoc] = useState<DocFile | null>(null)
  const [docError, setDocError] = useState<string>()
  const [agree, setAgree] = useState(false)
  const [touched, setTouched] = useState<Touched>({})
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwTouched, setPwTouched] = useState({ pw: false, pw2: false })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  // Desain Hifi: tombol aktif hanya jika semua valid. K-36: field kosong error setelah ditinggalkan, format salah saat mengetik
  const errors = validateFundraiserForm(values, doc, docError)
  const dupEmail = !errors.email && emailTaken(values.email)
  if (dupEmail) errors.email = 'Email sudah terdaftar.'
  const shown: FormErrors = {}
  for (const k of Object.keys(errors) as (keyof FormErrors)[]) {
    shown[k] = k === 'doc' ? (touched.doc ? errors.doc : undefined) : shownError(errors[k], values[k], touched[k])
  }
  if (dupEmail && !touched.email) shown.email = undefined // cek email terdaftar baru jalan setelah field Email ditinggalkan
  const canNext = agree && !hasErrors(errors)

  const pwErrors = { pw: validatePassword(pw), pw2: validateConfirm(pw, pw2) }
  const canSubmit = !pwErrors.pw && !pwErrors.pw2 && !loading

  const touch = (k: keyof FormErrors) => setTouched((t) => (t[k] ? t : { ...t, [k]: true }))

  const onDoc = async (file: File | null) => {
    if (!file) return
    setDocError(await checkDocFile(file))
    setDoc({ name: file.name, size: file.size, type: file.type })
    touch('doc')
  }

  const submit = () => {
    if (!canSubmit) return
    setLoading(true)
    setTimeout(() => {
      registerFundraiser(values, doc!, pw)
      setLoading(false)
      setDone(true)
    }, 900)
  }

  return (
    <AuthLayout>
      <div className="auth-top">
        <Logo />
        <div className="ask">Sudah punya akun? <Link to="/masuk" className="btn btn-outline-soft">Masuk</Link></div>
      </div>
      <h1 className="auth-title">Daftar Akun</h1>

      {step === 1 ? (
        <div className="auth-form step-in" key="langkah-1">
          <FundraiserFields
            values={values}
            errors={shown}
            onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
            onBlur={touch}
            emailExtra={dupEmail && touched.email && (
              <span className="hint-text">Silakan <Link to="/masuk" className="link" style={{ fontSize: 12 }}>masuk</Link> atau <Link to="/lupa-password" className="link" style={{ fontSize: 12 }}>atur ulang password</Link>.</span>
            )}
          />
          <DocField doc={doc} error={shown.doc} onDoc={onDoc} />
          <label className="checkbox">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            Saya menyatakan bahwa data dan dokumen yang saya berikan adalah benar dan sesuai dengan yang sebenarnya
          </label>
          <div className="auth-actions end">
            <button type="button" className="btn btn-primary" disabled={!canNext} onClick={() => setStep(2)}>Berikut <Icon name="arrow-left" size={18} tint flip /></button>
          </div>
        </div>
      ) : (
        <div className="auth-form step-in" key="langkah-2">
          <Field label="Password" error={shownError(pwErrors.pw, pw, pwTouched.pw)}>
            <PasswordInput placeholder="Masukkan password" value={pw} onChange={(e) => setPw(e.target.value)}
              onBlur={() => setPwTouched((t) => ({ ...t, pw: true }))} autoComplete="new-password" />
          </Field>
          <Field label="Konfirmasi Password" error={shownError(pwErrors.pw2, pw2, pwTouched.pw2)}>
            <PasswordInput placeholder="Konfirmasi password" value={pw2} onChange={(e) => setPw2(e.target.value)}
              onBlur={() => setPwTouched((t) => ({ ...t, pw2: true }))} autoComplete="new-password" />
          </Field>
          <PasswordCriteria value={pw} />
          <div className="auth-actions">
            <button type="button" className="btn btn-outline" onClick={() => setStep(1)} disabled={loading}><Icon name="arrow-left" size={18} /> Kembali</button>
            <button type="button" className="btn btn-primary" onClick={submit} disabled={!canSubmit}>
              {loading ? <><span className="spin" /> Memproses</> : <>Daftar <Icon name="arrow-left" size={18} tint flip /></>}
            </button>
          </div>
        </div>
      )}

      {done && (
        <Modal icon="ok" title="Pendaftaran Akun Berhasil" actions={
          <div className="modal-actions one"><button className="btn btn-primary" onClick={() => nav('/masuk')}>Masuk</button></div>
        }>
          Data Anda sedang ditinjau oleh tim kami dan hasil verifikasi akan dikirimkan melalui email.
        </Modal>
      )}
    </AuthLayout>
  )
}
