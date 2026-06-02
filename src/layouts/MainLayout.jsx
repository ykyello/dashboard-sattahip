import { useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Dashboard    from '../pages/Dashboard'
import Operations   from '../pages/Operations'
import WaterSales   from '../pages/WaterSales'
import Investments  from '../pages/Investments'
import Contracts    from '../pages/Contracts'
import AnnualReport from '../pages/AnnualReport'

const pageTitles = {
  '/':              'Dashboard ภาพรวม',
  '/operations':    'สัญญาเช่าบริหารพื้นที่สัตหีบ',
  '/water-sales':   'ขายน้ำให้ กปภ.สาขาพัทยา',
  '/investments':   'การลงทุนตามสัญญา',
  '/contracts':     'เอกสารสัญญา',
  '/annual-report': 'บันทึกผลดำเนินงาน',
}

export default function MainLayout() {
  const location = useLocation()
  const title    = pageTitles[location.pathname] || 'Dashboard'
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex min-h-screen bg-slate-100">

      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 flex-shrink-0">

          {/* Toggle button */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0"
            title={sidebarOpen ? 'ซ่อนเมนู' : 'แสดงเมนู'}
          >
            {sidebarOpen ? (
              /* X / close icon */
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              /* hamburger icon */
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-slate-800 text-base font-medium truncate">{title}</h1>
            <p className="text-slate-400 text-xs mt-0.5">รายงานผลการดำเนินงานกิจการประปาสัตหีบ</p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-slate-500 text-xs hidden sm:block">ผู้ดูแลระบบ</span>
            <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-medium">AD</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/"               element={<Dashboard />} />
            <Route path="/operations"     element={<Operations />} />
            <Route path="/water-sales"    element={<WaterSales />} />
            <Route path="/investments"    element={<Investments />} />
            <Route path="/contracts"      element={<Contracts />} />
            <Route path="/annual-report"  element={<AnnualReport />} />
          </Routes>
        </main>

      </div>
    </div>
  )
}
