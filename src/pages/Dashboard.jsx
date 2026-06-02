import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  // Lease contract
  getLeaseContractYearRange,
  getCurrentLeaseContractYearNo,
  getLeaseContractLabel,
  getLeaseContractPeriodKeys,
  getLeaseContractStartYear,
} from '../lib/contractUtils'

// ── ปีปฏิทิน สำหรับตารางรายงาน ─────────────────────────
const CALENDAR_START      = 2564
const CALENDAR_END        = 2574
const REPORT_DEFAULT_YEAR = 2569
const CALENDAR_YEARS      = Array.from(
  { length: CALENDAR_END - CALENDAR_START + 1 },
  (_, i) => CALENDAR_END - i
)
const REPORT_LEASE_OPTIONS = getLeaseContractYearRange()

// ── เดือนภาษาไทย ─────────────────────────────────────────
const MONTHS_TH = [
  'ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
  'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.',
]

// ── 17 หัวข้อรายงาน แบ่ง 4 กลุ่ม ────────────────────────
const REPORT_GROUPS = [
  {
    group: 'ปริมาณน้ำ',
    color: 'blue',
    items: [
      { id: 'raw_water',   label: 'ปริมาณน้ำดิบ',              unit: 'ลบ.ม.' },
      { id: 'produced',    label: 'ปริมาณน้ำผลิตจ่าย',         unit: 'ลบ.ม.' },
      { id: 'local_vol',   label: 'ปริมาณน้ำจำหน่ายในพื้นที่', unit: 'ลบ.ม.' },
      { id: 'pattaya_vol', label: 'ปริมาณน้ำส่ง กปภ.สาขาพัทยา(พ.)',    unit: 'ลบ.ม.' },
    ],
  },
  {
    group: 'รายได้',
    color: 'emerald',
    items: [
      { id: 'rev_pattaya', label: 'รายได้ค่าน้ำ กปภ.สาขาพัทยา(พ.)',   unit: 'บาท' },
      { id: 'rev_local',   label: 'รายได้ค่าน้ำในพื้นที่',     unit: 'บาท' },
      { id: 'discount',    label: 'หักส่วนลด',                 unit: 'บาท' },
      { id: 'service_fee', label: 'ค่าบริการ',                 unit: 'บาท' },
      { id: 'rev_net',     label: 'รายได้สุทธิ',    unit: 'บาท' },
    ],
  },
  {
    group: 'ผลประโยชน์',
    color: 'amber',
    items: [
      { id: 'benefit_rent', label: 'ผลประโยชน์ เช่าบริหาร (รายได้สุทธิ 7%)', unit: 'บาท' },
      { id: 'benefit',      label: 'ผลประโยชน์ขายน้ำให้กปภ.สาขาพัทยา(พ.)(0.01%)',               unit: 'บาท' },
      { id: 'benefit_net',  label: 'ผลประโยชน์สุทธิ (กปภ.)',   unit: 'บาท' },
    ],
  },
  {
    group: 'ผู้ใช้น้ำ',
    color: 'violet',
    items: [
      { id: 'users_total', label: 'ผู้ใช้น้ำรวม',    unit: 'ราย' },
      { id: 'users_new',   label: 'ผู้ใช้น้ำรายใหม่', unit: 'ราย' },
    ],
  },
  {
    group: 'อัตรา',
    color: 'teal',
    items: [
      { id: 'loss_total',  label: 'อัตราน้ำสูญเสียรวม',      unit: '%' },
      { id: 'loss_dist',   label: 'อัตราน้ำสูญเสียระบบจ่าย', unit: '%' },
      { id: 'usage_rate',  label: 'อัตราการใช้น้ำ',          unit: 'ลบ.ม./ราย/วัน' },
    ],
  },
  {
    group: 'ข้อร้องเรียน',
    color: 'rose',
    items: [
      { id: 'cmp_water_qty',    label: 'ด้านปริมาณน้ำ',     unit: 'เรื่อง' },
      { id: 'cmp_pipe_small',   label: 'ท่อแตก <50 มม.',    unit: 'เรื่อง' },
      { id: 'cmp_pipe_large',   label: 'ท่อแตก >50 มม.',    unit: 'เรื่อง' },
      { id: 'cmp_water_qual',   label: 'ด้านคุณภาพน้ำ',     unit: 'เรื่อง' },
      { id: 'cmp_total',        label: 'รวมข้อร้องเรียน',   unit: 'เรื่อง' },
    ],
  },
]

