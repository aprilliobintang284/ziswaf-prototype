import { getDB, setDB } from './store'
import { uid } from './format'
import type { DocFile, Fundraiser, Program, ProgramEdit, SimEmail, User } from './types'
import { clean } from './validation'

export const IDLE_MS_DEFAULT = 30 * 60 * 1000 // AC Login #5: sesi berakhir setelah 30 menit tidak aktif
export const SESSION_MAX_MS = 7 * 24 * 60 * 60 * 1000 // Validasi Login: 7 hari tidak membuka website
export const RESET_TTL_MS = 60 * 60 * 1000 // tautan reset berlaku 60 menit

export const TOUCH_MS = 15_000

const now = () => new Date().toISOString()

// ---------------- Sesi ----------------
export function currentUser(): User | null {
  const db = getDB()
  if (!db.session) return null
  return db.users.find((u) => u.id === db.session!.userId) ?? null
}

export function currentFundraiser(): Fundraiser | null {
  const u = currentUser()
  if (!u?.fundraiserId) return null
  return getDB().fundraisers.find((f) => f.id === u.fundraiserId) ?? null
}

/** Dipanggil saat aplikasi dibuka: sesi habis jika website tidak dibuka 7 hari (hitungan diulang tiap dibuka, K-01). */
export function checkSessionExpiry(): boolean {
  const s = getDB().session
  if (!s) return false
  if (Date.now() - new Date(s.lastActive).getTime() > SESSION_MAX_MS) {
    setDB((d) => { d.session = null })
    return true
  }
  return false
}

export function touchSession() {
  const s = getDB().session
  if (!s) return
  // Hemat tulis: perbarui paling sering sekali per 15 detik (dibaca juga oleh tab lain, K-42)
  if (Date.now() - new Date(s.lastActive).getTime() < TOUCH_MS) return
  setDB((d) => { if (d.session) d.session.lastActive = now() })
}

export function login(email: string, password: string): { ok: true; user: User } | { ok: false; error: string } {
  // Standar QA: email dibersihkan, password dibandingkan apa adanya (tidak di-trim)
  const user = getDB().users.find((u) => u.email.toLowerCase() === clean(email).toLowerCase())
  if (!user || user.password !== password) return { ok: false, error: 'Email atau password salah' }
  setDB((d) => { d.session = { userId: user.id, lastActive: now() } })
  return { ok: true, user }
}

export function logout() {
  setDB((d) => { d.session = null })
}

// ---------------- Email simulasi ----------------
function pushEmail(d: ReturnType<typeof getDB>, email: Omit<SimEmail, 'id' | 'createdAt'>) {
  d.emails.unshift({ ...email, id: uid('mail'), createdAt: now() })
}

// ---------------- Registrasi ----------------
export interface RegisterData {
  email: string
  category: string
  phone: string
  licenseNo: string
  name: string
  businessField: string
  address: string
  bankName: string
  commodityAccount: string
  withdrawAccount: string
  npwp: string
}

export function emailTaken(email: string, exceptUserId?: string): boolean {
  return getDB().users.some((u) => u.email.toLowerCase() === clean(email).toLowerCase() && u.id !== exceptUserId)
}

/** Standar QA: semua isian teks disimpan tanpa spasi/karakter tak terlihat di awal & akhir. */
function cleanData(data: RegisterData): RegisterData {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, typeof v === 'string' ? clean(v) : v])) as unknown as RegisterData
}

export function registerFundraiser(raw: RegisterData, doc: DocFile, password: string) {
  const data = cleanData(raw)
  const fid = uid('f')
  setDB((d) => {
    d.fundraisers.unshift({
      id: fid, ...data, doc,
      registeredAt: now(), status: 'Menunggu Verifikasi',
    })
    d.users.push({
      id: 'u-' + fid, email: data.email, password, role: 'fundraiser', name: data.name, fundraiserId: fid,
    })
  })
}

