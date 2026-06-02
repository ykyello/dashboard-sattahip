import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function formatFileSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function Contracts() {
  const [docs,          setDocs]          = useState([])
  const [loading,       setLoading]       = useState(true)
  const [showModal,     setShowModal]     = useState(false)
  const [uploading,     setUploading]     = useState(false)
  const [editDoc,       setEditDoc]       = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [toast,         setToast]         = useState(null)

  const [formName, setFormName] = useState('')
  const [formFile, setFormFile] = useState(null)

  useEffect(() => { fetchDocs() }, [])

  async function fetchDocs() {
    setLoading(true)
    const { data } = await supabase
      .from('documents')
      .select('*')
      .order('uploaded_at', { ascending: false })
    setDocs(data || [])
    setLoading(false)
  }

  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  function openAdd() {
    setFormName('')
    setFormFile(null)
    setShowModal(true)
  }

  async function handleUpload() {
    if (!formName.trim() || !formFile) return
    setUploading(true)

    const ext      = formFile.name.split('.').pop()
    const filePath = `docs/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('contracts-docs')
      .upload(filePath, formFile)

    if (uploadError) {
      showToast('error', `อัปโหลดไม่สำเร็จ: ${uploadError.message}`)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('contracts-docs')
      .getPublicUrl(filePath)

    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('documents').insert({
      doc_name:    formName.trim(),
      file_name:   formFile.name,
      file_url:    urlData.publicUrl,
      file_size:   formFile.size,
      uploaded_by: user?.email ?? '',
      uploaded_at: new Date().toISOString(),
    })

    setUploading(false)
    setShowModal(false)
    showToast('success', 'เพิ่มเอกสารเรียบร้อย')
    fetchDocs()
  }

  async function handleEditSave() {
    if (!editDoc?.doc_name?.trim()) return
    await supabase
      .from('documents')
      .update({ doc_name: editDoc.doc_name.trim() })
      .eq('id', editDoc.id)
    setEditDoc(null)
    showToast('success', 'แก้ไขชื่อเรียบร้อย')
    fetchDocs()
  }

  async function handleDelete(doc) {
    await supabase.from('documents').delete().eq('id', doc.id)
    try {
      const path = doc.file_url.split('/contracts-docs/')[1]
      if (path) await supabase.storage.from('contracts-docs').remove([path])
    } catch (_) {}
    setDeleteConfirm(null)
    showToast('success', 'ลบเอกสารเรียบร้อย')
    fetchDocs()
  }

  return (
    <div className="space-y-5">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg
                         text-sm font-medium flex items-center gap-2 ${
          toast.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {toast.type === 'success' ? '✓' : '⚠'} {toast.msg}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">เอกสารทั้งหมด {docs.length} รายการ</p>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white
                     text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          เพิ่มเอกสาร
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-400 text-sm">กำลังโหลด...</p>
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3
                        bg-white rounded-xl border border-slate-200">
          <svg className="w-10 h-10 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293
                 l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-slate-400 text-sm">ยังไม่มีเอกสาร</p>
          <button onClick={openAdd} className="text-blue-600 text-sm underline">
            เพิ่มเอกสารแรก
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['ชื่อเอกสาร', 'วันที่อัปโหลด', 'ขนาดไฟล์', 'ผู้บันทึก', 'จัดการ'].map(h => (
                    <th key={h}
                      className="px-4 py-3 text-left text-xs font-medium text-slate-500
                                 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docs.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center
                                        justify-center flex-shrink-0 border border-red-100">
                          <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414
                                 A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-slate-800 font-medium leading-tight">{doc.doc_name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{doc.file_name}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {formatDate(doc.uploaded_at)}
                    </td>

                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {formatFileSize(doc.file_size)}
                    </td>

                    <td className="px-4 py-3 text-slate-500 max-w-[140px] truncate">
                      {doc.uploaded_by || '—'}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">

                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="ดูเอกสาร">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943
                                 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </a>

                        <a href={doc.file_url} download={doc.file_name}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                          title="ดาวน์โหลด">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>

                        <button
                          onClick={() => setEditDoc({ id: doc.id, doc_name: doc.doc_name })}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                          title="แก้ไขชื่อ">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5
                                 m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        <button
                          onClick={() => setDeleteConfirm(doc)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="ลบ">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858
                                 L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: เพิ่มเอกสาร */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-medium text-slate-800">เพิ่มเอกสารใหม่</h3>
              <button onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">ชื่อเอกสาร *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="เช่น สัญญาเช่าบริหาร ฉบับที่ 1"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">เลือกไฟล์ PDF *</label>
                <label className={`flex flex-col items-center justify-center gap-2 w-full py-8 px-4
                                   border-2 border-dashed rounded-lg cursor-pointer transition-colors
                                   text-sm ${formFile
                                     ? 'border-blue-300 bg-blue-50 text-blue-700'
                                     : 'border-slate-200 text-slate-400 hover:border-blue-300 hover:bg-blue-50'
                                   }`}>
                  <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="truncate max-w-xs text-center">
                    {formFile ? formFile.name : 'คลิกเพื่อเลือกไฟล์ PDF'}
                  </span>
                  {formFile && (
                    <span className="text-xs opacity-70">{formatFileSize(formFile.size)}</span>
                  )}
                  <input type="file" accept=".pdf" className="hidden"
                    onChange={e => setFormFile(e.target.files[0] ?? null)} />
                </label>
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200
                           text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                ยกเลิก
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !formName.trim() || !formFile}
                className="flex-1 px-4 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800
                           text-white text-sm font-medium transition-colors disabled:opacity-50">
                {uploading ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: แก้ไขชื่อ */}
      {editDoc && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-medium text-slate-800 mb-4">แก้ไขชื่อเอกสาร</h3>
            <input
              type="text"
              value={editDoc.doc_name}
              onChange={e => setEditDoc(d => ({ ...d, doc_name: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 mb-5"
            />
            <div className="flex gap-3">
              <button onClick={() => setEditDoc(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200
                           text-sm text-slate-600 hover:bg-slate-50">
                ยกเลิก
              </button>
              <button onClick={handleEditSave}
                disabled={!editDoc.doc_name.trim()}
                className="flex-1 px-4 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800
                           text-white text-sm font-medium disabled:opacity-50">
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: ยืนยันลบ */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-medium text-slate-800 mb-2">ยืนยันการลบ</h3>
            <p className="text-sm text-slate-500 mb-1">
              ต้องการลบเอกสาร <strong className="text-slate-700">"{deleteConfirm.doc_name}"</strong> ?
            </p>
            <p className="text-xs text-slate-400 mb-5">ไฟล์จะถูกลบออกจากระบบและไม่สามารถกู้คืนได้</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200
                           text-sm text-slate-600 hover:bg-slate-50">
                ยกเลิก
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700
                           text-white text-sm font-medium">
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
