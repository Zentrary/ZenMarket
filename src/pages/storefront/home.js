// A restrained storefront introduction, using real shop settings and reviews only.
export async function renderHome({
  db,
  store,
  session,
  esc,
  date,
  i,
  money,
  safeImage,
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
  const shippingSummary =
    Number(store.shipping_fee) <= 0 ||
    Number(store.free_shipping_threshold) <= 0
      ? "จัดส่งฟรี"
      : `ค่าจัดส่ง ${esc(money(store.shipping_fee))}<br>จัดส่งฟรีเมื่อครบ ${esc(money(store.free_shipping_threshold))}`;
  return `<main class="simple-home" id="main-content">
    <section class="home-welcome" aria-labelledby="home-title">
      <div class="home-intro">
        <div class="home-identity">${store.logo_url ? `<img class="home-logo" src="${safeImage(store.logo_url)}" alt="" width="48" height="48">` : `<span class="home-monogram" aria-hidden="true">${esc([...store.shop_name][0] || "Z")}</span>`}<span>ยินดีต้อนรับสู่ร้านของเรา</span></div>
        <h1 id="home-title">${esc(store.shop_name)}</h1>
        ${store.tagline ? `<p class="home-description">${esc(store.tagline)}</p>` : ""}
        <div class="home-actions">${session ? `<a class="btn primary" href="/shop/index.html">ดูสินค้า ${i("ArrowRight")}</a>` : ""}<a class="${session ? "home-contact-link" : "btn secondary"}" href="/pages/contact.html">ติดต่อร้าน ${i("ArrowUpRight")}</a></div>
      </div>
      <aside class="home-details" aria-label="ข้อมูลการชำระเงินและจัดส่ง">
        <div class="home-detail">${i("CreditCard")}<div><h2>ชำระผ่าน PromptPay</h2><p>แนบหลักฐานหลังชำระเงิน<br>ร้านตรวจสอบยอดก่อนจัดส่ง</p></div></div>
        <div class="home-detail">${i("Truck")}<div><h2>การจัดส่ง</h2>${store.shipping_note ? `<p>${esc(store.shipping_note)}</p>` : ""}<small>${shippingSummary}</small></div></div>
      </aside>
    </section>
    ${
      reviews.length
        ? `<section class="home-reviews" aria-labelledby="home-reviews-title">
      <div class="home-reviews-heading"><h2 id="home-reviews-title">รีวิวจากลูกค้า</h2><p>จากผู้ซื้อที่ยืนยันรับสินค้าแล้ว</p></div>
      <div class="home-review-list">${reviews
        .map(
          (r) => `<article class="home-review">
        <div class="home-review-meta"><strong>@${esc(r.reviewer_name)}</strong><span class="home-review-stars" aria-label="${r.rating} จาก 5 ดาว">${"★".repeat(r.rating)}<span>${"☆".repeat(5 - r.rating)}</span></span></div>
        ${r.comment ? `<p>${esc(r.comment)}</p>` : ""}
        <small>${esc(r.product_name)} · ${date(r.created_at)}</small>
      </article>`,
        )
        .join("")}</div>
    </section>`
        : ""
    }
  </main>`;
}
