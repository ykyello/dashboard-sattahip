import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const SORT_OPTIONS = [
  { value: 'created_at_desc', label: 'วันที่เพิ่ม (ใหม่สุด)' },
  { value: 'created_at_asc',  label: 'วันที่เพิ่ม (เก่าสุด)' },
  { value: 'updated_at_desc', label: 'แก้ไขล่าสุด' },
  { value: 'category_asc',    label: 'ประเภท (ก→ฮ)' },
  { value: 'asset_name_asc',  label: 'ชื่อ (ก→ฮ)' },
]

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function Assets() {
  const [assets,        setAssets]        = useState([])
  const [categories,    setCategories]    = useState([])
  const [activeCats,    setActiveCats]    = useState([])
  const [loading,       setLoading]       = useState(true)
  const [showModal,     setShowModal]     = useState(false)
  const [form,          setForm]          = useState({ category_id: '', asset_name: '', notes: '' })
  const [editId,        setEditId]        = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [imageFile,     setImageFile]     = useState(null)
  const [imagePreview,  setImagePreview]  = useState(null)
  const [lightbox,      setLightbox]      = useState(null)
  const [search,        setSearch]        = useState('')
  const [filterCat,     setFilterCat]     = useState('all')
  const [sortBy,        setSortBy]        = useState('created_at_desc')
  const [toast,         setToast]         = useState(null)
  const fileRef = useRef()

  useEffect(() => { fetchCategories(); fetchAssets() }, [])

  async function fetchCategories() {
    const { data } = await supabase
      .from('asset_categories')
      .select('*')
      .order('sort_order')
      .order('category_name')
    const all = data || []
    setCategories(all)
    setActiveCats(all.filter(c => c.is_active))
  }

  async function fetchAssets() {
    setLoading(true)
    const { data } = await supabase
      .from('assets')
      .select('*, asset_categories(id, category_name)')
      .order('created_at', { ascending: false })
    setAssets(data || [])
    setLoading(false)
  }

  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  function getCategoryName(asset) {
    return asset.asset_categories?.category_name ?? '—'
  }

  const displayed = assets
    .filter(a => filterCat === 'all' || a.category_id === filterCat)
    .filter(a => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return a.asset_name.toLowerCase().includes(q) || getCategoryName(a).toLowerCase().includes(q)
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'created_at_asc':  return new Date(a.created_at) - new Date(b.created_at)
        case 'updated_at_desc': return new Date(b.updated_at) - new Date(a.updated_at)
        case 'category_asc':    return getCategoryName(a).localeCompare(getCategoryName(b), 'th')
        case 'asset_name_asc':  return a.asset_name.localeCompare(b.asset_name, 'th')
        default:                return new Date(b.created_at) - new Date(a.created_at)
      }
    })

  function countByCat(catId) { return assets.filter(a => a.category_id === catId).length }

  function openAdd() {
    setForm({ category_id: activeCats[0]?.id ?? '', asset_name: '', notes: '' })
    setEditId(null); setImageFile(null); setImagePreview(null); setShowModal(true)
  }

  function openEdit(a) {
    setForm({ category_id: a.category_id ?? '', asset_name: a.asset_name, notes: a.notes || '' })
    setEditId(a.id); setImageFile(null); setImagePreview(a.image_url || null); setShowModal(true)
  }

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!form.asset_name.trim() || !form.category_id) return
    setSaving(true)
    let image_url  = editId ? (assets.find(a => a.id === editId)?.image_url  || null) : null
    let image_path = editId ? (assets.find(a => a.id === editId)?.image_path || null) : null
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const filePath = `${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('asset-images').upload(filePath, imageFile)
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('asset-images').getPublicUrl(filePath)
        image_url = urlData.publicUrl; image_path = filePath
      }
    }
    const payload = { category_id: form.category_id, asset_name: form.asset_name.trim(), notes: form.notes.trim() || null, image_url, image_path }
    let error
    if (editId) { ;({ error } = await supabase.from('assets').update(payload).eq('id', editId)) }
    else        { ;({ error } = await supabase.from('assets').insert([payload])) }
    setSaving(false); setShowModal(false)
    if (error) { showToast('error', `บันทึกไม่สำเร็จ: ${error.message}`) }
    else       { showToast('success', editId ? 'แก้ไขข้อมูลสำเร็จ' : 'เพิ่มทรัพย์สินสำเร็จ'); fetchAssets() }
  }

  async function handleDelete(id) {
    await supabase.from('assets').delete().eq('id', id)
    setDeleteConfirm(null); showToast('success', 'ลบข้อมูลเรียบร้อย'); fetchAssets()
  }

  async function exportExcel() {
    try {
      const XLSX = await import('xlsx')
      const rows = displayed.map((a, i) => ({
        'ลำดับ': i+1, 'ประเภททรัพย์สิน': getCategoryName(a),
        'ชื่อรายการทรัพย์สิน': a.asset_name, 'หมายเหตุ': a.notes||'',
        'วันที่เพิ่มข้อมูล': formatDate(a.created_at), 'วันที่แก้ไขล่าสุด': formatDate(a.updated_at),
        'URL รูปภาพ': a.image_url||'',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'ทรัพย์สิน')
      XLSX.writeFile(wb, 'asset-register.xlsx')
    } catch { showToast('error', 'Export Excel ไม่สำเร็จ: ติดตั้ง xlsx ก่อน') }
  }

  async function exportPDF() {
    try {
      const { jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'landscape' })
      doc.setFontSize(14); doc.text('Asset Register - Sattahip Waterworks', 14, 15)
      doc.setFontSize(9); doc.text(`Exported: ${new Date().toLocaleDateString('th-TH')}`, 14, 22)
      autoTable(doc, {
        startY: 28,
        head: [['#','ประเภท','ชื่อรายการ','หมายเหตุ','วันที่เพิ่ม','แก้ไขล่าสุด']],
        body: displayed.map((a,i) => [i+1, getCategoryName(a), a.asset_name, a.notes||'', formatDate(a.created_at), formatDate(a.updated_at)]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [30,58,138], textColor: 255 },
        alternateRowStyles: { fillColor: [248,250,252] },
      })
      doc.save('asset-register.pdf')
    } catch { showToast('error', 'Export PDF ไม่สำเร็จ: ติดตั้ง jspdf และ jspdf-autotable ก่อน') }
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${toast.type==='success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          <span>{toast.type==='success'?'✓':'⚠'}</span>{toast.msg}
        </div>
      )}

      {/* Dashboard cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <div className="bg-blue-900 rounded-xl p-4 text-white col-span-2 sm:col-span-1">
          <p className="text-xs text-blue-300 mb-1">ทรัพย์สินทั้งหมด</p>
          <p className="text-3xl font-semibold">{assets.length}</p>
          <p className="text-xs text-blue-300 mt-1">รายการ</p>
        </div>
        {categories.map(cat => (
          <div key={cat.id} className={`rounded-xl p-4 border ${cat.is_active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100'}`}>
            <p className={`text-xs mb-1 leading-tight ${cat.is_active ? 'text-slate-500' : 'text-slate-400'}`}>{cat.category_name}</p>
            <p className={`text-2xl font-medium ${cat.is_active ? 'text-slate-800' : 'text-slate-400'}`}>{countByCat(cat.id)}</p>
            <p className="text-xs text-slate-400 mt-1">รายการ</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          <input type="text" placeholder="ค้นหาชื่อหรือประเภท..." value={search} onChange={e=>setSearch(e.target.value)}
            className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52" />
          <select value={filterCat} onChange={e=>setFilterCat(e.target.value)}
            className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">ทุกประเภท</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
          </select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
            className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 text-sm hover:bg-emerald-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
            Excel
          </button>
          <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-300 bg-red-50 text-red-700 text-sm hover:bg-red-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            PDF
          </button>
          <button onClick={openAdd} disabled={activeCats.length===0}
            className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            เพิ่มทรัพย์สิน
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">รายการทรัพย์สิน</p>
          <p className="text-xs text-slate-400">แสดง {displayed.length} จาก {assets.length} รายการ</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-40"><p className="text-slate-400 text-sm">กำลังโหลด...</p></div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-slate-400 text-sm">ไม่พบข้อมูล</p>
            {assets.length===0 && activeCats.length>0 && <button onClick={openAdd} className="text-blue-600 text-sm underline">เพิ่มรายการแรก</button>}
            {activeCats.length===0 && <p className="text-xs text-slate-400">กรุณาเพิ่มประเภททรัพย์สินก่อน</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-max">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['ลำดับ','ประเภททรัพย์สิน','ชื่อรายการทรัพย์สิน','รูปภาพ','หมายเหตุ','วันที่เพิ่ม','แก้ไขล่าสุด','จัดการ'].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.map((a,i) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-xs">{i+1}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">{getCategoryName(a)}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{a.asset_name}</td>
                    <td className="px-4 py-3">
                      {a.image_url ? (
                        <button onClick={()=>setLightbox(a.image_url)} className="block w-12 h-12 rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 transition-colors">
                          <img src={a.image_url} alt={a.asset_name} className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <div className="w-12 h-12 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-300">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01" /></svg>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{a.notes||'—'}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(a.created_at)}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(a.updated_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={()=>openEdit(a)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="แก้ไข">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={()=>setDeleteConfirm(a.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="ลบ">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
              <h3 className="text-base font-medium text-slate-800">{editId ? 'แก้ไขทรัพย์สิน' : 'เพิ่มทรัพย์สินใหม่'}</h3>
              <button onClick={()=>setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">ประเภททรัพย์สิน *</label>
                <select value={form.category_id} onChange={e=>setForm(f=>({...f,category_id:e.target.value}))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">เลือกประเภท...</option>
                  {activeCats.map(c=><option key={c.id} value={c.id}>{c.category_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">ชื่อรายการทรัพย์สิน *</label>
                <input type="text" value={form.asset_name} onChange={e=>setForm(f=>({...f,asset_name:e.target.value}))}
                  placeholder="เช่น อาคารสำนักงานประปาสัตหีบ"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">หมายเหตุ</label>
                <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">รูปภาพ</label>
                {imagePreview && <div className="mb-3"><img src={imagePreview} alt="preview" className="w-full max-h-48 object-contain rounded-lg border border-slate-200 bg-slate-50" /></div>}
                <label className="flex items-center justify-center gap-2 w-full py-2.5 px-4 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  {imagePreview ? 'เปลี่ยนรูปภาพ' : 'อัปโหลดรูปภาพ'}
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={()=>setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">ยกเลิก</button>
                <button onClick={handleSave} disabled={saving||!form.asset_name.trim()||!form.category_id}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium transition-colors disabled:opacity-50">
                  {saving ? 'กำลังบันทึก...' : editId ? 'บันทึกการแก้ไข' : 'เพิ่มทรัพย์สิน'}
                </button>
              </div>
            </div>
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
              <button onClick={()=>setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">ยกเลิก</button>
              <button onClick={()=>handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium">ลบ</button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={()=>setLightbox(null)}>
          <div className="relative max-w-4xl w-full" onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setLightbox(null)} className="absolute -top-10 right-0 text-white hover:text-slate-300 text-sm flex items-center gap-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>ปิด
            </button>
            <img src={lightbox} alt="preview" className="w-full max-h-[80vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  )
}
