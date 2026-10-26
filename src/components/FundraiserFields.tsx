import { useRef } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { Field } from './ui'
import type { DocFile } from '../lib/types'
import {
  validateCategory, validateDigits, validateDoc, validateEmail, validateFundraiserName, validateLetters, validateLicense,
  validateNpwp, validatePhone, required,
} from '../lib/validation'
import { sniffType } from '../lib/export'

export interface FundraiserForm {
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

export type FormErrors = Partial<Record<keyof FundraiserForm | 'doc', string>>

export const EMPTY_FORM: FundraiserForm = {
  email: '', category: '', phone: '', licenseNo: '', name: '', businessField: '', address: '',
  bankName: '', commodityAccount: '', withdrawAccount: '', npwp: '',
}

export function validateFundraiserForm(v: FundraiserForm, doc: DocFile | null, docError: string | undefined): FormErrors {
  return {
    email: validateEmail(v.email),
    category: validateCategory(v.category),
    phone: validatePhone(v.phone),
    licenseNo: validateLicense(v.licenseNo),
    name: validateFundraiserName(v.name),
    businessField: validateLetters(v.businessField, 'Bidang Usaha'),
    address: required(v.address, 'Alamat'),
    bankName: validateLetters(v.bankName, 'Nama Bank'),
    commodityAccount: validateDigits(v.commodityAccount, 'Nomor rekening dana komoditi', 'Nomor rekening tidak valid'),
    withdrawAccount: validateDigits(v.withdrawAccount, 'Nomor rekening penarikan', 'Format rekening tidak valid'),
    npwp: validateNpwp(v.npwp),
    doc: docError ?? validateDoc(doc),
  }
}

export const hasErrors = (e: FormErrors) => Object.values(e).some(Boolean)

/** Cek dokumen termasuk isi file (file .exe yang diganti nama jadi .pdf tetap ditolak). */
export async function checkDocFile(file: File): Promise<string | undefined> {
  const basic = validateDoc(file)
  if (basic) return basic
  const kind = await sniffType(file)
  const ext = file.name.split('.').pop()!.toLowerCase()
  const expected = ext === 'pdf' ? 'pdf' : ext === 'png' ? 'png' : 'jpg'
  if (kind !== expected) return 'File tidak valid atau rusak'
  return undefined
}

interface Props {
  values: FundraiserForm
  errors: FormErrors
  onChange: (key: keyof FundraiserForm, value: string) => void
  onBlur?: (key: keyof FundraiserForm) => void
  emailExtra?: ReactNode
}

/** Urutan field mengikuti desain Hifi terbaru (Daftar Akun & Edit Fundraiser). */
export function FundraiserFields({ values, errors, onChange, onBlur, emailExtra }: Props) {
  const input = (key: keyof FundraiserForm, placeholder: string, extra: Partial<InputHTMLAttributes<HTMLInputElement>> = {}) => (
    <input className="input" placeholder={placeholder} value={values[key]}
      onChange={(e) => onChange(key, e.target.value)} onBlur={() => onBlur?.(key)} {...extra} />
  )
  return (
    <div className="grid-2">
      <Field label="Email" required error={errors.email}>
        {input('email', 'Contoh: kontak@perusahaan.co.id', { autoComplete: 'email' })}
        {emailExtra}
      </Field>
      <Field label="Kategori Fundraiser" required error={errors.category}>{input('category', 'Contoh: Yayasan, Individu, Komunitas')}</Field>
      <Field label="Nama Fundraiser" required error={errors.name}>{input('name', 'Masukkan nama resmi fundraiser')}</Field>
      <Field label="Nomor Telepon" required error={errors.phone}>{input('phone', 'Contoh: 081234567890', { inputMode: 'numeric' })}</Field>
      <Field label="Bidang Usaha" required error={errors.businessField}>{input('businessField', 'Contoh: Lembaga Amil Zakat')}</Field>
      <Field label="Nomor Izin Usaha" required error={errors.licenseNo}>{input('licenseNo', 'Masukkan nomor izin usaha')}</Field>
      <Field label="Alamat" required error={errors.address} className="span-2">{input('address', 'Masukkan alamat resmi fundraiser')}</Field>
      <Field label="Nama Bank" required error={errors.bankName}>{input('bankName', 'Contoh: BNI, BRI, BCA')}</Field>
      <Field label="Nomor Rekening Penarikan" required error={errors.withdrawAccount}>{input('withdrawAccount', 'Masukkan nomor rekening penarikan', { inputMode: 'numeric' })}</Field>
      <Field label="Nomor Rekening Dana Komoditi" required error={errors.commodityAccount}>{input('commodityAccount', 'Masukkan nomor rekening Artha Graha', { inputMode: 'numeric' })}</Field>
      <Field label="Nomor Wajib Pajak (NPWP)" required error={errors.npwp}>{input('npwp', 'Masukkan nomor wajib pajak', { inputMode: 'numeric' })}</Field>
    </div>
  )
}

export function DocField({ doc, error, onDoc }: { doc: DocFile | null; error?: string; onDoc: (file: File | null) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <Field label="Dokumen Izin Usaha" required error={error}>
      <div className="file-input">
        <button type="button" className="file-btn" onClick={() => fileRef.current?.click()}>Pilih Dokumen</button>
        <span className={'file-name' + (doc ? ' chosen' : '')}>
          {doc ? doc.name : 'Format: PDF, JPG, JPEG, atau PNG (Maks. 5 MB)'}
        </span>
        <input ref={fileRef} type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { onDoc(e.target.files?.[0] ?? null); e.target.value = '' }} />
      </div>
    </Field>
  )
}
