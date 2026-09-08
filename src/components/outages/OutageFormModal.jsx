import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import DmaMultiSelect from './DmaMultiSelect'
import LocationPicker from './LocationPicker'
import { formatVariance } from '../../lib/outageStats'

const CAUSE_OPTIONS = ['ท่อแตก', 'ไฟดับ', 'ซ่อมบำรุง', 'งานก่อสร้าง', 'อื่นๆ']
const PIPE_TYPE_OPTIONS = ['PVC', 'HDPE', 'AC', 'Steel', 'อื่นๆ']
const PIPE_SIZE_OPTIONS = [100, 150, 200, 250, 300, 400]

const emptyForm = {
  event_date: '',
  event_time: '',
  announced_hours: '',
  announced_minutes: '',
  completion_date: '',
  completion_time: '',
  location_name: '',
  latitude: '',
  longitude: '',
  pipeline_line: '',
  pipe_size: '',
  pipe_size_custom: '',
  pipe_type: 'PVC',
  cause: 'ท่อแตก',
  affected_area: '',
  affected_users: '',
  notes: '',
}

function toDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null
  return new Date(`${dateStr}T${timeStr}:00`)
}

export default function OutageFormModal({ event, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [dmaList, setDmaList] = useState([])
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (event) {
      const start = new Date(event.start_at)
      const completion = event.actual_completion_at ? new Date(event.actual_completion_at) : null
      const sizeIsPreset = PIPE_SIZE_OPTIONS.includes(event.pipe_size)
      setForm({
        event_date: start.toISOString().slice(0, 10),
        event_time: start.toISOString().slice(11, 16),
        announced_hours: String(Math.floor(event.announced_duration_min / 60)),
        announced_minutes: String(event.announced_duration_min % 60),
        completion_date: completion ? completion.toISOString().slice(0, 10) : '',
        completion_time: completion ? completion.toISOString().slice(11, 16) : '',
        location_name: event.location_name || '',
        latitude: event.latitude ?? '',
        longitude: event.longitude ?? '',
        pipeline_line: event.pipeline_line || '',
        pipe_size: sizeIsPreset ? String(event.pipe_size) : event.pipe_size ? 'custom' : '',
        pipe_size_custom: sizeIsPreset ? '' : String(event.pipe_size ?? ''),
        pipe_type: event.pipe_type || 'PVC',
        cause: event.cause || 'ท่อแตก',
        affected_area: event.affected_area || '',
        affected_users: event.affected_users ?? '',
        notes: event.notes || '',
      })
      setDmaList(event.dma_list || [])
    } else {
      setForm(emptyForm)
      setDmaList([])
    }
    setFiles([])
    setError(null)
  }, [event])

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }))
  }

  // ── preview คำนวณระยะเวลา (แสดงผลเฉยๆ ก่อนบันทึก — ค่าจริงถูกคำนวณโดย generated column ในฐานข้อมูล) ──
  const startPreview = toDateTime(form.event_date, form.event_time)
  const completionPreview = toDateTime(form.completion_date, form.completion_time)
  let previewText = null
  if (startPreview && completionPreview && form.announced_hours !== '') {
    const actualMin = Math.round((completionPreview - startPreview) / 60000)
    const announcedMin = (Number(form.announced_hours) || 0) * 60 + (Number(form.announced_minutes) || 0)
    const h = Math.floor(Math.abs(actualMin) / 60)
    const m = Math.abs(actualMin) % 60
    previewText = {
      duration: `${h} ชม. ${m} นาที`,
      variance: formatVariance(actualMin - announcedMin),
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setError(null)

    if (!startPreview) return setError('กรุณากรอกวันที่และเวลาเกิดเหตุ')
    if (form.latitude === '' || form.longitude === '') return setError('กรุณาระบุพิกัด (กรอกเองหรือคลิกปักหมุด)')
    if (dmaList.length === 0) return setError('กรุณาเลือก DMA อย่างน้อย 1 พื้นที่')

    setSaving(true)

    const announcedMin = (Number(form.announced_hours) || 0) * 60 + (Number(form.announced_minutes) || 0)
    const pipeSize =
      form.pipe_size === 'custom'
        ? form.pipe_size_custom
          ? Number(form.pipe_size_custom)
          : null
        : form.pipe_size
        ? Number(form.pipe_size)
        : null

    const payload = {
      start_at: startPreview.toISOString(),
      announced_duration_min: announcedMin,
      actual_completion_at: completionPreview ? completionPreview.toISOString() : null,
      location_name: form.location_name,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      pipeline_line: form.pipeline_line || null,
      pipe_size: pipeSize,
      pipe_type: form.pipe_type || null,
      cause: form.cause,
      affected_area: form.affected_area || null,
      affected_users: form.affected_users !== '' ? Number(form.affected_users) : null,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    }

    let eventId = event?.id
    let saveError

    if (eventId) {
      ;({ error: saveError } = await supabase.from('water_outage_events').update(payload).eq('id', eventId))
    } else {
      const { data, error: insertError } = await supabase
        .from('water_outage_events')
        .insert([payload])
        .select('id')
        .single()
      saveError = insertError
      eventId = data?.id
    }

    if (saveError) {
      setSaving(false)
      // ถ้า guest พยายามบันทึก RLS จะปฏิเสธตรงนี้ (error 42501) — ข้อความจาก Supabase จะสื่อสารตรงตัว
      return setError(`บันทึกไม่สำเร็จ: ${saveError.message}`)
    }

    // sync ความสัมพันธ์ DMA: ลบของเดิมแล้ว insert ใหม่ทั้งหมด (ง่ายกว่า diff และพอเพียงกับสเกลนี้)
    await supabase.from('water_outage_event_dma').delete().eq('event_id', eventId)
    await supabase.from('water_outage_event_dma').insert(dmaList.map((d) => ({ event_id: eventId, dma_id: d.id })))

    // อัปโหลดไฟล์แนบใหม่ (ถ้ามี) — ไฟล์เดิมยังอยู่ ไฟล์ใหม่ถูกเพิ่มเข้าไป
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const filePath = `${eventId}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('outage-docs').upload(filePath, file)
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('outage-docs').getPublicUrl(filePath)
        await supabase.from('water_outage_documents').insert([
          {
            event_id: eventId,
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_type: ext.toLowerCase(),
            file_size: file.size,
          },
        ])
      }
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="text-base font-medium text-slate-800">
            {event ? 'แก้ไขเหตุการณ์หยุดจ่ายน้ำ' : 'เพิ่มเหตุการณ์หยุดจ่ายน้ำ'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="px-6 py-5 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          {/* 1. วันเวลา */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">1. วันเวลา</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">วันที่เกิดเหตุ *</label>
                <input
                  type="date"
                  required
                  value={form.event_date}
                  onChange={(e) => set('event_date', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">เวลา *</label>
                <input
                  type="time"
                  required
                  value={form.event_time}
                  onChange={(e) => set('event_time', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">ระยะเวลาซ่อมตามประกาศ *</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  required
                  value={form.announced_hours}
                  onChange={(e) => set('announced_hours', e.target.value)}
                  placeholder="ชม."
                  className="w-24 px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
                <span className="text-xs text-slate-400">ชม.</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={form.announced_minutes}
                  onChange={(e) => set('announced_minutes', e.target.value)}
                  placeholder="นาที"
                  className="w-24 px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
                <span className="text-xs text-slate-400">นาที</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">วันที่ซ่อมเสร็จจริง</label>
                <input
                  type="date"
                  value={form.completion_date}
                  onChange={(e) => set('completion_date', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">เวลาซ่อมเสร็จจริง</label>
                <input
                  type="time"
                  value={form.completion_time}
                  onChange={(e) => set('completion_time', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400">
              เว้นว่างได้หากยังซ่อมไม่เสร็จ — บันทึกเหตุการณ์ไว้ก่อนแล้วกลับมาแก้ไขเติมทีหลังได้
            </p>

            {previewText ? (
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 text-xs text-blue-700">
                ระยะเวลาซ่อมจริง (โดยประมาณ): <strong>{previewText.duration}</strong> · {previewText.variance}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs text-slate-400">
                ยังไม่ได้กรอกเวลาซ่อมเสร็จ — ระบบจะคำนวณระยะเวลาซ่อมจริงให้อัตโนมัติเมื่อมีข้อมูลครบ
              </div>
            )}
          </section>

          {/* 2. จุดเกิดเหตุ */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">2. จุดเกิดเหตุ</p>
            <div>
              <label className="block text-xs text-slate-500 mb-1">สถานที่เกิดเหตุ / จุดที่ท่อแตก *</label>
              <input
                type="text"
                required
                value={form.location_name}
                onChange={(e) => set('location_name', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>
            <LocationPicker
              latitude={form.latitude ? Number(form.latitude) : null}
              longitude={form.longitude ? Number(form.longitude) : null}
              onChange={(lat, lng) => {
                set('latitude', lat.toFixed(7))
                set('longitude', lng.toFixed(7))
              }}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Latitude *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={form.latitude}
                  onChange={(e) => set('latitude', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Longitude *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={form.longitude}
                  onChange={(e) => set('longitude', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>
            </div>
          </section>

          {/* 3. ระบบท่อ */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">3. ข้อมูลเส้นท่อ</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">เส้นท่อ</label>
                <input
                  type="text"
                  value={form.pipeline_line}
                  onChange={(e) => set('pipeline_line', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">ขนาดท่อ (มม.)</label>
                <select
                  value={form.pipe_size}
                  onChange={(e) => set('pipe_size', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                >
                  <option value="">— เลือก —</option>
                  {PIPE_SIZE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="custom">อื่นๆ (ระบุ)</option>
                </select>
                {form.pipe_size === 'custom' && (
                  <input
                    type="number"
                    value={form.pipe_size_custom}
                    onChange={(e) => set('pipe_size_custom', e.target.value)}
                    placeholder="ระบุขนาด (มม.)"
                    className="w-full mt-2 px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">ชนิดท่อ</label>
                <select
                  value={form.pipe_type}
                  onChange={(e) => set('pipe_type', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                >
                  {PIPE_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* 4. สาเหตุ */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">4. สาเหตุ</p>
            <select
              value={form.cause}
              onChange={(e) => set('cause', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            >
              {CAUSE_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </section>

          {/* 5. ผลกระทบ */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">5. ผลกระทบ</p>
            <div>
              <label className="block text-xs text-slate-500 mb-1">พื้นที่ได้รับผลกระทบ</label>
              <input
                type="text"
                value={form.affected_area}
                onChange={(e) => set('affected_area', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">จำนวนผู้ใช้น้ำที่ได้รับผลกระทบ (ราย)</label>
              <input
                type="number"
                min="0"
                value={form.affected_users}
                onChange={(e) => set('affected_users', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">DMA ที่ได้รับผลกระทบ *</label>
              <DmaMultiSelect value={dmaList} onChange={setDmaList} />
            </div>
          </section>

          {/* 6. เอกสารและหมายเหตุ */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">6. เอกสารและหมายเหตุ</p>
            <div>
              <label className="block text-xs text-slate-500 mb-1">รูปภาพ/ไฟล์ประกาศหยุดจ่ายน้ำ</label>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFiles(Array.from(e.target.files))}
                className="w-full text-sm"
              />
              {event?.documents?.length > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  มีไฟล์แนบอยู่แล้ว {event.documents.length} ไฟล์ — ไฟล์ที่เลือกใหม่จะถูกเพิ่มเข้าไป
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">หมายเหตุ</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm resize-none"
              />
            </div>
          </section>

          <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'กำลังบันทึก...' : event ? 'บันทึกการแก้ไข' : 'เพิ่มเหตุการณ์'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
