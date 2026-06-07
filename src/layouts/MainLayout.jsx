import { useState, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Dashboard       from '../pages/Dashboard'
import Operations      from '../pages/Operations'
import WaterSales      from '../pages/WaterSales'
import Investments     from '../pages/Investments'
import Contracts       from '../pages/Contracts'
import AnnualReport    from '../pages/AnnualReport'
import Assets          from '../pages/Assets'
import AssetCategories from '../pages/AssetCategories'

const pageTitles = {
  '/':                 'Dashboard ภาพรวม',
  '/operations':       'สัญญาเช่าบริหารพื้นที่สัตหีบ',
  '/water-sales':      'ขายน้ำให้ กปภ.สาขาพัทยา',
  '/investments':      'การลงทุนตามสัญญา',
  '/contracts':        'รายละเอียดสัญญา',
  '/annual-report':    'บันทึกผลดำเนินงาน',
  '/assets':           'บัญชีรายการทรัพย์สิน',
  '/asset-categories': 'จัดการประเภททรัพย์สิน',
}

export default function MainLayout() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Dashboard'

  // ── Sidebar state ─────────────────────────────────────
  // Desktop: เริ่มแบบกาง (true), Mobile: เริ่มแบบซ่อน (false)
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768)

  // ปิด sidebar อัตโนมัติเมื่อเปลี่ยนหน้าบน mobile
  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false)
  }, [location.pathname])

  // ปรับ default เมื่อ resize หน้าต่าง
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) setSidebarOpen(true)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
      />

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile / collapse toggle — desktop */}
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              aria-label="toggle sidebar"
            >
              {sidebarOpen ? (
                /* X icon */
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                /* Hamburger icon */
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
            <span className="text-slate-500 text-xs hidden sm:block">ผู้ดูแลระบบ</span>
            <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-medium">AD</span>
            </div>
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
          </Routes>
        </main>

      </div>
    </div>
  )
}
