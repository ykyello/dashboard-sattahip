import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { computeKpis, topPipelines, topDmaByFrequency } from '../../lib/outageStats'

const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const YEAR_COLORS = ['#1e40af', '#93c5fd', '#0d9488', '#f59e0b', '#8b5cf6']
const CAUSE_COLORS = {
  'ท่อแตก': 'bg-blue-500',
  'ไฟดับ': 'bg-amber-500',
  'ซ่อมบำรุง': 'bg-teal-500',
  'งานก่อสร้าง': 'bg-violet-500',
  'อื่นๆ': 'bg-slate-400',
}

const beYear = (iso) => new Date(iso).getFullYear() + 543

// ข้อมูลด้านเวลาครบหรือยัง (ข้อมูลนำเข้าจาก Excel ยังไม่มีระยะเวลาประกาศ)
const hasTimeData = (e) => e.announced_duration_min !== null

function fmtMin(min) {
  if (min === null || min === undefined) return null
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return h > 0 ? `${h} ชม. ${m} น.` : `${m} น.`
}

// ── Small UI pieces ──────────────────────────────────────
function KpiCard({ label, value, unit, sub, subTone = 'slate' }) {
  const tone = { slate: 'text-slate-400', red: 'text-red-600', green: 'text-green-600', amber: 'text-amber-600' }[subTone]
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      {value !== null ? (
        <p className="text-2xl font-medium text-slate-800">
          {value}
          {unit && <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>}
        </p>
      ) : (
        <p className="text-sm text-slate-400 mt-2">ข้อมูลไม่พอ</p>
      )}
      {sub && <p className={`text-xs mt-1 ${tone}`}>{sub}</p>}
    </div>
  )
}

