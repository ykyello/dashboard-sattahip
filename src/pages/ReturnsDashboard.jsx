import { useState, useMemo } from 'react'

// ── ข้อมูลรายปี (จาก Excel Sheet 1) ──────────────────────
const ANNUAL_DATA = [
  { yn: 1,  start: 2544, min: 600000,    actual: 600000,     note: 'อยู่ระหว่างสืบค้นข้อมูลยืนยัน' },
  { yn: 2,  start: 2545, min: 1500000,   actual: 1500000,    note: 'อยู่ระหว่างสืบค้นข้อมูลยืนยัน' },
  { yn: 3,  start: 2546, min: 2000000,   actual: 2000000,    note: 'อยู่ระหว่างสืบค้นข้อมูลยืนยัน' },
  { yn: 4,  start: 2547, min: 2350000,   actual: 2350000,    note: 'อยู่ระหว่างสืบค้นข้อมูลยืนยัน' },
  { yn: 5,  start: 2548, min: 2500000,   actual: 2500000,    note: 'อยู่ระหว่างสืบค้นข้อมูลยืนยัน' },
  { yn: 6,  start: 2549, min: 2550000,   actual: 2550000,    note: 'อยู่ระหว่างสืบค้นข้อมูลยืนยัน' },
  { yn: 7,  start: 2550, min: 2600000,   actual: 2600000,    note: 'อยู่ระหว่างสืบค้นข้อมูลยืนยัน' },
  { yn: 8,  start: 2551, min: 2700000,   actual: 2700000,    note: 'อยู่ระหว่างสืบค้นข้อมูลยืนยัน' },
  { yn: 9,  start: 2552, min: 2800000,   actual: 2800000,    note: 'อยู่ระหว่างสืบค้นข้อมูลยืนยัน' },
  { yn: 10, start: 2553, min: 5000000,   actual: 5000000,    note: 'อยู่ระหว่างสืบค้นข้อมูลยืนยัน' },
  { yn: 11, start: 2554, min: 6600000,   actual: 6600000,    note: 'อยู่ระหว่างสืบค้นข้อมูลยืนยัน' },
  { yn: 12, start: 2555, min: 6600000,   actual: 7212843.11, note: '' },
  { yn: 13, start: 2556, min: 6600000,   actual: 7555974.07, note: '' },
  { yn: 14, start: 2557, min: 6600000,   actual: 8173738.16, note: '' },
  { yn: 15, start: 2558, min: 6600000,   actual: 8386400.68, note: '' },
  { yn: 16, start: 2559, min: 6600000,   actual: 8650209.00, note: '' },
  { yn: 17, start: 2560, min: 6600000,   actual: 9075335.33, note: '' },
  { yn: 18, start: 2561, min: 6600000,   actual: 8137471.98, note: '' },
  { yn: 19, start: 2562, min: 6600000,   actual: 8461452.80, note: '' },
  { yn: 20, start: 2563, min: 6600000,   actual: 7587408.14, note: '' },
  { yn: 21, start: 2564, min: 6600000,   actual: 7823298.87, note: '' },
  { yn: 22, start: 2565, min: 6600000,   actual: 8333627.43, note: '' },
  { yn: 23, start: 2566, min: 6600000,   actual: 9097141.78, note: '' },
  { yn: 24, start: 2567, min: 6600000,   actual: 9220608.42, note: '' },
  { yn: 25, start: 2568, min: 6600000,   actual: 9392065.47, note: '' },
  { yn: 26, start: 2569, min: 6600000,   actual: null,       note: '' },
  { yn: 27, start: 2570, min: 6600000,   actual: null,       note: '' },
  { yn: 28, start: 2571, min: 6600000,   actual: null,       note: '' },
  { yn: 29, start: 2572, min: 6600000,   actual: null,       note: '' },
  { yn: 30, start: 2573, min: 6600000,   actual: null,       note: '' },
]

