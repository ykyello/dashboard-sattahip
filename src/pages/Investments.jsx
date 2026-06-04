import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ── หมวดการลงทุนตามสัญญา ────────────────────────────────
const INVESTMENT_CATEGORIES = [
  {
    id: 'pipe',
    label: 'เงินลงทุนวางท่อจำหน่ายน้ำเพิ่มเติม',
    contractAmount: 39_159_600,
    color: 'blue',
  },
  {
    id: 'scada',
    label: 'เงินลงทุนการติดตั้งระบบควบคุมระยะไกล (SCADA)',
    contractAmount: 12_000_000,
    color: 'emerald',
  },
]

const TOTAL_CONTRACT = INVESTMENT_CATEGORIES.reduce((s, c) => s + c.contractAmount, 0)

const COLOR = {
  blue: {
    bar:    'bg-blue-500',
    badge:  'bg-blue-100 text-blue-700',
    border: 'border-l-blue-500',
    text:   'text-blue-700',
    dot:    'bg-blue-400',
  },
  emerald: {
    bar:    'bg-emerald-500',
    badge:  'bg-emerald-100 text-emerald-700',
    border: 'border-l-emerald-500',
    text:   'text-emerald-700',
    dot:    'bg-emerald-400',
  },
}

const emptyForm = {
  category_id:  'pipe',
  item_name:    '',
  invest_date:  '',
  amount:       '',
  description:  '',
  notes:        '',
}

function fmt(v, dec = 0) {
  if (v === null || v === undefined) return '—'
  return Number(v).toLocaleString('th-TH', { maximumFractionDigits: dec })
}

function pct(actual, contract) {
  if (!contract) return 0
  return Math.min(100, (actual / contract) * 100)
}

function ProgressBar({ value, color }) {
  const c = COLOR[color]
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${c.bar}`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  )
}

function CategoryCard({ cat, actual }) {
  const c       = COLOR[cat.color]
  const remain  = cat.contractAmount - actual
  const percent = pct(actual, cat.contractAmount)

  return (
    <div className={`bg-white rounded-xl border border-slate-200 border-l-4 ${c.border} p-5 space-y-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.dot}`} />
          <p className="text-sm font-semibold text-slate-800 leading-tight">{cat.label}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${
          percent >= 100 ? 'bg-green-100 text-green-700' : c.badge
        }`}>
          {percent.toFixed(1)}%
        </span>
      </div>

      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>ลงทุนจริง {fmt(actual, 2)} บาท</span>
          <span>สัญญา {fmt(cat.contractAmount)} บาท</span>
        </div>
        <ProgressBar value={percent} color={cat.color} />
      </div>

      <div className="grid grid-cols-3 gap-3 pt-1">
        <div>
          <p className="text-xs text-slate-400 mb-0.5">วงเงินตามสัญญา</p>
          <p className="text-sm font-semibold text-slate-700">{fmt(cat.contractAmount)}</p>
          <p className="text-xs text-slate-400">บาท</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-0.5">ลงทุนจริงสะสม</p>
          <p className={`text-sm font-semibold ${c.text}`}>{fmt(actual, 2)}</p>
          <p className="text-xs text-slate-400">บาท</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-0.5">คงเหลือ</p>
          <p className={`text-sm font-semibold ${remain < 0 ? 'text-red-600' : 'text-slate-700'}`}>
            {fmt(Math.abs(remain), 2)}
          </p>
          <p className="text-xs text-slate-400">{remain < 0 ? 'เกินวงเงิน' : 'บาท'}</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────
