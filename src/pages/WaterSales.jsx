import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  getPattayaSaleContractYearRange,
  getCurrentPattayaSaleContractYearNo,
  getPattayaSaleContractLabel,
  getPattayaSaleContractPeriodKeys,
  getPattayaSaleContractMonths,
  filterByPeriodKeys,
  MONTHS_TH_SHORT,
} from '../lib/contractUtils'

// ── dropdown ปีสัญญา: ปีที่ 1–30 เรียงใหม่→เก่า ───────────
const WATER_YEAR_OPTIONS = getPattayaSaleContractYearRange()

export default function WaterSales() {
  const [allRecords, setAllRecords] = useState([])
  const [loading,    setLoading]    = useState(true)

  // ── ปีสัญญาซื้อขายน้ำ ──────────────────────────────────
  const [waterYearNo, setWaterYearNo] = useState(getCurrentPattayaSaleContractYearNo)

  const [showModal,     setShowModal]     = useState(false)
  const [form,          setForm]          = useState({})
  const [editId,        setEditId]        = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => { fetchRecords() }, [waterYearNo])

  async function fetchRecords() {
    setLoading(true)
    const keys  = getPattayaSaleContractPeriodKeys(waterYearNo)
    const fySet = [...new Set(keys.map(k => k.fiscal_year))]

    const { data } = await supabase
      .from('water_sales')
      .select('*')
      .in('fiscal_year', fySet)
      .order('fiscal_year')
      .order('month')

    setAllRecords(filterByPeriodKeys(data || [], keys))
    setLoading(false)
  }

  // ── เดือนที่ใช้ใน dropdown ฟอร์ม ─────────────────────
  // [{month, fiscal_year, label}, ...] เช่น "พฤศจิกายน 2568"
  const contractMonths = getPattayaSaleContractMonths(waterYearNo)

  function makeEmptyForm() {
    const first = contractMonths[0] || {}
    return {
      fiscal_year:   first.fiscal_year ?? '',
      month:         first.month       ?? '',
      volume_sold:   '',
      unit_price:    '',
      total_revenue: '',
      notes:         '',
    }
  }

  function openAdd() {
    setForm(makeEmptyForm())
    setEditId(null)
    setShowModal(true)
  }

  function openEdit(r) {
    setForm({
      fiscal_year:   r.fiscal_year,
      month:         r.month,
      volume_sold:   r.volume_sold   ?? '',
      unit_price:    r.unit_price    ?? '',
      total_revenue: r.total_revenue ?? '',
      notes:         r.notes         ?? '',
    })
    setEditId(r.id)
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const toNum = v => v !== '' ? Number(v) : null
    const payload = {
      fiscal_year:   Number(form.fiscal_year),
      month:         Number(form.month),
      volume_sold:   toNum(form.volume_sold),
      unit_price:    toNum(form.unit_price),
      total_revenue: toNum(form.total_revenue),
      notes:         form.notes || null,
    }
    if (editId) {
      await supabase.from('water_sales').update(payload).eq('id', editId)
    } else {
      await supabase.from('water_sales').insert(payload)
    }
    setSaving(false)
    setShowModal(false)
    fetchRecords()
  }

  async function handleDelete(id) {
    await supabase.from('water_sales').delete().eq('id', id)
    setDeleteConfirm(null)
    fetchRecords()
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            ขายน้ำให้ กปภ.สาขาพัทยา
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">รายงานการขายน้ำรายเดือน</p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm
                     font-medium rounded-lg"
        >
          + เพิ่มข้อมูล
        </button>
      </div>

      {/* ── Filter: ปีสัญญาซื้อขายน้ำ ── */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-600 whitespace-nowrap font-medium">
          ปีสัญญาซื้อขายน้ำ:
        </span>
        <select
          value={waterYearNo}
          onChange={e => setWaterYearNo(Number(e.target.value))}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2
                     bg-white text-slate-700 focus:outline-none focus:ring-2
                     focus:ring-blue-500 min-w-[280px]"
        >
          {WATER_YEAR_OPTIONS.map(yn => (
            <option key={yn} value={yn}>{getPattayaSaleContractLabel(yn)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-slate-400 text-sm">กำลังโหลด...</p>
        </div>
      ) : allRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40
                        bg-white rounded-xl border border-slate-200 gap-2">
          <p className="text-slate-400 text-sm">
            ยังไม่มีข้อมูล {getPattayaSaleContractLabel(waterYearNo)}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['เดือน','ปริมาณขาย (ลบ.ม.)','ราคาต่อหน่วย','รายได้รวม (บาท)','จัดการ'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium
                                           text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allRecords.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {MONTHS_TH_SHORT[r.month]} {r.fiscal_year}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {r.volume_sold ? Number(r.volume_sold).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {r.unit_price ? Number(r.unit_price).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {r.total_revenue ? Number(r.total_revenue).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(r)}
                          className="text-xs px-2.5 py-1 rounded-md border border-slate-200
                                     text-slate-600 hover:bg-slate-100">แก้ไข</button>
                        <button onClick={() => setDeleteConfirm(r.id)}
                          className="text-xs px-2.5 py-1 rounded-md border border-red-200
                                     text-red-600 hover:bg-red-50">ลบ</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal เพิ่ม/แก้ไข ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-5">
              {editId ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูลใหม่'}
            </h3>

            <div className="space-y-4">

              {/* ── เดือน: ระบบ map ปีให้อัตโนมัติ ── */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">เดือน</label>
                <select
                  value={`${form.fiscal_year}-${form.month}`}
                  onChange={e => {
                    const [fy, m] = e.target.value.split('-').map(Number)
                    setForm(f => ({ ...f, fiscal_year: fy, month: m }))
                  }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  {contractMonths.map(cm => (
                    <option key={`${cm.fiscal_year}-${cm.month}`}
                            value={`${cm.fiscal_year}-${cm.month}`}>
                      {cm.label}
                    </option>
                  ))}
                </select>
              </div>

              {[
                ['volume_sold',   'ปริมาณขาย (ลบ.ม.)'],
                ['unit_price',    'ราคาต่อหน่วย (บาท)'],
                ['total_revenue', 'รายได้รวม (บาท)'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs text-slate-500 mb-1">{label}</label>
                  <input
                    type="number"
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs text-slate-500 mb-1">หมายเหตุ</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200
                           text-sm text-slate-600 hover:bg-slate-50">ยกเลิก</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700
                           text-white text-sm font-medium disabled:opacity-60">
                {saving ? 'กำลังบันทึก...' : editId ? 'บันทึกการแก้ไข' : 'เพิ่มข้อมูล'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal ยืนยันลบ ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-medium text-slate-800 mb-2">ยืนยันการลบ</h3>
            <p className="text-sm text-slate-500 mb-5">ข้อมูลที่ลบแล้วไม่สามารถกู้คืนได้</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200
                           text-sm text-slate-600 hover:bg-slate-50">ยกเลิก</button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700
                           text-white text-sm font-medium">ลบ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
