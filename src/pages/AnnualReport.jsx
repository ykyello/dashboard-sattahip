import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ── ปีปฏิทิน ─────────────────────────────────────────────
const CURRENT_YEAR = new Date().getFullYear() + 543
const YEARS = Array.from({ length: CURRENT_YEAR - 2563 }, (_, i) => CURRENT_YEAR - i)

const MONTHS_TH = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน',
  'พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม',
  'กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
]

// ── Field groups (ใช้ id ตรงกับ column ใน Supabase) ────────
const FIELD_GROUPS = [
  {
    group: 'ปริมาณน้ำ',
    color: 'blue',
    fields: [
      { id: 'raw_water',   label: 'ปริมาณน้ำดิบ',              unit: 'ลบ.ม.',           type: 'number' },
      { id: 'produced',    label: 'ปริมาณน้ำผลิตจ่าย',         unit: 'ลบ.ม.',           type: 'number' },
      { id: 'local_vol',   label: 'ปริมาณน้ำจำหน่ายในพื้นที่', unit: 'ลบ.ม.',           type: 'number' },
      { id: 'pattaya_vol', label: 'ปริมาณน้ำส่ง กปภ.พัทยา',    unit: 'ลบ.ม.',           type: 'number' },
    ],
  },
  {
    group: 'รายได้',
    color: 'emerald',
    fields: [
      { id: 'rev_pattaya', label: 'รายได้ค่าน้ำ กปภ.พัทยา',   unit: 'บาท',             type: 'number' },
      { id: 'rev_local',   label: 'รายได้ค่าน้ำในพื้นที่',     unit: 'บาท',             type: 'number' },
      { id: 'discount',    label: 'หักส่วนลด',                 unit: 'บาท',             type: 'number' },
      { id: 'service_fee', label: 'ค่าบริการ',                 unit: 'บาท',             type: 'number' },
      { id: 'rev_net',     label: 'รายได้สุทธิ กปภ.พัทยา',    unit: 'บาท',             type: 'number' },
    ],
  },
  {
    group: 'ผลประโยชน์',
    color: 'amber',
    fields: [
      { id: 'benefit_rent', label: 'ผลประโยชน์ เช่าบริหาร (รายได้สุทธิ 7%)', unit: 'บาท', type: 'number' },
      { id: 'benefit',      label: 'ผลประโยชน์',               unit: 'บาท',             type: 'number' },
      { id: 'benefit_net',  label: 'ผลประโยชน์สุทธิ (กปภ.)',   unit: 'บาท',             type: 'number' },
    ],
  },
  {
    group: 'ผู้ใช้น้ำ',
    color: 'violet',
    fields: [
      { id: 'users_total', label: 'ผู้ใช้น้ำรวม',    unit: 'ราย',             type: 'integer' },
      { id: 'users_new',   label: 'ผู้ใช้น้ำรายใหม่', unit: 'ราย',             type: 'integer' },
    ],
  },
  {
    group: 'อัตรา',
    color: 'teal',
    fields: [
      { id: 'loss_total',  label: 'อัตราน้ำสูญเสียรวม',      unit: '%',               type: 'decimal' },
      { id: 'loss_dist',   label: 'อัตราน้ำสูญเสียระบบจ่าย', unit: '%',               type: 'decimal' },
      { id: 'usage_rate',  label: 'อัตราการใช้น้ำ',          unit: 'ลบ.ม./ราย/วัน',  type: 'decimal' },
    ],
  },
  {
    group: 'ข้อร้องเรียน',
    color: 'rose',
    fields: [
      { id: 'cmp_water_qty',  label: 'ด้านปริมาณน้ำ',     unit: 'เรื่อง', type: 'integer' },
      { id: 'cmp_pipe_small', label: 'ท่อแตก <50 มม.',    unit: 'เรื่อง', type: 'integer' },
      { id: 'cmp_pipe_large', label: 'ท่อแตก >50 มม.',    unit: 'เรื่อง', type: 'integer' },
      { id: 'cmp_water_qual', label: 'ด้านคุณภาพน้ำ',     unit: 'เรื่อง', type: 'integer' },
      { id: 'cmp_total',      label: 'รวมข้อร้องเรียน',   unit: 'เรื่อง', type: 'integer' },
    ],
  },
]

const ALL_FIELDS = FIELD_GROUPS.flatMap(g => g.fields)

// สร้าง form state ว่าง
function emptyForm() {
  return Object.fromEntries(ALL_FIELDS.map(f => [f.id, '']))
}

