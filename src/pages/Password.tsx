import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLayout } from '../components/layouts'
import { Logo } from '../components/brand'
import { Field, Modal, PasswordCriteria, PasswordInput } from '../components/ui'
import { requestReset, resetPassword, tokenEmail, tokenState } from '../lib/actions'
import { clean, validateConfirm, validateEmail, validatePassword } from '../lib/validation'

function Header() {
  return (
    <div className="auth-top">
      <Logo />
      <div className="ask">Ingat password? <Link to="/masuk" className="btn btn-outline-soft">Masuk</Link></div>
    </div>
  )
}

export function ForgotPasswordPage() {
  const [params, setParams] = useSearchParams()
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [error, setError] = useState<string>()
  const [sent, setSent] = useState(false)
  const expired = params.get('tautan') === 'kedaluwarsa'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!clean(email)) return
    const err = validateEmail(email) ?? (requestReset(email) ? undefined : 'Email tidak terdaftar')
    setError(err)
    if (!err) setSent(true)
  }

  const resend = () => {
    const target = params.get('email')
    setParams({}, { replace: true })
    if (target) { requestReset(target); setSent(true) }
  }

  return (
    <AuthLayout>
      <Header />
      <h1 className="auth-title">Lupa Password</h1>
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field label="Email" error={error}>
          <input className="input" placeholder="Masukkan email" value={email} onChange={(e) => { setEmail(e.target.value); setError(undefined) }} />
        </Field>
        <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={!clean(email)}>Kirim Tautan</button>
      </form>

      {sent && (
        <Modal icon="mail" title="Periksa Email Anda" actions={
          <div className="modal-actions one"><button className="btn btn-primary" onClick={() => setSent(false)}>Tutup</button></div>
        }>
          Kami sudah mengirimkan tautan untuk mengatur ulang password Anda. Silakan periksa kotak masuk email Anda.
        </Modal>
      )}
      {expired && !sent && (
        <Modal icon="bad" title="Tautan Kedaluwarsa" actions={
          <div className="modal-actions one">
            {params.get('email')
              ? <button className="btn btn-primary" onClick={resend}>Kirim Tautan Baru</button>
              : <button className="btn btn-primary" onClick={() => setParams({}, { replace: true })}>Minta Tautan Baru</button>}
          </div>
        }>
          Tautan untuk mengatur ulang password Anda sudah tidak berlaku karena batas waktu 60 menit telah berakhir atau tautan sudah pernah dipakai.
        </Modal>
      )}
    </AuthLayout>
  )
}

export function ResetPasswordPage() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token')
  const state = useMemo(() => tokenState(token), [token])
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [touched, setTouched] = useState({ pw: false, pw2: false })
  const [done, setDone] = useState(false)
  const errs = { pw: validatePassword(pw), pw2: validateConfirm(pw, pw2) }
  const canSubmit = !errs.pw && !errs.pw2

  useEffect(() => {
    if (state !== 'valid') {
      const email = state === 'invalid' ? null : tokenEmail(token)
      nav(`/lupa-password?tautan=kedaluwarsa${email ? '&email=' + encodeURIComponent(email) : ''}`, { replace: true })
    }
  }, [state, token, nav])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    if (tokenState(token) !== 'valid') { nav('/lupa-password?tautan=kedaluwarsa', { replace: true }); return }
    resetPassword(token!, pw)
    setDone(true)
  }

  return (
    <AuthLayout>
      <Header />
      <h1 className="auth-title">Atur Ulang Password</h1>
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field label="Password Baru" required error={touched.pw ? errs.pw : undefined}>
          <PasswordInput placeholder="Masukkan password" value={pw} onChange={(e) => setPw(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, pw: true }))} autoComplete="new-password" />
        </Field>
        <Field label="Konfirmasi Password Baru" required error={touched.pw2 ? errs.pw2 : undefined}>
          <PasswordInput placeholder="Konfirmasi password" value={pw2} onChange={(e) => setPw2(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, pw2: true }))} autoComplete="new-password" />
        </Field>
        <PasswordCriteria value={pw} />
        <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={!canSubmit}>Atur Ulang Password</button>
      </form>

      {done && (
        <Modal icon="ok" title="Password Berhasil Diubah" actions={
          <div className="modal-actions one"><button className="btn btn-primary" onClick={() => nav('/masuk', { replace: true })}>Masuk</button></div>
        }>
          Password Anda berhasil diubah. Silakan masuk kembali ke akun Anda.
        </Modal>
      )}
    </AuthLayout>
  )
}
