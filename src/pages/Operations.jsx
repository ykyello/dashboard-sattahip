import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  getLeaseContractYearRange,
  getCurrentLeaseContractYearNo,
  getLeaseContractLabel,
  getLeaseContractPeriodKeys,
  getLeaseContractStartYear,
} from '../lib/contractUtils'

const LEASE_YEAR_OPTIONS = getLeaseContractYearRange()

const MONTHS_TH = [
  '', 'ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
  'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.',
]

function fmt(v, decimal = 0) {
  if (v === null || v === undefined) return '—'
  return Number(v).toLocaleString('th-TH', { maximumFractionDigits: decimal })
}

// ─────────────────────────────────────────────────────────
// TAB 1: ผลประโยชน์รายเดือน (เดิม)
// ─────────────────────────────────────────────────────────
function TabMonthly() {
  const [leaseYearNo, setLeaseYearNo] = useState(getCurrentLeaseContractYearNo)
  const [rows,        setRows]        = useState([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => { fetchData() }, [leaseYearNo])

  async function fetchData() {
    setLoading(true)
    const startBY = getLeaseContractStartYear(leaseYearNo)
    const yearSet = [startBY, startBY + 1]
    const keys    = getLeaseContractPeriodKeys(leaseYearNo)
    const keySet  = new Set(keys.map(k => `${k.fiscal_year}-${k.month}`))

    const { data } = await supabase
      .from('annual_report_data')
      .select('year, month, rev_local, discount, service_fee, rev_net, benefit_rent, benefit_net')
      .in('year', yearSet)
      .order('year').order('month')

    const filtered = (data || []).filter(r => keySet.has(`${r.year}-${r.month}`))
    const withCalc = filtered.map(r => {
      const base   = (Number(r.rev_local) || 0) - (Number(r.discount) || 0) + (Number(r.service_fee) || 0)
      const minBen = base * 0.07
      const actual = Number(r.benefit_rent) || 0
      return { ...r, minBenefit: minBen, actualBenefit: actual, diff: actual - minBen }
    })
    setRows(withCalc)
    setLoading(false)
  }

  const totalMin    = rows.reduce((s, r) => s + r.minBenefit,    0)
  const totalActual = rows.reduce((s, r) => s + r.actualBenefit, 0)
  const totalDiff   = totalActual - totalMin
  const overAll     = totalDiff >= 0
  const label       = getLeaseContractLabel(leaseYearNo)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-600 font-medium whitespace-nowrap">ปีสัญญา:</span>
        <select
          value={leaseYearNo}
          onChange={e => setLeaseYearNo(Number(e.target.value))}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700
                     focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[280px]"
        >
          {LEASE_YEAR_OPTIONS.map(yn => (
            <option key={yn} value={yn}>{getLeaseContractLabel(yn)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-slate-400 text-sm">กำลังโหลด...</p>
        </div>
      ) : (
        <>


          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 bg-white rounded-xl border border-slate-200 gap-2">
              <p className="text-slate-400 text-sm">ยังไม่มีข้อมูล {label}</p>
              <p className="text-slate-300 text-xs">กรอกข้อมูลผ่านเมนู บันทึกผลดำเนินงาน</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-700">{label}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['เดือน','รายได้ในพื้นที่ (บาท)','หักส่วนลด (บาท)','ค่าบริการ (บาท)','ขั้นต่ำ 7% (บาท)'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">{MONTHS_TH[r.month]} {r.year}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{fmt(r.rev_local, 2)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{fmt(r.discount, 2)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{fmt(r.service_fee, 2)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{fmt(r.minBenefit, 2)}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                      <td className="px-4 py-3 text-slate-700">รวม</td>
                      <td className="px-4 py-3 text-right text-slate-800">{fmt(rows.reduce((s,r) => s+(Number(r.rev_local)||0), 0), 2)}</td>
                      <td className="px-4 py-3 text-right text-slate-800">{fmt(rows.reduce((s,r) => s+(Number(r.discount)||0), 0), 2)}</td>
                      <td className="px-4 py-3 text-right text-slate-800">{fmt(rows.reduce((s,r) => s+(Number(r.service_fee)||0), 0), 2)}</td>
                      <td className="px-4 py-3 text-right text-slate-800">{fmt(totalMin, 2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// TAB 2: ผลตอบแทนสิทธิบริหาร (ใหม่ — ดึงข้อมูลจาก Supabase)
// ─────────────────────────────────────────────────────────
function TabReturns() {
  const [annualData,   setAnnualData]   = useState([])
  const [monthlyData,  setMonthlyData]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [subTab,       setSubTab]       = useState('overview')  // overview | monthly | manage
  // ปีสัญญาที่เลือกดู (overview)
  const [selectedYearNo, setSelectedYearNo] = useState(null)   // null = แสดงทุกปี
  // ปีสัญญาที่เลือกสำหรับ monthly
  const [monthlyYearNo, setMonthlyYearNo]   = useState(null)
  const [editModal,    setEditModal]    = useState(null)
  const [editForm,     setEditForm]     = useState({})
  const [saving,       setSaving]       = useState(false)
  const [toast,        setToast]        = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  // modal เพิ่มรายเดือน
  const [addMonthlyModal, setAddMonthlyModal] = useState(false)
  const [addMonthlyForm,  setAddMonthlyForm]  = useState({ year_no:'', year_be:'', month:'', amount:'', ref_doc:'', note:'' })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [{ data: a }, { data: m }] = await Promise.all([
      supabase.from('lease_returns').select('*').order('year_no'),
      supabase.from('lease_returns_monthly').select('*').order('year_be').order('month'),
    ])
    setAnnualData(a || [])
    setMonthlyData(m || [])
    // default monthly year_no = ปีสัญญาล่าสุดที่มีข้อมูล
    if (m && m.length > 0) {
      const latestYearNo = m.reduce((max, r) => Math.max(max, r.year_no), 0)
      setMonthlyYearNo(prev => prev ?? latestYearNo)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  // ── KPI (ตลอดสัญญา — ไม่กรองตาม selectedYearNo) ────────
  const totalMin      = annualData.reduce((s, r) => s + Number(r.min_benefit), 0)
  const confirmedRows = annualData.filter(r => r.actual !== null && r.is_confirmed)
  const totalActual   = confirmedRows.reduce((s, r) => s + Number(r.actual), 0)
  const totalMinConf  = confirmedRows.reduce((s, r) => s + Number(r.min_benefit), 0)
  const totalDiff     = totalActual - totalMinConf
  const pct           = totalMin > 0 ? (totalActual / totalMin * 100) : 0
  const yearsWithData = confirmedRows.length
  const yearsNoData   = annualData.filter(r => r.actual === null).length

  // ── ปีสัญญาที่มีข้อมูลรายเดือน (สำหรับ dropdown monthly) ──
  const monthlyYearNos = [...new Set(monthlyData.map(r => r.year_no))].sort((a, b) => b - a)
  const selMonthlyYearNo = monthlyYearNo || (monthlyYearNos[0] ?? null)

  // กรองรายเดือนตามปีสัญญาที่เลือก (มี.ค.–ก.พ.)
  const monthlyRows = monthlyData
    .filter(r => r.year_no === selMonthlyYearNo)
    .sort((a, b) => {
      // เรียงตามรอบ มี.ค.(3)–ก.พ.(2): เดือน 3–12 ก่อน แล้ว 1–2
      const orderA = a.month >= 3 ? a.month : a.month + 12
      const orderB = b.month >= 3 ? b.month : b.month + 12
      if (a.year_be !== b.year_be) return a.year_be - b.year_be
      return orderA - orderB
    })
  const monthlyTotal = monthlyRows.reduce((s, r) => s + Number(r.amount), 0)

  // ── กรอง annualData ตาม selectedYearNo (overview) ────────
  const filteredAnnual = selectedYearNo
    ? annualData.filter(r => r.year_no === selectedYearNo)
    : annualData

  // ── bar chart max (ของชุดที่กรองแล้ว) ───────────────────
  const maxBar = Math.max(...filteredAnnual.map(r => Math.max(Number(r.min_benefit), Number(r.actual) || 0)), 1)

  // ── label ปีสัญญาที่เลือก ────────────────────────────────
  const selectedAnnualRow = annualData.find(r => r.year_no === selectedYearNo)
  const overviewLabel = selectedAnnualRow
    ? `ปีที่ ${selectedAnnualRow.year_no} (มี.ค.${selectedAnnualRow.start_be} – ก.พ.${selectedAnnualRow.start_be + 1})`
    : 'ทุกปี (ปีที่ 1–30)'
  const monthlyContractLabel = selMonthlyYearNo && annualData.find(r => r.year_no === selMonthlyYearNo)
    ? (() => { const row = annualData.find(r => r.year_no === selMonthlyYearNo); return `ปีที่ ${row.year_no} (มี.ค.${row.start_be} – ก.พ.${row.start_be + 1})` })()
    : ''

  // ── save annual edit ────────────────────────────────────
  async function saveAnnualEdit() {
    setSaving(true)
    const { error } = await supabase
      .from('lease_returns')
      .update({
        actual:       editForm.actual !== '' ? Number(editForm.actual) : null,
        is_confirmed: editForm.actual !== '',
        note:         editForm.note || null,
        updated_at:   new Date().toISOString(),
      })
      .eq('id', editModal.id)
    setSaving(false)
    if (error) { showToast('error', 'บันทึกไม่สำเร็จ: ' + error.message) }
    else       { showToast('success', 'บันทึกสำเร็จ'); setEditModal(null); fetchAll() }
  }

  // ── delete annual actual ────────────────────────────────
  async function deleteActual(id) {
    await supabase.from('lease_returns').update({ actual: null, is_confirmed: false }).eq('id', id)
    setDeleteConfirm(null)
    fetchAll()
  }

  // ── add monthly ─────────────────────────────────────────
  async function saveAddMonthly() {
    if (!addMonthlyForm.year_no || !addMonthlyForm.year_be || !addMonthlyForm.month || !addMonthlyForm.amount) return
    setSaving(true)
    const { error } = await supabase.from('lease_returns_monthly').upsert({
      year_no:  Number(addMonthlyForm.year_no),
      year_be:  Number(addMonthlyForm.year_be),
      month:    Number(addMonthlyForm.month),
      amount:   Number(addMonthlyForm.amount),
      ref_doc:  addMonthlyForm.ref_doc || null,
      note:     addMonthlyForm.note    || null,
    }, { onConflict: 'year_be,month' })
    setSaving(false)
    if (error) { showToast('error', 'บันทึกไม่สำเร็จ: ' + error.message) }
    else       { showToast('success', 'เพิ่มข้อมูลรายเดือนสำเร็จ'); setAddMonthlyModal(false); fetchAll() }
  }

  // ── import Excel (UI only — แนะนำให้ใช้ SQL seed) ───────
  function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    showToast('error', `"${file.name}" — กรุณา import ผ่าน SQL script ใน Supabase Dashboard แทนครับ`)
    e.target.value = ''
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-slate-400 text-sm">กำลังโหลดข้อมูล...</p>
      </div>
    )
  }

  const subTabs = [
    { id: 'overview', label: 'ภาพรวมรายปี' },
    { id: 'monthly',  label: 'รายละเอียดรายเดือน' },
    { id: 'manage',   label: 'จัดการข้อมูล' },
  ]

  return (
    <div className="space-y-5">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
          flex items-center gap-2 ${toast.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {toast.type === 'success' ? '✓' : '⚠'} {toast.msg}
        </div>
      )}

      {/* Sub-tab nav */}
      <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs w-fit">
        {subTabs.map((t, i) => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`px-4 py-2.5 transition-colors ${i > 0 ? 'border-l border-slate-200' : ''} ${
              subTab === t.id ? 'bg-blue-900 text-white font-medium' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ภาพรวมรายปี ─────────────────────────────────── */}
      {subTab === 'overview' && (
        <div className="space-y-5">

          {/* KPI (ตลอดสัญญา 30 ปีเสมอ) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'ขั้นต่ำตลอดสัญญา',      value: (totalMin/1e6).toFixed(2)+' ล.',    unit: 'บาท',          color: 'border-l-blue-500'   },
              { label: 'จริงสะสม (ยืนยันแล้ว)', value: (totalActual/1e6).toFixed(2)+' ล.', unit: 'บาท',          color: 'border-l-emerald-500' },
              { label: 'ส่วนต่างสะสม',           value: (Math.abs(totalDiff)/1e6).toFixed(2)+' ล.',
                unit: totalDiff >= 0 ? 'บาท เกิน' : 'บาท ขาด',
                color: totalDiff >= 0 ? 'border-l-emerald-400' : 'border-l-red-400' },
              { label: 'ความสำเร็จ',             value: pct.toFixed(1)+'%',                 unit: 'เทียบขั้นต่ำ', color: 'border-l-amber-500'  },
            ].map((c, i) => (
              <div key={i} className={`bg-white rounded-xl border border-slate-200 border-l-4 ${c.color} p-4`}>
                <p className="text-xs text-slate-500 leading-tight mb-1">{c.label}</p>
                <p className="text-lg font-semibold text-slate-800 truncate">{c.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{c.unit}</p>
              </div>
            ))}
          </div>

          {/* Selector ปีสัญญา */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-slate-600 font-medium whitespace-nowrap">ปีสัญญา:</span>
            <select
              value={selectedYearNo ?? ''}
              onChange={e => setSelectedYearNo(e.target.value === '' ? null : Number(e.target.value))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700
                         focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[300px]"
            >
              <option value="">ทั้งหมด (ปีที่ 1–30)</option>
              {annualData.map(r => (
                <option key={r.year_no} value={r.year_no}>
                  ปีที่ {r.year_no} — มี.ค.{r.start_be} – ก.พ.{r.start_be + 1}
                </option>
              ))}
            </select>
            {selectedYearNo && (
              <button onClick={() => setSelectedYearNo(null)}
                className="text-xs text-slate-400 hover:text-slate-600 underline">
                ล้างการกรอง
              </button>
            )}
          </div>

          {/* Bar chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <p className="text-sm font-medium text-slate-700">
                กราฟเปรียบเทียบผลตอบแทน<strong>สะสม</strong> — {overviewLabel}
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-0.5 bg-blue-400 inline-block rounded"/> ขั้นต่ำสะสม
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-0.5 bg-emerald-500 inline-block rounded"/> ผลตอบแทนจริงสะสม (ยืนยัน)
                </span>
              </div>
            </div>

            {selectedYearNo ? (
              /* กรณีเลือกปีเดียว — แสดงแท่งใหญ่เปรียบเทียบ */
              (() => {
                const r = filteredAnnual[0]
                if (!r) return null
                const minV = Number(r.min_benefit)
                const actV = r.actual ? Number(r.actual) : 0
                const maxV = Math.max(minV, actV, 1)
                const diff = r.actual && r.is_confirmed ? actV - minV : null
                return (
                  <div className="flex items-end gap-8 h-32 px-4">
                    {/* ขั้นต่ำ */}
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <p className="text-xs text-slate-500 font-medium">{fmt(minV, 2)} บาท</p>
                      <div className="w-full flex items-end justify-center" style={{ height: 80 }}>
                        <div className="w-16 rounded-t bg-blue-400 opacity-70"
                          style={{ height: `${(minV / maxV) * 100}%`, minHeight: 4 }} />
                      </div>
                      <p className="text-xs text-blue-600 font-medium">ขั้นต่ำตามสัญญา</p>
                    </div>
                    {/* จริง */}
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <p className="text-xs text-slate-500 font-medium">
                        {r.actual && r.is_confirmed ? fmt(actV, 2) + ' บาท' : 'ไม่มีข้อมูล'}
                      </p>
                      <div className="w-full flex items-end justify-center" style={{ height: 80 }}>
                        {r.actual ? (
                          <div className={`w-16 rounded-t ${r.is_confirmed ? 'bg-emerald-500 opacity-85' : 'bg-slate-300'}`}
                            style={{ height: `${(actV / maxV) * 100}%`, minHeight: 4 }} />
                        ) : (
                          <div className="w-16 h-1 bg-slate-200 rounded" />
                        )}
                      </div>
                      <p className={`text-xs font-medium ${r.is_confirmed ? 'text-emerald-600' : 'text-slate-400'}`}>
                        ผลตอบแทนจริง{!r.is_confirmed ? ' (รอยืนยัน)' : ''}
                      </p>
                    </div>
                    {/* ส่วนต่าง */}
                    {diff !== null && (
                      <div className="flex flex-col items-center justify-center gap-1 flex-1">
                        <p className="text-xs text-slate-500">ส่วนต่าง</p>
                        <p className={`text-2xl font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {diff >= 0 ? '+' : ''}{(diff / 1e6).toFixed(3)} ล.
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${diff >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {diff >= 0 ? 'สูงกว่าขั้นต่ำ' : 'ต่ำกว่าขั้นต่ำ'}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })()
            ) : (
              /* กรณีดูทุกปี — SVG line chart (สะสม) */
              (() => {
                const W = 700, H = 200, PL = 52, PR = 16, PT = 20, PB = 36
                const innerW = W - PL - PR
                const innerH = H - PT - PB

                // คำนวณยอดสะสม
                let cumMin = 0, cumAct = 0
                const cumulData = annualData.map(r => {
                  cumMin += Number(r.min_benefit)
                  const hasActual = r.actual !== null && r.is_confirmed
                  if (hasActual) cumAct += Number(r.actual)
                  return { ...r, cumMin, cumAct: hasActual ? cumAct : null }
                })

                const maxV = Math.max(...cumulData.map(r => Math.max(r.cumMin, r.cumAct ?? 0)), 1)
                const xOf  = (i) => PL + (i / (cumulData.length - 1)) * innerW
                const yOf  = (v) => PT + innerH - (v / maxV) * innerH

                // helper format ล้านบาท + comma
                const fmtM = (v) => {
                  if (v === null || v === undefined) return '—'
                  const m = v / 1e6
                  return m.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ล.บ.'
                }

                // เส้น min
                const minPoints = cumulData.map((r, i) => `${xOf(i)},${yOf(r.cumMin)}`).join(' ')

                // เส้นจริง — segments
                const actualSegments = []
                let seg = []
                cumulData.forEach((r, i) => {
                  if (r.cumAct !== null) {
                    seg.push([xOf(i), yOf(r.cumAct)])
                  } else {
                    if (seg.length >= 1) actualSegments.push(seg)
                    seg = []
                  }
                })
                if (seg.length >= 1) actualSegments.push(seg)

                // จุดล่าสุดของข้อมูลจริง
                const lastActualRow = [...cumulData].reverse().find(r => r.cumAct !== null)
                const lastActualIdx = lastActualRow ? cumulData.indexOf(lastActualRow) : -1

                // แกน X — แสดงปี พ.ศ. ทุก 5 ปีสัญญา (start_be)
                const xLabels = cumulData.filter((r, i) => i % 5 === 0 || i === 29)

                // grid lines แนวนอน
                const gridCount = 5
                const gridLines = Array.from({ length: gridCount }, (_, k) => {
                  const f = (k + 1) / gridCount
                  return { y: yOf(maxV * f), val: maxV * f }
                })

                return (
                  <div className="w-full overflow-x-auto">
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 480 }}>

                      {/* grid lines */}
                      {gridLines.map((g, i) => (
                        <g key={i}>
                          <line x1={PL} y1={g.y} x2={W - PR} y2={g.y}
                            stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,3" />
                          <text x={PL - 4} y={g.y + 3} fontSize="8.5" fill="#94a3b8" textAnchor="end">
                            {(g.val / 1e6).toLocaleString('th-TH', { maximumFractionDigits: 0 })} ล.
                          </text>
                        </g>
                      ))}

                      {/* แกน X baseline */}
                      <line x1={PL} y1={PT + innerH} x2={W - PR} y2={PT + innerH}
                        stroke="#e2e8f0" strokeWidth="1" />

                      {/* เส้นขั้นต่ำสะสม */}
                      <polyline points={minPoints} fill="none"
                        stroke="#60a5fa" strokeWidth="2" strokeOpacity="0.85" />

                      {/* เส้นจริงสะสม */}
                      {actualSegments.map((pts, si) => (
                        <polyline key={si}
                          points={pts.map(p => `${p[0]},${p[1]}`).join(' ')}
                          fill="none" stroke="#10b981" strokeWidth="2.5" strokeOpacity="0.9" />
                      ))}

                      {/* จุดบนเส้นจริง + tooltip */}
                      {cumulData.map((r, i) => {
                        if (r.cumAct === null) return null
                        const isLast = i === lastActualIdx
                        const diff = r.cumAct - r.cumMin
                        const pct  = r.cumMin > 0 ? (diff / r.cumMin * 100) : 0
                        const tipLines = [
                          `ปีสัญญาที่ ${r.year_no}  (มี.ค.${r.start_be} – ก.พ.${r.start_be + 1})`,
                          `ขั้นต่ำสะสม: ${fmtM(r.cumMin)}`,
                          `จริงสะสม:   ${fmtM(r.cumAct)}`,
                          `ส่วนต่าง:    ${diff >= 0 ? '+' : ''}${fmtM(diff)}`,
                          `(${diff >= 0 ? 'สูงกว่า' : 'ต่ำกว่า'}ขั้นต่ำ ${Math.abs(pct).toFixed(1)}%)`,
                        ].join('\n')
                        return (
                          <g key={i}>
                            <circle cx={xOf(i)} cy={yOf(r.cumAct)}
                              r={isLast ? 5 : 3.5}
                              fill={isLast ? '#059669' : '#10b981'}
                              stroke="white" strokeWidth={isLast ? 2 : 1.5}>
                              <title>{tipLines}</title>
                            </circle>
                            {/* ป้าย "ล่าสุด" */}
                            {isLast && (
                              <g>
                                <rect x={xOf(i) - 22} y={yOf(r.cumAct) - 22}
                                  width="44" height="14" rx="4"
                                  fill="#059669" opacity="0.9" />
                                <text x={xOf(i)} y={yOf(r.cumAct) - 12}
                                  fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">
                                  ล่าสุด
                                </text>
                              </g>
                            )}
                          </g>
                        )
                      })}

                      {/* จุดบนเส้นขั้นต่ำ + tooltip */}
                      {cumulData.map((r, i) => {
                        const diff   = r.cumAct !== null ? r.cumAct - r.cumMin : null
                        const pct    = diff !== null && r.cumMin > 0 ? (diff / r.cumMin * 100) : null
                        const tipLines = [
                          `ปีสัญญาที่ ${r.year_no}  (มี.ค.${r.start_be} – ก.พ.${r.start_be + 1})`,
                          `ขั้นต่ำสะสม: ${fmtM(r.cumMin)}`,
                          r.cumAct !== null
                            ? `จริงสะสม:   ${fmtM(r.cumAct)}\nส่วนต่าง:    ${diff >= 0 ? '+' : ''}${fmtM(diff)}\n(${diff >= 0 ? 'สูงกว่า' : 'ต่ำกว่า'}ขั้นต่ำ ${Math.abs(pct).toFixed(1)}%)`
                            : 'ยังไม่มีข้อมูลจริง',
                        ].join('\n')
                        return (
                          <circle key={i} cx={xOf(i)} cy={yOf(r.cumMin)} r="2.5"
                            fill="#60a5fa" stroke="white" strokeWidth="1">
                            <title>{tipLines}</title>
                          </circle>
                        )
                      })}

                      {/* แกน X — ปี พ.ศ. ทุก 5 ปีสัญญา */}
                      {xLabels.map((r) => {
                        const idx = cumulData.indexOf(r)
                        return (
                          <g key={idx}>
                            <line x1={xOf(idx)} y1={PT + innerH} x2={xOf(idx)} y2={PT + innerH + 4}
                              stroke="#cbd5e1" strokeWidth="1" />
                            <text x={xOf(idx)} y={H - 14}
                              fontSize="8.5" fill="#64748b" textAnchor="middle">
                              {r.start_be}
                            </text>
                            <text x={xOf(idx)} y={H - 4}
                              fontSize="7.5" fill="#94a3b8" textAnchor="middle">
                              ปีที่ {r.year_no}
                            </text>
                          </g>
                        )
                      })}
                    </svg>
                  </div>
                )
              })()
            )}
          </div>

          {/* Annual table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">
                {selectedYearNo ? `รายละเอียด — ${overviewLabel}` : 'ตารางรายปีตลอดอายุสัญญา 30 ปี'}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['ปีที่','ช่วงเวลา (มี.ค.–ก.พ.)','ขั้นต่ำ (บาท)','จริง (บาท)','ส่วนต่าง','หมายเหตุ'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAnnual.map(r => {
                    const diff = r.actual !== null && r.is_confirmed ? Number(r.actual) - Number(r.min_benefit) : null
                    const isSelected = r.year_no === selectedYearNo
                    return (
                      <tr key={r.id}
                        onClick={() => setSelectedYearNo(r.year_no === selectedYearNo ? null : r.year_no)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50' : r.actual === null ? 'opacity-50 hover:bg-slate-50' : 'hover:bg-slate-50'
                        }`}>
                        <td className="px-4 py-2.5 font-medium text-slate-700">{r.year_no}</td>
                        <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                          มี.ค.{r.start_be} – ก.พ.{r.start_be + 1}
                        </td>
                        <td className="px-4 py-2.5 text-right text-blue-700 font-medium whitespace-nowrap">{fmt(r.min_benefit, 2)}</td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          {r.actual !== null ? (
                            <span className={r.is_confirmed ? 'text-emerald-700 font-medium' : 'text-slate-400 italic'}>
                              {fmt(r.actual, 2)}
                              {!r.is_confirmed && <span className="ml-1 text-[10px]">(รอยืนยัน)</span>}
                            </span>
                          ) : <span className="text-slate-300">ไม่มีข้อมูล</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          {diff !== null ? (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${diff >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
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
            {!selectedYearNo && (
              <p className="text-[11px] text-slate-400 px-5 py-2 border-t border-slate-100">
                คลิกที่แถวเพื่อดูรายละเอียดปีสัญญานั้น
              </p>
            )}
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

      {/* ── รายละเอียดรายเดือน ──────────────────────────── */}
      {subTab === 'monthly' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-slate-600 font-medium whitespace-nowrap">ปีสัญญา:</span>
            <select
              value={selMonthlyYearNo ?? ''}
              onChange={e => setMonthlyYearNo(Number(e.target.value))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700
                         focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[300px]"
            >
              {monthlyYearNos.map(yn => {
                const row = annualData.find(r => r.year_no === yn)
                return (
                  <option key={yn} value={yn}>
                    ปีที่ {yn}{row ? ` — มี.ค.${row.start_be} – ก.พ.${row.start_be + 1}` : ''}
                  </option>
                )
              })}
            </select>
          </div>

          {monthlyRows.length === 0 ? (
            <div className="flex items-center justify-center h-40 bg-white rounded-xl border border-slate-200">
              <p className="text-slate-400 text-sm">ไม่มีข้อมูลรายเดือนสำหรับ{monthlyContractLabel}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500 mb-1">รายได้รวม — {monthlyContractLabel}</p>
                  <p className="text-xl font-semibold text-slate-800">{fmt(monthlyTotal, 2)}</p>
                  <p className="text-xs text-slate-400 mt-1">บาท</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500 mb-1">จำนวนเดือนที่มีข้อมูล</p>
                  <p className="text-xl font-semibold text-slate-800">{monthlyRows.length}</p>
                  <p className="text-xs text-slate-400 mt-1">เดือน</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500 mb-1">เฉลี่ยต่อเดือน</p>
                  <p className="text-xl font-semibold text-slate-800">{fmt(monthlyTotal / monthlyRows.length, 2)}</p>
                  <p className="text-xs text-slate-400 mt-1">บาท/เดือน</p>
                </div>
              </div>

              {/* mini bar chart */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-sm font-medium text-slate-700 mb-3">
                  กราฟรายเดือน — {monthlyContractLabel}
                </p>
                <div className="flex items-end gap-1 h-20">
                  {monthlyRows.map((r, i) => {
                    const maxA = Math.max(...monthlyRows.map(x => Number(x.amount)))
                    const h = (Number(r.amount) / maxA) * 100
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div style={{ height: `${h}%`, minHeight: 2 }}
                          className="w-full rounded-t bg-emerald-500 opacity-80"
                          title={`${MONTHS_TH[r.month]} ${r.year_be}: ${fmt(r.amount, 2)} บาท`} />
                        <span className="text-[9px] text-slate-400 whitespace-nowrap">
                          {MONTHS_TH[r.month]}{String(r.year_be).slice(2)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {['เดือน (มี.ค.–ก.พ.)','ผลตอบแทน (บาท)','ยอดสะสม (บาท)','เลขที่อ้างอิง'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        let cumul = 0
                        return monthlyRows.map((r, i) => {
                          cumul += Number(r.amount)
                          return (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-slate-700 font-medium">
                                {MONTHS_TH[r.month]} {r.year_be}
                              </td>
                              <td className="px-4 py-3 text-right text-emerald-700 font-medium">{fmt(r.amount, 2)}</td>
                              <td className="px-4 py-3 text-right text-slate-600">{fmt(cumul, 2)}</td>
                              <td className="px-4 py-3 text-slate-400 text-xs">{r.ref_doc || '—'}</td>
                            </tr>
                          )
                        })
                      })()}
                      <tr className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                        <td className="px-4 py-3 text-slate-700">รวม</td>
                        <td className="px-4 py-3 text-right text-slate-800">{fmt(monthlyTotal, 2)}</td>
                        <td className="px-4 py-3 text-right text-slate-400">—</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── จัดการข้อมูล ──────────────────────────────── */}
      {subTab === 'manage' && (
        <div className="space-y-5">

          {/* Import Excel */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-medium text-slate-700">นำเข้าข้อมูลจาก Excel</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  ข้อมูลจะบันทึกลง Supabase — ทุกคนที่เข้าระบบเห็นข้อมูลเดียวกัน
                </p>
              </div>
              <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm
                               font-medium px-4 py-2 rounded-lg cursor-pointer transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                นำเข้า Excel
                <input type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
              </label>
            </div>
            <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 text-xs text-blue-700">
              สำหรับ import ข้อมูลชุดใหญ่ครั้งแรก กรุณาใช้ไฟล์ <strong>supabase_lease_returns.sql</strong> รันใน Supabase → SQL Editor แทนครับ
            </div>
          </div>

          {/* เพิ่มข้อมูลรายเดือน */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-700">เพิ่มข้อมูลผลตอบแทนรายเดือน</p>
              <button onClick={() => setAddMonthlyModal(true)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                เพิ่มรายเดือน
              </button>
            </div>
            <p className="text-xs text-slate-400">ข้อมูลที่เพิ่มจะบันทึกลง Supabase ทันที และอัปเดตในทุกเครื่องที่เปิดระบบ</p>
          </div>

          {/* แก้ไขผลตอบแทนจริงรายปี */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-700">แก้ไขข้อมูลผลตอบแทนจริงรายปี</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['ปีที่','ช่วงเวลา','ขั้นต่ำ (บาท)','จริง (บาท)','สถานะ','หมายเหตุ','จัดการ'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {annualData.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-700">{r.year_no}</td>
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">มี.ค.{r.start_be}–ก.พ.{r.start_be+1}</td>
                      <td className="px-4 py-2.5 text-right text-blue-700 font-medium whitespace-nowrap">{fmt(r.min_benefit, 2)}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        {r.actual !== null
                          ? <span className="text-emerald-700 font-medium">{fmt(r.actual, 2)}</span>
                          : <span className="text-slate-300">ไม่มีข้อมูล</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          r.is_confirmed ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {r.is_confirmed ? 'ยืนยันแล้ว' : 'รอยืนยัน'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 max-w-xs truncate">{r.note || '—'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1.5">
                          <button onClick={() => { setEditModal(r); setEditForm({ actual: r.actual ?? '', note: r.note ?? '' }) }}
                            className="text-xs px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100">
                            แก้ไข
                          </button>
                          {r.actual !== null && (
                            <button onClick={() => setDeleteConfirm(r.id)}
                              className="text-xs px-2.5 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50">
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

      {/* ── Modal แก้ไขรายปี ──────────────────────────── */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-1">แก้ไขผลตอบแทนจริง — ปีที่ {editModal.year_no}</h3>
            <p className="text-xs text-slate-400 mb-5">มี.ค.{editModal.start_be} – ก.พ.{editModal.start_be+1}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">ผลตอบแทนจริง (บาท) — เว้นว่างถ้ายังไม่มีข้อมูล</label>
                <input type="number" step="any" value={editForm.actual}
                  onChange={e => setEditForm(f => ({ ...f, actual: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">หมายเหตุ</label>
                <input type="text" value={editForm.note}
                  onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditModal(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600">ยกเลิก</button>
              <button onClick={saveAnnualEdit} disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
                {saving ? 'กำลังบันทึก...' : 'บันทึกลง Supabase'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal เพิ่มรายเดือน ───────────────────────── */}
      {addMonthlyModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-5">เพิ่มผลตอบแทนรายเดือน</h3>
            <div className="space-y-3">
              {[
                ['year_no',  'ปีที่สัญญา (เช่น 25)',         'number'],
                ['year_be',  'ปี พ.ศ. (เช่น 2568)',          'number'],
                ['month',    'เดือน (1–12)',                  'number'],
                ['amount',   'จำนวนเงิน (บาท)',               'number'],
                ['ref_doc',  'เลขที่อ้างอิง (ไม่บังคับ)',     'text'],
                ['note',     'หมายเหตุ (ไม่บังคับ)',          'text'],
              ].map(([key, label, type]) => (
                <div key={key}>
                  <label className="block text-xs text-slate-500 mb-1">{label}</label>
                  <input type={type} step="any" value={addMonthlyForm[key]}
                    onChange={e => setAddMonthlyForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setAddMonthlyModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600">ยกเลิก</button>
              <button onClick={saveAddMonthly} disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50">
                {saving ? 'กำลังบันทึก...' : 'บันทึกลง Supabase'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal ยืนยันลบ ────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-medium text-slate-800 mb-2">ยืนยันการลบข้อมูลจริง</h3>
            <p className="text-sm text-slate-500 mb-5">ข้อมูลผลตอบแทนจริงจะถูกลบออกจาก Supabase ไม่สามารถกู้คืนได้</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600">ยกเลิก</button>
              <button onClick={() => deleteActual(deleteConfirm)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium">ลบ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────
export default function Operations() {
  const [activeTab, setActiveTab] = useState('monthly')

  const tabs = [
    { id: 'monthly', label: 'ผลประโยชน์รายเดือน' },
    { id: 'returns', label: 'ผลตอบแทนสิทธิบริหาร' },
  ]

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-800">สัญญาให้สิทธิเช่าบริหารและดำเนินกิจการ</h1>
        <p className="text-sm text-slate-500 mt-0.5">ผลประโยชน์รายเดือน และผลตอบแทนสิทธิบริหารตลอดอายุสัญญา</p>
      </div>

      {/* Tab nav */}
      <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs w-fit">
        {tabs.map((t, i) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 transition-colors ${i > 0 ? 'border-l border-slate-200' : ''} ${
              activeTab === t.id ? 'bg-blue-900 text-white font-medium' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'monthly' && <TabMonthly />}
      {activeTab === 'returns' && <TabReturns />}
    </div>
  )
}