function RankList({ title, rows, unit = 'ครั้ง' }) {
  const max = rows[0]?.count || 1
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-sm font-medium text-slate-700 mb-3">{title}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400">ยังไม่มีข้อมูล</p>
      ) : (
        <ol className="space-y-2.5">
          {rows.map((r, i) => (
            <li key={r.label}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-slate-700 truncate">
                  <span className="text-slate-400 mr-1.5">{i + 1}.</span>{r.label}
                </span>
                <span className="text-slate-500 whitespace-nowrap">{r.count} {unit}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full mt-1">
                <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
export default function OutageDashboardTab({ refreshKey }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [year, setYear] = useState('all')

  useEffect(() => { fetchData() }, [refreshKey])

  async function fetchData() {
    setLoading(true)
    setLoadError(null)
    const { data, error } = await supabase
      .from('water_outage_events')
      .select('*, water_outage_event_dma ( dma ( id, dma_code, dma_name ) )')
      .order('start_at', { ascending: true })
    if (error) {
      setLoadError(error.message)
    } else {
      setEvents(
        (data || []).map((e) => ({
          ...e,
          dma_list: (e.water_outage_event_dma || []).map((x) => x.dma).filter(Boolean),
        }))
      )
    }
    setLoading(false)
  }

  const yearOptions = useMemo(
    () => [...new Set(events.map((e) => beYear(e.start_at)))].sort((a, b) => b - a),
    [events]
  )

  // ตั้งค่าเริ่มต้นเป็นปีล่าสุดที่มีข้อมูล
  useEffect(() => {
    if (year === 'all' && yearOptions.length > 0) setYear(String(yearOptions[0]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearOptions.length])

  const scoped = useMemo(
    () => (year === 'all' ? events : events.filter((e) => beYear(e.start_at) === Number(year))),
    [events, year]
  )

  // ── KPI ──
  const kpi = useMemo(() => computeKpis(scoped), [scoped])
  const timeReady = scoped.filter(hasTimeData)
  const closedCount = scoped.filter((e) => e.actual_completion_at != null).length
  // "อยู่ระหว่างซ่อม" นับเฉพาะรายการที่บันทึกครบแล้วแต่ยังไม่มีเวลาซ่อมเสร็จ
  // (ข้อมูลนำเข้าจาก Excel ไม่นับ เพราะไม่ได้กำลังซ่อมอยู่จริง)
  const openCount = timeReady.filter((e) => e.actual_completion_at == null).length
  const incompleteCount = scoped.length - timeReady.length

  // เทียบช่วงเดียวกันของปีก่อน (ถ้าเป็นปีปัจจุบัน เทียบถึงเดือนปัจจุบัน)
  const compare = useMemo(() => {
    if (year === 'all') return null
    const y = Number(year)
    const now = new Date()
    const lastMonth = y === now.getFullYear() + 543 ? now.getMonth() : 11
    const prev = events.filter((e) => {
      const d = new Date(e.start_at)
      return d.getFullYear() + 543 === y - 1 && d.getMonth() <= lastMonth
    }).length
    const cur = scoped.filter((e) => new Date(e.start_at).getMonth() <= lastMonth).length
    if (prev === 0) return null
    return { prev, cur, pct: ((cur - prev) / prev) * 100, lastMonth }
  }, [events, scoped, year])

  // ── กราฟรายเดือน: ปีที่เลือกเทียบปีก่อน / ทุกปี = ทุกปีที่มีข้อมูล ──
  const chartYears = useMemo(() => {
    if (year === 'all') return [...yearOptions].sort((a, b) => a - b)
    const y = Number(year)
    return yearOptions.includes(y - 1) ? [y - 1, y] : [y]
  }, [year, yearOptions])

  const monthlyData = useMemo(
    () =>
      MONTHS_TH.map((label, m) => {
        const row = { label }
        chartYears.forEach((y) => {
          row[y] = events.filter((e) => {
            const d = new Date(e.start_at)
            return d.getFullYear() + 543 === y && d.getMonth() === m
          }).length
        })
        return row
      }),
    [events, chartYears]
  )

  // ── Rankings ──
  const pipelineRank = useMemo(
    () =>
      topPipelines(scoped, 8)
        .filter((r) => r.pipeline_line !== 'ไม่ระบุ')
        .slice(0, 5)
        .map((r) => ({ label: r.pipeline_line, count: r.count })),
    [scoped]
  )

  const dmaRank = useMemo(
    () => topDmaByFrequency(scoped, 10).slice(0, 5).map((r) => ({ label: r.dma_name, count: r.count })),
    [scoped]
  )

  const sizeRank = useMemo(() => {
    const map = {}
    scoped.forEach((e) => {
      if (e.pipe_size) map[e.pipe_size] = (map[e.pipe_size] || 0) + 1
    })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([size, count]) => ({ label: `Ø ${size} มม.`, count }))
  }, [scoped])

  // จุดเกิดซ้ำ: ยังไม่มีพิกัด จึงจับจากชื่อสถานที่ (ตัดช่องว่าง/คำว่า "บริเวณ" ออกก่อนเทียบ)
  // เมื่อเติมพิกัดครบแล้ว ควรเปลี่ยนไปใช้ topRepeatLocations() ใน outageStats.js
  const repeatRank = useMemo(() => {
    const norm = (s) => String(s || '').replace(/บริเวณ/g, '').replace(/\s+/g, '').trim()
    const map = {}
    scoped.forEach((e) => {
      const key = norm(e.location_name)
      if (!key) return
      if (!map[key]) map[key] = { label: e.location_name.trim(), count: 0 }
      map[key].count += 1
    })
    return Object.values(map)
      .filter((r) => r.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [scoped])

  const causeRows = Object.entries(kpi.causeBreakdown).sort((a, b) => b[1] - a[1])

  // ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 bg-white rounded-xl border border-slate-200">
        <p className="text-slate-400 text-sm">กำลังโหลด...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
        โหลดข้อมูลไม่สำเร็จ: {loadError}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 bg-white rounded-xl border border-slate-200">
        <p className="text-slate-400 text-sm">ยังไม่มีเหตุการณ์หยุดจ่ายน้ำ</p>
      </div>
    )
  }

  const monthsInScope = (() => {
    if (year === 'all') return new Set(scoped.map((e) => e.start_at.slice(0, 7))).size || 1
    const now = new Date()
    return Number(year) === now.getFullYear() + 543 ? now.getMonth() + 1 : 12
  })()

  return (
    <div className="space-y-5">

      {/* ── Year selector ── */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {yearOptions.map((y) => <option key={y} value={y}>ปี พ.ศ. {y}</option>)}
          <option value="all">ทุกปี</option>
        </select>
        {incompleteCount > 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {incompleteCount} รายการยังไม่มีเวลาและระยะเวลาประกาศ — ตัวชี้วัดด้านเวลาคำนวณจาก {closedCount} รายการที่ซ่อมเสร็จแล้ว
          </p>
        )}
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard
          label="เหตุการณ์หยุดจ่ายน้ำ"
          value={scoped.length}
          unit="ครั้ง"
          sub={
            compare
              ? `${compare.pct >= 0 ? '+' : ''}${compare.pct.toFixed(0)}% จากช่วงเดียวกันปีก่อน (${compare.prev} ครั้ง)`
              : null
          }
          subTone={compare ? (compare.pct > 0 ? 'red' : 'green') : 'slate'}
        />
        <KpiCard
          label="เฉลี่ยต่อเดือน"
          value={(scoped.length / monthsInScope).toFixed(1)}
          unit="ครั้ง"
          sub={`จาก ${monthsInScope} เดือน`}
        />
        <KpiCard
          label="ระยะเวลาซ่อมเฉลี่ย"
          value={fmtMin(kpi.avgRepairDurationMin)}
          sub={closedCount > 0 ? `จาก ${closedCount} รายการ` : null}
        />
        <KpiCard
          label="ซ่อมเสร็จตามเวลาประกาศ"
          value={kpi.onTimeRepairPct !== null ? kpi.onTimeRepairPct.toFixed(0) : null}
          unit="%"
          sub={closedCount > 0 ? `จาก ${closedCount} รายการ` : null}
        />
        <KpiCard
          label="อยู่ระหว่างซ่อม"
          value={openCount}
          unit="รายการ"
          subTone={openCount > 0 ? 'amber' : 'slate'}
          sub={openCount > 0 ? 'ยังไม่บันทึกเวลาซ่อมเสร็จ' : null}
        />
      </div>

      {/* ── Monthly chart + cause breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 lg:col-span-2">
          <p className="text-sm font-medium text-slate-700 mb-3">
            จำนวนเหตุการณ์รายเดือน{chartYears.length > 1 ? ` (เทียบ ${chartYears.join(' / ')})` : ''}
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  formatter={(v, name) => [`${v} ครั้ง`, `ปี ${name}`]}
                />
                {chartYears.length > 1 && (
                  <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => `ปี ${v}`} />
                )}
                {chartYears.map((y, i) => (
                  <Bar
                    key={y}
                    dataKey={String(y)}
                    fill={YEAR_COLORS[(chartYears.length - 1 - i) % YEAR_COLORS.length]}
                    radius={[3, 3, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-700 mb-3">สาเหตุ</p>
          <div className="space-y-3">
            {causeRows.map(([cause, count]) => (
              <div key={cause}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-700">{cause}</span>
                  <span className="text-slate-500">
                    {count} ครั้ง ({((count / scoped.length) * 100).toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full">
                  <div
                    className={`h-2 rounded-full ${CAUSE_COLORS[cause] ?? 'bg-slate-400'}`}
                    style={{ width: `${(count / scoped.length) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Rankings ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <RankList title="เส้นท่อที่เกิดเหตุบ่อย" rows={pipelineRank} />
        <RankList title="DMA ที่ได้รับผลกระทบบ่อย" rows={dmaRank} />
        <RankList title="ขนาดท่อที่เกิดเหตุบ่อย" rows={sizeRank} />
        <RankList title="สถานที่เกิดซ้ำ (2 ครั้งขึ้นไป)" rows={repeatRank} />
      </div>
      <p className="text-xs text-slate-400">
        DMA นับทุกเหตุการณ์ที่กระทบ DMA นั้น (เหตุการณ์ที่กระทบทุก DMA จะถูกนับให้ทุก DMA)
        · สถานที่เกิดซ้ำจับจากชื่อสถานที่ เนื่องจากข้อมูลส่วนใหญ่ยังไม่มีพิกัด
      </p>
    </div>
  )
}