// color map
const GROUP_COLOR = {
  blue:    { header: 'bg-blue-50 border-blue-200',    dot: 'bg-blue-400',    label: 'text-blue-700'    },
  emerald: { header: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-400', label: 'text-emerald-700' },
  amber:   { header: 'bg-amber-50 border-amber-200',  dot: 'bg-amber-400',   label: 'text-amber-700'   },
  violet:  { header: 'bg-violet-50 border-violet-200',dot: 'bg-violet-400',  label: 'text-violet-700'  },
  teal:    { header: 'bg-teal-50 border-teal-200',    dot: 'bg-teal-400',    label: 'text-teal-700'    },
  rose:    { header: 'bg-rose-50 border-rose-200',    dot: 'bg-rose-400',    label: 'text-rose-700'    },
}

// parse string → number หรือ null
function parseVal(str, type) {
  if (str === '' || str === null || str === undefined) return null
  const n = type === 'integer' ? parseInt(str, 10) : parseFloat(str)
  return isNaN(n) ? null : n
}

// ─────────────────────────────────────────────────────────
export default function AnnualReport() {
  const [year,        setYear]        = useState(CURRENT_YEAR)
  const [month,       setMonth]       = useState(new Date().getMonth() + 1)
  const [form,        setForm]        = useState(emptyForm())
  const [loading,     setLoading]     = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [toast,       setToast]       = useState(null)   // { type: 'success'|'error', msg }
  const [existingId,  setExistingId]  = useState(null)   // id ถ้ามีข้อมูลอยู่แล้ว

  // โหลดข้อมูลทุกครั้งที่เปลี่ยน year/month
  const loadData = useCallback(async () => {
    setLoading(true)
    setExistingId(null)
    setForm(emptyForm())
    const { data, error } = await supabase
      .from('annual_report_data')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .maybeSingle()

    if (data) {
      setExistingId(data.id)
      const loaded = emptyForm()
      ALL_FIELDS.forEach(f => {
        loaded[f.id] = data[f.id] !== null && data[f.id] !== undefined
          ? String(data[f.id])
          : ''
      })
      setForm(loaded)
    }
    setLoading(false)
  }, [year, month])

  useEffect(() => { loadData() }, [loadData])

  function handleChange(id, val) {
    setForm(prev => ({ ...prev, [id]: val }))
  }

  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleSave() {
    setSaving(true)
    const payload = { year, month }
    ALL_FIELDS.forEach(f => {
      payload[f.id] = parseVal(form[f.id], f.type)
    })

    let error
    if (existingId) {
      // update
      ;({ error } = await supabase
        .from('annual_report_data')
        .update(payload)
        .eq('id', existingId))
    } else {
      // insert
      ;({ error } = await supabase
        .from('annual_report_data')
        .insert(payload))
    }

    setSaving(false)
    if (error) {
      showToast('error', `บันทึกไม่สำเร็จ: ${error.message}`)
    } else {
      showToast('success', `บันทึกข้อมูล ${MONTHS_TH[month - 1]} ${year} สำเร็จ`)
      loadData()
    }
  }

  async function handleDelete() {
    if (!existingId) return
    if (!window.confirm(`ลบข้อมูล ${MONTHS_TH[month - 1]} ${year} ใช่หรือไม่?`)) return
    setSaving(true)
    const { error } = await supabase
      .from('annual_report_data')
      .delete()
      .eq('id', existingId)
    setSaving(false)
    if (error) {
      showToast('error', `ลบไม่สำเร็จ: ${error.message}`)
    } else {
      showToast('success', 'ลบข้อมูลเรียบร้อย')
      loadData()
    }
  }

  const filledCount = ALL_FIELDS.filter(f => form[f.id] !== '').length

  return (
    <div className="space-y-5">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
          flex items-center gap-2 transition-all ${
          toast.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">บันทึกผลการดำเนินงานรายเดือน</h2>
          <p className="text-xs text-slate-400 mt-0.5">เลือกปีและเดือน แล้วกรอกข้อมูลด้านล่าง</p>
        </div>

        {/* Year + Month selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white
                       text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {YEARS.map(y => (
              <option key={y} value={y}>พ.ศ. {y}</option>
            ))}
          </select>

          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white
                       text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MONTHS_TH.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Status bar */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
        existingId
          ? 'bg-green-50 border-green-200 text-green-700'
          : 'bg-slate-50 border-slate-200 text-slate-500'
      }`}>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${existingId ? 'bg-green-400' : 'bg-slate-300'}`} />
        {loading ? (
          'กำลังโหลด...'
        ) : existingId ? (
          <>มีข้อมูลอยู่แล้ว · กรอกแล้ว {filledCount}/{ALL_FIELDS.length} รายการ · แก้ไขแล้วกด <strong>บันทึก</strong></>
        ) : (
          <>ยังไม่มีข้อมูล {MONTHS_TH[month - 1]} {year} · กรอกแล้วกด <strong>บันทึก</strong></>
        )}
      </div>

      {/* Form */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-slate-400 text-sm">กำลังโหลด...</p>
        </div>
      ) : (
        <div className="space-y-5">
          {FIELD_GROUPS.map(group => {
            const c = GROUP_COLOR[group.color]
            return (
              <div key={group.group} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Group header */}
                <div className={`px-5 py-3 border-b flex items-center gap-2 ${c.header}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                  <p className={`text-sm font-semibold ${c.label}`}>{group.group}</p>
                </div>

                {/* Fields grid */}
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.fields.map(field => (
                    <div key={field.id}>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {field.label}
                        <span className="ml-1 text-slate-400 font-normal">({field.unit})</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step={field.type === 'integer' ? '1' : 'any'}
                          value={form[field.id]}
                          onChange={e => handleChange(field.id, e.target.value)}
                          placeholder="—"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200
                                     text-slate-800 bg-white placeholder-slate-300
                                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {field.unit && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                            {field.unit}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Action buttons */}
      {!loading && (
        <div className="flex items-center justify-between pt-1">
          {existingId ? (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="text-xs text-red-500 hover:text-red-700 underline disabled:opacity-50 transition-colors"
            >
              ลบข้อมูลเดือนนี้
            </button>
          ) : <div />}

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors shadow-sm"
          >
            {saving ? 'กำลังบันทึก...' : existingId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
          </button>
        </div>
      )}
    </div>
  )
}
