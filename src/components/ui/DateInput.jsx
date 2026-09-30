import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  MONTHS_TH_FULL, isoToThaiInput, thaiInputToIso, parseIso, toIsoDate,
} from '../../lib/thaiDate'

// ============================================================
// DateInput — ช่องวันที่ แสดง/พิมพ์เป็น dd/mm/yyyy (พ.ศ.) เหมือนกันทุกเครื่อง
//
// ใช้แทน <input type="date"> ได้ตรงๆ:
//   value    : 'YYYY-MM-DD' (ค.ศ.) หรือ ''   ← รูปแบบเดิม ไม่ต้องแก้ข้อมูล
//   onChange : (iso: string) => void          ← ส่ง 'YYYY-MM-DD' หรือ '' (ยังพิมพ์ไม่ครบ/ไม่ถูกต้อง)
//   name     : ถ้าส่งมา จะเรียก onChange แบบ event ({ target: { name, value } })
//              เพื่อใช้กับ handleChange(e) เดิมของหน้า Contracts / Investments ได้เลย
// ============================================================

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const POPOVER_W = 288
const POPOVER_H = 340

// ใส่ / ให้อัตโนมัติระหว่างพิมพ์: 05012569 → 05/01/2569
function autoFormat(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

export default function DateInput({
  value,
  onChange,
  name,
  required = false,
  disabled = false,
  className = '',
  minYearBE,
  maxYearBE,
}) {
  const [text, setText] = useState(isoToThaiInput(value))
  const [invalid, setInvalid] = useState(false)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [view, setView] = useState(() => initialView(value))

  const inputRef = useRef(null)
  const wrapRef = useRef(null)
  const popRef = useRef(null)
  const lastEmitted = useRef(value || '')

  const nowBE = new Date().getFullYear() + 543
  const minBE = minYearBE ?? 2540
  const maxBE = maxYearBE ?? nowBE + 10

  // ค่าจากภายนอกเปลี่ยน (โหลดข้อมูลแก้ไข / reset ฟอร์ม) → อัปเดตข้อความ
  useEffect(() => {
    if ((value || '') !== lastEmitted.current) {
      lastEmitted.current = value || ''
      setText(isoToThaiInput(value))
      setInvalid(false)
    }
  }, [value])

  // แจ้ง browser ว่าค่าไม่ถูกต้อง → ฟอร์มจะไม่ submit และขึ้นข้อความเตือน
  useEffect(() => {
    inputRef.current?.setCustomValidity(invalid ? 'วันที่ไม่ถูกต้อง — กรอกเป็น วว/ดด/ปปปป (พ.ศ.)' : '')
  }, [invalid])

  function emit(iso) {
    lastEmitted.current = iso
    if (name) onChange({ target: { name, value: iso } })
    else onChange(iso)
  }

  function handleType(e) {
    const t = autoFormat(e.target.value)
    setText(t)
    const iso = t.length === 10 ? thaiInputToIso(t) : null
    setInvalid(t.length === 10 && !iso)
    emit(iso || '')
  }

  function handleBlur() {
    if (text === '') return setInvalid(false)
    const iso = thaiInputToIso(text)
    if (iso) setText(isoToThaiInput(iso)) // เช่น พิมพ์ปี ค.ศ. มา → แสดงเป็น พ.ศ.
    setInvalid(!iso)
  }

  // ── Popover ─────────────────────────────────────────────
  function openPopover() {
    if (disabled) return
    const r = wrapRef.current.getBoundingClientRect()
    const below = window.innerHeight - r.bottom
    const top = below < POPOVER_H + 8 && r.top > POPOVER_H ? r.top - POPOVER_H - 4 : r.bottom + 4
    const left = Math.min(r.left, window.innerWidth - POPOVER_W - 8)
    setPos({ top, left: Math.max(8, left) })
    setView(initialView(lastEmitted.current))
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (popRef.current?.contains(e.target) || wrapRef.current?.contains(e.target)) return
      setOpen(false)
    }
    function onScroll(e) {
      if (popRef.current?.contains(e.target)) return
      setOpen(false)
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    function onResize() { setOpen(false) }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function pick(iso) {
    setText(isoToThaiInput(iso))
    setInvalid(false)
    emit(iso)
    setOpen(false)
    inputRef.current?.focus()
  }

  function shiftMonth(delta) {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  // ── Calendar grid ──
  const firstDow = new Date(view.y, view.m, 1).getDay()
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const selected = parseIso(lastEmitted.current)
  const today = new Date()
  const yearOptions = Array.from({ length: maxBE - minBE + 1 }, (_, i) => maxBE - i)

  const baseCls =
    'w-full pl-3 pr-9 py-2 rounded-lg border text-sm bg-white text-slate-800 placeholder-slate-300 ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400'

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        name={name}
        value={text}
        onChange={handleType}
        onBlur={handleBlur}
        placeholder="วว/ดด/ปปปป"
        required={required}
        disabled={disabled}
        autoComplete="off"
        className={`${baseCls} ${invalid ? 'border-red-300 focus:ring-red-400' : 'border-slate-200'} ${className}`}
      />
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPopover())}
        disabled={disabled}
        tabIndex={-1}
        aria-label="เลือกวันที่จากปฏิทิน"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-blue-600 disabled:opacity-40"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={popRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: POPOVER_W, zIndex: 100 }}
          className="bg-white rounded-xl border border-slate-200 shadow-xl p-3"
        >
          {/* header: เดือน / ปี */}
          <div className="flex items-center gap-1 mb-2">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="เดือนก่อนหน้า"
              className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <select value={view.m} onChange={(e) => setView((v) => ({ ...v, m: Number(e.target.value) }))}
              className="flex-1 text-sm px-1 py-1 rounded-md border border-slate-200 bg-white text-slate-700">
              {MONTHS_TH_FULL.map((mName, i) => <option key={i} value={i}>{mName}</option>)}
            </select>
            <select value={view.y + 543} onChange={(e) => setView((v) => ({ ...v, y: Number(e.target.value) - 543 }))}
              className="w-20 text-sm px-1 py-1 rounded-md border border-slate-200 bg-white text-slate-700">
              {!yearOptions.includes(view.y + 543) && <option value={view.y + 543}>{view.y + 543}</option>}
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="เดือนถัดไป"
              className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* ตารางวัน */}
          <div className="grid grid-cols-7 text-center text-xs">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className={`py-1 font-medium ${i === 0 ? 'text-red-400' : 'text-slate-400'}`}>{w}</div>
            ))}
            {cells.map((d, i) => {
              if (d === null) return <div key={`e${i}`} />
              const isSel = selected && selected.y === view.y && selected.m === view.m + 1 && selected.d === d
              const isToday = today.getFullYear() === view.y && today.getMonth() === view.m && today.getDate() === d
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => pick(toIsoDate(new Date(view.y, view.m, d)))}
                  className={`h-8 rounded-md text-sm transition-colors ${
                    isSel
                      ? 'bg-blue-600 text-white font-medium'
                      : isToday
                        ? 'text-blue-700 font-semibold ring-1 ring-inset ring-blue-300 hover:bg-blue-50'
                        : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {d}
                </button>
              )
            })}
          </div>

          {/* footer */}
          <div className="flex justify-between mt-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => pick(toIsoDate(new Date()))}
              className="text-xs px-2 py-1 rounded-md text-blue-600 hover:bg-blue-50">
              วันนี้
            </button>
            {!required && (
              <button type="button"
                onClick={() => { setText(''); setInvalid(false); emit(''); setOpen(false) }}
                className="text-xs px-2 py-1 rounded-md text-slate-500 hover:bg-slate-100">
                ล้างค่า
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function initialView(iso) {
  const p = parseIso(iso)
  if (p) return { y: p.y, m: p.m - 1 }
  const t = new Date()
  return { y: t.getFullYear(), m: t.getMonth() }
}
