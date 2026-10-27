// Aturan validasi diambil dari PRD Ziswaf (bagian Validasi Platform Dashboard + Acceptance Criteria).
// Teks error mengikuti desain Hifi jika ada di frame error state; selebihnya teks asumsi.

export type Errors<T extends string> = Partial<Record<T, string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const LETTERS_SPACES = /^[A-Za-z ]+$/
const NAME_RE = /^[A-Za-z0-9 ]+$/
const ALNUM = /^[A-Za-z0-9]+$/
const DIGITS = /^[0-9]+$/

const INVISIBLE = /[​-‍⁠﻿]/g

/**
 * K-41 (asumsi): isian hasil copy-paste dibersihkan sebelum divalidasi dan disimpan —
 * karakter tak terlihat (zero-width space dll.) dibuang, non-breaking space jadi spasi biasa,
 * lalu spasi/tab/baris baru di awal & akhir dibuang. Password dan No. HP (aturan PRD) tidak ikut.
 */
export function clean(v: string): string {
  return (v ?? '').replace(INVISIBLE, '').replace(/ /g, ' ').trim()
}

export function required(v: string, label: string): string | undefined {
  if (!clean(v)) return `${label} wajib diisi`
  return undefined
}

function blank(v: string) {
  return !clean(v)
}

export function validateEmail(v: string): string | undefined {
  if (blank(v)) return 'Email tidak boleh kosong'
  const s = clean(v)
  if (s.length > 254) return 'Email maksimal 254 karakter' // K-42 (asumsi)
  return EMAIL_RE.test(s) ? undefined : 'Format email salah'
}

export function validateCategory(raw: string): string | undefined {
  // K-05: spasi diizinkan (asumsi), K-06: teks bebas
  const v = clean(raw)
  if (!v) return 'Kategori tidak boleh kosong'
  if (!LETTERS_SPACES.test(v)) return 'Kategori fundraiser hanya boleh berisi huruf'
  if (v.length < 5) return 'Kategori fundraiser minimal 5 karakter'
  if (v.length > 20) return 'Kategori fundraiser maksimal 20 karakter'
  return undefined
}

export function validateFundraiserName(raw: string): string | undefined {
  const v = clean(raw)
  if (!v) return 'Nama fundraiser tidak boleh kosong'
  if (!NAME_RE.test(v)) return 'Nama fundraiser hanya boleh berisi huruf, spasi, dan angka'
  if (v.length < 5) return 'Nama fundraiser minimal 5 karakter'
  if (v.length > 100) return 'Nama fundraiser maksimal 100 karakter'
  return undefined
}

export function validatePhone(v: string): string | undefined {
  if (!v) return 'Nomor telepon wajib diisi'
  // PRD: angka 10–13 digit, tanpa spasi di awal/akhir. Desain memakai satu pesan untuk semua kasus.
  // K-43 (asumsi): harus diawali 08, jadi 0000000000 / 62812… ditolak.
  if (v !== v.trim() || !DIGITS.test(v) || v.length < 10 || v.length > 13 || !v.startsWith('08')) return 'Nomor telepon tidak valid'
  return undefined
}

export function validateLicense(raw: string): string | undefined {
  const r = required(raw, 'Nomor izin usaha')
  if (r) return r
  const v = clean(raw)
  if (!ALNUM.test(v) || v.length > 25) return 'Nomor izin usaha tidak valid'
  return undefined
}

export function validateLetters(raw: string, label: string): string | undefined {
  const r = required(raw, label)
  if (r) return r
  if (!LETTERS_SPACES.test(clean(raw))) return `${label} hanya boleh berisi huruf`
  return undefined
}

export function validateDigits(raw: string, label: string, invalidMsg: string): string | undefined {
  const r = required(raw, label)
  if (r) return r
  if (!DIGITS.test(clean(raw))) return invalidMsg
  return undefined
}

export function validateNpwp(raw: string): string | undefined {
  const r = required(raw, 'NPWP')
  if (r) return r
  const v = clean(raw)
  if (!DIGITS.test(v) || v.length !== 16) return 'Nomor NPWP tidak valid'
  return undefined
}

