import { Lock, PencilRuler } from 'lucide-react'
import { useDB } from '../lib/store'

export function PlaceholderPage({ title }: { title: string }) {
  const db = useDB()
  const user = db.users.find((u) => u.id === db.session?.userId)!
  const f = db.fundraisers.find((x) => x.id === user.fundraiserId)
  const locked = user.role === 'fundraiser' && f?.status !== 'Terverifikasi'
  return (
    <>
      <div className="page-head"><h1 className="page-title">{title}</h1></div>
      <div className="card placeholder">
        {locked ? <Lock size={40} /> : <PencilRuler size={40} />}
        <h3>{locked ? 'Menu belum bisa diakses' : `Halaman ${title} belum ada di desain Hifi`}</h3>
        <p>{locked
          ? 'Menu ini bisa diakses setelah akun Anda terverifikasi oleh admin.'
          : 'Desain modul ini masih berupa Lofi, jadi belum dibuat di prototipe sprint 1.'}</p>
      </div>
    </>
  )
}
