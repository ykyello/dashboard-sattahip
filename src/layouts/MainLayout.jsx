import { Routes, Route, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Dashboard    from '../pages/Dashboard'
import Operations   from '../pages/Operations'
import WaterSales   from '../pages/WaterSales'
import Investments  from '../pages/Investments'
import Contracts    from '../pages/Contracts'
import AnnualReport from '../pages/AnnualReport'
import Assets           from '../pages/Assets'
import AssetCategories  from '../pages/AssetCategories'  // ++ เพิ่ม

const pageTitles = {
  '/':              'Dashboard ภาพรวม',
  '/operations':    'สัญญาเช่าบริหารพื้นที่สัตหีบ',
  '/water-sales':   'ขายน้ำให้ กปภ.สาขาพัทยา',
  '/investments':   'การลงทุนตามสัญญา',
  '/contracts':     'รายละเอียดสัญญา',
  '/annual-report': 'บันทึกผลดำเนินงาน',
  '/assets':            'บัญชีรายการทรัพย์สิน',
  '/asset-categories': 'จัดการประเภททรัพย์สิน',   // ++ เพิ่ม
}

export default function MainLayout() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Dashboard'

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-slate-800 text-base font-medium">{title}</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              รายงานผลการดำเนินงานกิจการประปาสัตหีบ
            </p>
          </div>
          <div className="flex items-center gap-3">
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
            <Route path="/assets"            element={<Assets />} />
            <Route path="/asset-categories" element={<AssetCategories />} />  {/* ++ เพิ่ม */}
          </Routes>
        </main>

      </div>
    </div>
  )
}
