// outageSystems.js
// ค่ากำหนดของระบบเหตุการณ์หยุดจ่ายน้ำแต่ละระบบ
// ค่า id ต้องตรงกับคอลัมน์ water_outage_events.system_type ในฐานข้อมูล
//
// showPipeline — แสดง/บันทึกข้อมูลเส้นท่อ (pipeline_line, pipe_size, pipe_type)
// showImpact   — แสดง/บันทึกข้อมูลผลกระทบ (affected_area, affected_users, DMA)

export const OUTAGE_SYSTEMS = {
  sattahip: {
    id: 'sattahip',
    label: 'หยุดจ่ายน้ำในพื้นที่ประปาสัตหีบ',
    path: '/water-outages/sattahip',
    showPipeline: true,
    showImpact: true,
  },
  pattaya: {
    id: 'pattaya',
    label: 'หยุดจ่ายน้ำให้ กปภ.สาขาพัทยา',
    path: '/water-outages/pattaya',
    showPipeline: false,
    showImpact: false,
  },
}

// คืน config ของระบบ หรือ null ถ้าไม่รู้จัก
// (component ทุกตัวจะไม่ดึงข้อมูลถ้าได้ null — กันข้อมูลสองระบบปนกันจากการลืมส่ง system)
export function getOutageSystem(id) {
  return OUTAGE_SYSTEMS[id] ?? null
}
