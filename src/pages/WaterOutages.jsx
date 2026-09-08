import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { isAdmin } from '../lib/permissions'
import OutageFormModal from '../components/outages/OutageFormModal'
// Tab components (ขั้นถัดไป): OutageDashboardTab, OutageMapTab, OutageHistoryTab

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'map', label: 'แผนที่' },
  { id: 'history', label: 'ตารางประวัติ' },
]

export default function WaterOutages() {
  const [tab, setTab] = useState('dashboard')
  const [admin, setAdmin] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editEvent, setEditEvent] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setAdmin(isAdmin(session)))
  }, [])

  function openAdd() {
    setEditEvent(null)
    setShowForm(true)
  }

  // เรียกจาก OutageHistoryTab เมื่อกดปุ่มแก้ไขแถว (ยังไม่ได้สร้าง component นี้ในขั้นนี้)
  function openEdit(event) {
    setEditEvent(event)
    setShowForm(true)
  }

  function handleSaved() {
    setShowForm(false)
    setRefreshKey((k) => k + 1) // ส่งสัญญาณให้ tab ที่ active fetch ใหม่
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs w-fit">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 transition-colors ${i > 0 ? 'border-l border-slate-200' : ''} ${
                tab === t.id ? 'bg-blue-600 text-white font-medium' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ปุ่มนี้ซ่อนไว้เพื่อ UX เท่านั้น — สิทธิ์จริงถูกบังคับด้วย RLS ที่ระดับฐานข้อมูล
            (guest ที่เปิด devtools ยิง insert ตรงจะถูก Supabase ปฏิเสธเสมอ ไม่ขึ้นกับค่านี้) */}
        {admin && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white
                       text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            เพิ่มเหตุการณ์
          </button>
        )}
      </div>

      {tab === 'dashboard' && (
        <div className="text-sm text-slate-400 bg-white rounded-xl border border-slate-200 p-8 text-center">
          OutageDashboardTab — พัฒนาในขั้นถัดไป (KPI cards, ranking, กราฟ Recharts จาก outageStats.js)
        </div>
      )}
      {tab === 'map' && (
        <div className="text-sm text-slate-400 bg-white rounded-xl border border-slate-200 p-8 text-center">
          OutageMapTab — พัฒนาในขั้นถัดไป (react-leaflet, marker/heatmap toggle จาก locationUtils.js)
        </div>
      )}
      {tab === 'history' && (
        <div className="text-sm text-slate-400 bg-white rounded-xl border border-slate-200 p-8 text-center">
          OutageHistoryTab — พัฒนาในขั้นถัดไป (รับ props: admin, refreshKey, onEdit=openEdit)
        </div>
      )}

      {showForm && <OutageFormModal event={editEvent} onClose={() => setShowForm(false)} onSaved={handleSaved} />}
    </div>
  )
}
