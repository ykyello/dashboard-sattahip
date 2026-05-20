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
  user_count: '',
  revenue: '',
  water_produced: '',
  water_sold: '',
  water_loss: '',
  usage_rate: '',
  min_benefit: '',
  actual_benefit: '',
  notes: '',
}

export default function Operations() {
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
      .from('operation_records')
      .select('*')
      .eq('fiscal_year', fiscalYear)
      .order('month')
    setRecords(data || [])
    setLoading(false)
  }

  function openAdd() {
    setForm({ ...emptyForm, fiscal_year: fiscalYear })
    setEditId(null)
    setShowModal(true)
  }

  function openEdit(record) {
    setForm({
      fiscal_year: record.fiscal_year,
      month: record.month,
      user_count: record.user_count ?? '',
      revenue: record.revenue ?? '',
      water_produced: record.water_produced ?? '',
      water_sold: record.water_sold ?? '',
      water_loss: record.water_loss ?? '',
      usage_rate: record.usage_rate ?? '',
      min_benefit: record.min_benefit ?? '',
      actual_benefit: record.actual_benefit ?? '',
      notes: record.notes ?? '',
    })
    setEditId(record.id)
    setShowModal(true)
  }

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const lossRate = form.water_produced && form.water_sold
    ? (((Number(form.water_produced) - Number(form.water_sold)) / Number(form.water_produced)) * 100).toFixed(2)
    : ''

  const benefitDiff = form.actual_benefit !== '' && form.min_benefit !== ''
    ? (Number(form.actual_benefit) - Number(form.min_benefit)).toFixed(2)
    : null

  const benefitStatus = benefitDiff !== null
    ? Number(form.actual_benefit) >= Number(form.min_benefit) ? 'เกินขั้นต่ำ' : 'ต่ำกว่าขั้นต่ำ'
    : null

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      fiscal_year: Number(form.fiscal_year),
      month: Number(form.month),
      user_count: form.user_count !== '' ? Number(form.user_count) : null,
      revenue: form.revenue !== '' ? Number(form.revenue) : null,
      water_produced: form.water_produced !== '' ? Number(form.water_produced) : null,
      water_sold: form.water_sold !== '' ? Number(form.water_sold) : null,
      water_loss: form.water_loss !== '' ? Number(form.water_loss) : null,
      usage_rate: form.usage_rate !== '' ? Number(form.usage_rate) : null,
      min_benefit: form.min_benefit !== '' ? Number(form.min_benefit) : null,
      actual_benefit: form.actual_benefit !== '' ? Number(form.actual_benefit) : null,
      notes: form.notes || null,
    }
    if (editId) {
      await supabase.from('operation_records').update(payload).eq('id', editId)
    } else {
      await supabase.from('operation_records').insert([payload])
    }
    setSaving(false)
    setShowModal(false)
    fetchRecords()
  }

  async function handleDelete(id) {
    await supabase.from('operation_records').delete().eq('id', id)
    setDeleteConfirm(null)
    fetchRecords()
  }

  const totalRevenue = records.reduce((s, r) => s + (Number(r.revenue) || 0), 0)
  const totalBenefit = records.reduce((s, r) => s + (Number(r.actual_benefit) || 0), 0)
  const totalMinBenefit = records.reduce((s, r) => s + (Number(r.min_benefit) || 0), 0)
  const latestUsers = records.length > 0 ? records[records.length - 1].user_count : null

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-xs text-slate-500 mb-1">ผู้ใช้น้ำล่าสุด</p>
          <p className="text-2xl font-medium text-slate-800">
            {latestUsers ? latestUsers.toLocaleString() : '-'}
          </p>
          <p className="text-xs text-slate-400 mt-1">ราย</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-xs text-slate-500 mb-1">รายได้รวมสะสม</p>
          <p className="text-2xl font-medium text-slate-800">
            {totalRevenue > 0 ? (totalRevenue / 1000000).toFixed(2) : '-'}
          </p>
          <p className="text-xs text-slate-400 mt-1">ล้านบาท</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-xs text-slate-500 mb-1">ผลประโยชน์ฯ สะสม</p>
          <p className="text-2xl font-medium text-slate-800">
            {totalBenefit > 0 ? (totalBenefit / 1000000).toFixed(2) : '-'}
          </p>
          <p className="text-xs text-slate-400 mt-1">ล้านบาท</p>
        </div>
        <div className={`rounded-xl p-4 border ${
          totalBenefit > 0 && totalBenefit >= totalMinBenefit
            ? 'bg-green-50 border-green-200'
            : totalBenefit > 0
            ? 'bg-red-50 border-red-200'
            : 'bg-white border-slate-200'
        }`}>
          <p className="text-xs text-slate-500 mb-1">ผลต่างสะสม vs ขั้นต่ำ</p>
          <p className={`text-2xl font-medium ${
            totalBenefit > 0 && totalBenefit >= totalMinBenefit
              ? 'text-green-700'
              : totalBenefit > 0
              ? 'text-red-700'
              : 'text-slate-800'
          }`}>
            {totalBenefit > 0
              ? ((totalBenefit - totalMinBenefit) / 1000000).toFixed(2)
              : '-'}
          </p>
          <p className="text-xs text-slate-400 mt-1">ล้านบาท</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-medium text-slate-700">
            ข้อมูลรายเดือน ปีงบประมาณ {fiscalYear}
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
                  <th className="px-4 py-3 text-right font-medium">ผู้ใช้น้ำ</th>
                  <th className="px-4 py-3 text-right font-medium">รายได้ (บาท)</th>
                  <th className="px-4 py-3 text-right font-medium">น้ำผลิต</th>
                  <th className="px-4 py-3 text-right font-medium">น้ำจำหน่าย</th>
                  <th className="px-4 py-3 text-right font-medium">สูญเสีย%</th>
                  <th className="px-4 py-3 text-right font-medium">ขั้นต่ำสัญญา</th>
                  <th className="px-4 py-3 text-right font-medium">ได้รับจริง</th>
                  <th className="px-4 py-3 text-center font-medium">สถานะ</th>
                  <th className="px-4 py-3 text-center font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map(r => {
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
                      <td className="px-4 py-3 text-right text-slate-600">
                        {r.water_produced ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {r.water_sold ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={Number(r.loss_rate) < 20 ? 'text-green-600' : 'text-red-600'}>
                          {r.loss_rate != null ? `${r.loss_rate}%` : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {r.min_benefit ? Number(r.min_benefit).toLocaleString() : '-'}
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
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal เพิ่ม/แก้ไข */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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

            <form onSubmit={handleSave} className="px-6 py-5 space-y-5">

              {/* ปีและเดือน */}
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

              {/* ผู้ใช้น้ำและรายได้ */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">จำนวนผู้ใช้น้ำ (ราย)</label>
                  <input
                    type="number"
                    name="user_count"
                    value={form.user_count}
                    onChange={handleChange}
                    placeholder="เช่น 12480"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">รายได้ (บาท)</label>
                  <input
                    type="number"
                    name="revenue"
                    value={form.revenue}
                    onChange={handleChange}
                    placeholder="เช่น 19200000"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* น้ำ */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">น้ำผลิต (ลบ.ม.)</label>
                  <input
                    type="number"
                    step="0.0001"
                    name="water_produced"
                    value={form.water_produced}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">น้ำจำหน่าย (ลบ.ม.)</label>
                  <input
                    type="number"
                    step="0.0001"
                    name="water_sold"
                    value={form.water_sold}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">อัตราสูญเสีย (%)</label>
                  <input
                    type="text"
                    readOnly
                    value={lossRate ? `${lossRate}%` : 'คำนวณอัตโนมัติ'}
                    className="w-full px-3 py-2 rounded-lg border border-slate-100 bg-slate-50
                               text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* น้ำสูญเสีย / อัตราใช้น้ำ */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">น้ำสูญเสีย (ลบ.ม.)</label>
                  <input
                    type="number"
                    step="0.0001"
                    name="water_loss"
                    value={form.water_loss}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">อัตราการใช้น้ำ (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="usage_rate"
                    value={form.usage_rate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* ผลประโยชน์ */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-medium text-slate-600 mb-3">ผลประโยชน์ตอบแทน</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      ขั้นต่ำตามสัญญา (บาท)
                    </label>
                    <input
                      type="number"
                      name="min_benefit"
                      value={form.min_benefit}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      ได้รับจริง (บาท)
                    </label>
                    <input
                      type="number"
                      name="actual_benefit"
                      value={form.actual_benefit}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                {benefitDiff !== null && (
                  <div className={`mt-3 px-4 py-2.5 rounded-lg text-sm ${
                    benefitStatus === 'เกินขั้นต่ำ'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    ผลต่าง: {Number(benefitDiff).toLocaleString()} บาท —{' '}
                    <strong>{benefitStatus}</strong>
                  </div>
                )}
              </div>

              {/* หมายเหตุ */}
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

              {/* Buttons */}
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
