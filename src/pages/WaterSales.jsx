import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { supabase } from '../lib/supabase'
import {
  getPattayaSaleContractYearRange,
  getCurrentPattayaSaleContractYearNo,
  getPattayaSaleContractLabel,
  getPattayaSaleContractPeriodKeys,
} from '../lib/contractUtils'

const WATER_YEAR_OPTIONS = getPattayaSaleContractYearRange()
const MONTHS_TH = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

function daysInMonth(buddhistYear, month) {
  const ceYear = buddhistYear - 543
  return new Date(ceYear, month, 0).getDate()
}

const MIN_RATE = 18000

function fmt(v, decimal = 0) {
  if (v === null || v === undefined) return '—'
  return Number(v).toLocaleString('th-TH', { maximumFractionDigits: decimal })
}

// ─────────────────────────────────────────────────────────
// TAB 1: ปริมาณน้ำ & ผลตอบแทน
// ─────────────────────────────────────────────────────────
function TabVolume({ waterYearNo }) {
  const [rows,      setRows]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editRow,   setEditRow]   = useState(null)
  const [form,      setForm]      = useState({})
  const [saving,    setSaving]    = useState(false)
  const [toast,     setToast]     = useState(null)
  const [unitPrice, setUnitPrice] = useState(null)

  async function loadRows() {
    setLoading(true)
    const keys    = getPattayaSaleContractPeriodKeys(waterYearNo)
    const yearSet = [...new Set(keys.map(k => k.fiscal_year))]
    const keySet  = new Set(keys.map(k => `${k.fiscal_year}-${k.month}`))
    const { data } = await supabase
      .from('annual_report_data')
      .select('id, year, month, pattaya_vol, rev_pattaya, benefit')
      .in('year', yearSet).order('year').order('month')
    const filtered = (data || []).filter(r => keySet.has(`${r.year}-${r.month}`))
    const withMin = filtered.map(r => {
      const days   = daysInMonth(r.year, r.month)
      const minVol = MIN_RATE * days
      const actual = r.pattaya_vol !== null ? Number(r.pattaya_vol) : null
      const diff   = actual !== null ? actual - minVol : null
      return { ...r, days, minVol, actual, diff }
    })
    setRows(withMin)
    setLoading(false)
  }

  async function loadUnitPrice() {
    const { data } = await supabase
      .from('water_unit_price')
      .select('unit_price, note')
      .eq('contract_year', waterYearNo)
      .maybeSingle()
    setUnitPrice(data ?? null)
  }

  useEffect(() => { loadRows(); loadUnitPrice() }, [waterYearNo])

  function openEdit(r) {
    setEditRow(r)
    setForm({ pattaya_vol: r.pattaya_vol ?? '', rev_pattaya: r.rev_pattaya ?? '', benefit: r.benefit ?? '' })
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const n = v => v !== '' ? Number(v) : null
    const { error } = await supabase
      .from('annual_report_data')
      .update({ pattaya_vol: n(form.pattaya_vol), rev_pattaya: n(form.rev_pattaya), benefit: n(form.benefit) })
      .eq('id', editRow.id)
    setSaving(false)
    setShowModal(false)
    if (!error) { setToast('บันทึกสำเร็จ'); setTimeout(() => setToast(null), 2500); loadRows() }
  }

  const totalMinVol  = rows.reduce((s, r) => s + r.minVol, 0)
  const totalVol     = rows.reduce((s, r) => s + (Number(r.pattaya_vol) || 0), 0)
  const totalRevenue = rows.reduce((s, r) => s + (Number(r.rev_pattaya) || 0), 0)
  const totalBenefit = rows.reduce((s, r) => s + (Number(r.benefit)     || 0), 0)
  const totalDiff    = totalVol - totalMinVol
  const overAll      = totalDiff >= 0
  const label = getPattayaSaleContractLabel(waterYearNo)

  if (loading) return <div className="flex items-center justify-center h-40"><p className="text-slate-400 text-sm">กำลังโหลด...</p></div>

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
                        bg-green-50 border border-green-200 text-green-700 flex items-center gap-2">
          ✓ {toast}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">ปริมาณขั้นต่ำรวม</p>
          <p className="text-xl font-medium text-slate-600">{fmt(totalMinVol)}</p>
          <p className="text-xs text-slate-400 mt-1">ลบ.ม. · {MIN_RATE.toLocaleString()}/วัน</p>
        </div>
        <div className={`rounded-xl border p-4 ${overAll ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-xs text-slate-500 mb-1">ปริมาณน้ำจริงรวม</p>
          <p className={`text-xl font-medium ${overAll ? 'text-green-700' : 'text-red-700'}`}>{fmt(totalVol)}</p>
          <p className="text-xs text-slate-400 mt-1">ลบ.ม.</p>
        </div>
        <div className={`rounded-xl border p-4 ${overAll ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-xs text-slate-500 mb-1">ส่วนต่างสะสม</p>
          <p className={`text-xl font-medium ${overAll ? 'text-green-700' : 'text-red-700'}`}>
            {totalDiff >= 0 ? '+' : ''}{fmt(totalDiff)}
          </p>
          <p className="text-xs text-slate-400 mt-1">ลบ.ม.</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">ค่าน้ำรวม</p>
          <p className="text-xl font-medium text-slate-800">{fmt(totalRevenue, 2)}</p>
          <p className="text-xs text-slate-400 mt-1">บาท</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">ราคาค่าน้ำปัจจุบัน</p>
          {unitPrice ? (
            <>
              <p className="text-xl font-medium text-blue-700">{fmt(unitPrice.unit_price, 4)}</p>
              <p className="text-xs text-slate-400 mt-1">บาท/ลบ.ม.{unitPrice.note ? ` · ${unitPrice.note}` : ''}</p>
            </>
          ) : (
            <>
              <p className="text-xl font-medium text-slate-300">—</p>
              <p className="text-xs text-slate-300 mt-1">ยังไม่ได้กำหนดราคา</p>
            </>
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">ผลตอบแทน 0.01 รวม</p>
          <p className="text-xl font-medium text-slate-800">{fmt(totalBenefit, 2)}</p>
          <p className="text-xs text-slate-400 mt-1">บาท</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 bg-white rounded-xl border border-slate-200 gap-2">
          <p className="text-slate-400 text-sm">ยังไม่มีข้อมูล {label}</p>
          <p className="text-slate-300 text-xs">กรอกข้อมูลผ่านเมนู บันทึกผลดำเนินงาน</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">{label}</p>
            <p className="text-xs text-slate-400">กดปุ่ม แก้ไข ที่แถวเพื่อบันทึกข้อมูล</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['เดือน','วัน','ขั้นต่ำ (ลบ.ม.)','จริง (ลบ.ม.)','ส่วนต่าง','ค่าน้ำ (บาท)','ผลตอบแทน 0.01 (บาท)',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => {
                  const over = r.diff !== null && r.diff >= 0
                  return (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">{MONTHS_TH[r.month]} {r.year}</td>
                      <td className="px-4 py-3 text-center text-slate-500">{r.days}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{fmt(r.minVol)}</td>
                      <td className="px-4 py-3 text-right text-slate-700 font-medium">
                        {r.actual !== null ? fmt(r.actual) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.diff !== null ? (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${over ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {r.diff >= 0 ? '+' : ''}{fmt(r.diff)}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmt(r.rev_pattaya, 2)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmt(r.benefit, 2)}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => openEdit(r)}
                          className="text-xs px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 whitespace-nowrap">
                          แก้ไข
                        </button>
                      </td>
                    </tr>
                  )
                })}
                <tr className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                  <td className="px-4 py-3 text-slate-700" colSpan={2}>รวม</td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmt(totalMinVol)}</td>
                  <td className="px-4 py-3 text-right text-slate-800">{fmt(totalVol)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${overAll ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {totalDiff >= 0 ? '+' : ''}{fmt(totalDiff)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-800">{fmt(totalRevenue, 2)}</td>
                  <td className="px-4 py-3 text-right text-slate-800">{fmt(totalBenefit, 2)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && editRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-1">แก้ไขข้อมูล</h3>
            <p className="text-xs text-slate-400 mb-5">{MONTHS_TH[editRow.month]} {editRow.year}</p>
            <div className="space-y-4">
              {[['pattaya_vol','ปริมาณน้ำ (ลบ.ม.)'],['rev_pattaya','ค่าน้ำ (บาท)'],['benefit','ผลตอบแทน 0.01 (บาท)']].map(([key, lbl]) => (
                <div key={key}>
                  <label className="block text-xs text-slate-500 mb-1">{lbl}</label>
                  <input type="number" step="any" value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">ยกเลิก</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// TAB 2: ราคาค่าน้ำรายปีสัญญา
// ─────────────────────────────────────────────────────────
function TabUnitPrice() {
  const [rows,      setRows]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form,      setForm]      = useState({ contract_year: '', unit_price: '', note: '' })
  const [editId,    setEditId]    = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [delId,     setDelId]     = useState(null)

  useEffect(() => { fetchRows() }, [])

  async function fetchRows() {
    setLoading(true)
    const { data } = await supabase.from('water_unit_price').select('*').order('contract_year', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }

  function openAdd() { setForm({ contract_year: '', unit_price: '', note: '' }); setEditId(null); setShowModal(true) }
  function openEdit(r) {
    setForm({ contract_year: r.contract_year ?? r.year ?? '', unit_price: r.unit_price, note: r.note || '' })
    setEditId(r.id); setShowModal(true)
  }

  async function handleSave() {
    if (!form.contract_year || !form.unit_price) return
    setSaving(true)
    const payload = { contract_year: Number(form.contract_year), unit_price: Number(form.unit_price), note: form.note || null }
    if (editId) { await supabase.from('water_unit_price').update(payload).eq('id', editId) }
    else        { await supabase.from('water_unit_price').insert(payload) }
    setSaving(false); setShowModal(false); fetchRows()
  }

  async function handleDelete(id) {
    await supabase.from('water_unit_price').delete().eq('id', id)
    setDelId(null); fetchRows()
  }

  if (loading) return <div className="flex items-center justify-center h-40"><p className="text-slate-400 text-sm">กำลังโหลด...</p></div>

  const chartData = [...rows]
    .sort((a, b) => (a.contract_year ?? a.year) - (b.contract_year ?? b.year))
    .map(r => ({ label: `ปีที่ ${r.contract_year ?? r.year}`, price: Number(r.unit_price) }))

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow text-xs">
        <p className="text-slate-500 mb-0.5">{label}</p>
        <p className="font-semibold text-blue-700">{Number(payload[0].value).toFixed(4)} บาท/ลบ.ม.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm font-medium text-slate-700 mb-4">แนวโน้มราคาค่าน้ำ (บาท/ลบ.ม.)</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => v.toFixed(2)} width={52} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">ราคาค่าน้ำต่อหน่วย (บาท/ลบ.ม.) แยกตามปีสัญญา</p>
        <button onClick={openAdd} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">+ เพิ่มราคา</button>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 bg-white rounded-xl border border-slate-200 gap-2">
          <p className="text-slate-400 text-sm">ยังไม่มีข้อมูลราคาค่าน้ำ</p>
          <p className="text-slate-300 text-xs">กดปุ่ม + เพิ่มราคา เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['ปีสัญญา','ช่วงสัญญา','ราคา (บาท/ลบ.ม.)','หมายเหตุ','จัดการ'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(r => {
                const yn = r.contract_year ?? r.year
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">ปีที่ {yn}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {yn ? getPattayaSaleContractLabel(yn).replace('สัญญา','').trim() : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-semibold">{fmt(r.unit_price, 4)}</td>
                    <td className="px-4 py-3 text-slate-500">{r.note || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(r)} className="text-xs px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100">แก้ไข</button>
                        <button onClick={() => setDelId(r.id)} className="text-xs px-2.5 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50">ลบ</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-5">{editId ? 'แก้ไขราคาค่าน้ำ' : 'เพิ่มราคาค่าน้ำ'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">ปีสัญญา</label>
                <select value={form.contract_year} onChange={e => setForm(f => ({ ...f, contract_year: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">เลือกปีสัญญา</option>
                  {WATER_YEAR_OPTIONS.map(yn => <option key={yn} value={yn}>{getPattayaSaleContractLabel(yn)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">ราคาค่าน้ำ (บาท/ลบ.ม.)</label>
                <input type="number" step="any" value={form.unit_price}
                  onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))}
                  placeholder="เช่น 18.7500"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">หมายเหตุ (ไม่บังคับ)</label>
                <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">ยกเลิก</button>
              <button onClick={handleSave} disabled={saving || !form.contract_year || !form.unit_price}
                className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
                {saving ? 'กำลังบันทึก...' : editId ? 'บันทึกการแก้ไข' : 'เพิ่มราคา'}
              </button>
            </div>
          </div>
        </div>
      )}

      {delId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-medium text-slate-800 mb-2">ยืนยันการลบ</h3>
            <p className="text-sm text-slate-500 mb-5">ข้อมูลที่ลบแล้วไม่สามารถกู้คืนได้</p>
            <div className="flex gap-3">
              <button onClick={() => setDelId(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600">ยกเลิก</button>
              <button onClick={() => handleDelete(delId)} className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium">ลบ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// TAB 3: ส่วนลดค่าน้ำ
// ─────────────────────────────────────────────────────────
function TabDiscount() {
  const [rows,      setRows]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form,      setForm]      = useState({ contract_year: '', volume_over: '', discount_amount: '', note: '' })
  const [editId,    setEditId]    = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [delId,     setDelId]     = useState(null)

  useEffect(() => { fetchRows() }, [])

  async function fetchRows() {
    setLoading(true)
    const { data } = await supabase.from('water_volume_discount').select('*').order('contract_year', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }

  function openAdd() {
    setForm({ contract_year: '', volume_over: '', discount_amount: '', note: '' })
    setEditId(null); setShowModal(true)
  }

  function openEdit(r) {
    setForm({ contract_year: r.contract_year, volume_over: r.volume_over ?? '', discount_amount: r.discount_amount ?? '', note: r.note || '' })
    setEditId(r.id); setShowModal(true)
  }

  async function handleSave() {
    if (!form.contract_year) return
    setSaving(true)
    const n = v => v !== '' ? Number(v) : null
    const payload = { contract_year: Number(form.contract_year), cal_year: new Date().getFullYear() + 543, volume_over: n(form.volume_over), discount_amount: n(form.discount_amount), note: form.note || null }
    if (editId) { await supabase.from('water_volume_discount').update(payload).eq('id', editId) }
    else        { await supabase.from('water_volume_discount').insert(payload) }
    setSaving(false); setShowModal(false); fetchRows()
  }

  async function handleDelete(id) {
    await supabase.from('water_volume_discount').delete().eq('id', id)
    setDelId(null); fetchRows()
  }

  if (loading) return <div className="flex items-center justify-center h-40"><p className="text-slate-400 text-sm">กำลังโหลด...</p></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">ส่วนลดกรณีซื้อน้ำเกินปริมาณขั้นต่ำตามสัญญา (ปีละ 1 ครั้ง)</p>
        <button onClick={openAdd} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">+ เพิ่มส่วนลด</button>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 bg-white rounded-xl border border-slate-200 gap-2">
          <p className="text-slate-400 text-sm">ยังไม่มีข้อมูลส่วนลด</p>
          <p className="text-slate-300 text-xs">กดปุ่ม + เพิ่มส่วนลด เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">ปีสัญญา</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">ปริมาณที่ซื้อเกิน (ลบ.ม.)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">จำนวนเงิน (บาท)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">หมายเหตุ</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700 font-medium">
                    ปีที่ {r.contract_year}
                    <span className="block text-xs text-slate-400 font-normal">{getPattayaSaleContractLabel(r.contract_year).replace('สัญญาปีที่ ' + r.contract_year + ' ', '')}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmt(r.volume_over)}</td>
                  <td className="px-4 py-3 text-right text-emerald-700 font-medium">{fmt(r.discount_amount, 2)}</td>
                  <td className="px-4 py-3 text-slate-500">{r.note || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => openEdit(r)} className="text-xs px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100">แก้ไข</button>
                      <button onClick={() => setDelId(r.id)} className="text-xs px-2.5 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50">ลบ</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-5">{editId ? 'แก้ไขส่วนลด' : 'เพิ่มส่วนลด'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">ปีสัญญา</label>
                <select value={form.contract_year} onChange={e => setForm(f => ({ ...f, contract_year: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">เลือกปีสัญญา</option>
                  {WATER_YEAR_OPTIONS.map(y => <option key={y} value={y}>ปีที่ {y} · {getPattayaSaleContractLabel(y)}</option>)}
                </select>
              </div>
              {[['volume_over','ปริมาณที่ซื้อเกิน (ลบ.ม.)'],['discount_amount','จำนวนเงินส่วนลด (บาท)']].map(([key, lbl]) => (
                <div key={key}>
                  <label className="block text-xs text-slate-500 mb-1">{lbl}</label>
                  <input type="number" step="any" value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-slate-500 mb-1">หมายเหตุ</label>
                <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600">ยกเลิก</button>
              <button onClick={handleSave} disabled={saving || !form.contract_year}
                className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
                {saving ? 'กำลังบันทึก...' : editId ? 'บันทึกการแก้ไข' : 'เพิ่มส่วนลด'}
              </button>
            </div>
          </div>
        </div>
      )}

      {delId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-medium text-slate-800 mb-2">ยืนยันการลบ</h3>
            <p className="text-sm text-slate-500 mb-5">ข้อมูลที่ลบแล้วไม่สามารถกู้คืนได้</p>
            <div className="flex gap-3">
              <button onClick={() => setDelId(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600">ยกเลิก</button>
              <button onClick={() => handleDelete(delId)} className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium">ลบ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// TAB 4: ข้อมูล DMA
// ─────────────────────────────────────────────────────────

const DMA_COLORS = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#84cc16','#ec4899','#6366f1',
]

const MONTHS_TH_FULL = [
  '','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
]

// current year/month (พ.ศ.)
const NOW_YEAR  = new Date().getFullYear() + 543
const NOW_MONTH = new Date().getMonth() + 1
const YEAR_OPTS = Array.from({ length: NOW_YEAR - 2563 }, (_, i) => NOW_YEAR - i)

function TabDMA() {
  // ── state: ข้อมูล DMA (รายพื้นที่) ──
  const [zones,     setZones]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId,    setEditId]    = useState(null)
  const [form,      setForm]      = useState({ dma_name: '', users_count: '', note: '' })
  const [saving,    setSaving]    = useState(false)
  const [delId,     setDelId]     = useState(null)
  const [toast,     setToast]     = useState(null)

  // ── state: ข้อมูลรายเดือน ──
  const [selYear,    setSelYear]    = useState(NOW_YEAR)
  const [selMonth,   setSelMonth]   = useState(NOW_MONTH)
  const [monthly,    setMonthly]    = useState([])   // dma_monthly_data rows
  const [mLoading,   setMLoading]   = useState(false)
  const [showMModal, setShowMModal] = useState(false)
  const [mEditId,    setMEditId]    = useState(null)
  const [mForm,      setMForm]      = useState({ dma_zone_id: '', vol_supply: '', vol_sold: '', revenue: '', note: '' })
  const [mSaving,    setMSaving]    = useState(false)
  const [mDelId,     setMDelId]     = useState(null)

  useEffect(() => { fetchZones() }, [])
  useEffect(() => { fetchMonthly() }, [selYear, selMonth])

  async function fetchZones() {
    setLoading(true)
    const { data } = await supabase.from('dma_zones').select('*').order('dma_name')
    setZones(data || [])
    setLoading(false)
  }

  async function fetchMonthly() {
    setMLoading(true)
    const { data } = await supabase
      .from('dma_monthly_data')
      .select('*, dma_zones(dma_name)')
      .eq('year', selYear)
      .eq('month', selMonth)
      .order('dma_zones(dma_name)')
    setMonthly(data || [])
    setMLoading(false)
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 2500)
  }

  // ── CRUD zones ──
  const emptyZoneForm = { dma_name: '', users_count: '', note: '' }

  function openAddZone() { setForm(emptyZoneForm); setEditId(null); setShowModal(true) }
  function openEditZone(z) {
    setForm({ dma_name: z.dma_name, users_count: z.users_count ?? '', note: z.note ?? '' })
    setEditId(z.id); setShowModal(true)
  }

  async function handleSaveZone() {
    if (!form.dma_name.trim()) return
    setSaving(true)
    const payload = {
      dma_name:    form.dma_name.trim(),
      users_count: form.users_count !== '' ? Number(form.users_count) : null,
      note:        form.note || null,
    }
    let error
    if (editId) { ;({ error } = await supabase.from('dma_zones').update(payload).eq('id', editId)) }
    else        { ;({ error } = await supabase.from('dma_zones').insert(payload)) }
    setSaving(false); setShowModal(false)
    if (error) showToast(`บันทึกไม่สำเร็จ: ${error.message}`, 'error')
    else { showToast('บันทึกสำเร็จ'); fetchZones() }
  }

  async function handleDeleteZone(id) {
    await supabase.from('dma_zones').delete().eq('id', id)
    setDelId(null); showToast('ลบสำเร็จ'); fetchZones()
  }

  // ── CRUD monthly ──
  const emptyMForm = { dma_zone_id: '', vol_supply: '', vol_sold: '', revenue: '', note: '' }

  function openAddMonthly() { setMForm(emptyMForm); setMEditId(null); setShowMModal(true) }
  function openEditMonthly(r) {
    setMForm({
      dma_zone_id: r.dma_zone_id,
      vol_supply:  r.vol_supply  ?? '',
      vol_sold:    r.vol_sold    ?? '',
      revenue:     r.revenue     ?? '',
      note:        r.note        ?? '',
    })
    setMEditId(r.id); setShowMModal(true)
  }

  async function handleSaveMonthly() {
    if (!mForm.dma_zone_id) return
    setMSaving(true)
    const n = v => v !== '' ? Number(v) : null
    const payload = {
      dma_zone_id: mForm.dma_zone_id,
      year:        selYear,
      month:       selMonth,
      vol_supply:  n(mForm.vol_supply),
      vol_sold:    n(mForm.vol_sold),
      revenue:     n(mForm.revenue),
      note:        mForm.note || null,
    }
    let error
    if (mEditId) { ;({ error } = await supabase.from('dma_monthly_data').update(payload).eq('id', mEditId)) }
    else         { ;({ error } = await supabase.from('dma_monthly_data').insert(payload)) }
    setMSaving(false); setShowMModal(false)
    if (error) showToast(`บันทึกไม่สำเร็จ: ${error.message}`, 'error')
    else { showToast('บันทึกสำเร็จ'); fetchMonthly() }
  }

  async function handleDeleteMonthly(id) {
    await supabase.from('dma_monthly_data').delete().eq('id', id)
    setMDelId(null); showToast('ลบสำเร็จ'); fetchMonthly()
  }

  // Export CSV (รายเดือน)
  function exportCSV() {
    const header = ['DMA','ปริมาณน้ำจ่าย (ลบ.ม.)','ปริมาณน้ำจำหน่าย (ลบ.ม.)','รายได้ค่าน้ำ (บาท)','หมายเหตุ']
    const csvRows = monthlyWithZone.map(r => [
      r.dma_name, r.vol_supply ?? '', r.vol_sold ?? '', r.revenue ?? '', r.note ?? ''
    ])
    const csv  = [header, ...csvRows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url
    a.download = `DMA_${selYear}_${String(selMonth).padStart(2,'0')}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  // KPI ข้อมูล zone รวม
  const totalUsers  = zones.reduce((s, z) => s + (Number(z.users_count) || 0), 0)

  // join monthly กับ zone name
  const zoneMap = Object.fromEntries(zones.map(z => [z.id, z.dma_name]))
  const monthlyWithZone = monthly.map(r => ({
    ...r,
    dma_name: r.dma_zones?.dma_name ?? zoneMap[r.dma_zone_id] ?? '—',
  }))

  // KPI รายเดือน
  const mTotalSupply  = monthlyWithZone.reduce((s, r) => s + (Number(r.vol_supply) || 0), 0)
  const mTotalSold    = monthlyWithZone.reduce((s, r) => s + (Number(r.vol_sold)   || 0), 0)
  const mTotalRevenue = monthlyWithZone.reduce((s, r) => s + (Number(r.revenue)    || 0), 0)

  // DMA ที่ยังไม่มีข้อมูลรายเดือน
  const recordedIds  = new Set(monthly.map(r => r.dma_zone_id))
  const unrecorded   = zones.filter(z => !recordedIds.has(z.id))

  if (loading) return <div className="flex items-center justify-center h-40"><p className="text-slate-400 text-sm">กำลังโหลด...</p></div>

  return (
    <div className="space-y-5">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          {toast.type === 'error' ? '⚠' : '✓'} {toast.msg}
        </div>
      )}

      {/* ── ส่วน A: รายการ DMA (ข้อมูลทั่วไป) ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">รายการ DMA</p>
            <p className="text-xs text-slate-400 mt-0.5">จำนวน {zones.length} พื้นที่ · ผู้ใช้น้ำรวม {fmt(totalUsers)} ราย</p>
          </div>
          <button onClick={openAddZone}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            เพิ่ม DMA
          </button>
        </div>

        {zones.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-28 gap-2">
            <p className="text-slate-400 text-sm">ยังไม่มีข้อมูล DMA</p>
            <button onClick={openAddZone} className="text-blue-600 text-sm underline">เพิ่ม DMA แรก</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['DMA','ผู้ใช้น้ำ (ราย)','หมายเหตุ','จัดการ'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {zones.map((z, idx) => (
                  <tr key={z.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: DMA_COLORS[idx % DMA_COLORS.length] }} />
                        {z.dma_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {z.users_count != null ? fmt(z.users_count) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{z.note || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEditZone(z)} className="text-xs px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100">แก้ไข</button>
                        <button onClick={() => setDelId(z.id)} className="text-xs px-2.5 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50">ลบ</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── ส่วน B: ข้อมูลรายเดือน ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Header + ตัวเลือกปี/เดือน */}
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">ปริมาณน้ำและรายได้รายเดือน</p>
              <p className="text-xs text-slate-400 mt-0.5">แยกตาม DMA แต่ละพื้นที่</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {YEAR_OPTS.map(y => <option key={y} value={y}>พ.ศ. {y}</option>)}
              </select>
              <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {MONTHS_TH_FULL.slice(1).map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button onClick={exportCSV}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  Export
                </button>
                <button onClick={openAddMonthly}
                  disabled={zones.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-40 whitespace-nowrap">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  บันทึกข้อมูล
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* KPI summary รายเดือน */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
          {[
            { label: 'ปริมาณน้ำจ่าย',    value: mTotalSupply  > 0 ? fmt(mTotalSupply)        : '—', unit: 'ลบ.ม.', color: 'text-sky-700' },
            { label: 'ปริมาณน้ำจำหน่าย', value: mTotalSold    > 0 ? fmt(mTotalSold)          : '—', unit: 'ลบ.ม.', color: 'text-teal-700' },
            { label: 'รายได้ค่าน้ำ',      value: mTotalRevenue > 0 ? fmt(mTotalRevenue, 2)    : '—', unit: 'บาท',   color: 'text-emerald-700' },
          ].map((c, i) => (
            <div key={i} className="px-5 py-3 text-center">
              <p className="text-xs text-slate-500">{c.label}</p>
              <p className={`text-base font-semibold mt-0.5 ${c.color}`}>{c.value}</p>
              <p className="text-xs text-slate-400">{c.unit}</p>
            </div>
          ))}
        </div>

        {/* แจ้งเตือน DMA ที่ยังไม่มีข้อมูล */}
        {zones.length > 0 && unrecorded.length > 0 && (
          <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
            <span className="text-amber-500 text-xs">⚠</span>
            <p className="text-xs text-amber-700">
              ยังไม่มีข้อมูลเดือนนี้: <span className="font-medium">{unrecorded.map(z => z.dma_name).join(', ')}</span>
            </p>
          </div>
        )}

        {/* ตารางรายเดือน */}
        {mLoading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-slate-400 text-sm">กำลังโหลด...</p>
          </div>
        ) : monthlyWithZone.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <p className="text-slate-400 text-sm">ยังไม่มีข้อมูล {MONTHS_TH_FULL[selMonth]} {selYear}</p>
            {zones.length > 0 && (
              <button onClick={openAddMonthly} className="text-blue-600 text-sm underline">กดบันทึกข้อมูล</button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['DMA','ปริมาณน้ำจ่าย (ลบ.ม.)','ปริมาณน้ำจำหน่าย (ลบ.ม.)','รายได้ค่าน้ำ (บาท)','หมายเหตุ','จัดการ'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyWithZone.map((r, idx) => {
                  const zIdx = zones.findIndex(z => z.id === r.dma_zone_id)
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: DMA_COLORS[zIdx >= 0 ? zIdx % DMA_COLORS.length : idx % DMA_COLORS.length] }} />
                          {r.dma_name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {r.vol_supply != null ? fmt(r.vol_supply) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {r.vol_sold != null ? fmt(r.vol_sold) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {r.revenue != null ? fmt(r.revenue, 2) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate">{r.note || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEditMonthly(r)}
                            className="text-xs px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100">แก้ไข</button>
                          <button onClick={() => setMDelId(r.id)}
                            className="text-xs px-2.5 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50">ลบ</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {/* แถวรวม */}
                <tr className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                  <td className="px-4 py-3 text-slate-700">รวม ({monthlyWithZone.length} พื้นที่)</td>
                  <td className="px-4 py-3 text-right text-slate-800">{mTotalSupply  > 0 ? fmt(mTotalSupply)     : '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-800">{mTotalSold    > 0 ? fmt(mTotalSold)       : '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-800">{mTotalRevenue > 0 ? fmt(mTotalRevenue, 2) : '—'}</td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal เพิ่ม/แก้ไข DMA zone ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-slate-800">{editId ? 'แก้ไข DMA' : 'เพิ่ม DMA ใหม่'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">ชื่อ DMA *</label>
                <input type="text" value={form.dma_name}
                  onChange={e => setForm(f => ({ ...f, dma_name: e.target.value }))}
                  placeholder="เช่น MM-21, DMA-01"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">จำนวนผู้ใช้น้ำ (ราย)</label>
                <input type="number" step="1" value={form.users_count}
                  onChange={e => setForm(f => ({ ...f, users_count: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">หมายเหตุ</label>
                <input type="text" value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">ยกเลิก</button>
              <button onClick={handleSaveZone} disabled={saving || !form.dma_name.trim()}
                className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
                {saving ? 'กำลังบันทึก...' : editId ? 'บันทึกการแก้ไข' : 'เพิ่ม DMA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal ยืนยันลบ DMA zone ── */}
      {delId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-medium text-slate-800 mb-2">ยืนยันการลบ DMA</h3>
            <p className="text-sm text-slate-500 mb-5">ข้อมูลที่ลบแล้วไม่สามารถกู้คืนได้</p>
            <div className="flex gap-3">
              <button onClick={() => setDelId(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600">ยกเลิก</button>
              <button onClick={() => handleDeleteZone(delId)} className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium">ลบ</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal บันทึกข้อมูลรายเดือน ── */}
      {showMModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-slate-800">{mEditId ? 'แก้ไขข้อมูล' : 'บันทึกข้อมูล'}</h3>
              <button onClick={() => setShowMModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-5">{MONTHS_TH_FULL[selMonth]} {selYear}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">DMA *</label>
                <select value={mForm.dma_zone_id}
                  onChange={e => setMForm(f => ({ ...f, dma_zone_id: e.target.value }))}
                  disabled={!!mEditId}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50">
                  <option value="">เลือก DMA</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.dma_name}</option>)}
                </select>
              </div>
              {[
                ['vol_supply', 'ปริมาณน้ำจ่าย (ลบ.ม.)'],
                ['vol_sold',   'ปริมาณน้ำจำหน่าย (ลบ.ม.)'],
                ['revenue',    'รายได้ค่าน้ำ (บาท)'],
              ].map(([key, lbl]) => (
                <div key={key}>
                  <label className="block text-xs text-slate-500 mb-1">{lbl}</label>
                  <input type="number" step="any" value={mForm[key]}
                    onChange={e => setMForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-slate-500 mb-1">หมายเหตุ</label>
                <input type="text" value={mForm.note}
                  onChange={e => setMForm(f => ({ ...f, note: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowMModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">ยกเลิก</button>
              <button onClick={handleSaveMonthly} disabled={mSaving || !mForm.dma_zone_id}
                className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
                {mSaving ? 'กำลังบันทึก...' : mEditId ? 'บันทึกการแก้ไข' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal ยืนยันลบ monthly ── */}
      {mDelId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-medium text-slate-800 mb-2">ยืนยันการลบ</h3>
            <p className="text-sm text-slate-500 mb-5">ข้อมูลที่ลบแล้วไม่สามารถกู้คืนได้</p>
            <div className="flex gap-3">
              <button onClick={() => setMDelId(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600">ยกเลิก</button>
              <button onClick={() => handleDeleteMonthly(mDelId)} className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium">ลบ</button>
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
export default function WaterSales() {
  const [activeTab,   setActiveTab]   = useState('volume')
  const [waterYearNo, setWaterYearNo] = useState(getCurrentPattayaSaleContractYearNo)

  const tabs = [
    { id: 'volume',   label: 'ปริมาณน้ำ & ผลตอบแทน' },
    { id: 'price',    label: 'ราคาค่าน้ำ' },
    { id: 'discount', label: 'ส่วนลดค่าน้ำ 30%' },
    { id: 'dma',      label: 'พื้นที่รับน้ำจากประปาสัตหีบ' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">สัญญาซื้อขายน้ำประปา กปภ.สาขาพัทยา</h1>
          <p className="text-sm text-slate-500 mt-0.5">ปริมาณน้ำ · ราคาค่าน้ำ · ส่วนลด · DMA</p>
        </div>
        {activeTab === 'volume' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 font-medium whitespace-nowrap">ปีสัญญา:</span>
            <select value={waterYearNo} onChange={e => setWaterYearNo(Number(e.target.value))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white
                         text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[280px]">
              {WATER_YEAR_OPTIONS.map(yn => (
                <option key={yn} value={yn}>{getPattayaSaleContractLabel(yn)}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab nav */}
      <div className="flex flex-wrap rounded-lg border border-slate-200 overflow-hidden text-xs w-fit">
        {tabs.map((t, i) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 transition-colors ${i > 0 ? 'border-l border-slate-200' : ''} ${
              activeTab === t.id
                ? 'bg-blue-600 text-white font-medium'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'volume'   && <TabVolume   waterYearNo={waterYearNo} />}
      {activeTab === 'price'    && <TabUnitPrice />}
      {activeTab === 'discount' && <TabDiscount />}
      {activeTab === 'dma'      && <TabDMA />}
    </div>
  )
}