// ปีสัญญาที่ 1–11 ยังรอยืนยัน
const UNCONFIRMED_YN = new Set([1,2,3,4,5,6,7,8,9,10,11])

// ── ข้อมูลรายเดือน (จาก Excel Sheet 2) ──────────────────
const MONTHLY_RAW = [
  {cyn:11,y:2554,m:9,a:519661.50},{cyn:11,y:2554,m:11,a:537185.36},{cyn:11,y:2554,m:12,a:602439.71},
  {cyn:11,y:2555,m:1,a:593760.49},{cyn:11,y:2555,m:2,a:576526.01},
  {cyn:12,y:2555,m:3,a:542597.42},{cyn:12,y:2555,m:6,a:635333.42},{cyn:12,y:2556,m:1,a:606300.13},
  {cyn:13,y:2556,m:9,a:656239.48},
  {cyn:14,y:2557,m:3,a:597757.06},{cyn:14,y:2557,m:7,a:676062.67},{cyn:14,y:2557,m:8,a:712436.06},
  {cyn:14,y:2557,m:9,a:669588.51},{cyn:14,y:2557,m:10,a:668449.93},{cyn:14,y:2557,m:11,a:637256.60},
  {cyn:14,y:2557,m:12,a:658787.02},{cyn:14,y:2558,m:1,a:683537.71},{cyn:14,y:2558,m:2,a:683642.07},
  {cyn:15,y:2558,m:3,a:654835.67},{cyn:15,y:2558,m:4,a:740469.86},{cyn:15,y:2558,m:5,a:733951.95},
  {cyn:15,y:2558,m:6,a:744958.72},{cyn:15,y:2558,m:7,a:681393.49},{cyn:15,y:2558,m:8,a:730427.08},
  {cyn:15,y:2558,m:9,a:732598.16},{cyn:15,y:2558,m:10,a:693034.34},{cyn:15,y:2558,m:11,a:672062.23},
  {cyn:15,y:2558,m:12,a:635615.57},{cyn:15,y:2559,m:1,a:698841.95},{cyn:15,y:2559,m:2,a:668211.65},
  {cyn:16,y:2559,m:3,a:668112.96},{cyn:16,y:2559,m:4,a:756928.43},{cyn:16,y:2559,m:5,a:785694.25},
  {cyn:16,y:2559,m:6,a:794274.13},{cyn:16,y:2559,m:7,a:670573.01},{cyn:16,y:2559,m:8,a:693355.58},
  {cyn:16,y:2559,m:9,a:717837.51},{cyn:16,y:2559,m:10,a:691302.39},{cyn:16,y:2559,m:11,a:696275.43},
  {cyn:16,y:2559,m:12,a:691138.46},{cyn:16,y:2560,m:1,a:769794.61},{cyn:16,y:2560,m:2,a:714922.23},
  {cyn:17,y:2560,m:3,a:681762.56},{cyn:17,y:2560,m:4,a:797369.17},{cyn:17,y:2560,m:5,a:794649.06},
  {cyn:17,y:2560,m:6,a:767175.05},{cyn:17,y:2560,m:7,a:766593.49},{cyn:17,y:2560,m:8,a:757818.75},
  {cyn:17,y:2560,m:9,a:809877.15},{cyn:17,y:2560,m:10,a:717427.60},{cyn:17,y:2560,m:11,a:752060.60},
  {cyn:17,y:2560,m:12,a:705367.24},{cyn:17,y:2561,m:1,a:774389.78},{cyn:17,y:2561,m:2,a:750844.90},
  {cyn:18,y:2561,m:3,a:689395.83},{cyn:18,y:2561,m:4,a:800181.64},{cyn:18,y:2561,m:5,a:674438.08},
  {cyn:18,y:2561,m:6,a:691735.62},{cyn:18,y:2561,m:7,a:648636.03},{cyn:18,y:2561,m:8,a:673899.43},
  {cyn:18,y:2561,m:9,a:660027.56},{cyn:18,y:2561,m:10,a:622697.73},{cyn:18,y:2561,m:11,a:661099.58},
  {cyn:18,y:2561,m:12,a:639115.01},{cyn:18,y:2562,m:1,a:690219.44},{cyn:18,y:2562,m:2,a:686026.03},
  {cyn:19,y:2562,m:3,a:649603.21},{cyn:19,y:2562,m:4,a:744761.32},{cyn:19,y:2562,m:5,a:779444.72},
  {cyn:19,y:2562,m:6,a:744148.02},{cyn:19,y:2562,m:7,a:667374.90},{cyn:19,y:2562,m:8,a:746256.50},
  {cyn:19,y:2562,m:9,a:724777.78},{cyn:19,y:2562,m:10,a:654589.91},{cyn:19,y:2562,m:11,a:665624.93},
  {cyn:19,y:2562,m:12,a:670300.04},{cyn:19,y:2563,m:1,a:705210.47},{cyn:19,y:2563,m:2,a:709361.02},
  {cyn:20,y:2563,m:3,a:634184.19},{cyn:20,y:2563,m:3,a:701417.38},{cyn:20,y:2563,m:5,a:516113.73},
  {cyn:20,y:2563,m:6,a:520475.00},{cyn:20,y:2563,m:7,a:544173.25},{cyn:20,y:2563,m:8,a:689777.84},
  {cyn:20,y:2563,m:9,a:702209.47},{cyn:20,y:2563,m:10,a:646469.57},{cyn:20,y:2563,m:11,a:635802.21},
  {cyn:20,y:2563,m:12,a:677399.64},{cyn:20,y:2564,m:1,a:691446.21},{cyn:20,y:2564,m:2,a:627939.66},
  {cyn:21,y:2564,m:3,a:570083.44},{cyn:21,y:2564,m:4,a:713994.19},{cyn:21,y:2564,m:5,a:655108.04},
  {cyn:21,y:2564,m:6,a:640310.57},{cyn:21,y:2564,m:7,a:628869.93},{cyn:21,y:2564,m:8,a:614719.51},
  {cyn:21,y:2564,m:9,a:630873.95},{cyn:21,y:2564,m:10,a:630018.25},{cyn:21,y:2564,m:11,a:669975.43},
  {cyn:21,y:2564,m:12,a:671505.37},{cyn:21,y:2565,m:1,a:702212.20},{cyn:21,y:2565,m:2,a:695627.98},
  {cyn:22,y:2565,m:3,a:606357.50},{cyn:22,y:2565,m:4,a:716609.99},{cyn:22,y:2565,m:5,a:749647.66},
  {cyn:22,y:2565,m:6,a:730734.72},{cyn:22,y:2565,m:7,a:695617.33},{cyn:22,y:2565,m:8,a:727416.77},
  {cyn:22,y:2565,m:9,a:673219.33},{cyn:22,y:2565,m:10,a:645116.78},{cyn:22,y:2565,m:11,a:671658.71},
  {cyn:22,y:2565,m:12,a:657545.82},{cyn:22,y:2566,m:1,a:713876.02},{cyn:22,y:2566,m:2,a:745826.80},
  {cyn:23,y:2566,m:3,a:674545.15},{cyn:23,y:2566,m:4,a:800876.14},{cyn:23,y:2566,m:5,a:827767.01},
  {cyn:23,y:2566,m:6,a:816295.38},{cyn:23,y:2566,m:7,a:746519.43},{cyn:23,y:2566,m:8,a:755568.88},
  {cyn:23,y:2566,m:9,a:794069.31},{cyn:23,y:2566,m:10,a:721525.64},{cyn:23,y:2566,m:11,a:716782.67},
  {cyn:23,y:2566,m:12,a:679679.74},{cyn:23,y:2567,m:1,a:765376.53},{cyn:23,y:2567,m:2,a:798135.90},
  {cyn:24,y:2567,m:3,a:738473.86},{cyn:24,y:2567,m:4,a:804911.55},{cyn:24,y:2567,m:5,a:851942.72},
  {cyn:24,y:2567,m:6,a:773949.46},{cyn:24,y:2567,m:7,a:730318.21},{cyn:24,y:2567,m:8,a:728452.01},
  {cyn:24,y:2567,m:9,a:774879.84},{cyn:24,y:2567,m:10,a:673783.98},{cyn:24,y:2567,m:11,a:741482.90},
  {cyn:24,y:2567,m:12,a:748682.05},{cyn:24,y:2568,m:1,a:823915.82},{cyn:24,y:2568,m:2,a:829816.03},
  {cyn:25,y:2568,m:3,a:721763.45},{cyn:25,y:2568,m:4,a:835868.33},{cyn:25,y:2568,m:5,a:820699.83},
  {cyn:25,y:2568,m:6,a:799972.87},{cyn:25,y:2568,m:7,a:736725.88},{cyn:25,y:2568,m:8,a:812110.80},
  {cyn:25,y:2568,m:9,a:800251.77},{cyn:25,y:2568,m:10,a:717317.39},{cyn:25,y:2568,m:11,a:753159.38},
  {cyn:25,y:2568,m:12,a:745035.77},{cyn:25,y:2569,m:1,a:894662.00},{cyn:25,y:2569,m:2,a:754498.00},
  {cyn:26,y:2569,m:3,a:744077.88},{cyn:26,y:2569,m:4,a:851735.00},
]

