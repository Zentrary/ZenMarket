import { checkoutRecipient } from "../../core/customer.js";
import { orderSteps, statusLabels } from "../../core/experience.js";
export function createCheckoutPages(context) {
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
  function checkoutItems() {
    return `<div class="checkout-products">${cart
      .map((row) => {
        const p = products.find((p) => p.id === row.id);
        return p
          ? `<article class="checkout-product"><img src="${safeImage(p.image_url)}" alt="${esc(p.name)}"><div><a href="/shop/product.html?id=${p.id}">${esc(p.name)}</a><small>SKU ${esc(p.sku)} · ${row.quantity} ชิ้น × ${money(p.price)}</small><strong>${money(row.quantity * p.price)}</strong></div></article>`
          : "";
      })
      .join("")}</div>`;
  }
  function summary(showItems = false) {
    const t = totals();
    return `<h3>สรุปรายการสั่งซื้อ</h3>${showItems ? checkoutItems() : ""}<div class="summary-line"><span>ยอดสินค้า (${count()} ชิ้น)</span><strong>${money(t.subtotal)}</strong></div><div class="summary-line"><span>ค่าจัดส่ง</span><strong>${t.shipping ? money(t.shipping) : "ฟรี"}</strong></div>${t.shipping ? `<p class="shipping-tip">อีก ${money(Number(store.free_shipping_threshold) - t.subtotal)} ก็ส่งฟรีแล้ว ${i("Truck")}</p>` : `<p class="shipping-tip">ออเดอร์นี้รับสิทธิ์จัดส่งฟรี ${i("Check")}</p>`}<div class="summary-total"><span>ยอดรวม</span><strong>${money(t.total)}</strong></div>`;
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
    const selected = addresses.find((a) => a.is_default);
    const delivery = checkoutRecipient(selected, profile);
    return `<main class="wrap subpage">${pageHead("ONE STEP CLOSER TO YOUR JOY", "จัดส่งความสุขให้คุณ", "กรอกที่อยู่ แล้วชำระเงินด้วย QR PromptPay")}<div class="checkout-layout"><form id="checkout-form" class="panel"><h3>ข้อมูลจัดส่ง</h3><label class="field"><span>เลือกที่อยู่จัดส่ง</span><select id="saved-address" name="saved_address"><option value="" ${!selected ? "selected" : ""}>กรอกที่อยู่ใหม่ด้วยตัวเอง</option>${addresses.map((a) => `<option value="${a.id}" ${selected?.id === a.id ? "selected" : ""}>${esc(a.label)}${a.is_default ? " · ที่อยู่หลัก" : ""} — ${esc(a.recipient)}</option>`).join("")}</select></label><p class="muted">เลือกที่อยู่ที่บันทึกไว้ หรือกรอกเอง ปรับข้อมูลสำหรับคำสั่งซื้อนี้ได้โดยไม่เปลี่ยนสมุดที่อยู่</p><a class="address-manage-link" href="/account/index.html#address-book" target="_blank" rel="noopener">จัดการสมุดที่อยู่ ${i("ArrowUpRight")}</a>${field("ชื่อผู้รับ", "recipient", "text", 'minlength="2" maxlength="150" autocomplete="name"', delivery.recipient)}${field("เบอร์โทรศัพท์", "phone", "tel", 'pattern="0[0-9]{9}" autocomplete="tel"', delivery.phone)}<label class="field"><span>ที่อยู่จัดส่ง (บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด และรหัสไปรษณีย์)</span><textarea name="address" required minlength="20" maxlength="1200" rows="4" autocomplete="street-address" placeholder="กรุณากรอกที่อยู่ครบถ้วนเพื่อการจัดส่ง">${esc(delivery.address)}</textarea></label><div class="notice">${i("CreditCard")} ชำระผ่าน PromptPay หลังสร้างคำสั่งซื้อ กรุณาตรวจชื่อผู้รับเงินในแอปธนาคารทุกครั้ง</div><p class="form-error" role="alert"></p><button class="btn primary" type="submit">สร้างคำสั่งซื้อและรับ QR ${i("ArrowRight")}</button></form><aside class="summary-card" id="checkout-summary">${summary(true)}<p class="muted">ยอดสุดท้ายและสต็อกจะตรวจสอบจากฐานข้อมูลอีกครั้ง</p></aside></div></main>`;
  }
  async function ordersPage() {
    if (!session)
      return empty(
        "กรุณาเข้าสู่ระบบ",
        "เพื่อดูคำสั่งซื้อของคุณ",
        "/login",
        "เข้าสู่ระบบ",
      );
    const selected = new URLSearchParams(location.search).get("status") || "";
    let query = db
      .from("orders")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (Object.hasOwn(statusLabels, selected))
      query = query.eq("status", selected);
    const { data, error } = await query;
    if (error) throw error;
    return `<main class="wrap subpage">${pageHead("YOUR ORDERS", "คำสั่งซื้อของฉัน", "ติดตามตั้งแต่ชำระเงินจนถึงมือคุณ และรีวิวหลังได้รับสินค้า")}<nav class="order-filters" aria-label="สถานะคำสั่งซื้อ"><a class="pill ${!selected ? "selected" : ""}" href="/account/orders.html">ทั้งหมด</a>${Object.entries(
      statusLabels,
    )
      .map(
        ([key, label]) =>
          `<a class="pill ${selected === key ? "selected" : ""}" href="/account/orders.html?status=${key}">${label}</a>`,
      )
      .join(
        "",
      )}</nav><p class="muted">แสดงล่าสุดไม่เกิน 100 รายการต่อสถานะ</p>${data.length ? `<div class="order-list">${data.map((o) => `<a class="order-card" href="/account/order.html?id=${o.id}"><div><strong>#${o.id.slice(0, 8).toUpperCase()}</strong><small>${date(o.created_at)}</small><span class="order-preview">${esc(o.items[0]?.name)}${o.items.length > 1 ? " และอีก " + (o.items.length - 1) + " รายการ" : ""}</span></div><strong>${money(o.total)}</strong><span class="status ${o.status}">${statusLabel[o.status]}</span>${i("ChevronRight")}</a>`).join("")}</div>` : empty("ยังไม่มีคำสั่งซื้อในสถานะนี้", "เลือกชมสินค้า หรือดูสถานะอื่นได้จากด้านบน")}</main>`;
  }
  async function orderPage(id) {
    if (!session)
      return empty(
        "กรุณาเข้าสู่ระบบ",
        "เพื่อดูรายละเอียดคำสั่งซื้อ",
        "/login",
        "เข้าสู่ระบบ",
      );
    let query = db.from("orders").select("*").eq("id", id);
    if (!admin) query = query.eq("user_id", session.user.id);
    const { data: o, error } = await query.single();
    if (error || !o || (!admin && o.user_id !== session.user.id))
      throw Error("ไม่พบคำสั่งซื้อ หรือคุณไม่มีสิทธิ์เข้าถึง");
    const own = o.user_id === session.user.id;
    const deadlinePassed =
      o.status === "pending" &&
      o.payment_due_at &&
      Date.now() >= new Date(o.payment_due_at).getTime();
    const paymentNotice =
      o.status === "pending" && o.payment_due_at
        ? `<section class="payment-deadline" data-payment-due="${esc(o.payment_due_at)}"><strong data-deadline-label>${deadlinePassed ? "หมดเวลาชำระเงินแล้ว" : "เวลาชำระและส่งสลิปที่เหลือ"}</strong> <strong data-payment-countdown></strong><p>ชำระและส่งสลิปภายใน 30 นาที ระบบคืนสต็อกเฉพาะรายการที่ยังไม่ส่งสลิป หากหมดเวลาแล้วอย่าโอนเงิน หากโอนแล้วให้ติดต่อร้านพร้อมหลักฐานทันที</p></section>`
        : o.expired_at
          ? `<div class="notice">คำสั่งซื้อนี้หมดเวลาชำระเงินและคืนสต็อกแล้ว หากโอนเงินแล้วกรุณาติดต่อร้านพร้อมหลักฐาน</div>`
          : "";
    const qr =
      !deadlinePassed && ["pending", "review"].includes(o.status)
        ? await QRCode.toDataURL(promptpayPayload(o.promptpay_id, o.total), {
            width: 360,
            margin: 2,
            errorCorrectionLevel: "M",
          })
        : "";
    let slip = "";
    if (o.slip_path) {
      const { data, error } = await db.storage
        .from("payment-slips")
        .createSignedUrl(o.slip_path, 120);
      if (error) throw error;
      if (data)
        slip = `<a class="btn secondary" href="${esc(data.signedUrl)}" target="_blank" rel="noopener">${i("Eye")} ดูสลิปที่แนบ</a>`;
    }
    const { data: updates, error: updateError } = await db
      .from("order_shipping_updates")
      .select("*")
      .eq("order_id", o.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (updateError) throw updateError;
    const renderedUpdates = await Promise.all(
      updates.map(async (update) => {
        const images = await Promise.all(
          update.image_paths.map(async (path) => {
            const { data, error } = await db.storage
              .from("shipping-updates")
              .createSignedUrl(path, 120);
            if (error) throw error;
            return `<button type="button" class="shipping-photo" data-action="view-shipping-photo" data-path="${esc(path)}" aria-label="ดูรูปอัปเดตการจัดส่งขนาดใหญ่"><img src="${esc(data.signedUrl)}" data-shipping-path="${esc(path)}" alt="รูปอัปเดตการจัดส่งจากร้าน" loading="lazy"></button>`;
          }),
        );
        return `<article class="shipment-update"><div class="shipment-marker">${i("Truck")}</div><div><strong>อัปเดตจากร้าน</strong><time>${date(update.created_at)}</time><p class="preserve-lines">${esc(update.message)}</p><div class="shipping-photo-grid">${images.join("")}</div></div></article>`;
      }),
    );
    const shippingFields = `<label class="field"><span>ข้อความอัปเดต (ไม่เกิน 1,000 ตัวอักษร)</span><textarea name="shipping_message" maxlength="1000" rows="3" placeholder="เช่น แพ็กพัสดุเรียบร้อย ส่งให้ขนส่งแล้ว"></textarea></label><label class="field"><span>รูปการจัดส่ง (สูงสุด 4 รูป · รูปละไม่เกิน 5 MB)</span><input type="file" name="shipping_images" multiple accept="image/png,image/jpeg,image/webp"></label><div class="shipping-preview image-editor" aria-live="polite"></div><p class="muted">รูปเป็นข้อมูลส่วนตัว เห็นได้เฉพาะคุณและลูกค้าเจ้าของคำสั่งซื้อนี้ กรุณาอย่าให้ติดข้อมูลลูกค้าคนอื่น</p>`;
    const shipmentFeed = `<section class="panel shipping-updates"><div class="section-heading"><div><span class="eyebrow">DELIVERY UPDATES</span><h2>ความเคลื่อนไหวการจัดส่ง</h2></div>${updates.some((u) => u.image_paths.length) ? '<button class="btn secondary" data-action="refresh-shipping-images">โหลดรูปใหม่</button>' : ""}</div>${renderedUpdates.join("") || '<p class="muted">ร้านยังไม่ได้เพิ่มรูปหรือข้อความอัปเดตการจัดส่ง เมื่อมีอัปเดตจะแสดงที่นี่</p>'}${updates.length === 20 ? '<p class="muted">แสดงอัปเดตล่าสุด 20 รายการ</p>' : ""}${updates.some((u) => u.image_paths.length) ? '<small class="muted">ลิงก์รูปมีอายุสั้นเพื่อความเป็นส่วนตัว หากรูปหมดอายุให้กดโหลดรูปใหม่</small>' : ""}${admin && ["shipped", "delivered"].includes(o.status) ? `<form id="shipping-update-form" data-id="${o.id}"><h3>เพิ่มอัปเดตให้ลูกค้า</h3>${shippingFields}<p class="form-error" role="alert"></p><button class="btn primary" type="submit">${i("Upload")} เผยแพร่อัปเดตการจัดส่ง</button></form>` : ""}</section>`;
    const timeline =
      o.status === "cancelled"
        ? '<div class="notice">คำสั่งซื้อนี้ยกเลิกแล้ว ไม่มีการดำเนินการจัดส่งต่อ หากชำระเงินแล้วกรุณาติดต่อร้าน</div>'
        : `<ol class="order-timeline">${orderSteps(o)
            .map(
              (step, index) =>
                `<li class="${step.complete ? "complete" : step.current ? "current" : ""}" ${step.current ? 'aria-current="step"' : ""}><span class="step-dot">${step.complete ? i("Check") : index + 1}</span><strong>${step.title}</strong><small>${step.description}</small>${step.time ? `<time>${date(step.time)}</time>` : ""}</li>`,
            )
            .join("")}</ol>`;
    let feedback = "";
    if (o.status === "delivered") {
      const { data: reviews, error } = await db.rpc("get_order_reviews", {
        p_order_id: o.id,
      });
      if (error) throw error;
      feedback = `<section class="panel order-feedback"><span class="eyebrow">YOUR EXPERIENCE MATTERS</span><h2>${own ? "ให้ดาวและเขียนรีวิวสินค้า" : "รีวิวของคำสั่งซื้อนี้"}</h2><p class="muted">ความคิดเห็นจากผู้ซื้อที่ได้รับสินค้าจริง ช่วยให้ร้านปรับปรุงบริการ</p>${[
        ...new Map(o.items.map((p) => [p.id, p])).values(),
      ]
        .map((p) => {
          const r = reviews.find((r) => r.product_id === p.id);
          return own
            ? `<form id="review-form-${p.id}" class="review-form" data-order="${o.id}" data-product="${p.id}"><h3>${esc(p.name)}</h3><fieldset class="star-picker"><legend>ให้คะแนนสินค้า</legend>${[1, 2, 3, 4, 5].map((n) => `<label><input type="radio" name="rating" value="${n}" required ${r?.rating === n ? "checked" : ""}><span>${n} ★</span></label>`).join("")}</fieldset><label class="field"><span>ความคิดเห็น (ไม่บังคับ)</span><textarea name="comment" maxlength="2000" rows="3" placeholder="คุณชอบอะไร หรืออยากให้เราปรับปรุงตรงไหน">${esc(r?.comment || "")}</textarea></label><p class="form-error" role="alert"></p><button class="btn primary" type="submit">${r ? "บันทึกการแก้ไขรีวิว" : "ส่งรีวิวสินค้า"}</button></form>`
            : `<article class="review-card"><h3>${esc(p.name)}</h3>${r ? `<span class="review-stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</span><p>${esc(r.comment)}</p>` : '<p class="muted">ยังไม่ได้รีวิว</p>'}</article>`;
        })
        .join("")}</section>`;
    }
    return `<main class="wrap subpage"><a class="back-link" href="${admin ? "/admin/orders.html" : "/account/orders.html"}">${i("ArrowLeft")} กลับรายการคำสั่งซื้อ</a>${pageHead("ORDER DETAILS", "คำสั่งซื้อ #" + o.id.slice(0, 8).toUpperCase(), date(o.created_at))}${paymentNotice}<section class="panel order-status-panel"><div class="section-heading"><h2>ติดตามคำสั่งซื้อ</h2><span class="status ${o.status}">${statusLabel[o.status]}</span></div>${timeline}</section><div class="checkout-layout"><section class="panel"><h2>รายละเอียดสินค้า</h2><div class="order-products">${o.items.map((p) => `<div class="order-product"><img src="${safeImage(p.image_url)}" alt="${esc(p.name)}"><div><strong>${esc(p.name)}</strong><small>${esc(p.sku)} · ${p.quantity} ชิ้น</small></div><strong>${money(p.price * p.quantity)}</strong></div>`).join("")}</div><div class="summary-line"><span>สินค้า</span><strong>${money(o.subtotal)}</strong></div><div class="summary-line"><span>ค่าจัดส่ง</span><strong>${money(o.shipping)}</strong></div><div class="summary-total"><span>ยอดชำระ</span><strong>${money(o.total)}</strong></div><h3>ข้อมูลจัดส่ง</h3><p>${esc(o.recipient)} · ${esc(o.phone)}</p><p class="address">${esc(o.address)}</p>${o.tracking ? `<div class="tracking-info">${i("Truck")}<div><small>เลขติดตามพัสดุ</small><strong>${esc(o.tracking)}</strong><p>ตรวจสอบกับขนส่งที่ร้านแจ้ง หากไม่ทราบขนส่งให้ติดต่อร้าน</p></div></div>` : ""}<div class="button-row">${slip}${o.status === "pending" || (admin && o.status === "review") ? `<button class="btn secondary" data-action="cancel-order" data-id="${o.id}">ยกเลิกและคืนสต็อก</button>` : ""}</div>${admin && o.status === "review" ? `<div class="notice">ตรวจยอดเข้าธนาคารจริงก่อนอนุมัติ สลิปเพียงอย่างเดียวไม่ยืนยันการโอน</div><button class="btn primary" data-action="approve-order" data-id="${o.id}">${i("Check")} ตรวจยอดเงินจริงแล้ว อนุมัติชำระเงิน</button>` : ""}${admin && o.status === "paid" ? `<form id="ship-form" data-id="${o.id}">${field("เลขติดตามพัสดุ", "tracking", "text", 'maxlength="100"')}${shippingFields}<p class="form-error" role="alert"></p><button class="btn primary" type="submit">ยืนยันจัดส่ง</button></form>` : ""}</section><aside class="payment-card" ${o.status === "pending" ? "data-expiring-payment" : ""}>${qr ? `<div class="promptpay-logo">Prompt<span>Pay</span></div><p>สแกนเพื่อชำระเงิน</p><img class="qr" src="${qr}" alt="QR PromptPay ยอด ${money(o.total)}"><h2>${money(o.total)}</h2><strong>${esc(o.recipient_name)}</strong><p class="muted">PromptPay ${esc(o.promptpay_id.replace(/.(?=.{4})/g, "•"))}</p><a class="btn secondary full" href="${qr}" download="zenmarket-${o.id.slice(0, 8)}.png">${i("Download")} บันทึก QR Code</a><div class="notice">ตรวจชื่อผู้รับเงินในแอปธนาคารให้ตรงกัน QR นี้ไม่ตรวจยอดอัตโนมัติ ห้ามชำระซ้ำหากโอนแล้ว</div>${own ? `<form id="slip-form" data-id="${o.id}"><label class="field"><span>${o.status === "review" ? "ส่งสลิปใหม่ (ถ้าจำเป็น)" : "แนบหลักฐานการชำระเงิน"}</span><input type="file" name="slip" accept="image/png,image/jpeg,image/webp" required></label><small>JPG, PNG หรือ WebP ไม่เกิน 5 MB</small><button class="btn primary full" type="submit">${i("Upload")} ส่งสลิปให้ร้านตรวจสอบ</button><p class="form-error" role="alert"></p></form>` : ""}` : `${i(o.status === "cancelled" || deadlinePassed ? "Package" : "CheckCircle2", "payment-success")}<h2>${deadlinePassed ? "หมดเวลาชำระเงิน" : statusLabel[o.status]}</h2><p>${o.status === "paid" ? "ร้านยืนยันยอดแล้ว กำลังเตรียมสินค้า" : o.status === "shipped" ? "สินค้าอยู่ระหว่างเดินทาง ยังไม่ถือว่าได้รับจนกว่าคุณจะยืนยัน" : o.status === "delivered" ? "ขอบคุณที่อุดหนุน ให้คะแนนสินค้าและแบ่งปันความคิดเห็นด้านล่างได้เลย" : "คำสั่งซื้อนี้ถูกยกเลิกแล้ว"}</p>${own && o.status === "shipped" ? `<button class="btn primary full" data-action="receive-order" data-id="${o.id}">${i("Check")} ฉันได้รับสินค้าแล้ว</button>` : ""}<a class="btn secondary full" href="/pages/contact.html">ติดต่อร้าน ${i("Headphones")}</a>`}</aside></div>${shipmentFeed}${feedback}</main>`;
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
