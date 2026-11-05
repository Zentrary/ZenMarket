export function createCheckoutPages(context) {
  const {
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
    promptpayPayload,
    statusLabel,
    date,
    store,
    shippingFor,
    pageURL,
  } = context;
  function totals() {
    const subtotal = cart.reduce(
      (sum, row) =>
        sum +
        (products.find((p) => p.id === row.id)?.price || 0) * row.quantity,
      0,
    );
    return {
      subtotal,
      shipping: shippingFor(subtotal, store),
      total: subtotal + shippingFor(subtotal, store),
    };
  }
  function summary() {
    const t = totals();
    return `<h3>สรุปรายการสั่งซื้อ</h3><div class="summary-line"><span>ยอดสินค้า (${count()} ชิ้น)</span><strong>${money(t.subtotal)}</strong></div><div class="summary-line"><span>ค่าจัดส่ง</span><strong>${t.shipping ? money(t.shipping) : "ฟรี"}</strong></div>${t.shipping ? `<p class="shipping-tip">อีก ${money(Number(store.free_shipping_threshold) - t.subtotal)} ก็ส่งฟรีแล้ว ${i("Truck")}</p>` : `<p class="shipping-tip">ออเดอร์นี้รับสิทธิ์จัดส่งฟรี ${i("Check")}</p>`}<div class="summary-total"><span>ยอดรวม</span><strong>${money(t.total)}</strong></div>`;
  }
  function cartRows() {
    return cart
      .map((row) => {
        const p = products.find((x) => x.id === row.id);
        return p
          ? `<div class="cart-row"><a href="#/product/${p.id}"><img src="${safeImage(p.image_url)}" alt="${esc(p.name)}"></a><div class="cart-item-info"><small>${esc(p.category)}</small><a href="#/product/${p.id}">${esc(p.name)}</a><span>${money(p.price)}</span></div><div class="stepper"><button data-action="quantity" data-id="${p.id}" data-delta="-1" aria-label="ลดจำนวน">${i("Minus")}</button><span>${row.quantity}</span><button data-action="quantity" data-id="${p.id}" data-delta="1" aria-label="เพิ่มจำนวน">${i("Plus")}</button></div><strong>${money(p.price * row.quantity)}</strong><button class="icon-btn" data-action="remove" data-id="${p.id}" aria-label="ลบ ${esc(p.name)}">${i("Trash2")}</button></div>`
          : `<div class="notice">ไม่พบสินค้าในตะกร้า <button class="btn secondary" data-action="remove" data-id="${row.id}">นำออก</button></div>`;
      })
      .join("");
  }
  function cartPage() {
    return `<main class="wrap subpage">${pageHead("YOUR GOOD FINDS", "ตะกร้าของคุณ", `${count()} ชิ้นที่เลือกมาเพื่อวันดีๆ`)}${cart.length ? `<div class="checkout-layout"><div class="cart-items">${cartRows()}<a class="back-link" href="#/shop">${i("ArrowLeft")} เลือกซื้อสินค้าต่อ</a></div><aside class="summary-card">${summary()}<a href="#/checkout" class="btn primary full">ไปชำระเงิน ${i("ArrowRight")}</a><p class="secure-note">${i("ShieldCheck")} ชำระเงินผ่าน PromptPay อย่างปลอดภัย</p></aside></div>` : empty("ตะกร้ายังว่างอยู่", "ลองเลือกสิ่งเล็กๆ ที่ทำให้วันนี้พิเศษขึ้น")}</main>`;
  }
  function checkoutPage() {
    if (!session)
      return empty(
        "เข้าสู่ระบบก่อนชำระเงิน",
        "เพื่อบันทึกคำสั่งซื้อและติดตามสถานะของคุณ",
        "/login",
        "เข้าสู่ระบบ",
      );
    if (!cart.length) return cartPage();
    return `<main class="wrap subpage">${pageHead("ONE STEP CLOSER TO YOUR JOY", "จัดส่งความสุขให้คุณ", "กรอกที่อยู่ แล้วชำระเงินด้วย QR PromptPay")}<div class="checkout-layout"><form id="checkout-form" class="panel"><h3>ข้อมูลจัดส่ง</h3>${field("ชื่อผู้รับ", "recipient", "text", 'minlength="2" maxlength="150" autocomplete="name"', profile ? profile.first_name + " " + profile.last_name : "")}${field("เบอร์โทรศัพท์", "phone", "tel", 'pattern="0[0-9]{9}" autocomplete="tel"', profile?.phone || "")}<label class="field"><span>ที่อยู่จัดส่ง (บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด และรหัสไปรษณีย์)</span><textarea name="address" required minlength="20" maxlength="1200" rows="4" autocomplete="street-address" placeholder="กรุณากรอกที่อยู่ครบถ้วนเพื่อการจัดส่ง"></textarea></label><div class="notice">${i("CreditCard")} ชำระผ่าน PromptPay หลังสร้างคำสั่งซื้อ กรุณาตรวจชื่อผู้รับเงินในแอปธนาคารทุกครั้ง</div><p class="form-error" role="alert"></p><button class="btn primary" type="submit">สร้างคำสั่งซื้อและรับ QR ${i("ArrowRight")}</button></form><aside class="summary-card">${summary()}<p class="muted">ยอดสุดท้ายและสต็อกจะตรวจสอบจากฐานข้อมูลอีกครั้ง</p></aside></div></main>`;
  }
  async function ordersPage() {
    if (!session)
      return empty(
        "ดูคำสั่งซื้อของคุณ",
        "กรุณาเข้าสู่ระบบเพื่อติดตามคำสั่งซื้อ",
        "/login",
        "เข้าสู่ระบบ",
      );
    const { data, error } = await db
      .from("orders")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return `<main class="wrap subpage">${pageHead("YOUR ORDERS", "คำสั่งซื้อของฉัน", "ติดตามทุกชิ้นโปรด ที่กำลังเดินทางไปหาคุณ")}${data.length ? `<div class="order-list">${data.map((o) => `<a class="order-card" href="#/order/${o.id}"><div><strong>#${o.id.slice(0, 8).toUpperCase()}</strong><small>${date(o.created_at)}</small></div><span>${o.items.length} รายการ</span><strong>${money(o.total)}</strong><span class="status ${o.status}">${statusLabel[o.status]}</span>${i("ChevronRight")}</a>`).join("")}</div>` : empty("ยังไม่มีคำสั่งซื้อ", "ชิ้นโปรดชิ้นแรก กำลังรอคุณอยู่")}</main>`;
  }
  async function orderPage(id) {
    if (!session)
      return empty(
        "กรุณาเข้าสู่ระบบ",
        "เพื่อดูรายละเอียดคำสั่งซื้อ",
        "/login",
        "เข้าสู่ระบบ",
      );
    const { data: o, error } = await db
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw Error("ไม่พบคำสั่งซื้อ หรือคุณไม่มีสิทธิ์เข้าถึง");
    const qr =
      o.status === "pending" || o.status === "review"
        ? await QRCode.toDataURL(promptpayPayload(o.promptpay_id, o.total), {
            width: 360,
            margin: 2,
            errorCorrectionLevel: "M",
          })
        : "";
    let slip = "";
    if (o.slip_path) {
      const { data } = await db.storage
        .from("payment-slips")
        .createSignedUrl(o.slip_path, 120);
      if (data)
        slip = `<a class="btn secondary" href="${esc(data.signedUrl)}" target="_blank" rel="noopener">${i("Eye")} ดูสลิปที่แนบ</a>`;
    }
    return `<main class="wrap subpage"><a class="back-link" href="#${admin ? "/admin/orders" : "/orders"}">${i("ArrowLeft")} กลับรายการคำสั่งซื้อ</a>${pageHead("ORDER DETAILS", `คำสั่งซื้อ #${o.id.slice(0, 8).toUpperCase()}`, date(o.created_at))}<div class="checkout-layout"><section class="panel"><span class="status ${o.status}">${statusLabel[o.status]}</span><div class="order-products">${o.items.map((p) => `<div class="order-product"><img src="${safeImage(p.image_url)}" alt="${esc(p.name)}"><div><strong>${esc(p.name)}</strong><small>${esc(p.sku)} · ${p.quantity} ชิ้น</small></div><strong>${money(p.price * p.quantity)}</strong></div>`).join("")}</div><div class="summary-line"><span>สินค้า</span><strong>${money(o.subtotal)}</strong></div><div class="summary-line"><span>ค่าจัดส่ง</span><strong>${money(o.shipping)}</strong></div><div class="summary-total"><span>ยอดชำระ</span><strong>${money(o.total)}</strong></div><h3>ข้อมูลจัดส่ง</h3><p>${esc(o.recipient)} · ${esc(o.phone)}</p><p class="address">${esc(o.address)}</p>${o.tracking ? `<div class="notice">${i("Truck")} เลขติดตามพัสดุ: ${esc(o.tracking)}</div>` : ""}<div class="button-row">${slip}${o.status === "pending" || (admin && o.status === "review") ? `<button class="btn secondary" data-action="cancel-order" data-id="${o.id}">ยกเลิกและคืนสต็อก</button>` : ""}</div>${admin && o.status === "review" ? `<div class="notice">ตรวจสอบยอดเข้าบัญชีจริงก่อนอนุมัติ สลิปเพียงอย่างเดียวไม่ยืนยันการโอน</div><button class="btn primary" data-action="approve-order" data-id="${o.id}">${i("Check")} ตรวจยอดเงินจริงแล้ว อนุมัติชำระเงิน</button>` : ""}${admin && o.status === "paid" ? `<form id="ship-form" data-id="${o.id}">${field("เลขติดตามพัสดุ", "tracking", "text", 'maxlength="100"')}<button class="btn primary" type="submit">ยืนยันจัดส่ง</button></form>` : ""}</section><aside class="payment-card">${qr ? `<div class="promptpay-logo">Prompt<span>Pay</span></div><p>สแกนเพื่อชำระเงิน</p><img class="qr" src="${qr}" alt="QR PromptPay ยอด ${money(o.total)}"><h2>${money(o.total)}</h2><strong>${esc(o.recipient_name)}</strong><p class="muted">PromptPay ${esc(o.promptpay_id.replace(/.(?=.{4})/g, "•"))}</p><a class="btn secondary full" href="${qr}" download="zenmarket-${o.id.slice(0, 8)}.png">${i("Download")} บันทึก QR Code</a><div class="notice">ตรวจชื่อผู้รับเงินในแอปธนาคารให้ตรงกัน QR นี้ไม่ตรวจยอดอัตโนมัติ ห้ามชำระซ้ำหากโอนแล้ว</div>${o.user_id === session.user.id ? `<form id="slip-form" data-id="${o.id}"><label class="field"><span>${o.status === "review" ? "ส่งสลิปใหม่ (ถ้าจำเป็น)" : "แนบหลักฐานการชำระเงิน"}</span><input type="file" name="slip" accept="image/png,image/jpeg,image/webp" required></label><small>JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB</small><button class="btn primary full" type="submit">${i("Upload")} ส่งสลิปให้ร้านตรวจสอบ</button><p class="form-error" role="alert"></p></form>` : ""}` : `${i(o.status === "cancelled" ? "Package" : "CheckCircle2", "payment-success")}<h2>${statusLabel[o.status]}</h2><p>${o.status === "paid" ? "ร้านกำลังเตรียมจัดส่งความสุขให้คุณ" : o.status === "shipped" ? "ติดตามพัสดุได้จากเลขจัดส่งในหน้านี้" : "คำสั่งซื้อนี้ถูกยกเลิกและคืนสต็อกแล้ว"}</p>`}</aside></div></main>`;
  }
  return {
    totals,
    summary,
    cartRows,
    cartPage,
    checkoutPage,
    ordersPage,
    orderPage,
  };
}