const ALL_ITEMS = REPORT_GROUPS.flatMap(g => g.items)

// ── แปลง rows จาก Supabase → yearData object (key → array[12]) ──
function rowsToYearData(rows) {
  const data = Object.fromEntries(ALL_ITEMS.map(k => [k.id, Array(12).fill(null)]))
  rows.forEach(row => {
    const idx = row.month - 1
    ALL_ITEMS.forEach(({ id }) => {
      if (row[id] !== undefined && row[id] !== null) data[id][idx] = Number(row[id])
    })
  })
  return data
}

// ── helpers ──────────────────────────────────────────────
const AVG_IDS     = ['loss_total', 'loss_dist', 'usage_rate']
const LASTVAL_IDS = ['users_total']

function computeTotal(arr, id) {
  const vals = arr.filter(v => v !== null && v !== undefined)
  if (vals.length === 0) return null
  if (AVG_IDS.includes(id))     return vals.reduce((a, b) => a + b, 0) / vals.length
  if (LASTVAL_IDS.includes(id)) return vals[vals.length - 1]
  return vals.reduce((a, b) => a + b, 0)
}

function fmtNum(v, unit, compact = false) {
  if (v === null || v === undefined) return '—'
  if (unit === '%')              return v.toFixed(2) + '%'
  if (unit === 'ลบ.ม./ราย/วัน') return v.toFixed(3)
  if (compact && v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M'
  return v.toLocaleString('th-TH', { maximumFractionDigits: 2 })
}

const GROUP_STYLE = {
  blue:    { border: 'border-l-blue-500',    dot: 'bg-blue-400'    },
  emerald: { border: 'border-l-emerald-500', dot: 'bg-emerald-400' },
  amber:   { border: 'border-l-amber-500',   dot: 'bg-amber-400'   },
  violet:  { border: 'border-l-violet-500',  dot: 'bg-violet-400'  },
  teal:    { border: 'border-l-teal-500',    dot: 'bg-teal-400'    },
  rose:    { border: 'border-l-rose-500',    dot: 'bg-rose-400'    },
}

// ─────────────────────────────────────────────────────────
// COMPONENTS (ใหม่)
// ─────────────────────────────────────────────────────────

function NoData() {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" />
      รอกรอกข้อมูล
    </span>
  )
}

function ReportKpiCard({ item, monthlyData, color }) {
  const total   = computeTotal(monthlyData, item.id)
  const hasData = monthlyData.some(v => v !== null)
  const filled  = monthlyData.filter(v => v !== null).length
  const s       = GROUP_STYLE[color]
  return (
    <div className={`rounded-xl p-4 border border-slate-200 bg-white border-l-4 ${s.border}`}>
      <p className="text-xs text-slate-500 leading-tight mb-1">{item.label}</p>
      {hasData ? (
        <>
          <p className="text-xl font-medium text-slate-800 truncate">
            {fmtNum(total, item.unit, true)}
          </p>
          <p className="text-xs text-slate-400 mt-1">{item.unit} · {filled}/12 เดือน</p>
        </>
      ) : (
        <div className="mt-2"><NoData /></div>
      )}
    </div>
  )
}

