import { reviewColumns } from "../../core/experience.js";
import { adminTabs as tabs, adminSidebar } from "./navigation.js";
import { categoryIconOptions } from "../../core/category-icons.js";
export function createAdminPages(context) {
  const {
    products,
    session,
    profile,
    admin,
    db,
    categories,
    store,
    i,
    money,
    esc,
    safeImage,
    field,
    empty,
    pageHead,
    date,
    shortDate,
    statusLabel,
  } = context;
  const input = (label, name, type = "text", extra = "", value = "") =>
    `<label class="field"><span>${label}</span><input type="${type}" name="${name}" ${extra} value="${esc(value)}"></label>`;
  const area = (label, name, max = 1000) =>
    `<label class="field"><span>${label}</span><textarea name="${name}" maxlength="${max}" rows="3">${esc(store[name])}</textarea></label>`;
  function reviewCard(r) {
    return `<article class="review-card"><div><strong>@${esc(r.reviewer_name)}</strong><span class="review-stars" aria-label="${r.rating} จาก 5 ดาว">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</span></div><h3>${esc(r.product_name)}</h3><small class="muted">ผู้ซื้อยืนยันรับสินค้าแล้ว · ${date(r.created_at)}</small><p class="preserve-lines">${esc(r.comment) || "ให้คะแนนโดยไม่แสดงความคิดเห็น"}</p></article>`;
  }
  async function adminPage(tab = "products") {
    if (!session)
      return empty(
        "เข้าสู่ระบบเจ้าของร้าน",
        "กรุณาเข้าสู่ระบบด้วยบัญชีแอดมิน",
        "/login",
        "เข้าสู่ระบบ",
      );
    if (!admin)
      return empty(
        "พื้นที่นี้สำหรับแอดมินเท่านั้น",
        "ลูกค้าสามารถซื้อสินค้าและดูคำสั่งซื้อของตัวเองได้",
      );
    if (!tabs.some((t) => t[0] === tab))
      return empty(
        "ไม่พบหน้าจัดการร้าน",
        "โปรดเลือกเมนูจัดการร้านค้า",
        "/admin/products",
        "จัดการสินค้า",
      );
    let content = "";
    if (tab === "dashboard") {
      const [{ data: d, error }, { data: recent, error: reviewError }] =
        await Promise.all([
          db.rpc("get_admin_dashboard"),
          db
            .from("product_reviews")
            .select(reviewColumns)
            .order("created_at", { ascending: false })
            .limit(3),
        ]);
      if (error) throw error;
      if (reviewError) throw reviewError;
      const max = Math.max(
        1,
        ...d.daily_revenue.map((day) => Number(day.total)),
      );
      content = `<div class="dashboard-kpis"><article class="panel kpi"><span>ยอดขายที่ชำระแล้ว</span><strong>${money(d.revenue)}</strong><small>${d.paid_orders} คำสั่งซื้อที่ยืนยันยอดแล้ว</small></article><article class="panel kpi"><span>สินค้าที่ขายได้</span><strong>${d.units_sold}<small data-en-count-unit="item" data-count="${Number(d.units_sold)}"> ชิ้น</small></strong><small>${d.product_count} รายการสินค้าในร้าน</small></article><article class="panel kpi"><span>คะแนนจากลูกค้า</span><strong>★ ${Number(d.average_rating).toFixed(1)}</strong><small>${d.review_count} รีวิวจากผู้ซื้อจริง</small></article><article class="panel kpi"><span>รอดำเนินการ</span><strong>${d.awaiting_review + d.awaiting_shipment}</strong><small>ตรวจยอด ${d.awaiting_review} · กำลังเตรียม ${d.preparing_orders} · พร้อมจัดส่ง ${d.ready_to_ship}</small></article></div><p class="dashboard-note">ยอดขายนี้รวมค่าจัดส่ง และนับเฉพาะออเดอร์ที่ชำระแล้ว ไม่ใช่กำไรสุทธิ</p><div class="dashboard-grid"><section class="panel"><span class="eyebrow">LAST 7 DAYS</span><h2>ยอดขายที่ชำระแล้ว 7 วันล่าสุด</h2><div class="revenue-chart">${d.daily_revenue.map((day) => `<div class="revenue-day"><span>${shortDate(day.day + "T12:00:00+07:00")}</span><progress max="${max}" value="${Number(day.total)}" aria-label="ยอดวันที่ ${esc(day.day)}">${money(day.total)}</progress><strong>${money(day.total)}</strong></div>`).join("")}</div><small class="muted">เวลาไทย · รายการเก่าที่ไม่มีวันยืนยันยอด อ้างอิงวันสั่งซื้อ</small></section><section class="panel"><span class="eyebrow">CUSTOMER VOICE</span><h2>คะแนนรีวิว</h2><div class="rating-distribution">${d.ratings.map((row) => `<div><span>${row.rating} ★</span><progress max="${Math.max(1, d.review_count)}" value="${row.count}" aria-label="${row.rating} ดาว ${row.count} รีวิว"></progress><span>${row.count}</span></div>`).join("")}</div><a class="btn secondary" href="/admin/reviews.html">อ่านรีวิวทั้งหมด ${i("ArrowRight")}</a></section></div><div class="dashboard-grid"><section class="panel"><div class="section-heading"><h2>รีวิวล่าสุด</h2><a href="/admin/reviews.html">ดูทั้งหมด ${i("ArrowUpRight")}</a></div>${recent.length ? recent.map(reviewCard).join("") : '<p class="muted">ยังไม่มีรีวิว เมื่อลูกค้ายืนยันรับสินค้าและให้คะแนน จะแสดงที่นี่</p>'}</section><section class="panel"><h2>สินค้าใกล้หมด</h2>${
        products
          .filter((p) => p.active && p.stock <= 5)
          .sort((a, b) => a.stock - b.stock)
          .slice(0, 6)
          .map(
            (p) =>
              `<a class="stock-alert" href="/admin/products.html"><span>${esc(p.name)}</span><strong>${p.stock} ชิ้น</strong></a>`,
          )
          .join("") || '<p class="muted">ยังไม่มีรายการที่ต้องเติมสต็อก</p>'
      }<a class="btn secondary" href="/admin/orders.html">จัดการคำสั่งซื้อ ${i("ArrowRight")}</a></section></div>`;
    }
    if (tab === "reviews") {
      const params = new URLSearchParams(location.search);
      const rating = Number(params.get("rating"));
      const page = Math.max(
        0,
        Math.min(10000, Math.floor(Number(params.get("page")) || 0)),
      );
      let query = db
        .from("product_reviews")
        .select(reviewColumns, { count: "exact" })
        .order("created_at", { ascending: false });
      if (rating >= 1 && rating <= 5 && Number.isInteger(rating))
        query = query.eq("rating", rating);
      const { data, count, error } = await query.range(
        page * 20,
        page * 20 + 19,
      );
      if (error) throw error;
      content = `<section class="panel"><div class="section-heading"><div><h2>ความคิดเห็นจากผู้ซื้อจริง</h2><p>${count ?? data.length} รีวิว · หน้าละ 20 รายการ</p></div></div><div class="category-pills review-filters"><a class="pill ${!rating ? "selected" : ""}" href="/admin/reviews.html">ทั้งหมด</a>${[5, 4, 3, 2, 1].map((n) => `<a class="pill ${rating === n ? "selected" : ""}" href="/admin/reviews.html?rating=${n}">${n} ★</a>`).join("")}</div>${data.length ? data.map(reviewCard).join("") : '<div class="table-empty">ยังไม่มีรีวิวในรายการนี้</div>'}<nav class="pagination" aria-label="หน้ารีวิว">${page > 0 ? `<a class="btn secondary" href="/admin/reviews.html?page=${page - 1}${rating ? "&rating=" + rating : ""}">ก่อนหน้า</a>` : ""}<span>หน้า ${page + 1}</span>${count > (page + 1) * 20 ? `<a class="btn secondary" href="/admin/reviews.html?page=${page + 1}${rating ? "&rating=" + rating : ""}">ถัดไป</a>` : ""}</nav></section>`;
    }
    if (tab === "products")
      content = `<section class="panel"><div class="section-heading"><div><h2>คลังสินค้า <span class="count-label">${products.length} รายการ</span></h2><p>เพิ่ม แก้ไข หรือซ่อนสินค้าของร้าน</p></div><button class="btn primary" data-action="edit-product">${i("Plus")} เพิ่มสินค้า</button></div><div class="table-scroll"><table><thead><tr><th>สินค้า</th><th>หมวดหมู่</th><th>ราคา</th><th>คงเหลือ</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>${products.length ? products.map((p) => `<tr><td><div class="table-product"><img src="${safeImage(p.image_url)}" alt=""><div><strong>${esc(p.name)}</strong><small>${esc(p.sku)}</small></div></div></td><td>${esc(p.category)}</td><td>${money(p.price)}</td><td>${p.stock}</td><td>${p.active ? "เปิดขาย" : "ซ่อน"}</td><td><button class="icon-btn" data-action="edit-product" data-id="${p.id}" aria-label="แก้ไข ${esc(p.name)}">${i("Pencil")}</button><button type="button" class="icon-btn danger" data-action="delete-product" data-id="${p.id}" aria-label="ลบ ${esc(p.name)}">${i("Trash2")}</button></td></tr>`).join("") : '<tr><td colspan="6" class="table-empty">ยังไม่มีสินค้า กด “เพิ่มสินค้า” เพื่อเริ่มต้น</td></tr>'}</tbody></table></div></section>`;
    if (tab === "categories")
      content = `<section class="panel"><h2>เพิ่มหมวดหมู่ของคุณ</h2><p class="muted">ตั้งชื่อให้ตรงกับสินค้าของร้าน เช่น อาหาร หนังสือ หรือสินค้าเกม</p><form id="category-form" class="category-create-form">${field("ชื่อหมวดหมู่", "name", "text", 'maxlength="80" placeholder="ระบุชื่อหมวดหมู่ใหม่"')}<label class="field"><span>ไอคอนหมวดหมู่</span><select name="icon">${categoryIconOptions.map(([value, label]) => `<option value="${value}" ${value === "Package" ? "selected" : ""}>${label}</option>`).join("")}</select></label><button class="btn primary" type="submit">${i("Plus")} เพิ่มหมวดหมู่</button><p class="form-error" role="alert"></p></form></section><section class="panel"><h2>หมวดหมู่ทั้งหมด (${categories.length - 1})</h2><div class="category-manager">${
        categories
          .slice(1)
          .map(
            (c) =>
              `<div class="category-row"><div>${i(c.icon)}<strong>${esc(c.name)}</strong><small>${products.filter((p) => p.category === c.name).length} สินค้า</small></div><div class="button-row"><button class="btn secondary" data-action="rename-category" data-name="${esc(c.name)}">${i("Pencil")} เปลี่ยนชื่อ</button><button class="icon-btn danger" data-action="delete-category" data-name="${esc(c.name)}" aria-label="ลบ ${esc(c.name)}">${i("Trash2")}</button></div></div>`,
          )
          .join("") ||
        '<p class="muted">ยังไม่มีหมวดหมู่ เพิ่มหมวดหมู่แรกได้จากฟอร์มด้านบน</p>'
      }</div><p class="muted">ลบได้เฉพาะหมวดหมู่ที่ไม่มีสินค้า การเปลี่ยนชื่อจะเปลี่ยนชื่อหมวดในสินค้าที่เกี่ยวข้องด้วย</p></section>`;
    if (tab === "settings")
      content = `<form id="store-form" class="settings-sections"><section class="panel" id="settings-identity"><h2>ข้อมูลร้านและโลโก้</h2><div class="logo-editor">${store.logo_url ? `<img src="${safeImage(store.logo_url)}" class="logo-preview" alt="โลโก้ปัจจุบัน">` : `<span class="logo-placeholder">${i("ShoppingBag")}</span>`}<div><label class="field"><span>อัปโหลดโลโก้ร้าน</span><input type="file" name="logo" accept="image/png,image/jpeg,image/webp"></label><small class="muted">PNG, JPG, WebP ไม่เกิน 5 MB · แนะนำภาพสี่เหลี่ยมจัตุรัส</small></div></div>${store.logo_url ? '<label class="checkbox"><input type="checkbox" name="remove_logo">นำโลโก้ปัจจุบันออก</label>' : ""}${input("ชื่อร้าน", "shop_name", "text", 'required maxlength="80"', store.shop_name)}${input("คำอธิบายสั้น ๆ ใต้ชื่อร้าน", "tagline", "text", 'maxlength="200"', store.tagline)}${area("เกี่ยวกับร้าน", "about_text", 3000)}</section><section class="panel" id="settings-contact"><h2>ช่องทางติดต่อ (แสดงให้ลูกค้าเห็น)</h2><div class="form-grid">${input("อีเมลติดต่อ", "contact_email", "email", 'maxlength="254"', store.contact_email)}${input("เบอร์โทรติดต่อ", "contact_phone", "tel", 'maxlength="30"', store.contact_phone)}</div>${area("ที่อยู่หรือรายละเอียดการติดต่อ", "contact_address")}<h3>โซเชียลของร้าน</h3><p class="muted">ใส่ลิงก์ HTTPS ของช่องทางจริง เว้นว่างเพื่อไม่แสดง</p>${input("Facebook", "facebook_url", "url", 'maxlength="500" placeholder="https://www.facebook.com/yourshop"', store.facebook_url)}${input("Instagram", "instagram_url", "url", 'maxlength="500" placeholder="https://www.instagram.com/yourshop"', store.instagram_url)}${input("LINE", "line_url", "url", 'maxlength="500" placeholder="https://line.me/ti/p/@yourshop"', store.line_url)}</section><section class="panel" id="settings-shipping"><h2>การจัดส่ง</h2><p class="muted">ใช้คำนวณคำสั่งซื้อใหม่ที่ฐานข้อมูล คำสั่งซื้อเดิมไม่เปลี่ยนยอด</p><div class="form-grid">${input("ค่าจัดส่งต่อคำสั่งซื้อ (บาท)", "shipping_fee", "number", 'required min="0" max="10000" step="0.01"', store.shipping_fee)}${input("จัดส่งฟรีเมื่อยอดสินค้าถึง (บาท)", "free_shipping_threshold", "number", 'required min="1" max="1000000" step="0.01"', store.free_shipping_threshold)}</div>${area("ข้อความแจ้งการจัดส่ง", "shipping_note", 500)}</section><div class="form-save"><p class="form-error" role="alert"></p><button type="submit" class="btn primary">${i("Check")} บันทึกการตั้งค่าร้าน</button></div></form>`;
    if (tab === "payments") {
      const { data, error } = await db
        .from("store_settings")
        .select("promptpay_id,recipient_name")
        .single();
      if (error) throw error;
      content = `<section class="panel narrow-panel"><h2>บัญชีรับเงิน PromptPay</h2><p class="muted">ข้อมูลบัญชีรับเงินแยกจากข้อมูลร้านสาธารณะ</p><form id="settings-form">${field("ชื่อผู้รับเงิน (ตรงกับบัญชีธนาคาร)", "recipient_name", "text", 'minlength="2" maxlength="150"', data.recipient_name)}${field("เบอร์หรือเลขบัตรประชาชนที่ผูก PromptPay", "promptpay_id", "text", 'inputmode="numeric" pattern="(0[0-9]{9}|[0-9]{13})"', data.promptpay_id || "")}<div class="notice">ตรวจสอบการผูก PromptPay ก่อนใช้งาน และตรวจยอดธนาคารจริงก่อนอนุมัติทุกคำสั่งซื้อ</div><p class="form-error" role="alert"></p><button class="btn primary" type="submit">${i("Check")} บันทึกบัญชีรับเงิน</button></form></section>`;
    }
    if (tab === "orders") {
      const { data, error } = await db
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      content = `<section class="panel"><h2>คำสั่งซื้อล่าสุด (${data.length})</h2><p class="muted">แสดงล่าสุด 100 รายการ ตรวจยอดเข้าธนาคารก่อนอนุมัติ</p>${data.length ? `<div class="table-scroll"><table><thead><tr><th>คำสั่งซื้อ</th><th>ผู้รับ</th><th>ยอดรวม</th><th>สถานะ</th><th></th></tr></thead><tbody>${data.map((o) => `<tr><td>#${o.id.slice(0, 8).toUpperCase()}<small>${date(o.created_at)}</small></td><td>${esc(o.recipient)}</td><td>${money(o.total)}</td><td><span class="status ${o.status}">${statusLabel[o.status]}</span></td><td><a class="btn secondary small" href="/admin/order.html?id=${o.id}">ตรวจสอบ ${i("ArrowRight")}</a></td></tr>`).join("")}</tbody></table></div>` : '<div class="table-empty">ยังไม่มีคำสั่งซื้อ</div>'}</section>`;
    }
    const selected = tabs.find((t) => t[0] === tab);
    return `<main class="workspace" id="main-content">${adminSidebar(i, tab)}<section class="workspace-content">${pageHead("STORE MANAGEMENT", selected[2], selected[3])}${content}</section></main>`;
  }
  return { adminPage };
}
