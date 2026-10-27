// Export CSV di sisi browser. Angka panjang dibungkus ="..." supaya Excel tidak mengubahnya jadi format ilmiah.

function cell(v: unknown, keepText = false): string {
  let s = v === undefined || v === null ? '' : String(v)
  // Teks yang diawali = + - @ dibaca Excel sebagai rumus (injeksi rumus) → diberi awalan tanda kutip (K-49)
  if (!keepText && /^[=+\-@\t\r]/.test(s)) s = "'" + s
  const quoted = '"' + s.replace(/"/g, '""') + '"'
  return keepText && s ? '=' + quoted : quoted
}

export function downloadCsv(filename: string, header: string[], rows: unknown[][], textCols: number[] = []) {
  const lines = [header.map((h) => cell(h)).join(','), ...rows.map((r) => r.map((v, i) => cell(v, textCols.includes(i))).join(','))]
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Perkecil gambar sebelum disimpan supaya muat di localStorage. */
export function readImageResized(file: File, maxW = 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('decode'))
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

/** Cek tanda tangan file (magic bytes) supaya file .exe yang diganti namanya tetap ditolak. */
export async function sniffType(file: File): Promise<'pdf' | 'jpg' | 'png' | 'unknown'> {
  const buf = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return 'pdf'
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg'
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png'
  return 'unknown'
}