export const DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
export const DOC_EXT = /\.(pdf|jpe?g|png)$/i
export const DOC_MAX = 5 * 1024 * 1024

export function validateDoc(file: { name: string; size: number; type: string } | null): string | undefined {
  if (!file) return 'Dokumen izin usaha wajib diupload'
  if (!DOC_EXT.test(file.name) || (file.type && !DOC_TYPES.includes(file.type))) return 'Format dokumen harus PDF, JPG, JPEG, atau PNG'
  if (file.size === 0) return 'File tidak valid atau rusak'
  if (file.size > DOC_MAX) return 'Ukuran file melebihi 5 MB'
  return undefined
}

export interface PasswordCheck {
  length: boolean
  letter: boolean
  digit: boolean
  symbol: boolean
  noSpace: boolean
}

export function checkPassword(v: string): PasswordCheck {
  return {
    length: v.length >= 8 && v.length <= 25,
    letter: /[A-Za-z]/.test(v),
    digit: /[0-9]/.test(v),
    symbol: /[^A-Za-z0-9\s]/.test(v),
    noSpace: !/\s/.test(v),
  }
}

export function validatePassword(v: string): string | undefined {
  if (!v) return 'Password tidak boleh kosong'
  const c = checkPassword(v)
  if (!c.noSpace) return 'Password tidak boleh mengandung spasi'
  if (!c.length) return v.length < 8 ? 'Password minimal 8 karakter' : 'Password maksimal 25 karakter'
  if (!c.letter || !c.digit || !c.symbol) return 'Password harus mengandung huruf, angka, dan simbol'
  return undefined
}

export function validateConfirm(pw: string, confirm: string): string | undefined {
  if (!confirm) return 'Konfirmasi password tidak boleh kosong'
  if (pw !== confirm) return 'Password tidak cocok'
  return undefined
}

export function validateReason(raw: string): string | undefined {
  const v = clean(raw)
  if (!v) return 'Alasan penolakan wajib diisi'
  if (v.length < 3) return 'Alasan penolakan minimal 3 karakter'
  if (v.length > 250) return 'Alasan penolakan maksimal 250 karakter'
  return undefined
}

// ---------------- Program ----------------
export const IMG_EXT = /\.(jpe?g|png)$/i
export const IMG_TYPES = ['image/jpeg', 'image/png']
export const IMG_MAX = 2 * 1024 * 1024

export function validateProgramTitle(raw: string): string | undefined {
  const r = required(raw, 'Nama program')
  if (r) return r
  const v = clean(raw)
  if (v.length < 5) return 'Nama program minimal 5 karakter'
  if (v.length > 100) return 'Nama program maksimal 100 karakter'
  return undefined
}

export function validateTarget(digits: string): string | undefined {
  if (!digits) return 'Target terkumpul wajib diisi'
  if (Number(digits) <= 0) return 'Target terkumpul harus lebih dari 0' // K-30: batas belum ditentukan
  return undefined
}

export function validateEndDate(iso: string, today: string): string | undefined {
  if (!iso) return 'Tanggal berakhir wajib diisi'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number.isNaN(new Date(iso).getTime())) return 'Format tanggal tidak valid'
  if (iso < today) return 'Tanggal berakhir minimal hari ini'
  return undefined
}

export function validateDescription(raw: string): string | undefined {
  const r = required(raw, 'Deskripsi program')
  if (r) return r
  const v = clean(raw)
  if (v.length < 5) return 'Deskripsi program minimal 5 karakter'
  if (v.length > 1000) return 'Deskripsi program maksimal 1000 karakter'
  return undefined
}

export function validateImageFile(file: File): string | undefined {
  if (!IMG_EXT.test(file.name) || !IMG_TYPES.includes(file.type)) return 'Format foto harus JPG, JPEG, atau PNG'
  if (file.size === 0) return 'File tidak valid atau rusak'
  if (file.size > IMG_MAX) return 'Ukuran foto maksimal 2 MB'
  return undefined
}
