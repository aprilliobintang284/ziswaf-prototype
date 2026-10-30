import { useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
// Info tidak ada padanannya di Figma (tooltip khusus prototipe), jadi tetap memakai lucide
import { Info } from 'lucide-react'
import { StatusBadge, TableFooter, usePaged, useToast } from '../components/ui'
import { ApprovalPanel } from '../components/Approval'
import { Presence } from '../components/motion'
import { Icon } from '../components/icons'
import { canEditProgram, feeOf, fundraiserActive, netOf, statusOf, useDB } from '../lib/store'
import { approveProgram, rejectProgram } from '../lib/actions'
import { daysLeft, rupiah, tanggal } from '../lib/format'
import { downloadXlsx } from '../lib/xlsx'
import type { Program, ProgramStatus } from '../lib/types'

const DECIDED: ProgramStatus[] = ['Aktif', 'Selesai', 'Ditolak']

function hasFunds(p: Program) { return p.status === 'Aktif' }
function sisaWaktu(p: Program) {
  const s = statusOf(p)
  if (s === 'Selesai') return '0 Hari' // desain 30 Okt 2026
  if (p.status !== 'Aktif') return '-'
  return `${daysLeft(p.endDate)} Hari`
}
// Angka bulat tanpa koma, dibulatkan ke bawah: 100% hanya tampil kalau target benar-benar tercapai (QA 28 Okt 2026)
function persen(p: Program) { return hasFunds(p) && p.target > 0 ? Math.floor((p.gross / p.target) * 100) + '%' : '-' }

function StatCards({ programs, blank }: { programs: Program[]; blank: boolean }) {
  const live = programs.filter(hasFunds)
  const gross = live.reduce((s, p) => s + p.gross, 0)
  const fee = live.reduce((s, p) => s + feeOf(p), 0)
  const v = (n: number) => (blank ? 'Rp -' : rupiah(n))
  return (
    <div className="stats">
      <div className="stat gross"><div className="stat-head"><Icon name="stat-gross" />Total Terkumpul (Gross)</div><div className="stat-value">{v(gross)}</div></div>
      <div className="stat net"><div className="stat-head"><Icon name="stat-net" />Total Terkumpul (Net)</div><div className="stat-value">{v(gross - fee)}</div></div>
      <div className="stat fee"><div className="stat-head"><Icon name="stat-fee" />Total Fee (3%)</div><div className="stat-value">{v(fee)}</div></div>
    </div>
  )
}

export function ProgramPage() {
  const db = useDB()
  const nav = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const user = db.users.find((u) => u.id === db.session?.userId)!
  const isAdmin = user.role === 'admin'
  const fundraiser = db.fundraisers.find((f) => f.id === user.fundraiserId)
  const verified = isAdmin || fundraiserActive(fundraiser)
  const programs = useMemo(
    () => db.programs.filter((p) => isAdmin || p.fundraiserId === user.fundraiserId),
    [db.programs, isAdmin, user.fundraiserId],
  )
  const frName = (id: string) => db.fundraisers.find((f) => f.id === id)?.name ?? '-'
  const paged = usePaged(programs)
  const detailId = params.get('detail')
  const detail = detailId ? programs.find((p) => p.id === detailId) : undefined

  const notified = useRef<string | null>(null)
  useEffect(() => {
    // Termasuk upaya membuka program milik fundraiser lain lewat URL
    if (detailId && !detail) {
      if (notified.current !== detailId) toast('Data program tidak ditemukan', 'err')
      notified.current = detailId
      setParams({}, { replace: true })
    }
  }, [detailId, detail, setParams, toast])

  const exportXlsx = () => {
    downloadXlsx('program.xlsx', 'Program',
      ['ID Program', 'Judul', 'Fundraiser', 'Target Terkumpul', 'Total Terkumpul (Gross)', 'Total Terkumpul (Net)', 'Total Fee (3%)', 'Persentase Tercapai', 'Jumlah Donatur', 'Sisa Waktu', 'Status'],
      programs.map((p) => [p.id, p.title, frName(p.fundraiserId), p.target, hasFunds(p) ? p.gross : 0, hasFunds(p) ? netOf(p) : 0, hasFunds(p) ? feeOf(p) : 0, persen(p), hasFunds(p) ? p.donors : 0, sisaWaktu(p), statusOf(p)]))
    toast('File program.xlsx diunduh')
  }

  const createBtn = !isAdmin && (
    <button className="btn btn-primary btn-sm" disabled={!verified} onClick={() => nav('/dashboard/program/buat')}>
      Buat Program Baru <Icon name="plus" tint />
    </button>
  )

  return (
    <>
      <div className="page-head"><h1 className="page-title">Program</h1>{createBtn}</div>
      {/* Fundraiser Terverifikasi yang mengedit data kembali Menunggu Verifikasi (desain 27 Okt).
          Asumsi K-39: programnya tetap tampil, tetapi buat/edit program dikunci sampai disetujui lagi. */}
      <StatCards programs={programs} blank={!verified && programs.length === 0} />

      {!verified && programs.length === 0 ? (
        <div className="card empty">
          <Icon name="empty-blocked" />
          <div className="empty-title">Program Belum Bisa Dibuat</div>
          <p className="empty-text">Akun Anda masih dalam proses verifikasi oleh admin. Anda dapat membuat program setelah akun berhasil diverifikasi.</p>
        </div>
      ) : programs.length === 0 ? (
        <div className="card empty">
          <Icon name="empty-none" />
          <div className="empty-title">Belum Ada Program</div>
          <p className="empty-text">Anda belum memiliki program. Mulai buat program pertama Anda untuk menggalang dana.</p>
          {!isAdmin && <button className="btn btn-primary btn-sm" onClick={() => nav('/dashboard/program/buat')}>Buat Program Baru <Icon name="plus" tint /></button>}
        </div>
      ) : (
        <div className="card">
          <div className="table-toolbar"><button className="btn btn-outline btn-sm" onClick={exportXlsx}>Export <Icon name="download" /></button></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>No</th><th>Nama Program</th>{isAdmin && <th className="wrap">Nama<br />Fundraiser</th>}
                  <th className="wrap">Target<br />Terkumpul</th><th className="wrap">Total<br />Terkumpul</th><th className="wrap">Persentase<br />Tercapai</th>
                  <th className="wrap">Jumlah<br />Donatur</th><th>Sisa Waktu</th><th>Status</th><th>Aksi</th>
                </tr>
              </thead>
              <tbody className="rows-in" key={`${paged.page}-${paged.size}`}>
                {paged.slice.map((p, i) => {
                  const s = statusOf(p)
                  const canEdit = !isAdmin && verified && canEditProgram(p)
                  return (
                    <tr key={p.id}>
                      <td>{paged.offset + i + 1}</td>
                      <td>{p.title}</td>
                      {isAdmin && <td>{frName(p.fundraiserId)}</td>}
                      <td className="num">{p.target ? rupiah(p.target) : '-'}</td>
                      <td className="num">{hasFunds(p) ? rupiah(p.gross) : '-'}</td>
                      <td>{persen(p)}</td>
                      <td>{hasFunds(p) ? p.donors : '-'}</td>
                      <td className="num">{sisaWaktu(p)}</td>
                      <td><StatusBadge status={s} /></td>
                      <td className="num">
                        <button className="icon-btn view" aria-label={`Lihat ${p.title}`} onClick={() => setParams({ detail: p.id })}><Icon name="action-eye" /></button>
                        {!isAdmin && (
                          <button className="icon-btn edit" aria-label={`Edit ${p.title}`} disabled={!canEdit} title={canEdit ? undefined : s === 'Selesai' ? 'Program yang sudah Selesai tidak bisa diedit' : 'Program yang menunggu persetujuan tidak bisa diedit'}
                            onClick={() => nav(`/dashboard/program/${p.id}/edit`)}><Icon name={canEdit ? 'action-pencil' : 'action-pencil-disabled'} /></button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <TableFooter {...paged} />
        </div>
      )}

      <Presence show={!!detail} exitMs={220}>
        {detail && <ProgramDrawer p={detail} isAdmin={isAdmin} verified={verified} fundraiserName={frName(detail.fundraiserId)} onClose={() => setParams({})} />}
      </Presence>
    </>
  )
}

function Tip({ text }: { text: string }) {
  return <span title={text} style={{ display: 'inline-flex', verticalAlign: '-2px', marginLeft: 4, color: '#b0b0b0', cursor: 'help' }}><Info size={13} /></span>
}

function ProgramDrawer({ p, isAdmin, verified, fundraiserName, onClose }: { p: Program; isAdmin: boolean; verified: boolean; fundraiserName: string; onClose: () => void }) {
  const toast = useToast()
  const nav = useNavigate()
  const s = statusOf(p)
  const live = hasFunds(p)
  return (
    <div className="drawer" role="dialog" aria-label="Detail Program">
      <div className="drawer-body">
        <div className="drawer-head"><button onClick={onClose} aria-label="Kembali"><Icon name="back-arrow" size={20} /></button>Detail Program</div>
        <div className="hero">
          <div className="hero-row"><div className="hero-title">{p.title}</div><StatusBadge status={s} /></div>
        </div>
        {p.image
          ? <img className="banner-img" src={p.image} alt={`Foto ${p.title}`} />
          : <div className="banner-img" style={{ display: 'grid', placeItems: 'center', color: '#8f8f8f', fontSize: 13 }}>Belum ada foto</div>}

        <div className="sec-title">Deskripsi Program</div>
        <div className="desc-box">{p.description || <span className="muted">Belum ada deskripsi</span>}</div>

        <div className="sec-title">Informasi Program</div>
        <dl className="kv">
          <dt>Judul Program</dt><dd>{p.title}</dd>
          <dt>Fundraiser</dt><dd>{fundraiserName}</dd>
          <dt>Target Terkumpul</dt><dd>{p.target ? rupiah(p.target) : '-'}</dd>
          {live && <>
            <dt>Total Terkumpul (Gross)<Tip text="Total donasi yang diterima untuk program ini" /></dt><dd>{rupiah(p.gross)}</dd>
            <dt>Total Terkumpul (Net)<Tip text="Total donasi setelah dipotong fee 3%" /></dt><dd>{rupiah(netOf(p))}</dd>
            <dt>Total Fee (3%)</dt><dd>{rupiah(feeOf(p))}</dd>
          </>}
          <dt>Persentase Tercapai</dt><dd>{persen(p)}</dd>
          <dt>Jumlah Donatur</dt><dd>{live ? p.donors : '-'}</dd>
          <dt>Tanggal Berakhir</dt><dd>{tanggal(p.endDate)}</dd>
          <dt>Sisa Waktu</dt><dd>{sisaWaktu(p)}</dd>
          <dt>Status Persetujuan</dt><dd><StatusBadge status={s} /></dd>
          {DECIDED.includes(s) && p.decidedAt && <><dt>Tanggal Persetujuan</dt><dd>{tanggal(p.decidedAt)}</dd></>}
          {p.rejectReason && <><dt>Alasan Penolakan</dt><dd>{p.rejectReason}</dd></>}
        </dl>

        {!isAdmin && (
          <button className="btn btn-primary btn-block mt-16" disabled={!verified || !canEditProgram(p)}
            title={!verified ? 'Program bisa diedit setelah akun terverifikasi lagi' : canEditProgram(p) ? undefined
              : s === 'Selesai' ? 'Program yang sudah Selesai tidak bisa diedit' : 'Program yang menunggu persetujuan tidak bisa diedit'}
            onClick={() => nav(`/dashboard/program/${p.id}/edit`)}>Edit</button>
        )}
        {isAdmin && s === 'Menunggu Persetujuan' && (
          <div className="mt-16">
            <ApprovalPanel
              key={p.id}
              approveLabel="Setujui Program"
              statusWord="persetujuan"
              approveConfirm="Program ini akan disetujui dan statusnya diperbarui. Apakah Anda yakin ingin melanjutkan?"
              rejectConfirm="Program ini akan ditolak, dan alasan penolakan akan disimpan sebagai catatan. Apakah Anda yakin ingin melanjutkan?"
              onApprove={() => { approveProgram(p.id); toast('Program disetujui dan tampil ke donatur') }}
              onReject={(r) => { rejectProgram(p.id, r); toast('Program ditolak') }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