export default function Investments() {
  const [items,         setItems]         = useState([])
  const [loading,       setLoading]       = useState(true)
  const [showModal,     setShowModal]     = useState(false)
  const [form,          setForm]          = useState(emptyForm)
  const [editId,        setEditId]        = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [saveError,     setSaveError]     = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [filterCat,     setFilterCat]     = useState('all')
  const [toast,         setToast]         = useState(null)

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    setLoading(true)
    const { data, error } = await supabase
      .from('investment_projects')
      .select('id, category_id, item_name, invest_date, amount, description, notes')
      .order('invest_date', { ascending: false, nullsFirst: false })
    if (!error) setItems(data || [])
    setLoading(false)
  }

  function actualByCategory(catId) {
    return items
      .filter(r => r.category_id === catId)
      .reduce((s, r) => s + (Number(r.amount) || 0), 0)
  }

  const totalActual  = items.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const totalRemain  = TOTAL_CONTRACT - totalActual
  const totalPercent = pct(totalActual, TOTAL_CONTRACT)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function openAdd() {
    setForm(emptyForm)
    setEditId(null)
    setSaveError(null)
    setShowModal(true)
  }

  function openEdit(r) {
    setForm({
      category_id:  r.category_id  || 'pipe',
      item_name:    r.item_name    || '',
      invest_date:  r.invest_date  || '',
      amount:       r.amount       != null ? String(r.amount) : '',
      description:  r.description  || '',
      notes:        r.notes        || '',
    })
    setEditId(r.id)
    setSaveError(null)
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)

    const payload = {
      category_id:  form.category_id,
      item_name:    form.item_name,
      project_name: form.item_name,           // compat column
      invest_date:  form.invest_date || null,
      start_date:   form.invest_date || null,  // compat column
      amount:       form.amount !== '' ? Number(form.amount) : null,
      budget:       form.amount !== '' ? Number(form.amount) : null, // compat column
      description:  form.description || null,
      notes:        form.notes       || null,
      status:       'completed',               // compat column
    }

    let error
    if (editId) {
      ;({ error } = await supabase
        .from('investment_projects')
        .update(payload)
        .eq('id', editId))
    } else {
      ;({ error } = await supabase
        .from('investment_projects')
        .insert([payload]))
    }

    setSaving(false)

    if (error) {
      setSaveError(error.message)
      return
    }

    setShowModal(false)
    setToast(editId ? 'แก้ไขรายการสำเร็จ' : 'เพิ่มรายการสำเร็จ')
    setTimeout(() => setToast(null), 2500)
    fetchItems()
  }

  async function handleDelete(id) {
    await supabase.from('investment_projects').delete().eq('id', id)
    setDeleteConfirm(null)
    fetchItems()
  }

  const filtered = filterCat === 'all'
    ? items
    : items.filter(r => r.category_id === filterCat)

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
                        bg-green-50 border border-green-200 text-green-700 flex items-center gap-2">
          ✓ {toast}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'มูลค่าตามสัญญารวม',      value: fmt(TOTAL_CONTRACT),           unit: 'บาท',          accent: 'text-slate-800' },
          { label: 'มูลค่าลงทุนจริงรวม',      value: fmt(totalActual, 2),           unit: 'บาท',          accent: 'text-blue-700'  },
          { label: 'คงเหลือต้องลงทุนรวม',     value: fmt(Math.abs(totalRemain), 2), unit: totalRemain < 0 ? 'เกินวงเงิน' : 'บาท', accent: totalRemain < 0 ? 'text-red-600' : 'text-slate-700' },
          { label: 'เปอร์เซ็นต์การลงทุนรวม', value: totalPercent.toFixed(1) + '%', unit: 'ของวงเงินสัญญา', accent: 'text-emerald-700' },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1 leading-tight">{c.label}</p>
            <p className={`text-xl font-semibold ${c.accent}`}>{c.value}</p>
            <p className="text-xs text-slate-400 mt-1">{c.unit}</p>
          </div>
        ))}
      </div>

      {/* Overall progress */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>ความคืบหน้าการลงทุนรวม</span>
          <span className="font-semibold text-slate-700">{totalPercent.toFixed(1)}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700"
            style={{ width: `${Math.min(100, totalPercent)}%` }}
          />
        </div>
        <p className="text-xs text-slate-400">
          ลงทุนแล้ว {fmt(totalActual, 2)} บาท จากวงเงิน {fmt(TOTAL_CONTRACT)} บาท
        </p>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {INVESTMENT_CATEGORIES.map(cat => (
          <CategoryCard key={cat.id} cat={cat} actual={actualByCategory(cat.id)} />
        ))}
      </div>

      {/* รายการลงทุน */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'pipe',  label: 'ท่อจำหน่ายน้ำ' },
              { id: 'scada', label: 'SCADA' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterCat(f.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  filterCat === f.id
                    ? 'bg-blue-900 text-white border-blue-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white
                       text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            เพิ่มรายการลงทุน
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 bg-white rounded-xl border border-slate-200">
            <p className="text-slate-400 text-sm">กำลังโหลด...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2
                          bg-white rounded-xl border border-slate-200">
            <p className="text-slate-400 text-sm">ยังไม่มีรายการลงทุน</p>
            <button onClick={openAdd} className="text-blue-600 text-sm underline">เพิ่มรายการแรก</button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['หมวด','รายการลงทุน','วันที่','มูลค่า (บาท)','รายละเอียด','จัดการ'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500
                                             uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(r => {
                    const cat = INVESTMENT_CATEGORIES.find(c => c.id === r.category_id)
                    const c   = cat ? COLOR[cat.color] : COLOR.blue
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          {cat ? (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.badge}`}>
                              {cat.id === 'pipe' ? 'ท่อจำหน่ายน้ำ' : 'SCADA'}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-800 font-medium max-w-xs">
                          <p className="truncate">{r.item_name || '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                          {r.invest_date || '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">
                          {fmt(r.amount, 2)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs max-w-xs">
                          <p className="truncate">{r.description || '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => openEdit(r)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="แก้ไข"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(r.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
                <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-slate-600">
                      รวม {filtered.length} รายการ
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800 whitespace-nowrap">
                      {fmt(filtered.reduce((s, r) => s + (Number(r.amount) || 0), 0), 2)} บาท
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal เพิ่ม/แก้ไข */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-medium text-slate-800">
                {editId ? 'แก้ไขรายการลงทุน' : 'เพิ่มรายการลงทุน'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">

              {/* error */}
              {saveError && (
                <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                  ⚠ {saveError}
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-500 mb-1">หมวดการลงทุน *</label>
                <select
                  name="category_id"
                  value={form.category_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {INVESTMENT_CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">รายการลงทุน *</label>
                <input
                  type="text"
                  name="item_name"
                  required
                  value={form.item_name}
                  onChange={handleChange}
                  placeholder="เช่น วางท่อ PE100 ขนาด 4 นิ้ว ถนน..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">วันที่ดำเนินการ</label>
                  <input
                    type="date"
                    name="invest_date"
                    value={form.invest_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">มูลค่าเงินลงทุน (บาท) *</label>
                  <input
                    type="number"
                    name="amount"
                    required
                    step="any"
                    min="0"
                    value={form.amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">รายละเอียด</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">หมายเหตุ</label>
                <input
                  type="text"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  {saving ? 'กำลังบันทึก...' : editId ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}
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
            <p className="text-sm text-slate-500 mb-5">ข้อมูลที่ลบแล้วไม่สามารถกู้คืนได้</p>
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
