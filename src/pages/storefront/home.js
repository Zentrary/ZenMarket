// Quiet public landing. No promotional artwork, placeholder reviews or footer.
export async function renderHome({ db, store, esc, date }) {
  let reviews = [];
  if (db) {
    try {
      const { data, error } = await db.rpc("get_home_reviews");
      if (error) throw error;
      reviews = (Array.isArray(data) ? data : [])
        .filter((r) => [4, 5].includes(r.rating))
        .slice(0, 6);
    } catch {
      // Optional reviews must never prevent access to the shop.
    }
  }
  return `<main class="simple-home" id="main-content">
    <section class="home-intro" aria-labelledby="home-title">
      <h1 id="home-title">${esc(store.shop_name)}</h1>
      ${store.tagline ? `<p>${esc(store.tagline)}</p>` : ""}
      <a class="btn secondary" href="/shop/index.html">ดูสินค้า</a>
    </section>
    ${reviews.length ? `<section class="home-reviews" aria-labelledby="home-reviews-title">
      <h2 id="home-reviews-title">รีวิวจากลูกค้า</h2>
      <div class="home-review-list">${reviews.map((r) => `<article class="home-review">
        <div class="home-review-meta"><strong>@${esc(r.reviewer_name)}</strong><span class="home-review-stars" aria-label="${r.rating} จาก 5 ดาว">${"★".repeat(r.rating)}<span>${"☆".repeat(5 - r.rating)}</span></span></div>
        ${r.comment ? `<p>${esc(r.comment)}</p>` : ""}
        <small>${esc(r.product_name)} · ${date(r.created_at)}</small>
      </article>`).join("")}</div>
    </section>` : ""}
  </main>`;
}
