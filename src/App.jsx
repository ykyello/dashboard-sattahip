import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import MainLayout from './layouts/MainLayout'
import Login from './pages/Login'

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-400 text-sm">กำลังโหลด...</p>
      </div>
    )
  }

  // เช็ค role จาก email (admin@1107.pwa = admin, อื่นๆ = guest)
  const ADMIN_EMAIL = 'admin@1107.pwa'
  const role = session?.user?.email === ADMIN_EMAIL ? 'admin' : 'guest'

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={session ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/*"
          element={
            session
              ? <MainLayout role={role} />
              : <Navigate to="/login" replace />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
