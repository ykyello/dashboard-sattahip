import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  // Fiscal
  getFiscalYearRange,
  getCurrentFiscalYear,
  // Lease contract
  getLeaseContractYearRange,
  getCurrentLeaseContractYearNo,
  getLeaseContractLabel,
  getLeaseContractPeriodKeys,
  // Water contract
  getPattayaSaleContractYearRange,
  getCurrentPattayaSaleContractYearNo,
  getPattayaSaleContractLabel,
  getPattayaSaleContractPeriodKeys,
  getPattayaSaleContractStartYear,
  getLeaseContractStartYear,
  // Helpers
  filterByPeriodKeys,
  MONTHS_TH_SHORT,
  LEASE_CONTRACT_START_YEAR,
  WATER_CONTRACT_START_YEAR,
} from '../lib/contractUtils'

// ── dropdown ปีงบประมาณ: generate dynamic จากปีปัจจุบัน ──
const FISCAL_YEAR_NOW  = getCurrentFiscalYear()
const FISCAL_YEARS     = getFiscalYearRange(FISCAL_YEAR_NOW, 6)  // 6 ปีย้อนหลัง

// ── dropdown ปีสัญญา: generate จากช่วงสัญญาทั้งหมด ────────
const LEASE_YEAR_OPTIONS = getLeaseContractYearRange()   // ปีที่ 1–30 เรียงใหม่→เก่า
const WATER_YEAR_OPTIONS = getPattayaSaleContractYearRange() // ปีที่ 1–30