/** Edit Fundraiser (desain Hifi baru). Bisa dari status Terverifikasi atau Ditolak. */
export function updateFundraiserData(id: string, raw: RegisterData, doc: DocFile) {
  const data = cleanData(raw)
  setDB((d) => {
    const f = d.fundraisers.find((x) => x.id === id)
    if (!f) return
    Object.assign(f, data, { doc })
    // Desain 27 Okt (pop-up "Konfirmasi Perubahan"): perubahan data selalu diajukan ulang untuk
    // diverifikasi admin, baik dari status Ditolak maupun Terverifikasi.
    f.status = 'Menunggu Verifikasi'
    f.verifiedAt = undefined
    f.rejectedAt = undefined
    f.rejectReason = undefined
    const u = d.users.find((x) => x.fundraiserId === id)
    if (u) { u.name = data.name; u.email = data.email }
  })
}

// ---------------- Lupa password ----------------
/** false jika email tidak terdaftar — desain baru menampilkan error "Email tidak terdaftar" (beda dengan AC PRD). */
export function requestReset(email: string): boolean {
  const user = getDB().users.find((u) => u.email.toLowerCase() === clean(email).toLowerCase())
  if (!user) return false
  const token = uid('rst')
  setDB((d) => {
    // K-17 (asumsi): tautan lama dibatalkan saat meminta tautan baru
    d.resetTokens.forEach((t) => { if (t.email === user.email) t.revoked = true })
    d.resetTokens.push({ token, email: user.email, createdAt: now(), used: false, revoked: false })
    // Isi mengikuti template email "Atur Ulang Password" di Figma (desain 27 Okt)
    pushEmail(d, {
      to: user.email,
      subject: 'Atur Ulang Password',
      body: `Halo ${user.name},\n\nKami menerima permintaan untuk mengatur ulang password akun Ziswaf Anda.\n\nUntuk membuat password baru, silakan klik tombol di bawah ini.`,
      footer: 'Penting: Tautan ini hanya berlaku selama 60 menit sejak email dikirim. Jika tautan sudah kedaluwarsa, silakan ajukan permintaan reset password kembali.\n\nJika Anda tidak merasa melakukan permintaan ini, abaikan email ini. Password akun Anda tidak akan berubah selama Anda tidak menyelesaikan proses reset password.',
      resetToken: token,
    })
  })
  return true
}

export type TokenState = 'valid' | 'expired' | 'used' | 'invalid'

export function tokenState(token: string | null): TokenState {
  if (!token) return 'invalid'
  const t = getDB().resetTokens.find((x) => x.token === token)
  if (!t || t.revoked) return 'invalid'
  if (t.used) return 'used'
  if (Date.now() - new Date(t.createdAt).getTime() > RESET_TTL_MS) return 'expired'
  return 'valid'
}

export function tokenEmail(token: string | null): string | null {
  return getDB().resetTokens.find((x) => x.token === token)?.email ?? null
}

export function expireTokenForDemo(token: string) {
  setDB((d) => {
    const t = d.resetTokens.find((x) => x.token === token)
    if (t) t.createdAt = new Date(Date.now() - RESET_TTL_MS - 60_000).toISOString()
  })
}

export function resetPassword(token: string, password: string) {
  setDB((d) => {
    const t = d.resetTokens.find((x) => x.token === token)
    if (!t) return
    t.used = true
    const u = d.users.find((x) => x.email === t.email)
    if (!u) return
    u.password = password
    pushEmail(d, {
      to: u.email,
      subject: 'Password Berhasil Diubah',
      body: `Halo ${u.name},\n\nPassword akun Ziswaf Anda berhasil diubah.\n\nSilakan masuk ke Platform Ziswaf menggunakan password baru Anda.`,
      loginButton: true,
      footer: 'Jika Anda tidak merasa melakukan perubahan ini, segera hubungi tim Ziswaf untuk mendapatkan bantuan dan mengamankan akun Anda.\n\nTerima kasih telah menggunakan Ziswaf.',
    })
  })
}

