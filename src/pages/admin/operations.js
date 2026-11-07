import { adminSidebar } from "./navigation.js";

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
  for (const result of results) if (result.error) throw result.error;

  const [alerts, errors, status] = results.map((result) => result.data || []);
  const sweep = status.find((item) => item.name === "order_expiry");
  const healthy = Boolean(
    sweep?.last_success &&
      Date.now() - new Date(sweep.last_success).getTime() < 180000,
  );
  const openAlerts = alerts.filter((item) => !item.seen_at).length;

  const alertRows = alerts.length
    ? alerts
        .map((alert) => {
          const isSlip = alert.kind === "new_slip";
          const orderId = String(alert.order_id || "");
          return `<article class="operations-row ${alert.seen_at ? "" : "is-unread"}">
            <span class="operations-row-icon">${i(isSlip ? "CreditCard" : "ShoppingBag")}</span>
            <div class="operations-row-copy"><strong>${isSlip ? "มีสลิปใหม่รอตรวจ" : "มีคำสั่งซื้อใหม่"}</strong><small>${date(alert.created_at)} · #${esc(orderId.slice(0, 8))}</small></div>
            <a class="operations-row-link" href="/admin/order.html?id=${encodeURIComponent(orderId)}" data-read-notification="${esc(alert.id)}" aria-label="เปิดคำสั่งซื้อ ${esc(orderId.slice(0, 8))}">${i("ArrowRight")}</a>
          </article>`;
        })
        .join("")
    : `<div class="operations-empty">${i("Mail")}<strong>ยังไม่มีการแจ้งเตือน</strong><span>รายการใหม่จะแสดงที่นี่</span></div>`;

  const errorRows = errors.length
    ? errors
        .map(
          (error) => `<article class="operations-row operations-error-row">
            <span class="operations-row-icon">${i("ShieldCheck")}</span>
            <div class="operations-row-copy"><strong>${esc(error.code)} · ${esc(error.area)}</strong><small>${date(error.created_at)}</small></div>
          </article>`,
        )
        .join("")
    : `<div class="operations-empty">${i("CheckCircle2")}<strong>ยังไม่มีบันทึกปัญหา</strong><span>หากระบบบันทึกปัญหา จะแสดงรายการที่นี่</span></div>`;

  return `<main class="workspace" id="main-content">
    ${adminSidebar(i, "operations")}
    <section class="workspace-content operations-page">
      ${pageHead("STORE OPERATIONS", "แจ้งเตือนและดูแลระบบ", "ภาพรวมกิจกรรมและสถานะการทำงานของร้าน")}
      <section class="operations-overview panel" aria-labelledby="operations-overview-title">
        <div class="operations-overview-top">
          <span class="operations-feature-icon">${i("ShieldCheck")}</span>
          <div class="operations-overview-copy"><span class="eyebrow">SYSTEM OVERVIEW</span><h2 id="operations-overview-title">ระบบร้านค้าของคุณ</h2><p>ติดตามรายการสำคัญและตรวจสอบการทำงานได้ในหน้าเดียว</p></div>
          <span class="operations-status-pill ${healthy ? "is-healthy" : "is-warning"}"><span></span>${healthy ? "ระบบทำงานปกติ" : "ควรตรวจสอบระบบ"}</span>
        </div>
        <div class="operations-metrics">
          <div><span>แจ้งเตือนที่ยังไม่อ่าน</span><strong>${openAlerts}</strong></div>
          <div><span>รายการแจ้งเตือนล่าสุด</span><strong>${alerts.length}</strong></div>
          <div><span>บันทึกปัญหา</span><strong>${errors.length}</strong></div>
        </div>
      </section>

      <div class="operations-grid">
        <section class="panel operations-card operations-notifications" aria-labelledby="operations-notifications-title">
          <div class="operations-card-heading"><span class="operations-feature-icon">${i("Mail")}</span><div><span class="eyebrow">ACTIVITY</span><h2 id="operations-notifications-title">ความเคลื่อนไหวร้าน</h2></div><button class="btn secondary" data-action="read-notifications">อ่านทั้งหมดแล้ว</button></div>
          <p class="operations-card-description">แสดง 50 รายการล่าสุด และตรวจรายการใหม่ทุก 30 วินาทีขณะเปิดหลังบ้าน</p>
          <div class="operations-rows">${alertRows}</div>
        </section>

        <section class="panel operations-card" aria-labelledby="stock-automation-title">
          <div class="operations-card-heading"><span class="operations-feature-icon">${i("Package")}</span><div><span class="eyebrow">AUTOMATION</span><h2 id="stock-automation-title">ระบบคืนสต็อกอัตโนมัติ</h2></div></div>
          <div class="operations-health ${healthy ? "is-healthy" : "is-warning"}">${i(healthy ? "CheckCircle2" : "ShieldCheck")}<span><strong>${healthy ? "ตรวจสอบการทำงานแล้ว" : "ยังยืนยันการทำงานล่าสุดไม่ได้"}</strong><small>${healthy ? "งานตามกำหนดในช่วง 3 นาทีที่ผ่านมา" : "โปรดตรวจ Scheduled Job ใน Supabase"}</small></span></div>
          <div class="operations-stock-stats"><div><span>ทำงานล่าสุด</span><strong>${sweep?.last_success ? date(sweep.last_success) : "ยังไม่มีข้อมูล"}</strong></div><div><span>ออเดอร์ที่คืนสต็อก</span><strong>${Number(sweep?.affected) || 0}</strong></div></div>
          <details class="operations-details"><summary>การทำงานของระบบ</summary><p>ระบบตรวจรายการหมดเวลาชำระทุกนาที และคืนสต็อกเฉพาะคำสั่งซื้อที่ยังรอชำระและไม่มีสลิป ไม่ยกเลิกรายการที่กำลังรอตรวจสอบการชำระเงิน</p></details>
        </section>

        <section class="panel operations-card" aria-labelledby="client-errors-title">
          <div class="operations-card-heading"><span class="operations-feature-icon">${i("ShieldCheck")}</span><div><span class="eyebrow">DIAGNOSTICS</span><h2 id="client-errors-title">บันทึกปัญหาการใช้งาน</h2></div><span class="operations-count">${errors.length}</span></div>
          <p class="operations-card-description">บันทึกเหตุขัดข้องที่ช่วยให้ตรวจสอบและปรับปรุงระบบได้</p>
          <div class="operations-rows operations-error-list">${errorRows}</div>
          <details class="operations-details"><summary>ข้อมูลที่บันทึกและความเป็นส่วนตัว</summary><p>ไม่เก็บข้อความผิดพลาด ที่อยู่ อีเมล สลิป token หรือ stack trace จำกัด 1 รายการต่อนาทีและ 10 รายการต่อวันต่อบัญชี เก็บไว้ 30 วัน และไม่ใช่ระบบตรวจ uptime ภายนอก</p></details>
        </section>

        <section class="panel operations-card operations-backup" aria-labelledby="backup-title">
          <div class="operations-card-heading"><span class="operations-feature-icon">${i("Download")}</span><div><span class="eyebrow">DATA SAFETY</span><h2 id="backup-title">สำรองข้อมูลร้านแบบเข้ารหัส</h2></div></div>
          <p class="operations-card-description">สร้างไฟล์สำรองที่เข้ารหัส AES-256-GCM ด้วยรหัสที่คุณกำหนด เก็บไฟล์และรหัสผ่านแยกจากกัน หากลืมรหัสจะไม่สามารถเปิดไฟล์ได้</p>
          <div class="operations-backup-note">ไฟล์นี้ไม่รวมบัญชี Auth หรือไฟล์รูปจริง และไม่ใช่การสำรองฐานข้อมูลทั้งหมด ควรเก็บสำเนาไว้นอกเครื่องและทดสอบการกู้คืน</div>
          <form id="backup-form" class="operations-backup-form">
            <div class="form-grid"><label class="field"><span>รหัสเข้ารหัสไฟล์ (อย่างน้อย 12 ตัวอักษร)</span><input type="password" name="backup_password" minlength="12" autocomplete="new-password" required></label><label class="field"><span>ยืนยันรหัสเข้ารหัส</span><input type="password" name="backup_confirm" minlength="12" autocomplete="new-password" required></label></div>
            <p class="form-error" role="alert"></p><button class="btn primary" type="submit">${i("Download")} เข้ารหัสและดาวน์โหลดสำเนา</button>
          </form>
          <small class="muted operations-doc-link">สำรองอัตโนมัติรายวันต้องตั้งค่า GitHub Secrets ก่อน <a href="https://github.com/Zentrary/ZenMarket/blob/main/docs/OPERATIONS.md" target="_blank" rel="noopener noreferrer">อ่านคู่มือระบบและข้อจำกัด</a></small>
        </section>
      </div>
    </section>
  </main>`;
}