function ReportTable({ yearData }) {
  return (
    <div className="space-y-5">
      {REPORT_GROUPS.map(group => {
        const s = GROUP_STYLE[group.color]
        return (
          <div key={group.group} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
              <p className="text-sm font-medium text-slate-700">{group.group}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-max">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="sticky left-0 bg-slate-50 z-10 px-4 py-3 text-left font-medium text-slate-500 w-56">
                      รายการ
                    </th>
                    <th className="px-3 py-3 text-center font-medium text-slate-400 w-16">หน่วย</th>
                    {MONTHS_TH.map(m => (
                      <th key={m} className="px-2 py-3 text-center font-medium text-slate-500 whitespace-nowrap">
                        {m}
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center font-medium text-blue-600 whitespace-nowrap">
                      รวม/เฉลี่ย
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {group.items.map((item, idx) => {
                    const monthly = yearData[item.id] ?? Array(12).fill(null)
                    const total   = computeTotal(monthly, item.id)
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50 ${idx % 2 !== 0 ? 'bg-slate-50/40' : ''}`}
                      >
                        <td className="sticky left-0 bg-inherit z-10 px-4 py-2.5 text-slate-700 font-medium">
                          {item.label}
                        </td>
                        <td className="px-3 py-2.5 text-center text-slate-400">{item.unit}</td>
                        {monthly.map((val, i) => (
                          <td key={i} className="px-2 py-2.5 text-center text-slate-600">
                            {val !== null
                              ? fmtNum(val, item.unit)
                              : <span className="text-slate-300">—</span>}
                          </td>
                        ))}
                        <td className="px-3 py-2.5 text-center font-semibold text-blue-700">
                          {total !== null
                            ? fmtNum(total, item.unit)
                            : <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────
export default function Dashboard() {
  // ── state ────────────────────────────────────────────
  const [reportTab,      setReportTab]      = useState('kpi')
  const [reportMode,     setReportMode]     = useState('calendar')
  const [calendarYear,   setCalendarYear]   = useState(REPORT_DEFAULT_YEAR)
  const [reportLeaseNo,  setReportLeaseNo]  = useState(getCurrentLeaseContractYearNo)
  const [reportYearData, setReportYearData] = useState(null)
  const [reportLoading,  setReportLoading]  = useState(false)

  // ── fetch report data รองรับทั้ง 2 mode ───────────────
  useEffect(() => {
    async function fetchReportData() {
      setReportLoading(true)
      let rows = []
      if (reportMode === 'calendar') {
        const { data } = await supabase
          .from('annual_report_data')
          .select('*')
          .eq('year', calendarYear)
          .order('month')
        rows = data || []
      } else {
        const startBY = getLeaseContractStartYear(reportLeaseNo)
        const yearSet = [startBY, startBY + 1]
        const keys    = getLeaseContractPeriodKeys(reportLeaseNo)
        const keySet  = new Set(keys.map(k => `${k.fiscal_year}-${k.month}`))
        const { data } = await supabase
          .from('annual_report_data')
          .select('*')
          .in('year', yearSet)
          .order('year').order('month')
        rows = (data || []).filter(r => keySet.has(`${r.year}-${r.month}`))
      }
      setReportYearData(rows.length > 0 ? rowsToYearData(rows) : rowsToYearData([]))
      setReportLoading(false)
    }
    fetchReportData()
  }, [calendarYear, reportLeaseNo, reportMode])

  const yearData = reportYearData ?? rowsToYearData([])

  // ─────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="pt-0">

            {/* Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between mb-4">
              {/* Tab toggle */}
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs w-fit">
                <button
                  onClick={() => setReportTab('kpi')}
                  className={`px-3 py-2 transition-colors ${
                    reportTab === 'kpi'
                      ? 'bg-blue-600 text-white font-medium'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  ภาพรวม KPI
                </button>
                <button
                  onClick={() => setReportTab('table')}
                  className={`px-3 py-2 border-l border-slate-200 transition-colors ${
                    reportTab === 'table'
                      ? 'bg-blue-600 text-white font-medium'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  ตารางรายเดือน
                </button>
              </div>

              {/* Year dropdown — style เดียวกับ fiscalYear dropdown */}
              <select
                value={calendarYear}
                onChange={e => setCalendarYear(Number(e.target.value))}
                className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white
                           text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-fit"
              >
                {CALENDAR_YEARS.map(y => (
                  <option key={y} value={y}>ปี พ.ศ. {y}</option>
                ))}
              </select>
            </div>

            {/* KPI Cards — แบ่งตามกลุ่ม */}
            {reportLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-slate-400 text-sm">กำลังโหลดข้อมูล...</p>
              </div>
            ) : reportTab === 'kpi' && (
              <div className="space-y-5">
                {REPORT_GROUPS.map(group => {
                  const s = GROUP_STYLE[group.color]
                  return (
                    <div key={group.group}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                        <p className="text-xs font-semibold text-slate-600">{group.group}</p>
                        <div className="flex-1 h-px bg-slate-100" />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {group.items.map(item => (
                          <ReportKpiCard
                            key={item.id}
                            item={item}
                            monthlyData={yearData[item.id] ?? Array(12).fill(null)}
                            color={group.color}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Monthly Table */}
            {!reportLoading && reportTab === 'table' && (
              <ReportTable yearData={yearData} />
            )}

      </div>
    </div>
  )
}