const MONTHS_TH = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

function fmt(v, dec = 0) {
  if (v === null || v === undefined) return '—'
  return Number(v).toLocaleString('th-TH', { maximumFractionDigits: dec, minimumFractionDigits: dec })
}
function fmtM(v) {
  if (!v) return '—'
  return (v / 1000000).toFixed(3) + ' ล.'
}

// ── Mini bar chart component ──────────────────────────────
function BarChart({ data, maxVal }) {
  return (
    <div className="flex items-end gap-0.5 h-16">
      {data.map((d, i) => {
        const minH = maxVal > 0 ? (d.min / maxVal) * 100 : 0
        const actH = d.actual !== null && maxVal > 0 ? (d.actual / maxVal) * 100 : 0
        const isUnconfirmed = UNCONFIRMED_YN.has(d.yn)
        return (
          <div key={i} className="flex-1 flex items-end gap-px" title={`ปีที่ ${d.yn}`}>
            <div
              className="w-full rounded-sm transition-all"
              style={{
                height: `${minH}%`,
                minHeight: minH > 0 ? 2 : 0,
                backgroundColor: '#3b82f6',
                opacity: 0.5,
              }}
            />
            {d.actual !== null && (
              <div
                className="w-full rounded-sm transition-all"
                style={{
                  height: `${actH}%`,
                  minHeight: 2,
                  backgroundColor: isUnconfirmed ? '#94a3b8' : '#10b981',
                  opacity: isUnconfirmed ? 0.5 : 0.85,
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Monthly detail chart ──────────────────────────────────
function MonthlyChart({ rows }) {
  if (!rows.length) return null
  const maxVal = Math.max(...rows.map(r => r.a))
  return (
    <div className="flex items-end gap-1 h-20 mt-2">
      {rows.map((r, i) => {
        const h = maxVal > 0 ? (r.a / maxVal) * 100 : 0
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-emerald-500 opacity-80 transition-all"
              style={{ height: `${h}%`, minHeight: 2 }}
              title={`${MONTHS_TH[r.m]} ${r.y}: ${fmt(r.a, 2)} บาท`}
            />
            <span className="text-[9px] text-slate-400 whitespace-nowrap">{MONTHS_TH[r.m]}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────
export default function ReturnsDashboard() {
  const [tab, setTab] = useState('overview')        // overview | monthly | manage
  const [monthlyYear, setMonthlyYear] = useState(2568)
  const [editModal, setEditModal] = useState(null)   // { yn, field } | null
  const [annualData, setAnnualData] = useState(ANNUAL_DATA)
  const [editForm, setEditForm] = useState({})
  const [importLog, setImportLog] = useState(null)

  // ── computed KPIs ──────────────────────────────────────
  const kpi = useMemo(() => {
    const totalMin = annualData.reduce((s, r) => s + r.min, 0)
    const confirmedRows = annualData.filter(r => r.actual !== null && !UNCONFIRMED_YN.has(r.yn))
    const totalActual = confirmedRows.reduce((s, r) => s + r.actual, 0)
    const diff = totalActual - annualData.filter(r => r.actual !== null && !UNCONFIRMED_YN.has(r.yn)).reduce((s,r) => s + r.min, 0)
    const yearsWithData = confirmedRows.length
    const yearsNoData = annualData.filter(r => r.actual === null).length
    const pct = totalMin > 0 ? (totalActual / totalMin) * 100 : 0
    return { totalMin, totalActual, diff, yearsWithData, yearsNoData, pct }
  }, [annualData])

  const maxBar = useMemo(() => Math.max(...annualData.map(r => Math.max(r.min, r.actual ?? 0))), [annualData])

  // ── monthly rows for selected year ─────────────────────
  const monthlyRows = useMemo(() => {
    return MONTHLY_RAW.filter(r => r.y === monthlyYear).sort((a,b) => a.m - b.m)
  }, [monthlyYear])

  const monthlyYears = useMemo(() => {
    return [...new Set(MONTHLY_RAW.map(r => r.y))].sort((a,b) => b - a)
  }, [])

  // ── edit handlers ──────────────────────────────────────
  function openEdit(row) {
    setEditForm({
      yn: row.yn,
      actual: row.actual ?? '',
      note: row.note ?? '',
    })
    setEditModal(row.yn)
  }

  function saveEdit() {
    setAnnualData(prev => prev.map(r =>
      r.yn === editModal
        ? { ...r, actual: editForm.actual !== '' ? Number(editForm.actual) : null, note: editForm.note }
        : r
    ))
    setEditModal(null)
  }

  function deleteActual(yn) {
    setAnnualData(prev => prev.map(r => r.yn === yn ? { ...r, actual: null } : r))
  }

  // ── import simulation ──────────────────────────────────
  function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportLog(`นำเข้าไฟล์: ${file.name} (${(file.size/1024).toFixed(1)} KB) — ฟีเจอร์นี้ต้องการ backend เพื่อประมวลผล Excel`)
    e.target.value = ''
  }

  const tabs = [
    { id: 'overview', label: 'ภาพรวมรายปี' },
    { id: 'monthly',  label: 'รายละเอียดรายเดือน' },
    { id: 'manage',   label: 'จัดการข้อมูล' },
  ]

  return (
    <div className="space-y-5">

      {/* Tab nav */}
      <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs w-fit">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 transition-colors ${i > 0 ? 'border-l border-slate-200' : ''} ${
              tab === t.id ? 'bg-blue-900 text-white font-medium' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── TAB: OVERVIEW ─────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-5">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              { label: 'ขั้นต่ำตลอดสัญญา', value: fmtM(kpi.totalMin), unit: 'บาท', color: 'border-l-blue-500' },
              { label: 'จริงสะสม (ยืนยันแล้ว)', value: fmtM(kpi.totalActual), unit: 'บาท', color: 'border-l-emerald-500' },
              { label: 'ส่วนต่างสะสม', value: fmtM(Math.abs(kpi.diff)), unit: kpi.diff >= 0 ? 'บาท เกิน' : 'บาท ขาด', color: kpi.diff >= 0 ? 'border-l-emerald-400' : 'border-l-red-400' },
              { label: 'ความสำเร็จ', value: kpi.pct.toFixed(1) + '%', unit: 'เทียบขั้นต่ำ', color: 'border-l-amber-500' },
              { label: 'ปีที่มีข้อมูลจริง', value: kpi.yearsWithData, unit: 'ปี', color: 'border-l-violet-500' },
              { label: 'ปีที่ยังไม่มีข้อมูล', value: kpi.yearsNoData, unit: 'ปี', color: 'border-l-slate-400' },
            ].map((c, i) => (
              <div key={i} className={`bg-white rounded-xl border border-slate-200 border-l-4 ${c.color} p-4`}>
                <p className="text-xs text-slate-500 leading-tight mb-1">{c.label}</p>
                <p className="text-lg font-semibold text-slate-800 truncate">{c.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{c.unit}</p>
              </div>
            ))}
          </div>

          {/* Bar chart mini */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-700">กราฟเปรียบเทียบผลตอบแทนรายปี (ปีที่ 1–30)</p>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm bg-blue-400 opacity-70 inline-block" /> ขั้นต่ำ</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm bg-emerald-500 opacity-85 inline-block" /> จริง (ยืนยัน)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm bg-slate-400 opacity-60 inline-block" /> จริง (รอยืนยัน)</span>
              </div>
            </div>
            <BarChart data={annualData} maxVal={maxBar} />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>ปีที่ 1 (2544)</span>
              <span>ปีที่ 30 (2573)</span>
            </div>
          </div>

          {/* Annual table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-700">ตารางรายปีตลอดอายุสัญญา 30 ปี</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['ปีที่','ช่วงเวลา','ขั้นต่ำ (บาท)','จริง (บาท)','ส่วนต่าง','หมายเหตุ'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {annualData.map((r) => {
                    const unconf = UNCONFIRMED_YN.has(r.yn)
                    const diff = r.actual !== null ? r.actual - r.min : null
                    const over = diff !== null && diff >= 0
                    return (
                      <tr key={r.yn} className={`hover:bg-slate-50 ${r.actual === null ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-2.5 font-medium text-slate-700 whitespace-nowrap">{r.yn}</td>
                        <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                          มี.ค.{r.start} – ก.พ.{r.start+1}
                        </td>
                        <td className="px-4 py-2.5 text-right text-blue-700 font-medium whitespace-nowrap">
                          {fmt(r.min, 2)}
                        </td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          {r.actual !== null ? (
                            <span className={unconf ? 'text-slate-400 italic' : 'text-emerald-700 font-medium'}>
                              {fmt(r.actual, 2)}
                              {unconf && <span className="ml-1 text-[10px]">(รอยืนยัน)</span>}
                            </span>
                          ) : (
                            <span className="text-slate-300">ไม่มีข้อมูล</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          {diff !== null && !unconf ? (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              over ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {diff >= 0 ? '+' : ''}{fmt(diff, 2)}
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 max-w-xs truncate">{r.note || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footnote */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>หมายเหตุ:</strong> ข้อมูลผลตอบแทนจริงในปีสัญญาที่ 1–11 (พ.ศ. 2544–2554)
              ยังไม่พบเอกสารหรือข้อมูลยืนยันผลตอบแทนจริง จึงอยู่ระหว่างการสืบค้นข้อมูล
              โดยในช่วงเวลาดังกล่าวแสดงเฉพาะผลตอบแทนขั้นต่ำตามสัญญาเพื่อใช้อ้างอิงตามเงื่อนไขสัญญา
            </p>
          </div>
        </div>
      )}

      {/* ─── TAB: MONTHLY ─────────────────────────────── */}
      {tab === 'monthly' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 font-medium">เลือกปี พ.ศ.:</span>
            <select
              value={monthlyYear}
              onChange={e => setMonthlyYear(Number(e.target.value))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {monthlyYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {monthlyRows.length === 0 ? (
            <div className="flex items-center justify-center h-40 bg-white rounded-xl border border-slate-200">
              <p className="text-slate-400 text-sm">ไม่มีข้อมูลรายเดือนสำหรับปี {monthlyYear}</p>
            </div>
          ) : (
            <>
              {/* KPI */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500 mb-1">รายได้รวม</p>
                  <p className="text-xl font-semibold text-slate-800">
                    {fmt(monthlyRows.reduce((s,r)=>s+r.a,0), 2)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">บาท</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500 mb-1">จำนวนเดือนที่มีข้อมูล</p>
                  <p className="text-xl font-semibold text-slate-800">{monthlyRows.length}</p>
                  <p className="text-xs text-slate-400 mt-1">เดือน</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500 mb-1">เฉลี่ยต่อเดือน</p>
                  <p className="text-xl font-semibold text-slate-800">
                    {fmt(monthlyRows.reduce((s,r)=>s+r.a,0)/monthlyRows.length, 2)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">บาท/เดือน</p>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-sm font-medium text-slate-700 mb-2">กราฟรายเดือน ปี {monthlyYear}</p>
                <MonthlyChart rows={monthlyRows} />
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {['เดือน','ผลตอบแทน (บาท)','ยอดสะสม (บาท)'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        let cumul = 0
                        return monthlyRows.map((r, i) => {
                          cumul += r.a
                          return (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-slate-700 font-medium">{MONTHS_TH[r.m]} {r.y}</td>
                              <td className="px-4 py-3 text-right text-emerald-700 font-medium">{fmt(r.a, 2)}</td>
                              <td className="px-4 py-3 text-right text-slate-600">{fmt(cumul, 2)}</td>
                            </tr>
                          )
                        })
                      })()}
                      <tr className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                        <td className="px-4 py-3 text-slate-700">รวม</td>
                        <td className="px-4 py-3 text-right text-slate-800">{fmt(monthlyRows.reduce((s,r)=>s+r.a,0), 2)}</td>
                        <td className="px-4 py-3 text-right text-slate-400">—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── TAB: MANAGE ──────────────────────────────── */}
      {tab === 'manage' && (
        <div className="space-y-5">

          {/* Import Excel */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-slate-700">นำเข้าข้อมูลจาก Excel</p>
                <p className="text-xs text-slate-400 mt-0.5">รองรับไฟล์ .xlsx — ตรวจสอบข้อมูลซ้ำก่อนบันทึก</p>
              </div>
              <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm
                               font-medium px-4 py-2 rounded-lg cursor-pointer transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                นำเข้า Excel
                <input type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
              </label>
            </div>
            {importLog && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-700">
                {importLog}
              </div>
            )}
          </div>

          {/* Edit table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-700">แก้ไขข้อมูลผลตอบแทนจริงรายปี</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['ปีที่','ช่วงเวลา','ขั้นต่ำ (บาท)','จริง (บาท)','หมายเหตุ','จัดการ'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {annualData.map(r => (
                    <tr key={r.yn} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-700">{r.yn}</td>
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">มี.ค.{r.start}–ก.พ.{r.start+1}</td>
                      <td className="px-4 py-2.5 text-right text-blue-700 font-medium whitespace-nowrap">{fmt(r.min, 2)}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        {r.actual !== null
                          ? <span className="text-emerald-700 font-medium">{fmt(r.actual, 2)}</span>
                          : <span className="text-slate-300">ไม่มีข้อมูล</span>
                        }
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 max-w-xs truncate">{r.note || '—'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => openEdit(r)}
                            className="text-xs px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
                          >
                            แก้ไข
                          </button>
                          {r.actual !== null && (
                            <button
                              onClick={() => deleteActual(r.yn)}
                              className="text-xs px-2.5 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                            >
                              ลบ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Modal ───────────────────────────────── */}
      {editModal !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-1">
              แก้ไขผลตอบแทนจริง — ปีที่ {editForm.yn}
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              มี.ค.{annualData.find(r=>r.yn===editModal)?.start} – ก.พ.{annualData.find(r=>r.yn===editModal)?.start+1}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">ผลตอบแทนจริง (บาท)</label>
                <input
                  type="number"
                  step="any"
                  value={editForm.actual}
                  onChange={e => setEditForm(f => ({ ...f, actual: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">หมายเหตุ</label>
                <input
                  type="text"
                  value={editForm.note}
                  onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600"
              >
                ยกเลิก
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
