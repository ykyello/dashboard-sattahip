import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'

const CAUSE_OPTIONS = ['ท่อแตก', 'ไฟดับ', 'ซ่อมบำรุง', 'งานก่อสร้าง', 'อื่นๆ']
const PAGE_SIZE = 20

// ── helpers ──────────────────────────────────────────────
const dmaNum = (code) => Number(String(code ?? '').replace(/\D/g, '')) || 0

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

function fmtTime(iso) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fmtMin(min) {
  if (min === null || min === undefined) return '—'
  const h = Math.floor(Math.abs(min) / 60)
  const m = Math.abs(min) % 60
  return h > 0 ? `${h} ชม. ${m} น.` : `${m} น.`
}

// รายการที่ยังต้องเติมข้อมูล (ส่วนใหญ่คือข้อมูลนำเข้าจาก Excel)
function missingFields(e) {
  const miss = []
  if (e.latitude === null || e.longitude === null) miss.push('พิกัด')
  if (e.announced_duration_min === null) miss.push('ระยะเวลาประกาศ')
  if (e.dma_list.length === 0) miss.push('DMA')
  return miss
}

const CAUSE_STYLE = {
  'ท่อแตก': 'bg-blue-100 text-blue-700',
  'ไฟดับ': 'bg-amber-100 text-amber-700',
  'ซ่อมบำรุง': 'bg-teal-100 text-teal-700',
  'งานก่อสร้าง': 'bg-violet-100 text-violet-700',
  'อื่นๆ': 'bg-slate-100 text-slate-600',
}

