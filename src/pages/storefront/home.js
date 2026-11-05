// Public editorial landing. Only a narrow, server-filtered review projection is read.
export async function renderHome({ db, store, session, esc, i, date }) {
  let reviews = [];
  if (db) {
    try {
      const { data, error } = await db.rpc("get_home_reviews");
      if (error) throw error;
      reviews = (Array.isArray(data) ? data : [])
        .filter((r) => [4, 5].includes(r.rating))
        .slice(0, 6);
    } catch {
      // Optional social proof must not block shopping when unavailable.
    }
  }
  return `<main class="editorial-home" id="main-content">
    <section class="edition-heading"><span>THE ${esc(store.shop_name.toUpperCase())} EDIT</span><span>เลือกอย่างตั้งใจ · ส่งถึงคุณโดยตรง</span></section>
    <section class="edition-hero"><div class="edition-copy"><span class="edition-kicker">GOOD FINDS. REAL CONNECTIONS.</span><h1>เลือกชิ้นที่ชอบ<span>ให้เป็นวันของคุณ.</span></h1><p>${esc(store.tagline)}</p><div class="edition-actions"><a class="btn primary" href="/shop/index.html">เปิดดูสินค้าของเรา ${i("ArrowUpRight")}</a>${reviews.length ? '<a class="edition-text-link" href="#customer-stories">อ่านเสียงจากลูกค้า ↓</a>' : ""}</div><small>ร้านเล็ก ๆ ที่เจ้าของดูแลทุกคำสั่งซื้อด้วยตัวเอง</small></div><div class="edition-art night-art" aria-hidden="true"><div class="night-grid"></div><span class="night-label">THE ${esc(store.shop_name.toUpperCase())} COLLECTION</span><div class="night-orb"></div><strong class="night-wordmark">GOOD<br>FINDS.</strong><div class="edition-art-bottom"><span>SELECTED WITH CARE</span><span>YOUR EVERYDAY<br>A LITTLE BETTER</span></div></div></section>
    <div class="edition-strip"><span>เลือกในแบบของคุณ</span><span>รายละเอียดที่ชัดเจน</span><span>จากเจ้าของร้าน ถึงมือคุณ</span></div>
    <section class="edition-intro"><span class="edition-kicker">A SMALL SHOP, A PERSONAL TOUCH</span><div><h2>เลือกได้อย่างมั่นใจ<br>คุยกันได้เหมือนคนรู้จัก</h2><p>${esc(store.about_text)}</p><a class="edition-text-link" href="/pages/contact.html">คุยกับเจ้าของร้าน ${i("ArrowUpRight")}</a></div></section>
${reviews.length ? `<section class="home-stories" id="customer-stories" aria-labelledby="stories-heading"><div class="stories-heading"><div><span class="edition-kicker">WORDS FROM OUR CUSTOMERS</span><h2 id="stories-heading">ของที่เลือก<br><em>กับเสียงที่เล่ากลับมา.</em></h2></div><p>ความคิดเห็นจากผู้ซื้อที่ยืนยันรับสินค้าแล้ว<br><strong>คัดเฉพาะรีวิว 4–5 ดาว · ล่าสุดไม่เกิน 6 รีวิว</strong><small>ส่วนรีวิวทุกคะแนน อ่านได้ที่หน้าสินค้าหลังเข้าสู่ระบบ</small></p></div><div class="story-grid">${reviews.map((r) => `<article class="customer-story"><div class="story-stars" aria-label="${r.rating} จาก 5 ดาว">${"★".repeat(r.rating)}<span>${"☆".repeat(5 - r.rating)}</span></div><blockquote>${esc(r.comment) || "ลูกค้าให้คะแนนสินค้าโดยไม่ได้เขียนความคิดเห็น"}</blockquote><div class="story-person"><span class="story-avatar" aria-hidden="true">${esc([...r.reviewer_name][0] || "Z")}</span><div><strong>@${esc(r.reviewer_name)}</strong><small>ผู้ซื้อที่ยืนยันรับสินค้าแล้ว</small></div>${i("CheckCircle2")}</div><div class="story-product"><span>${esc(r.product_name)}</span><time>${date(r.created_at)}</time></div></article>`).join("")}</div></section>` : ""}
    <section class="edition-close"><span class="edition-kicker">YOUR NEXT GOOD FIND</span><h2>ลองเลือกสิ่งที่ชอบ<br>ให้วันธรรมดาของคุณ.</h2><a class="btn primary" href="/shop/index.html">ไปเลือกสินค้ากัน ${i("ArrowUpRight")}</a><a class="edition-text-link" href="${session ? "/account/orders.html" : "/auth/login.html"}">${session ? "ติดตามคำสั่งซื้อของฉัน" : "เป็นสมาชิกอยู่แล้ว? เข้าสู่ระบบ"}</a></section>
  </main>`;
}
