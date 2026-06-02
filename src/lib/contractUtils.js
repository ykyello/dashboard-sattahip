// ============================================================
// contractUtils.js
// Utility functions สำหรับคำนวณรอบปีสัญญาของกิจการประปาสัตหีบ
//
// DB schema ใช้:
//   fiscal_year  integer  — ปีพุทธศักราช (เช่น 2568)
//   month        integer  — 1-12 ตามปฏิทินจริง (1=ม.ค., 11=พ.ย.)
// ============================================================

// ── ค่าคงที่วันเริ่มต้นสัญญา ──────────────────────────────
export const LEASE_CONTRACT_START_YEAR  = 2544   // มี.ค. 2544 = ปีที่ 1
export const LEASE_CONTRACT_TOTAL_YEARS = 30     // สัญญามี 30 ปี

export const WATER_CONTRACT_START_YEAR  = 2548   // พ.ย. 2548 = ปีที่ 1
export const WATER_CONTRACT_TOTAL_YEARS = 26     // ปรับได้ตามสัญญาจริง

// ── ชื่อเดือนภาษาไทย ─────────────────────────────────────
export const MONTHS_TH_SHORT = [
  '', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
]
export const MONTHS_TH_FULL = [
  '', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

// ============================================================
// A) FISCAL YEAR RANGE
//    ปีงบประมาณ ต.ค. BY-1 – ก.ย. BY
// ============================================================

/**
 * getFiscalYearRange(baseYear, count)
 * คืน array ของปีงบประมาณ เรียงจากใหม่ → เก่า
 * @param {number} baseYear  — ปีงบประมาณ "ปัจจุบัน" (คำนวณจาก Date จริง)
 * @param {number} count     — จำนวนปีที่แสดงย้อนหลัง (default 6)
 */
export function getFiscalYearRange(baseYear, count = 6) {
  return Array.from({ length: count }, (_, i) => baseYear - i)
}

/**
 * getCurrentFiscalYear()
 * คืนปีงบประมาณปัจจุบัน (ต.ค.–ก.ย.)
 * ถ้า calendar month >= 10 (ต.ค.) → ปีงบ = ปีพุทธ+1 (เริ่มใหม่)
 * ถ้า calendar month < 10 → ปีงบ = ปีพุทธปัจจุบัน
 */
export function getCurrentFiscalYear() {
  const now = new Date()
  const calYear  = now.getFullYear() + 543  // แปลงเป็น พ.ศ.
  const calMonth = now.getMonth() + 1       // 1-12
  return calMonth >= 10 ? calYear + 1 : calYear
}

// ============================================================
// B) LEASE CONTRACT YEAR RANGE
//    สัญญาเช่าบริหาร: รอบ มี.ค. → ก.พ.
//    ปีที่ 1 = มี.ค. 2544 – ก.พ. 2545
// ============================================================

/**
 * getLeaseContractYearNo(startBuddhistYear)
 * แปลง พ.ศ. ที่รอบ มี.ค. เริ่ม → ปีที่ของสัญญา
 */
export function getLeaseContractYearNo(startBuddhistYear) {
  return startBuddhistYear - LEASE_CONTRACT_START_YEAR + 1
}

/**
 * getLeaseContractStartYear(yearNo)
 * ย้อนกลับ: ปีที่ N → พ.ศ. ที่ มี.ค. เริ่ม
 */
export function getLeaseContractStartYear(yearNo) {
  return LEASE_CONTRACT_START_YEAR + yearNo - 1
}

/**
 * getLeaseContractLabel(yearNo)
 * สร้าง label แสดงผล เช่น "สัญญาปีที่ 25 (มี.ค. 2568 – ก.พ. 2569)"
 */
export function getLeaseContractLabel(yearNo) {
  const s = LEASE_CONTRACT_START_YEAR + yearNo - 1
  const e = s + 1
  return `สัญญาปีที่ ${yearNo} (มี.ค. ${s} – ก.พ. ${e})`
}

/**
 * getLeaseContractYearRange()
 * คืน array ของ yearNo ตั้งแต่ปีที่ 1 ถึงปีสุดท้ายของสัญญา (30 ปี)
 * เรียงจากล่าสุด → เก่าสุด
 */
export function getLeaseContractYearRange() {
  return Array.from(
    { length: LEASE_CONTRACT_TOTAL_YEARS },
    (_, i) => LEASE_CONTRACT_TOTAL_YEARS - i   // 30 → 1
  )
}

/**
 * getCurrentLeaseContractYearNo()
 * คืนปีที่สัญญาเช่าบริหารปัจจุบัน
 * ถ้า calendar month >= 3 (มี.ค.) → รอบเริ่มปีนี้ (พ.ศ.)
 * ถ้า calendar month < 3 → รอบยังอยู่ในปีก่อน
 */
export function getCurrentLeaseContractYearNo() {
  const now = new Date()
  const calYear  = now.getFullYear() + 543
  const calMonth = now.getMonth() + 1
  const startBY = calMonth >= 3 ? calYear : calYear - 1
  return getLeaseContractYearNo(startBY)
}

/**
 * getLeaseContractPeriodKeys(yearNo)
 * คืน array of { fiscal_year, month } ทั้ง 12 เดือนในรอบ มี.ค.–ก.พ.
 * เช่น yearNo=25 → มี.ค. 2568 ถึง ก.พ. 2569
 *   = [{fiscal_year:2568, month:3}, ..., {fiscal_year:2568, month:12},
 *      {fiscal_year:2569, month:1}, {fiscal_year:2569, month:2}]
 */
export function getLeaseContractPeriodKeys(yearNo) {
  const startBY = getLeaseContractStartYear(yearNo)
  const keys = []
  // มี.ค.(3) – ธ.ค.(12) ของปีเริ่ม
  for (let m = 3; m <= 12; m++) keys.push({ fiscal_year: startBY,     month: m })
  // ม.ค.(1) – ก.พ.(2)  ของปีถัดไป
  for (let m = 1; m <= 2;  m++) keys.push({ fiscal_year: startBY + 1, month: m })
  return keys
}

/**
 * getLeaseContractMonths(yearNo)
 * คืน array ของเดือนในรอบสัญญา พร้อม { month, fiscal_year, label }
 * สำหรับใช้สร้าง dropdown เดือนในฟอร์ม
 */
export function getLeaseContractMonths(yearNo) {
  return getLeaseContractPeriodKeys(yearNo).map(k => ({
    ...k,
    label: `${MONTHS_TH_FULL[k.month]} ${k.fiscal_year}`
  }))
}

// ============================================================
// C) PATTAYA WATER SALE CONTRACT YEAR RANGE
//    สัญญาซื้อขายน้ำ: รอบ พ.ย. → ต.ค.
//    ปีที่ 1 = พ.ย. 2548 – ต.ค. 2549
// ============================================================

/**
 * getPattayaSaleContractYearNo(startBuddhistYear)
 * แปลง พ.ศ. ที่รอบ พ.ย. เริ่ม → ปีที่ของสัญญา
 */
export function getPattayaSaleContractYearNo(startBuddhistYear) {
  return startBuddhistYear - WATER_CONTRACT_START_YEAR + 1
}

/**
 * getPattayaSaleContractStartYear(yearNo)
 * ย้อนกลับ: ปีที่ N → พ.ศ. ที่ พ.ย. เริ่ม
 */
export function getPattayaSaleContractStartYear(yearNo) {
  return WATER_CONTRACT_START_YEAR + yearNo - 1
}

/**
 * getPattayaSaleContractLabel(yearNo)
 * สร้าง label เช่น "สัญญาปีที่ 21 (พ.ย. 2568 – ต.ค. 2569)"
 */
export function getPattayaSaleContractLabel(yearNo) {
  const s = WATER_CONTRACT_START_YEAR + yearNo - 1
  const e = s + 1
  return `สัญญาปีที่ ${yearNo} (พ.ย. ${s} – ต.ค. ${e})`
}

/**
 * getPattayaSaleContractYearRange()
 * คืน array ของ yearNo ทั้งหมดตามสัญญา เรียงจากล่าสุด
 */
export function getPattayaSaleContractYearRange() {
  return Array.from(
    { length: WATER_CONTRACT_TOTAL_YEARS },
    (_, i) => WATER_CONTRACT_TOTAL_YEARS - i
  )
}

/**
 * getCurrentPattayaSaleContractYearNo()
 * คืนปีที่สัญญาซื้อขายน้ำปัจจุบัน
 * ถ้า calendar month >= 11 (พ.ย.) → รอบเริ่มปีนี้
 * ถ้า < 11 → รอบยังอยู่ในปีก่อน
 */
export function getCurrentPattayaSaleContractYearNo() {
  const now = new Date()
  const calYear  = now.getFullYear() + 543
  const calMonth = now.getMonth() + 1
  const startBY = calMonth >= 11 ? calYear : calYear - 1
  return getPattayaSaleContractYearNo(startBY)
}

/**
 * getPattayaSaleContractPeriodKeys(yearNo)
 * คืน array of { fiscal_year, month } ทั้ง 12 เดือนในรอบ พ.ย.–ต.ค.
 * เช่น yearNo=21 → พ.ย. 2568 ถึง ต.ค. 2569
 *   = [{fiscal_year:2568, month:11}, {fiscal_year:2568, month:12},
 *      {fiscal_year:2569, month:1}, ..., {fiscal_year:2569, month:10}]
 */
export function getPattayaSaleContractPeriodKeys(yearNo) {
  const startBY = getPattayaSaleContractStartYear(yearNo)
  const keys = []
  // พ.ย.(11) – ธ.ค.(12) ของปีเริ่ม
  for (let m = 11; m <= 12; m++) keys.push({ fiscal_year: startBY,     month: m })
  // ม.ค.(1) – ต.ค.(10) ของปีถัดไป
  for (let m = 1;  m <= 10; m++) keys.push({ fiscal_year: startBY + 1, month: m })
  return keys
}

/**
 * getPattayaSaleContractMonths(yearNo)
 * คืน array ของเดือนในรอบสัญญา พร้อม { month, fiscal_year, label }
 * สำหรับใช้สร้าง dropdown เดือนในฟอร์ม
 */
export function getPattayaSaleContractMonths(yearNo) {
  return getPattayaSaleContractPeriodKeys(yearNo).map(k => ({
    ...k,
    label: `${MONTHS_TH_FULL[k.month]} ${k.fiscal_year}`
  }))
}

// ============================================================
// D) HELPERS
// ============================================================

/**
 * filterByPeriodKeys(records, keys)
 * กรอง array records ให้เหลือเฉพาะ rows ที่ { fiscal_year, month } ตรงกับ keys
 */
export function filterByPeriodKeys(records, keys) {
  const keySet = new Set(keys.map(k => `${k.fiscal_year}-${k.month}`))
  return records.filter(r => keySet.has(`${r.fiscal_year}-${r.month}`))
}

/**
 * monthLabel(fiscal_year, month)
 * แปลงเป็น label แสดงผลเช่น "มีนาคม 2568"
 */
export function monthLabel(fiscal_year, month) {
  return `${MONTHS_TH_FULL[month]} ${fiscal_year}`
}
