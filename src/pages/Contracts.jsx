import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CONTRACT_TYPES = [
  'เช่าบริหาร',
  'ขายน้ำ',
  'จ้างเหมา',
  'อื่นๆ',
]

const emptyForm = {
  contract_name: '',
  contract_type: 'เช่าบริหาร',
  start_date: '',
  end_date: '',
  counterparty: '',
  notes: '',
}

export default function Contracts() {
  const [contracts, setContracts] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [selectedContract, setSelectedContract] = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { fetchContracts() }, [])

  async function fetchContracts() {
    setLoading(true)
    const { data } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false })
    setContracts(data || [])
    setLoading(false)
  }

  async function fetchDocuments(contractId) {
    const { data } = await supabase
      .from('contract_documents')
      .select('*')
      .eq('contract_id', contractId)
      .order('uploaded_at', { ascending: false })
    setDocuments(data || [])
  }

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function openAdd() {
    setForm(emptyForm)
    setEditId(null)
    setShowModal(true)
  }

  function openEdit(c) {
    setForm({
      contract_name: c.contract_name,
      contract_type: c.contract_type,
      start_date: c.start_date ?? '',
      end_date: c.end_date ?? '',
      counterparty: c.counterparty ?? '',
      notes: c.notes ?? '',
    })
    setEditId(c.id)
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      contract_name: form.contract_name,
      contract_type: form.contract_type,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      counterparty: form.counterparty || null,
      notes: form.notes || null,
    }
    if (editId) {
      await supabase.from('contracts').update(payload).eq('id', editId)
    } else {
      await supabase.from('contracts').insert([payload])
    }
    setSaving(false)
    setShowModal(false)
    fetchContracts()
  }

  async function handleDelete(id) {
    await supabase.from('contracts').delete().eq('id', id)
    setDeleteConfirm(null)
    if (selectedContract?.id === id) setSelectedContract(null)
    fetchContracts()
  }

  async function handleSelectContract(c) {
    setSelectedContract(c)
    await fetchDocuments(c.id)
  }

  async function handleUploadFile(e) {
    const file = e.target.files[0]
    if (!file || !selectedContract) return
    setUploading(true)

    const ext = file.name.split('.').pop()
    const filePath = `${selectedContract.id}/${Date.now()}.${ext}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('contracts-docs')
      .upload(filePath, file)

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('contracts-docs')
        .getPublicUrl(filePath)

      await supabase.from('contract_documents').insert([{
        contract_id: selectedContract.id,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: ext.toLowerCase(),
        file_size: file.size,
      }])

      await fetchDocuments(selectedContract.id)
    }

    setUploading(false)
    e.target.value = ''
  }

  async function handleDeleteDocument(docId, fileUrl) {
    await supabase.from('contract_documents').delete().eq('id', docId)
    await fetchDocuments(selectedContract.id)
  }

  function formatFileSize(bytes) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function getFileIcon(type) {
    if (type === 'pdf') {
      return (
        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    }
    return (
      <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  }

  const contractDays = (c) => {
    if (!c.end_date) return null
    const diff = new Date(c.end_date) - new Date()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="space-y-5">

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">สัญญาทั้งหมด {contracts.length} ฉบับ</p>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white
                     text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          เพิ่มสัญญา
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Contract List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-40 bg-white rounded-xl border border-slate-200">
              <p className="text-slate-400 text-sm">กำลังโหลด...</p>
            </div>
          ) : contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2
                            bg-white rounded-xl border border-slate-200">
              <p className="text-slate-400 text-sm">ยังไม่มีสัญญา</p>
              <button onClick={openAdd} className="text-blue-600 text-sm underline">
                เพิ่มสัญญาแรก
              </button>
            </div>
          ) : (
            contracts.map(c => {
              const days = contractDays(c)
              const isSelected = selectedContract?.id === c.id
              const isExpiring = days !== null && days <= 90 && days > 0
              const isExpired = days !== null && days <= 0

              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectContract(c)}
                  className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-100'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                          {c.contract_type}
                        </span>
                        {isExpired && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                            หมดอายุ
                          </span>
                        )}
                        {isExpiring && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                            ใกล้หมดอายุ {days} วัน
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-slate-800 mt-1.5 truncate">
                        {c.contract_name}
                      </h3>
                      {c.counterparty && (
                        <p className="text-xs text-slate-500 mt-0.5">{c.counterparty}</p>
                      )}
                      {(c.start_date || c.end_date) && (
                        <p className="text-xs text-slate-400 mt-1">
                          {c.start_date ?? '?'} → {c.end_date ?? 'ไม่กำหนด'}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); openEdit(c) }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="แก้ไข"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteConfirm(c.id) }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="ลบ"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Document Panel */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {!selectedContract ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-2 p-6">
              <svg className="w-10 h-10 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-400 text-sm">เลือกสัญญาเพื่อดูเอกสารแนบ</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-xs text-slate-500 mb-0.5">เอกสารแนบ</p>
                <h3 className="text-sm font-medium text-slate-800 truncate">
                  {selectedContract.contract_name}
                </h3>
              </div>

              {/* Upload */}
              <div className="px-5 py-4 border-b border-slate-100">
                <label className={`flex items-center justify-center gap-2 w-full py-2.5 px-4
                                   border-2 border-dashed border-slate-200 rounded-lg cursor-pointer
                                   hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm text-slate-500
                                   ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดไฟล์ PDF หรือรูปภาพ'}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleUploadFile}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Document List */}
              <div className="divide-y divide-slate-100">
                {documents.length === 0 ? (
                  <div className="flex items-center justify-center h-24">
                    <p className="text-slate-400 text-sm">ยังไม่มีเอกสารแนบ</p>
                  </div>
                ) : (
                  documents.map(doc => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
                    >
                      {getFileIcon(doc.file_type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 truncate">{doc.file_name}</p>
                        {doc.file_size && (
                          <p className="text-xs text-slate-400">{formatFileSize(doc.file_size)}</p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="เปิดดู"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </a>
                        <a
                          href={doc.file_url}
                          download={doc.file_name}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                          title="ดาวน์โหลด"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>
                        <button
                          onClick={() => handleDeleteDocument(doc.id, doc.file_url)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="ลบ"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal เพิ่ม/แก้ไข */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-medium text-slate-800">
                {editId ? 'แก้ไขสัญญา' : 'เพิ่มสัญญาใหม่'}
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
              <div>
                <label className="block text-xs text-slate-500 mb-1">ชื่อสัญญา *</label>
                <input
                  type="text"
                  name="contract_name"
                  required
                  value={form.contract_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">ประเภทสัญญา</label>
                  <select
                    name="contract_type"
                    value={form.contract_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CONTRACT_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">คู่สัญญา</label>
                  <input
                    type="text"
                    name="counterparty"
                    value={form.counterparty}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">วันที่เริ่มสัญญา</label>
                  <input
                    type="date"
                    name="start_date"
                    value={form.start_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">วันที่สิ้นสุดสัญญา</label>
                  <input
                    type="date"
                    name="end_date"
                    value={form.end_date}
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
                  rows={3}
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
                  {saving ? 'กำลังบันทึก...' : editId ? 'บันทึกการแก้ไข' : 'เพิ่มสัญญา'}
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
              ข้อมูลและเอกสารแนบทั้งหมดจะถูกลบและไม่สามารถกู้คืนได้
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