export default function Dashboard() {
  // ── mode: 'fiscal' | 'lease_contract' ─────────────────
  const [yearMode,    setYearMode]    = useState('fiscal')

  // ── fiscal year state ──────────────────────────────────
  const [fiscalYear,  setFiscalYear]  = useState(FISCAL_YEAR_NOW)

  // ── lease contract year state ──────────────────────────
  const [leaseYearNo, setLeaseYearNo] = useState(getCurrentLeaseContractYearNo)

  // ── raw data (fetch once) ──────────────────────────────
  const [allOperations, setAllOperations] = useState([])
  const [allWaterSales, setAllWaterSales] = useState([])
  const [projects,      setProjects]      = useState([])
  const [loading,       setLoading]       = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [opsRes, wsRes, projRes] = await Promise.all([
      supabase.from('operation_records').select('*').order('fiscal_year').order('month'),
      supabase.from('water_sales').select('*').order('fiscal_year').order('month'),
      supabase.from('investment_projects').select('*'),
    ])
    setAllOperations(opsRes.data || [])
    setAllWaterSales(wsRes.data  || [])
    setProjects(projRes.data     || [])
    setLoading(false)
  }

  // ── กรองข้อมูล operations ตาม mode ────────────────────
  const operations = (() => {
    if (yearMode === 'fiscal') {
      return allOperations.filter(r => r.fiscal_year === fiscalYear)
    }
    // lease_contract mode: รอบ มี.ค.–ก.พ.
    return filterByPeriodKeys(allOperations, getLeaseContractPeriodKeys(leaseYearNo))
  })()

  // ── คำนวณ water yearNo ที่สอดคล้องกับ mode ────────────
  // fiscal mode: ปีงบ BY ครอบคลุม ต.ค.(BY-1)–ก.ย.(BY)
  //   → รอบน้ำที่ overlap มากที่สุดคือ พ.ย.(BY-1)–ต.ค.(BY) = waterYearNo ของ BY-1
  // lease_contract mode: lease ปีที่ N เริ่ม มี.ค. startBY
  //   → รอบน้ำที่ overlap คือ พ.ย.(startBY-1)–ต.ค.(startBY)
  const waterYearNo = (() => {
    if (yearMode === 'fiscal') {
      const startBY = fiscalYear - 1   // รอบน้ำที่ครอบปีงบนี้มากที่สุด
      return startBY - WATER_CONTRACT_START_YEAR + 1
    }
    const leaseStartBY = getLeaseContractStartYear(leaseYearNo)
    const waterStartBY = leaseStartBY - 1
    return waterStartBY - WATER_CONTRACT_START_YEAR + 1
  })()

  const waterSales = filterByPeriodKeys(
    allWaterSales,
    getPattayaSaleContractPeriodKeys(Math.max(waterYearNo, 1))
  )

  // ── period label สำหรับแสดงในหน้า ─────────────────────
  const periodLabel = yearMode === 'fiscal'
    ? `ปีงบประมาณ ${fiscalYear}`
    : getLeaseContractLabel(leaseYearNo)

  const waterPeriodLabel = getPattayaSaleContractLabel(Math.max(waterYearNo, 1))

  // ── KPI ────────────────────────────────────────────────
  const totalRevenue    = operations.reduce((s, r) => s + (Number(r.revenue)        || 0), 0)
  const totalBenefit    = operations.reduce((s, r) => s + (Number(r.actual_benefit) || 0), 0)
  const totalMinBenefit = operations.reduce((s, r) => s + (Number(r.min_benefit)    || 0), 0)
  const totalWaterValue = waterSales.reduce((s, r)  => s + (Number(r.total_revenue) || 0), 0)

  const lossRates = operations.filter(r => r.loss_rate != null)
  const avgLossRate = lossRates.length > 0
    ? lossRates.reduce((s, r) => s + Number(r.loss_rate), 0) / lossRates.length
    : null

  const activeProjects    = projects.filter(p => p.status === 'active').length
  const completedProjects = projects.filter(p => p.status === 'completed').length

  const kpiCards = [
    {
      label: 'รายได้สะสม',
      value: totalRevenue > 0 ? (totalRevenue / 1000000).toFixed(2) : '-',
      unit:  'ล้านบาท',
      bg:    'bg-white border-slate-200',
      text:  'text-slate-800',
    },
    {
      label:    'มูลค่าขายน้ำสะสม',
      sublabel: waterPeriodLabel,
      value:    totalWaterValue > 0 ? (totalWaterValue / 1000000).toFixed(2) : '-',
      unit:     'ล้านบาท',
      bg:       'bg-white border-slate-200',
      text:     'text-slate-800',
    },
    {
      label: 'อัตราน้ำสูญเสียเฉลี่ย',
      value: avgLossRate != null ? avgLossRate.toFixed(1) + '%' : '-',
      unit:  'ต่อเดือน',
      bg:    avgLossRate != null && avgLossRate < 20
        ? 'bg-green-50 border-green-200'
        : avgLossRate != null
        ? 'bg-red-50 border-red-200'
        : 'bg-white border-slate-200',
      text:  avgLossRate != null && avgLossRate < 20
        ? 'text-green-700'
        : avgLossRate != null
        ? 'text-red-700'
        : 'text-slate-800',
    },
    {
      label: 'โครงการลงทุน',
      value: projects.length,
      unit:  `ดำเนินการ ${activeProjects} | แล้วเสร็จ ${completedProjects}`,
      bg:    'bg-white border-slate-200',
      text:  'text-slate-800',
    },
  ]

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Year filter ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <p className="text-sm text-slate-500">เลือกช่วงเวลาแสดงผล</p>

        <div className="flex items-center gap-2 flex-wrap">

          {/* Toggle mode */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
            <button
              onClick={() => setYearMode('fiscal')}
              className={`px-3 py-2 transition-colors ${
                yearMode === 'fiscal'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              ปีงบประมาณ
            </button>
            <button
              onClick={() => setYearMode('lease_contract')}
              className={`px-3 py-2 border-l border-slate-200 transition-colors ${
                yearMode === 'lease_contract'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              ปีตามสัญญา
            </button>
          </div>

          {/* ── Dropdown ปีงบประมาณ ── */}
          {yearMode === 'fiscal' ? (
            <select
              value={fiscalYear}
              onChange={e => setFiscalYear(Number(e.target.value))}
              className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white
                         text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {FISCAL_YEARS.map(y => (
                <option key={y} value={y}>ปีงบประมาณ {y}</option>
              ))}
            </select>
          ) : (
            /* ── Dropdown ปีสัญญาเช่าบริหาร ── */
            <select
              value={leaseYearNo}
              onChange={e => setLeaseYearNo(Number(e.target.value))}
              className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white
                         text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                         min-w-[280px]"
            >
              {LEASE_YEAR_OPTIONS.map(yn => (
                <option key={yn} value={yn}>{getLeaseContractLabel(yn)}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-60">
          <p className="text-slate-400 text-sm">กำลังโหลดข้อมูล...</p>
        </div>
      ) : (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((card, i) => (
              <div key={i} className={`rounded-xl p-4 border ${card.bg}`}>
                <p className="text-xs text-slate-500 mb-0.5">{card.label}</p>
                {card.sublabel && (
                  <p className="text-[10px] text-slate-400 mb-1">{card.sublabel}</p>
                )}
                <p className={`text-2xl font-medium ${card.text}`}>{card.value}</p>
                <p className="text-xs text-slate-400 mt-1">{card.unit}</p>
              </div>
            ))}
          </div>

          {/* ── Benefit banner ── */}
          {totalBenefit > 0 && (
            <div className={`rounded-xl p-4 border flex items-center justify-between ${
              totalBenefit >= totalMinBenefit
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div>
                <p className={`text-sm font-medium ${
                  totalBenefit >= totalMinBenefit ? 'text-green-700' : 'text-red-700'
                }`}>
                  {totalBenefit >= totalMinBenefit
                    ? '✓ ผลประโยชน์ตอบแทนรวมสูงกว่าขั้นต่ำตามสัญญา'
                    : '⚠ ผลประโยชน์ตอบแทนรวมต่ำกว่าขั้นต่ำตามสัญญา'}
                </p>
                <p className={`text-xs mt-0.5 ${
                  totalBenefit >= totalMinBenefit ? 'text-green-600' : 'text-red-600'
                }`}>
                  จริง {totalBenefit.toLocaleString()} บาท
                  {' / '}
                  ขั้นต่ำ {totalMinBenefit.toLocaleString()} บาท
                </p>
              </div>
            </div>
          )}

          {/* ── ตาราง operations ── */}
          {operations.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-700">
                  สัญญาเช่าบริหาร — {periodLabel}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">เดือน</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">รายได้</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">สูญเสียน้ำ</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">ผลตอบแทน</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wide">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {operations.map(r => {
                      const over = Number(r.actual_benefit) >= Number(r.min_benefit)
                      return (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-700">
                            {MONTHS_TH_SHORT[r.month]} {r.fiscal_year}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {r.revenue ? Number(r.revenue).toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={Number(r.loss_rate) < 20 ? 'text-green-600' : 'text-red-600'}>
                              {r.loss_rate != null ? `${r.loss_rate}%` : '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {r.actual_benefit ? Number(r.actual_benefit).toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {r.benefit_status ? (
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                over ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {r.benefit_status}
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── ตาราง water sales ── */}
          {waterSales.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-700">
                  ขายน้ำ กปภ.พัทยา — {waterPeriodLabel}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">เดือน</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">ปริมาณขาย</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">รายได้รวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {waterSales.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-700">
                          {MONTHS_TH_SHORT[r.month]} {r.fiscal_year}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {r.volume_sold ? Number(r.volume_sold).toLocaleString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {r.total_revenue ? Number(r.total_revenue).toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Empty state ── */}
          {operations.length === 0 && waterSales.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40
                            bg-white rounded-xl border border-slate-200 gap-2">
              <p className="text-slate-400 text-sm">
                ยังไม่มีข้อมูลใน{periodLabel}
              </p>
              <p className="text-slate-300 text-xs">
                เริ่มเพิ่มข้อมูลได้จากเมนูด้านซ้าย
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
