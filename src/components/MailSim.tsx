import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, X } from 'lucide-react'
import { useDB } from '../lib/store'
import { expireTokenForDemo } from '../lib/actions'

/**
 * Kotak masuk simulasi — alat bantu prototipe (tidak ada di desain).
 * Karena prototipe tidak mengirim email sungguhan, email registrasi & reset password muncul di sini.
 */
export function MailSim() {
  const db = useDB()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(0)
  const unread = Math.max(0, db.emails.length - seen)

  return (
    <>
      {open && (
        <div className="mailsim">
          <div className="mailsim-head">
            <div>Kotak Masuk Simulasi<br /><small>Alat bantu prototipe – tidak ada di desain</small></div>
            <button className="input-icon-btn" style={{ position: 'static', color: '#fff' }} onClick={() => setOpen(false)} aria-label="Tutup"><X size={18} /></button>
          </div>
          <div className="mailsim-list">
            {db.emails.length === 0 && <p className="muted" style={{ padding: 12 }}>Belum ada email. Coba daftar akun, lupa password, atau setujui fundraiser.</p>}
            {db.emails.map((m) => (
              <div className="mail" key={m.id}>
                <div className="mail-subject">{m.subject}</div>
                <div className="mail-meta">Kepada: {m.to} · {new Date(m.createdAt).toLocaleString('id-ID')}</div>
                <div className="mail-body">{m.body}</div>
                {m.resetToken && (
                  <div className="mail-actions">
                    <button className="btn btn-primary btn-xs" onClick={() => { setOpen(false); nav(`/atur-ulang-password?token=${m.resetToken}`) }}>Atur Ulang Password</button>
                    <button className="btn btn-outline btn-xs" title="Mundurkan waktu kirim 61 menit untuk menguji tautan kedaluwarsa" onClick={() => expireTokenForDemo(m.resetToken!)}>Simulasikan lewat 60 menit</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <button className="mailsim-btn" onClick={() => { setOpen((o) => !o); setSeen(db.emails.length) }}>
        <Mail size={16} /> Email simulasi {unread > 0 && <span className="mailsim-count">{unread}</span>}
      </button>
    </>
  )
}
