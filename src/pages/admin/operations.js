export async function operationsPage({ db, esc, i, date, pageHead }) {
  const results = await Promise.all([
    db
      .from("owner_notifications")
      .select("id,order_id,kind,created_at,seen_at")
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("client_errors")
      .select("id,area,code,created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    db.from("operation_status").select("*"),
  ]);
  for (const r of results) if (r.error) throw r.error;
  const [alerts, errors, status] = results.map((r) => r.data || []);
  const sweep = status.find((s) => s.name === "order_expiry");
  const healthy =
    sweep?.last_success &&
    Date.now() - new Date(sweep.last_success).getTime() < 180000;
  return `<main class="workspace" id="main-content"><aside class="workspace-sidebar"><span class="sidebar-label">STORE OPERATIONS</span><nav aria-label="เมนูหลังบ้าน"><a href="/admin/dashboard.html">${i("LayoutGrid")} แดชบอร์ด</a><a href="/admin/orders.html">${i("ClipboardList")} คำสั่งซื้อ</a><a class="selected" aria-current="page" href="/admin/operations.html">${i("ShieldCheck")} แจ้งเตือนและดูแลระบบ</a></nav><a class="back-link" href="/index.html">กลับหน้าร้าน</a></aside><section class="workspace-content">${pageHead("KEEP THE SHOP RUNNING", "แจ้งเตือนและดูแลระบบ", "รีเฟรชหน้านี้เพื่อดูรายการล่าสุด ศูนย์แจ้งเตือนในเว็บไม่ใช่การส่ง LINE หรืออีเมล")}
 <section class="panel"><div class="section-heading"><h2>ความเคลื่อนไหวร้าน</h2><button class="btn secondary" data-action="read-notifications">อ่านทั้งหมดแล้ว</button></div><p class="muted">แสดงล่าสุด 50 รายการ ศูนย์แจ้งเตือนตรวจรายการใหม่ทุก 30 วินาทีเมื่อเปิดหลังบ้าน</p><div class="operations-list">${alerts.map((a) => `<article class="operation-row ${a.seen_at ? "" : "unread"}"><div><strong>${a.kind === "new_slip" ? "มีสลิปใหม่รอตรวจ" : "มีคำสั่งซื้อใหม่"}</strong><small>${date(a.created_at)} · #${esc(a.order_id.slice(0, 8))}</small></div><a class="btn secondary" href="/admin/order.html?id=${esc(a.order_id)}" data-read-notification="${esc(a.id)}">เปิดออเดอร์ ${i("ArrowRight")}</a></article>`).join("") || '<p class="muted">ยังไม่มีการแจ้งเตือนใหม่</p>'}</div></section>
 <section class="panel"><h2>ระบบคืนสต็อกอัตโนมัติ</h2><p class="operation-health ${healthy ? "healthy" : "warning"}">${healthy ? "งานตรวจหมดเวลาทำงานล่าสุดตามกำหนด" : "ยังยืนยันการทำงานล่าสุดไม่ได้ กรุณาตรวจ Scheduled Job ใน Supabase"}</p><p class="muted">สำเร็จล่าสุด: ${sweep?.last_success ? date(sweep.last_success) : "ยังไม่มีข้อมูล"} · คืนสต็อกรอบล่าสุด ${sweep?.affected || 0} ออเดอร์</p><p>ชำระและส่งสลิปภายใน 30 นาที ระบบตรวจทุกนาที คืนสต็อกเฉพาะสถานะรอชำระที่ยังไม่มีสลิป ไม่ยกเลิกรายการที่รอตรวจเงิน</p></section>
 <section class="panel"><h2>บันทึกปัญหาการใช้งาน</h2><p class="muted">เฉพาะสมาชิกที่เข้าสู่ระบบ ไม่เก็บข้อความผิดพลาด ที่อยู่ อีเมล สลิป token หรือ stack trace จำกัด 1 รายการต่อนาที / 10 รายการต่อวันต่อบัญชี และล้างหลัง 30 วัน ไม่ใช่ระบบตรวจ uptime ภายนอก</p><div class="operations-list">${errors.map((e) => `<article class="operation-row"><strong>${esc(e.code)} · ${esc(e.area)}</strong><small>${date(e.created_at)}</small></article>`).join("") || '<p class="muted">ยังไม่มีบันทึกปัญหา</p>'}</div></section>
 <section class="panel"><h2>สำรองข้อมูลร้านแบบเข้ารหัส</h2><p>ดาวน์โหลดข้อมูลร้าน ออเดอร์ โปรไฟล์ และที่อยู่เป็นไฟล์ AES-256-GCM โดยตั้งรหัสก่อนดาวน์โหลด เก็บไฟล์และรหัสแยกกัน หากลืมรหัสจะเปิดไฟล์ไม่ได้</p><p class="notice">ไม่รวมบัญชีเข้าสู่ระบบใน Auth หรือไฟล์รูปจริง ไฟล์นี้ไม่ใช่ full database backup และไม่ใช่การสำรองอัตโนมัติไปคลาวด์ ต้องเก็บสำเนาไว้นอกเครื่องและทดสอบการกู้คืน</p><form id="backup-form"><div class="form-grid"><label class="field"><span>รหัสเข้ารหัสไฟล์ (อย่างน้อย 12 ตัวอักษร)</span><input type="password" name="backup_password" minlength="12" autocomplete="new-password" required></label><label class="field"><span>ยืนยันรหัสเข้ารหัส</span><input type="password" name="backup_confirm" minlength="12" autocomplete="new-password" required></label></div><p class="form-error" role="alert"></p><button class="btn primary" type="submit">${i("Download")} เข้ารหัสและดาวน์โหลดสำเนา</button></form><small class="muted">สำรองอัตโนมัติรายวันมี workflow เตรียมไว้ แต่ต้องตั้งค่า GitHub Secrets ก่อน ดู <a href="https://github.com/Zentrary/ZenMarket/blob/main/docs/OPERATIONS.md" target="_blank" rel="noopener noreferrer">คู่มือระบบและข้อจำกัด</a> (คู่มือจะอยู่บน main หลังรวม PR)</small></section></section></main>`;
}