// ─────────────────────────────────────────────────────────
export default function OutageHistoryTab({ admin, refreshKey, onEdit }) {
  const [events, setEvents] = useState([])
  const [allDma, setAllDma] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [search, setSearch] = useState('')
  const [year, setYear] = useState('all')
  const [cause, setCause] = useState('all')
  const [dmaId, setDmaId] = useState('all')
  const [onlyIncomplete, setOnlyIncomplete] = useState(false)
  const [page, setPage] = useState(1)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchData() }, [refreshKey])

  async function fetchData() {
    setLoading(true)
    setLoadError(null)
    const [evRes, dmaRes] = await Promise.all([
      supabase
        .from('water_outage_events')
        .select(`
          *,
          water_outage_event_dma ( dma ( id, dma_code, dma_name ) ),
          water_outage_documents ( id, file_name, file_url, file_type, file_size )
        `)
        .order('start_at', { ascending: false }),
      supabase.from('dma').select('id, dma_code, dma_name').eq('active', true),
    ])

    if (evRes.error) {
      setLoadError(evRes.error.message)
      setLoading(false)
      return
    }

    const mapped = (evRes.data || []).map((e) => ({
      ...e,
      // รูปแบบที่ OutageFormModal ต้องการ: event.dma_list, event.documents
      dma_list: (e.water_outage_event_dma || [])
        .map((x) => x.dma)
        .filter(Boolean)
        .sort((a, b) => dmaNum(a.dma_code) - dmaNum(b.dma_code)),
      documents: e.water_outage_documents || [],
    }))

    setEvents(mapped)
    setAllDma((dmaRes.data || []).sort((a, b) => dmaNum(a.dma_code) - dmaNum(b.dma_code)))
    setLoading(false)
  }

  // ── ตัวเลือกปี พ.ศ. จากข้อมูลจริง ──
  const yearOptions = useMemo(() => {
    const set = new Set(events.map((e) => new Date(e.start_at).getFullYear() + 543))
    return [...set].sort((a, b) => b - a)
  }, [events])

  const incompleteCount = useMemo(() => events.filter((e) => missingFields(e).length > 0).length, [events])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return events.filter((e) => {
      if (year !== 'all' && new Date(e.start_at).getFullYear() + 543 !== Number(year)) return false
      if (cause !== 'all' && e.cause !== cause) return false
      if (dmaId !== 'all' && !e.dma_list.some((d) => d.id === dmaId)) return false
      if (onlyIncomplete && missingFields(e).length === 0) return false
      if (q) {
        const hay = [e.location_name, e.pipeline_line, e.affected_area, e.pipe_type, e.notes]
          .filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [events, search, year, cause, dmaId, onlyIncomplete])

  // กลับไปหน้า 1 เมื่อเปลี่ยนตัวกรอง
  useEffect(() => { setPage(1) }, [search, year, cause, dmaId, onlyIncomplete])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function dmaLabel(list) {
    if (list.length === 0) return <span className="text-slate-300">—</span>
    if (allDma.length > 0 && list.length >= allDma.length) return 'ทุก DMA'
    return 'DMA ' + list.map((d) => dmaNum(d.dma_code)).join(', ')
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    // ลบไฟล์แนบใน storage ด้วย (แถวใน water_outage_documents / event_dma ถูกลบตาม cascade)
    const paths = deleteTarget.documents
      .map((d) => d.file_url.split('/outage-docs/')[1])
      .filter(Boolean)
      .map(decodeURIComponent)
    if (paths.length > 0) await supabase.storage.from('outage-docs').remove(paths)

    const { error } = await supabase.from('water_outage_events').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    if (error) {
      setLoadError(`ลบไม่สำเร็จ: ${error.message}`)
      return
    }
    fetchData()
  }

  const selectCls = 'text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 bg-white rounded-xl border border-slate-200">
        <p className="text-slate-400 text-sm">กำลังโหลด...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{loadError}</div>
      )}

      {/* ── Filters ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาสถานที่ เส้นท่อ ตำบล หมายเหตุ"
            className={`${selectCls} flex-1 min-w-[200px]`}
          />
          <select value={year} onChange={(e) => setYear(e.target.value)} className={selectCls}>
            <option value="all">ทุกปี</option>
            {yearOptions.map((y) => <option key={y} value={y}>พ.ศ. {y}</option>)}
          </select>
          <select value={cause} onChange={(e) => setCause(e.target.value)} className={selectCls}>
            <option value="all">ทุกสาเหตุ</option>
            {CAUSE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={dmaId} onChange={(e) => setDmaId(e.target.value)} className={selectCls}>
            <option value="all">ทุก DMA</option>
            {allDma.map((d) => <option key={d.id} value={d.id}>{d.dma_name || d.dma_code}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <p className="text-slate-500">
            แสดง {filtered.length} จาก {events.length} รายการ
          </p>
          {incompleteCount > 0 && (
            <label className="flex items-center gap-2 text-amber-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyIncomplete}
                onChange={(e) => setOnlyIncomplete(e.target.checked)}
                className="rounded border-slate-300"
              />
              เฉพาะรายการที่ข้อมูลยังไม่ครบ ({incompleteCount})
            </label>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 bg-white rounded-xl border border-slate-200 gap-1">
          <p className="text-slate-400 text-sm">
            {events.length === 0 ? 'ยังไม่มีเหตุการณ์หยุดจ่ายน้ำ' : 'ไม่พบรายการที่ตรงกับตัวกรอง'}
          </p>
          {events.length === 0 && admin && (
            <p className="text-slate-300 text-xs">กดปุ่ม เพิ่มเหตุการณ์ ด้านบนเพื่อเริ่มบันทึก</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-xs text-slate-500">
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">วันที่</th>
                  <th className="px-4 py-3 text-left font-medium">สถานที่</th>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">สาเหตุ</th>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">เส้นท่อ / ท่อ</th>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">DMA</th>
                  <th className="px-4 py-3 text-right font-medium whitespace-nowrap">ประกาศ</th>
                  <th className="px-4 py-3 text-right font-medium whitespace-nowrap">ซ่อมจริง</th>
                  {admin && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.map((e) => {
                  const miss = missingFields(e)
                  const pipe = [e.pipe_type, e.pipe_size ? `Ø${e.pipe_size}` : null].filter(Boolean).join(' ')
                  return (
                    <tr key={e.id} className="hover:bg-slate-50 align-top">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-slate-700 font-medium">{fmtDate(e.start_at)}</p>
                        <p className="text-xs text-slate-400">
                          {e.announced_duration_min === null && fmtTime(e.start_at) === '00:00' ? 'ไม่ระบุเวลา' : `${fmtTime(e.start_at)} น.`}
                        </p>
                      </td>
                      <td className="px-4 py-3 min-w-[220px]">
                        <p className="text-slate-700">{e.location_name}</p>
                        {e.affected_area && <p className="text-xs text-slate-400">{e.affected_area}</p>}
                        {miss.length > 0 && (
                          <p className="text-xs text-amber-600 mt-1">ยังไม่มี: {miss.join(', ')}</p>
                        )}
                        {e.documents.length > 0 && (
                          <div className="flex flex-wrap gap-x-3 mt-1">
                            {e.documents.map((d) => (
                              <a key={d.id} href={d.file_url} target="_blank" rel="noopener noreferrer"
                                 className="text-xs text-blue-600 hover:underline truncate max-w-[160px]">
                                {d.file_name}
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAUSE_STYLE[e.cause] ?? CAUSE_STYLE['อื่นๆ']}`}>
                          {e.cause}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        <p>{e.pipeline_line || <span className="text-slate-300">—</span>}</p>
                        {pipe && <p className="text-xs text-slate-400">{pipe}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs min-w-[90px]">{dmaLabel(e.dma_list)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-slate-600">
                        {fmtMin(e.announced_duration_min)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {e.actual_duration_min !== null ? (
                          <>
                            <p className="text-slate-700">{fmtMin(e.actual_duration_min)}</p>
                            {e.variance_min !== null && (
                              <p className={`text-xs ${e.variance_min > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {e.variance_min > 0 ? `ช้า ${fmtMin(e.variance_min)}` : e.variance_min < 0 ? `เร็ว ${fmtMin(e.variance_min)}` : 'ตรงเวลา'}
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      {admin && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => onEdit(e)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="แก้ไข"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteTarget(e)}
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
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs">
              <p className="text-slate-500">หน้า {page} / {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  ก่อนหน้า
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modal ยืนยันลบ ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-medium text-slate-800 mb-2">ยืนยันการลบ</h3>
            <p className="text-sm text-slate-500 mb-1">
              {fmtDate(deleteTarget.start_at)} · {deleteTarget.location_name}
            </p>
            <p className="text-sm text-slate-500 mb-5">
              ข้อมูล การผูก DMA และไฟล์แนบทั้งหมดจะถูกลบและไม่สามารถกู้คืนได้
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50"
              >
                {deleting ? 'กำลังลบ...' : 'ลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
