import { safeReturnPath } from "../routes.js";
export function createAccountPages(context) {
  const {
    addresses,
    products,
    session,
    profile,
    admin,
    db,
    cart,
    favorites,
    categories,
    category,
    search,
    sort,
    i,
    money,
    esc,
    safeImage,
    field,
    empty,
    pageHead,
    count,
    route,
    QRCode,
    statusLabel,
    date,
    store,
    shippingFor,
    pageURL,
  } = context;
  function authPage(register = false) {
    const next = safeReturnPath(
      new URLSearchParams(location.search).get("next"),
    );
    const suffix = next ? "?next=" + encodeURIComponent(next) : "";
    return `<main class="auth-page wrap"><section class="auth-form"><a href="#/" class="back-link">${i("ArrowLeft")} กลับหน้าร้าน</a>${next ? '<div class="member-notice">สมัครสมาชิกหรือเข้าสู่ระบบก่อน เพื่อดูสินค้าและใช้งานร้านค้า</div>' : ""}<h2>${register ? "มาเป็นส่วนหนึ่งของเรา" : "ยินดีต้อนรับกลับมา"}</h2><p>${register ? "สมัครสมาชิก แล้วเริ่มเลือกความสุขของคุณ" : "เข้าสู่ระบบเพื่อเลือกชิ้นโปรดและติดตามคำสั่งซื้อ"}</p><form id="${register ? "register" : "login"}-form">${register ? `<div class="form-grid">${field("ชื่อจริง", "first_name", "text", 'maxlength="80" autocomplete="given-name"')}${field("นามสกุล", "last_name", "text", 'maxlength="80" autocomplete="family-name"')}${field("ชื่อเล่น", "nickname", "text", 'maxlength="50"')}${field("อายุ (13 ปีขึ้นไป)", "age", "number", 'min="13" max="120"')}${field("เบอร์โทรศัพท์", "phone", "tel", 'pattern="0[0-9]{9}" placeholder="08xxxxxxxx" autocomplete="tel"')}${field("ชื่อผู้ใช้", "username", "text", 'pattern="[a-z0-9_]{3,30}" placeholder="ภาษาอังกฤษเล็ก ตัวเลข หรือ _" autocomplete="username"')}</div>${field("อีเมล", "email", "email", 'autocomplete="email" maxlength="254"')}${field("รหัสผ่าน", "password", "password", 'minlength="12" maxlength="128" autocomplete="new-password" placeholder="อย่างน้อย 12 ตัวอักษร ผสมตัวเลขและตัวอักษร"')}${field("ยืนยันรหัสผ่าน", "confirm", "password", 'minlength="12" maxlength="128" autocomplete="new-password"')}<label class="checkbox"><input type="checkbox" name="consent" required>ฉันอ่านและยอมรับ <a href="#/privacy" target="_blank" rel="noopener">นโยบายความเป็นส่วนตัว</a></label>` : `${field("ชื่อผู้ใช้ หรืออีเมล", "identifier", "text", 'autocomplete="username" maxlength="254" placeholder="ชื่อผู้ใช้ หรือ you@example.com"')}${field("รหัสผ่าน", "password", "password", 'autocomplete="current-password" maxlength="128"')}<div class="form-end"><button type="button" class="link-btn" data-action="forgot">ลืมรหัสผ่าน?</button></div>`}<p class="form-error" role="alert"></p><button class="btn primary full" type="submit">${register ? "สมัครสมาชิก" : "เข้าสู่ระบบ"} ${i("ArrowRight")}</button></form><p class="auth-switch">${register ? `เป็นสมาชิกอยู่แล้ว? <a href="/login.html${suffix}">เข้าสู่ระบบ</a>` : `ยังไม่มีบัญชี? <a href="/register.html${suffix}">สมัครสมาชิก</a>`}</p></section></main>`;
  }
  function accountPage() {
    if (!session)
      return empty(
        "กรุณาเข้าสู่ระบบ",
        "จัดการบัญชีและคำสั่งซื้อของคุณ",
        "/login",
        "เข้าสู่ระบบ",
      );
    return `<main class="wrap subpage" id="main-content">${pageHead("MY ACCOUNT", "บัญชีของฉัน", "สวัสดี @" + esc(profile?.username || ""))}<div class="account-layout"><aside class="panel account-sidebar"><div class="account-avatar">${i("UserRound")}</div><strong>@${esc(profile?.username)}</strong><span class="role-tag">${admin ? "เจ้าของร้าน" : "สมาชิก"}</span><nav aria-label="เมนูบัญชี"><a href="/orders.html">${i("Package")} คำสั่งซื้อของฉัน</a><a href="/favorites.html">${i("Heart")} รายการโปรด</a>${admin ? `<a href="/admin/dashboard.html">${i("Settings")} จัดการร้านค้า</a>` : ""}</nav><button class="logout-btn full" data-action="logout" type="button">${i("LogOut")}<span>ออกจากระบบ</span></button></aside><div class="account-content"><section class="panel"><h2>แก้ไขโปรไฟล์</h2><p class="muted">ปรับข้อมูลบัญชีของคุณได้ โดยไม่เปลี่ยนข้อมูลในคำสั่งซื้อเดิม</p><form id="profile-form"><div class="form-grid">${field("ชื่อจริง", "first_name", "text", 'maxlength="80" autocomplete="given-name"', profile?.first_name || "")}${field("นามสกุล", "last_name", "text", 'maxlength="80" autocomplete="family-name"', profile?.last_name || "")}${field("ชื่อเล่น", "nickname", "text", 'maxlength="50"', profile?.nickname || "")}${field("อายุ", "age", "number", 'min="13" max="120"', profile?.age || "")}${field("เบอร์โทรศัพท์", "phone", "tel", 'pattern="0[0-9]{9}" autocomplete="tel"', profile?.phone || "")}${field("ชื่อผู้ใช้", "username", "text", 'pattern="[a-z0-9_]{3,30}" minlength="3" maxlength="30" autocomplete="username"', profile?.username || "")}</div><p class="form-error" role="alert"></p><button class="btn primary" type="submit">${i("Check")} บันทึกโปรไฟล์</button></form></section><section class="panel" id="address-book"><div class="section-heading"><div><h2>สมุดที่อยู่ <span class="count-label">${addresses.length}/5</span></h2><p>บันทึกได้สูงสุด 5 ที่อยู่ เพื่อเลือกใช้ตอนชำระเงิน</p></div><button class="btn secondary" data-action="edit-address" ${addresses.length >= 5 ? "disabled" : ""}>${i("Plus")} เพิ่มที่อยู่</button></div><div class="address-grid">${addresses.map((a) => `<article class="address-card ${a.is_default ? "default-address" : ""}"><div class="address-title"><h3>${esc(a.label)}</h3>${a.is_default ? '<span class="default-badge">ที่อยู่หลัก</span>' : ""}</div><strong>${esc(a.recipient)}</strong><span>${esc(a.phone)}</span><p class="preserve-lines">${esc(a.address)}</p><div class="button-row"><button class="btn secondary" data-action="edit-address" data-id="${a.id}">${i("Pencil")} แก้ไข</button><button class="icon-btn danger" data-action="delete-address" data-id="${a.id}" aria-label="ลบที่อยู่ ${esc(a.label)}">${i("Trash2")}</button></div></article>`).join("") || '<p class="muted">ยังไม่มีที่อยู่ที่บันทึกไว้ เพิ่มที่อยู่แรกเพื่อใช้เป็นที่อยู่หลักได้เลย</p>'}</div><p class="muted address-note">หากต้องการเปลี่ยนที่อยู่หลัก ให้แก้ไขที่อยู่อื่นและเลือก “ใช้เป็นที่อยู่หลัก” การแก้ไขหรือลบที่อยู่ไม่เปลี่ยนคำสั่งซื้อที่สร้างแล้ว</p></section><section class="panel"><h2>อีเมลบัญชี</h2><p>${esc(session.user.email)}</p>${session.user.new_email ? `<p class="notice">กำลังรอยืนยันอีเมลใหม่: ${esc(session.user.new_email)}</p>` : ""}<p class="muted">การเปลี่ยนอีเมลต้องยืนยันตามอีเมลที่ระบบส่งให้ ไม่เปลี่ยนทันทีจากฟอร์มนี้</p><form id="email-form">${field("อีเมลใหม่", "email", "email", 'maxlength="254" autocomplete="email"')}<p class="form-error" role="alert"></p><button class="btn secondary" type="submit">ส่งคำขอเปลี่ยนอีเมล</button></form></section><section class="panel"><h2>ความปลอดภัยของบัญชี</h2><p class="muted">ใช้รหัสผ่านที่ไม่ซ้ำกับบริการอื่น และออกจากระบบเมื่อใช้เครื่องสาธารณะ</p><div class="account-actions"><a class="btn secondary" href="/reset-password.html">เปลี่ยนรหัสผ่าน ${i("ArrowRight")}</a></div></section></div></div></main>`;
  }
  function recoveryPage() {
    return `<main class="wrap subpage narrow">${pageHead("A FRESH START", "ตั้งรหัสผ่านใหม่", "ใช้รหัสที่ไม่ซ้ำกับบัญชีอื่น อย่างน้อย 12 ตัวอักษร")}<form id="password-form" class="panel">${field("รหัสผ่านใหม่", "password", "password", 'minlength="12" maxlength="128" autocomplete="new-password"')}${field("ยืนยันรหัสผ่านใหม่", "confirm", "password", 'minlength="12" maxlength="128" autocomplete="new-password"')}<p class="form-error" role="alert"></p><button class="btn primary" type="submit">บันทึกรหัสผ่านใหม่</button></form></main>`;
  }
  function infoPage(type) {
    if (type === "about")
      return `<main class="wrap subpage info-page">${pageHead("ABOUT", esc(store.shop_name), esc(store.tagline))}<section class="panel prose"><h2>เกี่ยวกับร้าน</h2><p class="preserve-lines">${esc(store.about_text)}</p>${store.contact_email || store.contact_phone || store.contact_address ? `<h2>ติดต่อร้าน</h2><p>${esc(store.contact_email)}</p><p>${esc(store.contact_phone)}</p><p class="preserve-lines">${esc(store.contact_address)}</p>` : '<p class="muted">ร้านยังไม่ได้ระบุช่องทางติดต่อ</p>'}<a class="btn primary" href="/shop.html">เลือกซื้อสินค้า ${i("ArrowRight")}</a></section></main>`;
    if (type === "help")
      return `<main class="wrap subpage info-page">${pageHead("HELP", "การจัดส่งและชำระเงิน")}<section class="panel prose"><h2>การจัดส่ง</h2><p>ค่าจัดส่ง ${money(store.shipping_fee)} ต่อคำสั่งซื้อ จัดส่งฟรีเมื่อยอดสินค้าถึง ${money(store.free_shipping_threshold)}</p><p>${esc(store.shipping_note)}</p><h2>การชำระเงิน</h2><p>สแกน QR PromptPay ตามยอดในคำสั่งซื้อ ตรวจชื่อผู้รับเงินก่อนโอน แล้วแนบสลิป ร้านจะตรวจรายการธนาคารจริงก่อนอนุมัติ QR และสลิปไม่ใช่การยืนยันเงินเข้าอัตโนมัติ</p><a class="btn secondary" href="/orders.html">ดูคำสั่งซื้อ</a></section></main>`;
    const pages = {
      privacy: [
        "YOUR PRIVACY MATTERS",
        "ข้อมูลของคุณ เราใส่ใจ",
        "นโยบายความเป็นส่วนตัว",
        "เราเก็บชื่อ นามสกุล ชื่อเล่น เบอร์โทร อายุ ชื่อผู้ใช้ และอีเมล เพื่อจัดการบัญชี สมุดที่อยู่ที่คุณเลือกบันทึกได้สูงสุด 5 แห่งใช้ช่วยกรอกการจัดส่ง และคุณแก้ไขหรือลบได้จากบัญชี ส่วนที่อยู่ในคำสั่งซื้อและหลักฐานชำระเงินใช้ดำเนินการสั่งซื้อและจัดส่ง รหัสผ่านจัดการโดย Supabase Auth ไม่เก็บเป็นข้อความธรรมดา",
        "ข้อมูลถูกจัดเก็บบน Supabase และเว็บให้บริการผ่าน Vercel เจ้าของร้านเข้าถึงข้อมูลเท่าที่จำเป็นต่อการดำเนินการคำสั่งซื้อ สลิปและรูปอัปเดตการจัดส่งอยู่ในพื้นที่ส่วนตัวและเปิดดูผ่านลิงก์ชั่วคราว เฉพาะเจ้าของคำสั่งซื้อและแอดมิน หากคุณส่งรีวิว ชื่อผู้ใช้ คะแนน และความคิดเห็นจะแสดงให้สมาชิกคนอื่นและเจ้าของร้านเห็น รีวิวและประวัติคำสั่งซื้ออาจยังคงอยู่หลังร้านลบสินค้า โดยไม่แสดงอีเมล ที่อยู่ หรือรหัสคำสั่งซื้อในรีวิวสาธารณะ ตะกร้า รายการโปรด และเซสชันเข้าสู่ระบบจัดเก็บในเบราว์เซอร์ คุณสามารถออกจากระบบและล้างข้อมูลเบราว์เซอร์ได้ หากต้องการเข้าถึง แก้ไข หรือลบข้อมูล ให้ติดต่อเจ้าของร้าน ก่อนเปิดขายจริงเจ้าของร้านต้องเพิ่มช่องทางติดต่อ ระยะเวลาเก็บรักษาข้อมูล และเงื่อนไขคืนสินค้าให้ชัดเจน",
      ],
    };
    const [eye, title, intro, a, b] = pages[type] || pages.privacy;
    return `<main class="wrap subpage info-page">${pageHead(eye, title, intro)}<div class="info-layout"><article class="panel prose"><p>${a}</p><p>${b}</p><a class="btn primary" href="#/shop">เลือกชิ้นที่ใช่ ${i("ArrowRight")}</a></article></div></main>`;
  }
  return { authPage, accountPage, recoveryPage, infoPage };
}
