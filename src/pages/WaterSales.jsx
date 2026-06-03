import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  getPattayaSaleContractYearRange,
  getCurrentPattayaSaleContractYearNo,
  getPattayaSaleContractLabel,
  getPattayaSaleContractPeriodKeys,
  getPattayaSaleContractStartYear,
} from '../lib/contractUtils'

const WATER_YEAR_OPTIONS = getPattayaSaleContractYearRange()
const MONTHS_TH = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

// วันในเดือนตาม พ.ศ. (แปลงเป็น ค.ศ. ก่อน)
function daysInMonth(buddhistYear, month) {
  const ceYear = buddhistYear - 543
  return new Date(ceYear, month, 0).getDate()  // month ไม่ต้อง -1 เพราะ Date ใช้ 0-index เดือนถัดไป
}

const MIN_RATE = 18000  // ลบ.ม./วัน

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
    // เติม minVol และ diff ให้แต่ละแถว
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

  useEffect(() => {
    loadRows()
    loadUnitPrice()
  }, [waterYearNo])

  function openEdit(r) {
    setEditRow(r)
    setForm({
      pattaya_vol: r.pattaya_vol ?? '',
      rev_pattaya: r.rev_pattaya ?? '',
      benefit:     r.benefit     ?? '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const n = v => v !== '' ? Number(v) : null
    const { error } = await supabase
      .from('annual_report_data')
      .update({
        pattaya_vol: n(form.pattaya_vol),
        rev_pattaya: n(form.rev_pattaya),
        benefit:     n(form.benefit),
      })
      .eq('id', editRow.id)
    setSaving(false)
    setShowModal(false)
    if (!error) {
      setToast('บันทึกสำเร็จ')
      setTimeout(() => setToast(null), 2500)
      loadRows()
    }
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

      {/* KPI cards — 5 cards: ขั้นต่ำ, จริง, ส่วนต่าง, ค่าน้ำ, ราคา, ผลตอบแทน */}
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
          <p className="text-xs text-slate-500 mb-1">ราคาค่าน้ำปีสัญญานี้</p>
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
                  <th className="px-4 py-3 text-left   text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">เดือน</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">วัน</th>
                  <th className="px-4 py-3 text-right  text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">ขั้นต่ำ (ลบ.ม.)</th>
                  <th className="px-4 py-3 text-right  text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">จริง (ลบ.ม.)</th>
                  <th className="px-4 py-3 text-right  text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">ส่วนต่าง</th>
                  <th className="px-4 py-3 text-right  text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">ค่าน้ำ (บาท)</th>
                  <th className="px-4 py-3 text-right  text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">ผลตอบแทน 0.01 (บาท)</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap"></th>
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
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          over ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {r.diff >= 0 ? '+' : ''}{fmt(r.diff)}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{fmt(r.rev_pattaya, 2)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{fmt(r.benefit, 2)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openEdit(r)}
                        className="text-xs px-2.5 py-1 rounded-md border border-slate-200
                                   text-slate-600 hover:bg-slate-100 whitespace-nowrap">
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
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      overAll ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
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

      {/* Modal แก้ไขรายเดือน */}
      {showModal && editRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-1">แก้ไขข้อมูล</h3>
            <p className="text-xs text-slate-400 mb-5">{MONTHS_TH[editRow.month]} {editRow.year}</p>
            <div className="space-y-4">
              {[
                ['pattaya_vol', 'ปริมาณน้ำ (ลบ.ม.)'],
                ['rev_pattaya', 'ค่าน้ำ (บาท)'],
                ['benefit',     'ผลตอบแทน 0.01 (บาท)'],
              ].map(([key, lbl]) => (
                <div key={key}>
                  <label className="block text-xs text-slate-500 mb-1">{lbl}</label>
                  <input type="number" step="any" value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                ยกเลิก
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700
                           text-white text-sm font-medium disabled:opacity-50">
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
    const { data } = await supabase
      .from('water_unit_price')
      .select('*')
      .order('contract_year', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }

  function openAdd() {
    setForm({ contract_year: '', unit_price: '', note: '' })
    setEditId(null)
    setShowModal(true)
  }

  function openEdit(r) {
    setForm({ contract_year: r.contract_year ?? r.year ?? '', unit_price: r.unit_price, note: r.note || '' })
    setEditId(r.id)
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.contract_year || !form.unit_price) return
    setSaving(true)
    const payload = {
      contract_year: Number(form.contract_year),
      unit_price:    Number(form.unit_price),
      note:          form.note || null,
    }
    if (editId) {
      await supabase.from('water_unit_price').update(payload).eq('id', editId)
    } else {
      await supabase.from('water_unit_price').insert(payload)
    }
    setSaving(false)
    setShowModal(false)
    fetchRows()
  }

  async function handleDelete(id) {
    await supabase.from('water_unit_price').delete().eq('id', id)
    setDelId(null)
    fetchRows()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <p className="text-slate-400 text-sm">กำลังโหลด...</p>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">ราคาค่าน้ำต่อหน่วย (บาท/ลบ.ม.) แยกตามปีสัญญา</p>
        <button onClick={openAdd} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">
          + เพิ่มราคา
        </button>
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
                {['ปีสัญญา', 'ช่วงสัญญา', 'ราคา (บาท/ลบ.ม.)','หมายเหตุ','จัดการ'].map(h => (
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

      {/* Modal เพิ่ม/แก้ไข */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-5">
              {editId ? 'แก้ไขราคาค่าน้ำ' : 'เพิ่มราคาค่าน้ำ'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">ปีสัญญา</label>
                <select
                  value={form.contract_year}
                  onChange={e => setForm(f => ({ ...f, contract_year: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">เลือกปีสัญญา</option>
                  {WATER_YEAR_OPTIONS.map(yn => (
                    <option key={yn} value={yn}>{getPattayaSaleContractLabel(yn)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">ราคาค่าน้ำ (บาท/ลบ.ม.)</label>
                <input
                  type="number" step="any" value={form.unit_price}
                  onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))}
                  placeholder="เช่น 18.7500"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">หมายเหตุ (ไม่บังคับ)</label>
                <input
                  type="text" value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.contract_year || !form.unit_price}
                className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
              >
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
// TAB 4: ส่วนลดปริมาณน้ำ
// ─────────────────────────────────────────────────────────
function TabDiscount() {
  const [rows,      setRows]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form,      setForm]      = useState({ contract_year: '', volume_over: '', discount_rate: '', discount_amount: '', note: '' })
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
    setForm({ contract_year: '', volume_over: '', discount_rate: '', discount_amount: '', note: '' })
    setEditId(null)
    setShowModal(true)
  }

  function openEdit(r) {
    setForm({
      contract_year:   r.contract_year,
      volume_over:     r.volume_over     ?? '',
      discount_rate:   r.discount_rate   ?? '',
      discount_amount: r.discount_amount ?? '',
      note:            r.note            || '',
    })
    setEditId(r.id)
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.contract_year) return
    setSaving(true)
    const n = v => v !== '' ? Number(v) : null
    const payload = {
      contract_year:   Number(form.contract_year),
      volume_over:     n(form.volume_over),
      discount_rate:   n(form.discount_rate),
      discount_amount: n(form.discount_amount),
      note:            form.note || null,
    }
    if (editId) {
      await supabase.from('water_volume_discount').update(payload).eq('id', editId)
    } else {
      await supabase.from('water_volume_discount').insert(payload)
    }
    setSaving(false)
    setShowModal(false)
    fetchRows()
  }

  async function handleDelete(id) {
    await supabase.from('water_volume_discount').delete().eq('id', id)
    setDelId(null)
    fetchRows()
  }

  const YEAR_OPTIONS = getPattayaSaleContractYearRange()

  if (loading) return <div className="flex items-center justify-center h-40"><p className="text-slate-400 text-sm">กำลังโหลด...</p></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">ส่วนลดกรณีซื้อน้ำเกินปริมาณขั้นต่ำตามสัญญา (ปีละ 1 ครั้ง)</p>
        <button onClick={openAdd} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">
          + เพิ่มส่วนลด
        </button>
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
                {['ปีสัญญา','ปริมาณที่ซื้อเกิน (ลบ.ม.)','อัตราส่วนลด (%)','จำนวนเงิน (บาท)','หมายเหตุ','จัดการ'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700 font-medium">ปีที่ {r.contract_year}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmt(r.volume_over)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{r.discount_rate != null ? `${fmt(r.discount_rate, 4)}%` : '—'}</td>
                  <td className="px-4 py-3 text-right text-emerald-700 font-medium">{fmt(r.discount_amount, 2)}</td>
                  <td className="px-4 py-3 text-slate-500">{r.note || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
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
                  {YEAR_OPTIONS.map(y => <option key={y} value={y}>ปีที่ {y} · {getPattayaSaleContractLabel(y)}</option>)}
                </select>
              </div>
              {[
                ['volume_over',     'ปริมาณที่ซื้อเกิน (ลบ.ม.)'],
                ['discount_rate',   'อัตราส่วนลด (%)'],
                ['discount_amount', 'จำนวนเงินส่วนลด (บาท)'],
              ].map(([key, lbl]) => (
                <div key={key}>
                  <label className="block text-xs text-slate-500 mb-1">{lbl}</label>
                  <input type="number" step="any" value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-slate-500 mb-1">หมายเหตุ</label>
                <input type="text" value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
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
// MAIN
// ─────────────────────────────────────────────────────────
export default function WaterSales() {
  const [activeTab,   setActiveTab]   = useState('volume')
  const [waterYearNo, setWaterYearNo] = useState(getCurrentPattayaSaleContractYearNo)

  const tabs = [
    { id: 'volume',   label: 'ปริมาณน้ำ & ผลตอบแทน' },
    { id: 'price',    label: 'ราคาค่าน้ำ' },
    { id: 'discount', label: 'ส่วนลดปริมาณน้ำ' },
  ]

  // tab ที่ต้องการ year selector
  const showYearSelector = activeTab === 'volume'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">สัญญาซื้อขายน้ำประปา กปภ.สาขาพัทยา</h1>
          <p className="text-sm text-slate-500 mt-0.5">ปริมาณน้ำ · ราคาค่าน้ำ · ส่วนลด</p>
        </div>
        {showYearSelector && (
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
    </div>
  )
}
