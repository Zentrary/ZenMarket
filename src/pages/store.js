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
    shippingFor,
    pageURL,
  } = context;
  function home() {
    return `<main class="wrap home-page" id="main-content"><section class="welcome"><div><span class="eyebrow">WELCOME TO ${esc(store.shop_name)}</span><h1>${esc(store.shop_name)}</h1><p>${esc(store.tagline)}</p><div class="button-row"><a class="btn primary" href="/shop.html">เลือกซื้อสินค้า ${i("ArrowRight")}</a><a class="btn secondary" href="/about.html">เกี่ยวกับร้าน</a></div></div><aside class="shop-info"><h2>ซื้อสินค้าได้ใน 3 ขั้นตอน</h2><ol><li><span>1</span>เลือกสินค้าและใส่ตะกร้า</li><li><span>2</span>กรอกที่อยู่และสแกน QR ชำระเงิน</li><li><span>3</span>แนบสลิปเพื่อให้ร้านตรวจสอบ</li></ol></aside></section><section class="home-shortcuts" aria-label="เริ่มต้นใช้งาน"><a class="panel" href="/shop.html">${i("ShoppingBag")}<h2>เลือกซื้อสินค้า</h2><p>${products.filter((p) => p.active).length} รายการที่เปิดขาย</p><span>ไปหน้าสินค้า ${i("ArrowRight")}</span></a><a class="panel" href="/categories.html">${i("LayoutGrid")}<h2>เลือกตามหมวดหมู่</h2><p>${categories.length - 1} หมวดหมู่ของร้าน</p><span>ดูหมวดหมู่ ${i("ArrowRight")}</span></a><a class="panel" href="/orders.html">${i("Package")}<h2>คำสั่งซื้อของฉัน</h2><p>ดูสถานะการชำระเงินและการจัดส่ง</p><span>ติดตามรายการ ${i("ArrowRight")}</span></a></section></main>`;
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
  function productPage(id) {
    const p = products.find((p) => p.id === id && p.active);
    if (!p) return empty("ไม่พบสินค้า", "สินค้านี้อาจถูกนำออกจากร้านแล้ว");
    return `<main class="wrap subpage"><a class="back-link" href="#/shop">${i("ArrowLeft")} กลับไปเลือกสินค้า</a><div class="product-detail"><div class="detail-art tone-0"><img src="${safeImage(p.image_url)}" alt="${esc(p.name)}"></div><div class="detail-info"><span class="eyebrow">${esc(p.category)}</span><h1>${esc(p.name)}</h1><span class="muted">รหัสสินค้า ${esc(p.sku)}</span><h2 class="detail-price">${money(p.price)}</h2><p>${esc(p.description)}</p><div class="stock">${i(p.stock ? "CheckCircle2" : "Package")} ${p.stock ? `พร้อมส่ง ${p.stock} ชิ้น` : "สินค้าหมดชั่วคราว"}</div><button class="btn primary full" data-action="add" data-id="${p.id}" ${!p.stock ? "disabled" : ""}>${i("ShoppingBag")} เพิ่มลงตะกร้า</button><button class="btn secondary full" data-action="favorite" data-id="${p.id}">${i("Heart")} ${favorites.includes(id) ? "บันทึกในรายการโปรดแล้ว" : "เก็บไว้ในรายการโปรด"}</button><div class="detail-assurances">${i("Truck")} ${esc(store.shipping_note)}<br>${i("ShieldCheck")} ชำระผ่าน QR PromptPay และแนบสลิป</div></div></div></main>`;
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
    return `<article class="product-card"><div class="product-art"><a href="#/product/${p.id}" aria-label="ดู ${esc(p.name)}"><img src="${safeImage(p.image_url)}" alt="${esc(p.name)}" loading="lazy" width="600" height="600"></a><button class="wish ${liked ? "liked" : ""}" data-action="favorite" data-id="${p.id}" aria-label="${liked ? "นำออกจาก" : "เพิ่มใน"}รายการโปรด" aria-pressed="${liked}">${i("Heart")}</button>${!p.stock ? '<span class="sold-out">สินค้าหมดชั่วคราว</span>' : ""}</div><div class="product-info"><span class="product-category">${esc(p.category)}</span><a class="product-name" href="#/product/${p.id}">${esc(p.name)}</a><div class="product-bottom"><strong>${money(p.price)}</strong><button class="add-btn" data-action="add" data-id="${p.id}" aria-label="เพิ่ม ${esc(p.name)} ลงตะกร้า" ${!p.stock ? "disabled" : ""}>${i("Plus")}</button></div></div></article>`;
  }
  return {
    home,
    shop,
    collections,
    productPage,
    filters,
    catalogList,
    productCard,
  };
}
