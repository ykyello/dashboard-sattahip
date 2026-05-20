import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const MONTHS_TH = [
  '', 'ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.',
  'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.'
]

const FISCAL_YEARS = [2568, 2567, 2566, 2565]

const emptyForm = {
  fiscal_year: 2568,
  month: 1,
  volume_sold: '',
  unit_price: '',
  monthly_discount: '',
  cumulative_discount: '',
  excess_discount: '',
  notes: '',
}

export default function WaterSales() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [fiscalYear, setFiscalYear] = useState(2568)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => { fetchRecords() }, [fiscalYear])

  async function fetchRecords() {
    setLoading(true)
    const { data } = await supabase
      .from('water_sales')
      .select('*')
      .eq('fiscal_year', fiscalYear)
      .order('month')
    setRecords(data || [])
    setLoading(false)
  }

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const previewTotal = form.volume_sold && form.unit_price
    ? (Number(form.volume_sold) * Number(form.unit_price)).toFixed(2)
    : null

  function openAdd() {
    setForm({ ...emptyForm, fiscal_year: fiscalYear })
    setEditId(null)
    setShowModal(true)
  }

  function openEdit(r) {
    setForm({
      fiscal_year: r.fiscal_year,
      month: r.month,
      volume_sold: r.volume_sold ?? '',
      unit_price: r.unit_price ?? '',
      monthly_discount: r.monthly_discount ?? '',
      cumulative_discount: r.cumulative_discount ?? '',
      excess_discount: r.excess_discount ?? '',
      notes: r.notes ?? '',
    })
    setEditId(r.id)
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      fiscal_year: Number(form.fiscal_year),
      month: Number(form.month),
      volume_sold: form.volume_sold !== '' ? Number(form.volume_sold) : null,
      unit_price: form.unit_price !== '' ? Number(form.unit_price) : null,
      monthly_discount: form.monthly_discount !== '' ? Number(form.monthly_discount) : 0,
      cumulative_discount: form.cumulative_discount !== '' ? Number(form.cumulative_discount) : 0,
      excess_discount: form.excess_discount !== '' ? Number(form.excess_discount) : 0,
      notes: form.notes || null,
    }
    if (editId) {
      await supabase.from('water_sales').update(payload).eq('id', editId)
    } else {
      await supabase.from('water_sales').insert([payload])
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

  const totalVolume = records.reduce((s, r) => s + (Number(r.volume_sold) || 0), 0)
  const totalValue = records.reduce((s, r) => s + (Number(r.total_value) || 0), 0)
  const totalDiscount = records.reduce((s, r) => s + (Number(r.monthly_discount) || 0), 0)

  return (
    <div className="space-y-5">

      {/* Toolbar */}
      <div className="flex items-center justify-between">
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
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white
                     text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          เพิ่มข้อมูล
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-xs text-slate-500 mb-1">ปริมาณน้ำขายสะสม</p>
          <p className="text-2xl font-medium text-slate-800">
            {totalVolume > 0 ? totalVolume.toLocaleString() : '-'}
          </p>
          <p className="text-xs text-slate-400 mt-1">ลบ.ม.</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-xs text-slate-500 mb-1">มูลค่ารวมสะสม</p>
          <p className="text-2xl font-medium text-slate-800">
            {totalValue > 0 ? (totalValue / 1000000).toFixed(2) : '-'}
          </p>
          <p className="text-xs text-slate-400 mt-1">ล้านบาท</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-xs text-slate-500 mb-1">ส่วนลดรายเดือนสะสม</p>
          <p className="text-2xl font-medium text-slate-800">
            {totalDiscount > 0 ? (totalDiscount / 1000000).toFixed(2) : '-'}
          </p>
          <p className="text-xs text-slate-400 mt-1">ล้านบาท</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-medium text-slate-700">
            ข้อมูลการขายน้ำ ปีงบประมาณ {fiscalYear}
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-slate-400 text-sm">กำลังโหลด...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-slate-400 text-sm">ยังไม่มีข้อมูล</p>
            <button onClick={openAdd} className="text-blue-600 text-sm underline">
              เพิ่มข้อมูลแรก
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500">
                  <th className="px-4 py-3 text-left font-medium">เดือน</th>
                  <th className="px-4 py-3 text-right font-medium">ปริมาณ (ลบ.ม.)</th>
                  <th className="px-4 py-3 text-right font-medium">ราคา/หน่วย</th>
                  <th className="px-4 py-3 text-right font-medium">มูลค่ารวม</th>
                  <th className="px-4 py-3 text-right font-medium">ส่วนลดรายเดือน</th>
                  <th className="px-4 py-3 text-right font-medium">ส่วนลดสะสม</th>
                  <th className="px-4 py-3 text-right font-medium">ส่วนลดเกินขั้นต่ำ</th>
                  <th className="px-4 py-3 text-center font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {MONTHS_TH[r.month]}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {r.volume_sold ? Number(r.volume_sold).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {r.unit_price ? Number(r.unit_price).toFixed(4) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {r.total_value ? Number(r.total_value).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {r.monthly_discount ? Number(r.monthly_discount).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {r.cumulative_discount ? Number(r.cumulative_discount).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {r.excess_discount ? Number(r.excess_discount).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => openEdit(r)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="แก้ไข"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(r.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          title="ลบ"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal เพิ่ม/แก้ไข */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-medium text-slate-800">
                {editId ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูลใหม่'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">ปีงบประมาณ</label>
                  <select
                    name="fiscal_year"
                    value={form.fiscal_year}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {FISCAL_YEARS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">เดือน</label>
                  <select
                    name="month"
                    value={form.month}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {MONTHS_TH.slice(1).map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    ปริมาณน้ำขาย (ลบ.ม.)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    name="volume_sold"
                    value={form.volume_sold}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    ราคาต่อหน่วย (บาท/ลบ.ม.)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    name="unit_price"
                    value={form.unit_price}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {previewTotal && (
                <div className="bg-blue-50 px-4 py-2.5 rounded-lg text-sm text-blue-700">
                  มูลค่ารวม:{' '}
                  <strong>{Number(previewTotal).toLocaleString()}</strong> บาท
                  (คำนวณอัตโนมัติ)
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">ส่วนลดรายเดือน</label>
                  <input
                    type="number"
                    name="monthly_discount"
                    value={form.monthly_discount}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">ส่วนลดสะสม</label>
                  <input
                    type="number"
                    name="cumulative_discount"
                    value={form.cumulative_discount}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">ส่วนลดเกินขั้นต่ำ</label>
                  <input
                    type="number"
                    name="excess_discount"
                    value={form.excess_discount}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">หมายเหตุ</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm
                             text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800
                             text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'กำลังบันทึก...' : editId ? 'บันทึกการแก้ไข' : 'เพิ่มข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ยืนยันลบ */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-medium text-slate-800 mb-2">ยืนยันการลบ</h3>
            <p className="text-sm text-slate-500 mb-5">
              ข้อมูลที่ลบแล้วไม่สามารถกู้คืนได้
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200
                           text-sm text-slate-600 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700
                           text-white text-sm font-medium"
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
