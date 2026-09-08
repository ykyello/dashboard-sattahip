// locationUtils.js
// คำนวณระยะห่างพิกัด, จัดกลุ่มจุดเกิดเหตุซ้ำ, และแปลงข้อมูลสำหรับ Heat Map

// ── config ปรับได้ ────────────────────────────────────────
export const DUPLICATE_RADIUS_METERS = 100   // รัศมีที่ถือว่าเป็น "จุดเดียวกัน"
export const DUPLICATE_WINDOW_MONTHS = 12    // ช่วงเวลาย้อนหลังที่นับว่า "เกิดซ้ำ"

export function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/**
 * findRepeatLocations(events, options)
 * จัดกลุ่มเหตุการณ์ที่อยู่ในรัศมีเดียวกันและอยู่ในช่วงเวลาที่กำหนด
 * คืนเฉพาะกลุ่มที่มีเหตุการณ์ ≥ 2 ครั้ง เรียงจากมากไปน้อย
 */
export function findRepeatLocations(
  events,
  { radiusMeters = DUPLICATE_RADIUS_METERS, windowMonths = DUPLICATE_WINDOW_MONTHS } = {}
) {
  const now = new Date()
  const windowStart = new Date(now)
  windowStart.setMonth(now.getMonth() - windowMonths)

  const recent = events.filter((e) => new Date(e.start_at) >= windowStart)

  const groups = []
  recent.forEach((e) => {
    const group = groups.find(
      (g) => haversineMeters(g.lat, g.lng, e.latitude, e.longitude) <= radiusMeters
    )
    if (group) {
      group.events.push(e)
    } else {
      groups.push({ lat: e.latitude, lng: e.longitude, events: [e] })
    }
  })

  return groups
    .filter((g) => g.events.length >= 2)
    .sort((a, b) => b.events.length - a.events.length)
}

/**
 * นับจำนวนครั้งที่เกิดซ้ำ ณ จุดของ event หนึ่ง ๆ (ใช้แสดง badge บน popup แผนที่)
 * คืน null ถ้าจุดนี้ไม่เคยเกิดซ้ำ
 */
export function repeatCountForEvent(event, groups) {
  const g = groups.find((g) =>
    g.events.some((e) => e.id === event.id)
  )
  return g ? g.events.length : null
}

// ── Heat Map metrics ──────────────────────────────────────
// ค่าเริ่มต้น = ความถี่เหตุการณ์ (ทุกจุดหนัก 1 เท่ากัน)
// toggle ได้เป็นจำนวนผู้ใช้น้ำกระทบ หรือชั่วโมงหยุดจ่าย
export const HEATMAP_METRICS = {
  frequency: {
    label: 'ความถี่เหตุการณ์',
    getValue: () => 1,
  },
  affected_users: {
    label: 'ผู้ใช้น้ำกระทบ',
    getValue: (e) => Number(e.affected_users) || 0,
  },
  duration_hours: {
    label: 'ชั่วโมงหยุดจ่าย',
    getValue: (e) => (Number(e.actual_duration_min) || 0) / 60,
  },
}

export const DEFAULT_HEATMAP_METRIC = 'frequency'

/**
 * toHeatPoints(events, metricKey)
 * แปลง events → [[lat, lng, intensity], ...] สำหรับ leaflet.heat
 * intensity ต้อง > 0 เสมอ ไม่งั้น leaflet.heat จะไม่วาดจุดนั้น
 */
export function toHeatPoints(events, metricKey = DEFAULT_HEATMAP_METRIC) {
  const metric = HEATMAP_METRICS[metricKey] ?? HEATMAP_METRICS[DEFAULT_HEATMAP_METRIC]
  return events
    .filter((e) => e.latitude != null && e.longitude != null)
    .map((e) => [e.latitude, e.longitude, Math.max(metric.getValue(e), 0.01)])
}
