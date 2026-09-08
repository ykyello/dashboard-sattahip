import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const menuItems = [
  {
    path: '/',
    end: true,
    label: 'Dashboard',
    adminOnly: false,
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
      </svg>
    ),
  },
  {
    path: '/operations',
    end: false,
    label: 'สัญญาให้สิทธิเช่าบริหารและดำเนินกิจการระบบประปาสัตหีบ',
    adminOnly: false,
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    path: '/water-sales',
    end: false,
    label: 'สัญญาซื้อขายน้ำประปาเพื่อกปภ.สาขาพัทยา(พ.)',
    adminOnly: false,
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 2c0 0-8 6-8 11a8 8 0 0016 0c0-5-8-11-8-11z" />
      </svg>
    ),
  },
  {
    path: '/investments',
    end: false,
    label: 'การลงทุนตามสัญญา',
    adminOnly: false,
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    path: '/contracts',
    end: false,
    label: 'รายละเอียดสัญญา',
    adminOnly: false,
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    path: '/assets',
    end: false,
    label: 'บัญชีรายการทรัพย์สิน',
    adminOnly: false,
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  // ── เพิ่มใหม่: เหตุการณ์หยุดจ่ายน้ำ (ไม่ adminOnly — guest ดู dashboard/แผนที่/ตารางได้ แค่เขียนไม่ได้ ซึ่ง RLS บังคับจริงอยู่แล้ว) ──
  {
    path: '/water-outages',
    end: false,
    label: 'เหตุการณ์หยุดจ่ายน้ำ',
    adminOnly: false,
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  // ── admin only ──────────────────────────────────────────
  {
    path: '/annual-report',
    end: false,
    label: 'บันทึกผลดำเนินงาน',
    adminOnly: true,
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    path: '/asset-categories',
    end: false,
    label: 'จัดการประเภททรัพย์สิน',
    adminOnly: true,
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
]

// ── props: open, onClose, onToggle, role ─────────────────
export default function Sidebar({ open, onClose, role }) {
  const navigate = useNavigate()
  const isGuest  = role === 'guest'

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  // กรองเมนูตาม role
  const visibleItems = menuItems.filter(item => !(isGuest && item.adminOnly))

  return (
    <>
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-30
          flex flex-col bg-blue-950
          transition-all duration-300 ease-in-out
          ${open ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:w-0 md:translate-x-0 md:overflow-hidden'}
        `}
      >
        {/* ── Logo ── */}
        <div className="px-4 py-5 border-b border-blue-900 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-800 rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-700">
              <svg className="w-5 h-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 2c0 0-8 6-8 11a8 8 0 0016 0c0-5-8-11-8-11z" />
              </svg>
            </div>
            <div className="whitespace-nowrap overflow-hidden">
              <p className="text-white text-xs font-medium leading-tight">กิจการประปา</p>
              <p className="text-blue-400 text-xs">สัตหีบ</p>
            </div>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
          <p className="text-blue-600 text-xs px-2 mb-2 tracking-widest uppercase whitespace-nowrap">เมนู</p>
          {visibleItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => {
                if (window.innerWidth < 768) onClose()
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 ${
                  isActive
                    ? 'bg-blue-700 text-white'
                    : 'text-blue-300 hover:bg-blue-900 hover:text-white'
                }`
              }
            >
              {item.icon}
              <span className="leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* ── Logout ── */}
        <div className="px-3 py-4 border-t border-blue-900 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                       text-blue-400 hover:bg-blue-900 hover:text-red-400 transition-colors duration-150"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="whitespace-nowrap">ออกจากระบบ</span>
          </button>
        </div>
      </aside>
    </>
  )
}
