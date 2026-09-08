import { useState, useEffect } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Dashboard       from '../pages/Dashboard'
import Operations      from '../pages/Operations'
import WaterSales      from '../pages/WaterSales'
import Investments     from '../pages/Investments'
import Contracts       from '../pages/Contracts'
import AnnualReport    from '../pages/AnnualReport'
import Assets          from '../pages/Assets'
import AssetCategories from '../pages/AssetCategories'
import WaterOutages    from '../pages/WaterOutages'   // ++ เพิ่ม

const pageTitles = {
  '/':                 'Dashboard ภาพรวม',
  '/operations':       'สัญญาเช่าบริหารพื้นที่สัตหีบ',
  '/water-sales':      'ขายน้ำให้ กปภ.สาขาพัทยา',
  '/investments':      'การลงทุนตามสัญญา',
  '/contracts':        'รายละเอียดสัญญา',
  '/annual-report':    'บันทึกผลดำเนินงาน',
  '/assets':           'บัญชีรายการทรัพย์สิน',
  '/asset-categories': 'จัดการประเภททรัพย์สิน',
  '/water-outages':    'เหตุการณ์หยุดจ่ายน้ำ',        // ++ เพิ่ม
}

// เส้นทางที่ guest เข้าไม่ได้
// หมายเหตุ: ไม่ใส่ '/water-outages' ในนี้ เพราะ guest ควรดู dashboard/แผนที่/ตารางประวัติได้
// (แค่เขียนไม่ได้ ซึ่งบังคับจริงด้วย RLS ในฐานข้อมูล ไม่ใช่การกันทางหน้าเว็บ)
const ADMIN_ONLY_PATHS = ['/annual-report', '/asset-categories']

export default function MainLayout({ role }) {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Dashboard'
  const isGuest = role === 'guest'

  // ── Sidebar state ─────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768)

  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) setSidebarOpen(true)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ── Guard: guest พยายามเข้าหน้า admin-only → redirect ──
  if (isGuest && ADMIN_ONLY_PATHS.includes(location.pathname)) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex min-h-screen bg-slate-100">

      {/* ── Backdrop (mobile only) ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onToggle={() => setSidebarOpen(v => !v)}
        role={role}
      />

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              aria-label="toggle sidebar"
            >
              {sidebarOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            <div>
              <h1 className="text-slate-800 text-base font-medium">{title}</h1>
              <p className="text-slate-400 text-xs mt-0.5">
                รายงานผลการดำเนินงานกิจการประปาสัตหีบ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Badge แสดง role */}
            {isGuest ? (
              <>
                <span className="text-slate-500 text-xs hidden sm:block">ผู้เยี่ยมชม</span>
                <div className="w-8 h-8 bg-slate-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-medium">GS</span>
                </div>
              </>
            ) : (
              <>
                <span className="text-slate-500 text-xs hidden sm:block">ผู้ดูแลระบบ</span>
                <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-medium">AD</span>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Routes>
            <Route path="/"                  element={<Dashboard />} />
            <Route path="/operations"        element={<Operations />} />
            <Route path="/water-sales"       element={<WaterSales />} />
            <Route path="/investments"       element={<Investments />} />
            <Route path="/contracts"         element={<Contracts />} />
            <Route path="/annual-report"     element={<AnnualReport />} />
            <Route path="/assets"            element={<Assets />} />
            <Route path="/asset-categories"  element={<AssetCategories />} />
            <Route path="/water-outages"     element={<WaterOutages />} />  {/* ++ เพิ่ม */}
          </Routes>
        </main>

      </div>
    </div>
  )
}
