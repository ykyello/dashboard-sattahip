// outageStats.js
// คำนวณ KPI / Ranking / ข้อมูลกราฟ จาก array ของ water_outage_events
// (แต่ละ event คาดว่ามี e.dma_list = [{ id, dma_code, dma_name }, ...] แนบมาแล้วจาก query ฝั่งหน้าเว็บ)

import { findRepeatLocations } from './locationUtils'

function isClosed(e) {
  return e.actual_completion_at != null
}

function groupCount(events, field) {
  const map = {}
  events.forEach((e) => {
    const key = e[field] || 'ไม่ระบุ'
    map[key] = (map[key] || 0) + 1
  })
  return map
}

export function computeKpis(events) {
  const now = new Date()
  const thisMonth = events.filter((e) => {
    const d = new Date(e.start_at)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  const thisYear = events.filter((e) => new Date(e.start_at).getFullYear() === now.getFullYear())

  const closed = events.filter(isClosed)
  const totalHours = closed.reduce((s, e) => s + (e.actual_duration_min || 0), 0) / 60
  const avgDurationMin =
    closed.length > 0 ? closed.reduce((s, e) => s + e.actual_duration_min, 0) / closed.length : null
  const onTimeCount = closed.filter((e) => e.variance_min <= 0).length
  const onTimePct = closed.length > 0 ? (onTimeCount / closed.length) * 100 : null

  const dmaIds = new Set()
  events.forEach((e) => (e.dma_list || []).forEach((d) => dmaIds.add(d.id)))

  return {
    eventsThisMonth: thisMonth.length,
    eventsThisYear: thisYear.length,
    causeBreakdown: groupCount(events, 'cause'), // { ท่อแตก: n, ไฟดับ: n, ... }
    totalOutageHours: totalHours, // เฉพาะเหตุการณ์ที่ปิดแล้ว
    avgRepairDurationMin: avgDurationMin, // null ถ้ายังไม่มีเหตุการณ์ที่ปิด
    onTimeRepairPct: onTimePct, // null ถ้ายังไม่มีเหตุการณ์ที่ปิด
    totalAffectedUsers: events.reduce((s, e) => s + (Number(e.affected_users) || 0), 0), // รวมทั้งระบบเท่านั้น ไม่แยก DMA
    affectedDmaCount: dmaIds.size,
    openEventsCount: events.length - closed.length, // เหตุการณ์ที่ยังไม่ปิด — ควรเตือนไว้บน dashboard
  }
}

export function topRepeatLocations(events, limit = 5) {
  return findRepeatLocations(events).slice(0, limit)
}

export function topPipelines(events, limit = 5) {
  return Object.entries(groupCount(events, 'pipeline_line'))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([pipeline_line, count]) => ({ pipeline_line, count }))
}

// DMA ranking ตามความถี่ — นับ "เหตุการณ์ที่ DMA นี้เกี่ยวข้อง" ถูกต้องตามความหมาย แม้เหตุการณ์เดียวจะกระทบหลาย DMA
export function topDmaByFrequency(events, limit = 5) {
  const map = {}
  events.forEach((e) =>
    (e.dma_list || []).forEach((d) => {
      map[d.dma_name] = (map[d.dma_name] || 0) + 1
    })
  )
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([dma_name, count]) => ({ dma_name, count }))
}

// DMA ranking ตามชั่วโมงหยุดจ่ายสะสม (เฉพาะเหตุการณ์ที่ปิดแล้ว)
// ถูกต้องตามความหมาย: เวลาไม่ได้ถูกแบ่งสัดส่วนระหว่าง DMA — ทุก DMA ที่เกี่ยวข้องเผชิญการหยุดจ่ายนานเท่ากันจริง
export function topDmaByHours(events, limit = 5) {
  const map = {}
  events
    .filter(isClosed)
    .forEach((e) =>
      (e.dma_list || []).forEach((d) => {
        map[d.dma_name] = (map[d.dma_name] || 0) + (e.actual_duration_min || 0) / 60
      })
    )
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([dma_name, hours]) => ({ dma_name, hours }))
}

// ⚠️ ตั้งใจไม่มี topDmaByAffectedUsers
// ระบบไม่มีข้อมูลจำนวนผู้ใช้น้ำแยกรายพื้นที่/DMA ต่อเหตุการณ์ — affected_users เป็นตัวเลขเดียวต่อเหตุการณ์
// ถ้าเหตุการณ์กระทบหลาย DMA พร้อมกัน การเอาไปบวกให้ทุก DMA จะทำให้ยอดสะสมเกินจริง
// จึงเหลือ "ผู้ใช้น้ำกระทบสะสม" แบบรวมทั้งระบบใน computeKpis() เท่านั้น ไม่แยกราย DMA

export function monthlySeries(events, monthsBack = 12) {
  const now = new Date()
  const buckets = Array.from({ length: monthsBack }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1 - i), 1)
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      label: `${d.getMonth() + 1}/${d.getFullYear()}`,
      count: 0,
      hours: 0,
      affectedUsers: 0,
    }
  })
  events.forEach((e) => {
    const d = new Date(e.start_at)
    const bucket = buckets.find((b) => b.year === d.getFullYear() && b.month === d.getMonth())
    if (!bucket) return
    bucket.count += 1
    bucket.hours += isClosed(e) ? (e.actual_duration_min || 0) / 60 : 0
    bucket.affectedUsers += Number(e.affected_users) || 0
  })
  return buckets
}

export function byDmaChart(events) {
  const map = {}
  events.forEach((e) =>
    (e.dma_list || []).forEach((d) => {
      map[d.dma_name] = (map[d.dma_name] || 0) + 1
    })
  )
  return Object.entries(map).map(([dma_name, count]) => ({ dma_name, count }))
}

/**
 * formatVariance(varianceMin)
 * varianceMin === null → ยังไม่มี actual_completion_at (ไม่ใช่ฟิลด์สถานะแยก แค่คำนวณจากค่าที่ยังว่าง)
 */
export function formatVariance(varianceMin) {
  if (varianceMin === null || varianceMin === undefined) return 'อยู่ระหว่างซ่อม'
  if (varianceMin === 0) return 'เสร็จตรงตามประกาศ'
  const abs = Math.abs(varianceMin)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  const duration = h > 0 ? `${h} ชม. ${m} นาที` : `${m} นาที`
  return varianceMin < 0 ? `เร็วกว่าประกาศ ${duration}` : `ช้ากว่าประกาศ ${duration}`
}
