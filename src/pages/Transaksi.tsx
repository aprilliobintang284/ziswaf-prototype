import { useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { StatusBadge, TableFooter, usePaged, useToast } from '../components/ui'
import { Icon } from '../components/icons'
import { Presence } from '../components/motion'
import { fundraiserActive, useDB } from '../lib/store'
import { rupiah, waktu } from '../lib/format'
import { downloadXlsx } from '../lib/xlsx'
import { PlaceholderPage } from './Placeholder'
import type { Transaction } from '../lib/types'

// Donatur yang mencentang "Sembunyikan Data Donatur" tampil "Anonim" (PRD Validasi Payment).
// Email & nomor telepon donatur anonim belum diatur → sementara "-" (Desain vs PRD D-08).
const donor = (t: Transaction) => (t.anonymous ? 'Anonim' : t.donorName)

/**
 * Transaksi — mengikuti desain Hifi (update 30 Okt 2026). Desain baru ada untuk Admin; Fundraiser memakai
 * tampilan yang sama dengan transaksi program miliknya saja (PRD AC View List, Desain vs PRD D-09).
 */
export function TransaksiPage() {
  const db = useDB()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const user = db.users.find((u) => u.id === db.session?.userId)!
  const isAdmin = user.role === 'admin'
  const fundraiser = db.fundraisers.find((f) => f.id === user.fundraiserId)
  const locked = !isAdmin && !fundraiserActive(fundraiser)

  const programs = useMemo(() => new Map(db.programs.map((p) => [p.id, p])), [db.programs])
  const frName = (programId: string) => {
    const fid = programs.get(programId)?.fundraiserId
    return db.fundraisers.find((f) => f.id === fid)?.name ?? '-'
  }
  // PRD: urutan default waktu terbaru
  const rows = useMemo(() => db.transactions
    .filter((t) => isAdmin || programs.get(t.programId)?.fundraiserId === user.fundraiserId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)),
  [db.transactions, programs, isAdmin, user.fundraiserId])
  const paged = usePaged(rows)
  const detailId = params.get('detail')
  const detail = detailId ? rows.find((t) => t.id === detailId) : undefined

  const notified = useRef<string | null>(null)
  useEffect(() => {
    // Termasuk upaya membuka transaksi program fundraiser lain lewat URL
    if (detailId && !detail) {
      if (notified.current !== detailId) toast('Data transaksi tidak ditemukan', 'err')
      notified.current = detailId
      setParams({}, { replace: true })
    }
  }, [detailId, detail, setParams, toast])

  if (locked) return <PlaceholderPage title="Transaksi" />

  const exportXlsx = () => {
    downloadXlsx('transaksi.xlsx', 'Transaksi',
      ['ID Transaksi', 'Donatur', 'Program', 'Fundraiser', 'Nominal', 'Waktu Transaksi', 'Status'],
      rows.map((t) => [t.id, donor(t), programs.get(t.programId)?.title ?? '-', frName(t.programId), t.amount, waktu(t.createdAt), t.status]))
    toast('File transaksi.xlsx diunduh')
  }

  return (
    <>
      <div className="page-head"><h1 className="page-title">Transaksi</h1></div>
      <div className="card">
        <div className="table-toolbar"><button className="btn btn-outline btn-sm" onClick={exportXlsx}>Export <Icon name="download" /></button></div>
        <div className="table-wrap">
          <table className="tbl nowrap">
            <thead><tr><th>ID Transaksi</th><th>Donatur</th><th>Program</th><th>Fundraiser</th><th>Nominal</th><th>Waktu transaksi</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody className="rows-in" key={`${paged.page}-${paged.size}`}>
              {paged.slice.map((t) => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td>{donor(t)}</td>
                  <td>{programs.get(t.programId)?.title ?? '-'}</td>
                  <td>{frName(t.programId)}</td>
                  <td className="num">{rupiah(t.amount)}</td>
                  <td className="num">{waktu(t.createdAt)}</td>
                  <td><StatusBadge status={t.status} /></td>
                  <td><button className="icon-btn view" aria-label={`Lihat detail ${t.id}`} onClick={() => setParams({ detail: t.id })}><Icon name="action-eye" /></button></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="tbl-empty">Belum ada transaksi</td></tr>}
            </tbody>
          </table>
        </div>
        <TableFooter {...paged} />
      </div>

      <Presence show={!!detail} exitMs={220}>{detail && (
        <div className="drawer" role="dialog" aria-label="Detail Transaksi">
          <div className="drawer-body">
            <div className="drawer-head"><button onClick={() => setParams({})} aria-label="Kembali"><Icon name="back-arrow" size={20} /></button>Detail Transaksi</div>
            <div className="hero">
              <div className="hero-row"><div className="hero-title">{detail.id}</div><StatusBadge status={detail.status} /></div>
            </div>
            <dl className="kv">
              <dt>ID Transaksi</dt><dd>{detail.id}</dd>
              <dt>Donatur</dt><dd>{donor(detail)}</dd>
              <dt>Email</dt><dd>{detail.anonymous || !detail.email ? '-' : detail.email}</dd>
              <dt>Nomor Telepon</dt><dd>{detail.anonymous || !detail.phone ? '-' : detail.phone}</dd>
              <dt>Program</dt><dd>{programs.get(detail.programId)?.title ?? '-'}</dd>
              <dt>Fundraiser</dt><dd>{frName(detail.programId)}</dd>
              <dt>Nominal</dt><dd>{rupiah(detail.amount)}</dd>
              <dt>Waktu Transaksi</dt><dd>{waktu(detail.createdAt)}</dd>
              <dt>Status</dt><dd><StatusBadge status={detail.status} /></dd>
            </dl>
          </div>
        </div>
      )}</Presence>
    </>
  )
}
