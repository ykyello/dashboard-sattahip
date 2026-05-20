import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const MONTHS_TH = [
  '', 'ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.',
  'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.'
]

const FISCAL_YEARS = [2568, 2567, 2566, 2565]

export default function Dashboard() {
  const [fiscalYear, setFiscalYear] = useState(2568)
  const [operations, setOperations] = useState([])
  const [waterSales, setWaterSales] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [fiscalYear])

  async function fetchAll() {
    setLoading(true)
    const [opsRes, wsRes, projRes] = await Promise.all([
      supabase.from('operation_records').select('*').eq('fiscal_year', fiscalYear).order('month'),
      supabase.from('water_sales').select('*').eq('fiscal_year', fiscalYear).order('month'),
      supabase.from('investment_projects').select('*'),
    ])
    setOperations(opsRes.data || [])
    setWaterSales(wsRes.data || [])
    setProjects(projRes.data || [])
    setLoading(false)
  }

  const latestOp = operations.length > 0 ? operations[operations.length - 1] : null
  const totalRevenue = operations.reduce((s, r) => s + (Number(r.revenue) || 0), 0)
  const totalBenefit = operations.reduce((s, r) => s + (Number(r.actual_benefit) || 0), 0)
  const totalMinBenefit = operations.reduce((s, r) => s + (Number(r.min_benefit) || 0), 0)
  const totalWaterSales = waterSales.reduce((s, r) => s + (Number(r.total_value) || 0), 0)
  const lossRateData = operations.filter(r => r.loss_rate != null)
  const avgLossRate = lossRateData.length > 0
    ? lossRateData.reduce((s, r) => s + Number(r.loss_rate), 0) / lossRateData.length
    : null
  const activeProjects = projects.filter(p => p.status === 'active').length
  const completedProjects = projects.filter(p => p.status === 'completed').length

  const kpiCards = [
    {
      label: 'ผู้ใช้น้ำล่าสุด',
      value: latestOp?.user_count ? latestOp.user_count.toLocaleString() : '-',
      unit: 'ราย',
      bg: 'bg-white border-slate-200',
      text: 'text-slate-800',
    },
    {
      label: 'รายได้รวมสะสม',
      value: totalRevenue > 0 ? (totalRevenue / 1000000).toFixed(2) : '-',
      unit: 'ล้านบาท',
      bg: 'bg-white border-slate-200',
      text: 'text-slate-800',
    },
    {
      label: 'ผลประโยชน์ตอบแทนสะสม',
      value: totalBenefit > 0 ? (totalBenefit / 1000000).toFixed(2) : '-',
      unit: 'ล้านบาท',
      bg: totalBenefit >= totalMinBenefit && totalBenefit > 0 ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200',
      text: totalBenefit >= totalMinBenefit && totalBenefit > 0 ? 'text-green-700' : 'text-slate-800',
    },
    {
      label: 'มูลค่าขายน้ำสะสม',
      value: totalWaterSales > 0 ? (totalWaterSales / 1000000).toFixed(2) : '-',
      unit: 'ล้านบาท',
      bg: 'bg-white border-slate-200',
      text: 'text-slate-800',
    },
    {
      label: 'อัตราน้ำสูญเสียเฉลี่ย',
      value: avgLossRate != null ? avgLossRate.toFixed(1) + '%' : '-',
      unit: 'ต่อเดือน',
      bg: avgLossRate != null && avgLossRate < 20
        ? 'bg-green-50 border-green-200'
        : avgLossRate != null
        ? 'bg-red-50 border-red-200'
        : 'bg-white border-slate-200',
      text: avgLossRate != null && avgLossRate < 20
        ? 'text-green-700'
        : avgLossRate != null
        ? 'text-red-700'
        : 'text-slate-800',
    },
    {
      label: 'โครงการลงทุน',
      value: projects.length,
      unit: `ดำเนินการ ${activeProjects} | แล้วเสร็จ ${completedProjects}`,
      bg: 'bg-white border-slate-200',
      text: 'text-slate-800',
    },
  ]

  return (
    <div className="space-y-5">

      {/* Year filter */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">ข้อมูลปีงบประมาณ</p>
        <select
          value={fiscalYear}
          onChange={e => setFiscalYear(Number(e.target.value))}
          className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {FISCAL_YEARS.map(y => (
            <option key={y} value={y}>ปีงบประมาณ {y}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-60">
          <p className="text-slate-400 text-sm">กำลังโหลดข้อมูล...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {kpiCards.map((card, i) => (
              <div key={i} className={`rounded-xl p-4 border ${card.bg}`}>
                <p className="text-xs text-slate-500 mb-1">{card.label}</p>
                <p className={`text-2xl font-medium ${card.text}`}>{card.value}</p>
                <p className="text-xs text-slate-400 mt-1">{card.unit}</p>
              </div>
            ))}
          </div>

          {/* Benefit status banner */}
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
                  ได้รับจริง {(totalBenefit / 1000000).toFixed(2)} ล้านบาท
                  {' '}vs ขั้นต่ำ {(totalMinBenefit / 1000000).toFixed(2)} ล้านบาท
                </p>
              </div>
              <span className={`text-lg font-medium ${
                totalBenefit >= totalMinBenefit ? 'text-green-700' : 'text-red-700'
              }`}>
                {totalBenefit >= totalMinBenefit ? '+' : ''}
                {((totalBenefit - totalMinBenefit) / 1000000).toFixed(2)} ล้าน
              </span>
            </div>
          )}

          {/* Monthly summary table */}
          {operations.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-medium text-slate-700">
                  สรุปรายเดือน ปีงบประมาณ {fiscalYear}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-500">
                      <th className="px-4 py-3 text-left font-medium">เดือน</th>
                      <th className="px-4 py-3 text-right font-medium">ผู้ใช้น้ำ</th>
                      <th className="px-4 py-3 text-right font-medium">รายได้ (บาท)</th>
                      <th className="px-4 py-3 text-right font-medium">สูญเสีย%</th>
                      <th className="px-4 py-3 text-right font-medium">ผลประโยชน์ฯ</th>
                      <th className="px-4 py-3 text-center font-medium">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {operations.map(r => {
                      const over = r.actual_benefit != null
                        && r.min_benefit != null
                        && Number(r.actual_benefit) >= Number(r.min_benefit)
                      return (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-slate-700 font-medium">
                            {MONTHS_TH[r.month]}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {r.user_count?.toLocaleString() ?? '-'}
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
                                over
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
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

          {operations.length === 0 && waterSales.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 bg-white rounded-xl border border-slate-200 gap-2">
              <p className="text-slate-400 text-sm">
                ยังไม่มีข้อมูลในปีงบประมาณ {fiscalYear}
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
