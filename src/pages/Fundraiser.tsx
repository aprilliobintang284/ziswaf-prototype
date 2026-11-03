import { useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
// Ilustrasi tampilan kosong belum bisa disalin dari Figma (perlu login Figma); sementara memakai lucide
import { Contact } from 'lucide-react'
import { EmptyState, StatusBadge, TableFooter, usePaged, useToast } from '../components/ui'
import { Icon } from '../components/icons'
import { ApprovalPanel } from '../components/Approval'
import { Presence } from '../components/motion'
import { useDB } from '../lib/store'
import { approveFundraiser, rejectFundraiser } from '../lib/actions'
import { fileSize, tanggal } from '../lib/format'
import { downloadXlsx } from '../lib/xlsx'
import type { Fundraiser } from '../lib/types'

// Nama file berasal dari isian pendaftar, jadi di-escape supaya tidak bisa menyisipkan HTML/skrip ke halaman pratinjau
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function openDocPreview(f: Fundraiser) {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.title = f.doc.name
  w.document.body.innerHTML = `<div style="font-family:Inter,Arial,sans-serif;padding:40px;color:#333">
    <h2 style="margin:0 0 8px">${esc(f.doc.name)}</h2>
    <p style="color:#888;margin:0 0 24px">${fileSize(f.doc.size)} · Pratinjau simulasi (prototipe tidak menyimpan file asli)</p>
    <div style="border:2px dashed #ccc;border-radius:12px;padding:60px;text-align:center;color:#999">Dokumen izin usaha milik <b>${esc(f.name)}</b></div></div>`
}

function FundraiserInfo({ f, programCount }: { f: Fundraiser; programCount: number }) {
  return (
    <>
      <div className="hero">
        <div className="hero-row">
          <div className="hero-title">{f.name}</div>
          <StatusBadge status={f.status} />
        </div>
      </div>
      <div className="sec-title">Informasi Fundraiser</div>
      <dl className="kv">
        <dt>Email</dt><dd>{f.email}</dd>
        <dt>Nomor Telepon</dt><dd>{f.phone}</dd>
        <dt>Nama Fundraiser</dt><dd>{f.name}</dd>
        <dt>Kategori Fundraiser</dt><dd>{f.category}</dd>
        <dt>Bidang Usaha</dt><dd>{f.businessField}</dd>
        <dt>Nomor Izin Usaha</dt><dd>{f.licenseNo}</dd>
        <dt>Alamat</dt><dd>{f.address}</dd>
        <dt>Nama Bank Rekening Penarikan</dt><dd>{f.bankName}</dd>
        <dt>Nomor Rekening Penarikan</dt><dd>{f.withdrawAccount}</dd>
        <dt>Nama Pemilik Rekening Penarikan</dt><dd>{f.accountName}</dd>
        <dt>Nomor Rekening Dana Komoditi</dt><dd>{f.commodityAccount}</dd>
        <dt>Nomor Wajib Pajak (NPWP)</dt><dd>{f.npwp}</dd>
        <dt>Tanggal Daftar</dt><dd>{tanggal(f.registeredAt)}</dd>
        <dt>Status Verifikasi</dt><dd><StatusBadge status={f.status} /></dd>
        {f.status === 'Terverifikasi' && <><dt>Tanggal Verifikasi</dt><dd>{tanggal(f.verifiedAt)}</dd><dt>Jumlah Program</dt><dd>{programCount}</dd></>}
        {/* Desain memakai label "Tanggal Verifikasi" juga untuk status Ditolak */}
        {f.status === 'Ditolak' && <><dt>Tanggal Verifikasi</dt><dd>{tanggal(f.rejectedAt)}</dd><dt>Alasan Ditolak</dt><dd>{f.rejectReason}</dd></>}
      </dl>
      <div className="sec-title">Dokumen Pendukung</div>
      <div className="doc">
        <Icon name="file-description" className="doc-icon" />
        <div className="doc-meta"><div className="doc-name">{f.doc.name}</div><div className="doc-size">{f.doc.type.includes('pdf') ? 'PDF' : 'Gambar'} {fileSize(f.doc.size)}</div></div>
        <button className="btn btn-outline btn-xs" onClick={() => openDocPreview(f)}>Lihat</button>
      </div>
    </>
  )
}

export function FundraiserPage() {
  const db = useDB()
  const user = db.users.find((u) => u.id === db.session?.userId)!
  if (user.role === 'fundraiser') return <OwnFundraiser />
  return <FundraiserList />
}

function OwnFundraiser() {
  const db = useDB()
  const nav = useNavigate()
  const user = db.users.find((u) => u.id === db.session?.userId)!
  const f = db.fundraisers.find((x) => x.id === user.fundraiserId)!
  const count = db.programs.filter((p) => p.fundraiserId === f.id).length
  // Desain: Edit nonaktif selama Menunggu Verifikasi (tombol Batal sudah dihapus di update desain 27 Okt)
  const locked = f.status === 'Menunggu Verifikasi'
  return (
    <>
      <div className="page-head"><h1 className="page-title">Fundraiser</h1></div>
      <div className="card detail-card">
        <FundraiserInfo f={f} programCount={count} />
      </div>
      <div className="form-actions">
        <button className="btn btn-primary btn-wide" disabled={locked} title={locked ? 'Data bisa diedit setelah proses verifikasi selesai' : undefined}
          onClick={() => nav('/dashboard/fundraiser/edit')}>Edit</button>
      </div>
    </>
  )
}

function FundraiserList() {
  const db = useDB()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const rows = db.fundraisers
  const paged = usePaged(rows)
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    db.programs.forEach((p) => m.set(p.fundraiserId, (m.get(p.fundraiserId) ?? 0) + 1))
    return m
  }, [db.programs])
  const detailId = params.get('detail')
  const detail = detailId ? rows.find((f) => f.id === detailId) : undefined

  const notified = useRef<string | null>(null)
  useEffect(() => {
    if (detailId && !detail) {
      if (notified.current !== detailId) toast('Data fundraiser tidak ditemukan', 'err')
      notified.current = detailId
      setParams({}, { replace: true })
    }
  }, [detailId, detail, setParams, toast])

  // Nomor HP, rekening, dan NPWP tetap teks supaya angka 0 di depan dan digit panjang tidak berubah
  const exportXlsx = () => {
    downloadXlsx('fundraiser.xlsx', 'Fundraiser',
      ['No', 'Nama', 'Email', 'Kategori', 'Tanggal Daftar', 'Status Verifikasi', 'Jumlah Program', 'Nomor HP', 'Nama Bank Rekening Penarikan', 'Nomor Rekening Penarikan', 'Nama Pemilik Rekening Penarikan', 'Nomor Rekening Dana Komoditi', 'NPWP'],
      rows.map((f, i) => [i + 1, f.name, f.email, f.category, tanggal(f.registeredAt), f.status,
        f.status === 'Terverifikasi' ? counts.get(f.id) ?? 0 : '-', f.phone, f.bankName, f.withdrawAccount, f.accountName, f.commodityAccount, f.npwp]))
    toast('File fundraiser.xlsx diunduh')
  }

  // Desain 3 Nov 2026 (1004:19892): tampilan kosong tanpa tabel dan tanpa Export
  if (rows.length === 0) {
    return (
      <>
        <div className="page-head"><h1 className="page-title">Fundraiser</h1></div>
        <EmptyState art={<Contact size={40} />} title="Belum Ada Data Fundraiser"
          text="Belum ada data fundraiser yang tersedia. Data yang masuk akan ditampilkan di sini." />
      </>
    )
  }

  return (
    <>
      <div className="page-head"><h1 className="page-title">Fundraiser</h1></div>
      <div className="card">
        <div className="table-toolbar"><button className="btn btn-outline btn-sm" onClick={exportXlsx}>Export <Icon name="download" /></button></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>No</th><th>Nama</th><th>Email</th><th>Kategori</th><th>Tanggal Daftar</th><th>Status Verifikasi</th><th>Jumlah Program</th><th>Aksi</th></tr></thead>
            <tbody className="rows-in" key={`${paged.page}-${paged.size}`}>
              {paged.slice.map((f, i) => (
                <tr key={f.id}>
                  <td>{paged.offset + i + 1}</td>
                  <td>{f.name}</td>
                  <td>{f.email}</td>
                  <td>{f.category}</td>
                  <td className="num">{tanggal(f.registeredAt)}</td>
                  <td><StatusBadge status={f.status} /></td>
                  <td>{f.status === 'Terverifikasi' ? counts.get(f.id) ?? 0 : '-'}</td>
                  <td><button className="icon-btn view" aria-label={`Lihat detail ${f.name}`} onClick={() => setParams({ detail: f.id })}><Icon name="action-eye" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TableFooter {...paged} />
      </div>

      <Presence show={!!detail} exitMs={220}>{detail && (
        <div className="drawer" role="dialog" aria-label="Detail Fundraiser">
          <div className="drawer-body">
            <div className="drawer-head"><button onClick={() => setParams({})} aria-label="Kembali"><Icon name="back-arrow" size={20} /></button>Detail Fundraiser</div>
            <FundraiserInfo f={detail} programCount={counts.get(detail.id) ?? 0} />
            {detail.status === 'Menunggu Verifikasi' && (
              <div className="mt-16">
                <ApprovalPanel
                  key={detail.id}
                  approveLabel="Setujui Fundraiser"
                  statusWord="verifikasi"
                  approveConfirm="Fundraiser akan dinyatakan terverifikasi dan dapat melanjutkan proses sesuai ketentuan platform. Apakah Anda ingin melanjutkan?"
                  rejectConfirm="Pendaftaran fundraiser ini akan ditolak, dan alasan penolakan akan disimpan. Apakah Anda ingin melanjutkan?"
                  onApprove={() => { approveFundraiser(detail.id); toast('Fundraiser berhasil diverifikasi') }}
                  onReject={(r) => { rejectFundraiser(detail.id, r); toast('Pendaftaran fundraiser ditolak') }}
                />
              </div>
            )}
          </div>
        </div>
      )}</Presence>
    </>
  )
}
