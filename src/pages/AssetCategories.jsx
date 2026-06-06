import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function AssetCategories() {
  const [categories,   setCategories]   = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showModal,    setShowModal]    = useState(false)
  const [editItem,     setEditItem]     = useState(null)
  const [formName,     setFormName]     = useState('')
  const [saving,       setSaving]       = useState(false)
  const [toast,        setToast]        = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null) // { id, name, count }
  const [moveTo,       setMoveTo]       = useState('')

  useEffect(() => { fetchCategories() }, [])

  async function fetchCategories() {
    setLoading(true)
    const { data } = await supabase
      .from('asset_categories')
      .select('*')
      .order('sort_order')
      .order('category_name')
    setCategories(data || [])
    setLoading(false)
  }

  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  function openAdd() {
    setEditItem(null)
    setFormName('')
    setShowModal(true)
  }

  function openEdit(cat) {
    setEditItem(cat)
    setFormName(cat.category_name)
    setShowModal(true)
  }

  async function handleSave() {
    const name = formName.trim()
    if (!name) return
    setSaving(true)

    let error
    if (editItem) {
      ;({ error } = await supabase
        .from('asset_categories')
        .update({ category_name: name })
        .eq('id', editItem.id))
    } else {
      const maxOrder = categories.length > 0
        ? Math.max(...categories.map(c => c.sort_order)) + 1
        : 1
      ;({ error } = await supabase
        .from('asset_categories')
        .insert({ category_name: name, sort_order: maxOrder }))
    }

    setSaving(false)
    if (error) {
      showToast('error', error.message.includes('unique')
        ? 'ชื่อประเภทนี้มีอยู่แล้ว'
        : `บันทึกไม่สำเร็จ: ${error.message}`)
    } else {
      setShowModal(false)
      showToast('success', editItem ? 'แก้ไขชื่อประเภทสำเร็จ' : 'เพิ่มประเภทสำเร็จ')
      fetchCategories()
    }
  }

  async function toggleActive(cat) {
    const { error } = await supabase
      .from('asset_categories')
      .update({ is_active: !cat.is_active })
      .eq('id', cat.id)
    if (!error) {
      showToast('success', `${cat.is_active ? 'ปิด' : 'เปิด'}การใช้งาน "${cat.category_name}" แล้ว`)
      fetchCategories()
    }
  }

  async function startDelete(cat) {
    const { count } = await supabase
      .from('assets')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', cat.id)
    setMoveTo('')
    setDeleteTarget({ id: cat.id, name: cat.category_name, count: count || 0 })
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setSaving(true)

    if (deleteTarget.count > 0) {
      if (!moveTo) {
        showToast('error', 'กรุณาเลือกประเภทที่จะย้ายรายการไป')
        setSaving(false)
        return
      }
      const { error: mvErr } = await supabase
        .from('assets')
        .update({ category_id: moveTo })
        .eq('category_id', deleteTarget.id)
      if (mvErr) {
        showToast('error', `ย้ายข้อมูลไม่สำเร็จ: ${mvErr.message}`)
        setSaving(false)
        return
      }
    }

    const { error } = await supabase
      .from('asset_categories')
      .delete()
      .eq('id', deleteTarget.id)

    setSaving(false)
    setDeleteTarget(null)

    if (error) {
      showToast('error', `ลบไม่สำเร็จ: ${error.message}`)
    } else {
      showToast('success', 'ลบประเภทเรียบร้อย')
      fetchCategories()
    }
  }

  const moveOptions = categories.filter(c => c.id !== deleteTarget?.id)

  return (
    <div className="space-y-5">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
          flex items-center gap-2 ${
          toast.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
          {toast.msg}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          ใช้งาน {categories.filter(c => c.is_active).length} / ทั้งหมด {categories.length} ประเภท
        </p>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white
                     text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          เพิ่มประเภทใหม่
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-slate-400 text-sm">กำลังโหลด...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-slate-400 text-sm">ยังไม่มีประเภททรัพย์สิน</p>
            <button onClick={openAdd} className="text-blue-600 text-sm underline">เพิ่มประเภทแรก</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['#','ชื่อประเภท','สถานะ','วันที่สร้าง','แก้ไขล่าสุด','จัดการ'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium
                                         text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((cat, i) => (
                <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-3 text-slate-800 font-medium">{cat.category_name}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(cat)}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                        cat.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {cat.is_active ? '● ใช้งาน' : '○ ไม่ใช้งาน'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(cat.created_at)}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(cat.updated_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(cat)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="แก้ไขชื่อ"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => startDelete(cat)}
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
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal เพิ่ม/แก้ไข */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-medium text-slate-800 mb-4">
              {editItem ? 'แก้ไขชื่อประเภท' : 'เพิ่มประเภทใหม่'}
            </h3>
            <div>
              <label className="block text-xs text-slate-500 mb-1">ชื่อประเภททรัพย์สิน *</label>
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="เช่น อาคาร, เครื่องจักร, ท่อส่งน้ำ"
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200
                           text-sm text-slate-600 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="flex-1 px-4 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800
                           text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'กำลังบันทึก...' : editItem ? 'บันทึก' : 'เพิ่ม'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ยืนยันลบ */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-medium text-slate-800 mb-2">ยืนยันการลบประเภท</h3>
            <p className="text-sm text-slate-600 mb-3">
              ประเภท: <strong>"{deleteTarget.name}"</strong>
            </p>

            {deleteTarget.count > 0 ? (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
                  <p className="text-sm text-amber-700 font-medium">
                    ⚠ มีทรัพย์สิน {deleteTarget.count} รายการใช้ประเภทนี้อยู่
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    กรุณาเลือกประเภทที่จะย้ายรายการทั้งหมดไป
                  </p>
                </div>
                <div className="mb-4">
                  <label className="block text-xs text-slate-500 mb-1">ย้ายไปยังประเภท *</label>
                  <select
                    value={moveTo}
                    onChange={e => setMoveTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">เลือกประเภท...</option>
                    {moveOptions.map(c => (
                      <option key={c.id} value={c.id}>{c.category_name}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500 mb-5">
                ไม่มีทรัพย์สินในประเภทนี้ สามารถลบได้ทันที
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200
                           text-sm text-slate-600 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDelete}
                disabled={saving || (deleteTarget.count > 0 && !moveTo)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700
                           text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'กำลังดำเนินการ...' : 'ยืนยันลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
