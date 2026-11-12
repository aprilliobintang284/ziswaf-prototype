import { useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { EmptyState, StatusBadge, TableFooter, usePaged, useToast } from '../components/ui'
import { ApprovalPanel } from '../components/Approval'
import { Icon } from '../components/icons'
import { Presence } from '../components/motion'
import { fundraiserActive, useDB } from '../lib/store'
import { approveWithdrawal, rejectWithdrawal } from '../lib/actions'
import { rupiah, tanggal } from '../lib/format'
import { downloadXlsx } from '../lib/xlsx'
import { PlaceholderPage } from './Placeholder'
import type { Withdrawal } from '../lib/types'

/**
 * Penarikan — mengikuti desain Hifi (update 30 Okt 2026, section Penarikan 860:*).
 * Admin melihat semua pengajuan dan menyetujui/menolak; Fundraiser melihat miliknya (tanpa kolom/baris Fundraiser di tabel, detail, dan export; 12 Nov 2026)
 * dan membuat pengajuan. Tombol "Buat Pengajuan" di frame Admin dianggap salah tampil (Desain vs PRD D-12).
 */
export function PenarikanPage() {
  const db = useDB()
  const nav = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const user = db.users.find((u) => u.id === db.session?.userId)!
  const isAdmin = user.role === 'admin'
  const fundraiser = db.fundraisers.find((f) => f.id === user.fundraiserId)
  const locked = !isAdmin && !fundraiserActive(fundraiser)

  const programs = useMemo(() => new Map(db.programs.map((p) => [p.id, p])), [db.programs])
  const frName = (id: string) => db.fundraisers.find((f) => f.id === id)?.name ?? '-'
  const progName = (id: string) => programs.get(id)?.title ?? '-'
  // Urutan default: pengajuan terbaru di atas (sama dengan modul lain)
  const rows = useMemo(() => db.withdrawals
    .filter((w) => isAdmin || w.fundraiserId === user.fundraiserId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)),
  [db.withdrawals, isAdmin, user.fundraiserId])
  const paged = usePaged(rows)
  const detailId = params.get('detail')
  const detail = detailId ? rows.find((w) => w.id === detailId) : undefined

  const notified = useRef<string | null>(null)
  useEffect(() => {
    // Termasuk upaya membuka penarikan fundraiser lain lewat URL
    if (detailId && !detail) {
      if (notified.current !== detailId) toast('Data penarikan tidak ditemukan', 'err')
      notified.current = detailId
      setParams({}, { replace: true })
    }
  }, [detailId, detail, setParams, toast])

  if (locked) return <PlaceholderPage title="Penarikan" />

  // PRD (Detail Program donatur): frekuensi dan total pencairan dihitung hanya dari penarikan yang disetujui
  const done = rows.filter((w) => w.status === 'Diterima')
  const total = done.reduce((s, w) => s + w.amount, 0)

  // Export tidak ada di PRD Withdraw, tetapi ada di desain (Desain vs PRD D-14); format .xlsx seperti modul lain
  const exportXlsx = () => {
    downloadXlsx('penarikan.xlsx', 'Penarikan',
      ['ID Penarikan', ...(isAdmin ? ['Fundraiser'] : []), 'Program', 'Nominal', 'Nama Bank Rekening Penarikan', 'Nomor Rekening Penarikan', 'Nama Pemilik Rekening Penarikan', 'Tanggal Diajukan', 'Status', 'Tanggal Validasi', 'Alasan Penolakan'],
      rows.map((w) => [w.id, ...(isAdmin ? [frName(w.fundraiserId)] : []), progName(w.programId), w.amount, w.bankName, w.account, w.accountName, tanggal(w.createdAt), w.status, w.decidedAt ? tanggal(w.decidedAt) : '-', w.rejectReason ?? '-']))
    toast('File penarikan.xlsx diunduh')
  }

  const createBtn = !isAdmin && (
    <button className="btn btn-primary btn-sm" onClick={() => nav('/dashboard/penarikan/ajukan')}>Buat Pengajuan <Icon name="plus" tint /></button>
  )
  // Desain 3 Nov 2026 (1011:35530): tampilan kosong tanpa kartu, tabel, dan Export; tombol Buat Pengajuan tetap
  // hanya untuk Fundraiser (frame tersebut memakai topbar Admin, D-12)
  if (rows.length === 0) {
    return (
      <>
        <div className="page-head"><h1 className="page-title">Penarikan</h1>{createBtn}</div>
        <EmptyState art={<Icon name="empty-penarikan" />} title="Belum Ada Penarikan Dana"
          text="Belum ada pengajuan penarikan dana. Data pengajuan akan ditampilkan di sini.">{createBtn}</EmptyState>
      </>
    )
  }

  return (
    <>
      <div className="page-head"><h1 className="page-title">Penarikan</h1>{createBtn}</div>
      <div className="stats two">
        <div className="stat net"><div className="stat-head"><Icon name="stat-frequency" />Frekuensi Pencairan</div><div className="stat-value">{done.length.toLocaleString('id-ID')}</div></div>
        <div className="stat fee"><div className="stat-head"><Icon name="stat-total-pencairan" />Total Pencairan</div><div className="stat-value">{rupiah(total)}</div></div>
      </div>
      <div className="card">
        <div className="table-toolbar"><button className="btn btn-outline btn-sm" onClick={exportXlsx}>Export <Icon name="download" /></button></div>
        <div className="table-wrap">
          <table className="tbl nowrap">
            <thead><tr><th>ID Penarikan</th>{isAdmin && <th>Fundraiser</th>}<th>Program</th><th>Nominal</th><th>Tanggal Diajukan</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody className="rows-in" key={`${paged.page}-${paged.size}`}>
              {paged.slice.map((w) => (
                <tr key={w.id}>
                  <td>{w.id}</td>
                  {isAdmin && <td>{frName(w.fundraiserId)}</td>}
                  <td>{progName(w.programId)}</td>
                  <td className="num">{rupiah(w.amount)}</td>
                  <td className="num">{tanggal(w.createdAt)}</td>
                  <td><StatusBadge status={w.status} /></td>
                  <td><button className="icon-btn view" aria-label={`Lihat detail ${w.id}`} onClick={() => setParams({ detail: w.id })}><Icon name="action-eye" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TableFooter {...paged} />
      </div>

      <Presence show={!!detail} exitMs={220}>
        {detail && <PenarikanDrawer w={detail} isAdmin={isAdmin} fundraiserName={frName(detail.fundraiserId)} programName={progName(detail.programId)} onClose={() => setParams({})} />}
      </Presence>
    </>
  )
}

function PenarikanDrawer({ w, isAdmin, fundraiserName, programName, onClose }: { w: Withdrawal; isAdmin: boolean; fundraiserName: string; programName: string; onClose: () => void }) {
  const toast = useToast()
  const nav = useNavigate()
  return (
    <div className="drawer" role="dialog" aria-label="Detail Penarikan">
      <div className="drawer-body">
        <div className="drawer-head"><button onClick={onClose} aria-label="Kembali"><Icon name="back-arrow" size={20} /></button>Detail Penarikan</div>
        <div className="hero">
          <div className="hero-row"><div className="hero-title">{w.id}</div><StatusBadge status={w.status} /></div>
        </div>
        <dl className="kv">
          <dt>ID Penarikan</dt><dd>{w.id}</dd>
          {isAdmin && <><dt>Fundraiser</dt><dd>{fundraiserName}</dd></>}
          <dt>Program</dt><dd>{programName}</dd>
          <dt>Nominal</dt><dd>{rupiah(w.amount)}</dd>
          <dt>Nama Bank Rekening Penarikan</dt><dd>{w.bankName}</dd>
          <dt>Nomor Rekening Penarikan</dt><dd>{w.account}</dd>
          <dt>Nama Pemilik Rekening Penarikan</dt><dd>{w.accountName}</dd>
          <dt>Tanggal Diajukan</dt><dd>{tanggal(w.createdAt)}</dd>
          <dt>Status Penarikan</dt><dd><StatusBadge status={w.status} /></dd>
          {w.decidedAt && <><dt>Tanggal Validasi</dt><dd>{tanggal(w.decidedAt)}</dd></>}
          {w.status === 'Ditolak' && w.rejectReason && <><dt>Alasan Penolakan</dt><dd>{w.rejectReason}</dd></>}
        </dl>

        {isAdmin && w.status === 'Diajukan' && (
          <div className="mt-16">
            <ApprovalPanel
              key={w.id}
              approveLabel="Setujui Penarikan"
              statusWord="penarikan"
              approveConfirm="Apakah Anda yakin ingin menyetujui penarikan dana ini?"
              rejectConfirm="Apakah Anda yakin ingin menolak penarikan dana ini? Status penarikan akan berubah menjadi Ditolak dan alasan penolakan akan disimpan."
              onApprove={() => { approveWithdrawal(w.id); toast('Penarikan disetujui') }}
              onReject={(r) => { rejectWithdrawal(w.id, r); toast('Penarikan ditolak') }}
            />
          </div>
        )}
        {/* Desain menampilkan "Edit" di detail Ditolak. Asumsi D-13: hanya Fundraiser pemilik, untuk mengajukan ulang. */}
        {!isAdmin && w.status === 'Ditolak' && (
          <button className="btn btn-primary btn-block mt-16" onClick={() => nav(`/dashboard/penarikan/${w.id}/edit`)}>Edit</button>
        )}
      </div>
    </div>
  )
}
