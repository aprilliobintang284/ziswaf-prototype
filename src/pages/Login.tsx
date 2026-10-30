import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { AuthLayout } from '../components/layouts'
import { Logo } from '../components/brand'
import { Field, PasswordInput } from '../components/ui'
import { useDB } from '../lib/store'
import { login } from '../lib/actions'
import { shownError, validateEmail } from '../lib/validation'

const DEMO = [
  ['Admin', 'admin@ziswaf.id', 'Admin@2026'],
  ['Fundraiser terverifikasi', 'yayasan@gmail.com', 'Ziswaf@2026'],
  ['Fundraiser tanpa program', 'individu@gmail.com', 'Ziswaf@2026'],
  ['Fundraiser menunggu verifikasi', 'yayasanb@gmail.com', 'Ziswaf@2026'],
  ['Fundraiser ditolak', 'komunitas@gmail.com', 'Ziswaf@2026'],
]

export function LoginPage() {
  const db = useDB()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  // Desain Hifi: setelah gagal, kedua field merah dan tombol Masuk nonaktif sampai input diubah
  const [err, setErr] = useState<{ password: string } | null>(null)
  // K-36: format email salah sudah ditandai saat mengetik; tombol Masuk aktif hanya jika email valid dan password terisi
  const emailErr = validateEmail(email)
  const canSubmit = !emailErr && password !== '' && !err

  if (db.session) return <Navigate to={next && next.startsWith('/dashboard') ? next : '/dashboard/fundraiser'} replace />

  const edit = (setter: (v: string) => void) => (v: string) => { setter(v); setErr(null) }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    const res = login(email, password)
    if (!res.ok) { setErr({ password: res.error }); return }
    nav(next && next.startsWith('/dashboard') ? next : '/dashboard/fundraiser', { replace: true })
  }

  return (
    <AuthLayout>
      <div className="auth-top">
        <Logo />
        <div className="ask">Belum punya akun? <Link to="/daftar" className="btn btn-outline-soft">Daftar</Link></div>
      </div>
      <h1 className="auth-title">Masuk</h1>
      {params.get('alasan') === 'sesi-habis' && (
        <div className="auth-banner warn" style={{ marginBottom: 18 }}>
          <Clock size={16} /> Sesi Anda berakhir karena tidak ada aktivitas. Silakan masuk kembali.
        </div>
      )}
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field label="Email" error={shownError(emailErr, email, emailTouched)} invalid={!!err}>
          <input className="input" placeholder="Masukkan email" value={email} onChange={(e) => edit(setEmail)(e.target.value)}
            onBlur={() => setEmailTouched(true)} autoComplete="username" />
        </Field>
        <Field label="Password" error={err?.password}>
          <PasswordInput placeholder="Masukkan password" value={password} onChange={(e) => edit(setPassword)(e.target.value)} autoComplete="current-password" />
        </Field>
        <div><Link to="/lupa-password" className="link">Lupa Password?</Link></div>
        <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={!canSubmit}>Masuk</button>
      </form>

      <details className="mt-16" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 40 }}>
        <summary style={{ cursor: 'pointer' }}>Akun demo (khusus prototipe)</summary>
        <table style={{ marginTop: 8, borderSpacing: '10px 4px' }}>
          <tbody>
            {DEMO.map(([role, mail, pw]) => (
              <tr key={mail}>
                <td>{role}</td>
                <td><button type="button" className="link" style={{ fontSize: 12 }} onClick={() => { setEmail(mail); setPassword(pw); setErr(null) }}>{mail}</button></td>
                <td>{pw}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </AuthLayout>
  )
}