// ---------------- Approval fundraiser ----------------
export function approveFundraiser(id: string) {
  setDB((d) => {
    const f = d.fundraisers.find((x) => x.id === id)
    if (!f || f.status !== 'Menunggu Verifikasi') return
    f.status = 'Terverifikasi'
    f.verifiedAt = now()
    pushEmail(d, statusEmail(f.email, f.name))
  })
}

/**
 * Template "Pembaruan Status Verifikasi Fundraiser" (desain 27 Okt) — satu email yang sama untuk
 * disetujui maupun ditolak; hasilnya dilihat fundraiser setelah masuk ke platform.
 */
function statusEmail(to: string, name: string): Omit<SimEmail, 'id' | 'createdAt'> {
  return {
    to,
    subject: 'Pembaruan Status Verifikasi Fundraiser',
    body: `Halo ${name},\n\nTerima kasih telah mendaftar sebagai fundraiser di Ziswaf.\n\nKami informasikan bahwa proses verifikasi data fundraiser Anda telah selesai dilakukan.\n\nSilakan masuk ke Platform Ziswaf untuk melihat status verifikasi dan informasi lebih lanjut terkait akun Anda.`,
    loginButton: true,
    footer: 'Terima kasih atas perhatian dan partisipasi Anda bersama Ziswaf.',
  }
}

export function rejectFundraiser(id: string, reason: string) {
  setDB((d) => {
    const f = d.fundraisers.find((x) => x.id === id)
    if (!f || f.status !== 'Menunggu Verifikasi') return
    f.status = 'Ditolak'
    f.rejectedAt = now()
    f.rejectReason = clean(reason)
    // K-07 terjawab desain: email dikirim juga saat ditolak, isinya generik (alasan dilihat di platform)
    pushEmail(d, statusEmail(f.email, f.name))
  })
}

// ---------------- Program ----------------
export interface ProgramInput {
  title: string
  target: number
  endDate: string
  description: string
  image: string
}

export function createProgram(fundraiserId: string, input: ProgramInput, asDraft: boolean): string {
  const id = uid('p')
  setDB((d) => {
    d.programs.unshift({
      id, fundraiserId, ...input, gross: 0, donors: 0, createdAt: now(),
      status: asDraft ? 'Draf' : 'Menunggu Persetujuan',
    })
  })
  return id
}

/** Draf/Ditolak: semua field berubah. Program Aktif: perubahan disimpan sebagai pendingEdit (K-13). */
export function updateProgram(id: string, input: ProgramInput, mode: 'draft' | 'submit') {
  setDB((d) => {
    const p = d.programs.find((x) => x.id === id)
    if (!p) return
    if (p.status === 'Aktif') {
      const edit: ProgramEdit = { description: input.description, image: input.image }
      p.pendingEdit = edit
      return
    }
    Object.assign(p, input)
    p.rejectReason = undefined
    p.decidedAt = undefined
    p.status = mode === 'draft' ? 'Draf' : 'Menunggu Persetujuan'
  })
}

export function approveProgram(id: string) {
  setDB((d) => {
    const p = d.programs.find((x) => x.id === id)
    if (!p) return
    if (p.pendingEdit) {
      Object.assign(p, p.pendingEdit)
      p.pendingEdit = undefined
      return
    }
    if (p.status !== 'Menunggu Persetujuan') return
    p.status = 'Aktif'
    p.decidedAt = now()
  })
}

export function rejectProgram(id: string, reason: string) {
  setDB((d) => {
    const p = d.programs.find((x) => x.id === id)
    if (!p) return
    if (p.pendingEdit) {
      // K-13 (asumsi): perubahan ditolak, program tetap aktif dengan data lama
      p.pendingEdit = undefined
      p.rejectReason = 'Perubahan ditolak: ' + clean(reason)
      return
    }
    if (p.status !== 'Menunggu Persetujuan') return
    p.status = 'Ditolak'
    p.rejectReason = clean(reason)
    p.decidedAt = now()
  })
}

export function programById(id: string | null): Program | undefined {
  if (!id) return undefined
  return getDB().programs.find((p) => p.id === id)
}
