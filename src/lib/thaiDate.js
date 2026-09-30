// ============================================================
// thaiDate.js
// แปลงวันที่ระหว่าง ISO (เก็บในฐานข้อมูล, ค.ศ.) ↔ ข้อความแสดงผล dd/mm/yyyy (พ.ศ.)
// ค่าที่ส่งเข้า/ออกจากฟอร์มยังเป็น 'YYYY-MM-DD' (ค.ศ.) เหมือนเดิมทุกอย่าง
// เปลี่ยนแค่การแสดงผลและการพิมพ์ — ไม่ต้องแก้ฐานข้อมูลหรือ logic อื่น
// ============================================================

export const MONTHS_TH_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]
export const MONTHS_TH_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

const pad = (n) => String(n).padStart(2, '0')

/** Date → 'YYYY-MM-DD' ตามเวลาเครื่อง (ไม่ใช้ toISOString เพราะเป็น UTC) */
export function toIsoDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 'YYYY-MM-DD' → { y, m, d } (ค.ศ., m = 1-12) หรือ null */
export function parseIso(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '')
  if (!m) return null
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) }
}

/** วันที่มีอยู่จริงไหม (กัน 31/02) */
export function isValidYmd(y, m, d) {
  if (m < 1 || m > 12 || d < 1) return false
  return d <= new Date(y, m, 0).getDate()
}

/** 'YYYY-MM-DD' → 'dd/mm/yyyy' (พ.ศ.) — ใช้ใน input */
export function isoToThaiInput(iso) {
  const p = parseIso(iso)
  if (!p) return ''
  return `${pad(p.d)}/${pad(p.m)}/${p.y + 543}`
}

/**
 * 'dd/mm/yyyy' → 'YYYY-MM-DD' หรือ null ถ้าไม่ถูกต้อง
 * ปีที่พิมพ์ >= 2400 ถือเป็น พ.ศ. / น้อยกว่านั้นถือเป็น ค.ศ. (เผื่อพิมพ์ 2026 มา)
 */
export function thaiInputToIso(text) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((text || '').trim())
  if (!m) return null
  const d = Number(m[1])
  const mo = Number(m[2])
  let y = Number(m[3])
  if (y >= 2400) y -= 543
  if (y < 1900 || y > 2200) return null
  if (!isValidYmd(y, mo, d)) return null
  return `${y}-${pad(mo)}-${pad(d)}`
}

/**
 * formatThaiDate(value, style)
 * ใช้แสดงวันที่ในตาราง/การ์ด — รับ 'YYYY-MM-DD', ISO timestamp หรือ Date
 *   style 'numeric' (default) → 05/01/2569
 *   style 'short'             → 5 ม.ค. 2569
 *   style 'long'              → 5 มกราคม 2569
 */
export function formatThaiDate(value, style = 'numeric') {
  if (!value) return '—'
  let y, m, d
  if (value instanceof Date || String(value).length > 10) {
    const dt = value instanceof Date ? value : new Date(value)
    if (isNaN(dt)) return '—'
    y = dt.getFullYear(); m = dt.getMonth() + 1; d = dt.getDate()
  } else {
    const p = parseIso(value)
    if (!p) return '—'
    ;({ y, m, d } = p)
  }
  const be = y + 543
  if (style === 'short') return `${d} ${MONTHS_TH_SHORT[m - 1]} ${be}`
  if (style === 'long') return `${d} ${MONTHS_TH_FULL[m - 1]} ${be}`
  return `${pad(d)}/${pad(m)}/${be}`
}
