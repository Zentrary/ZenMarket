// Editorial landing: real shop settings and optional genuine reviews.
export async function renderHome({
  db,
  store,
  session,
  esc,
  date,
  i,
  money,
}) {
  let reviews = [];
  if (db) {
    try {
      const { data, error } = await db.rpc("get_home_reviews");
      if (error) throw error;
      reviews = (Array.isArray(data) ? data : [])
        .filter((r) => [4, 5].includes(r.rating))
        .slice(0, 6);
    } catch {
      // Reviews are optional; never invent reviews or block the rest of the page.
    }
  }
  const freeShipping =
    Number(store.shipping_fee) <= 0 ||
    Number(store.free_shipping_threshold) <= 0;
  const shippingSummary = freeShipping
    ? "จัดส่งฟรี"
    : `ค่าจัดส่ง ${esc(money(store.shipping_fee))}`;
  const shippingDetail = freeShipping
    ? "ตรวจสอบที่อยู่ก่อนยืนยันคำสั่งซื้อ"
    : `จัดส่งฟรีเมื่อซื้อครบ ${esc(money(store.free_shipping_threshold))}`;
  const startURL = session ? "/shop/index.html" : "/auth/login.html";
  const steps = [
    [
      "ShoppingBag",
      "เลือกสินค้าที่ถูกใจ",
      "เข้าสู่ระบบเพื่อดูสินค้า เลือกจำนวน และเพิ่มลงตะกร้า ตรวจสอบรายการก่อนสั่งซื้อ",
    ],
    [
      "CreditCard",
      "ชำระเงินและแนบสลิป",
      "กรอกที่อยู่จัดส่ง ชำระผ่าน QR PromptPay ของคำสั่งซื้อ แล้วแนบหลักฐานภายในเวลาที่กำหนด",
    ],
    [
      "Package",
      "ติดตามจนได้รับสินค้า",
      "ร้านตรวจสอบการชำระเงินก่อนจัดส่ง ดูสถานะและข้อมูลจัดส่งได้จากหน้าคำสั่งซื้อของคุณ",
    ],
  ];
  const questions = [
    [
      "เริ่มเลือกซื้อสินค้าอย่างไร?",
      "เข้าสู่ระบบหรือสมัครสมาชิกก่อนเลือกดูสินค้า จากนั้นเพิ่มสินค้าที่ต้องการลงตะกร้าและตรวจสอบรายการก่อนยืนยันคำสั่งซื้อ",
    ],
    [
      "ชำระเงินผ่านช่องทางไหน?",
      "ชำระผ่าน QR PromptPay ที่แสดงในคำสั่งซื้อ แล้วแนบสลิปภายในเวลาที่ระบุ ร้านจะตรวจสอบยอดก่อนเปลี่ยนสถานะการชำระเงิน",
    ],
    [
      "ค่าจัดส่งเท่าไร และจัดส่งเมื่อไร?",
      `${shippingSummary} · ${shippingDetail}${store.shipping_note ? `<br>${esc(store.shipping_note)}` : ""} ตรวจสอบยอดรวมอีกครั้งที่หน้าชำระเงิน`,
    ],
    [
      "ดูสถานะคำสั่งซื้อได้ที่ไหน?",
      "เมื่อเข้าสู่ระบบแล้ว เปิดเมนูคำสั่งซื้อเพื่อดูสถานะการชำระเงินและการจัดส่ง หากมีข้อสงสัย ติดต่อร้านพร้อมแจ้งเลขคำสั่งซื้อ",
    ],
  ];
  return `<main class="store-home" id="main-content">
    <section class="home-hero" aria-labelledby="home-title">
      <div class="home-intro">
        <span class="home-kicker home-welcome"><span aria-hidden="true"></span> ยินดีต้อนรับสู่ร้านของเรา</span>
        <h1 id="home-title">เลือกสิ่งที่ชอบ<span>ให้เป็นของคุณ<span class="home-title-dot">.</span></span></h1>
        <p class="home-description">${esc(store.tagline || "เลือกดูสินค้า สั่งซื้อ และติดตามคำสั่งซื้อได้ในที่เดียว")}</p>
        <div class="home-actions"><a class="btn primary" href="${startURL}">${session ? "เลือกดูสินค้า" : "เข้าสู่ระบบเพื่อเลือกซื้อ"} ${i("ArrowUpRight")}</a></div>
      </div>
      <aside class="home-order-guide" aria-labelledby="home-guide-title">
        <div class="home-guide-top"><span>A BETTER WAY TO SHOP</span><span class="home-guide-icon">${i("ShoppingBag")}</span></div>
        <div class="home-guide-title"><span class="home-kicker">จากสิ่งที่ชอบ สู่หน้าบ้านคุณ</span><h2 id="home-guide-title">เลือกง่าย สั่งสบาย<br><span>ในแบบของคุณ</span></h2></div>
        <ol class="home-guide-list"><li><span class="home-guide-number">01</span><span>เลือกสินค้า<small>ดูรายละเอียดก่อนตัดสินใจ</small></span>${i("ShoppingBag")}</li><li><span class="home-guide-number">02</span><span>ชำระเงิน<small>PromptPay พร้อมแนบสลิป</small></span>${i("CreditCard")}</li><li><span class="home-guide-number">03</span><span>รอรับสินค้า<small>ติดตามจากหน้าคำสั่งซื้อ</small></span>${i("Package")}</li></ol>
      </aside>
    </section>
    <section class="home-service-strip" aria-label="ข้อมูลก่อนสั่งซื้อ">
      <div>${i("CreditCard")}<span><strong>ชำระผ่าน PromptPay</strong><small>แนบสลิปให้ร้านตรวจสอบ</small></span></div>
      <div>${i("Truck")}<span><strong>${shippingSummary}</strong><small>${shippingDetail}</small></span></div>
      <div>${i("ClipboardList")}<span><strong>ติดตามคำสั่งซื้อได้</strong><small>ดูสถานะได้จากบัญชีของคุณ</small></span></div>
    </section>
    <section class="home-section home-how" id="how-to-order" aria-labelledby="home-how-title"><div class="home-section-heading"><div><span class="home-kicker">HOW TO ORDER</span><h2 id="home-how-title">สั่งซื้อง่าย ใน 3 ขั้นตอน</h2></div><p>ตั้งแต่เลือกสินค้า จนถึงวันรับของ</p></div><ol class="home-step-grid">${steps.map(([icon, title, text], index) => `<li class="home-step"><div class="home-step-top"><span>0${index + 1}</span>${i(icon)}</div><h3>${title}</h3><p>${text}</p></li>`).join("")}</ol></section>
    ${reviews.length ? `<section class="home-section home-reviews" aria-labelledby="home-reviews-title"><div class="home-section-heading"><div><span class="home-kicker">FROM OUR CUSTOMERS</span><h2 id="home-reviews-title">เสียงจากคนที่ได้รับของแล้ว</h2></div><p>รีวิวจากผู้ซื้อที่ยืนยันรับสินค้าแล้ว</p></div><div class="home-review-list">${reviews.map((r) => `<article class="home-review"><div class="home-review-meta"><strong>@${esc(r.reviewer_name)}</strong><span class="home-review-stars" aria-label="${r.rating} จาก 5 ดาว">${"★".repeat(r.rating)}<span>${"☆".repeat(5 - r.rating)}</span></span></div>${r.comment ? `<p>${esc(r.comment)}</p>` : ""}<small>${esc(r.product_name)} · ${esc(date(r.created_at))}</small></article>`).join("")}</div></section>` : ""}
    <section class="home-section home-faq" aria-labelledby="home-faq-title"><div class="home-faq-intro"><span class="home-kicker">GOOD TO KNOW</span><h2 id="home-faq-title">ก่อนสั่งซื้อ<br>อยากรู้อะไรบ้าง?</h2><p>รวมคำตอบสั้น ๆ เพื่อให้คุณเริ่มต้นได้ง่ายขึ้น</p></div><div class="home-faq-list">${questions.map(([question, answer]) => `<details><summary>${question}${i("Plus")}</summary><p>${answer}</p></details>`).join("")}</div></section>
    <section class="home-contact-panel" aria-labelledby="home-contact-title"><div class="home-contact-icon">${i("Headphones")}</div><div><span class="home-kicker">HERE TO HELP</span><h2 id="home-contact-title">มีอะไรให้ร้านช่วยไหม?</h2><p>สอบถามรายละเอียดสินค้า หรือแจ้งเรื่องคำสั่งซื้อ ติดต่อเราได้โดยตรง</p></div><a class="btn secondary" href="/pages/contact.html">ติดต่อร้าน ${i("ArrowUpRight")}</a></section>
  </main>`;
}
