import { useState, useEffect, useRef } from 'react'

// ============================================================
// TimeInput — ช่องเวลาแบบ 24 ชม. (HH:MM) เหมือนกันทุกเครื่อง ไม่มี AM/PM
//
// ใช้แทน <input type="time"> ได้ตรงๆ:
//   value    : 'HH:MM' หรือ ''
//   onChange : (time: string) => void  ← ส่ง 'HH:MM' หรือ '' (ยังพิมพ์ไม่ครบ/ไม่ถูกต้อง)
//   name     : ถ้าส่งมา จะเรียก onChange แบบ event ({ target: { name, value } })
// พิมพ์ตัวเลขติดกันได้ เช่น 0930 → 09:30
// ============================================================

function autoFormat(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

function toValidTime(t) {
  const m = /^(\d{2}):(\d{2})$/.exec(t)
  if (!m) return null
  const h = Number(m[1])
  const mi = Number(m[2])
  return h <= 23 && mi <= 59 ? t : null
}

export default function TimeInput({ value, onChange, name, required = false, disabled = false, className = '' }) {
  const [text, setText] = useState(value || '')
  const [invalid, setInvalid] = useState(false)
  const inputRef = useRef(null)
  const lastEmitted = useRef(value || '')

  useEffect(() => {
    if ((value || '') !== lastEmitted.current) {
      lastEmitted.current = value || ''
      setText(value || '')
      setInvalid(false)
    }
  }, [value])

  useEffect(() => {
    inputRef.current?.setCustomValidity(invalid ? 'เวลาไม่ถูกต้อง — กรอกเป็น ชช:นน (00:00–23:59)' : '')
  }, [invalid])

  function emit(v) {
    lastEmitted.current = v
    if (name) onChange({ target: { name, value: v } })
    else onChange(v)
  }

  function handleType(e) {
    const t = autoFormat(e.target.value)
    setText(t)
    const valid = t.length === 5 ? toValidTime(t) : null
    setInvalid(t.length === 5 && !valid)
    emit(valid || '')
  }

  function handleBlur() {
    if (text === '') return setInvalid(false)
    // พิมพ์มาแค่ชั่วโมง เช่น "9" หรือ "14" → เติมเป็น 09:00 / 14:00
    if (/^\d{1,2}$/.test(text)) {
      const t = `${text.padStart(2, '0')}:00`
      if (toValidTime(t)) {
        setText(t)
        setInvalid(false)
        emit(t)
        return
      }
    }
    setInvalid(!toValidTime(text))
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        name={name}
        value={text}
        onChange={handleType}
        onBlur={handleBlur}
        placeholder="ชช:นน"
        required={required}
        disabled={disabled}
        autoComplete="off"
        className={`w-full pl-3 pr-9 py-2 rounded-lg border text-sm bg-white text-slate-800 placeholder-slate-300
                    focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400
                    ${invalid ? 'border-red-300 focus:ring-red-400' : 'border-slate-200'} ${className}`}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">น.</span>
    </div>
  )
}
