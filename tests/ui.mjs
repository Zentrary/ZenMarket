import { chromium as playwright } from "@playwright/test";
import chromium from "@sparticuz/chromium";
import assert from "node:assert/strict";
import { seedProducts } from "./fixtures/products.js";
import { defaultSettings } from "../src/settings.js";
import { pageURL } from "../src/routes.js";
let shopConfig = { ...defaultSettings };
let categoryRows = ["ไลฟ์สไตล์", "ของแต่งบ้าน", "แก็ดเจ็ต", "แฟชั่น"].map(
  (name) => ({ name }),
);
let logoutError = false;
const browser = await playwright.launch({
  headless: true,
  executablePath: await chromium.executablePath(),
  args: chromium.args,
});
const errors = [];
const nativeDialogs = [];
let productReads = 0;
let reviewRows = [];
const user = {
  id: "c5a5d418-c050-41c8-9079-87f2435cea2d",
  email: "user@zenmarket.example",
  user_metadata: {},
  app_metadata: { provider: "email" },
  aud: "authenticated",
  role: "authenticated",
};
const adminUser = {
  ...user,
  id: "d38d4d1f-ca7c-4d87-a1cf-8abecdae8891",
  email: "admin@zenmarket.example",
};
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push(e.message));
page.on("dialog", (d) => {
  nativeDialogs.push(d.type());
  d.dismiss();
});
let isAdmin = false,
  products = seedProducts.map((p) => ({
    ...p,
    active: true,
    created_at: "2026-11-05T00:00:00Z",
  })),
  orders = [],
  configured = false;
