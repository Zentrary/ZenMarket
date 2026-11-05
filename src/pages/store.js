import { stockState } from "../customer.js";
import { reviewColumns } from "../experience.js";
export function createStorePages(context) {
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
    statusLabel,
    date,
    store,
    productImages,
    safeSocialURL,
    shippingFor,
    pageURL,
  } = context;
  function home() {
    return `<main class="landing wrap" id="main-content"><section class="landing-hero"><div class="hero-copy"><span class="eyebrow"><span class="live-dot"></span> YOUR EVERYDAY, A LITTLE BETTER</span><h1>ชิ้นที่ใช่<span>ในสไตล์คุณ.</span></h1><p class="hero-shop">${esc(store.shop_name)}</p><p class="hero-description">${esc(store.tagline)}</p><div class="hero-actions"><a class="btn primary" href="/shop.html">ค้นพบสินค้าของเรา ${i("ArrowUpRight")}</a><a class="hero-secondary" href="${session ? "/orders.html" : "/login.html"}">${session ? "ติดตามคำสั่งซื้อ" : "เป็นสมาชิกอยู่แล้ว? เข้าสู่ระบบ"} ${i("ArrowRight")}</a></div><div class="hero-assurances"><span>${i("ShieldCheck")} ดูแลโดยเจ้าของร้าน</span><span>${i("CreditCard")} ชำระผ่าน PromptPay</span></div></div><div class="hero-art" aria-hidden="true"><div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div><span class="art-spark spark-one">✦</span><span class="art-spark spark-two">✧</span><div class="art-label"><span class="live-dot"></span> THE LITTLE THINGS THAT MATTER</div><div class="shopping-sculpture"><div class="bag-handle"></div><div class="bag-face"><span class="bag-monogram">Z<span>EN</span></span><span class="bag-caption">MADE FOR YOUR EVERYDAY</span></div></div><div class="floating-note note-one">${i("Heart")}<div>เลือกสิ่งที่คุณชอบ<small>Find your next favorite</small></div></div><div class="floating-note note-two">${i("Package")}<div>จากร้าน ถึงมือคุณ<small>ติดตามได้ทุกขั้นตอน</small></div></div><span class="art-bottom">CURATED WITH CARE. CHOSEN BY YOU.</span></div></section><section class="landing-paths" aria-label="ค้นพบร้านของเรา"><a href="/shop.html"><span class="path-number">01 / DISCOVER</span><div><h2>สินค้าในแบบคุณ</h2>${i("ArrowUpRight")}</div><p>เลือกดูรายละเอียดและรูปสินค้าหลายมุมก่อนตัดสินใจ</p></a><a href="/orders.html"><span class="path-number">02 / FOLLOW</span><div><h2>ทุกขั้นตอน ชัดเจน</h2>${i("ArrowUpRight")}</div><p>ตั้งแต่ชำระเงิน จัดส่ง จนถึงวันที่คุณได้รับสินค้า</p></a><a href="/contact.html"><span class="path-number">03 / CONNECT</span><div><h2>คุยกับเราได้เลย</h2>${i("ArrowUpRight")}</div><p>สอบถามสินค้าและแบ่งปันความคิดเห็นกับเจ้าของร้าน</p></a></section>${admin ? '<a class="admin-entry btn secondary" href="/admin/dashboard.html">เปิดแดชบอร์ดจัดการร้านค้า</a>' : ""}</main>`;
  }
  function contactPage() {
    const channels = [
      ["facebook_url", "Facebook", "Facebook"],
      ["instagram_url", "Instagram", "Instagram"],
      ["line_url", "LINE", "Headphones"],
    ].filter(([key]) => safeSocialURL(store[key], key));
    return `<main class="wrap subpage contact-page">${pageHead("LET’S CONNECT", "ช่องทางการติดต่อ", "มีคำถามเกี่ยวกับสินค้า หรือคำสั่งซื้อ? ติดต่อเราได้ผ่านช่องทางด้านล่าง")}<div class="contact-grid">${channels.map(([key, label, icon]) => `<a class="contact-card panel" href="${esc(safeSocialURL(store[key], key))}" target="_blank" rel="noopener noreferrer">${i(icon)}<h2>${label}</h2><span>เปิด ${label} ของร้าน ${i("ArrowUpRight")}</span></a>`).join("")}${store.contact_email ? `<a class="contact-card panel" href="mailto:${encodeURIComponent(store.contact_email)}">${i("Mail")}<h2>อีเมล</h2><span>${esc(store.contact_email)}</span></a>` : ""}${store.contact_phone ? `<a class="contact-card panel" href="tel:${esc(store.contact_phone.replace(/[^+0-9]/g, ""))}">${i("Headphones")}<h2>โทรศัพท์</h2><span>${esc(store.contact_phone)}</span></a>` : ""}</div>${!channels.length && !store.contact_email && !store.contact_phone ? '<section class="panel"><h2>ร้านกำลังเพิ่มช่องทางติดต่อ</h2><p class="muted">โปรดกลับมาตรวจสอบอีกครั้ง</p></section>' : ""}${store.contact_address ? `<section class="panel contact-address"><h2>ข้อมูลร้าน</h2><p class="preserve-lines">${esc(store.contact_address)}</p></section>` : ""}<div class="contact-utilities"><a href="/help.html">การสั่งซื้อและจัดส่ง ${i("ArrowRight")}</a><a href="/privacy.html">นโยบายความเป็นส่วนตัว ${i("ArrowRight")}</a></div></main>`;
  }
  function shop() {
    return `<main class="wrap subpage">${pageHead("SHOP", "สินค้าทั้งหมด", `${products.filter((p) => p.active).length} รายการในร้าน`)}<form id="search-form" class="search-box">${i("Search")}<label class="sr-only" for="product-search">ค้นหาชื่อสินค้าหรือรหัสสินค้า</label><input id="product-search" name="search" placeholder="ค้นหาชื่อสินค้า หรือรหัสสินค้า" value="${esc(search)}" maxlength="100"><button class="btn primary" type="submit">ค้นหา</button></form>${filters()}<div id="catalog-list">${catalogList()}</div></main>`;
  }
  function collections() {
    return `<main class="wrap subpage">${pageHead("CATEGORIES", "หมวดหมู่สินค้า", "เลือกดูสินค้าตามหมวดหมู่ที่คุณสนใจ")}<div class="collection-grid">${categories
      .slice(1)
      .map(
        (c) =>
          `<button class="collection-card" data-action="collection" data-category="${esc(c.name)}">${i(c.icon)}<span><strong>${esc(c.name)}</strong><small>${products.filter((p) => p.active && p.category === c.name).length} รายการ</small></span>${i("ChevronRight")}</button>`,
      )
      .join("")}</div></main>`;
  }
  async function productPage(id) {
    const p = products.find((p) => p.id === id && p.active);
    if (!p) return empty("ไม่พบสินค้า", "สินค้านี้อาจถูกนำออกจากร้านแล้ว");
    const images = productImages(p);
    const { data: reviews, error } = await db
      .from("product_reviews")
      .select(reviewColumns)
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    const average = reviews.length
      ? (
          reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        ).toFixed(1)
      : null;
    const reviewSection = `<section class="product-reviews panel"><div class="section-heading"><div><span class="eyebrow">VERIFIED PURCHASES</span><h2>เสียงจากลูกค้า</h2></div>${average ? `<strong class="rating-summary">★ ${average} <small>จาก ${reviews.length} รีวิวล่าสุด</small></strong>` : ""}</div>${reviews.length ? reviews.map((r) => `<article class="review-card"><div><strong>@${esc(r.reviewer_name)}</strong><span class="review-stars" aria-label="${r.rating} จาก 5 ดาว">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</span></div><small class="muted">ผู้ซื้อที่ยืนยันรับสินค้าแล้ว · ${date(r.created_at)}</small><p class="preserve-lines">${esc(r.comment) || "ให้คะแนนโดยไม่แสดงความคิดเห็น"}</p></article>`).join("") : '<p class="muted">ยังไม่มีรีวิว ลูกค้าที่ได้รับสินค้าแล้วสามารถเขียนรีวิวจากคำสั่งซื้อได้</p>'}</section>`;
    return `<main class="wrap subpage"><a class="back-link" href="#/shop">${i("ArrowLeft")} กลับไปเลือกสินค้า</a><div class="product-detail"><div class="product-gallery"><div class="detail-art"><img id="gallery-main" src="${safeImage(images[0])}" alt="${esc(p.name)} รูปที่ 1"></div><div class="gallery-thumbnails" aria-label="เลือกรูปสินค้า">${images.map((url, index) => `<button type="button" data-action="gallery-image" data-src="${safeImage(url)}" data-alt="${esc(p.name)} รูปที่ ${index + 1}" aria-label="ดูรูปที่ ${index + 1}" aria-pressed="${index === 0}"><img src="${safeImage(url)}" alt="" loading="lazy"></button>`).join("")}</div></div><div class="detail-info"><span class="eyebrow">${esc(p.category)}</span><h1>${esc(p.name)}</h1><span class="muted">รหัสสินค้า ${esc(p.sku)}</span><h2 class="detail-price">${money(p.price)}</h2><p>${esc(p.description)}</p>${average ? `<a href="#product-reviews" class="review-stars">★ ${average} · ${reviews.length} รีวิวล่าสุด</a>` : ""}<div class="stock ${stockState(p.stock).soldOut ? "stock-empty" : stockState(p.stock).low ? "stock-low" : ""}" aria-live="polite">${i(p.stock ? "CheckCircle2" : "Package")} ${stockState(p.stock).soldOut ? "SOLD OUT · " : ""}${stockState(p.stock).label}</div><button class="btn primary full" data-action="add" data-id="${p.id}" ${!p.stock ? "disabled" : ""}>${i("ShoppingBag")} ${p.stock ? "เพิ่มลงตะกร้า" : "สินค้าหมด · รอเติมสต็อก"}</button><button class="btn secondary full" data-action="favorite" data-id="${p.id}">${i("Heart")} ${favorites.includes(id) ? "บันทึกในรายการโปรดแล้ว" : "เก็บไว้ในรายการโปรด"}</button><div class="detail-assurances">${i("Truck")} ${esc(store.shipping_note)}<br>${i("ShieldCheck")} ชำระผ่าน QR PromptPay และแนบสลิป</div></div></div><div id="product-reviews">${reviewSection}</div></main>`;
  }
  function filters() {
    return `<div class="catalog-tools"><div class="category-pills" role="group" aria-label="หมวดหมู่สินค้า">${categories.map((c) => `<button class="pill ${category === c.name ? "selected" : ""}" data-action="category" data-category="${esc(c.name)}">${i(c.icon)}${esc(c.name)}</button>`).join("")}</div><label class="sort-label">เรียงตาม <select id="sort" aria-label="เรียงลำดับสินค้า"><option value="recommended" ${sort === "recommended" ? "selected" : ""}>แนะนำสำหรับคุณ</option><option value="low" ${sort === "low" ? "selected" : ""}>ราคา: ต่ำไปสูง</option><option value="high" ${sort === "high" ? "selected" : ""}>ราคา: สูงไปต่ำ</option><option value="new" ${sort === "new" ? "selected" : ""}>ใหม่ล่าสุด</option></select></label></div>`;
  }
  function catalogList(limit) {
    const available = products.filter((p) => p.active);
    let list = available.filter(
      (p) =>
        (category === "ทั้งหมด" || p.category === category) &&
        `${p.name} ${p.category} ${p.sku}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    );
    if (sort === "low") list.sort((a, b) => a.price - b.price);
    if (sort === "high") list.sort((a, b) => b.price - a.price);
    if (sort === "new")
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (limit) list = list.slice(0, limit);
    if (list.length)
      return `<div class="product-grid">${list.map(productCard).join("")}</div>`;
    if (!available.length)
      return `<div class="empty catalog-empty">${i("Package")}<h2>ยังไม่มีสินค้าในร้าน</h2><p>ร้านกำลังเตรียมสินค้า เมื่อเจ้าของร้านเพิ่มสินค้าแล้วจะแสดงที่นี่</p>${admin ? `<button class="btn primary" data-action="edit-product">${i("Plus")} เพิ่มสินค้าชิ้นแรก</button>` : `<a class="btn secondary" href="#/about">เกี่ยวกับร้าน</a>`}</div>`;
    return `<div class="empty">${i("Search")}<h2>ไม่พบสินค้าที่ค้นหา</h2><p>ลองเปลี่ยนคำค้นหา หรือเลือกดูสินค้าทั้งหมด</p><button class="btn secondary" data-action="reset-filters">ล้างตัวกรอง</button></div>`;
  }
  function productCard(p, index) {
    const liked = favorites.includes(p.id);
    return `<article class="product-card ${!p.stock ? "is-sold-out" : ""}" data-product-id="${p.id}"><div class="product-art"><a href="#/product/${p.id}" aria-label="ดู ${esc(p.name)}"><img src="${safeImage(p.image_url)}" alt="${esc(p.name)}" loading="lazy" width="600" height="600"></a><button class="wish ${liked ? "liked" : ""}" data-action="favorite" data-id="${p.id}" aria-label="${liked ? "นำออกจาก" : "เพิ่มใน"}รายการโปรด" aria-pressed="${liked}">${i("Heart")}</button>${!p.stock ? '<span class="sold-out"><strong>SOLD OUT</strong><small>สินค้าหมดแล้ว · รอเติมสต็อก</small></span>' : stockState(p.stock).low ? `<span class="low-stock">${stockState(p.stock).label}</span>` : ""}</div><div class="product-info"><span class="product-category">${esc(p.category)}</span><a class="product-name" href="#/product/${p.id}">${esc(p.name)}</a><div class="product-bottom"><strong>${money(p.price)}</strong><button class="add-btn" data-action="add" data-id="${p.id}" aria-label="เพิ่ม ${esc(p.name)} ลงตะกร้า" ${!p.stock ? "disabled" : ""}>${i("Plus")}</button></div></div></article>`;
  }
  return {
    home,
    contactPage,
    shop,
    collections,
    productPage,
    filters,
    catalogList,
    productCard,
  };
}
