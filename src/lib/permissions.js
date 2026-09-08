// permissions.js
// ใช้เพื่อ UX เท่านั้น (ซ่อน/แสดงปุ่มให้เหมาะกับ role) — สิทธิ์จริงถูกบังคับด้วย
// RLS policy บน Supabase (ดู supabase_migrations/water_outage_schema.sql)
// guest ที่ยิง insert/update/delete ตรงผ่าน client จะถูกฐานข้อมูลปฏิเสธเสมอ
// แม้ค่านี้จะถูกแก้ไขฝั่ง client ก็ตาม

export const ADMIN_EMAIL = 'admin@1107.pwa'

export function isAdmin(session) {
  return session?.user?.email === ADMIN_EMAIL
}