await page.context().route("https://*.supabase.co/**", async (route) => {
  const req = route.request(),
    url = new URL(req.url()),
    path = url.pathname;
  if (path.startsWith("/storage/v1/object/public/"))
    return route.fulfill({
      status: 200,
      contentType: "image/png",
      body: png.buffer,
    });
  let body;
  try {
    body = req.postDataJSON();
  } catch {}
  let result = null;
  let status = 200;
  if (path.includes("/functions/v1/username-login")) {
    isAdmin = body.identifier === "zenadmin";
    const u = isAdmin ? adminUser : user;
    const jwt =
      "e30." +
      Buffer.from(
        JSON.stringify({
          sub: u.id,
          role: "authenticated",
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      ).toString("base64url") +
      ".mock";
    result = {
      session: {
        access_token: jwt,
        refresh_token: "mock-refresh",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: u,
      },
    };
  } else if (path === "/auth/v1/user") result = isAdmin ? adminUser : user;
  else if (path.includes("/auth/v1/logout")) {
    if (logoutError) {
      status = 500;
      result = { message: "Logout unavailable" };
    } else result = {};
  } else if (path === "/rest/v1/rpc/get_storefront") result = shopConfig;
  else if (path === "/rest/v1/categories") {
    const oldName = url.searchParams.get("name")?.slice(3);
    if (req.method() === "POST") {
      if (categoryRows.some((c) => c.name === body.name)) {
        status = 409;
        result = { code: "23505", message: "Duplicate category" };
      } else {
        categoryRows.push(body);
        result = null;
      }
    } else if (req.method() === "PATCH") {
      categoryRows.find((c) => c.name === oldName).name = body.name;
      products.forEach((p) => {
        if (p.category === oldName) p.category = body.name;
      });
    } else if (req.method() === "DELETE") {
      if (products.some((p) => p.category === oldName)) {
        status = 409;
        result = { code: "23503" };
      } else categoryRows = categoryRows.filter((c) => c.name !== oldName);
    } else result = categoryRows;
  } else if (path === "/rest/v1/products") {
    if (req.method() === "POST") {
      products.push({
        ...body,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      });
      result = null;
    } else if (req.method() === "PATCH") {
      const id = url.searchParams.get("id").slice(3);
      Object.assign(
        products.find((p) => p.id === id),
        body,
      );
      result = null;
    } else if (req.method() === "DELETE") {
      products = products.filter(
        (p) => p.id !== url.searchParams.get("id").slice(3),
      );
      result = null;
    } else {
      productReads++;
      result = products;
    }
  } else if (path === "/rest/v1/rpc/is_admin") result = isAdmin;
  else if (path === "/rest/v1/profiles")
    result = {
      id: (isAdmin ? adminUser : user).id,
      first_name: "ทดสอบ",
      last_name: "ระบบ",
      nickname: "Tester",
      username: isAdmin ? "zenadmin" : "zenuser",
      phone: "0812345678",
      age: 25,
    };
  else if (path === "/rest/v1/store_settings") {
    if (req.method() === "POST") {
      products.push({
        ...body,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      });
      result = null;
    } else if (req.method() === "PATCH") {
      if (body.promptpay_id) configured = true;
      else Object.assign(shopConfig, body);
      result = null;
    } else
      result = {
        singleton: true,
        promptpay_id: configured ? "0812345678" : null,
        recipient_name: configured ? "บัญชีทดสอบ" : "",
      };
  } else if (path === "/rest/v1/rpc/create_order") {
    if (!configured) {
      status = 400;
      result = { message: "ร้านค้ายังไม่ได้ตั้งค่าบัญชีรับเงิน" };
    } else {
      const items = body.cart.map((x) => ({
        ...products.find((p) => p.id === x.id),
        quantity: x.quantity,
      }));
      const subtotal = items.reduce((a, p) => a + p.price * p.quantity, 0);
      const shipping =
        subtotal >= shopConfig.free_shipping_threshold
          ? 0
          : shopConfig.shipping_fee;
      const o = {
        id: "b1000000-0000-4000-8000-000000000001",
        user_id: user.id,
        items,
        subtotal,
        shipping,
        total: subtotal + shipping,
        ...body.delivery,
        promptpay_id: "0812345678",
        recipient_name: "บัญชีทดสอบ",
        status: "pending",
        created_at: new Date().toISOString(),
      };
      orders.push(o);
      result = o;
    }
  } else if (path === "/rest/v1/orders") {
    result = url.searchParams.has("id")
      ? orders.find((o) => o.id === url.searchParams.get("id").slice(3))
      : orders.filter(
          (o) =>
            !url.searchParams.has("status") ||
            o.status === url.searchParams.get("status").slice(3),
        );
  } else if (path === "/rest/v1/rpc/transition_order") {
    const order = orders.find((o) => o.id === body.order_id);
    order.status = body.next_status;
    if (body.tracking_number) order.tracking = body.tracking_number;
    if (body.next_status === "paid") order.paid_at = new Date().toISOString();
    if (body.next_status === "shipped")
      order.shipped_at = new Date().toISOString();
    if (body.next_status === "delivered")
      order.delivered_at = new Date().toISOString();
    result = null;
  } else if (path === "/rest/v1/rpc/attach_slip") {
    orders[0].status = "review";
    result = null;
  } else if (path === "/rest/v1/rpc/save_review") {
    const order = orders.find((o) => o.id === body.p_order_id);
    const item = order.items.find((p) => p.id === body.p_product_id);
    const existing = reviewRows.find(
      (r) => r.order_id === order.id && r.product_id === item.id,
    );
    const row = {
      id: existing?.id || crypto.randomUUID(),
      order_id: order.id,
      product_id: item.id,
      product_name: item.name,
      reviewer_name: "zenuser",
      rating: body.p_rating,
      comment: body.p_comment,
      created_at: new Date().toISOString(),
    };
    if (existing) Object.assign(existing, row);
    else reviewRows.push(row);
    result = null;
  } else if (path === "/rest/v1/rpc/get_order_reviews")
    result = reviewRows.filter((r) => r.order_id === body.p_order_id);
  else if (path === "/rest/v1/product_reviews") {
    result = reviewRows.filter(
      (r) =>
        (!url.searchParams.has("product_id") ||
          r.product_id === url.searchParams.get("product_id").slice(3)) &&
        (!url.searchParams.has("rating") ||
          r.rating === Number(url.searchParams.get("rating").slice(3))),
    );
  } else if (path === "/rest/v1/rpc/get_admin_dashboard") {
    const paid = orders.filter((o) =>
      ["paid", "shipped", "delivered"].includes(o.status),
    );
    const total = paid.reduce((s, o) => s + o.total, 0);
    result = {
      revenue: total,
      units_sold: paid.reduce(
        (s, o) => s + o.items.reduce((s, p) => s + p.quantity, 0),
        0,
      ),
      paid_orders: paid.length,
      awaiting_review: orders.filter((o) => o.status === "review").length,
      awaiting_shipment: orders.filter((o) => o.status === "paid").length,
      review_count: reviewRows.length,
      average_rating: reviewRows.length
        ? reviewRows.reduce((s, r) => s + r.rating, 0) / reviewRows.length
        : 0,
      product_count: products.length,
      stock_units: products.reduce((s, p) => s + p.stock, 0),
      daily_revenue: Array.from({ length: 7 }, (_, n) => ({
        day: "2026-11-" + String(n + 1).padStart(2, "0"),
        total: n === 6 ? total : 0,
      })),
      ratings: [5, 4, 3, 2, 1].map((rating) => ({
        rating,
        count: reviewRows.filter((r) => r.rating === rating).length,
      })),
    };
  } else if (path.startsWith("/storage/"))
    result = { Key: "mock", signedURL: "/mock-slip.png" };
  else {
    console.log("Unhandled mock:", path);
    result = {};
  }
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(result),
    headers: {
      "access-control-allow-origin": "*",
      ...(path === "/rest/v1/product_reviews"
        ? {
            "content-range": `0-${Math.max(0, result.length - 1)}/${result.length}`,
          }
        : {}),
    },
  });
});
const visit = async (route) => {
  await page.goto("http://localhost:5173" + pageURL(route));
  await page.locator("main").waitFor();
  await page.locator(".loading").waitFor({ state: "detached" });
};
const pop = async (text, accept = true) => {
  const dialog = page.locator("dialog.popup").filter({ hasText: text });
  await dialog.waitFor();
  assert.equal(await dialog.getAttribute("role"), "alertdialog");
  const titleID = await dialog.getAttribute("aria-labelledby");
  const contrast = await dialog.evaluate((el) => {
    const luminance = (color) => {
      const channels = color
        .match(/\d+/g)
        .slice(0, 3)
        .map(Number)
        .map((c) => {
          c /= 255;
          return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const background = luminance(getComputedStyle(el).backgroundColor),
      text = luminance(getComputedStyle(el.querySelector("p")).color);
    return (
      (Math.max(background, text) + 0.05) / (Math.min(background, text) + 0.05)
    );
  });
  assert.ok(contrast >= 4.5, "Popup text contrast below AA");
  await dialog
    .locator(accept ? "[data-popup-accept]" : "[data-popup-cancel]")
    .click();
  await page.locator("#" + titleID).waitFor({ state: "detached" });
};
const login = async (name, next = "") => {
  await visit("/login" + (next ? "?next=" + encodeURIComponent(next) : ""));
  await page.locator("[name=identifier]").fill(name);
  await page.locator("[name=password]").fill("MockPassword123!");
  await page.locator("#login-form button[type=submit]").click();
  await page.waitForURL(
    "http://localhost:5173" +
      (next || (name === "zenadmin" ? "/admin/dashboard.html" : "/shop.html")),
  );
  await page.locator("main").waitFor();
  await page.locator(".loading").waitFor({ state: "detached" });
};
const logout = async () => {
  await page.locator("header [data-action=logout]").click();
  await page.waitForURL("**/login.html?loggedOut=1");
  await pop("ออกจากระบบเรียบร้อยแล้ว");
};
const png = {
  name: "test.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aql0AAAAASUVORK5CYII=",
    "base64",
  ),
};
try {
  await visit("/");
  assert.equal(await page.locator("footer").count(), 0);
  assert.equal(await page.locator(".landing-hero").count(), 1);
  assert.equal(productReads, 0);
  assert.deepEqual(await page.locator("#main-nav a").allTextContents(), [
    "หน้าหลัก",
    "สินค้า",
    "คำสั่งซื้อ",
    "ช่องทางการติดต่อ",
  ]);
  await page.screenshot({
    path: "/home/user/zenmarket-new-home.png",
    fullPage: true,
  });
  await page.locator('.hero-actions a[href="/shop.html"]').click();
  await page.waitForURL("**/register.html?next=*");
  await page.locator("#register-form").waitFor();
  assert.equal(productReads, 0);
  await page.locator(".auth-switch a").click();
  await page.waitForURL("**/login.html?next=*");
  assert.match(page.url(), /next=/);
  for (const route of [
    "/shop",
    "/product/example",
    "/orders",
    "/contact",
    "/admin/dashboard",
  ]) {
    await page.goto("http://localhost:5173" + pageURL(route));
    await page.waitForURL("**/register.html?next=*");
    await page.locator("#register-form").waitFor();
  }
  assert.equal(productReads, 0);
  await login("zenadmin");
  await page.locator(".dashboard-kpis").waitFor();
  assert.match(await page.locator(".user-chip").textContent(), /zenadmin/);
  await visit("/admin/settings");
  await page.locator("[name=shop_name]").fill("ZenMarket Studio");
  await page
    .locator("[name=tagline]")
    .fill("คัดสรรสิ่งเล็ก ๆ ให้ทุกวันของคุณพิเศษขึ้น");
  await page
    .locator("[name=facebook_url]")
    .fill("https://facebook.com.evil.test/shop");
  await page.locator("#store-form button[type=submit]").click();
  await pop("กรุณาใช้ลิงก์ HTTPS");
  assert.equal(shopConfig.facebook_url, "");
  await page
    .locator("[name=facebook_url]")
    .fill("https://www.facebook.com/zenmarket");
  await page
    .locator("[name=instagram_url]")
    .fill("https://www.instagram.com/zenmarket");
  await page.locator("[name=line_url]").fill("https://line.me/ti/p/@zenmarket");
  await page.locator("[name=contact_email]").fill("shop@example.com");
  await page.locator("[name=shipping_fee]").fill("75");
  await page.locator("[name=free_shipping_threshold]").fill("500");
  await page.locator("[name=logo]").setInputFiles(png);
  await page.locator("#store-form button[type=submit]").click();
  await pop("บันทึกการตั้งค่าร้านแล้ว");
  await page.locator("header .shop-logo").evaluate((img) => img.decode());
  await visit("/contact");
  assert.equal(await page.locator(".contact-card[target=_blank]").count(), 3);
  assert.equal(
    await page
      .locator('a[href="https://line.me/ti/p/@zenmarket"]')
      .getAttribute("rel"),
    "noopener noreferrer",
  );
  await visit("/admin/categories");
  await page.locator("#category-form [name=name]").fill("คอลเลกชันพิเศษ");
  await page.locator("#category-form button").click();
  await pop("บันทึกหมวดหมู่แล้ว");
  await page
    .locator('[data-action=rename-category][data-name="คอลเลกชันพิเศษ"]')
    .click();
  await page.locator(".editor-dialog [name=name]").fill("คอลเลกชันใหม่");
  await page.locator(".editor-dialog button[type=submit]").click();
  await pop("บันทึกหมวดหมู่แล้ว");
  await visit("/admin/products");
  await page.locator("[data-action=edit-product]").first().click();
  await page.locator(".editor-dialog [name=name]").fill("Everyday Studio Bag");
  await page.locator(".editor-dialog [name=sku]").fill("TEST-MULTI");
  await page
    .locator(".editor-dialog [name=category]")
    .selectOption("คอลเลกชันใหม่");
  await page.locator(".editor-dialog [name=price]").fill("250");
  await page.locator(".editor-dialog [name=stock]").fill("5");
  await page
    .locator(".editor-dialog [name=description]")
    .fill("กระเป๋าสำหรับวันสบาย ๆ");
  await page
    .locator(".editor-dialog [name=image]")
    .setInputFiles([
      png,
      { ...png, name: "back.png" },
      { ...png, name: "detail.png" },
    ]);
  assert.equal(await page.locator("#image-preview img").count(), 3);
  await page.locator("#product-form button[type=submit]").click();
  await pop("บันทึกสินค้าแล้ว");
  const product = products.find((p) => p.sku === "TEST-MULTI");
  assert.equal(product.image_urls.length, 3);
  await page
    .locator('[data-action=delete-product][data-id="' + product.id + '"]')
    .click();
  await pop("ลบสินค้า", false);
  assert.ok(products.some((p) => p.id === product.id));
  await page
    .locator('[data-action=delete-product][data-id="' + product.id + '"]')
    .click();
  await page.locator("dialog.popup").waitFor();
  await page.keyboard.press("Escape");
  assert.ok(products.some((p) => p.id === product.id));
  await visit("/admin/categories");
  await page
    .locator('[data-action=delete-category][data-name="คอลเลกชันใหม่"]')
    .click();
  await pop("ลบหมวดหมู่");
  await pop("หมวดหมู่นี้ยังมีสินค้า");
  assert.equal(
    await page
      .locator('[data-action=delete-category][data-name="คอลเลกชันใหม่"]')
      .isEnabled(),
    true,
  );
  await logout();
  await login("zenuser", "/product.html?id=" + product.id);
  await page.locator("#gallery-main").waitFor();
  assert.equal(await page.locator(".gallery-thumbnails button").count(), 3);
  await page.locator(".gallery-thumbnails button").nth(1).click();
  assert.equal(
    await page.locator("#gallery-main").getAttribute("src"),
    product.image_urls[1],
  );
  assert.equal(await page.locator(".review-card").count(), 0);
  await page.locator("[data-action=add]").click();
  await pop("เพิ่มลงตะกร้าแล้ว");
  await visit("/cart");
  assert.equal(await page.locator(".cart-row").count(), 1);
  assert.match(await page.locator(".summary-total").textContent(), /325/);
  await page.reload();
  await page.locator(".cart-row").waitFor();
  await visit("/admin/dashboard");
  assert.equal(await page.locator(".dashboard-kpis").count(), 0);
  assert.match(await page.locator("main").textContent(), /แอดมินเท่านั้น/);
  await visit("/checkout");
  await page
    .locator("[name=address]")
    .fill("99 ถนนสุขุมวิท แขวงคลองตัน เขตวัฒนา กรุงเทพมหานคร 10110");
  await page.locator("#checkout-form button[type=submit]").click();
  await pop("ยังไม่ได้ตั้งค่าบัญชีรับเงิน");
  configured = true;
  await page.locator("#checkout-form button[type=submit]").click();
  await page.waitForURL("**/order.html?id=*");
  await pop("สร้างคำสั่งซื้อแล้ว");
  await page.locator("img.qr").waitFor();
  assert.equal(await page.locator("a[download]").count(), 1);
  assert.equal(await page.locator(".order-timeline li").count(), 6);
  assert.equal(
    await page.locator("[aria-current=step] strong").textContent(),
    "ชำระเงิน",
  );
  assert.equal(await page.locator(".review-form").count(), 0);
  await page.locator("[name=slip]").setInputFiles(png);
  await page.locator("#slip-form button[type=submit]").click();
  await pop("ส่งสลิปแล้ว");
  await page.locator(".status.review").waitFor();
  const other = await ctx.newPage();
  await other.goto("http://localhost:5173/account.html");
  await other.locator(".account-layout").waitFor();
  await logout();
  await other.waitForURL("**/login.html?loggedOut=1");
  await other.close();
  await login("zenadmin");
  await page.locator(".dashboard-kpis").waitFor();
  assert.match(
    await page.locator(".dashboard-kpis").textContent(),
    /ตรวจยอด 1/,
  );
  await visit("/admin/orders");
  await page.locator("tbody a").click();
  await page.locator("[data-action=approve-order]").click();
  await pop("คุณตรวจสอบยอดเข้าบัญชีจริง");
  await pop("อัปเดตสถานะคำสั่งซื้อแล้ว");
  await page.locator(".status.paid").waitFor();
  await page.locator("[name=tracking]").fill("TH123456789");
  await page.locator("#ship-form button[type=submit]").click();
  await pop("บันทึกการจัดส่งแล้ว");
  assert.equal(orders[0].status, "shipped");
  assert.equal(await page.locator("[data-action=receive-order]").count(), 0);
  assert.equal(await page.locator(".review-form").count(), 0);
  await logout();
  await login("zenuser");
  await visit("/orders");
  await page.locator(".order-card").click();
  await page.locator("[data-action=receive-order]").click();
  await pop("ยืนยันว่าได้รับสินค้า");
  await pop("ยืนยันรับสินค้าแล้ว");
  assert.equal(orders[0].status, "delivered");
  await page.locator('.review-form [name=rating][value="4"]').check();
  const comment = "สินค้าดี อยากให้เพิ่มสีอื่นด้วย <script>alert(1)</script>";
  await page.locator(".review-form [name=comment]").fill(comment);
  await page.locator(".review-form button[type=submit]").click();
  await pop("บันทึกรีวิวแล้ว");
  assert.equal(reviewRows.length, 1);
  assert.equal(reviewRows[0].rating, 4);
  await visit("/product/" + product.id);
  assert.match(await page.locator(".product-reviews").textContent(), /4.0/);
  assert.match(
    await page.locator(".review-card").textContent(),
    /<script>alert\(1\)<\/script>/,
  );
  assert.equal(await page.locator(".product-reviews script").count(), 0);
  await logout();
  await login("zenadmin");
  await page.locator(".dashboard-kpis").waitFor();
  assert.match(await page.locator(".dashboard-kpis").textContent(), /325.00/);
  assert.match(await page.locator(".dashboard-kpis").textContent(), /4.0/);
  await visit("/admin/reviews");
  assert.match(
    await page.locator(".review-card").textContent(),
    /อยากให้เพิ่มสีอื่น/,
  );
  await page.locator('.review-filters a[href$="rating=4"]').click();
  await page.locator(".review-card").waitFor();
  await visit("/admin/dashboard");
  await page.screenshot({
    path: "/home/user/zenmarket-new-dashboard.png",
    fullPage: true,
  });
  // Check all documents, galleries, editor and order tracking at portrait/tablet/desktop sizes.
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [768, 1024],
    [844, 390],
    [1024, 768],
    [1440, 1000],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    for (const route of [
      "/",
      "/shop",
      "/collections",
      "/contact",
      "/cart",
      "/checkout",
      "/login",
      "/register",
      "/account",
      "/orders",
      "/order/" + orders[0].id,
      "/product/" + product.id,
      "/favorites",
      "/about",
      "/help",
      "/privacy",
      "/reset-password",
      "/admin/dashboard",
      "/admin/reviews",
      "/admin/products",
      "/admin/categories",
      "/admin/settings",
      "/admin/payments",
      "/admin/orders",
    ]) {
      await visit(route);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        `${width} overflow ${route}`,
      );
      assert.equal(await page.locator("footer").count(), 0);
    }
    await visit("/admin/products");
    await page
      .locator('[data-action=edit-product][data-id="' + product.id + '"]')
      .click();
    assert.equal(
      await page
        .locator(".editor-dialog")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
      true,
      "Editor overflow " + width,
    );
    await page.locator(".editor-dialog [data-action=close-modal]").click();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await visit("/");
  await page.screenshot({
    path: "/home/user/zenmarket-new-mobile.png",
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".shopping-sculpture")
      .evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  await visit("/admin/products");
  await page
    .locator('[data-action=delete-product][data-id="' + product.id + '"]')
    .click();
  await pop("ลบสินค้า");
  await pop("ลบสินค้าแล้ว");
  assert.ok(!products.some((p) => p.id === product.id));
  assert.equal(reviewRows.length, 1);
  assert.equal(orders[0].items[0].name, "Everyday Studio Bag");
  await visit("/admin/reviews");
  await page.locator(".review-card").waitFor();
  // Logo removal and local logout when remote token revocation fails.
  await visit("/admin/settings");
  await page.locator("[name=remove_logo]").check();
  await page.locator("#store-form button[type=submit]").click();
  await pop("บันทึกการตั้งค่าร้านแล้ว");
  assert.equal(await page.locator("header .shop-logo").count(), 0);
  logoutError = true;
  await page.locator("header [data-action=logout]").click();
  await page.waitForURL("**/login.html?loggedOut=local");
  await pop("เซิร์ฟเวอร์ไม่สำเร็จ");
  assert.equal(await page.locator(".user-chip").count(), 0);
  assert.deepEqual(nativeDialogs, []);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: membership redirects, no anonymous catalogue fetch, home/header/no footer, accessible notifications/confirmations/cancel/Escape, social URL validation, categories, deletion/history, multi-image upload/preview/gallery, cart/shipping/QR/slip, receipt-gated reviews, admin dashboard/review filters, local/cross-tab logout, reduced motion and 24 routes × 7 viewports. API mocked; Chromium only.",
  );
} catch (error) {
  console.log(
    "UI failure",
    page.url(),
    await page.locator("body").innerText(),
    errors,
  );
  await page.screenshot({ path: "/tmp/zen-failure.png", fullPage: true });
  throw error;
} finally {
  await browser.close();
}
